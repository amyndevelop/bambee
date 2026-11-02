import { passwordSchema } from "@/lib/validation";
import { throttle } from "@/lib/auth";
import { db } from "@/lib/db";
import { publicError } from "@/lib/errors";
import { sendMail } from "@/lib/mail";
import { currentUser, sameOrigin } from "@/lib/server";
import { hash } from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const body = await req.json();
    if (body.action === "register") {
      const d = z
        .object({
          name: z.string().min(1).max(100),
          email: z.email().transform((v) => v.toLowerCase()),
          password: passwordSchema,
          consent: z.literal(true),
        })
        .parse(body);
      await throttle("register:" + d.email, 4);
      const u = await db.user.create({
        data: {
          name: d.name,
          email: d.email,
          passwordHash: await hash(d.password, 12),
          consents: { create: { version: "health-v1" } },
        },
      });
      await db.auditLog.create({ data: { actorId: u.id, action: "REGISTER" } });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "forgot") {
      const email = z.email().parse(body.email).toLowerCase();
      await throttle("reset:" + email, 3);
      if (!process.env.SMTP_URL) throw new Error("Correo no configurado");
      const u = await db.user.findUnique({ where: { email } });
      if (u) {
        const token = randomBytes(32).toString("hex");
        await db.actionToken.create({
          data: {
            userId: u.id,
            hash: createHash("sha256").update(token).digest("hex"),
            expiresAt: new Date(Date.now() + 1800000),
          },
        });
        await sendMail(
          email,
          "Recuperá tu acceso a BAMBEE",
          `${process.env.APP_URL}/acceso?reset=${token}`,
        );
      }
      return NextResponse.json({ ok: true });
    }
    if (body.action === "reset") {
      const d = z
        .object({
          token: z.string().length(64),
          password: passwordSchema,
        })
        .parse(body);
      await db.$transaction(async (tx) => {
        const t = await tx.actionToken.findUnique({
          where: { hash: createHash("sha256").update(d.token).digest("hex") },
        });
        if (!t || t.expiresAt < new Date())
          throw new Error("Enlace inválido o vencido");
        await tx.actionToken.delete({ where: { id: t.id } });
        await tx.user.update({
          where: { id: t.userId },
          data: {
            passwordHash: await hash(d.password, 12),
            sessionVersion: { increment: 1 },
          },
        });
      });
      return NextResponse.json({ ok: true });
    }
    const u = await currentUser();
    if (body.action === "revoke") {
      await db.user.update({
        where: { id: u.id },
        data: { sessionVersion: { increment: 1 } },
      });
      return NextResponse.json({ ok: true });
    }
    throw new Error("Acción inválida");
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof z.ZodError
            ? "Revisá los campos. La contraseña requiere al menos 12 caracteres."
            : e instanceof Error && e.message.includes("Unique")
              ? "No se pudo registrar la cuenta"
              : publicError(e),
      },
      { status: 400 },
    );
  }
}
