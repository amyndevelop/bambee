import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Public deployment verification; does not read or return user/pregnancy records. */
export async function GET() {
  const release = {
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    font: "Inter",
    brand: "original-pdf-2026-11-02",
  };
  try {
    const rows = await db.weeklyDevelopment.findMany({
      select: {
        week: true,
        reviewStatus: true,
        published: true,
        reviewedAt: true,
        reviewedBy: true,
        contentVersion: true,
      },
    });
    const complete =
      rows.length === 42 &&
      Array.from({ length: 42 }, (_, i) => i + 1).every((week) =>
        rows.some((row) => row.week === week),
      );
    const published = rows.filter(
      (r) =>
        r.published &&
        r.reviewStatus === "APPROVED" &&
        r.reviewedAt &&
        r.reviewedBy,
    ).length;
    return NextResponse.json(
      {
        status: complete ? "ok" : "pending",
        scope: "branding-and-weekly-library",
        release,
        weeklyContent: {
          total: rows.length,
          complete,
          published,
          pendingReview: rows.filter((r) => r.reviewStatus !== "APPROVED")
            .length,
        },
      },
      {
        status: complete ? 200 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return NextResponse.json(
      {
        status: "unavailable",
        scope: "branding-and-weekly-library",
        release,
        error: "No se pudo verificar la biblioteca semanal.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
