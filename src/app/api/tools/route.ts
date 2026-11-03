import { boundedJson } from "@/modules/tools/bounded-json";
import { NextResponse } from "next/server";
import { currentUser, sameOrigin } from "@/lib/server";
import { publicError } from "@/lib/errors";
import { throttle } from "@/lib/auth";
import { identifier } from "@/modules/tools/validation";
import { readTools, writeTools } from "@/modules/tools/service";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const user = await currentUser(),
      params = new URL(req.url).searchParams;
    const result = await readTools(
      user,
      identifier.parse(params.get("pregnancyId")),
      identifier.parse(params.get("module")),
      params,
    );
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: publicError(e) },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await currentUser();
    if (Number(req.headers.get("content-length") || 0) > 100000)
      throw new Error("Solicitud demasiado grande");
    await throttle("tools:" + user.id, 240);
    const result = await writeTools(user, await boundedJson(req, 100000));
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return NextResponse.json({ error: publicError(e) }, { status: 400 });
  }
}
