import type { User } from "@prisma/client";
import { db } from "../../lib/db";
import { z } from "zod";
import { toolContext } from "./access";
import {
  cardSchema,
  contractionEventSchema,
  date,
  identifier,
  instant,
  nameSchema,
  normalizeName,
  notes,
  questionSchema,
  taskSchema,
  text,
  timelapseSchema,
} from "./validation";
import { removePrivateVideo } from "./video-storage";

export async function readTools(
  user: User,
  pregnancyId: string,
  module: string,
  params: URLSearchParams,
) {
  const { pregnancy: p, owner } = await toolContext(user, pregnancyId, module);
  if (module === "overview") {
    const taskAccess =
      owner || p.members.some((m) => m.userId === user.id && m.tasks);
    const [tasks, totalQuestions] = await Promise.all([
      taskAccess
        ? db.task.findMany({
            where: { pregnancyId },
            select: { completed: true },
          })
        : [],
      owner
        ? db.medicalQuestion.count({
            where: { pregnancyId, userId: user.id, answered: false },
          })
        : 0,
    ]);
    return {
      tasks: {
        total: tasks.length,
        completed: tasks.filter((t) => t.completed).length,
      },
      pendingQuestions: totalQuestions,
      permissions: {
        preparations: taskAccess,
        names: owner || p.members.some((m) => m.userId === user.id && m.names),
        questions:
          owner || p.members.some((m) => m.userId === user.id && m.questions),
        cards: owner || p.members.some((m) => m.userId === user.id && m.cards),
        private: owner,
      },
    };
  }
  if (module === "preparations")
    return {
      tasks: await db.task.findMany({
        where: { pregnancyId },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      }),
      categories: await db.preparationCategory.findMany({
        where: { pregnancyId },
        orderBy: { position: "asc" },
      }),
      templates: await db.toolTemplate.findMany({
        where: { kind: "PREPARATIONS", published: true },
      }),
      people: await db.user.findMany({
        where: {
          id: {
            in: [
              p.ownerId,
              ...p.members.filter((m) => m.tasks).map((m) => m.userId),
            ],
          },
        },
        select: { id: true, name: true },
      }),
    };
  if (module === "questions")
    return {
      questions: await db.medicalQuestion.findMany({
        where: { pregnancyId, OR: [{ userId: user.id }, { shared: true }] },
        orderBy: { createdAt: "desc" },
      }),
      appointments: await db.appointment.findMany({
        where: {
          pregnancyId,
          ...(!owner &&
          !p.members.some((m) => m.userId === user.id && m.appointments)
            ? { id: "not-authorized" }
            : {}),
        },
        orderBy: { at: "asc" },
      }),
    };
  if (module === "names") {
    const gender = z
        .enum(["F", "M", "U"])
        .optional()
        .parse(params.get("gender") || undefined),
      q = normalizeName(params.get("q") || ""),
      first = normalizeName(params.get("first") || "");
    const min = z.coerce
        .number()
        .int()
        .min(0)
        .max(60)
        .parse(params.get("min") || 0),
      max = z.coerce
        .number()
        .int()
        .min(1)
        .max(60)
        .parse(params.get("max") || 60);
    const catalog = await db.babyName.findMany({
      where: {
        normalized: { contains: q, startsWith: first },
        ...(gender ? { gender } : {}),
        ...(params.get("origin") ? { origin: params.get("origin")! } : {}),
      },
      orderBy: { normalized: "asc" },
      take: 2000,
    });
    const choices = await db.babyNameChoice.findMany({
      where: {
        pregnancyId,
        userId: {
          in: [
            p.ownerId,
            ...p.members.filter((m) => m.names).map((m) => m.userId),
          ],
        },
      },
      include: { user: { select: { name: true } } },
    });
    const mine = choices.filter((c) => c.userId === user.id);
    return {
      names: catalog
        .filter((n) => [...n.name].length >= min && [...n.name].length <= max)
        .map((n) => ({
          ...n,
          meaning: n.verification === "PENDING" ? null : n.meaning,
        })),
      choices: mine,
      partnerVotes: choices
        .filter(
          (c) =>
            c.userId !== user.id &&
            (c.shared || !!mine.find((m) => m.nameId === c.nameId && m.vote)),
        )
        .map((c) => ({
          nameId: c.nameId,
          vote: c.vote,
          favorite: c.favorite,
          finalist: c.finalist,
          person: c.user.name,
        })),
      origins: (
        await db.babyName.findMany({
          where: { origin: { not: null } },
          distinct: ["origin"],
          select: { origin: true },
        })
      ).map((n) => n.origin),
    };
  }
  if (module === "cards")
    return {
      cards: await db.shareCard.findMany({
        where: { pregnancyId, OR: [{ userId: user.id }, { shared: true }] },
        orderBy: { createdAt: "desc" },
      }),
      templates: await db.toolTemplate.findMany({
        where: { kind: "CARD", published: true },
      }),
      photos: owner
        ? await db.entry.findMany({
            where: {
              pregnancyId,
              kind: { in: ["belly", "journal", "ultrasound"] },
            },
            include: { file: true, attachments: { include: { file: true } } },
            orderBy: { date: "asc" },
          })
        : [],
    };
  if (module === "timelapse")
    return {
      jobs: await db.bellyTimelapse.findMany({
        where: { pregnancyId, userId: user.id },
        orderBy: { createdAt: "desc" },
      }),
      photos: await db.entry.findMany({
        where: { pregnancyId, kind: "belly" },
        include: { file: true, attachments: { include: { file: true } } },
        orderBy: { date: "asc" },
      }),
      available: process.env.MEDIA_WORKER_ENABLED === "true",
    };
  if (module === "contractions")
    return {
      sessions: await db.contractionSession.findMany({
        where: { pregnancyId, userId: user.id },
        include: { records: { orderBy: { startedAt: "asc" } } },
        orderBy: { startedAt: "desc" },
        take: 100,
      }),
      safety: await db.toolTemplate.findFirst({
        where: {
          slug: "contraction-safety",
          kind: "REVIEWED_GUIDANCE",
          published: true,
        },
      }),
    };
  throw new Error("Módulo inválido");
}
export async function writeTools(user: User, body: Record<string, unknown>) {
  const pregnancyId = identifier.parse(body.pregnancyId),
    module = z.string().parse(body.module),
    op = z.string().parse(body.op);
  const { pregnancy: p, owner } = await toolContext(user, pregnancyId, module);
  const d = body.data;
  if (module === "overview" && op === "permissions") {
    if (!owner) throw new Error("FORBIDDEN");
    const v = z
      .object({
        id: identifier,
        names: z.boolean(),
        questions: z.boolean(),
        cards: z.boolean(),
        tasks: z.boolean(),
      })
      .parse(d);
    await db.pregnancyMember.updateMany({
      where: { id: v.id, pregnancyId },
      data: {
        names: v.names,
        questions: v.questions,
        cards: v.cards,
        tasks: v.tasks,
      },
    });
  } else if (module === "preparations") {
    if (op === "import") {
      const { templateId } = z.object({ templateId: identifier }).parse(d);
      const template = await db.toolTemplate.findFirstOrThrow({
        where: { id: templateId, kind: "PREPARATIONS", published: true },
      });
      const categories = z
        .array(
          z.object({
            key: identifier,
            title: text,
            items: z.array(text).max(50),
          }),
        )
        .max(20)
        .parse(template.config);
      await db.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${pregnancyId}, 701))`;
          for (const [position, category] of categories.entries()) {
            const templateKey = template.slug + ":" + category.key;
            const c = await tx.preparationCategory.upsert({
              where: { pregnancyId_templateKey: { pregnancyId, templateKey } },
              create: {
                pregnancyId,
                templateKey,
                title: category.title,
                position,
              },
              update: {},
            });
            for (const [index, title] of category.items.entries()) {
              const templateItemKey = templateKey + ":" + index;
              await tx.task.upsert({
                where: {
                  pregnancyId_templateItemKey: { pregnancyId, templateItemKey },
                },
                create: {
                  pregnancyId,
                  templateItemKey,
                  categoryId: c.id,
                  title,
                  position: index,
                },
                update: {},
              });
            }
          }
        },
        { timeout: 30000, maxWait: 10000 },
      );
    } else if (op === "category") {
      const v = z.object({ id: identifier.optional(), title: text }).parse(d);
      if (v.id)
        await db.preparationCategory.updateMany({
          where: { id: v.id, pregnancyId },
          data: { title: v.title },
        });
      else
        await db.preparationCategory.create({
          data: { pregnancyId, title: v.title },
        });
    } else if (op === "deleteCategory") {
      await db.preparationCategory.deleteMany({
        where: {
          id: identifier.parse((d as Record<string, unknown>).id),
          pregnancyId,
        },
      });
    } else if (op === "save") {
      const { id, ...v } = taskSchema.parse(d);
      if (v.categoryId)
        await db.preparationCategory.findFirstOrThrow({
          where: { id: v.categoryId, pregnancyId },
        });
      if (
        v.assigneeId &&
        v.assigneeId !== p.ownerId &&
        !p.members.some((m) => m.userId === v.assigneeId && m.tasks)
      )
        throw new Error("Responsable sin permiso");
      const data = {
        ...v,
        dueDate: v.dueDate ? new Date(v.dueDate) : null,
        reminderAt: v.reminderAt ? new Date(v.reminderAt) : null,
      };
      if (id) {
        const previous = await db.task.findFirstOrThrow({
          where: { id, pregnancyId },
        });
        await db.task.update({
          where: { id },
          data: {
            ...data,
            ...(previous.reminderAt?.toISOString() !==
            data.reminderAt?.toISOString()
              ? { remindedAt: null }
              : {}),
          },
        });
      } else
        await db.task.create({
          data: {
            ...data,
            pregnancyId,
            position: await db.task.count({ where: { pregnancyId } }),
          },
        });
    } else if (op === "reorder") {
      const ids = z.array(identifier).max(300).parse(d);
      if (
        new Set(ids).size !== ids.length ||
        (await db.task.count({ where: { id: { in: ids }, pregnancyId } })) !==
          ids.length
      )
        throw new Error("Orden inválido");
      await db.$transaction(
        ids.map((id, position) =>
          db.task.update({ where: { id }, data: { position } }),
        ),
      );
    } else if (op === "delete")
      await db.task.deleteMany({
        where: {
          id: identifier.parse((d as Record<string, unknown>).id),
          pregnancyId,
        },
      });
    else throw new Error("Acción inválida");
  } else if (module === "questions") {
    if (op === "save") {
      const { id, ...v } = questionSchema.parse(d);
      if (v.appointmentId) {
        if (
          !owner &&
          !p.members.some((m) => m.userId === user.id && m.appointments)
        )
          throw new Error("FORBIDDEN");
        await db.appointment.findFirstOrThrow({
          where: { id: v.appointmentId, pregnancyId },
        });
      }
      if (id) {
        await db.medicalQuestion.findFirstOrThrow({
          where: { id, pregnancyId, userId: user.id },
        });
        await db.medicalQuestion.update({ where: { id }, data: v });
      } else
        await db.medicalQuestion.create({
          data: { ...v, pregnancyId, userId: user.id },
        });
    } else if (op === "delete")
      await db.medicalQuestion.deleteMany({
        where: {
          id: identifier.parse((d as Record<string, unknown>).id),
          pregnancyId,
          userId: user.id,
        },
      });
    else throw new Error("Acción inválida");
  } else if (module === "names" && op === "choose") {
    const v = z
      .object({
        nameId: identifier,
        favorite: z.boolean(),
        vote: z.enum(["LIKE", "NO", "FAVORITE", "PASS"]).nullable(),
        note: notes,
        shared: z.boolean().default(false),
        finalist: z.boolean().default(false),
      })
      .parse(d);
    await db.babyName.findUniqueOrThrow({ where: { id: v.nameId } });
    return db.babyNameChoice.upsert({
      where: {
        pregnancyId_userId_nameId: {
          pregnancyId,
          userId: user.id,
          nameId: v.nameId,
        },
      },
      create: { ...v, pregnancyId, userId: user.id },
      update: v,
    });
  } else if (module === "cards") {
    if (op === "save") {
      const { id, ...v } = cardSchema.parse(d);
      await db.toolTemplate.findFirstOrThrow({
        where: { id: v.templateId, kind: "CARD", published: true },
      });
      if (v.fileId) {
        const f = await db.uploadedFile.findFirstOrThrow({
          where: { id: v.fileId, ownerId: user.id },
          include: { entry: true, attachment: { include: { entry: true } } },
        });
        if (!f.mime.startsWith("image/"))
          throw new Error("La tarjeta requiere una imagen");
        const entry = f.entry || f.attachment?.entry;
        if (entry && entry.pregnancyId !== pregnancyId)
          throw new Error("FORBIDDEN");
        if ((f.medical || entry?.kind === "ultrasound") && !v.medicalConsent)
          throw new Error(
            "Confirmá que querés incluir este archivo médico privado",
          );
      }
      if (id) {
        await db.shareCard.findFirstOrThrow({
          where: { id, pregnancyId, userId: user.id },
        });
        return db.shareCard.update({ where: { id }, data: v });
      }
      return db.shareCard.create({
        data: { ...v, pregnancyId, userId: user.id },
      });
    } else if (op === "delete")
      await db.shareCard.deleteMany({
        where: {
          id: identifier.parse((d as Record<string, unknown>).id),
          pregnancyId,
          userId: user.id,
        },
      });
    else throw new Error("Acción inválida");
  } else if (module === "timelapse") {
    if (op === "save") {
      const config = timelapseSchema.parse(d);
      for (const photo of config.photos)
        await db.entry.findFirstOrThrow({
          where: {
            id: photo.entryId,
            pregnancyId,
            kind: "belly",
            OR: [
              { fileId: photo.fileId },
              { attachments: { some: { fileId: photo.fileId } } },
            ],
          },
        });
      const count = await db.uploadedFile.count({
        where: {
          id: { in: config.photos.map((p) => p.fileId) },
          ownerId: user.id,
          mime: { startsWith: "image/" },
        },
      });
      if (count !== config.photos.length) throw new Error("FORBIDDEN");
      return db.bellyTimelapse.create({
        data: { pregnancyId, userId: user.id, config },
      });
    } else if (op === "generate") {
      if (process.env.MEDIA_WORKER_ENABLED !== "true")
        throw new Error(
          "La generación de video necesita habilitar el trabajador multimedia privado. Tu proyecto queda guardado.",
        );
      const id = identifier.parse((d as Record<string, unknown>).id);
      if (
        (await db.bellyTimelapse.count({
          where: { userId: user.id, status: { in: ["QUEUED", "PROCESSING"] } },
        })) >= 2
      )
        throw new Error("Ya hay dos videos en proceso");
      await db.bellyTimelapse.updateMany({
        where: {
          id,
          pregnancyId,
          userId: user.id,
          status: { in: ["DRAFT", "FAILED"] },
        },
        data: { status: "QUEUED", progress: 0, error: null },
      });
    } else if (op === "delete") {
      const job = await db.bellyTimelapse.findFirstOrThrow({
        where: {
          id: identifier.parse((d as Record<string, unknown>).id),
          pregnancyId,
          userId: user.id,
        },
      });
      if (job.status === "PROCESSING")
        throw new Error(
          "Esperá a que termine el procesamiento para eliminarlo",
        );
      if (job.outputFileId) await removePrivateVideo(job.outputFileId, user.id);
      await db.bellyTimelapse.delete({ where: { id: job.id } });
    } else throw new Error("Acción inválida");
  } else if (module === "contractions") {
    if (op === "session") {
      const v = z
        .object({
          id: z.uuid(),
          startedAt: instant,
          status: z.enum(["ACTIVE", "PAUSED", "FINISHED"]),
          instructions: notes,
        })
        .parse(d);
      await db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${pregnancyId + user.id}, 702))`;
        const existing = await tx.contractionSession.findUnique({
          where: { id: v.id },
        });
        if (
          existing &&
          (existing.userId !== user.id || existing.pregnancyId !== pregnancyId)
        )
          throw new Error("FORBIDDEN");
        if (
          v.status !== "ACTIVE" &&
          (await tx.contractionRecord.count({
            where: { sessionId: v.id, endedAt: null },
          }))
        )
          throw new Error("Terminá la contracción en curso antes de pausar");
        if (
          v.status === "ACTIVE" &&
          (await tx.contractionSession.count({
            where: {
              pregnancyId,
              userId: user.id,
              status: "ACTIVE",
              id: { not: v.id },
            },
          }))
        )
          throw new Error("Ya tenés una sesión activa");
        if (existing?.status === "FINISHED" && v.status !== "FINISHED")
          throw new Error("La sesión ya finalizó");
        const data = {
          status: v.status,
          instructions: v.instructions,
          endedAt: v.status === "FINISHED" ? new Date() : null,
        };
        await tx.contractionSession.upsert({
          where: { id: v.id },
          create: {
            id: v.id,
            pregnancyId,
            userId: user.id,
            startedAt: new Date(v.startedAt),
            ...data,
          },
          update: data,
        });
      });
    } else if (op === "record" || op === "correct") {
      const v = contractionEventSchema.parse(d);
      const session = await db.contractionSession.findFirstOrThrow({
        where: { id: v.sessionId, pregnancyId, userId: user.id },
      });
      const existing = await db.contractionRecord.findUnique({
        where: { id: v.id },
      });
      if (existing && existing.sessionId !== v.sessionId)
        throw new Error("FORBIDDEN");
      if ((!existing || !v.endedAt) && session.status !== "ACTIVE")
        throw new Error("La sesión no está activa");
      if (op === "record" && existing?.endedAt) return { ok: true }; // idempotent replay never reopens a finished contraction
      if (
        Date.parse(v.startedAt) > Date.now() + 60000 ||
        (v.endedAt && Date.parse(v.endedAt) > Date.now() + 60000)
      )
        throw new Error("No se permiten registros futuros");
      if (op === "correct" && !existing)
        throw new Error("Registro inexistente");
      const values = {
        sessionId: v.sessionId,
        startedAt: new Date(v.startedAt),
        endedAt: v.endedAt ? new Date(v.endedAt) : null,
        note: v.note,
      };
      if (existing)
        await db.contractionRecord.update({
          where: { id: v.id },
          data: values,
        });
      else await db.contractionRecord.create({ data: { id: v.id, ...values } });
    } else if (op === "deleteRecord") {
      const id = identifier.parse((d as Record<string, unknown>).id);
      await db.contractionRecord.deleteMany({
        where: { id, session: { pregnancyId, userId: user.id } },
      });
    } else throw new Error("Acción inválida");
  } else throw new Error("Acción inválida");
  await db.auditLog.create({
    data: {
      actorId: user.id,
      action: "TOOLS_" + module.toUpperCase() + "_" + op.toUpperCase(),
      targetId: pregnancyId,
    },
  });
  return { ok: true };
}
