import 'server-only';
import nodemailer from 'nodemailer';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required to send account emails.`);
  return value;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character);
}

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | undefined;

function transport() {
  if (cachedTransporter) return cachedTransporter;
  const host = required('SMTP_HOST');
  const port = Number(process.env.SMTP_PORT ?? 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SMTP_PORT must be a valid TCP port.');
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  const secure = process.env.SMTP_SECURE === 'true';
  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    ...(process.env.NODE_ENV === 'production' && !secure ? { requireTLS: true } : {}),
    ...(user && password ? { auth: { user, pass: password } } : {}),
    pool: true,
    maxConnections: 2,
  });
  return cachedTransporter;
}

export async function sendAccountEmail(input: { to: string; name: string; subject: string; url: string }): Promise<void> {
  const safeName = escapeHtml(input.name);
  const safeUrl = escapeHtml(input.url);
  await transport().sendMail({
    from: required('SMTP_FROM'),
    to: input.to,
    subject: input.subject,
    text: `${input.name},\n\nContinue securely using this link:\n${input.url}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>${safeName},</p><p>Continue securely using this link:</p><p><a href="${safeUrl}">Continue to SignalDesk</a></p><p>If you did not request this, you can ignore this email.</p>`,
  });
}
