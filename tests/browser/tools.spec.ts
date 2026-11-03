import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
async function workspace(page: import("@playwright/test").Page) {
  const email =
      "tools-browser-" + randomBytes(8).toString("hex") + "@example.test",
    password = randomBytes(20).toString("hex");
  await page.goto("/acceso");
  const registration = await page.request.post("/api/account", {
    headers: { origin: new URL(page.url()).origin },
    data: {
      action: "register",
      name: "Familia fixture",
      email,
      password,
      consent: true,
    },
  });
  expect(registration.ok()).toBe(true);
  const { csrfToken } = await (await page.request.get("/api/auth/csrf")).json();
  const login = await page.request.post("/api/auth/callback/credentials", {
    form: { csrfToken, email, password, json: "true" },
  });
  expect(login.ok()).toBe(true);
  const due = new Date();
  due.setUTCDate(due.getUTCDate() + 130);
  const p = await page.request.post("/api/data", {
    headers: { origin: new URL(page.url()).origin },
    data: {
      action: "pregnancy",
      source: "MEDICAL",
      date: due.toISOString().slice(0, 10),
      timezone: "America/Argentina/Buenos_Aires",
      babyName: "Mi bebé",
    },
  });
  expect(p.ok()).toBe(true);
  return (await p.json()).id as string;
}
test("herramientas: preparativos, preguntas, nombres, tarjeta PNG y cronómetro recuperable", async ({
  page,
  context,
}, info) => {
  const pregnancyId = await workspace(page);
  await page.goto("/herramientas");
  await expect(
    page.getByRole("heading", { name: "Herramientas para esta etapa" }),
  ).toBeVisible();
  await page
    .locator("main")
    .getByRole("link", { name: "Mis preparativos", exact: true })
    .click();
  await page.getByRole("button", { name: /Importar Listas iniciales/ }).click();
  await expect(page.getByText(/de 26 completados/)).toBeVisible();
  await page.getByRole("button", { name: "Nueva tarea" }).click();
  await page
    .getByLabel("Tarea", { exact: true })
    .fill("Preparar documentos de prueba");
  await page.getByRole("button", { name: "Guardar tarea" }).click();
  const task = page
    .locator("article")
    .filter({ hasText: "Preparar documentos de prueba" });
  await task.getByRole("checkbox").check();
  await expect(task.getByRole("checkbox")).toBeEnabled();
  await page.reload();
  await expect(
    page
      .locator("article")
      .filter({ hasText: "Preparar documentos de prueba" })
      .getByRole("checkbox"),
  ).toBeChecked();
  await page.goto("/preguntas");
  await page.getByRole("button", { name: "Nueva pregunta" }).click();
  await page
    .getByLabel("Tu pregunta")
    .fill("¿Qué llevo a la próxima consulta?");
  await page.getByRole("button", { name: "Guardar pregunta" }).click();
  await expect(
    page.getByRole("heading", { name: "¿Qué llevo a la próxima consulta?" }),
  ).toBeVisible();
  await page.goto("/nombres");
  await page.getByLabel("Buscar nombre").fill("Benjamin");
  await expect(
    page.getByRole("heading", { name: "Benjamín", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Favorito", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Quitar favorito" }),
  ).toBeVisible();
  await page.goto("/compartir");
  await page
    .getByRole("combobox", { name: "Plantilla", exact: true })
    .selectOption({ label: "Anuncio de embarazo" });
  await page
    .getByRole("combobox", { name: "Formato", exact: true })
    .selectOption("square");
  await page
    .getByRole("button", { name: "Guardar y previsualizar PNG" })
    .click();
  await expect(
    page.getByRole("img", { name: "Vista previa de tu tarjeta BAMBEE" }),
  ).toBeVisible();
  expect(
    await page
      .getByRole("img", { name: "Vista previa de tu tarjeta BAMBEE" })
      .evaluate((image) => (image as HTMLImageElement).naturalWidth),
  ).toBe(1080);
  await page.goto("/contracciones");
  await page.getByRole("button", { name: "Iniciar nueva sesión" }).click();
  await page.getByRole("button", { name: "Comenzar contracción" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Registros sincronizados",
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Terminar contracción" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Terminar contracción" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Registros sincronizados",
  );
  await expect(
    page.getByText("1 registros en esta sesión.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Cronómetro preparado para recargar sin conexión."),
  ).toBeVisible();
  await context.setOffline(true);
  await page.getByRole("button", { name: "Comenzar contracción" }).click();
  await expect(
    page.getByRole("button", { name: "Terminar contracción" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Terminar contracción" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Terminar contracción" }).click();
  await expect(page.getByRole("status")).toContainText(
    "pendientes de sincronización",
  );
  await context.setOffline(false);
  await page.getByRole("button", { name: "Sincronizar ahora" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Registros sincronizados",
  );
  const persisted = await (
    await page.request.get(
      `/api/tools?module=contractions&pregnancyId=${pregnancyId}`,
    )
  ).json();
  expect(persisted.sessions[0].records).toHaveLength(2);
  await page.screenshot({
    path: `/tmp/bambee-tools-${info.project.name}.png`,
    fullPage: true,
  });
  await page.goto("/pancita/evolucion");
  await expect(
    page.getByRole("heading", { name: "Crear mi evolución" }),
  ).toBeVisible();
  await expect(
    page.getByText("La exportación MP4 necesita habilitar", { exact: false }),
  ).toBeVisible();
});
