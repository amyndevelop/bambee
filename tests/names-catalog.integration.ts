import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { db } from "../src/lib/db";
import {
  importNameCatalog,
  parseCatalogName,
} from "../src/modules/tools/name-catalog";
import { nameIdentity, normalizeName } from "../src/modules/tools/validation";
const catalog = JSON.parse(
  readFileSync("content/tools/baby-names.es-AR.json", "utf8"),
);
const legacy = JSON.parse(
  readFileSync("content/tools/baby-names.legacy.es-AR.json", "utf8"),
);
const base = process.env.TEST_BASE_URL || "http://localhost:3107";
test("importación 572: conserva 475 IDs anteriores, variantes, relaciones y decisiones administrativas", async () => {
  assert.ok(
    new URL(process.env.DATABASE_URL || "").pathname.startsWith(
      "/bambee_weekly_verify_",
    ),
  );
  assert.equal(await db.babyName.count(), 0);
  const user = await db.user.create({
    data: {
      name: "Fixture catálogo",
      email: randomUUID() + "@example.test",
      passwordHash: "fixture-not-a-password",
    },
  });
  try {
    await db.babyName.createMany({
      data: legacy.map((raw: Record<string, unknown>) => {
        const row = parseCatalogName(raw);
        return {
          ...row,
          nameKey: nameIdentity(row.name),
          normalized: normalizeName(row.name),
          nameLength: [...row.name].length,
        };
      }),
    });
    const originals = await db.babyName.findMany(),
      sofia = originals.find((row) => row.name === "Sofía")!;
    const p = await db.pregnancy.create({
      data: {
        ownerId: user.id,
        dueDate: new Date("2027-07-01"),
        datingSource: "MEDICAL",
      },
    });
    const choice = await db.babyNameChoice.create({
      data: {
        userId: user.id,
        pregnancyId: p.id,
        nameId: sofia.id,
        favorite: true,
        vote: "FAVORITE",
        note: "Nota personal conservada",
      },
    });
    const report = await importNameCatalog(db, catalog, {
      catalogId: "bambee-572",
      legacy,
    });
    assert.equal(report.input, 572);
    assert.equal(report.catalogRecords, 572);
    assert.equal(report.published, 572);
    assert.equal(report.complete, 572);
    assert.equal(report.total, 727);
    for (const original of originals)
      assert.equal(
        (await db.babyName.findUniqueOrThrow({ where: { id: original.id } }))
          .name,
        original.name,
      );
    for (const input of catalog) {
      const row = await db.babyName.findUniqueOrThrow({
        where: { nameKey: nameIdentity(input.name) },
      });
      assert.equal(row.meaning, input.meaning);
      assert.equal(row.origin, input.origin);
      assert.equal(row.reviewStatus, "editorial_initial");
      assert.equal(row.published, true);
    }
    const kept = await db.babyNameChoice.findUniqueOrThrow({
      where: { id: choice.id },
    });
    assert.equal(kept.nameId, sofia.id);
    assert.equal(kept.note, "Nota personal conservada");
    assert.equal(kept.vote, "FAVORITE");
    assert.equal(kept.favorite, true);
    assert.notEqual(
      (await db.babyName.findUniqueOrThrow({ where: { nameKey: "mía" } })).id,
      (await db.babyName.findUniqueOrThrow({ where: { nameKey: "mia" } })).id,
    );
    const repeat = await importNameCatalog(db, catalog, {
      catalogId: "bambee-572",
      legacy,
    });
    assert.equal(repeat.created, 0);
    assert.equal(repeat.updated, 0);
    assert.equal(repeat.total, 727);
    const before = await db.babyName.findUniqueOrThrow({
      where: { id: sofia.id },
    });
    await db.babyName.update({
      where: { id: sofia.id },
      data: {
        meaning: "Corrección editorial propia",
        published: false,
        adminEdited: true,
      },
    });
    await importNameCatalog(db, catalog, { catalogId: "bambee-572", legacy });
    const customized = await db.babyName.findUniqueOrThrow({
      where: { id: sofia.id },
    });
    assert.equal(customized.meaning, "Corrección editorial propia");
    assert.equal(customized.published, false);
    const publicHidden = await (
      await fetch(base + "/api/names?q=Sofia")
    ).json();
    assert.ok(
      !publicHidden.names.some((row: { id: string }) => row.id === sofia.id),
    );
    assert.ok(
      publicHidden.names.some((row: { name: string }) => row.name === "Sofia"),
    );
    await db.babyName.update({
      where: { id: sofia.id },
      data: { meaning: before.meaning, published: true, adminEdited: false },
    });
  } finally {
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});
test("catálogo público: búsquedas obligatorias, filtros, paginación y ausencia de datos personales", async () => {
  for (const [q, expected] of [
    ["Noah", ["Noah"]],
    ["Mia", ["Mia", "Mía"]],
    ["Benjamin", ["Benjamín"]],
    ["Sofia", ["Sofia", "Sofía"]],
    ["Gael", ["Gael"]],
    ["Milo", ["Milo"]],
  ] as const) {
    const response = await fetch(base + "/api/names?q=" + q);
    assert.equal(response.status, 200);
    const data = await response.json();
    for (const name of expected) {
      const found = data.names.find(
        (row: { name: string }) => row.name === name,
      );
      assert.ok(found, name);
      assert.ok(found.origin && found.meaning);
      assert.equal(found.published, true);
    }
    assert.deepEqual(data.choices, []);
    assert.deepEqual(data.partnerVotes, []);
    assert.ok(!JSON.stringify(data).includes("Nota personal conservada"));
  }
  const uppercase = await (await fetch(base + "/api/names?q=NOAH")).json();
  assert.ok(
    uppercase.names.some((row: { name: string }) => row.name === "Noah"),
  );
  const first = await (
      await fetch(base + "/api/names?page=1&pageSize=20")
    ).json(),
    second = await (await fetch(base + "/api/names?page=2&pageSize=20")).json();
  assert.equal(first.names.length, 20);
  assert.equal(second.names.length, 20);
  assert.ok(
    !first.names.some((row: { id: string }) =>
      second.names.some((other: { id: string }) => row.id === other.id),
    ),
  );
  assert.equal(first.total, 727);
  for (const gender of ["F", "M", "U"]) {
    const data = await (
      await fetch(base + "/api/names?gender=" + gender)
    ).json();
    assert.ok(data.names.length);
    assert.ok(
      data.names.every((row: { gender: string }) => row.gender === gender),
    );
  }
  const filtered = await (
    await fetch(base + "/api/names?origin=Hebreo&min=4&max=5")
  ).json();
  assert.ok(filtered.names.length);
  assert.ok(
    filtered.names.every(
      (row: { origin: string; name: string }) =>
        row.origin === "Hebreo" &&
        [...row.name].length >= 4 &&
        [...row.name].length <= 5,
    ),
  );
});
