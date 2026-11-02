import { passwordSchema } from "@/lib/validation";
import { compare } from "bcryptjs";
import { createHash } from "crypto";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "./db";
export async function throttle(key: string, limit = 8) {
  const hash = createHash("sha256").update(key).digest("hex");
  const now = new Date();
  const rows = await db.$queryRaw<
    { count: number }[]
  >`INSERT INTO "LoginAttempt" ("key","count","resetAt") VALUES (${hash},1,${new Date(Date.now() + 900000)}) ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "LoginAttempt"."resetAt" < ${now} THEN 1 ELSE "LoginAttempt"."count"+1 END,"resetAt"=CASE WHEN "LoginAttempt"."resetAt" < ${now} THEN ${new Date(Date.now() + 900000)} ELSE "LoginAttempt"."resetAt" END RETURNING "count"`;
  if (rows[0].count > limit)
    throw new Error("Demasiados intentos. Probá en 15 minutos.");
}
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/acceso" },
  providers: [
    Credentials({
      name: "Correo y contraseña",
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(raw) {
        const data = z
          .object({
            email: z.email().transform((v) => v.toLowerCase()),
            password: passwordSchema,
          })
          .parse(raw);
        await throttle("login:" + data.email);
        const user = await db.user.findUnique({ where: { email: data.email } });
        if (!user || !(await compare(data.password, user.passwordHash)))
          return null;
        await db.auditLog.create({
          data: { actorId: user.id, action: "LOGIN" },
        });
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          version: user.sessionVersion,
        } as never;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.version = (user as unknown as { version: number }).version;
      }
      return token;
    },
    async session({ session, token }) {
      const user = await db.user.findUnique({
        where: { id: String(token.uid) },
      });
      if (!user || user.sessionVersion !== token.version)
        throw new Error("Sesión revocada");
      (session.user as unknown as { id: string }).id = user.id;
      return session;
    },
  },
};
