import { baselineMigrations } from "./baseline-migrations.mjs";
import "dotenv/config";
import {
  readFileSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { bindSqlAdapterFactory } from "@prisma/driver-adapter-utils";
import * as runtime from "@prisma/schema-engine-wasm/schema_engine_bg";
const wasmPath = resolve(
  "node_modules/@prisma/schema-engine-wasm/schema_engine_bg.wasm",
);
const instance = await WebAssembly.instantiate(readFileSync(wasmPath), {
  "./schema_engine_bg.js": runtime,
});
runtime.__wbg_set_wasm(instance.instance.exports);
instance.instance.exports.__wbindgen_start();
const schema = readFileSync("prisma/schema.prisma", "utf8");
if (!process.argv.includes("--initial") && !process.env.DATABASE_URL)
  throw new Error(
    "Falta DATABASE_URL: conectá PostgreSQL al entorno de este deployment antes de inicializarlo.",
  );
const engine = await runtime.SchemaEngine.new(
  { datamodels: [["schema.prisma", schema]] },
  () => {},
  bindSqlAdapterFactory(
    new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  ),
);
const filters = { externalTables: [], externalEnums: [] };
try {
  const previousSchema = process.argv.find((argument) =>
    argument.startsWith("--diff-from="),
  );
  if (previousSchema) {
    const previous = readFileSync(
      previousSchema.slice("--diff-from=".length),
      "utf8",
    );
    const result = await engine.diff({
      from: {
        tag: "schemaDatamodel",
        files: [{ path: "previous.prisma", content: previous }],
      },
      to: {
        tag: "schemaDatamodel",
        files: [{ path: "schema.prisma", content: schema }],
      },
      script: true,
      exitCode: false,
      filters,
    });
    console.log(result.stdout);
  } else if (process.argv.includes("--initial")) {
    const result = await engine.diff({
      from: { tag: "empty" },
      to: {
        tag: "schemaDatamodel",
        files: [{ path: "schema.prisma", content: schema }],
      },
      script: true,
      exitCode: false,
      filters,
    });
    const directory = "prisma/migrations/20261102000000_initial";
    mkdirSync(directory, { recursive: true });
    writeFileSync(directory + "/migration.sql", result.stdout);
    writeFileSync(
      "prisma/migrations/migration_lock.toml",
      'provider = "postgresql"\n',
    );
    console.log("Migración inicial generada por Prisma WASM");
  } else {
    const baseDir = resolve("prisma/migrations");
    const migrationDirectories = process.argv.includes("--baseline")
      ? baselineMigrations(baseDir)
      : readdirSync(baseDir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((d) => ({
            path: d.name,
            migrationFile: {
              path: "migration.sql",
              content: {
                tag: "ok",
                value: readFileSync(
                  resolve(baseDir, d.name, "migration.sql"),
                  "utf8",
                ),
              },
            },
          }));
    const result = await engine.applyMigrations({
      migrationsList: {
        baseDir,
        lockfile: {
          path: "migration_lock.toml",
          content: readFileSync(
            resolve(baseDir, "migration_lock.toml"),
            "utf8",
          ),
        },
        shadowDbInitScript: "",
        migrationDirectories,
      },
      filters,
    });
    console.log("Migraciones aplicadas:", result.appliedMigrationNames);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : "";
  const code = message.match(/\bP\d{4}\b/)?.[0];
  console.error(
    "No se pudieron aplicar las migraciones de BAMBEE." +
      (code ? " Código: " + code : ""),
  );
  process.exitCode = 1;
} finally {
  engine.free();
}
