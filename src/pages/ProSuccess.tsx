import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProStatus } from '@/hooks/useProStatus';

const ProSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { activatePro } = useProStatus();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>(
    sessionId ? 'verifying' : 'error'
  );
  const [errorMsg, setErrorMsg] = useState(
    sessionId ? '' : t('pro.success.noSession')
  );

  useEffect(() => {
    if (!sessionId) return;

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
          setErrorMsg(data.error || t('pro.success.verifyFailed'));
        }
      } catch {
        setStatus('error');
        setErrorMsg(t('pro.success.connectionError'));
      }
    };

    verifySession();
  }, [sessionId, activatePro, t]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full text-center space-y-6 p-8">
        {status === 'verifying' && (
          <>
            <div className="mx-auto w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">
              {t('pro.success.verifyingTitle')}
            </h1>
            <p className="text-[var(--color-muted)]">
              {t('pro.success.verifyingDescription')}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-green-600 dark:text-green-400">
              {t('pro.success.title')}
            </h1>
            <p className="text-[var(--color-muted)]">
              {t('pro.success.description')}
            </p>
            <div className="space-y-3 pt-4">
              <Button
                onClick={() => navigate('/')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6"
              >
                {t('pro.success.goToTools')}
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
              {t('pro.success.errorTitle')}
            </h1>
            <p className="text-[var(--color-muted)]">
              {errorMsg}
            </p>
            <p className="text-sm text-[var(--color-muted)]">
              {t('pro.success.errorSupport')}
            </p>
            <div className="space-y-3 pt-4">
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="w-full py-6"
              >
                {t('pro.success.backHome')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProSuccess;
