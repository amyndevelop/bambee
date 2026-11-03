import { boundedJson } from "@/modules/tools/bounded-json";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, sameOrigin } from "@/lib/server";
import { publicError } from "@/lib/errors";
import {
  nameSchema,
  normalizeName,
  text,
  identifier,
  publicUrl,
} from "@/modules/tools/validation";
import { z } from "zod";
async function administrator() {
  const u = await currentUser();
  if (!["ADMIN", "EDITOR", "REVIEWER"].includes(u.role))
    throw new Error("FORBIDDEN");
  return u;
}
export async function GET() {
  try {
    await administrator();
    return NextResponse.json(
      {
        templates: await db.toolTemplate.findMany({ orderBy: { kind: "asc" } }),
        names: await db.babyName.findMany({
          orderBy: { normalized: "asc" },
          take: 2000,
        }),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return NextResponse.json({ error: publicError(e) }, { status: 403 });
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await administrator();
    if (Number(req.headers.get("content-length") || 0) > 500000)
      throw new Error("Máximo 500 KB");
    const b = await boundedJson(req, 500000);
    if (b.op === "names") {
      const rows = z.array(nameSchema).min(1).max(500).parse(b.data);
      for (const { id, ...v } of rows) {
        if (
          v.verification !== "PENDING" &&
          !["ADMIN", "REVIEWER"].includes(u.role)
        )
          throw new Error("Se requiere revisión");
        const normalized = normalizeName(v.name);
        if (id) {
          await db.babyName.update({
            where: { id },
            data: { ...v, normalized },
          });
        } else
          await db.babyName.upsert({
            where: { normalized },
            create: { ...v, normalized },
            update: {},
          });
      }
    } else if (b.op === "template") {
      const v = z
        .object({
          id: identifier.optional(),
          slug: z.string().regex(/^[a-z0-9-]{1,80}$/),
          kind: z.enum(["PREPARATIONS", "CARD", "REVIEWED_GUIDANCE"]),
          title: text,
          config: z.unknown(),
          published: z.boolean(),
        })
        .parse(b.data);
      let config;
      if (v.kind === "PREPARATIONS")
        config = z
          .array(
            z.object({
              key: identifier,
              title: text,
              items: z.array(text).min(1).max(50),
            }),
          )
          .min(1)
          .max(20)
          .parse(v.config);
      else if (v.kind === "CARD")
        config = z
          .object({
            type: z.enum([
              "week",
              "countdown",
              "announcement",
              "arrival",
              "photo",
            ]),
            defaultText: z.string().max(240),
          })
          .parse(v.config);
      else {
        const guidance = z
          .object({
            text: z.string().min(1).max(10000),
            sourceUrls: z.array(publicUrl).min(1),
          })
          .parse(v.config);
        if (!["ADMIN", "REVIEWER"].includes(u.role))
          throw new Error("Se requiere revisión profesional registrada");
        config = {
          ...guidance,
          reviewedBy: u.name,
          reviewedAt: new Date().toISOString(),
        };
      }
      const { id, ...data } = v;
      if (id)
        await db.toolTemplate.update({
          where: { id },
          data: { ...data, config },
        });
      else await db.toolTemplate.create({ data: { ...data, config } });
    } else throw new Error("Acción inválida");
    await db.auditLog.create({
      data: { actorId: u.id, action: "TOOLS_CATALOG_EDIT" },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: publicError(e) }, { status: 400 });
  }
}
