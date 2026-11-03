import "dotenv/config";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import type { PrismaClient } from "@prisma/client";
import { importNameCatalog } from "../src/modules/tools/name-catalog";
export async function seedTools(client: PrismaClient) {
  const catalog = JSON.parse(
    readFileSync(
      new URL("../content/tools/baby-names.es-AR.json", import.meta.url),
      "utf8",
    ),
  );
  const legacy = JSON.parse(
    readFileSync(
      new URL("../content/tools/baby-names.legacy.es-AR.json", import.meta.url),
      "utf8",
    ),
  );
  const imported = await importNameCatalog(client, catalog, {
    catalogId: "bambee-572",
    legacy,
  });
  console.log("Catálogo editorial importado:", imported);
  const categories = [
    {
      key: "mother",
      title: "Bolso de mamá",
      items: [
        "Documentación personal",
        "Documentación médica",
        "Ropa cómoda",
        "Artículos de higiene",
        "Elementos personales",
        "Cargador del teléfono",
      ],
    },
    {
      key: "baby",
      title: "Bolso del bebé",
      items: [
        "Ropa para recién nacido",
        "Mantas para traslado supervisado",
        "Pañales",
        "Artículos de higiene",
        "Ropa para el alta",
      ],
    },
    {
      key: "room",
      title: "Habitación del bebé",
      items: [
        "Consultar pautas de sueño seguro con el equipo de salud",
        "Organizar espacio para dormir",
        "Ropa de cama apropiada según indicaciones",
        "Organización de prendas",
        "Elementos de higiene",
      ],
    },
    {
      key: "shopping",
      title: "Compras",
      items: [
        "Ropa",
        "Artículos de alimentación según necesidades",
        "Transporte",
        "Higiene",
        "Otros productos",
      ],
    },
    {
      key: "paperwork",
      title: "Trámites",
      items: [
        "Documentación",
        "Cobertura médica",
        "Licencias",
        "Inscripción del nacimiento",
        "Otros trámites personalizados",
      ],
    },
  ];
  await client.toolTemplate.upsert({
    where: { slug: "preparations-default" },
    create: {
      slug: "preparations-default",
      kind: "PREPARATIONS",
      title: "Listas iniciales personalizables",
      published: true,
      config: categories,
    },
    update: {},
  });
  for (const [slug, title, type, defaultText] of [
    ["my-week", "Mi semana", "week", "Un poquito más cerca, creciendo juntos."],
    [
      "countdown",
      "Cuenta regresiva",
      "countdown",
      "Cada día falta menos para conocerte.",
    ],
    [
      "announcement",
      "Anuncio de embarazo",
      "announcement",
      "Una nueva aventura está comenzando.",
    ],
    [
      "arrival",
      "Próximo nacimiento",
      "arrival",
      "Un nuevo amor está por llegar.",
    ],
    [
      "photo",
      "Foto personalizada",
      "photo",
      "Nuestros recuerdos más queridos.",
    ],
  ])
    await client.toolTemplate.upsert({
      where: { slug },
      create: {
        slug,
        kind: "CARD",
        title,
        published: true,
        config: { type, defaultText },
      },
      update: {},
    });
  return {
    names: await client.babyName.count(),
    templates: await client.toolTemplate.count(),
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const { db } = await import("../src/lib/db");
  try {
    console.log("Catálogos de herramientas:", await seedTools(db));
  } finally {
    await db.$disconnect();
  }
}
