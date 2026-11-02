import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  dayNumber,
  gestation,
  todayInZone,
  canAccess,
  gestationalAgeFromDays,
  formatGestationalAge,
  gestationalWeekRange,
  formatWeekRange,
} from "../src/lib/gestation";
test("rangos inclusivos coinciden con cada semana en curso, incluidos 4+6, 5+0 y 5+1", () => {
  const due = addDays("2026-09-29", 280);
  assert.deepEqual(gestationalWeekRange(due, 5), {
    start: "2026-10-28",
    end: "2026-11-03",
  });
  for (let elapsed = 0; elapsed <= 294; elapsed++) {
    const date = addDays("2026-09-29", elapsed);
    const { start, end } = gestationalWeekRange(
      due,
      gestation(due, date).currentWeek,
    );
    assert.ok(date >= start && date <= end);
  }
  assert.deepEqual(gestationalWeekRange(due, 1), {
    start: "2026-09-29",
    end: "2026-10-06",
  });
  assert.match(
    formatWeekRange(due, 5),
    /28 de octubre de 2026.*03 de noviembre de 2026/,
  );
});
test("rangos calendario atraviesan año, bisiestos y cambios de horario sin desplazar fechas", () => {
  for (const reference of [
    "2024-02-25",
    "2026-12-28",
    "2026-03-07",
    "2026-10-31",
  ]) {
    const due = addDays(reference, 280);
    const previous = gestationalWeekRange(due, 1);
    const next = gestationalWeekRange(due, 2);
    assert.equal(next.start, addDays(previous.end, 1));
    assert.equal(dayNumber(next.end) - dayNumber(next.start), 6);
  }
  assert.throws(() => gestationalWeekRange("2026-11-02", 0));
});
test("FPP a 280 días, incluyendo año bisiesto", () => {
  assert.equal(addDays("2024-02-01", 280), "2024-11-07");
  assert.equal(addDays("2026-01-01", 280), "2026-10-08");
});
test("semanas y días exactos, sin redondear", () => {
  assert.deepEqual(gestation("2026-12-01", "2026-07-17"), {
    elapsed: 143,
    weeks: 20,
    completedWeeks: 20,
    currentWeek: 21,
    days: 3,
    remaining: 137,
    trimester: 2,
    percent: (143 / 280) * 100,
  });
});
test("cambio de día según zona configurada", () => {
  const n = new Date("2026-11-02T01:00:00Z");
  assert.equal(todayInZone("America/Argentina/Buenos_Aires", n), "2026-11-01");
  assert.equal(todayInZone("UTC", n), "2026-11-02");
});
test("el horario de verano no altera los días civiles", () => {
  assert.equal(dayNumber("2026-03-09") - dayNumber("2026-03-08"), 1);
  assert.equal(
    todayInZone("America/New_York", new Date("2026-03-09T03:59:00Z")),
    "2026-03-08",
  );
});
test("fechas inválidas son rechazadas", () => {
  assert.throws(() => dayNumber("2026-02-30"));
  assert.throws(() => dayNumber("x"));
});
test("datación profesional usa la FPP indicada", () => {
  const professional = "2026-12-10";
  assert.equal(gestation(professional, "2026-07-17").remaining, 146);
  assert.equal(professional, "2026-12-10");
});
test("límites: futuro y fecha superada", () => {
  assert.equal(gestation("2027-12-01", "2026-01-01").percent, 0);
  assert.equal(gestation("2026-01-01", "2026-02-01").percent, 100);
  assert.equal(gestation("2026-01-01", "2026-02-01").remaining, 0);
});
test("pareja: permiso explícito para citas, nunca datos privados", () => {
  assert.equal(
    canAccess("owner", "partner", "progress", { appointments: false }),
    true,
  );
  assert.equal(
    canAccess("owner", "partner", "appointment", { appointments: false }),
    false,
  );
  assert.equal(
    canAccess("owner", "partner", "appointment", { appointments: true }),
    true,
  );
  for (const kind of ["private", "journal", "symptom", "ultrasound", "belly"])
    assert.equal(
      canAccess("owner", "partner", kind, { appointments: true }),
      false,
    );
  assert.equal(canAccess("owner", "stranger", "progress"), false);
  assert.equal(canAccess("owner", "owner", "private"), true);
});

test("las tareas requieren un permiso familiar independiente", () => {
  assert.equal(
    canAccess("owner", "partner", "task", { appointments: true, tasks: false }),
    false,
  );
  assert.equal(
    canAccess("owner", "partner", "task", { appointments: false, tasks: true }),
    true,
  );
});

test("FUM 29/09: 4+6, 5+0 y 5+1 distinguen edad exacta y semana en curso", () => {
  const due = addDays("2026-09-29", 280);
  for (const [today, weeks, days, currentWeek] of [
    ["2026-11-02", 4, 6, 5],
    ["2026-11-03", 5, 0, 5],
    ["2026-11-04", 5, 1, 6],
  ] as const) {
    const age = gestation(due, today);
    assert.equal(age.completedWeeks, weeks);
    assert.equal(age.weeks, weeks);
    assert.equal(age.days, days);
    assert.equal(age.currentWeek, currentWeek);
  }
});
test("de 0 a 6 días siempre muestra semana 1, y los múltiplos exactos respetan semanas completas", () => {
  for (let day = 0; day <= 6; day++)
    assert.equal(gestationalAgeFromDays(day).currentWeek, 1);
  for (const days of [7, 14, 28, 35, 140, 280, 294])
    assert.equal(gestationalAgeFromDays(days).currentWeek, days / 7);
  assert.equal(gestationalAgeFromDays(8).currentWeek, 2);
  assert.equal(gestationalAgeFromDays(-1).currentWeek, 1);
});
test("el cambio de día usa el calendario de Buenos Aires para avanzar de 5+0 a 5+1", () => {
  const due = addDays("2026-09-29", 280),
    zone = "America/Argentina/Buenos_Aires";
  const before = gestation(
    due,
    todayInZone(zone, new Date("2026-11-04T02:59:59Z")),
  );
  const after = gestation(
    due,
    todayInZone(zone, new Date("2026-11-04T03:00:00Z")),
  );
  assert.equal(before.currentWeek, 5);
  assert.equal(before.days, 0);
  assert.equal(after.currentWeek, 6);
  assert.equal(after.days, 1);
});
test("los días con 23 o 25 horas siguen siendo un solo día gestacional", () => {
  const zone = "America/New_York";
  for (const [start, before, after] of [
    ["2026-02-01", "2026-03-09T03:59:59Z", "2026-03-09T04:00:00Z"],
    ["2026-09-27", "2026-11-02T04:59:59Z", "2026-11-02T05:00:00Z"],
  ]) {
    const due = addDays(start, 280);
    const a = gestation(due, todayInZone(zone, new Date(before))),
      b = gestation(due, todayInZone(zone, new Date(after)));
    assert.equal(b.elapsed - a.elapsed, 1);
    assert.equal(
      b.completedWeeks * 7 + b.days,
      a.completedWeeks * 7 + a.days + 1,
    );
  }
});
test("la FPP profesional corregida prevalece sin reconstruir ni reemplazar la FUM", () => {
  const today = "2026-11-02",
    lmpDue = addDays("2026-09-29", 280),
    professionalDue = addDays(lmpDue, 7);
  assert.equal(gestation(lmpDue, today).currentWeek, 5);
  assert.equal(gestation(professionalDue, today).currentWeek, 4);
  assert.equal(gestation(professionalDue, today).completedWeeks, 3);
  assert.equal(professionalDue, addDays(lmpDue, 7));
});
test("formato de edad gestacional exacta mantiene ambas unidades, incluso en 5+0", () => {
  assert.equal(formatGestationalAge(4, 6), "4 semanas y 6 días");
  assert.equal(formatGestationalAge(5, 0), "5 semanas y 0 días");
  assert.equal(formatGestationalAge(5, 1), "5 semanas y 1 día");
});
