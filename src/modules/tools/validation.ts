import { z } from "zod";
import { dayNumber } from "../../lib/gestation";
export const identifier = z.string().min(1).max(100);
export const text = z.string().trim().min(1).max(300);
export const notes = z.string().max(5000).default("");
export const date = z.string().refine((v) => {
  try {
    dayNumber(v);
    return true;
  } catch {
    return false;
  }
}, "Fecha inválida");
export const instant = z.iso.datetime({ offset: true });
export const publicUrl = z
  .url()
  .refine(
    (value) => ["https:", "http:"].includes(new URL(value).protocol),
    "La fuente debe usar HTTP o HTTPS",
  );
export const normalizeName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
export const questionCategories = [
  "Desarrollo del bebé",
  "Síntomas",
  "Alimentación",
  "Medicamentos",
  "Estudios",
  "Parto",
  "Posparto",
  "Otros",
] as const;
export const taskSchema = z.object({
  id: identifier.optional(),
  title: text,
  notes,
  categoryId: identifier.nullable().default(null),
  dueDate: date.nullable().default(null),
  assigneeId: identifier.nullable().default(null),
  completed: z.boolean().default(false),
  reminderAt: instant.nullable().default(null),
});
export const questionSchema = z.object({
  id: identifier.optional(),
  question: text,
  category: z.enum(questionCategories),
  answer: notes,
  answered: z.boolean().default(false),
  appointmentId: identifier.nullable().default(null),
  shared: z.boolean().default(false),
  reminder: z.boolean().default(false),
});
export const cardFormats = {
  story: [1080, 1920],
  square: [1080, 1080],
  portrait: [1080, 1350],
} as const;
export const cardBackgrounds = {
  cream: "#FFF7F0",
  coral: "#F59B8F",
  mint: "#A8DCCB",
  butter: "#F7D98A",
} as const;
export const cardSchema = z.object({
  id: identifier.optional(),
  templateId: identifier,
  text: z.string().trim().min(1).max(240),
  background: z.enum(["cream", "coral", "mint", "butter"]),
  format: z.enum(["story", "square", "portrait"]),
  showGestation: z.boolean().default(false),
  shared: z.boolean().default(false),
  fileId: identifier.nullable().default(null),
  medicalConsent: z.boolean().default(false),
  illustration: z.enum(["brand", "fruit"]).default("brand"),
});
export const timelapseSchema = z
  .object({
    photos: z
      .array(z.object({ entryId: identifier, fileId: identifier }))
      .min(2)
      .max(30)
      .refine(
        (v) => new Set(v.map((x) => x.fileId)).size === v.length,
        "No repitas fotos",
      ),
    seconds: z.number().min(0.5).max(5),
    format: z.enum(["vertical", "square", "landscape"]),
    transition: z.enum(["fade", "cut"]),
    showWeek: z.boolean().default(false),
    showDate: z.boolean().default(false),
    showName: z.boolean().default(false),
    showBrand: z.boolean().default(true),
  })
  .refine((v) => v.seconds * v.photos.length <= 120, "Máximo 120 segundos");
export const contractionEventSchema = z
  .object({
    id: z.uuid(),
    sessionId: z.uuid(),
    startedAt: instant,
    endedAt: instant.nullable(),
    note: z.string().max(2000).default(""),
  })
  .refine(
    (v) => !v.endedAt || Date.parse(v.endedAt) >= Date.parse(v.startedAt),
    "La duración no puede ser negativa",
  )
  .refine(
    (v) =>
      !v.endedAt || Date.parse(v.endedAt) - Date.parse(v.startedAt) <= 86400000,
    "La duración máxima es 24 horas",
  );
export const nameSchema = z
  .object({
    id: identifier.optional(),
    name: z.string().trim().min(1).max(60),
    gender: z.enum(["F", "M", "U"]),
    origin: z.string().max(100).nullable().default(null),
    meaning: z.string().max(1000).nullable().default(null),
    variants: z.array(z.string().max(60)).max(20).default([]),
    pronunciation: z.string().max(100).nullable().default(null),
    source: z.string().min(1).max(500),
    sourceUrl: publicUrl.nullable().default(null),
    verification: z
      .enum(["PENDING", "VERIFIED", "DISPUTED"])
      .default("PENDING"),
  })
  .refine(
    (v) => v.verification !== "VERIFIED" || !!v.sourceUrl,
    "Una verificación requiere una fuente específica",
  );
