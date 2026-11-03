import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { db } from "../../lib/db";
import { storage } from "../../lib/storage";
export async function privateImage(fileId: string, ownerId: string) {
  const file = await db.uploadedFile.findFirstOrThrow({
    where: { id: fileId, ownerId },
  });
  if (!file.mime.startsWith("image/") || file.size > 10000000)
    throw new Error("Imagen no válida");
  const result = await storage().send(
    new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: file.key }),
  );
  if (!result.Body) throw new Error("Archivo no disponible");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of result.Body as AsyncIterable<Uint8Array>) {
    size += chunk.length;
    if (size > 10000000) throw new Error("Imagen demasiado grande");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
export async function removePrivateVideo(fileId: string, ownerId: string) {
  const file = await db.uploadedFile.findFirstOrThrow({
    where: { id: fileId, ownerId, mime: "video/mp4" },
  });
  await storage().send(
    new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: file.key }),
  );
  await db.uploadedFile.delete({ where: { id: file.id } });
}
