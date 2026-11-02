import { ZodError } from "zod";
export function publicError(error: unknown) {
  if (error instanceof Error && error.message === "ORIGIN_NOT_ALLOWED")
    return "La dirección de esta página no está habilitada. Abrí la dirección oficial de BAMBEE.";
  if (error instanceof ZodError) return "Revisá los campos ingresados.";
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    String(error.code).startsWith("P")
  )
    return "No se pudo completar la operación. Revisá los datos e intentá nuevamente.";
  if (error instanceof Error && error.name.startsWith("Prisma"))
    return "No se pudo acceder a los datos. Intentá nuevamente.";
  if (
    error instanceof Error &&
    ["UNAUTHORIZED", "FORBIDDEN"].includes(error.message)
  )
    return "No tenés acceso a esta información.";
  return error instanceof Error
    ? error.message
    : "No se pudo completar la operación.";
}
