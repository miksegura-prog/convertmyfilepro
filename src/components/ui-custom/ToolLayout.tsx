import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DropZone } from './DropZone';
import { ConversionResult } from './ConversionResult';
import { FAQ } from './FAQ';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useAnalytics } from '@/hooks/useAnalytics';
import type { FileWithPreview } from '@/types';
import { SEO } from './SEO';

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
  keywords = []
}) => {
  const { t } = useTranslation();
  const { trackConversion, trackDownload } = useAnalytics();
  
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

  const handleConvert = async () => {
    if (files.length === 0) return;
    
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
      </div>
    </>
  );
};
