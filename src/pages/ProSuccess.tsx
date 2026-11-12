import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProStatus } from '@/hooks/useProStatus';

const ProSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activatePro } = useProStatus();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      setStatus('error');
      setErrorMsg('No se encontró el ID de sesión de pago.');
      return;
    }

    const verifySession = async () => {
      try {
        const response = await fetch(`/api/verify-stripe?session_id=${encodeURIComponent(sessionId)}`);
        const data = await response.json();

        if (data.success) {
          // Activate PRO status in localStorage
          activatePro(sessionId, data.expiresAt || undefined);
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMsg(data.error || 'No se pudo verificar el pago.');
        }
      } catch (err) {
        setStatus('error');
        setErrorMsg('Error de conexión al verificar el pago. Contacta a soporte.');
      }
    };

    verifySession();
  }, [searchParams, activatePro]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full text-center space-y-6 p-8">
        {status === 'verifying' && (
          <>
            <div className="mx-auto w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">
              Verificando tu pago...
            </h1>
            <p className="text-[var(--color-muted)]">
              Estamos confirmando tu suscripción PRO. Un momento...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-green-600 dark:text-green-400">
              ¡Bienvenido a PRO!
            </h1>
            <p className="text-[var(--color-muted)]">
              Tu suscripción PRO está activa. Disfruta de todas las ventajas:
              sin publicidad, lotes ilimitados, vídeos hasta 2 GB y prioridad de procesamiento.
            </p>
            <div className="space-y-3 pt-4">
              <Button
                onClick={() => navigate('/')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6"
              >
                Ir a las herramientas
              </Button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">
              Error de verificación
            </h1>
            <p className="text-[var(--color-muted)]">
              {errorMsg}
            </p>
            <p className="text-sm text-[var(--color-muted)]">
              Si ya realizaste el pago, contacta a soporte con tu ID de sesión de Stripe.
            </p>
            <div className="space-y-3 pt-4">
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="w-full py-6"
              >
                Volver al inicio
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProSuccess;
