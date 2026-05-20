import nodemailer from "nodemailer";

const globalForMailer = globalThis as unknown as {
  transporter?: nodemailer.Transporter;
};

export const transporter =
  globalForMailer.transporter ??
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 25),
    secure: false,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });

if (process.env.NODE_ENV !== "production") globalForMailer.transporter = transporter;

export async function verifyTransport() {
  return transporter.verify();
}
