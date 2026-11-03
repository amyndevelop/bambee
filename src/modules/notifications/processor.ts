import { db } from "../../lib/db";
import { gestation, todayInZone } from "../../lib/gestation";
export async function tick() {
  await toolReminderTick();
  const reminders = await db.appointmentReminder.findMany({
    where: { sentAt: null, dueAt: { lte: new Date() } },
    include: {
      appointment: { include: { pregnancy: { include: { owner: true } } } },
    },
  });
  for (const r of reminders)
    await db.$transaction(async (tx) => {
      const a = r.appointment,
        p = a.pregnancy,
        prefs = p.owner.preferences as Record<string, boolean>;
      if (!a.completed && prefs.appointment !== false)
        await tx.notification.upsert({
          where: { dedupe: "reminder:" + r.id },
          create: {
            userId: p.ownerId,
            category: "appointment",
            title: "Tenés una cita próxima. Consultá tu agenda.",
            dedupe: "reminder:" + r.id,
          },
          update: {},
        });
      await tx.appointmentReminder.update({
        where: { id: r.id },
        data: { sentAt: new Date() },
      });
    });
  const pregnancies = await db.pregnancy.findMany({
    where: { archived: false },
    include: { owner: true },
  });
  for (const p of pregnancies) {
    const g = gestation(
      p.dueDate.toISOString().slice(0, 10),
      todayInZone(p.owner.timezone),
    );
    if (
      g.elapsed < 0 ||
      g.currentWeek > 42 ||
      (p.owner.preferences as Record<string, boolean>).weekly === false
    )
      continue;
    const key = `week:${p.id}:${g.currentWeek}`;
    await db.notification.upsert({
      where: { dedupe: key },
      create: {
        dedupe: key,
        userId: p.ownerId,
        category: "weekly",
        title: `Ya estás en la semana ${g.currentWeek}. Te acompañamos en cada paso.`,
      },
      update: {},
    });
  }
}

/** Personal task/question reminders use neutral text and stable keys. */
export async function toolReminderTick() {
  const now = new Date();
  const tasks = await db.task.findMany({
    where: { completed: false, remindedAt: null, reminderAt: { lte: now } },
    include: { pregnancy: { include: { owner: true } } },
  });
  for (const task of tasks)
    await db.$transaction(async (tx) => {
      const prefs = task.pregnancy.owner.preferences as Record<string, boolean>;
      if (prefs.preparations !== false)
        await tx.notification.upsert({
          where: {
            dedupe: "prep:" + task.id + ":" + task.reminderAt!.toISOString(),
          },
          create: {
            userId: task.pregnancy.ownerId,
            category: "preparations",
            title: "Tenés un preparativo pendiente. Revisá tu lista.",
            dedupe: "prep:" + task.id + ":" + task.reminderAt!.toISOString(),
          },
          update: {},
        });
      await tx.task.update({
        where: { id: task.id },
        data: { remindedAt: now },
      });
    });
  const questions = await db.medicalQuestion.findMany({
    where: {
      answered: false,
      reminder: true,
      appointment: {
        completed: false,
        at: { gte: now, lte: new Date(now.getTime() + 86400000) },
      },
    },
    include: { user: true, appointment: true },
  });
  for (const q of questions)
    if ((q.user.preferences as Record<string, boolean>).questions !== false)
      await db.notification.upsert({
        where: {
          dedupe: `question:${q.id}:${q.appointment!.at.toISOString()}`,
        },
        create: {
          userId: q.userId,
          category: "questions",
          title:
            "Tu próxima consulta tiene preguntas pendientes. Revisá Mis preguntas.",
          dedupe: `question:${q.id}:${q.appointment!.at.toISOString()}`,
        },
        update: {},
      });
}
