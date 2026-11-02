import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
test("registro, onboarding, dashboard y diario en móvil", async ({
  page,
}, testInfo) => {
  const email = `browser-${Date.now()}@example.test`,
    password = randomBytes(20).toString("hex");
  await page.goto("/acceso");
  const wordmark = page.locator(".logo-wordmark:visible").first();
  await expect(wordmark).toHaveAttribute("src", "/brand/wordmark.svg");
  await expect
    .poll(() =>
      wordmark.evaluate(
        (image) =>
          (image as HTMLImageElement).complete &&
          (image as HTMLImageElement).naturalWidth > 0,
      ),
    )
    .toBe(true);
  await expect(page.locator(".logo-isotype:visible").first()).toHaveAttribute(
    "src",
    "/brand/isotype.svg",
  );
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() => getComputedStyle(document.body).fontFamily),
  ).toContain("Inter Variable");
  expect(
    await page.evaluate(() =>
      Array.from(document.fonts).some(
        (font) => font.family.includes("Inter") && font.status === "loaded",
      ),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  expect(
    await page
      .getByRole("heading", { name: "Pequeños latidos. Un amor enorme." })
      .evaluate((element) => getComputedStyle(element).fontWeight),
  ).toBe("800");
  expect(
    await page
      .getByLabel("Tu nombre")
      .locator("..")
      .evaluate((element) => getComputedStyle(element).fontWeight),
  ).toBe("500");
  expect(
    await page
      .getByRole("button", { name: "Crear mi cuenta", exact: true })
      .evaluate((element) => getComputedStyle(element).fontWeight),
  ).toBe("600");
  await page.getByLabel("Tu nombre").fill("Lucía");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña ·").fill(password);
  await page.getByLabel("Confirmá tu contraseña").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(
    page.getByRole("heading", { name: "Cada historia tiene un comienzo" }),
  ).toBeVisible();
  await page.locator("select").selectOption("MEDICAL");
  const due = new Date();
  due.setUTCDate(due.getUTCDate() + 137);
  await page
    .getByLabel("Fecha probable de parto", { exact: true })
    .fill(due.toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Nombre o apodo").fill("Nuestro bebé");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Comenzar mi recorrido" }).click();
  await expect(
    page.getByRole("heading", { name: "Tu pequeño gran comienzo" }),
  ).toBeVisible();
  await expect(page.getByText("¡Hola, Lucía!")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Semana 21", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("20 semanas y 3 días", { exact: true }),
  ).toBeVisible();
  await page.locator('a[href="/bebe"]:visible').first().click();
  await expect(
    page.getByRole("button", { name: "Sem 21 · Hoy", exact: true }),
  ).toHaveAttribute("aria-current", "step");
  await expect(
    page.getByRole("button", { name: "Sem 21 · Hoy", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Sem 19", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sem 19", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByText("20 semanas y 3 días", { exact: false }),
  ).toBeVisible();
  await page.locator('a[href="/"]:visible').first().click();
  await expect(
    page.getByRole("heading", { name: "Semana 21", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/bambee-dashboard-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "Diario", exact: true }).last().click();
  await page.getByRole("button", { name: "Nuevo registro" }).click();
  await page.getByLabel("Título", { exact: true }).fill("Primer recuerdo");
  await page.getByLabel("Fecha", { exact: true }).fill("2026-11-02");
  await page.getByLabel("Tu recuerdo").fill("Un día para recordar.");
  await page.getByRole("button", { name: "Guardar registro" }).click();
  await expect(
    page.getByRole("heading", { name: "Primer recuerdo" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Primer recuerdo" }),
  ).toBeVisible();
  await page.goto("/configuracion");
  page.on("dialog", (d) => d.accept("ELIMINAR"));
  await page
    .getByRole("button", { name: "Eliminar mi cuenta y mis datos" })
    .click();
  await expect(
    page.getByRole("button", { name: "Iniciar sesión" }),
  ).toBeVisible();
});
