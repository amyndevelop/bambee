import { NextResponse } from "next/server";
import { searchNameCatalog } from "@/modules/tools/name-catalog";
import { publicError } from "@/lib/errors";
export const dynamic = "force-dynamic";
/** Public catalogue only: never return favorites, votes, notes or account data. */
export async function GET(request: Request) {
  try {
    return NextResponse.json(
      {
        ...(await searchNameCatalog(new URL(request.url).searchParams)),
        choices: [],
        partnerVotes: [],
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json({ error: publicError(error) }, { status: 400 });
  }
}
