import "dotenv/config";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import type { PrismaClient } from "@prisma/client";
import { validateWeeklyDrafts } from "../src/lib/weekly-content";
export async function seedWeeklyDevelopment(client: PrismaClient) {
  const drafts = validateWeeklyDrafts(
    JSON.parse(
      readFileSync(
        new URL("../content/pregnancy/weeks.es-AR.json", import.meta.url),
        "utf8",
      ),
    ),
  );
  const previous = JSON.parse(
    readFileSync(
      new URL("../content/pregnancy/weeks.es-AR.v1.json", import.meta.url),
      "utf8",
    ),
  ) as Record<string, unknown>[];
  await client.$transaction(
    async (tx) => {
      for (const draft of drafts) {
        const row = await tx.weeklyDevelopment.upsert({
          where: { week: draft.week },
          create: draft,
          update: {},
        });
        if (row.editorialPublicationRelease !== null) continue;
        const original = previous.find((item) => item.week === draft.week);
        // Publish this supplied baseline once only. An edited/custom record is preserved.
        const unchanged =
          original &&
          Object.keys(original).every(
            (key) =>
              JSON.stringify(
                (row as unknown as Record<string, unknown>)[key],
              ) === JSON.stringify(original[key]),
          );
        if (unchanged)
          await tx.weeklyDevelopment.update({
            where: { id: row.id },
            data: draft,
          });
      }
      // Replace only the known neutral markers. Preserve custom artwork, text,
      // review metadata and publication choices, including hidden weeks.
      for (const draft of drafts) {
        if (!draft.fruitImage || draft.fruitImageIsPlaceholder) continue;
        await tx.weeklyDevelopment.updateMany({
          where: {
            week: draft.week,
            fruit: draft.fruit,
            fruitImage: draft.fruitImage.replace(/\.png$/, "-pending.png"),
            fruitImageIsPlaceholder: true,
          },
          data: {
            fruitImage: draft.fruitImage,
            fruitImageIsPlaceholder: false,
          },
        });
      }
      // Fill the previously empty section once, retaining custom text, reviews,
      // references and every visibility decision. Never re-fill a v3 edit.
      for (const draft of drafts) {
        const row = await tx.weeklyDevelopment.findUnique({
          where: { week: draft.week },
        });
        if (
          !row ||
          row.contentVersion !== "user-editorial-2026-11-02-public-v2" ||
          row.maternalChanges !== null ||
          row.published ||
          row.reviewStatus !== "PENDING_REVIEW"
        )
          continue;
        await tx.weeklyDevelopment.update({
          where: { id: row.id },
          data: {
            maternalChanges: draft.maternalChanges,
            contentVersion: draft.contentVersion,
            ...(row.referenceUrls.length === 0
              ? {
                  referenceUrls: draft.referenceUrls,
                  sourceNames: draft.sourceNames,
                }
              : {}),
          },
        });
      }
    },
    { timeout: 60000, maxWait: 15000 },
  );
  return {
    available: await client.weeklyDevelopment.count(),
    sourceDrafts: drafts.length,
    editorialPublished: await client.weeklyDevelopment.count({
      where: { editorialPublished: true },
    }),
  };
}
async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("Falta DATABASE_URL para cargar la biblioteca");
  const { db } = await import("../src/lib/db");
  try {
    const result = await seedWeeklyDevelopment(db);
    console.log(
      `Biblioteca semanal: ${result.available} registros; ${result.sourceDrafts} textos editoriales de origen. ${result.editorialPublished} semanas con publicación editorial. Se conservaron las ediciones propias.`,
    );
  } finally {
    await db.$disconnect();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch(() => {
    console.error(
      "No se pudo cargar la biblioteca semanal. Revisá la conexión y las migraciones.",
    );
    process.exitCode = 1;
  });
