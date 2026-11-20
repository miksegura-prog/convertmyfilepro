import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, Copy, Crown, History, Loader2, MailPlus, RefreshCw, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Invitation = {
  id: string;
  email: string;
  note: string | null;
  created_at: number;
  redeemed_at: number | null;
  expires_at: number | null;
  revoked_at: number | null;
};
type OwnerStatus = { owner?: boolean; email?: string; databaseReady?: boolean; error?: string };
type AccessEvent = {
  id: string; invite_id: string; email: string; actor_email: string;
  action: 'revoke' | 'reactivate' | 'grant';
  months: number | null; new_expires_at: number | null; created_at: number;
};

const formatDate = (value: number | null) =>
  value ? new Date(value).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const label = (item: Invitation) => {
  if (item.revoked_at) return 'Revocada';
  if (!item.redeemed_at && item.created_at < Date.now() - 14 * 86400000) return 'Enlace caducado';
  if (!item.redeemed_at) return 'Pendiente';
  if (item.expires_at && item.expires_at < Date.now()) return 'Expirada';
  return 'Pro Beta activa';
};

const Owner: React.FC = () => {
  const [owner, setOwner] = useState<OwnerStatus | null>(null);
  const [items, setItems] = useState<Invitation[]>([]);
  const [history, setHistory] = useState<AccessEvent[]>([]);
  const [historyIssue, setHistoryIssue] = useState('');
  const [giftMonths, setGiftMonths] = useState<Record<string, number>>({});
  const [actionMessage, setActionMessage] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [language, setLanguage] = useState<'es' | 'en'>('es');
  const [emailStatus, setEmailStatus] = useState<'accepted' | 'failed' | ''>('');
  const [createdRecipient, setCreatedRecipient] = useState('');
  const [createdUrl, setCreatedUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const response = await fetch('/api/owner/invitations', { credentials: 'same-origin', cache: 'no-store' });
    const data = await response.json() as { invitations?: Invitation[]; error?: string };
    if (!response.ok) throw new Error(data.error || 'Error al consultar las invitaciones');
    setItems(data.invitations || []);
    try {
      const eventsResponse = await fetch('/api/owner/access-events', { credentials: 'same-origin', cache: 'no-store' });
      if (!eventsResponse.ok) {
        setHistoryIssue('Historial no disponible: ejecuta la migración D1 de accesos.');
      } else {
        const eventsData = await eventsResponse.json() as { events?: AccessEvent[] };
        setHistory(eventsData.events || []);
        setHistoryIssue('');
      }
    } catch {
      setHistoryIssue('No se pudo consultar el historial de cambios.');
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      try {
        const response = await fetch('/api/owner/status', { credentials: 'same-origin', cache: 'no-store' });
        const data = await response.json() as OwnerStatus;
        if (!response.ok || !data.owner) throw new Error(data.error || 'Acceso Owner no autorizado');
        if (!mounted) return;
        setOwner(data);
        window.dispatchEvent(new Event('convertmyfilepro:pro-status'));
        if (data.databaseReady) await refresh();
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'No se puede abrir el panel Owner');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void start();
    return () => { mounted = false; };
  }, [refresh]);

  const createInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setCreatedUrl('');
    setEmailStatus('');
    setActionMessage('');
    try {
      const response = await fetch('/api/owner/invitations', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, note, language }),
      });
      const data = await response.json() as { url?: string; emailStatus?: 'accepted' | 'failed'; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || 'No se pudo crear la invitación');
      setCreatedUrl(data.url);
      setCreatedRecipient(email);
      setEmailStatus(data.emailStatus === 'accepted' ? 'accepted' : 'failed');
      setEmail('');
      setNote('');
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Error desconocido'); }
    finally { setBusy(false); }
  };

  const ownerAction = async (
    invite: Invitation, action: 'revoke' | 'reactivate' | 'grant', months?: number,
  ) => {
    const question = action === 'revoke'
      ? `¿Revocar inmediatamente el acceso de ${invite.email}?`
      : action === 'reactivate'
        ? `¿Reactivar el acceso existente de ${invite.email} hasta su fecha de caducidad?`
        : `¿Regalar ${months} mes(es) adicionales a ${invite.email}? Si está revocado, también se reactivará.`;
    if (!window.confirm(question)) return;
    setBusy(true);
    setError('');
    setActionMessage('');
    try {
      const response = await fetch(`/api/owner/invitations/${action}`, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invite.id, ...(action === 'grant' ? { months } : {}) }),
      });
      const data = await response.json() as { success?: boolean; error?: string; expiresAt?: number };
      if (!response.ok || !data.success) throw new Error(data.error || 'No se pudo modificar el acceso');
      await refresh();
      setActionMessage(
        action === 'revoke' ? `Acceso revocado: ${invite.email}`
          : action === 'reactivate' ? `Acceso reactivado: ${invite.email}`
            : `${months} mes(es) regalados a ${invite.email}. Acceso hasta ${formatDate(data.expiresAt || null)}.`,
      );
    } catch (err) { setError(err instanceof Error ? err.message : 'Error al modificar el acceso'); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
            <ShieldCheck className="h-5 w-5" /> PANEL PRIVADO
          </div>
          <h1 className="mt-1 text-3xl font-bold">ConvertMyFilePro · Owner</h1>
          <p className="text-sm text-[var(--color-muted)]">Administración real de invitaciones Pro Beta de 90 días</p>
        </div>
        <Button asChild variant="outline"><Link to="/"><Crown className="mr-2 h-4 w-4" />Ir a conversores</Link></Button>
      </div>
      {loading && <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Verificando Cloudflare Access…</div>}
      {error && <Card className="p-4 text-red-600" role="alert">{error}</Card>}
      {actionMessage && <Card className="p-4 text-emerald-700" role="status">{actionMessage}</Card>}
      {owner && (
        <>
          <Card className="p-4 text-sm">
            <p><strong>Propietario:</strong> {owner.email}</p>
            <p><strong>Autenticación:</strong> Cloudflare Access + cookie firmada de 24 h para herramientas Pro.</p>
            <p><strong>Base de datos D1:</strong> {owner.databaseReady ? 'Conectada' : 'Pendiente de configurar'}</p>
          </Card>
          {!owner.databaseReady ? (
            <Card className="p-5">Falta vincular la base de datos D1. Consulta <code>OWNER_PRODUCTION_SETUP.md</code> en GitHub antes de emitir invitaciones.</Card>
          ) : (
            <>
              <Card className="space-y-4 p-5">
                <div className="flex items-center gap-2"><MailPlus className="h-5 w-5" /><h2 className="text-xl font-semibold">Crear y enviar invitación de 90 días</h2></div>
                <p className="text-sm text-[var(--color-muted)]">El enlace es de un solo uso y debe activarse antes de 14 días. Los 90 días comienzan cuando el usuario activa Pro Beta.</p>
                <form onSubmit={createInvite} className="grid gap-3">
                  <input type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="Email de la persona invitada"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-transparent p-3" />
                  <input type="text" maxLength={500} value={note} onChange={e => setNote(e.target.value)}
                    placeholder="Nota interna (opcional)"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-transparent p-3" />
                  <label className="flex flex-col gap-1 text-sm">Idioma del correo de invitación
                    <select value={language} onChange={e => setLanguage(e.target.value === 'en' ? 'en' : 'es')}
                      className="w-full rounded-xl border border-[var(--color-border)] bg-transparent p-3 sm:w-56">
                      <option value="es">Español</option><option value="en">English</option>
                    </select>
                  </label>
                  <Button type="submit" disabled={busy} className="w-full sm:w-fit"><MailPlus className="mr-2 h-4 w-4" />{busy ? 'Creando y enviando…' : 'Crear y enviar invitación Pro Beta'}</Button>
                </form>
                {createdUrl && (
                  <div className="space-y-2 rounded-xl border border-emerald-300 p-4">
                    {emailStatus === 'accepted'
                      ? <p className="font-semibold text-emerald-700">Brevo ha aceptado el envío a {createdRecipient}. Comprueba su recepción; esto no garantiza la entrega en la bandeja.</p>
                      : <p role="alert" className="font-semibold text-amber-700">Invitación creada, pero Brevo no ha aceptado el correo. Copia y envía el enlace manualmente; no crees otra invitación por este fallo.</p>}
                    <strong>Enlace personal (de un solo uso):</strong>
                    <p className="break-all text-sm">{createdUrl}</p>
                    <Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(createdUrl)}>
                      <Copy className="mr-2 h-4 w-4" />Copiar enlace
                    </Button>
                    <p className="text-xs text-[var(--color-muted)]">Por seguridad, el enlace no podrá recuperarse desde el listado.</p>
                  </div>
                )}
              </Card>
              <Card className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Invitaciones y accesos ({items.length})</h2>
                  <Button variant="outline" size="sm" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>
                </div>
                <p className="text-xs text-[var(--color-muted)]">
                  Puedes regalar meses a quienes ya hayan activado su invitación. Si están revocados,
                  regalar meses también los reactiva. Si borraron sus cookies o nunca activaron el
                  enlace, necesitarán una invitación nueva (los enlaces usados no se recuperan).
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead><tr className="border-b border-[var(--color-border)]">
                      <th className="p-2">Invitado</th><th className="p-2">Estado</th><th className="p-2">Creada</th><th className="p-2">Hasta</th><th className="p-2">Acción</th>
                    </tr></thead>
                    <tbody>{items.map(item => (
                      <tr key={item.id} className="border-b border-[var(--color-border)]">
                        <td className="p-2"><div className="font-medium">{item.email}</div>{item.note && <div className="text-xs text-[var(--color-muted)]">{item.note}</div>}</td>
                        <td className="p-2">{label(item)}</td>
                        <td className="p-2 whitespace-nowrap">{formatDate(item.created_at)}</td>
                        <td className="p-2 whitespace-nowrap">{formatDate(item.expires_at)}</td>
                        <td className="p-2">
                          <div className="flex min-w-[240px] flex-wrap items-center gap-2">
                            {!item.revoked_at && (
                              <Button variant="outline" size="sm" disabled={busy}
                                onClick={() => void ownerAction(item, 'revoke')}
                                title="Suspender el acceso inmediatamente">
                                <Trash2 className="mr-1 h-4 w-4" />Revocar
                              </Button>
                            )}
                            {item.revoked_at !== null && item.redeemed_at !== null &&
                              item.expires_at !== null && item.expires_at > Date.now() && (
                                <Button variant="outline" size="sm" disabled={busy}
                                  onClick={() => void ownerAction(item, 'reactivate')}
                                  title="Recuperar la sesión vigente de este colaborador">
                                  <RotateCcw className="mr-1 h-4 w-4" />Reactivar
                                </Button>
                            )}
                            {item.redeemed_at !== null ? (
                              <>
                                <select aria-label={`Meses a regalar a ${item.email}`}
                                  className="rounded-lg border border-[var(--color-border)] bg-transparent px-2 py-1.5 text-sm"
                                  value={giftMonths[item.id] || 1}
                                  disabled={busy}
                                  onChange={event => setGiftMonths(current => ({ ...current, [item.id]: Number(event.target.value) }))}>
                                  {[1, 2, 3, 6, 12].map(months => (
                                    <option key={months} value={months}>{months} {months === 1 ? 'mes' : 'meses'}</option>
                                  ))}
                                </select>
                                <Button variant="outline" size="sm" disabled={busy}
                                  onClick={() => void ownerAction(item, 'grant', giftMonths[item.id] || 1)}
                                  title="Ampliar la fecha de caducidad y reactivar si está revocado">
                                  <CalendarPlus className="mr-1 h-4 w-4" />Regalar
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-[var(--color-muted)]">
                                {item.revoked_at ? 'Para reinvitar, crea un enlace nuevo.' : 'Pendiente de activación'}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {items.length === 0 && <p className="p-4 text-sm text-[var(--color-muted)]">Todavía no hay invitaciones.</p>}
                </div>
              </Card>
              <Card className="space-y-3 p-5">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Historial de accesos</h2>
                </div>
                {historyIssue && <p className="text-sm text-amber-700">{historyIssue}</p>}
                {!historyIssue && history.length === 0 && (
                  <p className="text-sm text-[var(--color-muted)]">Todavía no hay revocaciones ni ampliaciones registradas.</p>
                )}
                <div className="max-h-64 space-y-2 overflow-auto">
                  {history.map(event => (
                    <div className="flex flex-wrap justify-between gap-2 border-b border-[var(--color-border)] py-2 text-sm" key={event.id}>
                      <div>
                        <span className="font-medium">{event.email}</span> ·{' '}
                        {event.action === 'grant'
                          ? `Regalados ${event.months} mes(es)`
                          : event.action === 'reactivate' ? 'Acceso reactivado' : 'Acceso revocado'}
                      </div>
                      <span className="text-[var(--color-muted)]">
                        {formatDate(event.created_at)}
                        {event.action === 'grant' && ` · Hasta ${formatDate(event.new_expires_at)}`}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
};
export default Owner;
