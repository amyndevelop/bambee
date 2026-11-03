import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { cardBackgrounds, cardFormats } from "./validation";
import sharp from "sharp";
export type CardRenderData = {
  text: string;
  background: keyof typeof cardBackgrounds;
  format: keyof typeof cardFormats;
  heading: string;
  subtitle: string;
  illustration?: Buffer;
  photo?: Buffer;
  photoConsent?: boolean;
};
export async function renderCard(data: CardRenderData) {
  const [width, height] = cardFormats[data.format];
  const fonts = await Promise.all([
    readFile(process.cwd() + "/public/brand/inter-regular.ttf"),
    readFile(process.cwd() + "/public/brand/inter-bold.ttf"),
  ]);
  const logo = await readFile(process.cwd() + "/public/brand/wordmark.svg");
  const source = async (buffer: Buffer) =>
    "data:image/png;base64," +
    (
      await sharp(buffer, { limitInputPixels: 40000000 })
        .rotate()
        .png()
        .toBuffer()
    ).toString("base64");
  const photo = data.photo ? await source(data.photo) : null,
    illustration = data.illustration ? await source(data.illustration) : null;
  const response = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 60,
        background: cardBackgrounds[data.background],
        color: "#66564F",
        fontFamily: "Inter",
        textAlign: "center",
      }}
    >
      <img
        alt="BAMBEE"
        src={"data:image/svg+xml;base64," + logo.toString("base64")}
        width={280}
        height={70}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          width: "100%",
        }}
      >
        {data.heading && (
          <div
            style={{
              fontSize: data.format === "square" ? 48 : 64,
              fontWeight: 700,
            }}
          >
            {data.heading}
          </div>
        )}
        {photo ? (
          <img
            alt="Fotografía autorizada"
            src={photo}
            width={780}
            height={height > 1350 ? 820 : height > 1080 ? 460 : 280}
            style={{ objectFit: "contain", borderRadius: 40 }}
          />
        ) : illustration ? (
          <img
            alt="Ilustración"
            src={illustration}
            width={height > 1350 ? 420 : 220}
            height={height > 1350 ? 420 : 220}
            style={{ objectFit: "contain" }}
          />
        ) : null}
        {data.subtitle && (
          <div style={{ fontSize: data.format === "square" ? 24 : 30 }}>
            {data.subtitle}
          </div>
        )}
        <div
          style={{
            fontSize: data.format === "square" ? 30 : 38,
            lineHeight: 1.35,
            whiteSpace: "pre-wrap",
          }}
        >
          {data.text}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          fontSize: 24,
        }}
      >
        <span>Creciendo juntos, desde el comienzo.</span>
        {data.heading.includes("Semana") && (
          <span>Comparación orientativa, sin valor diagnóstico.</span>
        )}
      </div>
    </div>,
    {
      width,
      height,
      fonts: [
        { name: "Inter", data: fonts[0], weight: 400 },
        { name: "Inter", data: fonts[1], weight: 700 },
      ],
    },
  );
  return Buffer.from(await response.arrayBuffer());
}
