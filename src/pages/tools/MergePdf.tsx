import React from 'react';
import { useTranslation } from 'react-i18next';
import { ToolLayout } from '@/components/ui-custom/ToolLayout';
import { mergePdfs } from '@/tools/pdfTools';
import type { FileWithPreview } from '@/types';

const MergePdf: React.FC = () => {
  const { t } = useTranslation();

  const handleConvert = async (
    filesToConvert: FileWithPreview[],
    options: { setProgress: (p: number) => void }
  ) => {
    options.setProgress(30);
    
    const pdfFiles = filesToConvert.map(f => f.file);
    const blob = await mergePdfs(pdfFiles);
    
    options.setProgress(100);
    
    // Set result on first file for download
    if (filesToConvert.length > 0) {
      filesToConvert[0].result = blob;
      filesToConvert[0].resultUrl = URL.createObjectURL(blob);
    }
  };

  return (
    <ToolLayout
      toolId="merge-pdf"
      title={t('tools.mergePdf.title')}
      description={t('tools.mergePdf.description')}
      seoTitle={t('tools.mergePdf.seoTitle')}
      seoDescription={t('tools.mergePdf.seoDescription')}
      accept="application/pdf"
      multiple={true}
      maxFiles={20}
      onConvert={handleConvert}
      outputFormat="pdf"
      keywords={['merge pdf', 'combine pdf', 'pdf merger', 'join pdf files']}
    />
  );
};

export default MergePdf;
