import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { db } from "../../src/lib/db";
test("administración: 42 borradores editables sin publicar ni exigir un embarazo", async ({
  page,
}) => {
  const connection = new URL(process.env.DATABASE_URL || "");
  expect(connection.pathname.startsWith("/bambee_weekly_verify_")).toBe(true);
  const email =
      "editorial-browser-" + randomBytes(6).toString("hex") + "@example.test",
    password = randomBytes(20).toString("hex");
  let userId = "";
  const original = await db.weeklyDevelopment.findUniqueOrThrow({
    where: { week: 5 },
  });
  try {
    const response = await page.request.post("/api/account", {
      headers: { origin: process.env.TEST_BASE_URL || "http://localhost:3000" },
      data: {
        action: "register",
        name: "Fixture editorial",
        email,
        password,
        consent: true,
      },
    });
    expect(response.ok()).toBe(true);
    const user = await db.user.update({
      where: { email },
      data: { role: "ADMIN" },
    });
    userId = user.id;
    await page.goto("/acceso");
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña ·").fill(password);
    await page.getByRole("button", { name: "Entrar a mi espacio" }).click();
    await expect(
      page.getByRole("heading", { name: "Cada historia tiene un comienzo" }),
    ).toBeVisible();
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Biblioteca editorial", exact: true }),
    ).toBeVisible();
    const picker = page.getByLabel("Editar una semana existente");
    await expect(picker.locator("option")).toHaveCount(43);
    await picker.selectOption("5");
    await expect(page.getByLabel("Título", { exact: true })).toHaveValue(
      original.title,
    );
    await page
      .getByLabel("Título", { exact: true })
      .fill("Fixture de edición editorial");
    await page
      .getByRole("button", { name: "Guardar contenido semanal" })
      .click();
    await expect(
      page.getByText("Contenido guardado", { exact: true }),
    ).toBeVisible();
    const updated = await db.weeklyDevelopment.findUniqueOrThrow({
      where: { week: 5 },
    });
    expect(updated.title).toBe("Fixture de edición editorial");
    expect(updated.published).toBe(false);
    expect(updated.reviewStatus).toBe("PENDING_REVIEW");
    expect(updated.reviewedAt).toBeNull();
    const health = await page.request.get("/api/health");
    expect(health.status()).toBe(200);
    const readiness = await health.json();
    expect(readiness.weeklyContent.total).toBe(42);
    expect(readiness.weeklyContent.complete).toBe(true);
    expect(readiness.weeklyContent.published).toBe(0);
    expect(readiness.release.font).toBe("Inter");
    expect(readiness.release.brand).toBe("original-pdf-2026-11-02");
    const publicWeeks = await page.request.get("/api/data?kind=weeks");
    expect(await publicWeeks.json()).toEqual([]);
  } finally {
    await db.weeklyDevelopment.update({
      where: { week: 5 },
      data: {
        title: original.title,
        summary: original.summary,
        reviewStatus: original.reviewStatus,
        reviewedAt: original.reviewedAt,
        reviewedBy: original.reviewedBy,
        published: original.published,
      },
    });
    if (userId) await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  }
});
