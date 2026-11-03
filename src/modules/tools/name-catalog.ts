import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { nameSchema, normalizeName, nameIdentity } from "./validation";
import { z } from "zod";
export const publicNameFields = {
  id: true,
  name: true,
  gender: true,
  origin: true,
  meaning: true,
  variants: true,
  pronunciation: true,
  source: true,
  sourceUrl: true,
  verification: true,
  reviewStatus: true,
  locale: true,
  published: true,
} as const;
export function parseCatalogName(input: unknown) {
  const r = z.record(z.string(), z.unknown()).parse(input);
  const genders: Record<string, string> = {
    femenino: "F",
    masculino: "M",
    unisex: "U",
  };
  return nameSchema.parse({
    ...r,
    gender: genders[String(r.gender)] || r.gender,
    source: r.source ?? r.sourceNote ?? "Catálogo editorial de BAMBEE",
  });
}
function fingerprint(row: Record<string, unknown>) {
  const fields = [
    "name",
    "gender",
    "origin",
    "meaning",
    "variants",
    "pronunciation",
    "source",
    "sourceUrl",
    "verification",
    "published",
    "reviewStatus",
    "locale",
  ];
  return createHash("sha256")
    .update(
      JSON.stringify(
        Object.fromEntries(fields.map((field) => [field, row[field] ?? null])),
      ),
    )
    .digest("hex");
}
export async function importNameCatalog(
  client: PrismaClient,
  input: unknown,
  {
    catalogId = "admin-import",
    legacy = [],
  }: { catalogId?: string; legacy?: Record<string, unknown>[] } = {},
) {
  const rows = z
    .array(z.unknown())
    .min(1)
    .max(2000)
    .parse(input)
    .map(parseCatalogName);
  const keys = rows.map((row) => nameIdentity(row.name));
  if (new Set(keys).size !== rows.length)
    throw new Error("El catálogo contiene nombres exactamente duplicados");
  const existing = await client.babyName.findMany({
    where: {
      OR: [
        { nameKey: { in: keys } },
        { catalogKey: { in: keys.map((key) => catalogId + ":" + key) } },
      ],
    },
  });
  const byKey = new Map(existing.map((row) => [row.nameKey, row])),
    byCatalog = new Map(
      existing
        .filter((row) => row.catalogKey)
        .map((row) => [row.catalogKey!, row]),
    );
  const legacyByKey = new Map(
    legacy.map((row) => [nameIdentity(String(row.name)), row]),
  );
  let created = 0,
    updated = 0,
    preserved = 0;
  for (let start = 0; start < rows.length; start += 10)
    await Promise.all(
      rows.slice(start, start + 10).map(async (row) => {
        const { id, ...values } = row;
        void id;
        const nameKey = nameIdentity(row.name),
          catalogKey = catalogId + ":" + nameKey,
          old = byCatalog.get(catalogKey) || byKey.get(nameKey),
          hash = fingerprint(values),
          baseline = legacyByKey.get(nameKey);
        const untouchedLegacy =
          baseline &&
          [
            "name",
            "gender",
            "origin",
            "meaning",
            "source",
            "verification",
            "variants",
          ].every(
            (field) =>
              JSON.stringify(
                (old as unknown as Record<string, unknown>)?.[field],
              ) === JSON.stringify(baseline[field]),
          ) &&
          !old?.sourceUrl &&
          !old?.pronunciation;
        const mayUpdate =
          old &&
          !old.adminEdited &&
          (untouchedLegacy ||
            fingerprint(old as unknown as Record<string, unknown>) === hash ||
            (old.catalogKey === catalogKey &&
              old.catalogHash ===
                fingerprint(old as unknown as Record<string, unknown>)));
        if (old && old.catalogKey && old.catalogHash === hash) {
          preserved++;
          return;
        }
        const data = {
          ...values,
          nameKey,
          normalized: normalizeName(row.name),
          nameLength: [...row.name].length,
        };
        await client.babyName.upsert({
          where: old ? { id: old.id } : { nameKey },
          create: { ...data, catalogKey, catalogHash: hash },
          update: old
            ? mayUpdate
              ? {
                  ...data,
                  catalogKey: old.catalogKey || catalogKey,
                  catalogHash: hash,
                }
              : { ...(old.catalogKey ? {} : { catalogKey, catalogHash: hash }) }
            : {},
        });
        if (!old) created++;
        else if (mayUpdate) updated++;
        else preserved++;
      }),
    );
  const catalog = await client.babyName.findMany({
    where: { catalogKey: { in: keys.map((key) => catalogId + ":" + key) } },
    select: {
      id: true,
      published: true,
      name: true,
      origin: true,
      meaning: true,
    },
  });
  return {
    input: rows.length,
    created,
    updated,
    preserved,
    catalogRecords: catalog.length,
    published: catalog.filter((row) => row.published).length,
    complete: catalog.filter(
      (row) => !!row.name && !!row.origin && !!row.meaning,
    ).length,
    total: await client.babyName.count(),
  };
}
export async function searchNameCatalog(
  params: URLSearchParams,
  additional: Prisma.BabyNameWhereInput = {},
) {
  const page = z.coerce
      .number()
      .int()
      .min(1)
      .max(100000)
      .parse(params.get("page") || 1),
    pageSize = z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .parse(params.get("pageSize") || 40);
  const min = z.coerce
      .number()
      .int()
      .min(0)
      .max(60)
      .parse(params.get("min") || 0),
    max = z.coerce
      .number()
      .int()
      .min(1)
      .max(60)
      .parse(params.get("max") || 60),
    gender = z
      .enum(["F", "M", "U"])
      .optional()
      .parse(params.get("gender") || undefined);
  const where: Prisma.BabyNameWhereInput = {
    published: true,
    normalized: {
      contains: normalizeName(params.get("q") || ""),
      startsWith: normalizeName(params.get("first") || ""),
    },
    nameLength: { gte: min, lte: max },
    ...(gender ? { gender } : {}),
    ...(params.get("origin") ? { origin: params.get("origin")! } : {}),
    ...additional,
  };
  const { db } = await import("../../lib/db");
  const [names, total, origins] = await Promise.all([
    db.babyName.findMany({
      where,
      orderBy: [{ normalized: "asc" }, { nameKey: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: publicNameFields,
    }),
    db.babyName.count({ where }),
    db.babyName.findMany({
      where: { published: true, origin: { not: null } },
      distinct: ["origin"],
      orderBy: { origin: "asc" },
      select: { origin: true },
    }),
  ]);
  return {
    names,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    origins: origins.map((row) => row.origin),
  };
}
