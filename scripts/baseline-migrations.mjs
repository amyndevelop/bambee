import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

/** Deployment only initializes this reviewed baseline; future migrations require a separate rollout. */
export function baselineMigrations(baseDir) {
  const manifest = JSON.parse(
    readFileSync(
      new URL("../prisma/bootstrap-migrations.json", import.meta.url),
      "utf8",
    ),
  );
  return Object.entries(manifest)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, checksum]) => {
      if (
        !/^\d{14}_[a-z_]+$/.test(name) ||
        typeof checksum !== "string" ||
        !/^[a-f0-9]{64}$/.test(checksum)
      )
        throw new Error("Manifiesto de migraciones iniciales inválido");
      const content = readFileSync(
        resolve(baseDir, name, "migration.sql"),
        "utf8",
      );
      if (createHash("sha256").update(content).digest("hex") !== checksum)
        throw new Error("La migración inicial cambió: " + name);
      return {
        path: name,
        migrationFile: {
          path: "migration.sql",
          content: { tag: "ok", value: content },
        },
      };
    });
}
