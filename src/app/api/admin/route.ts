import { db } from "@/lib/db";
import { publicError } from "@/lib/errors";
import { currentUser, sameOrigin } from "@/lib/server";
import { NextResponse } from "next/server";
import { z } from "zod";
export async function GET() {
  try {
    const u = await currentUser();
    if (!["ADMIN", "EDITOR", "REVIEWER"].includes(u.role)) throw new Error();
    return NextResponse.json({
      assets: await db.graphicAsset.findMany({
        where: { published: true },
        select: { id: true, slug: true },
      }),
      users: await db.user.count(),
      pregnancies: await db.pregnancy.count({ where: { archived: false } }),
      entries: await db.entry.count(),
      newUsers: await db.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      }),
      content: await db.weeklyDevelopment.findMany({
        orderBy: { week: "asc" },
      }),
      accounts:
        u.role === "ADMIN"
          ? await db.user.findMany({
              select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                role: true,
              },
              take: 100,
            })
          : [],
    });
  } catch {
    return NextResponse.json({ error: "Acceso restringido" }, { status: 403 });
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await currentUser();
    if (!["ADMIN", "EDITOR", "REVIEWER"].includes(u.role))
      throw new Error("Acceso restringido");
    const b = await req.json();
    const d = z
      .object({
        week: z.number().int().min(1).max(42),
        title: z.string().min(1).max(200),
        summary: z.string().max(1000),
        details: z.string().max(30000),
        fruit: z.string().max(100),
        measurement: z.string().max(200),
        illustrationId: z.string().nullable().optional(),
        referenceUrls: z
          .array(z.url().refine((v) => v.startsWith("https://")))
          .max(50),
        trimester: z.number().int().min(1).max(3).nullable().optional(),
        lengthCm: z.number().positive().max(100).nullable().optional(),
        lengthMinCm: z.number().positive().max(100).nullable().optional(),
        lengthMaxCm: z.number().positive().max(100).nullable().optional(),
        measurementMethod: z
          .enum(["NOT_APPLICABLE", "MICROSCOPIC", "CRL", "TOTAL_LENGTH"])
          .nullable()
          .optional(),
        developmentHighlights: z
          .array(z.string().min(1).max(2000))
          .max(30)
          .optional(),
        maternalChanges: z.string().max(10000).nullable().optional(),
        reviewStatus: z
          .enum(["DRAFT", "PENDING_REVIEW"])
          .default("PENDING_REVIEW"),
        published: z.boolean(),
        review: z.boolean(),
      })
      .parse(b);
    if ((d.published || d.review) && !["ADMIN", "REVIEWER"].includes(u.role))
      throw new Error("Se requiere rol de revisión médica");
    if ((d.review || d.published) && !d.referenceUrls.length)
      throw new Error(
        "Agregá referencias médicas verificadas antes de registrar la revisión o publicar.",
      );
    if (d.published && !d.review)
      throw new Error(
        "La publicación requiere una revisión profesional explícita.",
      );
    if (
      d.lengthMinCm != null &&
      d.lengthMaxCm != null &&
      d.lengthMinCm > d.lengthMaxCm
    )
      throw new Error("Revisá el rango de longitud.");
    if (
      d.illustrationId &&
      !(await db.graphicAsset.findFirst({
        where: { id: d.illustrationId, published: true },
      }))
    )
      throw new Error("Ilustración no publicada");
    const { review, reviewStatus, ...data } = d;
    await db.weeklyDevelopment.upsert({
      where: { week: d.week },
      create: {
        ...data,
        reviewStatus: review ? "APPROVED" : reviewStatus,
        reviewedBy: review ? u.id : null,
        reviewedAt: review ? new Date() : null,
        published: d.published && review,
      },
      update: {
        ...data,
        reviewStatus: review ? "APPROVED" : reviewStatus,
        reviewedBy: review ? u.id : null,
        reviewedAt: review ? new Date() : null,
        published: d.published && review,
      },
    });
    await db.auditLog.create({
      data: {
        actorId: u.id,
        action: "EDITORIAL_UPDATE",
        targetId: String(d.week),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: publicError(e) }, { status: 400 });
  }
}
