import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { extractTextFromImage, supportedLanguages } from '@/tools/ocrTool';
import type { OcrResult } from '@/types';
import { SEO } from '@/components/ui-custom/SEO';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Copy, Check, Loader2 } from 'lucide-react';
import { DropZone } from '@/components/ui-custom/DropZone';
import { useFileUpload } from '@/hooks/useFileUpload';
import { FAQ } from '@/components/ui-custom/FAQ';

const OcrTool: React.FC = () => {
  const { t } = useTranslation();
  const [language, setLanguage] = useState('eng');
  const [result, setResult] = useState<OcrResult | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    files,
    isDragging,
    error,
    addFiles,
    removeFile,
    clearFiles,
    setIsDragging
  } = useFileUpload({
    maxFiles: 1,
    maxSizeMB: 10,
    allowedTypes: ['image/*'],
    multiple: false
  });

  const handleExtract = async () => {
    if (files.length === 0) return;
    
    setExtracting(true);
    setResult(null);
    
    try {
      const ocrResult = await extractTextFromImage(files[0].file, language);
      setResult(ocrResult);
    } catch (err) {
      console.error('OCR error:', err);
    } finally {
      setExtracting(false);
    }
  };

  const handleCopy = async () => {
    if (result?.text) {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    clearFiles();
    setResult(null);
  };

  return (
    <>
      <SEO 
        title={t('tools.ocr.seoTitle')}
        description={t('tools.ocr.seoDescription')}
        keywords={['ocr', 'image to text', 'extract text', 'ocr online', 'text recognition']}
      />
      
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text)] mb-3">
            {t('tools.ocr.title')}
          </h1>
          <p className="text-[var(--color-muted)] text-lg">
            {t('tools.ocr.description')}
          </p>
        </div>

        <Card className="p-6 md:p-8 shadow-card">
          {/* Language Selection */}
          <div className="mb-6">
            <Label className="mb-2 block">{t('common.language')}</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supportedLanguages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Drop Zone */}
          {!result && (
            <DropZone
              files={files}
              onFilesAdd={addFiles}
              onFileRemove={removeFile}
              isDragging={isDragging}
              setIsDragging={setIsDragging}
              accept="image/*"
              multiple={false}
              error={error}
            />
          )}

          {/* Extract Button */}
          {files.length > 0 && !result && (
            <div className="mt-6">
              {extracting ? (
                <div className="flex items-center justify-center gap-3 text-[var(--color-primary)]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('tools.ocr.extracting')}</span>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button
                    onClick={handleExtract}
                    className="flex-1 bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90
                             text-white font-semibold py-6"
                  >
                    {t('tools.ocr.title')}
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    {t('common.clear')}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-[var(--color-text)]">
                  {t('tools.ocr.result')}
                </h4>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? (
                      <Check className="w-4 h-4 mr-2" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    {t('tools.ocr.copyText')}
                  </Button>
                </div>
              </div>
              
              <Textarea
                value={result.text || t('tools.ocr.noText')}
                readOnly
                className="min-h-[200px] font-mono text-sm"
              />
              
              {result.confidence > 0 && (
                <p className="text-sm text-[var(--color-muted)]">
                  Confidence: {result.confidence.toFixed(1)}%
                </p>
              )}
              
              <Button onClick={handleReset} variant="outline" className="w-full">
                {t('common.convert')} More
              </Button>
            </div>
          )}
        </Card>

        <FAQ />
      </div>
    </>
  );
};

export default OcrTool;
