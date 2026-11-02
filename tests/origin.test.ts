import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedOrigins, assertSameOrigin } from "../src/lib/origin";
const request = (origin?: string, host = "https://bambee-eta.vercel.app") =>
  new Request(host + "/api/account", {
    method: "POST",
    headers: origin ? { origin } : {},
  });
test("acepta dominio canónico configurado", () => {
  assert.doesNotThrow(() =>
    assertSameOrigin(request("https://bambee-eta.vercel.app"), {
      NODE_ENV: "production",
      NEXTAUTH_URL: "https://bambee-eta.vercel.app",
    }),
  );
});
test("acepta alias y deployment propios de Vercel sin fallback a localhost", () => {
  const env = {
    NODE_ENV: "production",
    VERCEL_PROJECT_PRODUCTION_URL: "bambee-eta.vercel.app",
    VERCEL_URL: "bambee-deployment-arqen2.vercel.app",
  };
  assert.doesNotThrow(() =>
    assertSameOrigin(request("https://bambee-eta.vercel.app"), env),
  );
  assert.doesNotThrow(() =>
    assertSameOrigin(
      request("https://bambee-deployment-arqen2.vercel.app"),
      env,
    ),
  );
  assert.equal(allowedOrigins(env).has("http://localhost:3000"), false);
});
test("APP_URL permite el origen explícito aunque NEXTAUTH_URL esté desactualizado", () => {
  assert.doesNotThrow(() =>
    assertSameOrigin(request("https://bambee-eta.vercel.app"), {
      NODE_ENV: "production",
      NEXTAUTH_URL: "http://localhost:3000",
      APP_URL: "https://bambee-eta.vercel.app",
    }),
  );
});
test("rechaza dominio ajeno, otro proyecto Vercel y sufijos engañosos", () => {
  const env = {
    VERCEL_PROJECT_PRODUCTION_URL: "bambee-eta.vercel.app",
    NODE_ENV: "production",
  };
  for (const origin of [
    "https://attacker.example",
    "https://other.vercel.app",
    "https://bambee-eta.vercel.app.attacker.example",
    "http://bambee-eta.vercel.app",
  ])
    assert.throws(
      () => assertSameOrigin(request(origin), env),
      /ORIGIN_NOT_ALLOWED/,
    );
});
test("no confía en URL ni cabeceras de host de la solicitud", () => {
  const req = new Request("https://attacker.example/api/account", {
    method: "POST",
    headers: {
      origin: "https://attacker.example",
      host: "attacker.example",
      "x-forwarded-host": "attacker.example",
    },
  });
  assert.throws(
    () =>
      assertSameOrigin(req, {
        NODE_ENV: "production",
        NEXTAUTH_URL: "https://bambee-eta.vercel.app",
      }),
    /ORIGIN_NOT_ALLOWED/,
  );
});
test("rechaza origen ausente, null y configuración productiva ausente", () => {
  for (const origin of [undefined, "null", "https://bambee-eta.vercel.app"])
    assert.throws(() =>
      assertSameOrigin(request(origin), { NODE_ENV: "production" }),
    );
  assert.throws(() =>
    assertSameOrigin(request(), {
      NEXTAUTH_URL: "https://bambee-eta.vercel.app",
    }),
  );
});
test("localhost queda disponible para desarrollo sin configurar", () => {
  assert.doesNotThrow(() =>
    assertSameOrigin(request("http://localhost:3000"), {
      NODE_ENV: "development",
    }),
  );
  assert.equal(
    allowedOrigins({
      NODE_ENV: "production",
      VERCEL_URL: "attacker.example/path",
      NEXTAUTH_URL: "javascript:alert(1)",
    }).size,
    0,
  );
});
