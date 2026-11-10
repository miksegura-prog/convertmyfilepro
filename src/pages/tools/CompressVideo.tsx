import React, { useState } from 'react';
import { Smartphone, Sparkles, AlertCircle } from 'lucide-react';
import { ToolLayout } from '@/components/ui-custom/ToolLayout';
import { compressVideoForWhatsApp } from '@/tools/videoCompressor';
import type { FileWithPreview } from '@/types';
import { Label } from '@/components/ui/label';

const CompressVideo: React.FC = () => {
  const [targetSizeMB, setTargetSizeMB] = useState<number>(15);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const handleConvert = async (
    files: FileWithPreview[],
    options: { setProgress: (p: number) => void }
  ) => {
    const total = files.length;
    for (let i = 0; i < total; i++) {
      const f = files[i];
      const startP = Math.round((i / total) * 100);
      const endP = Math.round(((i + 1) / total) * 100);

      const compressedBlob = await compressVideoForWhatsApp(f.file, {
        targetSizeMB,
        onProgress: (p) => {
          const currentP = startP + Math.round((p / 100) * (endP - startP));
          options.setProgress(currentP);
        },
        onLog: (msg) => setStatusMessage(msg)
      });

      f.result = compressedBlob;
      f.resultUrl = URL.createObjectURL(compressedBlob);
    }
    options.setProgress(100);
    setStatusMessage('');
  };

  const renderOptions = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-green-600" />
          <Label className="text-base font-semibold text-[var(--color-text)]">
            Tamaño Objetivo (Límite WhatsApp)
          </Label>
        </div>
        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> FFmpeg WebAssembly Single-Thread
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setTargetSizeMB(15)}
          className={`p-4 rounded-xl border text-left transition-all ${
            targetSizeMB === 15
              ? 'border-green-600 bg-green-50 dark:bg-green-950/20 text-[var(--color-text)] shadow-sm'
              : 'border-[var(--color-border)] hover:border-[var(--color-muted)] text-[var(--color-muted)]'
          }`}
        >
          <div className="font-semibold text-sm flex items-center justify-between">
            <span>&lt; 15 MB</span>
            <span className="text-xs text-green-600 font-bold">Recomendado</span>
          </div>
          <div className="text-xs mt-1">Límite oficial de WhatsApp móvil (16 MB)</div>
        </button>

        <button
          type="button"
          onClick={() => setTargetSizeMB(25)}
          className={`p-4 rounded-xl border text-left transition-all ${
            targetSizeMB === 25
              ? 'border-green-600 bg-green-50 dark:bg-green-950/20 text-[var(--color-text)] shadow-sm'
              : 'border-[var(--color-border)] hover:border-[var(--color-muted)] text-[var(--color-muted)]'
          }`}
        >
          <div className="font-semibold text-sm">&lt; 25 MB</div>
          <div className="text-xs mt-1">Ideal para WhatsApp Web o correo</div>
        </button>

        <button
          type="button"
          onClick={() => setTargetSizeMB(50)}
          className={`p-4 rounded-xl border text-left transition-all ${
            targetSizeMB === 50
              ? 'border-green-600 bg-green-50 dark:bg-green-950/20 text-[var(--color-text)] shadow-sm'
              : 'border-[var(--color-border)] hover:border-[var(--color-muted)] text-[var(--color-muted)]'
          }`}
        >
          <div className="font-semibold text-sm">&lt; 50 MB</div>
          <div className="text-xs mt-1">Máxima nitidez para vídeos largos</div>
        </button>
      </div>

      {statusMessage && (
        <div className="flex items-center gap-2 text-xs text-[var(--color-muted)] p-2 bg-[var(--color-bg)] rounded-lg">
          <AlertCircle className="w-4 h-4 text-blue-500 animate-pulse" />
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );

  return (
    <ToolLayout
      toolId="compress-video-whatsapp"
      title="Comprimir Vídeo para WhatsApp"
      description="Reduce el peso y resolución de vídeos grandes (MP4, MOV, WebM) para enviarlos por WhatsApp sin cortes ni errores, 100% privado en tu navegador."
      seoTitle="Comprimir Vídeo para WhatsApp Online Gratis | ConvertMyFilePro"
      seoDescription="Reduce vídeos grandes para que pesen menos de 16 MB y compartirlos fácilmente por WhatsApp. Rápido, privado, sin límites y sin enviar nada a servidores."
      accept="video/*,.mp4,.mov,.webm,.mkv,.avi"
      multiple={false}
      maxFiles={1}
      renderOptions={renderOptions}
      onConvert={handleConvert}
      outputFormat="mp4"
      keywords={['comprimir video whatsapp', 'compress video for whatsapp', 'reducir video menos 16mb', 'video compressor online']}
    />
  );
};

export default CompressVideo;
