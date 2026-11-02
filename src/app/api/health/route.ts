import { hasMedicalReview, isWeeklyContentVisible } from "@/lib/weekly-content";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authReadiness } from "@/lib/auth-readiness";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Public deployment verification; does not read or return user/pregnancy records. */
export async function GET() {
  const authentication = authReadiness();
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
        editorialPublished: true,
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
    const published = rows.filter(isWeeklyContentVisible).length;
    const medicallyReviewed = rows.filter(
      (row) => row.published && hasMedicalReview(row),
    ).length;
    return NextResponse.json(
      {
        status:
          complete && published === 42 && authentication.sessionConfigured
            ? "ok"
            : "pending",
        scope: "branding-and-weekly-library",
        release,
        authentication,
        weeklyContent: {
          total: rows.length,
          complete,
          published,
          publicationComplete: published === 42,
          medicallyReviewed,
          pendingReview: rows.filter((r) => r.reviewStatus !== "APPROVED")
            .length,
        },
      },
      {
        status:
          complete && published === 42 && authentication.sessionConfigured
            ? 200
            : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return NextResponse.json(
      {
        status: "unavailable",
        scope: "branding-and-weekly-library",
        release,
        authentication,
        error: "No se pudo verificar la biblioteca semanal.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
