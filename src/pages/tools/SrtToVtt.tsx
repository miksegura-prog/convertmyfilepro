import React from 'react';
import { useTranslation } from 'react-i18next';
import { ToolLayout } from '@/components/ui-custom/ToolLayout';
import { srtToVtt } from '@/tools/subtitleConverter';
import type { FileWithPreview } from '@/types';
import { readFileAsText } from '@/utils/fileHelpers';

const SrtToVtt: React.FC = () => {
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
      const vttContent = srtToVtt(content);
      f.result = new Blob([vttContent], { type: 'text/vtt' });
      f.resultUrl = URL.createObjectURL(f.result);

      options.setProgress(Math.round(((i + 1) / total) * 100));
    }
    options.setProgress(100);
  };

  return (
    <ToolLayout
      toolId="srt-to-vtt"
      title={t('tools.srtToVtt.title')}
      description={t('tools.srtToVtt.description')}
      seoTitle={t('tools.srtToVtt.seoTitle')}
      seoDescription={t('tools.srtToVtt.seoDescription')}
      accept=".srt,text/plain,.txt"
      multiple={true}
      maxFiles={20}
      onConvert={handleConvert}
      outputFormat="vtt"
      keywords={['srt to vtt', 'convert srt to vtt', 'subtitle converter', 'srt to webvtt', 'caption converter']}
      faqItems={[
        { question: t('tools.srtToVtt.faq1.q'), answer: t('tools.srtToVtt.faq1.a') },
        { question: t('tools.srtToVtt.faq2.q'), answer: t('tools.srtToVtt.faq2.a') },
        { question: t('tools.srtToVtt.faq3.q'), answer: t('tools.srtToVtt.faq3.a') },
      ]}
    />
  );
};

export default SrtToVtt;
