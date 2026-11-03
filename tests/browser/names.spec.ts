import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { db } from "../../src/lib/db";
test("catálogo público: variantes completas, filtros, paginación y despublicación administrativa", async ({
  page,
}) => {
  expect(["127.0.0.1", "localhost"]).toContain(
    new URL(process.env.DATABASE_URL || "").hostname,
  );
  expect(
    new URL(process.env.DATABASE_URL || "").pathname.startsWith(
      "/bambee_weekly_verify_",
    ),
  ).toBe(true);
  await page.goto("/nombres");
  await expect(page.getByLabel("Buscar nombre")).toBeVisible();
  for (const [query, names] of [
    ["Noah", ["Noah"]],
    ["Mia", ["Mía", "Mia"]],
    ["Benjamin", ["Benjamín"]],
    ["Sofia", ["Sofía", "Sofia"]],
    ["Gael", ["Gael"]],
    ["Milo", ["Milo"]],
  ] as const) {
    await page.getByLabel("Buscar nombre").fill(query);
    for (const name of names) {
      const card = page
        .locator("article")
        .filter({ has: page.getByRole("heading", { name, exact: true }) });
      await expect(card).toBeVisible();
      await expect(card.locator("p").first()).not.toBeEmpty();
    }
    if (query === "Gael")
      await expect(
        page.getByText(
          "Asociado al pueblo gaélico; su etimología como nombre es debatida.",
        ),
      ).toBeVisible();
  }
  await page.getByLabel("Buscar nombre").fill("");
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(page.getByText(/Página 2 de/)).toBeVisible();
  await page.getByRole("button", { name: "Anterior", exact: true }).click();
  await expect(page.getByText(/Página 1 de/)).toBeVisible();
  await page
    .getByRole("combobox", { name: "Género de uso habitual", exact: true })
    .selectOption("U");
  await expect(
    page.locator("article").first().getByText("Uso unisex"),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Género de uso habitual", exact: true })
    .selectOption("");
  await page
    .getByRole("combobox", { name: "Origen", exact: true })
    .selectOption("Hebreo");
  await expect(
    page.locator("article").first().getByText("Hebreo", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Origen", exact: true })
    .selectOption("");
  await page.getByLabel("Buscar nombre").fill("Noah");
  const noah = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Noah", exact: true }) });
  await noah.getByRole("button", { name: "Favorito", exact: true }).click();
  await expect(page).toHaveURL(/\/acceso\?next=\/nombres/);
  const email =
      "admin-names-" + randomBytes(8).toString("hex") + "@example.test",
    password = randomBytes(20).toString("hex"),
    origin = new URL(page.url()).origin;
  const reg = await page.request.post("/api/account", {
    headers: { origin },
    data: {
      action: "register",
      name: "Editor fixture",
      email,
      password,
      consent: true,
    },
  });
  expect(reg.ok()).toBe(true);
  const { csrfToken } = await (await page.request.get("/api/auth/csrf")).json();
  await page.request.post("/api/auth/callback/credentials", {
    form: { csrfToken, email, password, json: "true" },
  });
  const user = await db.user.update({
    where: { email },
    data: { role: "ADMIN" },
  });
  const original = await db.babyName.findUniqueOrThrow({
    where: { nameKey: "noah" },
  });
  try {
    const save = await page.request.post("/api/tools/admin", {
      headers: { origin },
      data: { op: "names", data: [{ ...original, published: false }] },
    });
    expect(save.ok()).toBe(true);
    const hidden = await (await page.request.get("/api/names?q=Noah")).json();
    expect(hidden.names.some((n: { id: string }) => n.id === original.id)).toBe(
      false,
    );
    const restore = await page.request.post("/api/tools/admin", {
      headers: { origin },
      data: { op: "names", data: [{ ...original, published: true }] },
    });
    expect(restore.ok()).toBe(true);
    const visible = await (await page.request.get("/api/names?q=Noah")).json();
    expect(
      visible.names.find((n: { id: string }) => n.id === original.id).meaning,
    ).toBe(original.meaning);
  } finally {
    await db.babyName.update({
      where: { id: original.id },
      data: {
        published: original.published,
        adminEdited: original.adminEdited,
      },
    });
    await db.user.delete({ where: { id: user.id } });
  }
});
