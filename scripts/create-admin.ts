import { db } from "../src/lib/db";
const email = process.argv[2]?.toLowerCase();
const role = process.argv[3] || "ADMIN";
if (!email || !["ADMIN", "EDITOR", "REVIEWER"].includes(role))
  throw new Error("Uso: npm run admin:grant -- correo ADMIN|EDITOR|REVIEWER");
async function main() {
  try {
    const user = await db.user.update({ where: { email }, data: { role } });
    await db.auditLog.create({
      data: { actorId: user.id, action: "ROLE_GRANTED_" + role },
    });
    console.log("Rol asignado a la cuenta existente.");
  } finally {
    await db.$disconnect();
  }
}
main().catch(() => {
  console.error(
    "No se pudo asignar el rol. Verificá el correo, el rol y la conexión.",
  );
  process.exitCode = 1;
});
