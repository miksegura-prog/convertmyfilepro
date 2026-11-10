import React, { useState } from 'react';
import { Music } from 'lucide-react';
import { ToolLayout } from '@/components/ui-custom/ToolLayout';
import { convertAudioToMp3 } from '@/tools/audioConverter';
import type { FileWithPreview } from '@/types';
import { Label } from '@/components/ui/label';

const WavToMp3: React.FC = () => {
  const [bitrate, setBitrate] = useState<128 | 192>(128);

  const handleConvert = async (
    files: FileWithPreview[],
    options: { setProgress: (p: number) => void }
  ) => {
    const total = files.length;
    for (let i = 0; i < total; i++) {
      const f = files[i];
      const startP = Math.round((i / total) * 100);
      const endP = Math.round(((i + 1) / total) * 100);

      const mp3Blob = await convertAudioToMp3(f.file, {
        bitrate,
        onProgress: (p) => {
          const currentP = startP + Math.round((p / 100) * (endP - startP));
          options.setProgress(currentP);
        }
      });

      f.result = mp3Blob;
      f.resultUrl = URL.createObjectURL(mp3Blob);
    }
    options.setProgress(100);
  };

  const renderOptions = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-[var(--color-primary)]" />
          <Label className="text-base font-semibold text-[var(--color-text)]">
            Calidad de Audio (Bitrate)
          </Label>
        </div>
        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium px-2 py-0.5 rounded-full">
          100% en el Navegador
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setBitrate(128)}
          className={`p-4 rounded-xl border text-left transition-all ${
            bitrate === 128
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-text)]'
              : 'border-[var(--color-border)] hover:border-[var(--color-muted)] text-[var(--color-muted)]'
          }`}
        >
          <div className="font-semibold text-sm">128 kbps (Estándar)</div>
          <div className="text-xs mt-1">Mayor compresión, ideal para podcasts y voz</div>
        </button>

        <button
          type="button"
          onClick={() => setBitrate(192)}
          className={`p-4 rounded-xl border text-left transition-all ${
            bitrate === 192
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-text)]'
              : 'border-[var(--color-border)] hover:border-[var(--color-muted)] text-[var(--color-muted)]'
          }`}
        >
          <div className="font-semibold text-sm">192 kbps (Alta Calidad)</div>
          <div className="text-xs mt-1">Excelente fidelidad para música y efectos</div>
        </button>
      </div>
    </div>
  );

  return (
    <ToolLayout
      toolId="wav-to-mp3"
      title="Convertidor de Audio (WAV a MP3)"
      description="Convierte grabaciones y archivos de audio WAV pesados a MP3 comprimido directamente en tu navegador sin enviar nada a ningún servidor."
      seoTitle="Convertir WAV a MP3 Online Gratis | ConvertMyFilePro"
      seoDescription="Convertidor gratuito de WAV a MP3 en línea. Reduce el peso de tus audios a MP3 sin pérdida notable de calidad. Privado y 100% en el navegador."
      accept="audio/*,.wav,.ogg,.aac,.m4a"
      multiple={true}
      maxFiles={20}
      renderOptions={renderOptions}
      onConvert={handleConvert}
      outputFormat="mp3"
      keywords={['wav to mp3', 'convert wav to mp3', 'audio converter', 'compress wav', 'audio to mp3']}
    />
  );
};

export default WavToMp3;
