import React from 'react';
import { useTranslation } from 'react-i18next';
import { ToolLayout } from '@/components/ui-custom/ToolLayout';
import { convertImage } from '@/tools/imageConverter';
import type { FileWithPreview } from '@/types';

const JpgToPng: React.FC = () => {
  const { t } = useTranslation();

  const handleConvert = async (
    files: FileWithPreview[],
    options: { setProgress: (p: number) => void }
  ) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      options.setProgress((i / files.length) * 50);
      
      const blob = await convertImage(file.file, { format: 'png' });
      file.result = blob;
      file.resultUrl = URL.createObjectURL(blob);
      
      options.setProgress(((i + 1) / files.length) * 100);
    }
  };

  return (
    <ToolLayout
      toolId="jpg-to-png"
      title={t('tools.jpgToPng.title')}
      description={t('tools.jpgToPng.description')}
      seoTitle={t('tools.jpgToPng.seoTitle')}
      seoDescription={t('tools.jpgToPng.seoDescription')}
      accept="image/jpeg,image/jpg"
      multiple={true}
      maxFiles={10}
      onConvert={handleConvert}
      outputFormat="png"
      keywords={['jpg to png', 'convert jpg to png', 'jpeg to png', 'image converter', 'free online']}
    />
  );
};

export default JpgToPng;
