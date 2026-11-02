import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { db } from "../src/lib/db";
import { seedWeeklyDevelopment } from "../scripts/seed-weekly-development";
import { publishedWeeklyWhere } from "../src/lib/weekly-content";
test("seed de 42 borradores: persistencia, idempotencia y preservación de datos", async () => {
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
    const custom = await db.weeklyDevelopment.update({
      where: { week: 5 },
      data: {
        title: "Edición personalizada del equipo",
        summary: "Resumen personalizado",
        reviewStatus: "DRAFT",
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
    assert.equal(
      retained.updatedAt.toISOString(),
      custom.updatedAt.toISOString(),
    );
    assert.equal(
      await db.weeklyDevelopment.count({ where: publishedWeeklyWhere }),
      0,
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
