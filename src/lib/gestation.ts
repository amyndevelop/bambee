export function dayNumber(date: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Fecha inválida");
  const parsed = new Date(date + "T00:00:00Z");
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  )
    throw new Error("Fecha inválida");
  return parsed.getTime() / 86400000;
}
export function addDays(date: string, days: number) {
  return new Date((dayNumber(date) + days) * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function todayInZone(zone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const v = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${v("year")}-${v("month")}-${v("day")}`;
}
export function gestation(due: string, today: string) {
  const remaining = dayNumber(due) - dayNumber(today),
    elapsed = 280 - remaining;
  return {
    elapsed,
    weeks: Math.floor(Math.max(0, elapsed) / 7),
    days: Math.max(0, elapsed) % 7,
    remaining: Math.max(0, remaining),
    trimester: elapsed < 98 ? 1 : elapsed < 196 ? 2 : 3,
    percent: Math.min(100, Math.max(0, (elapsed / 280) * 100)),
  };
}
export function canAccess(
  ownerId: string,
  userId: string,
  kind: string,
  member?: { appointments: boolean; tasks?: boolean } | null,
) {
  return (
    ownerId === userId ||
    (!!member &&
      (kind === "progress" ||
        (kind === "appointment" && member.appointments) ||
        (kind === "task" && !!member.tasks)))
  );
}
