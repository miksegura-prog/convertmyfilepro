import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles, Upload, Video, Ban, Zap } from 'lucide-react';

interface ProModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: 'batch' | 'video' | 'ocr' | 'general';
}

const triggers = {
  batch: {
    title: 'Límite de archivos alcanzado',
    description: 'Con la versión gratuita puedes procesar hasta 3 archivos por lote. Actualiza a PRO y procesa archivos ilimitados.',
  },
  video: {
    title: 'Límite de tamaño de vídeo',
    description: 'La versión gratuita permite vídeos de hasta 25 MB. Actualiza a PRO y comprime vídeos de hasta 2 GB.',
  },
  ocr: {
    title: 'Límite de OCR alcanzado',
    description: 'Con la versión gratuita puedes extraer texto de hasta 2 imágenes por sesión. Actualiza a PRO y procesa páginas ilimitadas.',
  },
  general: {
    title: 'Funcionalidad PRO',
    description: 'Esta funcionalidad está disponible solo para usuarios PRO. Actualiza ahora y disfruta de todas las ventajas.',
  },
};

export const ProModal: React.FC<ProModalProps> = ({
  open,
  onOpenChange,
  trigger = 'general',
}) => {
  const { t } = useTranslation();
  const currentTrigger = triggers[trigger];

  const handleUpgrade = () => {
    const paymentLink = import.meta.env.VITE_STRIPE_PAYMENT_LINK;
    if (paymentLink) {
      window.open(paymentLink, '_blank');
    }
    onOpenChange(false);
  };

  const benefits = [
    { icon: Ban, text: 'Sin publicidad — experiencia limpia' },
    { icon: Upload, text: 'Lotes ilimitados — sin restricción de archivos' },
    { icon: Video, text: 'Vídeos hasta 2 GB' },
    { icon: Zap, text: 'Prioridad de procesamiento' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold">
            {currentTrigger.title}
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            {currentTrigger.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          <p className="text-sm font-semibold text-[var(--color-text)] text-center mb-3">
            {t('pro.benefitsTitle', 'Con PRO obtienes:')}
          </p>
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
                <benefit.icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-[var(--color-text)]">
                {benefit.text}
              </span>
            </div>
          ))}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            {t('pro.keepFree', 'Seguir Gratis')}
          </Button>
          <Button
            onClick={handleUpgrade}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg shadow-amber-500/30"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {t('pro.upgrade', 'Ir a PRO')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
