import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Crown, Loader2, MailPlus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
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
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [createdUrl, setCreatedUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const response = await fetch('/api/owner/invitations', { credentials: 'same-origin', cache: 'no-store' });
    const data = await response.json() as { invitations?: Invitation[]; error?: string };
    if (!response.ok) throw new Error(data.error || 'Error al consultar las invitaciones');
    setItems(data.invitations || []);
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
    try {
      const response = await fetch('/api/owner/invitations', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, note }),
      });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || 'No se pudo crear la invitación');
      setCreatedUrl(data.url);
      setEmail('');
      setNote('');
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Error desconocido'); }
    finally { setBusy(false); }
  };

  const revoke = async (invite: Invitation) => {
    if (!window.confirm(`¿Revocar el acceso Pro Beta de ${invite.email}?`)) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/owner/invitations/revoke', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invite.id }),
      });
      if (!response.ok) throw new Error('No se ha podido revocar la invitación');
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Error al revocar'); }
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
      {error && <Card className="p-4 text-red-600">{error}</Card>}
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
                <div className="flex items-center gap-2"><MailPlus className="h-5 w-5" /><h2 className="text-xl font-semibold">Crear invitación de 90 días</h2></div>
                <p className="text-sm text-[var(--color-muted)]">El enlace es de un solo uso y debe activarse antes de 14 días. Los 90 días comienzan cuando el usuario activa Pro Beta.</p>
                <form onSubmit={createInvite} className="grid gap-3">
                  <input type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="Email de la persona invitada"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-transparent p-3" />
                  <input type="text" maxLength={500} value={note} onChange={e => setNote(e.target.value)}
                    placeholder="Nota interna (opcional)"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-transparent p-3" />
                  <Button type="submit" disabled={busy} className="w-full sm:w-fit"><MailPlus className="mr-2 h-4 w-4" />Generar invitación Pro Beta</Button>
                </form>
                {createdUrl && (
                  <div className="space-y-2 rounded-xl border border-emerald-300 p-4">
                    <strong>Invitación creada. Guarda o comparte el enlace ahora:</strong>
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
                  <h2 className="text-xl font-semibold">Invitaciones ({items.length})</h2>
                  <Button variant="outline" size="sm" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>
                </div>
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
                          {!item.revoked_at && (
                            <Button variant="ghost" size="sm" disabled={busy} onClick={() => void revoke(item)}
                              title="Revocar inmediatamente"><Trash2 className="mr-1 h-4 w-4" />Revocar</Button>
                          )}
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {items.length === 0 && <p className="p-4 text-sm text-[var(--color-muted)]">Todavía no hay invitaciones.</p>}
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
