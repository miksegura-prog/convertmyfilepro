import React from 'react';
import { useTranslation } from 'react-i18next';
import { ToolLayout } from '@/components/ui-custom/ToolLayout';
import { convertImageWithCanvas } from '@/tools/imageConverter';
import type { FileWithPreview } from '@/types';

const AvifToPng: React.FC = () => {
  const { t } = useTranslation();

  const handleConvert = async (
    files: FileWithPreview[],
    options: { setProgress: (p: number) => void }
  ) => {
    const total = files.length;
    for (let i = 0; i < total; i++) {
      const f = files[i];
      options.setProgress(Math.round((i / total) * 50));
      f.result = await convertImageWithCanvas(f.file, 'png', 0.95);
      f.resultUrl = URL.createObjectURL(f.result);
      options.setProgress(Math.round(((i + 1) / total) * 100));
    }
    options.setProgress(100);
  };

  return (
    <ToolLayout
      toolId="avif-to-png"
      title={t('tools.avifToPng.title')}
      description={t('tools.avifToPng.description')}
      seoTitle={t('tools.avifToPng.seoTitle')}
      seoDescription={t('tools.avifToPng.seoDescription')}
      accept="image/avif,.avif"
      multiple={true}
      maxFiles={10}
      onConvert={handleConvert}
      outputFormat="png"
      keywords={['avif to png', 'convert avif to png', 'avif image converter', 'avif to png online']}
      faqItems={[
        { question: t('tools.avifToPng.faq1.q'), answer: t('tools.avifToPng.faq1.a') },
        { question: t('tools.avifToPng.faq2.q'), answer: t('tools.avifToPng.faq2.a') },
        { question: t('tools.avifToPng.faq3.q'), answer: t('tools.avifToPng.faq3.a') },
      ]}
    />
  );
};

export default AvifToPng;
