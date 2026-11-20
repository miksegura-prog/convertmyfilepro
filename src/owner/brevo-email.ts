/**
 * Transactional invitation delivery through Brevo.
 *
 * This module is only imported by the Cloudflare Worker, never by the client.
 * BREVO_API_KEY must be a secret binding, not a VITE_* environment variable.
 */
export type InviteLanguage = 'es' | 'en';
export type InviteEmailResult = { ok: true } | { ok: false; reason: 'not_configured' | 'provider_error' };

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char] || char));
}

export async function sendInviteViaBrevo(
  apiKey: string | undefined,
  to: string,
  link: string,
  language: InviteLanguage,
): Promise<InviteEmailResult> {
  if (!apiKey) return { ok: false, reason: 'not_configured' };

  const es = language === 'es';
  const subject = es
    ? 'Tu invitación a ConvertMyFilePro PRO Beta: 90 días gratis'
    : 'Your invitation to ConvertMyFilePro PRO Beta: 90 days free';
  const intro = es
    ? 'Te invitamos a probar las funciones PRO Beta de ConvertMyFilePro gratis durante 90 días.'
    : 'You are invited to try ConvertMyFilePro PRO Beta features free for 90 days.';
  const instruction = es
    ? 'Activa tu invitación desde este enlace:'
    : 'Activate your invitation using this link:';
  const conditions = es
    ? 'El enlace es personal, de un solo uso y caduca a los 14 días. Tus 90 días comienzan cuando lo activas. No necesitas tarjeta ni se realizará ningún cargo automático.'
    : 'This invitation link can only be used once and expires in 14 days. Your 90 days start when you activate it. No card is needed and there is no automatic charge.';
  const note = es
    ? 'Algunas herramientas están en versión beta. El acceso queda vinculado al navegador en el que actives la invitación; si borras sus cookies, necesitarás una invitación nueva.'
    : 'Some tools are in beta. Access is linked to the browser where you activate the invitation; if you clear its cookies, you will need a new invitation.';
  const closing = es
    ? 'Gracias por ayudarnos a mejorar ConvertMyFilePro.'
    : 'Thank you for helping us improve ConvertMyFilePro.';
  const safeLink = escapeHtml(link);
  const html = `<!doctype html><html lang="${language}"><body style="font-family:Arial,sans-serif;color:#17303c;line-height:1.6;margin:0;padding:24px">
    <div style="max-width:600px;margin:auto">
      <h1 style="font-size:22px">ConvertMyFilePro · PRO Beta</h1>
      <p>${escapeHtml(intro)}</p>
      <p>${escapeHtml(instruction)}</p>
      <p><a href="${safeLink}" style="display:inline-block;background:#176a76;color:white;padding:12px 18px;border-radius:7px;text-decoration:none">${es ? 'Activar mis 90 días gratis' : 'Activate my 90 free days'}</a></p>
      <p style="overflow-wrap:anywhere;font-size:12px">${safeLink}</p>
      <p>${escapeHtml(conditions)}</p>
      <p style="color:#53656d;font-size:13px">${escapeHtml(note)}</p>
      <p>${escapeHtml(closing)}</p>
      <p style="font-size:12px;color:#53656d">ConvertMyFilePro · <a href="https://www.convertmyfilepro.com">convertmyfilepro.com</a></p>
    </div></body></html>`;

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'ConvertMyFilePro', email: 'info@convertmyfilepro.com' },
        to: [{ email: to }],
        replyTo: { name: 'ConvertMyFilePro', email: 'info@convertmyfilepro.com' },
        subject,
        htmlContent: html,
        tags: ['cmfp-beta-invite'],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      // Never log tokens, addresses or full Brevo response bodies.
      console.error('Brevo invitation request failed: HTTP', response.status);
      return { ok: false, reason: 'provider_error' };
    }
    // A 201 means accepted by Brevo, not proof of delivery to the inbox.
    return { ok: true };
  } catch (error) {
    console.error('Brevo invitation request failed:', error instanceof Error ? error.name : 'UnknownError');
    return { ok: false, reason: 'provider_error' };
  }
}


/** Sending is informational only. D1 mutations happen before notification. */
export async function sendAccessUpdateViaBrevo(
  apiKey: string | undefined, to: string,
  action: 'reactivate' | 'grant', expiresAt: number,
  language: InviteLanguage, months?: number,
): Promise<InviteEmailResult> {
  if (!apiKey) return { ok: false, reason: 'not_configured' };
  const es = language === 'es';
  const gift = action === 'grant';
  const amount = Number.isInteger(months) && months! > 0 ? months : 1;
  const date = new Intl.DateTimeFormat(es ? 'es-ES' : 'en-GB', {
    dateStyle: 'long', timeZone: 'UTC',
  }).format(new Date(expiresAt));
  const subject = es
    ? (gift ? 'ConvertMyFilePro: meses PRO Beta adicionales' : 'ConvertMyFilePro: acceso PRO Beta reactivado')
    : (gift ? 'ConvertMyFilePro: additional PRO Beta months' : 'ConvertMyFilePro: PRO Beta access restored');
  const intro = es
    ? (gift ? 'Hemos añadido ' + amount + (amount === 1 ? ' mes' : ' meses') + ' a tu acceso gratuito PRO Beta.'
      : 'Tu acceso gratuito PRO Beta de ConvertMyFilePro vuelve a estar activo.')
    : (gift ? 'We have added ' + amount + (amount === 1 ? ' month' : ' months') + ' to your complimentary PRO Beta access.'
      : 'Your complimentary ConvertMyFilePro PRO Beta access has been restored.');
  const expiry = es ? 'Acceso hasta: ' + date + '.' : 'Access until: ' + date + '.';
  const session = es
    ? 'Puedes usar PRO en el navegador donde activaste tu invitación, siempre que conserves las cookies. Si has perdido la sesión o cambiado de navegador, responde para solicitar una nueva invitación.'
    : 'You can use PRO in the browser where you activated the invitation if its cookies remain available. If you lost your session or changed browsers, reply to request a new invitation.';
  const closing = es ? 'Gracias por ayudar a mejorar ConvertMyFilePro.' : 'Thank you for helping improve ConvertMyFilePro.';
  const home = 'https://www.convertmyfilepro.com/';
  const faq = 'https://www.convertmyfilepro.com/faq';
  const text = [intro, expiry, session, closing, home, faq].join('\n\n');
  const html = [
    '<!doctype html><html lang="', language,
    '"><body style="font-family:Arial,sans-serif;color:#17303c;line-height:1.6;margin:0;padding:24px">',
    '<div style="max-width:600px;margin:auto"><h1 style="font-size:22px">ConvertMyFilePro · PRO Beta</h1>',
    '<p>', escapeHtml(intro), '</p><p><strong>', escapeHtml(expiry), '</strong></p>',
    '<p>', escapeHtml(session), '</p><p>', escapeHtml(closing), '</p>',
    '<p><a href="', home, '">ConvertMyFilePro</a> · <a href="', faq, '">FAQ / Help</a></p>',
    '</div></body></html>',
  ].join('');

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'ConvertMyFilePro', email: 'info@convertmyfilepro.com' },
        to: [{ email: to }],
        replyTo: { name: 'ConvertMyFilePro', email: 'info@convertmyfilepro.com' },
        subject, htmlContent: html, textContent: text,
        tags: [gift ? 'cmfp-beta-gift' : 'cmfp-beta-reactivated'],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      console.error('Brevo access notice failed: HTTP', response.status);
      return { ok: false, reason: 'provider_error' };
    }
    // Accepted by API is not proof of inbox delivery.
    return { ok: true };
  } catch (error) {
    console.error('Brevo access notice failed:', error instanceof Error ? error.name : 'UnknownError');
    return { ok: false, reason: 'provider_error' };
  }
}
