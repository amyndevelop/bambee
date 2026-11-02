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
/** Exact age and display week use calendar days, never elapsed clock hours. */
export function gestationalAgeFromDays(elapsed: number) {
  const daysSinceStart = Math.max(0, elapsed);
  const completedWeeks = Math.floor(daysSinceStart / 7);
  const days = daysSinceStart % 7;
  const currentWeek = Math.max(1, completedWeeks + (days > 0 ? 1 : 0));
  return { completedWeeks, days, currentWeek };
}
export function formatGestationalAge(completedWeeks: number, days: number) {
  return `${completedWeeks} ${completedWeeks === 1 ? "semana" : "semanas"} y ${days} ${days === 1 ? "día" : "días"}`;
}
/** Inclusive dates for the app's display-week convention (exact multiples stay in that week). */
export function gestationalWeekRange(due: string, week: number) {
  if (!Number.isInteger(week) || week < 1) throw new Error("Semana inválida");
  const reference = addDays(due, -280);
  return {
    start: addDays(reference, week === 1 ? 0 : (week - 1) * 7 + 1),
    end: addDays(reference, week * 7),
  };
}
export function formatWeekRange(due: string, week: number, compact = false) {
  const { start, end } = gestationalWeekRange(due, week);
  const format = (date: string) =>
    new Intl.DateTimeFormat("es-AR", {
      timeZone: "UTC",
      day: "2-digit",
      month: compact ? "2-digit" : "long",
      ...(compact ? {} : { year: "numeric" as const }),
    }).format(new Date(date + "T12:00:00Z"));
  return compact
    ? `${format(start)} – ${format(end)}`
    : `Del ${format(start)} al ${format(end)}`;
}
export function gestation(due: string, today: string) {
  const remaining = dayNumber(due) - dayNumber(today),
    elapsed = 280 - remaining;
  const age = gestationalAgeFromDays(elapsed);
  return {
    elapsed,
    ...age,
    // Compatibility for consumers that already use weeks as completed weeks.
    weeks: age.completedWeeks,
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
