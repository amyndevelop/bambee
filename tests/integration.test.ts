import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { db } from "../src/lib/db";
import { tick } from "../scripts/worker";
import { addDays, todayInZone } from "../src/lib/gestation";
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const password = randomBytes(20).toString("hex");
const emails = [0, 1].map((i) => `integration-${Date.now()}-${i}@example.test`);
const jars = [new Map<string, string>(), new Map<string, string>()];
let pregnancyId = "";
async function request(
  path: string,
  body?: unknown,
  user = 0,
  method = "POST",
  origin = base,
) {
  const headers: Record<string, string> = {
    origin,
    cookie: [...jars[user]].map(([k, v]) => `${k}=${v}`).join("; "),
  };
  if (body) headers["content-type"] = "application/json";
  const r = await fetch(base + path, {
    method: body ? method : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  for (const c of r.headers.getSetCookie()) {
    const [kv] = c.split(";");
    const i = kv.indexOf("=");
    jars[user].set(kv.slice(0, i), kv.slice(i + 1));
  }
  return r;
}
async function write(body: unknown, user = 0) {
  const r = await request("/api/data", body, user);
  const result = await r.json();
  assert.equal(r.status, 200, JSON.stringify(result));
  return result;
}
async function login(user: number) {
  const c = await request("/api/auth/csrf", undefined, user);
  const { csrfToken } = await c.json();
  const r = await fetch(base + "/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      cookie: [...jars[user]].map(([k, v]) => `${k}=${v}`).join("; "),
    },
    body: new URLSearchParams({
      csrfToken,
      email: emails[user],
      password,
      json: "true",
      callbackUrl: base,
    }),
    redirect: "manual",
  });
  for (const c of r.headers.getSetCookie()) {
    const [kv] = c.split(";");
    const i = kv.indexOf("=");
    jars[user].set(kv.slice(0, i), kv.slice(i + 1));
  }
  assert.ok(jars[user].has("next-auth.session-token"));
}
test("Flujo integrado sobre HTTP, Auth.js y PostgreSQL", async (t) => {
  try {
    await t.test(
      "el verificador de producción detecta una biblioteca aún no cargada sin exponer datos personales",
      async () => {
        const response = await request("/api/health");
        assert.equal(response.status, 503);
        const result = await response.json();
        assert.equal(result.weeklyContent.total, 0);
        assert.equal(result.weeklyContent.complete, false);
        assert.equal(result.release.font, "Inter");
        assert.ok(!JSON.stringify(result).includes("password"));
        assert.ok(!JSON.stringify(result).includes("DATABASE_URL"));
      },
    );
    await t.test(
      "registro requiere consentimiento y contraseña segura",
      async () => {
        const r = await request("/api/account", {
          action: "register",
          name: "Prueba",
          email: emails[0],
          password: "short",
          consent: false,
        });
        assert.equal(r.status, 400);
      },
    );
    await t.test("dos cuentas reales y sesiones independientes", async () => {
      for (const user of [0, 1]) {
        const r = await request(
          "/api/account",
          {
            action: "register",
            name: "Prueba de integración",
            email: emails[user],
            password,
            consent: true,
          },
          user,
        );
        assert.equal(r.status, 200);
        await login(user);
      }
    });
    await t.test("CSRF rechaza otro origen", async () => {
      const r = await request(
        "/api/data",
        { action: "preferences" },
        0,
        "POST",
        "https://other.example",
      );
      assert.equal(r.status, 400);
    });
    await t.test(
      "configuración por FPP profesional y persistencia",
      async () => {
        const due = addDays(todayInZone("America/Argentina/Buenos_Aires"), 137);
        const p = await write({
          action: "pregnancy",
          date: due,
          source: "MEDICAL",
          babyName: "Recuerdo de prueba",
          timezone: "America/Argentina/Buenos_Aires",
        });
        pregnancyId = p.id;
        const r = await request("/api/data");
        const data = await r.json();
        assert.equal(data.gestation.weeks, 20);
        assert.equal(data.gestation.completedWeeks, 20);
        assert.equal(data.gestation.currentWeek, 21);
        assert.equal(data.gestation.days, 3);
        assert.equal(data.pregnancy.datingSource, "MEDICAL");
      },
    );
    await t.test(
      "dashboard y fruta consultan la semana en curso, no las semanas completas",
      async () => {
        const owner = await db.user.findUniqueOrThrow({
          where: { email: emails[0] },
        });
        const ids: string[] = [];
        try {
          for (const week of [20, 21]) {
            const row = await db.weeklyDevelopment.create({
              data: {
                week,
                title: "Fixture de semana " + week,
                summary: "Fixture sin afirmaciones clínicas",
                details: "Fixture sin afirmaciones clínicas",
                fruit: "Comparación de prueba " + week,
                measurement: "Sin medida clínica",
                referenceUrls: ["https://www.nhs.uk/pregnancy/week-by-week/"],
                reviewStatus: "APPROVED",
                reviewedBy: owner.id,
                reviewedAt: new Date(),
                published: true,
              },
            });
            ids.push(row.id);
          }
          const data = await (await request("/api/data")).json();
          assert.equal(data.gestation.completedWeeks, 20);
          assert.equal(data.gestation.currentWeek, 21);
          assert.equal(data.week.week, 21);
          assert.equal(data.week.fruit, "Comparación de prueba 21");
        } finally {
          await db.weeklyDevelopment.deleteMany({ where: { id: { in: ids } } });
        }
      },
    );
    await t.test(
      "corrección conserva historial y requiere confirmación",
      async () => {
        const date = addDays(
          todayInZone("America/Argentina/Buenos_Aires"),
          140,
        );
        assert.equal(
          (
            await request("/api/data", {
              action: "dating",
              pregnancyId,
              date,
              source: "MEDICAL",
            })
          ).status,
          400,
        );
        await write({
          action: "dating",
          pregnancyId,
          date,
          source: "MEDICAL",
          confirmed: true,
        });
        assert.equal(
          await db.pregnancyDatingHistory.count({ where: { pregnancyId } }),
          2,
        );
      },
    );
    for (const kind of ["journal", "symptom"])
      await t.test(`CRUD persistente de ${kind}`, async () => {
        await write({
          action: "entry",
          pregnancyId,
          kind,
          title: "Título inicial",
          text: "Texto privado",
          date: "2026-11-02",
          mood: "Tranquila",
        });
        const rows = await (
          await request(`/api/data?kind=${kind}&pregnancyId=${pregnancyId}`)
        ).json();
        assert.equal(rows.length, 1);
        await write({
          action: "entry",
          id: rows[0].id,
          pregnancyId,
          kind,
          title: "Título editado",
          text: "Cambio guardado",
          date: "2026-11-01",
        });
        assert.equal(
          (await db.entry.findUniqueOrThrow({ where: { id: rows[0].id } }))
            .title,
          "Título editado",
        );
        await write({ action: "deleteEntry", id: rows[0].id, pregnancyId });
        assert.equal(await db.entry.count({ where: { id: rows[0].id } }), 0);
      });
    await t.test(
      "diario admite adjuntos múltiples propios y rechaza archivos ajenos",
      async () => {
        const owner = await db.user.findUniqueOrThrow({
            where: { email: emails[0] },
          }),
          partner = await db.user.findUniqueOrThrow({
            where: { email: emails[1] },
          });
        const files = await Promise.all(
          [owner, owner, partner].map((u, i) =>
            db.uploadedFile.create({
              data: {
                ownerId: u.id,
                key: "fixture/" + randomBytes(8).toString("hex"),
                mime: "image/png",
                size: 20,
                name: "fixture-" + i + ".png",
              },
            }),
          ),
        );
        try {
          await write({
            action: "entry",
            pregnancyId,
            kind: "journal",
            title: "Adjuntos de prueba",
            text: "Fixture de metadatos, sin objetos S3",
            date: "2026-11-02",
            fileId: files[0].id,
            fileIds: [files[1].id],
          });
          const entry = await db.entry.findFirstOrThrow({
            where: { pregnancyId, kind: "journal" },
            include: { attachments: true },
          });
          assert.equal(entry.attachments.length, 1);
          assert.equal(
            (
              await request("/api/data", {
                action: "entry",
                pregnancyId,
                kind: "journal",
                title: "Intento inválido",
                text: "",
                date: "2026-11-02",
                fileIds: [files[2].id],
              })
            ).status,
            400,
          );
          await db.entry.delete({ where: { id: entry.id } });
        } finally {
          await db.uploadedFile.deleteMany({
            where: { id: { in: files.map((f) => f.id) } },
          });
        }
      },
    );
    await t.test("agenda, recordatorios durables y edición", async () => {
      await write({
        action: "appointment",
        pregnancyId,
        title: "Consulta",
        type: "Consulta obstétrica",
        at: new Date(Date.now() + 60000).toISOString(),
        professional: "Profesional",
        location: "Centro",
        notes: "",
        reminder: 1440,
      });
      const a = await db.appointment.findFirstOrThrow({
        where: { pregnancyId },
      });
      assert.equal(
        await db.appointmentReminder.count({ where: { appointmentId: a.id } }),
        1,
      );
      await tick();
      await tick();
      assert.equal(
        await db.notification.count({
          where: {
            dedupe: { startsWith: "reminder:" },
            userId: (
              await db.pregnancy.findUniqueOrThrow({
                where: { id: pregnancyId },
              })
            ).ownerId,
          },
        }),
        1,
      );
      await write({
        action: "complete",
        pregnancyId,
        id: a.id,
        completed: true,
      });
      assert.equal(
        (await db.appointment.findUniqueOrThrow({ where: { id: a.id } }))
          .completed,
        true,
      );
    });
    await t.test(
      "invitación segura aceptada explícitamente y limitada al correo",
      async () => {
        const token = randomBytes(32).toString("hex");
        await db.invitation.create({
          data: {
            pregnancyId,
            email: emails[1],
            tokenHash: createHash("sha256").update(token).digest("hex"),
            appointments: false,
            expiresAt: new Date(Date.now() + 60000),
          },
        });
        assert.equal(
          (await request("/api/data", { action: "accept", token })).status,
          400,
        );
        await write({ action: "accept", token }, 1);
        assert.equal(
          (await request("/api/data", { action: "accept", token }, 1)).status,
          400,
        );
      },
    );
    await t.test(
      "la pareja usa el mismo día civil del embarazo aunque su zona horaria difiera",
      async () => {
        const owner = await db.user.findUniqueOrThrow({
          where: { email: emails[0] },
        });
        await db.user.update({
          where: { id: owner.id },
          data: { timezone: "Etc/GMT+12" },
        });
        await db.user.update({
          where: { email: emails[1] },
          data: { timezone: "Pacific/Kiritimati" },
        });
        try {
          const a = await (
              await request("/api/data?pregnancyId=" + pregnancyId)
            ).json(),
            b = await (
              await request(
                "/api/data?pregnancyId=" + pregnancyId,
                undefined,
                1,
              )
            ).json();
          assert.equal(a.pregnancyTimezone, "Etc/GMT+12");
          assert.equal(b.pregnancyTimezone, "Etc/GMT+12");
          assert.deepEqual(a.gestation, b.gestation);
        } finally {
          await db.user.update({
            where: { id: owner.id },
            data: { timezone: owner.timezone },
          });
        }
      },
    );
    await t.test(
      "pareja ve progreso pero no agenda ni registros privados",
      async () => {
        assert.equal(
          (await request("/api/data?pregnancyId=" + pregnancyId, undefined, 1))
            .status,
          200,
        );
        for (const kind of [
          "appointment",
          "journal",
          "symptom",
          "belly",
          "ultrasound",
        ])
          assert.equal(
            (
              await request(
                `/api/data?kind=${kind}&pregnancyId=${pregnancyId}`,
                undefined,
                1,
              )
            ).status,
            403,
          );
      },
    );
    await t.test(
      "permisos de citas, archivos siempre privados y revocación",
      async () => {
        const partner = await db.user.findUniqueOrThrow({
          where: { email: emails[1] },
        });
        const m = await db.pregnancyMember.findFirstOrThrow({
          where: { userId: partner.id, pregnancyId },
        });
        await db.pregnancyMember.update({
          where: { id: m.id },
          data: { appointments: true },
        });
        assert.equal(
          (
            await request(
              "/api/data?kind=appointment&pregnancyId=" + pregnancyId,
              undefined,
              1,
            )
          ).status,
          200,
        );
        const owner = await db.user.findUniqueOrThrow({
          where: { email: emails[0] },
        });
        const f = await db.uploadedFile.create({
          data: {
            ownerId: owner.id,
            key: "integration/" + randomBytes(8).toString("hex"),
            mime: "image/png",
            size: 10,
            name: "test.png",
          },
        });
        assert.equal(
          (await request("/api/files?id=" + f.id, undefined, 1)).status,
          403,
        );
        await db.uploadedFile.delete({ where: { id: f.id } });
        await write({
          action: "memberPermission",
          pregnancyId,
          id: m.id,
          appointments: true,
          tasks: true,
        });
        await write(
          {
            action: "task",
            pregnancyId,
            title: "Organizar bolso",
            completed: false,
            dueDate: null,
          },
          1,
        );
        const tasks = await (
          await request(
            "/api/data?kind=task&pregnancyId=" + pregnancyId,
            undefined,
            1,
          )
        ).json();
        assert.equal(tasks.length, 1);
        await write(
          {
            action: "task",
            pregnancyId,
            id: tasks[0].id,
            title: "Bolso organizado",
            completed: true,
            dueDate: null,
          },
          1,
        );
        assert.equal(
          (await db.task.findUniqueOrThrow({ where: { id: tasks[0].id } }))
            .completed,
          true,
        );
        const appointment = await db.appointment.findFirstOrThrow({
          where: { pregnancyId },
        });
        await write(
          {
            action: "complete",
            pregnancyId,
            id: appointment.id,
            completed: false,
          },
          1,
        );
        await write({ action: "deleteTask", pregnancyId, id: tasks[0].id }, 1);
        await write({ action: "revokeMember", pregnancyId, id: m.id });
        assert.equal(
          (await (await request("/api/data", undefined, 1)).json()).pregnancy,
          null,
        );
      },
    );
    await t.test(
      "administración restringida y contenido clínico no publicado",
      async () => {
        assert.equal((await request("/api/admin")).status, 403);
        assert.deepEqual(
          await (await request("/api/data?kind=weeks")).json(),
          [],
        );
      },
    );
    await t.test(
      "edición administrativa y bloqueo de publicación por editor",
      async () => {
        const u = await db.user.update({
          where: { email: emails[0] },
          data: { role: "ADMIN" },
        });
        const draft = {
          week: 42,
          title: "Fixture de integración",
          summary: "Fixture, sin información clínica",
          details: "Fixture, sin información clínica",
          fruit: "Sin comparación",
          measurement: "Sin medida",
          referenceUrls: ["https://www.nhs.uk/pregnancy/week-by-week/"],
          published: false,
          review: false,
        };
        assert.equal((await request("/api/admin", draft)).status, 200);
        await db.user.update({ where: { id: u.id }, data: { role: "EDITOR" } });
        assert.equal(
          (
            await request("/api/admin", {
              ...draft,
              published: true,
              review: true,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await db.weeklyDevelopment.findUniqueOrThrow({
              where: { week: 42 },
            })
          ).published,
          false,
        );
        await db.weeklyDevelopment.delete({ where: { week: 42 } });
        await db.user.update({ where: { id: u.id }, data: { role: "USER" } });
      },
    );
    await t.test(
      "recuperación por token con vencimiento y uso único",
      async () => {
        const u = await db.user.findUniqueOrThrow({
          where: { email: emails[1] },
        });
        const token = randomBytes(32).toString("hex");
        await db.actionToken.create({
          data: {
            userId: u.id,
            hash: createHash("sha256").update(token).digest("hex"),
            expiresAt: new Date(Date.now() + 60000),
          },
        });
        assert.equal(
          (await request("/api/account", { action: "reset", token, password }))
            .status,
          200,
        );
        assert.equal(
          (await request("/api/account", { action: "reset", token, password }))
            .status,
          400,
        );
      },
    );
    await t.test("exportación excluye hash y secretos", async () => {
      const r = await request("/api/privacy");
      assert.equal(r.status, 200);
      const data = await r.json();
      assert.ok(!("passwordHash" in data.user));
      assert.equal(data.pregnancies[0].id, pregnancyId);
    });
    await t.test("preferencias persisten y sesiones se revocan", async () => {
      await write({
        action: "preferences",
        weekly: false,
        appointment: true,
        family: false,
        size: "measurement",
      });
      assert.equal(
        (await (await request("/api/data")).json()).user.preferences.weekly,
        false,
      );
      await request("/api/account", { action: "revoke" });
      assert.equal((await request("/api/data")).status, 403);
    });
  } finally {
    await db.user.deleteMany({ where: { email: { in: emails } } });
    await db.$disconnect();
  }
});
