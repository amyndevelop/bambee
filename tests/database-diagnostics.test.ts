import { test } from "node:test";
import assert from "node:assert/strict";
import { databaseDiagnostic } from "../src/lib/database-diagnostics";
test("identifica tabla ausente en consulta Prisma sin volcar SQL ni datos", () => {
  assert.deepEqual(
    databaseDiagnostic({
      code: "P2010",
      message: "private query",
      meta: {
        code: "42P01",
        message: "private database message",
        query: "private sql",
      },
    }),
    { code: "P2010", sqlState: "42P01" },
  );
});
test("identifica conexión y errores generales de Prisma sin exponer credenciales", () => {
  assert.deepEqual(
    databaseDiagnostic({
      code: "P1001",
      message: "postgresql://private:password@host/db",
    }),
    { code: "P1001" },
  );
  assert.deepEqual(
    databaseDiagnostic({
      name: "PrismaClientInitializationError",
      message: "private",
    }),
    { code: "PRISMA_CLIENT_ERROR" },
  );
});
test("ignora códigos arbitrarios y errores que no son de base", () => {
  assert.equal(databaseDiagnostic(new Error("private")), undefined);
  assert.equal(
    databaseDiagnostic({ code: "password", meta: { code: "private" } }),
    undefined,
  );
  assert.deepEqual(
    databaseDiagnostic({
      code: "P2010",
      meta: { code: "postgresql://secret" },
    }),
    { code: "P2010" },
  );
});
