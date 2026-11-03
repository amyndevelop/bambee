import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import sharp from "sharp";
import type { User } from "@prisma/client";
import { db } from "../src/lib/db";
import { seedTools } from "../scripts/seed-tools";
import { toolReminderTick } from "../src/modules/notifications/processor";
const base = process.env.TEST_BASE_URL || "http://localhost:3107";
const jars = [
  new Map<string, string>(),
  new Map<string, string>(),
  new Map<string, string>(),
];
async function call(user: number, path: string, body?: unknown) {
  const r = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      origin: base,
      cookie: [...jars[user]].map(([k, v]) => k + "=" + v).join("; "),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  for (const c of r.headers.getSetCookie()) {
    const [kv] = c.split(";"),
      i = kv.indexOf("=");
    jars[user].set(kv.slice(0, i), kv.slice(i + 1));
  }
  return r;
}
async function login(i: number, email: string, password: string) {
  const c = await call(i, "/api/auth/csrf"),
    { csrfToken } = await c.json();
  const r = await fetch(base + "/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      cookie: [...jars[i]].map(([k, v]) => k + "=" + v).join("; "),
    },
    body: new URLSearchParams({ csrfToken, email, password, json: "true" }),
    redirect: "manual",
  });
  for (const c of r.headers.getSetCookie()) {
    const [kv] = c.split(";"),
      j = kv.indexOf("=");
    jars[i].set(kv.slice(0, j), kv.slice(j + 1));
  }
  assert.ok(jars[i].has("next-auth.session-token"));
}
test("Herramientas: permisos, persistencia, catálogos, exportaciones y sincronización sobre HTTP", async (t) => {
  assert.ok(
    new URL(process.env.DATABASE_URL || "").pathname.startsWith(
      "/bambee_weekly_verify_",
    ),
  );
  const password = randomBytes(20).toString("hex"),
    users: User[] = [];
  let pId = "";
  try {
    for (let i = 0; i < 3; i++) {
      const u = await db.user.create({
        data: {
          name: "Tools fixture " + i,
          email: "tools-" + randomUUID() + "@example.test",
          passwordHash: await hash(password, 4),
        },
      });
      users.push(u);
      await login(i, u.email, password);
    }
    const p = await db.pregnancy.create({
      data: {
        ownerId: users[0].id,
        dueDate: new Date("2027-06-01"),
        datingSource: "MEDICAL",
      },
    });
    pId = p.id;
    const member = await db.pregnancyMember.create({
      data: { pregnancyId: pId, userId: users[1].id },
    });
    await seedTools(db);
    const initialCount = await db.babyName.count();
    await seedTools(db);
    assert.equal(await db.babyName.count(), initialCount);
    assert.ok(initialCount >= 300);
    const get = async (module: string, user = 0, query = "") =>
      call(user, `/api/tools?pregnancyId=${pId}&module=${module}${query}`);
    const post = async (module: string, op: string, data: unknown, user = 0) =>
      call(user, "/api/tools", { pregnancyId: pId, module, op, data });
    const ok = async (r: Response) => {
      const data = await r.json();
      assert.equal(r.status, 200, JSON.stringify(data));
      return data;
    };
    await t.test(
      "privados por defecto y sin acceso horizontal incluso con ID conocido",
      async () => {
        for (const module of [
          "preparations",
          "names",
          "questions",
          "cards",
          "timelapse",
          "contractions",
        ]) {
          assert.equal((await get(module, 1)).status, 403);
          assert.equal((await get(module, 2)).status, 403);
        }
        await ok(
          await post("overview", "permissions", {
            id: member.id,
            tasks: true,
            names: true,
            questions: true,
            cards: true,
          }),
        );
      },
    );
    await t.test(
      "importación idempotente, CRUD, progreso, responsables y recordatorios deduplicados",
      async () => {
        const template = await db.toolTemplate.findUniqueOrThrow({
          where: { slug: "preparations-default" },
        });
        await ok(
          await post("preparations", "import", { templateId: template.id }),
        );
        const n = await db.task.count({ where: { pregnancyId: pId } });
        await ok(
          await post("preparations", "import", { templateId: template.id }, 1),
        );
        assert.equal(await db.task.count({ where: { pregnancyId: pId } }), n);
        await ok(
          await post("preparations", "save", {
            title: "Mi tarea",
            notes: "nota privada en lista compartida",
            assigneeId: users[1].id,
            reminderAt: new Date(Date.now() - 1000).toISOString(),
          }),
        );
        let data = await ok(await get("preparations", 1));
        const task = data.tasks.find(
          (x: { title: string }) => x.title === "Mi tarea",
        );
        assert.ok(task);
        await toolReminderTick();
        await toolReminderTick();
        assert.equal(
          await db.notification.count({
            where: { userId: users[0].id, category: "preparations" },
          }),
          1,
        );
        await ok(
          await post(
            "preparations",
            "save",
            { ...task, dueDate: null, completed: true },
            1,
          ),
        );
        data = await ok(await get("overview"));
        assert.equal(data.tasks.completed, 1);
        const other = await db.preparationCategory.create({
          data: { pregnancyId: pId, title: "Propia" },
        });
        await ok(
          await post("preparations", "save", {
            ...task,
            title: "Cambio",
            categoryId: other.id,
            dueDate: "2026-12-01",
            completed: true,
          }),
        );
        await ok(await post("preparations", "delete", { id: task.id }));
        assert.equal(await db.task.count({ where: { id: task.id } }), 0);
      },
    );
    let questionId = "",
      appointmentId = "";
    await t.test(
      "preguntas ligadas a citas: compartir explícito, respuestas e historial privado",
      async () => {
        const a = await db.appointment.create({
          data: {
            pregnancyId: pId,
            title: "Consulta",
            type: "Control",
            at: new Date(Date.now() + 3600000),
            professional: "Profesional fixture",
            location: "Centro",
            notes: "Mi nota",
          },
        });
        appointmentId = a.id;
        await ok(
          await post("questions", "save", {
            question: "Pregunta privada",
            category: "Otros",
            appointmentId: a.id,
            reminder: true,
          }),
        );
        let data = await ok(await get("questions"));
        questionId = data.questions[0].id;
        assert.equal((await ok(await get("questions", 1))).questions.length, 0);
        await ok(
          await post("questions", "save", {
            ...data.questions[0],
            shared: true,
            answered: true,
            answer: "Respuesta registrada",
          }),
        );
        assert.equal(
          (await ok(await get("questions", 1))).questions[0].answer,
          "Respuesta registrada",
        );
        assert.equal(
          (
            await post(
              "questions",
              "save",
              {
                id: questionId,
                question: "Intento de edición",
                category: "Otros",
              },
              1,
            )
          ).status,
          400,
        );
        await ok(
          await post("questions", "save", {
            ...data.questions[0],
            shared: false,
            answered: false,
            reminder: true,
          }),
        );
        await toolReminderTick();
        await toolReminderTick();
        assert.equal(
          await db.notification.count({
            where: { category: "questions", userId: users[0].id },
          }),
          1,
        );
      },
    );
    await t.test(
      "nombres: búsqueda sin tildes, filtros, favoritos y votos ocultos hasta participación mutua",
      async () => {
        const data = await ok(
          await get("names", 0, "&q=Benjamin&gender=M&first=B&min=5&max=10"),
        );
        assert.equal(data.names.length, 1);
        const nameId = data.names[0].id;
        await ok(
          await post("names", "choose", {
            nameId,
            favorite: true,
            vote: "FAVORITE",
            note: "Nota que no debe filtrarse",
          }),
        );
        let partner = await ok(await get("names", 1, "&q=Benjamin"));
        assert.deepEqual(partner.partnerVotes, []);
        await ok(
          await post(
            "names",
            "choose",
            { nameId, favorite: true, vote: "LIKE", note: "Nota de pareja" },
            1,
          ),
        );
        partner = await ok(await get("names", 1, "&q=Benjamin"));
        assert.equal(partner.partnerVotes[0].vote, "FAVORITE");
        assert.ok(
          !JSON.stringify(partner).includes("Nota que no debe filtrarse"),
        );
        const owner = await ok(await get("names", 0, "&q=Benjamin"));
        assert.equal(owner.choices[0].note, "Nota que no debe filtrarse");
        assert.equal(owner.partnerVotes[0].vote, "LIKE");
      },
    );
    await t.test(
      "tarjetas: configura y genera PNG, sin archivo médico no autorizado ni acceso ajeno",
      async () => {
        const template = await db.toolTemplate.findUniqueOrThrow({
          where: { slug: "announcement" },
        });
        const card = await ok(
          await post("cards", "save", {
            templateId: template.id,
            text: "Una aventura",
            background: "mint",
            format: "square",
          }),
        );
        const png = await call(0, "/api/tools/cards?id=" + card.id);
        assert.equal(png.status, 200);
        const metadata = await sharp(
          Buffer.from(await png.arrayBuffer()),
        ).metadata();
        assert.equal(metadata.width, 1080);
        assert.equal(metadata.height, 1080);
        assert.equal(
          (await call(2, "/api/tools/cards?id=" + card.id)).status,
          400,
        );
        const medical = await db.uploadedFile.create({
          data: {
            ownerId: users[0].id,
            key: "fixture/medical-" + randomUUID(),
            mime: "image/png",
            medical: true,
            size: 12,
            name: "private.png",
          },
        });
        assert.equal(
          (
            await post("cards", "save", {
              templateId: template.id,
              text: "Mi foto",
              background: "cream",
              format: "story",
              fileId: medical.id,
            })
          ).status,
          400,
        );
        await ok(
          await post("cards", "save", {
            templateId: template.id,
            text: "Autorizada",
            background: "cream",
            format: "story",
            fileId: medical.id,
            medicalConsent: true,
          }),
        );
      },
    );
    await t.test(
      "timelapse: fotos de pancita existentes, orden persistente y trabajador externo explícito",
      async () => {
        const photos = [];
        for (let i = 0; i < 2; i++) {
          const file = await db.uploadedFile.create({
            data: {
              ownerId: users[0].id,
              key: "fixture/belly-" + randomUUID(),
              mime: "image/png",
              size: 12,
              name: "belly.png",
            },
          });
          const entry = await db.entry.create({
            data: {
              pregnancyId: pId,
              kind: "belly",
              title: "Foto " + i,
              text: "",
              date: new Date("2026-11-01"),
              gestationalDays: 35,
              fileId: file.id,
            },
          });
          photos.push({ entryId: entry.id, fileId: file.id });
        }
        const job = await ok(
          await post("timelapse", "save", {
            photos: [...photos].reverse(),
            seconds: 2,
            format: "vertical",
            transition: "fade",
          }),
        );
        assert.deepEqual(job.config.photos, [...photos].reverse());
        assert.equal(job.status, "DRAFT");
        assert.equal(
          (await post("timelapse", "generate", { id: job.id })).status,
          400,
        );
        assert.equal(
          (await call(1, "/api/tools/media?id=" + job.id)).status,
          403,
        );
        const bad = await post("timelapse", "save", {
          photos: [
            { entryId: questionId, fileId: photos[0].fileId },
            photos[1],
          ],
          seconds: 2,
          format: "square",
          transition: "cut",
        });
        assert.equal(bad.status, 400);
        await ok(await post("timelapse", "delete", { id: job.id }));
      },
    );
    await t.test(
      "contracciones: recuperación, replay idempotente, corrección y autorización",
      async () => {
        const sessionId = randomUUID(),
          startedAt = new Date(Date.now() - 120000).toISOString();
        await ok(
          await post("contractions", "session", {
            id: sessionId,
            startedAt,
            status: "ACTIVE",
            instructions: "Indicaciones privadas",
          }),
        );
        const record = {
          id: randomUUID(),
          sessionId,
          startedAt,
          endedAt: null,
          note: "",
        };
        await ok(await post("contractions", "record", record));
        const endedAt = new Date(Date.parse(startedAt) + 45000).toISOString();
        await ok(await post("contractions", "record", { ...record, endedAt }));
        await ok(await post("contractions", "record", record));
        let data = await ok(await get("contractions"));
        assert.equal(data.sessions[0].records.length, 1);
        assert.equal(data.sessions[0].records[0].endedAt, endedAt);
        assert.equal(
          (
            await post("contractions", "correct", {
              ...record,
              endedAt: new Date(Date.parse(startedAt) - 1000).toISOString(),
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await post(
              "contractions",
              "record",
              { ...record, id: randomUUID() },
              2,
            )
          ).status,
          400,
        );
        await ok(
          await post("contractions", "correct", {
            ...record,
            endedAt: new Date(Date.parse(startedAt) + 60000).toISOString(),
            note: "Corrección",
          }),
        );
        await ok(
          await post("contractions", "session", {
            id: sessionId,
            startedAt,
            status: "PAUSED",
            instructions: "Indicaciones privadas",
          }),
        );
        data = await ok(await get("contractions"));
        assert.equal(data.sessions[0].status, "PAUSED");
        assert.equal(data.sessions[0].records[0].note, "Corrección");
        await ok(await post("contractions", "deleteRecord", { id: record.id }));
        assert.equal(
          await db.contractionRecord.count({ where: { id: record.id } }),
          0,
        );
      },
    );
    await t.test(
      "revocación de permisos familiar inmediata y exportación de datos propios",
      async () => {
        await db.pregnancyMember.delete({ where: { id: member.id } });
        for (const module of ["preparations", "names", "questions", "cards"])
          assert.equal((await get(module, 1)).status, 403);
        const exportData = await (await call(0, "/api/privacy")).json();
        assert.ok(exportData.pregnancies[0].medicalQuestions.length);
        assert.ok(exportData.pregnancies[0].contractionSessions.length);
      },
    );
  } finally {
    for (const u of users) await db.user.deleteMany({ where: { id: u.id } });
    await db.$disconnect();
  }
});
