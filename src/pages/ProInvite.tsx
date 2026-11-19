import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Gift, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

const ProInvite: React.FC = () => {
  const { token: routeToken } = useParams<{ token: string }>();
  const [token] = useState(routeToken || '');
  const { i18n } = useTranslation();
  const es = i18n.language.startsWith('es');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [expires, setExpires] = useState<number | null>(null);

  useEffect(() => {
    // The bearer token must not remain in address/history or be reused as a
    // referrer by third-party resources on this page.
    if (token && window.location.pathname.startsWith('/invite/')) {
      window.history.replaceState(window.history.state, '', '/invite');
    }
  }, [token]);

  const activate = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/pro-beta/redeem', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const result = await response.json() as { success?: boolean; expiresAt?: number; error?: string };
      if (!response.ok || !result.success) throw new Error(result.error || 'Invitation is not valid');
      setDone(true);
      setExpires(result.expiresAt || null);
      window.dispatchEvent(new Event('convertmyfilepro:pro-status'));
    } catch (e) { setError(e instanceof Error ? e.message : 'Connection error'); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-xl py-12">
      <Card className="space-y-5 p-7 text-center">
        <Gift className="mx-auto h-12 w-12 text-amber-500" />
        <h1 className="text-3xl font-bold">ConvertMyFilePro · Pro Beta</h1>
        {done ? (
          <>
            <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" />
            <p className="text-lg font-medium">{es ? '¡Acceso Pro Beta activado!' : 'Pro Beta activated!'}</p>
            <p>{es ? 'Tu acceso gratuito estará activo hasta el' : 'Your free access is active until'} {expires ? new Date(expires).toLocaleDateString(es ? 'es-ES' : 'en-GB') : ''}.</p>
            <p className="text-sm text-[var(--color-muted)]">
              {es ? 'Este acceso queda vinculado a este navegador. No borres sus cookies hasta que termine la prueba.' :
                'Your access is linked to this browser. Keep its cookies until your trial ends.'}
            </p>
            <Button asChild className="w-full"><Link to="/">{es ? 'Abrir conversores' : 'Open converters'}</Link></Button>
          </>
        ) : (
          <>
            <p className="text-[var(--color-muted)]">
              {es ? 'Te han invitado a probar gratis las funciones Pro durante 90 días. Los 90 días empiezan al activarlo.' :
                'You have been invited to try Pro features free for 90 days. Your trial starts when you activate it.'}
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              {es ? 'La invitación se utiliza una sola vez y no se renueva automáticamente. Algunas herramientas siguen en fase beta.' :
                'This is a one-use invitation with no automatic renewal. Some features are still in beta.'}
            </p>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <Button className="w-full" onClick={() => void activate()} disabled={!token || busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {es ? 'Activar mis 90 días gratis' : 'Activate my free 90 days'}
            </Button>
            {!token && <p className="text-sm text-red-600">{es ? 'Falta el enlace de invitación.' : 'Missing invitation link.'}</p>}
          </>
        )}
      </Card>
    </div>
  );
};
export default ProInvite;
