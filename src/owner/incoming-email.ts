import type { D1Binding } from './owner-api';

/** Email handler is dormant until the info@ route is explicitly switched
 * from forwarding to this Worker. The existing HTTP website is unaffected. */
export interface IncomingEmailMessage {
  readonly from: string;
  readonly to: string;
  readonly headers: Headers;
  forward(recipient: string): Promise<unknown>;
  reply(message: { from: string; subject: string; text: string; html?: string }): Promise<unknown>;
}
export interface IncomingMailEnv {
  DB?: D1Binding;
  EMAIL_FORWARD_TO?: string;
  EMAIL_AUTOREPLY_ENABLED?: string;
}
const WEEK = 7 * 86_400_000;
const MAX_REPLIES_PER_DAY = 40;
const SUPPORT_EMAIL = 'info@convertmyfilepro.com';
const validEmail = (s: string) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s) && s.length <= 254;

function shouldReply(message: IncomingEmailMessage): boolean {
  const from = message.from.trim().toLowerCase();
  const to = message.to.trim().toLowerCase().replace(/\+[^@]+(?=@)/, '');
  if (to !== SUPPORT_EMAIL || !validEmail(from) || from.endsWith('@convertmyfilepro.com')) return false;
  const mailbox = from.split('@')[0];
  if (/^(no[-_.]?reply|do[-_.]?not[-_.]?reply|mailer-daemon|postmaster|bounce|unsubscribe|abuse)(?:[+_.-]|$)/i.test(mailbox)) return false;
  const get = (key: string) => message.headers.get(key)?.trim().toLowerCase() || '';
  const auto = get('auto-submitted');
  if (auto && auto !== 'no') return false;
  if (get('x-auto-response-suppress') || get('x-autoreply') || get('x-autorespond') ||
      get('list-id') || get('list-unsubscribe') || get('mailing-list') ||
      get('x-loop') || get('x-failed-recipients')) return false;
  if (/bulk|list|junk|auto[-_ ]?reply/.test(get('precedence'))) return false;
  return true;
}

async function senderKey(sender: string): Promise<string> {
  const bytes = new TextEncoder().encode(sender.trim().toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return 'sender:' + Array.from(new Uint8Array(hash),
    byte => byte.toString(16).padStart(2, '0')).join('');
}

/** D1 atomic upserts reserve one response per sender per 7 days and
 * at most 40 automated responses globally each UTC day. Failed attempts
 * remain reserved to prevent retry storms and accidental email loops. */
async function reserve(db: D1Binding, address: string): Promise<boolean> {
  const now = Date.now();
  const sender = await db.prepare(
    'INSERT INTO email_autoreply_throttle (throttle_key, last_attempt_at, count) VALUES (?, ?, 1) ' +
    'ON CONFLICT(throttle_key) DO UPDATE SET last_attempt_at = excluded.last_attempt_at, ' +
    'count = email_autoreply_throttle.count + 1 ' +
    'WHERE email_autoreply_throttle.last_attempt_at <= ?'
  ).bind(await senderKey(address), now, now - WEEK).run();
  if (sender.meta?.changes !== 1) return false;

  const today = new Date(now).toISOString().slice(0, 10);
  const daily = await db.prepare(
    'INSERT INTO email_autoreply_throttle (throttle_key, last_attempt_at, count) VALUES (?, ?, 1) ' +
    'ON CONFLICT(throttle_key) DO UPDATE SET last_attempt_at = excluded.last_attempt_at, ' +
    'count = email_autoreply_throttle.count + 1 ' +
    'WHERE email_autoreply_throttle.count < ?'
  ).bind('daily:' + today, now, MAX_REPLIES_PER_DAY).run();
  return daily.meta?.changes === 1;
}
const faq = 'https://www.convertmyfilepro.com/faq';
const text = [
  'Hola:', 'Gracias por contactar con ConvertMyFilePro. Hemos recibido tu mensaje.',
  'Puedes consultar las preguntas frecuentes sobre formatos, OCR, PDF, planes Free y PRO e invitaciones:', faq,
  'Si se trata de un pago, acceso o incidencia técnica, revisaremos personalmente tu consulta cuando sea necesario. No hace falta que vuelvas a enviar el mismo mensaje.',
  'Equipo ConvertMyFilePro',
  '---', 'Hello,', 'Thank you for contacting ConvertMyFilePro. We received your message.',
  'Find answers about formats, OCR, PDFs, Free and PRO plans and invitations:', faq,
  'We will review payment, access and technical issues personally where needed. There is no need to resend the same message.',
  'The ConvertMyFilePro Team',
].join('\n\n');
const html = [
  '<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#17303c">',
  '<div style="max-width:640px;margin:auto"><h2>ConvertMyFilePro</h2>',
  '<p>Hemos recibido tu mensaje. Consulta las <a href="', faq,
  '">preguntas frecuentes</a>. Si necesitas atención personal, revisaremos tu consulta.</p>',
  '<hr>',
  '<p>We received your message. Visit our <a href="', faq,
  '">FAQ and help center</a>. Requests needing personal attention will be reviewed.</p>',
  '<p>ConvertMyFilePro · <a href="https://www.convertmyfilepro.com">convertmyfilepro.com</a></p>',
  '</div></body></html>',
].join('');

export async function handleIncomingMail(message: IncomingEmailMessage, env: IncomingMailEnv): Promise<void> {
  const destination = env.EMAIL_FORWARD_TO?.trim().toLowerCase() || '';
  if (!validEmail(destination)) {
    // The current routing must not be switched until a verified forwarding
    // address is configured. Do not silently discard support messages.
    throw new Error('EMAIL_FORWARD_TO must be a verified Cloudflare Email Routing destination');
  }

  // Forward to the existing verified inbox before doing anything else.
  await message.forward(destination);

  if (env.EMAIL_AUTOREPLY_ENABLED !== 'true' || !env.DB || !shouldReply(message)) return;
  try {
    if (!await reserve(env.DB, message.from)) return;

    // Cloudflare allows reply() only for DMARC-valid messages.
    // A reply failure never prevents forwarding, which already completed.
    await message.reply({
      from: SUPPORT_EMAIL,
      subject: 'Hemos recibido tu mensaje / We received your message',
      text, html,
    });
  } catch (error) {
    console.error('Email autoresponse skipped or failed',
      error instanceof Error ? error.name : 'UnknownError');
  }
}
