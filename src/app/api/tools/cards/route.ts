import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/server";
import { toolContext } from "@/modules/tools/access";
import { renderCard } from "@/modules/tools/card-renderer";
import { privateImage } from "@/modules/tools/video-storage";
import { cardSchema } from "@/modules/tools/validation";
import { gestation, todayInZone, formatGestationalAge } from "@/lib/gestation";
import { readFile } from "node:fs/promises";
import { throttle } from "@/lib/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const user = await currentUser();
    await throttle("card-render:" + user.id, 40);
    const params = new URL(req.url).searchParams;
    const card = await db.shareCard.findUniqueOrThrow({
      where: { id: params.get("id") || "" },
    });
    await toolContext(user, card.pregnancyId, "cards");
    if (card.userId !== user.id && !card.shared) throw new Error("FORBIDDEN");
    // A family permission never authorizes reading someone else's private source photograph.
    if (card.userId !== user.id && card.fileId)
      throw new Error("La tarjeta con foto solo puede exportarla su creador");
    const p = await db.pregnancy.findUniqueOrThrow({
      where: { id: card.pregnancyId },
      include: { owner: true },
    });
    const template = await db.toolTemplate.findUniqueOrThrow({
      where: { id: card.templateId },
    });
    const config = template.config as { type: string };
    const age = gestation(
      p.dueDate.toISOString().slice(0, 10),
      todayInZone(p.owner.timezone),
    );
    const week = await db.weeklyDevelopment.findUnique({
      where: { week: Math.min(42, age.currentWeek) },
    });
    const v = cardSchema.parse(card);
    let photo: Buffer | undefined;
    if (card.fileId) {
      const file = await db.uploadedFile.findFirstOrThrow({
        where: { id: card.fileId, ownerId: user.id },
        include: { entry: true, attachment: { include: { entry: true } } },
      });
      const entry = file.entry || file.attachment?.entry;
      if (entry && entry.pregnancyId !== p.id) throw new Error("FORBIDDEN");
      if (
        (file.medical || entry?.kind === "ultrasound") &&
        !card.medicalConsent
      )
        throw new Error("Confirmación de archivo médico requerida");
      photo = await privateImage(card.fileId, user.id);
    }
    let heading = "",
      subtitle = "";
    if (card.showGestation) {
      if (config.type === "week") {
        heading = `Semana ${age.currentWeek}`;
        subtitle =
          formatGestationalAge(age.completedWeeks, age.days) +
          (week ? ` · Tamaño orientativo: ${week.fruit}` : "");
      }
      if (config.type === "countdown")
        heading = `Faltan aproximadamente ${age.remaining} días`;
      if (config.type === "arrival")
        heading = `Llegada estimada en ${new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(p.dueDate)}`;
    }
    const illustration =
      card.illustration === "fruit" &&
      week?.fruitImage &&
      /^\/assets\/pregnancy\/fruits\/[a-z-]+\.png$/.test(week.fruitImage)
        ? await readFile(process.cwd() + "/public" + week.fruitImage)
        : await readFile(process.cwd() + "/public/brand/icon-512.png");
    const png = await renderCard({
      ...v,
      heading,
      subtitle,
      photo,
      illustration,
    });
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, no-store",
        "Content-Disposition": `${params.has("download") ? "attachment" : "inline"}; filename="bambee-tarjeta.png"`,
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "No se pudo generar la tarjeta. Revisá los permisos y las imágenes seleccionadas.",
      },
      { status: 400 },
    );
  }
}
