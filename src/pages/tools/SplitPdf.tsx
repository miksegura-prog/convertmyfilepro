import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolLayout } from '@/components/ui-custom/ToolLayout';
import { splitPdf, getPdfPageCount } from '@/tools/pdfTools';
import type { FileWithPreview } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import JSZip from 'jszip';

const SplitPdf: React.FC = () => {
  const { t } = useTranslation();
  const [pageRange, setPageRange] = useState('');
  const [totalPages, setTotalPages] = useState<number | null>(null);

  const handleConvert = async (
    files: FileWithPreview[],
    options: { setProgress: (p: number) => void }
  ) => {
    // Update total pages on first conversion
    if (files.length > 0 && !totalPages) {
      const count = await getPdfPageCount(files[0].file);
      setTotalPages(count);
    }

    if (!pageRange.trim()) {
      throw new Error('Please enter a page range');
    }

    const file = files[0];
    options.setProgress(30);
    
    const blobs = await splitPdf(file.file, pageRange);
    
    options.setProgress(80);
    
    // If multiple files, zip them
    if (blobs.length > 1) {
      const zip = new JSZip();
      blobs.forEach((blob, i) => {
        zip.file(`split_part_${i + 1}.pdf`, blob);
      });
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      file.result = zipBlob;
      file.resultUrl = URL.createObjectURL(zipBlob);
    } else if (blobs.length === 1) {
      file.result = blobs[0];
      file.resultUrl = URL.createObjectURL(blobs[0]);
    }
    
    options.setProgress(100);
  };

  const renderOptions = (
    <div className="space-y-4">
      {totalPages && (
        <p className="text-sm text-[var(--color-muted)]">
          {t('tools.splitPdf.totalPages', { count: totalPages })}
        </p>
      )}
      
      <div>
        <Label htmlFor="pageRange">{t('tools.splitPdf.pageRange')}</Label>
        <Input
          id="pageRange"
          value={pageRange}
          onChange={(e) => setPageRange(e.target.value)}
          placeholder="1-5, 8, 11-13"
        />
        <p className="text-xs text-[var(--color-muted)] mt-1">
          {t('tools.splitPdf.pageRangeHelp')}
        </p>
      </div>
    </div>
  );

  return (
    <ToolLayout
      toolId="split-pdf"
      title={t('tools.splitPdf.title')}
      description={t('tools.splitPdf.description')}
      seoTitle={t('tools.splitPdf.seoTitle')}
      seoDescription={t('tools.splitPdf.seoDescription')}
      accept="application/pdf"
      multiple={false}
      maxFiles={1}
      renderOptions={renderOptions}
      onConvert={handleConvert}
      outputFormat="pdf"
      keywords={['split pdf', 'extract pdf pages', 'pdf splitter', 'pdf page extract']}
    />
  );
};

export default SplitPdf;
