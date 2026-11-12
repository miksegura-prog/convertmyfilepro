import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, Archive, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import JSZip from 'jszip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DropZone } from './DropZone';
import { ConversionResult } from './ConversionResult';
import { FAQ } from './FAQ';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useProStatus } from '@/hooks/useProStatus';
import { ProModal } from './ProModal';
import type { FileWithPreview } from '@/types';
import { SEO } from './SEO';
import { downloadBlob } from '@/utils/fileHelpers';

interface ProLimits {
  maxFiles?: number;
  maxSizeMB?: number;
  trigger?: 'batch' | 'video' | 'ocr' | 'general';
}

interface ToolLayoutProps {
  toolId: string;
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  accept: string;
  multiple?: boolean;
  maxFiles?: number;
  renderOptions?: React.ReactNode;
  onConvert: (files: FileWithPreview[], options: { setProgress: (p: number) => void }) => Promise<void>;
  outputFormat?: string;
  faqItems?: Array<{ question: string; answer: string }>;
  keywords?: string[];
  proRequired?: ProLimits;
}

export const ToolLayout: React.FC<ToolLayoutProps> = ({
  toolId,
  title,
  description,
  seoTitle,
  seoDescription,
  accept,
  multiple = false,
  maxFiles = 1,
  renderOptions,
  onConvert,
  outputFormat,
  faqItems,
  keywords = [],
  proRequired
}) => {
  const { t } = useTranslation();
  const { trackConversion, trackDownload } = useAnalytics();
  const { isPro } = useProStatus();
  const [proModalOpen, setProModalOpen] = useState(false);
  const [proModalTrigger, setProModalTrigger] = useState<'batch' | 'video' | 'ocr' | 'general'>('general');
  
  const {
    files,
    isDragging,
    error,
    addFiles,
    removeFile,
    clearFiles,
    setIsDragging
  } = useFileUpload({
    maxFiles,
    maxSizeMB: 50,
    allowedTypes: accept.split(','),
    multiple
  });

  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [convertedFiles, setConvertedFiles] = useState<FileWithPreview[]>([]);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  const handleConvert = async () => {
    if (files.length === 0) return;

    // Check PRO limits before conversion
    if (!isPro && proRequired) {
      // Check max files limit
      if (proRequired.maxFiles && files.length > proRequired.maxFiles) {
        setProModalTrigger(proRequired.trigger || 'batch');
        setProModalOpen(true);
        return;
      }

      // Check max size per file (e.g. video > 25MB)
      if (proRequired.maxSizeMB) {
        const maxBytes = proRequired.maxSizeMB * 1024 * 1024;
        const oversized = files.some(f => f.file.size > maxBytes);
        if (oversized) {
          setProModalTrigger(proRequired.trigger || 'video');
          setProModalOpen(true);
          return;
        }
      }
    }
    
    setConverting(true);
    setProgress(0);
    setConvertError(null);
    
    try {
      await onConvert(files, { setProgress });
      setConvertedFiles([...files]);
      trackConversion(toolId, files.length, true);
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : 'Conversion failed');
      trackConversion(toolId, files.length, false);
    } finally {
      setConverting(false);
      setProgress(100);
    }
  };

  const handleDownload = (file: FileWithPreview) => {
    trackDownload(toolId, file.file.size);
  };

  const handleDownloadAllZip = async () => {
    if (convertedFiles.length === 0) return;
    setIsZipping(true);

    try {
      const zip = new JSZip();
      for (const item of convertedFiles) {
        if (item.result instanceof Blob) {
          const extension = outputFormat || item.file.name.split('.').pop() || 'bin';
          const baseName = item.file.name.replace(/\.[^/.]+$/, '');
          zip.file(`${baseName}_converted.${extension}`, item.result);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, `${toolId}_files.zip`);
    } catch (e) {
      console.error('Failed to create ZIP:', e);
    } finally {
      setIsZipping(false);
    }
  };

  const handleReset = () => {
    clearFiles();
    setConvertedFiles([]);
    setConvertError(null);
    setProgress(0);
  };

  return (
    <>
      <SEO 
        title={seoTitle}
        description={seoDescription}
        keywords={keywords}
      />
      
      <div className="max-w-3xl mx-auto">
        {/* Back Link */}
        <Link 
          to="/"
          className="inline-flex items-center gap-2 text-[var(--color-muted)] 
                   hover:text-[var(--color-primary)] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('nav.home')}
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text)] mb-3">
            {title}
          </h1>
          <p className="text-[var(--color-muted)] text-lg">
            {description}
          </p>
        </div>

        {/* Main Tool Card */}
        <Card className="p-6 md:p-8 shadow-card">
          {/* Drop Zone */}
          {convertedFiles.length === 0 && (
            <DropZone
              files={files}
              onFilesAdd={addFiles}
              onFileRemove={removeFile}
              isDragging={isDragging}
              setIsDragging={setIsDragging}
              accept={accept}
              multiple={multiple}
              error={error}
            />
          )}

          {/* Options */}
          {files.length > 0 && convertedFiles.length === 0 && renderOptions && (
            <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
              {renderOptions}
            </div>
          )}

          {/* Convert Button */}
          {files.length > 0 && convertedFiles.length === 0 && (
            <div className="mt-6">
              {converting ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-3 text-[var(--color-primary)]">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t('common.processing')}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button
                    onClick={handleConvert}
                    className="flex-1 bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90
                             text-white font-semibold py-6"
                    disabled={files.length === 0}
                  >
                    {t('common.convert')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                  >
                    {t('common.clear')}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {convertError && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 
                          border border-red-200 dark:border-red-800 
                          rounded-lg text-red-600 dark:text-red-400">
              {convertError}
            </div>
          )}

          {/* Results */}
          {convertedFiles.length > 0 && (
            <div className="space-y-4">
              {/* Batch Download ZIP Button if multiple files */}
              {convertedFiles.filter(f => f.result).length > 1 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                      <Archive className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                        {convertedFiles.length} archivos convertidos
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-400">
                        Descárgalos todos juntos en un único archivo comprimido ZIP
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleDownloadAllZip}
                    disabled={isZipping}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                  >
                    {isZipping ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                    Descargar Todo (.ZIP)
                  </Button>
                </div>
              )}

              {convertedFiles.map((file) => (
                <ConversionResult
                  key={file.id}
                  file={file}
                  onDownload={() => handleDownload(file)}
                  outputFormat={outputFormat}
                />
              ))}
              
              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full"
              >
                {t('common.convert')} More
              </Button>
            </div>
          )}
        </Card>

        {/* FAQ */}
        <FAQ items={faqItems} />

        {/* PRO Upgrade Modal */}
        <ProModal
          open={proModalOpen}
          onOpenChange={setProModalOpen}
          trigger={proModalTrigger}
        />
      </div>
    </>
  );
};
