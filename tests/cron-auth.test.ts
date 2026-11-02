import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { validCronAuthorization } from "../src/lib/cron-auth";
test("el programador rechaza configuración o autorización ausente", () => {
  assert.equal(validCronAuthorization(null, undefined), false);
  assert.equal(validCronAuthorization("Bearer short", "short"), false);
  assert.equal(
    validCronAuthorization(null, randomBytes(32).toString("hex")),
    false,
  );
});
test("el programador valida el token completo y rechaza variantes", () => {
  const secret = randomBytes(32).toString("hex");
  assert.equal(validCronAuthorization("Bearer " + secret, secret), true);
  assert.equal(validCronAuthorization("Bearer " + secret + "x", secret), false);
  assert.equal(
    validCronAuthorization("Bearer " + secret.slice(1), secret),
    false,
  );
  assert.equal(validCronAuthorization("Basic " + secret, secret), false);
});
