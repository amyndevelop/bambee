import { db } from "@/lib/db";
import { publicError } from "@/lib/errors";
import { currentUser, sameOrigin } from "@/lib/server";
import { storage } from "@/lib/storage";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { fileTypeFromBuffer } from "file-type";
import { NextResponse } from "next/server";
import sharp from "sharp";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await currentUser();
    if (Number(req.headers.get("content-length") || 0) > 11000000)
      throw new Error("Archivo demasiado grande");
    const reader = req.body?.getReader();
    if (!reader) throw new Error("Archivo vacío");
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.length;
      if (total > 11000000) {
        await reader.cancel();
        throw new Error("Máximo 10 MB");
      }
      chunks.push(part.value);
    }
    const bounded = new Request(req.url, {
      method: "POST",
      headers: { "content-type": req.headers.get("content-type") || "" },
      body: Buffer.concat(chunks),
    });
    const form = await bounded.formData();
    if (form.get("kind") === "brand" && !["ADMIN", "EDITOR"].includes(u.role))
      throw new Error("Acceso restringido");
    const f = form.get("file");
    if (!(f instanceof File) || f.size > 10000000 || !f.size)
      throw new Error("Máximo 10 MB");
    let bytes: Buffer = Buffer.from(await f.arrayBuffer());
    const type = await fileTypeFromBuffer(bytes);
    if (
      !type ||
      !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
        type.mime,
      )
    )
      throw new Error("Formato no permitido");
    if (form.get("kind") !== "ultrasound" && type.mime === "application/pdf")
      throw new Error("Se requiere una imagen");
    if (type.mime.startsWith("image/")) {
      const image = sharp(bytes, { limitInputPixels: 40000000 });
      const meta = await image.metadata();
      if (!meta.width || !meta.height) throw new Error("Imagen inválida");
      bytes = await image.rotate().toBuffer();
    } else if (
      !bytes
        .subarray(Math.max(0, bytes.length - 2048))
        .includes(Buffer.from("%%EOF"))
    )
      throw new Error("PDF inválido");
    if (bytes.length > 10000000)
      throw new Error("La imagen procesada supera los 10 MB");
    const key = `private/${u.id}/${randomUUID()}.${type.ext}`;
    await storage().send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: bytes,
        ContentType: type.mime,
      }),
    );
    const record = await db.uploadedFile.create({
      data: {
        ownerId: u.id,
        key,
        mime: type.mime,
        size: bytes.length,
        name: f.name.slice(0, 150),
      },
    });
    return NextResponse.json({ id: record.id });
  } catch (e) {
    return NextResponse.json({ error: publicError(e) }, { status: 400 });
  }
}
export async function GET(req: Request) {
  try {
    const u = await currentUser();
    const url = new URL(req.url);
    const f = await db.uploadedFile.findFirstOrThrow({
      where: { id: url.searchParams.get("id") || "", ownerId: u.id },
    });
    const signed = await getSignedUrl(
      storage(),
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: f.key,
        ResponseContentDisposition: url.searchParams.has("download")
          ? "attachment"
          : "inline",
        ResponseCacheControl: "private, no-store",
      }),
      { expiresIn: 60 },
    );
    return NextResponse.redirect(signed, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Archivo no disponible" },
      { status: 403 },
    );
  }
}
export async function DELETE(req: Request) {
  try {
    sameOrigin(req);
    const u = await currentUser();
    const { id } = await req.json();
    const f = await db.uploadedFile.findFirstOrThrow({
      where: { id, ownerId: u.id },
    });
    await storage().send(
      new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: f.key }),
    );
    await db.uploadedFile.delete({ where: { id: f.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar" }, { status: 400 });
  }
}
