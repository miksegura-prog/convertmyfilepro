import React from 'react';
import { useTranslation } from 'react-i18next';
import { ToolLayout } from '@/components/ui-custom/ToolLayout';
import { txtToSrt } from '@/tools/subtitleConverter';
import type { FileWithPreview } from '@/types';
import { readFileAsText } from '@/utils/fileHelpers';

const TxtToSrt: React.FC = () => {
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
      const srtContent = txtToSrt(content);
      f.result = new Blob([srtContent], { type: 'text/plain' });
      f.resultUrl = URL.createObjectURL(f.result);

      options.setProgress(Math.round(((i + 1) / total) * 100));
    }
    options.setProgress(100);
  };

  return (
    <ToolLayout
      toolId="txt-to-srt"
      title={t('tools.txtToSrt.title')}
      description={t('tools.txtToSrt.description')}
      seoTitle={t('tools.txtToSrt.seoTitle')}
      seoDescription={t('tools.txtToSrt.seoDescription')}
      accept=".txt,text/plain"
      multiple={true}
      maxFiles={20}
      onConvert={handleConvert}
      outputFormat="srt"
      keywords={['txt to srt', 'text to subtitle', 'convert txt to srt', 'plain text to subtitles', 'srt generator']}
      faqItems={[
        { question: t('tools.txtToSrt.faq1.q'), answer: t('tools.txtToSrt.faq1.a') },
        { question: t('tools.txtToSrt.faq2.q'), answer: t('tools.txtToSrt.faq2.a') },
        { question: t('tools.txtToSrt.faq3.q'), answer: t('tools.txtToSrt.faq3.a') },
      ]}
    />
  );
};

export default TxtToSrt;
