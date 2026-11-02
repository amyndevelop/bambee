import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { db } from "./db";
import { canAccess } from "./gestation";
export async function currentUser() {
  const s = await getServerSession(authOptions);
  if (!s?.user) throw new Error("UNAUTHORIZED");
  return db.user.findUniqueOrThrow({
    where: { id: (s.user as unknown as { id: string }).id },
  });
}
export async function pregnancyAccess(
  id: string,
  userId: string,
  kind = "private",
) {
  const p = await db.pregnancy.findUniqueOrThrow({
    where: { id },
    include: { members: true },
  });
  if (
    !canAccess(
      p.ownerId,
      userId,
      kind,
      p.members.find((m) => m.userId === userId),
    )
  )
    throw new Error("FORBIDDEN");
  return p;
}
export { assertSameOrigin as sameOrigin } from "./origin";
