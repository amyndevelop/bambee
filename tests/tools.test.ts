import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import {
  contractionEventSchema,
  timelapseSchema,
  normalizeName,
  nameSchema,
} from "../src/modules/tools/validation";
import {
  contractionStats,
  durationSeconds,
  contractionCsv,
} from "../src/modules/tools/contraction-math";
import { renderVideo } from "../src/modules/tools/video-renderer";
import { renderCard } from "../src/modules/tools/card-renderer";
test("catálogo con más de 300 nombres reales únicos y sin significados inventados", () => {
  const names = JSON.parse(
    readFileSync("content/tools/baby-names.es-AR.json", "utf8"),
  );
  assert.ok(names.length >= 300);
  assert.equal(
    new Set(names.map((n: { name: string }) => normalizeName(n.name))).size,
    names.length,
  );
  for (const n of names) {
    nameSchema.parse(n);
    assert.equal(n.meaning, null);
  }
  assert.equal(normalizeName("Benjamín"), "benjamin");
});
test("cronómetro usa timestamps, intervalos entre inicios y rechaza duración negativa", () => {
  const records = [
    { startedAt: "2026-11-03T10:00:00Z", endedAt: "2026-11-03T10:00:45Z" },
    { startedAt: "2026-11-03T10:05:00Z", endedAt: "2026-11-03T10:06:00Z" },
  ];
  assert.equal(durationSeconds(records[0]), 45);
  assert.deepEqual(
    contractionStats(records, 60, Date.parse("2026-11-03T10:10:00Z")),
    { count: 2, meanDuration: 52.5, meanInterval: 300 },
  );
  assert.equal(contractionStats([], 60).meanInterval, null);
  assert.throws(() =>
    contractionEventSchema.parse({
      id: crypto.randomUUID(),
      sessionId: crypto.randomUUID(),
      startedAt: records[0].endedAt,
      endedAt: records[0].startedAt,
    }),
  );
  assert.match(
    contractionCsv([{ ...records[0], note: '=IMPORTXML("private")' }]),
    /"'=IMPORTXML/,
  );
});
test("timelapse limita fotos, tiempo y duplicados", () => {
  const a = { entryId: "a", fileId: "one" },
    b = { entryId: "b", fileId: "two" },
    base = {
      photos: [a, b],
      seconds: 2,
      format: "vertical",
      transition: "fade",
    };
  timelapseSchema.parse(base);
  assert.throws(() => timelapseSchema.parse({ ...base, photos: [a, a] }));
  assert.throws(() => timelapseSchema.parse({ ...base, seconds: 100 }));
});
test("las tarjetas se generan como PNG real de las tres dimensiones", async () => {
  for (const [format, dimensions] of [
    ["story", [1080, 1920]],
    ["square", [1080, 1080]],
    ["portrait", [1080, 1350]],
  ] as const) {
    const png = await renderCard({
      text: "Un amor enorme. <script> no se interpreta como HTML.",
      background: "cream",
      format,
      heading: "Semana 6",
      subtitle: "5 semanas y 0 días",
    });
    const meta = await sharp(png).metadata();
    assert.equal(meta.format, "png");
    assert.equal(meta.width, dimensions[0]);
    assert.equal(meta.height, dimensions[1]);
  }
});
test("timelapse exporta un MP4 válido con corte y fundido, con progreso de etapas reales", async () => {
  const images = await Promise.all(
    ["#f59b8f", "#a8dccb"].map((background) =>
      sharp({ create: { width: 64, height: 64, channels: 3, background } })
        .png()
        .toBuffer(),
    ),
  );
  const folder = mkdtempSync(join(tmpdir(), "bambee-video-test-"));
  try {
    for (const transition of ["cut", "fade"] as const) {
      const progress: number[] = [];
      const video = await renderVideo({
        images,
        labels: ["Semana 5", "Semana 6"],
        seconds: 0.5,
        format: "square",
        transition,
        brand: true,
        onProgress: async (v) => {
          progress.push(v);
        },
      });
      const path = join(folder, transition + ".mp4");
      writeFileSync(path, video);
      const result = spawnSync(
        "ffprobe",
        [
          "-v",
          "error",
          "-show_entries",
          "stream=codec_name,width,height",
          "-show_entries",
          "format=duration",
          "-of",
          "json",
          path,
        ],
        { encoding: "utf8" },
      );
      assert.equal(result.status, 0);
      const metadata = JSON.parse(result.stdout);
      assert.equal(metadata.streams[0].codec_name, "h264");
      assert.equal(metadata.streams[0].width, 720);
      assert.ok(Number(metadata.format.duration) >= 0.9);
      assert.deepEqual(progress, [47, 95]);
    }
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
