/** Only fixed-format diagnostic codes; never serialize database errors or their messages. */
export function databaseDiagnostic(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  const record = error as { code?: unknown; name?: unknown; meta?: unknown };
  const code =
    typeof record.code === "string" && /^P\d{4}$/.test(record.code)
      ? record.code
      : undefined;
  if (
    !code &&
    !(typeof record.name === "string" && record.name.startsWith("PrismaClient"))
  )
    return undefined;
  const meta =
    record.meta && typeof record.meta === "object"
      ? (record.meta as { code?: unknown })
      : undefined;
  const sqlState =
    typeof meta?.code === "string" && /^[0-9A-Z]{5}$/.test(meta.code)
      ? meta.code
      : undefined;
  return {
    code: code ?? "PRISMA_CLIENT_ERROR",
    ...(sqlState ? { sqlState } : {}),
  };
}
