import React from 'react';
import { useTranslation } from 'react-i18next';
import { ToolLayout } from '@/components/ui-custom/ToolLayout';
import { vttToSrt } from '@/tools/subtitleConverter';
import type { FileWithPreview } from '@/types';
import { readFileAsText } from '@/utils/fileHelpers';

const VttToSrt: React.FC = () => {
  const { t } = useTranslation();

  const handleConvert = async (
    files: FileWithPreview[],
    options: { setProgress: (p: number) => void }
  ) => {
    const total = files.length;
    for (let i = 0; i < total; i++) {
      const f = files[i];
      options.setProgress(Math.round((i / total) * 90));

      const content = await readFileAsText(f.file);
      const srtContent = vttToSrt(content);
      f.result = new Blob([srtContent], { type: 'text/plain' });
      f.resultUrl = URL.createObjectURL(f.result);

      options.setProgress(Math.round(((i + 1) / total) * 100));
    }
    options.setProgress(100);
  };

  return (
    <ToolLayout
      toolId="vtt-to-srt"
      title={t('tools.vttToSrt.title')}
      description={t('tools.vttToSrt.description')}
      seoTitle={t('tools.vttToSrt.seoTitle')}
      seoDescription={t('tools.vttToSrt.seoDescription')}
      accept=".vtt,text/vtt,.txt"
      multiple={true}
      maxFiles={20}
      onConvert={handleConvert}
      outputFormat="srt"
      keywords={['vtt to srt', 'convert vtt to srt', 'webvtt to srt', 'subtitle converter', 'caption converter']}
      faqItems={[
        { question: t('tools.vttToSrt.faq1.q'), answer: t('tools.vttToSrt.faq1.a') },
        { question: t('tools.vttToSrt.faq2.q'), answer: t('tools.vttToSrt.faq2.a') },
        { question: t('tools.vttToSrt.faq3.q'), answer: t('tools.vttToSrt.faq3.a') },
      ]}
    />
  );
};

export default VttToSrt;
