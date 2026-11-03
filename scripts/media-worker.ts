import "dotenv/config";
import { db } from "../src/lib/db";
import { renderVideo } from "../src/modules/tools/video-renderer";
import {
  privateImage,
  removePrivateVideo,
} from "../src/modules/tools/video-storage";
import { timelapseSchema } from "../src/modules/tools/validation";
import { gestationalAgeFromDays } from "../src/lib/gestation";
import { storage } from "../src/lib/storage";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
export async function mediaTick() {
  await db.bellyTimelapse.updateMany({
    where: {
      status: "PROCESSING",
      startedAt: { lt: new Date(Date.now() - 30 * 60000) },
    },
    data: {
      status: "FAILED",
      error: "El trabajo fue interrumpido. Podés reintentarlo.",
    },
  });
  const expired = await db.bellyTimelapse.findMany({
    where: { expiresAt: { lt: new Date() }, outputFileId: { not: null } },
  });
  for (const job of expired) {
    if (job.outputFileId)
      await removePrivateVideo(job.outputFileId, job.userId);
    await db.bellyTimelapse.update({
      where: { id: job.id },
      data: { status: "EXPIRED", outputFileId: null },
    });
  }
  const job = await db.bellyTimelapse.findFirst({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "asc" },
  });
  if (!job) return false;
  const claim = await db.bellyTimelapse.updateMany({
    where: { id: job.id, status: "QUEUED" },
    data: { status: "PROCESSING", startedAt: new Date(), progress: 0 },
  });
  if (!claim.count) return false;
  let uploadedKey: string | undefined;
  try {
    const config = timelapseSchema.parse(job.config),
      pregnancy = await db.pregnancy.findFirstOrThrow({
        where: { id: job.pregnancyId, ownerId: job.userId },
      });
    const images: Buffer[] = [],
      labels: string[] = [];
    for (const photo of config.photos) {
      const entry = await db.entry.findFirstOrThrow({
        where: {
          id: photo.entryId,
          pregnancyId: job.pregnancyId,
          kind: "belly",
          OR: [
            { fileId: photo.fileId },
            { attachments: { some: { fileId: photo.fileId } } },
          ],
        },
      });
      images.push(await privateImage(photo.fileId, job.userId));
      labels.push(
        [
          config.showWeek
            ? `Semana ${gestationalAgeFromDays(entry.gestationalDays).currentWeek}`
            : "",
          config.showDate ? entry.date.toISOString().slice(0, 10) : "",
          config.showName ? pregnancy.babyName || "" : "",
        ]
          .filter(Boolean)
          .join(" · "),
      );
    }
    const bytes = await renderVideo({
      images,
      labels,
      seconds: config.seconds,
      format: config.format,
      transition: config.transition,
      brand: config.showBrand,
      onProgress: async (progress) => {
        await db.bellyTimelapse.update({
          where: { id: job.id },
          data: { progress },
        });
      },
    });
    uploadedKey = `private/${job.userId}/timelapse-${randomUUID()}.mp4`;
    await storage().send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: uploadedKey,
        Body: bytes,
        ContentType: "video/mp4",
      }),
    );
    await db.$transaction(async (tx) => {
      const file = await tx.uploadedFile.create({
        data: {
          ownerId: job.userId,
          key: uploadedKey!,
          mime: "video/mp4",
          size: bytes.length,
          name: "bambee-mi-evolucion.mp4",
        },
      });
      await tx.bellyTimelapse.update({
        where: { id: job.id },
        data: {
          status: "READY",
          progress: 100,
          outputFileId: file.id,
          finishedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 86400000),
        },
      });
    });
  } catch {
    if (uploadedKey)
      await storage()
        .send(
          new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: uploadedKey,
          }),
        )
        .catch(() => {});
    await db.bellyTimelapse.updateMany({
      where: { id: job.id },
      data: {
        status: "FAILED",
        error:
          "No se pudo generar el video. Revisá las fotos, el almacenamiento y el trabajador multimedia.",
      },
    });
  }
  return true;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  for (;;) {
    try {
      await mediaTick();
    } catch {
      console.error("BAMBEE_MEDIA_WORKER_ERROR");
    }
    await new Promise((r) => setTimeout(r, 15000));
  }
}
