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
  await client.$transaction(
    async (tx) => {
      for (const draft of drafts)
        await tx.weeklyDevelopment.upsert({
          where: { week: draft.week },
          create: draft,
          update: {},
        });
    },
    { timeout: 60000, maxWait: 15000 },
  );
  return {
    available: await client.weeklyDevelopment.count(),
    sourceDrafts: drafts.length,
  };
}
async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("Falta DATABASE_URL para cargar la biblioteca");
  const { db } = await import("../src/lib/db");
  try {
    const result = await seedWeeklyDevelopment(db);
    console.log(
      `Biblioteca semanal: ${result.available} registros; ${result.sourceDrafts} borradores de origen. Se conservaron los registros existentes.`,
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
