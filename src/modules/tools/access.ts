import { db } from "../../lib/db";
import type { User } from "@prisma/client";
export async function toolContext(
  user: User,
  pregnancyId: string,
  module: string,
) {
  const pregnancy = await db.pregnancy.findUnique({
    where: { id: pregnancyId },
    include: { members: true, owner: { select: { timezone: true } } },
  });
  if (!pregnancy) throw new Error("FORBIDDEN");
  const owner = pregnancy.ownerId === user.id;
  const member = pregnancy.members.find((m) => m.userId === user.id);
  const allowed =
    owner ||
    (member &&
      (module === "preparations"
        ? member.tasks
        : module === "names"
          ? member.names
          : module === "questions"
            ? member.questions
            : module === "cards"
              ? member.cards
              : module === "overview"));
  if (!allowed) throw new Error("FORBIDDEN");
  return { pregnancy, owner, member };
}
