import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";

test("registro distingue autenticación fuera de servicio de cuenta creada sin sesión", async ({
  page,
}) => {
  await page.goto("/acceso");
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await page.getByLabel("Tu nombre").fill("Registro de prueba");
  await page
    .getByLabel("Correo electrónico")
    .fill(`registration-${randomBytes(8).toString("hex")}@example.test`);
  const password = randomBytes(20).toString("hex");
  await page.getByLabel("Contraseña ·").fill(password);
  await page.getByLabel("Confirmá tu contraseña").fill(password);
  await page.getByRole("checkbox").check();
  let registrations = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/account")) registrations++;
  });
  await page.route("**/api/auth/providers", (route) =>
    route.fulfill({ status: 500, json: { error: "Configuration" } }),
  );
  await page
    .getByRole("button", { name: "Crear mi cuenta", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "configuración de autenticación",
  );
  expect(registrations).toBe(0);
  await expect(page).toHaveURL(/\/acceso$/);
  await page.unroute("**/api/auth/providers");
  await page.route("**/api/auth/callback/credentials", (route) =>
    route.fulfill({
      json: {
        url: new URL("/acceso?error=CredentialsSignin", route.request().url())
          .href,
      },
    }),
  );
  await page
    .getByRole("button", { name: "Crear mi cuenta", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Tu cuenta fue creada");
  expect(registrations).toBe(1);
  await expect(
    page.getByRole("button", { name: "Entrar a mi espacio" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/acceso$/);
});
