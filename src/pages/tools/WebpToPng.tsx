import React from 'react';
import { useTranslation } from 'react-i18next';
import { ToolLayout } from '@/components/ui-custom/ToolLayout';
import { convertImageWithCanvas } from '@/tools/imageConverter';
import type { FileWithPreview } from '@/types';

const WebpToPng: React.FC = () => {
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
      toolId="webp-to-png"
      title={t('tools.webpToPng.title')}
      description={t('tools.webpToPng.description')}
      seoTitle={t('tools.webpToPng.seoTitle')}
      seoDescription={t('tools.webpToPng.seoDescription')}
      accept="image/webp,.webp"
      multiple={true}
      maxFiles={10}
      onConvert={handleConvert}
      outputFormat="png"
      keywords={['webp to png', 'convert webp to png', 'webp image converter', 'webp to png online']}
      faqItems={[
        { question: t('tools.webpToPng.faq1.q'), answer: t('tools.webpToPng.faq1.a') },
        { question: t('tools.webpToPng.faq2.q'), answer: t('tools.webpToPng.faq2.a') },
        { question: t('tools.webpToPng.faq3.q'), answer: t('tools.webpToPng.faq3.a') },
      ]}
    />
  );
};

export default WebpToPng;
