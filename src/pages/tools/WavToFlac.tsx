import React from 'react';
import { useTranslation } from 'react-i18next';
import { ToolLayout } from '@/components/ui-custom/ToolLayout';
import { convertWavToFlac } from '@/tools/flacConverter';
import type { FileWithPreview } from '@/types';

const WavToFlac: React.FC = () => {
  const { t } = useTranslation();

  const handleConvert = async (
    files: FileWithPreview[],
    options: { setProgress: (p: number) => void }
  ) => {
    const total = files.length;
    for (let i = 0; i < total; i++) {
      const f = files[i];
      const startP = Math.round((i / total) * 100);
      const endP = Math.round(((i + 1) / total) * 100);
      f.result = await convertWavToFlac(f.file, {
        onProgress: (p) => options.setProgress(startP + Math.round((p / 100) * (endP - startP))),
      });
      f.resultUrl = URL.createObjectURL(f.result);
    }
    options.setProgress(100);
  };

  return (
    <ToolLayout
      toolId="wav-to-flac"
      title={t('tools.wavToFlac.title')}
      description={t('tools.wavToFlac.description')}
      seoTitle={t('tools.wavToFlac.seoTitle')}
      seoDescription={t('tools.wavToFlac.seoDescription')}
      accept=".wav,audio/wav,audio/x-wav,audio/wave"
      multiple={true}
      maxFiles={20}
      onConvert={handleConvert}
      outputFormat="flac"
      keywords={['wav to flac', 'convert wav to flac', 'wav audio converter', 'lossless audio']}
      faqItems={[
        { question: t('tools.wavToFlac.faq1.q'), answer: t('tools.wavToFlac.faq1.a') },
        { question: t('tools.wavToFlac.faq2.q'), answer: t('tools.wavToFlac.faq2.a') },
        { question: t('tools.wavToFlac.faq3.q'), answer: t('tools.wavToFlac.faq3.a') },
      ]}
    />
  );
};

export default WavToFlac;
