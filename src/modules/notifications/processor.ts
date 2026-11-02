import { db } from "../../lib/db";
import { gestation, todayInZone } from "../../lib/gestation";
export async function tick() {
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
      g.weeks > 42 ||
      (p.owner.preferences as Record<string, boolean>).weekly === false
    )
      continue;
    const key = `week:${p.id}:${g.weeks}`;
    await db.notification.upsert({
      where: { dedupe: key },
      create: {
        dedupe: key,
        userId: p.ownerId,
        category: "weekly",
        title: `Ya estás en la semana ${g.weeks}. Te acompañamos en cada paso.`,
      },
      update: {},
    });
  }
}
