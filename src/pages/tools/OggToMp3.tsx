import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Music } from 'lucide-react';
import { ToolLayout } from '@/components/ui-custom/ToolLayout';
import { convertAudioToMp3 } from '@/tools/audioConverter';
import type { FileWithPreview } from '@/types';
import { Label } from '@/components/ui/label';

const OggToMp3: React.FC = () => {
  const { t } = useTranslation();
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
      f.result = await convertAudioToMp3(f.file, {
        bitrate,
        onProgress: (p) => options.setProgress(startP + Math.round((p / 100) * (endP - startP))),
      });
      f.resultUrl = URL.createObjectURL(f.result);
    }
    options.setProgress(100);
  };

  const renderOptions = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-primary" />
          <Label className="text-base font-semibold">Audio Quality (Bitrate)</Label>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setBitrate(128)}
          className={`p-4 rounded-xl border text-left transition-all ${bitrate === 128 ? 'border-accent bg-accent/10' : 'border-border hover:border-muted'}`}>
          <div className="font-semibold text-sm">128 kbps (Standard)</div>
          <div className="text-xs mt-1">Good for podcasts & voice</div>
        </button>
        <button type="button" onClick={() => setBitrate(192)}
          className={`p-4 rounded-xl border text-left transition-all ${bitrate === 192 ? 'border-accent bg-accent/10' : 'border-border hover:border-muted'}`}>
          <div className="font-semibold text-sm">192 kbps (High Quality)</div>
          <div className="text-xs mt-1">Excellent for music</div>
        </button>
      </div>
    </div>
  );

  return (
    <ToolLayout
      toolId="ogg-to-mp3"
      title={t('tools.oggToMp3.title')}
      description={t('tools.oggToMp3.description')}
      seoTitle={t('tools.oggToMp3.seoTitle')}
      seoDescription={t('tools.oggToMp3.seoDescription')}
      accept="audio/ogg,.ogg,.oga,audio/*"
      multiple={true}
      maxFiles={20}
      renderOptions={renderOptions}
      onConvert={handleConvert}
      outputFormat="mp3"
      keywords={['ogg to mp3', 'convert ogg to mp3', 'ogg audio converter', 'vorbis to mp3']}
      faqItems={[
        { question: t('tools.oggToMp3.faq1.q'), answer: t('tools.oggToMp3.faq1.a') },
        { question: t('tools.oggToMp3.faq2.q'), answer: t('tools.oggToMp3.faq2.a') },
        { question: t('tools.oggToMp3.faq3.q'), answer: t('tools.oggToMp3.faq3.a') },
      ]}
    />
  );
};

export default OggToMp3;
