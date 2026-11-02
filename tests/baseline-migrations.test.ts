import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  cpSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { baselineMigrations } from "../scripts/baseline-migrations.mjs";
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "bambee-migrations-"));
  cpSync(resolve("prisma/migrations"), root, { recursive: true });
  return root;
}
test("el bootstrap incluye únicamente las seis migraciones aprobadas", () => {
  const root = fixture();
  try {
    mkdirSync(join(root, "20990101000000_future"));
    writeFileSync(
      join(root, "20990101000000_future/migration.sql"),
      'DROP TABLE "User";',
    );
    const result = baselineMigrations(root);
    assert.equal(result.length, 6);
    assert.ok(!result.some((m) => m.path.includes("future")));
    assert.equal(result[0].path, "20261102000000_initial");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("rechaza un archivo inicial modificado antes de ejecutar SQL", () => {
  const root = fixture();
  try {
    const file = join(root, "20261102000000_initial/migration.sql");
    writeFileSync(file, readFileSync(file, "utf8") + '\nDROP TABLE "User";');
    assert.throws(() => baselineMigrations(root), /migración inicial cambió/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("rechaza una migración inicial ausente", () => {
  const root = fixture();
  try {
    rmSync(join(root, "20261102000000_initial/migration.sql"));
    assert.throws(() => baselineMigrations(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
