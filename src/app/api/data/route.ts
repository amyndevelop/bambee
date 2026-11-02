import { publishedWeeklyWhere } from "@/lib/weekly-content";
import { storage } from "@/lib/storage";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/db";
import { publicError } from "@/lib/errors";
import { addDays, dayNumber, gestation, todayInZone } from "@/lib/gestation";
import { sendMail } from "@/lib/mail";
import { currentUser, pregnancyAccess, sameOrigin } from "@/lib/server";
import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
const date = z.string().refine((v) => {
  try {
    dayNumber(v);
    return true;
  } catch {
    return false;
  }
}, "Fecha inválida");
const kinds = z.enum(["journal", "symptom", "ultrasound", "belly"]);
export async function GET(req: Request) {
  try {
    const u = await currentUser();
    const url = new URL(req.url),
      kind = url.searchParams.get("kind") || "dashboard";
    const pregnancies = await db.pregnancy.findMany({
      where: {
        OR: [{ ownerId: u.id }, { members: { some: { userId: u.id } } }],
      },
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { timezone: true } } },
    });
    const requested = url.searchParams.get("pregnancyId");
    if (requested && !pregnancies.some((p) => p.id === requested))
      throw new Error("FORBIDDEN");
    const p =
      pregnancies.find((p) => p.id === url.searchParams.get("pregnancyId")) ||
      pregnancies.find((p) => !p.archived) ||
      pregnancies[0];
    if (kind === "notifications")
      return NextResponse.json(
        await db.notification.findMany({
          where: { userId: u.id },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
      );
    if (kind === "weeks") {
      return NextResponse.json(
        await db.weeklyDevelopment.findMany({
          where: publishedWeeklyWhere,
          include: {
            illustration: { select: { slug: true, published: true } },
          },
        }),
      );
    }
    if (!p)
      return NextResponse.json({
        user: {
          name: u.name,
          timezone: u.timezone,
          role: u.role,
          preferences: u.preferences,
        },
        pregnancy: null,
        pregnancies: [],
      });
    await pregnancyAccess(
      p.id,
      u.id,
      kind === "appointment"
        ? "appointment"
        : kind === "task"
          ? "task"
          : ["dashboard", "family"].includes(kind)
            ? "progress"
            : "private",
    );
    if (kind === "task")
      return NextResponse.json(
        await db.task.findMany({
          where: { pregnancyId: p.id },
          orderBy: [{ completed: "asc" }, { createdAt: "desc" }],
        }),
      );
    if (kind === "appointment")
      return NextResponse.json(
        await db.appointment.findMany({
          where: { pregnancyId: p.id },
          orderBy: { at: "asc" },
        }),
      );
    if (kind === "family") {
      if (p.ownerId !== u.id) return NextResponse.json([]);
      return NextResponse.json(
        await db.pregnancyMember.findMany({
          where: { pregnancyId: p.id },
          include: { user: { select: { name: true, email: true } } },
        }),
      );
    }
    if (kinds.safeParse(kind).success)
      return NextResponse.json(
        await db.entry.findMany({
          where: { pregnancyId: p.id, kind },
          orderBy: { date: "desc" },
          include: {
            file: { select: { id: true, mime: true, name: true } },
            attachments: {
              include: {
                file: { select: { id: true, mime: true, name: true } },
              },
            },
          },
        }),
      );
    const g = gestation(
      p.dueDate.toISOString().slice(0, 10),
      todayInZone(p.owner.timezone),
    );
    const week = await db.weeklyDevelopment.findFirst({
      where: {
        ...publishedWeeklyWhere,
        week: g.currentWeek,
      },
      include: { illustration: { select: { slug: true, published: true } } },
    });
    const next =
      p.ownerId === u.id ||
      (await db.pregnancyMember.findFirst({
        where: { pregnancyId: p.id, userId: u.id, appointments: true },
      }))
        ? await db.appointment.findFirst({
            where: {
              pregnancyId: p.id,
              at: { gte: new Date() },
              completed: false,
            },
            orderBy: { at: "asc" },
          })
        : null;
    return NextResponse.json({
      user: {
        name: u.name,
        timezone: u.timezone,
        role: u.role,
        preferences: u.preferences,
      },
      pregnancy: p,
      pregnancies,
      gestation: g,
      pregnancyTimezone: p.owner.timezone,
      week,
      next,
      isOwner: p.ownerId === u.id,
    });
  } catch (e) {
    return NextResponse.json({ error: publicError(e) }, { status: 403 });
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await currentUser();
    const b = await req.json();
    if (b.action === "pregnancy") {
      const d = z
        .object({
          date,
          source: z.enum(["LMP", "MEDICAL"]),
          babyName: z.string().max(100).optional(),
          partnerName: z.string().max(100).optional(),
          timezone: z.string(),
        })
        .parse(b);
      todayInZone(d.timezone);
      const due = d.source === "LMP" ? addDays(d.date, 280) : d.date;
      const elapsed = gestation(due, todayInZone(d.timezone)).elapsed;
      if (elapsed < -280 || elapsed > 350)
        throw new Error("Revisá la fecha del embarazo");
      const p = await db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: u.id },
          data: { timezone: d.timezone },
        });
        return tx.pregnancy.create({
          data: {
            ownerId: u.id,
            dueDate: new Date(due),
            datingSource: d.source,
            babyName: d.babyName,
            partnerName: d.partnerName,
            datingHistory: {
              create: { dueDate: new Date(due), source: d.source },
            },
          },
        });
      });
      return NextResponse.json(p);
    }
    if (b.action === "preferences") {
      const d = z
        .object({
          weekly: z.boolean(),
          appointment: z.boolean(),
          family: z.boolean(),
          size: z.enum(["fruit", "measurement"]),
          timezone: z.string().optional(),
        })
        .parse(b);
      const { timezone, ...preferences } = d;
      if (timezone) todayInZone(timezone);
      await db.user.update({
        where: { id: u.id },
        data: { preferences, ...(timezone ? { timezone } : {}) },
      });
      return NextResponse.json({ ok: true });
    }
    if (b.action === "read") {
      await db.notification.updateMany({
        where: { id: z.string().parse(b.id), userId: u.id },
        data: { read: true },
      });
      return NextResponse.json({ ok: true });
    }
    if (b.action === "accept") {
      const token = z.string().length(64).parse(b.token);
      await db.$transaction(async (tx) => {
        const invite = await tx.invitation.findUnique({
          where: {
            tokenHash: createHash("sha256").update(token).digest("hex"),
          },
        });
        if (
          !invite ||
          invite.email !== u.email ||
          invite.expiresAt < new Date() ||
          invite.acceptedAt
        )
          throw new Error("Invitación inválida o vencida");
        const changed = await tx.invitation.updateMany({
          where: { id: invite.id, acceptedAt: null },
          data: { acceptedAt: new Date() },
        });
        if (changed.count !== 1) throw new Error("Invitación usada");
        await tx.pregnancyMember.upsert({
          where: {
            pregnancyId_userId: {
              pregnancyId: invite.pregnancyId,
              userId: u.id,
            },
          },
          create: {
            pregnancyId: invite.pregnancyId,
            userId: u.id,
            appointments: invite.appointments,
            tasks: invite.tasks,
          },
          update: { appointments: invite.appointments, tasks: invite.tasks },
        });
      });
      return NextResponse.json({ ok: true });
    }
    const p = await pregnancyAccess(
      z.string().parse(b.pregnancyId),
      u.id,
      ["appointment", "complete", "deleteAppointment"].includes(b.action)
        ? "appointment"
        : ["task", "deleteTask"].includes(b.action)
          ? "task"
          : "private",
    );
    if (b.action === "dating") {
      const d = z
        .object({
          date,
          source: z.enum(["LMP", "MEDICAL"]),
          confirmed: z.literal(true),
        })
        .parse(b);
      const due = d.source === "LMP" ? addDays(d.date, 280) : d.date;
      await db.pregnancy.update({
        where: { id: p.id },
        data: {
          dueDate: new Date(due),
          datingSource: d.source,
          datingHistory: {
            create: { dueDate: new Date(due), source: d.source },
          },
        },
      });
    } else if (b.action === "archive")
      await db.pregnancy.update({
        where: { id: p.id },
        data: { archived: true },
      });
    else if (b.action === "entry") {
      const d = z
        .object({
          kind: kinds,
          title: z.string().min(1).max(150),
          text: z.string().max(20000),
          date,
          mood: z.string().max(100).optional(),
          fileId: z.string().optional(),
          fileIds: z.array(z.string()).max(4).optional(),
          appointmentId: z.string().nullable().optional(),
        })
        .parse(b);
      if (d.fileIds?.length && d.kind !== "journal")
        throw new Error("Los adjuntos múltiples se admiten en el diario");
      for (const id of d.fileIds || []) {
        if (
          id === d.fileId ||
          !(await db.uploadedFile.findFirst({
            where: {
              id,
              ownerId: u.id,
              mime: { startsWith: "image/" },
              graphic: { is: null },
            },
          }))
        )
          throw new Error("Adjunto no autorizado");
      }
      if (
        d.fileId &&
        !(await db.uploadedFile.findFirst({
          where: { id: d.fileId, ownerId: u.id, graphic: { is: null } },
        }))
      )
        throw new Error("Archivo no autorizado");
      if (d.fileId && d.kind !== "ultrasound") {
        const file = await db.uploadedFile.findUniqueOrThrow({
          where: { id: d.fileId },
        });
        if (!file.mime.startsWith("image/"))
          throw new Error("Este registro requiere una imagen");
      }
      if (
        d.appointmentId &&
        !(await db.appointment.findFirst({
          where: { id: d.appointmentId, pregnancyId: p.id, completed: true },
        }))
      )
        throw new Error("La cita debe estar realizada");
      if (["ultrasound", "belly"].includes(d.kind) && !d.fileId && !b.id)
        throw new Error("Seleccioná un archivo");
      const { fileIds, ...fields } = d;
      const data = {
        ...fields,
        pregnancyId: p.id,
        date: new Date(d.date),
        gestationalDays: gestation(p.dueDate.toISOString().slice(0, 10), d.date)
          .elapsed,
      };
      if (b.id) {
        const old = await db.entry.findFirstOrThrow({
          where: { id: b.id, pregnancyId: p.id, kind: d.kind },
        });
        await db.entry.update({
          where: { id: old.id },
          data: {
            ...data,
            ...(fileIds
              ? {
                  attachments: {
                    deleteMany: {},
                    create: fileIds.map((fileId) => ({ fileId })),
                  },
                }
              : {}),
          },
        });
      } else
        await db.entry.create({
          data: {
            ...data,
            attachments: {
              create: (fileIds || []).map((fileId) => ({ fileId })),
            },
          },
        });
    } else if (b.action === "task") {
      const d = z
        .object({
          title: z.string().min(1).max(150),
          completed: z.boolean(),
          dueDate: date.nullable().optional(),
        })
        .parse(b);
      const fields = {
        title: d.title,
        completed: d.completed,
        dueDate: d.dueDate ? new Date(d.dueDate) : null,
      };
      if (b.id) {
        await db.task.findFirstOrThrow({
          where: { id: b.id, pregnancyId: p.id },
        });
        await db.task.update({ where: { id: b.id }, data: fields });
      } else await db.task.create({ data: { pregnancyId: p.id, ...fields } });
    } else if (b.action === "deleteTask") {
      await db.task.deleteMany({
        where: { id: z.string().parse(b.id), pregnancyId: p.id },
      });
    } else if (b.action === "deleteEntry") {
      const entry = await db.entry.findFirstOrThrow({
        where: { id: z.string().parse(b.id), pregnancyId: p.id },
        include: { file: true, attachments: { include: { file: true } } },
      });
      const files = [
        entry.file,
        ...entry.attachments.map((a) => a.file),
      ].filter((f): f is NonNullable<typeof f> => !!f);
      for (const file of files)
        await storage().send(
          new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: file.key,
          }),
        );
      await db.$transaction(async (tx) => {
        await tx.entry.delete({ where: { id: entry.id } });
        await tx.uploadedFile.deleteMany({
          where: { id: { in: files.map((f) => f.id) }, ownerId: u.id },
        });
      });
    } else if (b.action === "appointment") {
      const d = z
        .object({
          title: z.string().min(1).max(150),
          type: z.enum([
            "Consulta obstétrica",
            "Ecografía",
            "Análisis de laboratorio",
            "Estudio prenatal",
            "Otro",
          ]),
          at: z.iso.datetime({ offset: true }),
          professional: z.string().max(150),
          location: z.string().max(200),
          address: z.string().max(300).optional(),
          notes: z.string().max(5000),
          reminder: z.number().int().min(0).max(10080),
        })
        .parse(b);
      const { reminder, ...fields } = d;
      await db.$transaction(async (tx) => {
        if (b.id)
          await tx.appointment.findFirstOrThrow({
            where: { id: b.id, pregnancyId: p.id },
          });
        const a = b.id
          ? await tx.appointment.update({
              where: { id: b.id },
              data: { ...fields, at: new Date(d.at) },
            })
          : await tx.appointment.create({
              data: { ...fields, pregnancyId: p.id, at: new Date(d.at) },
            });
        await tx.appointmentReminder.deleteMany({
          where: { appointmentId: a.id, sentAt: null },
        });
        if (reminder > 0)
          await tx.appointmentReminder.create({
            data: {
              appointmentId: a.id,
              dueAt: new Date(new Date(d.at).getTime() - reminder * 60000),
            },
          });
      });
    } else if (b.action === "complete") {
      await db.appointment.updateMany({
        where: { id: b.id, pregnancyId: p.id },
        data: { completed: !!b.completed },
      });
    } else if (b.action === "deleteAppointment")
      await db.appointment.deleteMany({
        where: { id: b.id, pregnancyId: p.id },
      });
    else if (b.action === "invite") {
      const d = z
        .object({
          email: z.email().transform((v) => v.toLowerCase()),
          appointments: z.boolean(),
          tasks: z.boolean().default(false),
        })
        .parse(b);
      if (d.email === u.email) throw new Error("Elegí otro correo");
      if (!process.env.SMTP_URL) throw new Error("Correo no configurado");
      const token = randomBytes(32).toString("hex");
      await sendMail(
        d.email,
        "Te invitaron a BAMBEE",
        `Aceptá explícitamente la invitación: ${process.env.APP_URL}/familia?token=${token}`,
      );
      const invite = await db.invitation.create({
        data: {
          pregnancyId: p.id,
          email: d.email,
          appointments: d.appointments,
          tasks: d.tasks,
          tokenHash: createHash("sha256").update(token).digest("hex"),
          expiresAt: new Date(Date.now() + 172800000),
        },
      });
      const recipient = await db.user.findUnique({ where: { email: d.email } });
      if (
        recipient &&
        (recipient.preferences as Record<string, boolean>).family !== false
      )
        await db.notification.create({
          data: {
            userId: recipient.id,
            category: "family",
            title:
              "Recibiste una invitación familiar. Revisá tu correo para aceptarla.",
            dedupe: "invite:" + invite.id,
          },
        });
    } else if (b.action === "memberPermission") {
      const d = z
        .object({
          id: z.string(),
          appointments: z.boolean(),
          tasks: z.boolean().default(false),
        })
        .parse(b);
      await db.pregnancyMember.updateMany({
        where: { id: d.id, pregnancyId: p.id },
        data: { appointments: d.appointments, tasks: d.tasks },
      });
    } else if (b.action === "revokeMember")
      await db.pregnancyMember.deleteMany({
        where: { id: b.id, pregnancyId: p.id },
      });
    else throw new Error("Acción inválida");
    await db.auditLog.create({
      data: { actorId: u.id, action: b.action, targetId: p.id },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof z.ZodError
            ? "Revisá los campos ingresados"
            : publicError(e),
      },
      { status: 400 },
    );
  }
}
