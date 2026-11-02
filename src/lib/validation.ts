import { z } from "zod";
// bcrypt hashes a maximum of 72 bytes. Reject longer inputs instead of truncating.
export const passwordSchema = z
  .string()
  .min(12)
  .max(128)
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "La contraseña no debe superar 72 bytes",
  );
