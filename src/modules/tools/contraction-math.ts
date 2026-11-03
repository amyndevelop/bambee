export type TimedRecord = {
  startedAt: string;
  endedAt: string | null;
  note?: string;
};
export const durationSeconds = (r: TimedRecord, now = Date.now()) =>
  Math.max(
    0,
    ((r.endedAt ? Date.parse(r.endedAt) : now) - Date.parse(r.startedAt)) /
      1000,
  );
export function contractionStats(
  records: TimedRecord[],
  minutes: number,
  now = Date.now(),
) {
  const recent = records
    .filter(
      (r) =>
        Date.parse(r.startedAt) >= now - minutes * 60000 &&
        Date.parse(r.startedAt) <= now,
    )
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  const durations = recent
      .filter((r) => r.endedAt)
      .map((r) => durationSeconds(r)),
    intervals = recent
      .slice(1)
      .map(
        (r, i) =>
          (Date.parse(r.startedAt) - Date.parse(recent[i].startedAt)) / 1000,
      );
  const mean = (values: number[]) =>
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  return {
    count: recent.length,
    meanDuration: mean(durations),
    meanInterval: mean(intervals),
  };
}
export function clock(seconds: number) {
  const n = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}
export function contractionCsv(records: TimedRecord[]) {
  const cell = (v: string) =>
    '"' + (/^[=+@\-]/.test(v) ? "'" : "") + v.replaceAll('"', '""') + '"';
  const sorted = [...records].sort(
    (a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt),
  );
  return (
    "\uFEFFInicio UTC,Fin UTC,Duración segundos,Intervalo entre inicios segundos,Observaciones\n" +
    sorted
      .map((r, i) =>
        [
          r.startedAt,
          r.endedAt || "",
          r.endedAt ? String(Math.round(durationSeconds(r))) : "En curso",
          i
            ? String(
                (Date.parse(r.startedAt) -
                  Date.parse(sorted[i - 1].startedAt)) /
                  1000,
              )
            : "",
          r.note || "",
        ]
          .map(cell)
          .join(","),
      )
      .join("\n")
  );
}
