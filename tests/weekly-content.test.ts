import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import {
  validateWeeklyDrafts,
  measurementLabels,
} from "../src/lib/weekly-content";
const source = JSON.parse(
  readFileSync("content/pregnancy/weeks.es-AR.json", "utf8"),
);
test("la biblioteca contiene las 42 semanas únicas y textos persistibles", () => {
  const rows = validateWeeklyDrafts(source);
  assert.deepEqual(
    rows.map((r) => r.week),
    Array.from({ length: 42 }, (_, i) => i + 1),
  );
  for (const row of rows) {
    assert.ok(row.title && row.details && row.summary);
    assert.ok(row.summary.split(/\s+/).length <= 35);
    assert.ok(row.developmentHighlights.length);
  }
});
test("ningún borrador declara revisión profesional ni publicación", () => {
  for (const row of validateWeeklyDrafts(source)) {
    assert.equal(row.reviewStatus, "PENDING_REVIEW");
    assert.equal(row.published, false);
    assert.equal(row.reviewedBy, null);
    assert.equal(row.reviewedAt, null);
    assert.deepEqual(row.referenceUrls, []);
    assert.equal(row.maternalChanges, null);
  }
});
test("las semanas iniciales no afirman un embrión formado ni medidas cero", () => {
  for (const row of source.slice(0, 2)) {
    assert.match(row.details, /Todavía no existe un embrión/);
    assert.match(row.fruit, /no hay embrión/);
  }
  for (const row of source.filter((r: { week: number }) =>
    [1, 2, 3, 41, 42].includes(r.week),
  )) {
    assert.equal(row.lengthCm, null);
    assert.equal(row.lengthMinCm, null);
    assert.equal(row.lengthMaxCm, null);
  }
  for (const row of source)
    for (const key of ["lengthCm", "lengthMinCm", "lengthMaxCm"])
      assert.notEqual(row[key], 0);
});
test("documenta métodos distintos y conserva la comparación de cada semana", () => {
  assert.equal(source[4].fruit, "Semilla de sésamo");
  assert.equal(source[4].measurement, "2 mm");
  assert.equal(source[12].measurementMethod, "CRL");
  assert.equal(source[13].measurementMethod, "TOTAL_LENGTH");
  assert.equal(source[19].fruit, "Banana");
  assert.equal(source[19].measurement, "25,6 cm");
  assert.ok(measurementLabels.CRL.includes("cabeza a nalgas"));
  assert.ok(measurementLabels.TOTAL_LENGTH.includes("talón"));
});
test("cada referencia visual de fruta existe y está identificada como pendiente", () => {
  const rows = source.filter(
    (r: { fruitImage: string | null }) => r.fruitImage,
  );
  const hashes = new Set();
  for (const row of rows) {
    assert.equal(row.fruitImageIsPlaceholder, true);
    const path = resolve("public", row.fruitImage.slice(1));
    assert.ok(existsSync(path));
    const buffer = readFileSync(path);
    assert.equal(buffer.subarray(1, 4).toString(), "PNG");
    hashes.add(createHash("sha256").update(buffer).digest("hex"));
  }
  assert.equal(rows.length, 39);
  assert.equal(hashes.size, rows.length);
});
test("rechaza duplicados y la publicación accidental de la fuente de borradores", () => {
  const duplicate = structuredClone(source);
  duplicate[41].week = 41;
  assert.throws(() => validateWeeklyDrafts(duplicate));
  const published = structuredClone(source);
  published[0].published = true;
  assert.throws(() => validateWeeklyDrafts(published));
  const zero = structuredClone(source);
  zero[4].lengthCm = 0;
  assert.throws(() => validateWeeklyDrafts(zero));
});
