// Explicit WASM-based generator for restricted build environments.
// Uses the same version-pinned Prisma generator as the CLI; no Rust engine is needed.
const { getGenerators } = require("@prisma/internals");
(async () => {
  const generators = await getGenerators({
    schemaPath: "prisma/schema.prisma",
    registry:
      require("@prisma/client-generator-registry").defaultRegistry.toInternal(),
    skipDownload: true,
    cliCommand: "npm run db:generate",
  });
  try {
    for (const generator of generators) await generator.generate();
  } finally {
    for (const generator of generators) generator.stop();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
