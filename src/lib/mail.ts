import nodemailer from "nodemailer";
export async function sendMail(to: string, subject: string, text: string) {
  if (!process.env.SMTP_URL || !process.env.MAIL_FROM)
    throw new Error("El servicio de correo todavía no está configurado");
  await nodemailer
    .createTransport(process.env.SMTP_URL, {
      disableFileAccess: true,
      disableUrlAccess: true,
    })
    .sendMail({ from: process.env.MAIL_FROM, to, subject, text });
}
