import React from 'react';
import { useTranslation } from 'react-i18next';
import { ToolLayout } from '@/components/ui-custom/ToolLayout';
import { jpgToPdf } from '@/tools/pdfTools';
import type { FileWithPreview } from '@/types';

const JpgToPdf: React.FC = () => {
  const { t } = useTranslation();

  const handleConvert = async (
    files: FileWithPreview[],
    options: { setProgress: (p: number) => void }
  ) => {
    options.setProgress(30);
    
    const imageFiles = files.map(f => f.file);
    const blob = await jpgToPdf(imageFiles);
    
    options.setProgress(100);
    
    // Set result on first file for download
    if (files.length > 0) {
      files[0].result = blob;
      files[0].resultUrl = URL.createObjectURL(blob);
    }
  };

  return (
    <ToolLayout
      toolId="jpg-to-pdf"
      title={t('tools.jpgToPdf.title')}
      description={t('tools.jpgToPdf.description')}
      seoTitle={t('tools.jpgToPdf.seoTitle')}
      seoDescription={t('tools.jpgToPdf.seoDescription')}
      accept="image/*"
      multiple={true}
      maxFiles={50}
      onConvert={handleConvert}
      outputFormat="pdf"
      keywords={['jpg to pdf', 'image to pdf', 'convert images to pdf', 'photo to pdf']}
    />
  );
};

export default JpgToPdf;
