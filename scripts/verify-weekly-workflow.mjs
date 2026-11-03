import "dotenv/config";
import pg from "pg";
import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
const original = new URL(process.env.DATABASE_URL || "");
if (!["localhost", "127.0.0.1"].includes(original.hostname))
  throw new Error(
    "Esta verificación solo utiliza PostgreSQL local. No admite una base remota.",
  );
const name = "bambee_weekly_verify_" + randomBytes(6).toString("hex");
const port = Number(process.env.BAMBEE_TEST_PORT || 3107);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Puerto de prueba inválido");
const base = "http://localhost:" + port,
  target = new URL(original);
target.pathname = "/" + name;
const environment = {
  ...process.env,
  DATABASE_URL: target.toString(),
  NEXTAUTH_URL: base,
  APP_URL: base,
  TEST_BASE_URL: base,
};
function run(args) {
  const result = spawnSync(process.execPath, args, {
    env: environment,
    stdio: "inherit",
    timeout: 240000,
  });
  if (result.status !== 0)
    throw new Error("Falló una fase de verificación: " + args[0]);
}
const admin = new pg.Client({ connectionString: original.toString() });
await admin.connect();
let created = false,
  server;
try {
  await admin.query('CREATE DATABASE "' + name + '"');
  created = true;
  run(["scripts/migrate.mjs", "--baseline"]);
  run(["--import", "tsx", "--test", "tests/editorial-seed.integration.ts"]);
  const temporary = new pg.Client({ connectionString: target.toString() });
  await temporary.connect();
  try {
    await temporary.query('DELETE FROM "WeeklyDevelopment"');
  } finally {
    await temporary.end();
  }
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    { env: environment, stdio: ["ignore", "ignore", "inherit"] },
  );
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null)
      throw new Error("El servidor de prueba no pudo iniciar");
    try {
      const response = await fetch(base + "/api/auth/csrf");
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(500);
  }
  if (!ready) throw new Error("El servidor temporal no quedó listo");
  run(["--import", "tsx", "--test", "tests/integration.test.ts"]);
  run(["--import", "tsx", "--test", "tests/tools.integration.ts"]);
  run(["--import", "tsx", "scripts/seed-weekly-development.ts"]);
  run(["--import", "tsx", "scripts/seed-tools.ts"]);
  run([
    "node_modules/@playwright/test/cli.js",
    "test",
    ...process.argv.slice(2),
  ]);
  console.log(
    "Verificación completa: seed, API y navegador, sobre una base temporal aislada.",
  );
} finally {
  if (server && server.exitCode === null) {
    const exited = new Promise((resolve) => server.once("exit", resolve));
    server.kill("SIGTERM");
    await Promise.race([exited, delay(5000)]);
    if (server.exitCode === null) {
      server.kill("SIGKILL");
      await exited;
    }
  }
  if (created) await admin.query('DROP DATABASE "' + name + '"');
  await admin.end();
}
