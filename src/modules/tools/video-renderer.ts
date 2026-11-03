import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
export const videoSizes = {
  vertical: [720, 1280],
  square: [720, 720],
  landscape: [1280, 720],
} as const;
function ffmpeg(
  args: string[],
  onProgress?: (seconds: number) => void,
  timeout = 120000,
) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.env.FFMPEG_PATH || "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-nostdin",
        "-threads",
        "1",
        ...args,
        "-progress",
        "pipe:1",
        "-nostats",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let finished = false;
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("El procesamiento superó el tiempo permitido"));
    }, timeout);
    child.stdout.on("data", (chunk) => {
      for (const line of String(chunk).split("\n")) {
        const match = /^out_time_us=(\d+)/.exec(line);
        if (match) onProgress?.(Number(match[1]) / 1000000);
      }
    });
    child.stderr.resume();
    child.on("error", () => {
      clearTimeout(timer);
      if (!finished) {
        finished = true;
        reject(new Error("FFmpeg no está disponible"));
      }
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (!finished) {
        finished = true;
        code === 0
          ? resolve()
          : reject(new Error("No se pudo codificar el video"));
      }
    });
  });
}
const escapeXml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export async function renderVideo(input: {
  images: Buffer[];
  labels: string[];
  seconds: number;
  format: keyof typeof videoSizes;
  transition: "fade" | "cut";
  brand: boolean;
  onProgress?: (progress: number) => Promise<void>;
}) {
  if (
    input.images.length < 2 ||
    input.images.length > 30 ||
    input.seconds < 0.5 ||
    input.seconds > 5 ||
    input.images.length * input.seconds > 120
  )
    throw new Error("Límites de video inválidos");
  const folder = await mkdtemp(join(tmpdir(), "bambee-video-"));
  try {
    const deadline = Date.now() + 5 * 60000;
    const [width, height] = videoSizes[input.format];
    const clips: string[] = [];
    for (const [index, bytes] of input.images.entries()) {
      if (Date.now() >= deadline)
        throw new Error("El video superó el límite de cinco minutos");
      if (bytes.length > 10000000)
        throw new Error("Fotografía demasiado grande");
      const label = escapeXml((input.labels[index] || "").slice(0, 120));
      const overlay = Buffer.from(
        `<svg width="${width}" height="${height}"><rect x="0" y="${height - 112}" width="${width}" height="112" fill="#FFF7F0" fill-opacity="0.94"/><text x="32" y="${height - 65}" font-family="sans-serif" font-size="24" fill="#66564F">${label}</text>${input.brand ? `<text x="32" y="${height - 25}" font-family="sans-serif" font-size="20" fill="#66564F">BAMBEE · Creciendo juntos</text>` : ""}</svg>`,
      );
      const still = await sharp(bytes, { limitInputPixels: 40000000 })
        .rotate()
        .resize(width, height, { fit: "contain", background: "#FFF7F0" })
        .composite(label || input.brand ? [{ input: overlay }] : [])
        .png()
        .toBuffer();
      const image = join(folder, `${index}.png`),
        clip = join(folder, `${index}.mp4`);
      await writeFile(image, still);
      clips.push(clip);
      const filters =
        input.transition === "fade"
          ? `fade=t=in:st=0:d=0.2:color=0xFFF7F0,fade=t=out:st=${Math.max(0, input.seconds - 0.2)}:d=0.2:color=0xFFF7F0`
          : "null";
      await ffmpeg(
        [
          "-y",
          "-loop",
          "1",
          "-framerate",
          "15",
          "-i",
          image,
          "-t",
          String(input.seconds),
          "-vf",
          filters,
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-pix_fmt",
          "yuv420p",
          "-r",
          "15",
          "-threads",
          "1",
          clip,
        ],
        undefined,
        Math.min(120000, Math.max(1, deadline - Date.now())),
      );
      await input.onProgress?.(
        Math.floor(((index + 1) / input.images.length) * 95),
      );
    }
    await writeFile(
      join(folder, "clips.txt"),
      clips.map((path) => `file '${path}'`).join("\n"),
    );
    const output = join(folder, "final.mp4");
    await ffmpeg(
      [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        join(folder, "clips.txt"),
        "-c",
        "copy",
        "-movflags",
        "+faststart",
        output,
      ],
      undefined,
      Math.min(120000, Math.max(1, deadline - Date.now())),
    );
    const result = await readFile(output);
    if (result.length > 100000000)
      throw new Error("El video supera el tamaño permitido");
    return result;
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}
