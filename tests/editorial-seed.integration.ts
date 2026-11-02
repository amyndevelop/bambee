import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { db } from "../src/lib/db";
import { seedWeeklyDevelopment } from "../scripts/seed-weekly-development";
import { publishedWeeklyWhere } from "../src/lib/weekly-content";
test("seed de 42 textos educativos: persistencia, idempotencia y preservación de datos", async () => {
  const url = new URL(process.env.DATABASE_URL || "");
  assert.ok(
    ["localhost", "127.0.0.1"].includes(url.hostname) &&
      url.pathname.startsWith("/bambee_weekly_verify_"),
    "Esta prueba solo admite una base local temporal dedicada",
  );
  let userId = "";
  try {
    const owner = await db.user.create({
      data: {
        name: "Fixture de preservación",
        email: "seed-" + randomBytes(8).toString("hex") + "@example.test",
        passwordHash: "test-fixture-not-a-login",
      },
    });
    userId = owner.id;
    const pregnancy = await db.pregnancy.create({
      data: {
        ownerId: owner.id,
        dueDate: new Date("2027-07-06"),
        datingSource: "MEDICAL",
      },
    });
    const appointment = await db.appointment.create({
      data: {
        pregnancyId: pregnancy.id,
        title: "Fixture de cita",
        type: "Otro",
        at: new Date("2026-11-03T12:00:00Z"),
        professional: "Fixture",
        location: "Fixture",
        notes: "",
      },
    });
    const file = await db.uploadedFile.create({
      data: {
        ownerId: owner.id,
        key: "test-fixture/" + randomBytes(8).toString("hex"),
        mime: "image/png",
        size: 1,
        name: "test-fixture.png",
      },
    });
    await seedWeeklyDevelopment(db);
    assert.equal(await db.weeklyDevelopment.count(), 42);
    const all = await db.weeklyDevelopment.findMany({
      orderBy: { week: "asc" },
    });
    assert.deepEqual(
      all.map((w) => w.week),
      Array.from({ length: 42 }, (_, i) => i + 1),
    );
    assert.ok(
      all.every(
        (w) =>
          w.reviewStatus === "PENDING_REVIEW" &&
          !w.published &&
          w.reviewedAt === null &&
          w.reviewedBy === null,
      ),
    );
    await db.weeklyDevelopment.update({
      where: { week: 6 },
      data: {
        title: "Texto propio conservado al actualizar el arte",
        editorialPublished: false,
        fruitImage: "/assets/pregnancy/fruits/lentil-pending.png",
        fruitImageIsPlaceholder: true,
      },
    });
    await db.weeklyDevelopment.update({
      where: { week: 7 },
      data: {
        fruitImage: "/assets/pregnancy/fruits/custom-art.png",
        fruitImageIsPlaceholder: false,
      },
    });
    await seedWeeklyDevelopment(db);
    const refreshed = await db.weeklyDevelopment.findUniqueOrThrow({
      where: { week: 6 },
    });
    assert.equal(refreshed.fruitImage, "/assets/pregnancy/fruits/lentil.png");
    assert.equal(refreshed.fruitImageIsPlaceholder, false);
    assert.equal(
      refreshed.title,
      "Texto propio conservado al actualizar el arte",
    );
    assert.equal(refreshed.editorialPublished, false);
    assert.equal(
      (await db.weeklyDevelopment.findUniqueOrThrow({ where: { week: 7 } }))
        .fruitImage,
      "/assets/pregnancy/fruits/custom-art.png",
    );
    await db.weeklyDevelopment.update({
      where: { week: 6 },
      data: { editorialPublished: true },
    });
    const custom = await db.weeklyDevelopment.update({
      where: { week: 5 },
      data: {
        title: "Edición personalizada del equipo",
        summary: "Resumen personalizado",
        reviewStatus: "DRAFT",
        editorialPublished: false,
      },
    });
    await seedWeeklyDevelopment(db);
    assert.equal(await db.weeklyDevelopment.count(), 42);
    const retained = await db.weeklyDevelopment.findUniqueOrThrow({
      where: { week: 5 },
    });
    assert.equal(retained.title, custom.title);
    assert.equal(retained.summary, custom.summary);
    assert.equal(retained.reviewStatus, "DRAFT");
    assert.equal(retained.editorialPublished, false);
    assert.equal(
      retained.updatedAt.toISOString(),
      custom.updatedAt.toISOString(),
    );
    assert.equal(
      await db.weeklyDevelopment.count({ where: publishedWeeklyWhere }),
      41,
    );
    for (const week of [1, 2, 3, 41, 42]) {
      const w = await db.weeklyDevelopment.findUniqueOrThrow({
        where: { week },
      });
      assert.equal(w.lengthCm, null);
      assert.equal(w.lengthMinCm, null);
      assert.equal(w.lengthMaxCm, null);
    }
    assert.equal(
      (await db.pregnancy.findUniqueOrThrow({ where: { id: pregnancy.id } }))
        .datingSource,
      "MEDICAL",
    );
    assert.equal(
      (
        await db.appointment.findUniqueOrThrow({
          where: { id: appointment.id },
        })
      ).title,
      "Fixture de cita",
    );
    assert.equal(
      (await db.uploadedFile.findUniqueOrThrow({ where: { id: file.id } })).key,
      file.key,
    );
  } finally {
    if (userId) await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  }
});

test("publica el origen anterior una sola vez y conserva ediciones y decisiones de ocultar", async () => {
  const url = new URL(process.env.DATABASE_URL || "");
  assert.ok(
    ["localhost", "127.0.0.1"].includes(url.hostname) &&
      url.pathname.startsWith("/bambee_weekly_verify_"),
  );
  try {
    await db.weeklyDevelopment.deleteMany();
    const { readFileSync } = await import("node:fs");
    const original = JSON.parse(
      readFileSync("content/pregnancy/weeks.es-AR.v1.json", "utf8"),
    );
    await db.weeklyDevelopment.createMany({ data: original });
    await db.weeklyDevelopment.update({
      where: { week: 8 },
      data: { title: "Edición privada propia" },
    });
    await seedWeeklyDevelopment(db);
    assert.equal(await db.weeklyDevelopment.count(), 42);
    assert.equal(
      await db.weeklyDevelopment.count({ where: publishedWeeklyWhere }),
      41,
    );
    const custom = await db.weeklyDevelopment.findUniqueOrThrow({
      where: { week: 8 },
    });
    assert.equal(custom.title, "Edición privada propia");
    assert.equal(custom.editorialPublished, false);
    const released = await db.weeklyDevelopment.findUniqueOrThrow({
      where: { week: 39 },
    });
    assert.equal(released.editorialPublished, true);
    assert.equal(released.published, false);
    assert.equal(released.reviewedAt, null);
    assert.match(released.details, /39 semanas completas/);
    const hidden = await db.weeklyDevelopment.update({
      where: { week: 5 },
      data: { editorialPublished: false },
    });
    await seedWeeklyDevelopment(db);
    const preserved = await db.weeklyDevelopment.findUniqueOrThrow({
      where: { week: 5 },
    });
    assert.equal(preserved.editorialPublished, false);
    assert.equal(
      preserved.updatedAt.toISOString(),
      hidden.updatedAt.toISOString(),
    );
    assert.equal(
      await db.weeklyDevelopment.count({ where: publishedWeeklyWhere }),
      40,
    );
  } finally {
    await db.$disconnect();
  }
});
