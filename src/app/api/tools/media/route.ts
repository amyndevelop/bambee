import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server";
import { db } from "@/lib/db";
import { toolContext } from "@/modules/tools/access";
export async function GET(req: Request) {
  try {
    const u = await currentUser(),
      params = new URL(req.url).searchParams;
    const job = await db.bellyTimelapse.findFirstOrThrow({
      where: {
        id: params.get("id") || "",
        userId: u.id,
        status: "READY",
        expiresAt: { gt: new Date() },
      },
    });
    await toolContext(u, job.pregnancyId, "timelapse");
    if (!job.outputFileId) throw new Error("No disponible");
    return NextResponse.redirect(
      new URL(
        `/api/files?id=${encodeURIComponent(job.outputFileId)}${params.has("download") ? "&download=1" : ""}`,
        req.url,
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Video privado no disponible" },
      { status: 403 },
    );
  }
}
