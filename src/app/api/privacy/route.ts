import { db } from "@/lib/db";
import { publicError } from "@/lib/errors";
import { currentUser, sameOrigin } from "@/lib/server";
import { storage } from "@/lib/storage";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
export async function GET() {
  try {
    const u = await currentUser();
    const { passwordHash, ...user } = u;
    void passwordHash;
    const pregnancies = await db.pregnancy.findMany({
      where: { ownerId: u.id },
      include: {
        datingHistory: true,
        entries: { include: { attachments: true } },
        appointments: { include: { reminders: true } },
      },
    });
    const files = await db.uploadedFile.findMany({
      where: { ownerId: u.id },
      select: { id: true, name: true, mime: true, size: true },
    });
    const consents = await db.consentRecord.findMany({
      where: { userId: u.id },
    });
    const notifications = await db.notification.findMany({
      where: { userId: u.id },
    });
    return NextResponse.json(
      { user, pregnancies, files, consents, notifications },
      {
        headers: {
          "Content-Disposition": 'attachment; filename="bambee-export.json"',
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch {
    return NextResponse.json({ error: "Sesión requerida" }, { status: 401 });
  }
}
export async function DELETE(req: Request) {
  try {
    sameOrigin(req);
    const u = await currentUser();
    const b = await req.json();
    if (b.confirm !== "ELIMINAR") throw new Error("Confirmación requerida");
    const files = await db.uploadedFile.findMany({ where: { ownerId: u.id } });
    for (const f of files)
      await storage().send(
        new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: f.key }),
      );
    await db.user.delete({ where: { id: u.id } });
    await db.auditLog.create({ data: { action: "ACCOUNT_DELETED" } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: publicError(e) }, { status: 400 });
  }
}
