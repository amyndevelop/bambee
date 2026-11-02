import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  dayNumber,
  gestation,
  todayInZone,
  canAccess,
} from "../src/lib/gestation";
test("FPP a 280 días, incluyendo año bisiesto", () => {
  assert.equal(addDays("2024-02-01", 280), "2024-11-07");
  assert.equal(addDays("2026-01-01", 280), "2026-10-08");
});
test("semanas y días exactos, sin redondear", () => {
  assert.deepEqual(gestation("2026-12-01", "2026-07-17"), {
    elapsed: 143,
    weeks: 20,
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
