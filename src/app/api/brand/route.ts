import { db } from "@/lib/db";
import { currentUser, sameOrigin } from "@/lib/server";
import { storage } from "@/lib/storage";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { z } from "zod";
export async function GET(req: Request) {
  try {
    const slug = new URL(req.url).searchParams.get("slug");
    if (!slug)
      return NextResponse.json(
        await db.graphicAsset.findMany({
          where: { published: true },
          select: { id: true, slug: true },
        }),
      );
    const asset = await db.graphicAsset.findFirstOrThrow({
      where: { slug, published: true },
      include: { file: true },
    });
    return NextResponse.redirect(
      await getSignedUrl(
        storage(),
        new GetObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: asset.file.key,
          ResponseCacheControl: "private, no-store",
        }),
        { expiresIn: 60 },
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Recurso no disponible" },
      { status: 404 },
    );
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await currentUser();
    if (!["ADMIN", "EDITOR"].includes(u.role))
      throw new Error("Acceso restringido");
    const d = z
      .object({
        slug: z.string().regex(/^[a-z0-9-]{1,64}$/),
        fileId: z.string(),
        published: z.boolean(),
      })
      .parse(await req.json());
    const file = await db.uploadedFile.findFirstOrThrow({
      where: {
        id: d.fileId,
        ownerId: u.id,
        graphic: { is: null },
        entry: { is: null },
        attachment: { is: null },
      },
    });
    if (!file.mime.startsWith("image/"))
      throw new Error("Se requiere una imagen");
    await db.graphicAsset.upsert({
      where: { slug: d.slug },
      create: d,
      update: d,
    });
    await db.auditLog.create({
      data: { actorId: u.id, action: "BRAND_ASSET_UPDATE", targetId: d.slug },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Revisá el recurso y tus permisos" },
      { status: 400 },
    );
  }
}
