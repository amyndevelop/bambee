// Local development only. Production must use managed PostgreSQL with TLS and backups.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
const dockerEnv = { ...process.env };
for (const key of [
  "DOCKER_HOST",
  "DOCKER_CONTEXT",
  "DOCKER_TLS",
  "DOCKER_TLS_VERIFY",
  "DOCKER_CERT_PATH",
])
  delete dockerEnv[key];
function docker(args) {
  const result = spawnSync(
    "docker",
    ["--host=unix:///var/run/docker.sock", ...args],
    { stdio: "inherit", env: dockerEnv },
  );
  if (result.status !== 0) process.exit(result.status || 1);
}
const file = ".env";
if (!existsSync(file))
  writeFileSync(
    file,
    `DATABASE_URL=postgresql://bambee@127.0.0.1:5432/bambee\nNEXTAUTH_URL=http://localhost:3000\nAPP_URL=http://localhost:3000\nNEXTAUTH_SECRET=${randomBytes(32).toString("hex")}\n`,
    { mode: 0o600 },
  );
const existing = readFileSync(file, "utf8");
if (
  !existing.includes("DATABASE_URL=postgresql://bambee@127.0.0.1:5432/bambee")
) {
  console.log(
    "Se conserva la configuración existente. Iniciá su PostgreSQL externo antes de migrar.",
  );
  process.exit(0);
}
const inspect = spawnSync(
  "docker",
  [
    "--host=unix:///var/run/docker.sock",
    "container",
    "inspect",
    "bambee-postgres",
  ],
  { stdio: "ignore", env: dockerEnv },
);
if (inspect.status === 0) docker(["start", "bambee-postgres"]);
else
  docker([
    "run",
    "-d",
    "--name",
    "bambee-postgres",
    "-p",
    "127.0.0.1:5432:5432",
    "-e",
    "POSTGRES_USER=bambee",
    "-e",
    "POSTGRES_DB=bambee",
    "-e",
    "POSTGRES_HOST_AUTH_METHOD=trust",
    "-v",
    "bambee-pg:/var/lib/postgresql/data",
    "postgres:17-alpine",
  ]);
let ready = false;
for (let i = 0; i < 30; i++) {
  const r = spawnSync(
    "docker",
    [
      "--host=unix:///var/run/docker.sock",
      "exec",
      "bambee-postgres",
      "pg_isready",
      "-U",
      "bambee",
    ],
    { stdio: "ignore", env: dockerEnv },
  );
  if (r.status === 0) {
    ready = true;
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
if (!ready) throw new Error("PostgreSQL no quedó disponible en 30 segundos");
console.log(
  "PostgreSQL de desarrollo listo; acceso trust solo en loopback. Nunca usar esta configuración en producción.",
);
