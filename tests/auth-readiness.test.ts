import { test } from "node:test";
import assert from "node:assert/strict";
import { authReadiness } from "../src/lib/auth-readiness";

test("producción requiere el secreto que realmente utilizará Auth.js", () => {
  assert.equal(
    authReadiness({ NODE_ENV: "production" }).sessionConfigured,
    false,
  );
  assert.equal(
    authReadiness({
      NODE_ENV: "production",
      NEXTAUTH_SECRET: "",
      AUTH_SECRET: "configured",
    }).sessionConfigured,
    false,
  );
  assert.equal(
    authReadiness({ NODE_ENV: "production", AUTH_SECRET: "configured" })
      .sessionConfigured,
    true,
  );
  assert.equal(
    authReadiness({ NODE_ENV: "production", NEXTAUTH_SECRET: "configured" })
      .sessionConfigured,
    true,
  );
  assert.equal(
    authReadiness({ NODE_ENV: "development" }).sessionConfigured,
    true,
  );
});
