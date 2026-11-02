import { z } from "zod";
export const editorialStatuses = [
  "DRAFT",
  "PENDING_REVIEW",
  "APPROVED",
] as const;
export const reviewLabels: Record<string, string> = {
  DRAFT: "Borrador",
  PENDING_REVIEW: "Pendiente de revisión profesional",
  APPROVED: "Revisión registrada",
};
export const measurementLabels: Record<string, string> = {
  NOT_APPLICABLE: "Sin medida representativa",
  MICROSCOPIC: "Desarrollo microscópico",
  CRL: "CRL: cabeza a nalgas",
  TOTAL_LENGTH: "Longitud total: cabeza a talón",
};
export const publishedWeeklyWhere = {
  published: true,
  reviewStatus: "APPROVED",
  reviewedAt: { not: null },
  reviewedBy: { not: null },
} as const;
const length = z.number().positive().max(100).nullable();
export const weeklyDraftSchema = z.object({
  week: z.number().int().min(1).max(42),
  trimester: z.number().int().min(1).max(3),
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(1000),
  details: z.string().min(1).max(30000),
  fruit: z.string().min(1).max(100),
  measurement: z.string().min(1).max(200),
  lengthCm: length,
  lengthMinCm: length,
  lengthMaxCm: length,
  measurementMethod: z.enum([
    "NOT_APPLICABLE",
    "MICROSCOPIC",
    "CRL",
    "TOTAL_LENGTH",
  ]),
  developmentHighlights: z.array(z.string().min(1)).min(1),
  maternalChanges: z.string().nullable(),
  fruitImage: z.string().startsWith("/assets/pregnancy/fruits/").nullable(),
  fruitImageIsPlaceholder: z.boolean(),
  referenceUrls: z.array(z.url()),
  sourceNames: z.array(z.string()),
  reviewStatus: z.literal("PENDING_REVIEW"),
  published: z.literal(false),
  reviewedBy: z.null(),
  reviewedAt: z.null(),
  contentVersion: z.string().min(1),
});
export function validateWeeklyDrafts(input: unknown) {
  const drafts = z.array(weeklyDraftSchema).length(42).parse(input);
  const weeks = new Set(drafts.map((w) => w.week));
  if (weeks.size !== 42)
    throw new Error(
      "La biblioteca debe cubrir las semanas 1 a 42 sin duplicados",
    );
  for (const row of drafts) {
    if (
      row.lengthMinCm !== null &&
      row.lengthMaxCm !== null &&
      row.lengthMinCm > row.lengthMaxCm
    )
      throw new Error("Rango de medidas inválido");
    if (
      [1, 2, 3, 41, 42].includes(row.week) &&
      [row.lengthCm, row.lengthMinCm, row.lengthMaxCm].some((n) => n !== null)
    )
      throw new Error(
        "Esta etapa no tiene una longitud representativa validada",
      );
  }
  return drafts;
}
