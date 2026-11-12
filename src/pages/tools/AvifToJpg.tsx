import React from 'react';
import { useTranslation } from 'react-i18next';
import { ToolLayout } from '@/components/ui-custom/ToolLayout';
import { convertImageWithCanvas } from '@/tools/imageConverter';
import type { FileWithPreview } from '@/types';

const AvifToJpg: React.FC = () => {
  const { t } = useTranslation();

  const handleConvert = async (
    files: FileWithPreview[],
    options: { setProgress: (p: number) => void }
  ) => {
    const total = files.length;
    for (let i = 0; i < total; i++) {
      const f = files[i];
      options.setProgress(Math.round((i / total) * 50));
      f.result = await convertImageWithCanvas(f.file, 'jpeg', 0.92);
      f.resultUrl = URL.createObjectURL(f.result);
      options.setProgress(Math.round(((i + 1) / total) * 100));
    }
    options.setProgress(100);
  };

  return (
    <ToolLayout
      toolId="avif-to-jpg"
      title={t('tools.avifToJpg.title')}
      description={t('tools.avifToJpg.description')}
      seoTitle={t('tools.avifToJpg.seoTitle')}
      seoDescription={t('tools.avifToJpg.seoDescription')}
      accept="image/avif,.avif"
      multiple={true}
      maxFiles={10}
      onConvert={handleConvert}
      outputFormat="jpg"
      keywords={['avif to jpg', 'convert avif to jpg', 'avif to jpeg', 'avif image converter']}
      faqItems={[
        { question: t('tools.avifToJpg.faq1.q'), answer: t('tools.avifToJpg.faq1.a') },
        { question: t('tools.avifToJpg.faq2.q'), answer: t('tools.avifToJpg.faq2.a') },
        { question: t('tools.avifToJpg.faq3.q'), answer: t('tools.avifToJpg.faq3.a') },
      ]}
    />
  );
};

export default AvifToJpg;
