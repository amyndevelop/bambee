import { NextResponse } from "next/server";
import { validCronAuthorization } from "@/lib/cron-auth";
import { tick } from "@/modules/notifications/processor";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || process.env.CRON_SECRET.length < 32)
    return NextResponse.json(
      { error: "Programador no configurado" },
      { status: 503 },
    );
  if (
    !validCronAuthorization(
      request.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  )
    return NextResponse.json({ error: "Acceso restringido" }, { status: 401 });
  try {
    await tick();
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.error("Falló el procesamiento programado de recordatorios");
    return NextResponse.json(
      { error: "No se pudo completar el procesamiento" },
      { status: 500 },
    );
  }
}
