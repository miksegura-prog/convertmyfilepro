import React from 'react';
import { Download, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FileWithPreview } from '@/types';
import { formatFileSize, downloadBlob } from '@/utils/fileHelpers';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ConversionResultProps {
  file: FileWithPreview;
  onDownload?: () => void;
  outputFormat?: string;
}

export const ConversionResult: React.FC<ConversionResultProps> = ({
  file,
  onDownload,
  outputFormat
}) => {
  const { t } = useTranslation();

  const handleDownload = () => {
    if (file.result instanceof Blob) {
      const extension = outputFormat || file.file.name.split('.').pop() || 'bin';
      const baseName = file.file.name.replace(/\.[^/.]+$/, '');
      downloadBlob(file.result, `${baseName}_converted.${extension}`);
    }
    onDownload?.();
  };

  const resultSize = file.result instanceof Blob ? file.result.size : 0;
  const sizeReduction = resultSize > 0 
    ? ((file.file.size - resultSize) / file.file.size * 100).toFixed(1)
    : '0';

  return (
    <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 
                     dark:from-green-900/20 dark:to-emerald-900/20
                     border-green-200 dark:border-green-800">
      <div className="flex items-center gap-4">
        {/* Success Icon */}
        <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center
                      shadow-lg shadow-green-500/30">
          <Check className="w-7 h-7 text-white" />
        </div>
        
        {/* File Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-semibold text-green-800 dark:text-green-300">
            {t('common.success')}!
          </h4>
          <p className="text-sm text-green-700 dark:text-green-400 truncate">
            {file.file.name}
          </p>
          
          {/* Size Comparison */}
          {resultSize > 0 && (
            <div className="flex items-center gap-4 mt-2 text-xs text-green-600 dark:text-green-500">
              <span>{formatFileSize(file.file.size)} → {formatFileSize(resultSize)}</span>
              {parseFloat(sizeReduction) > 0 && (
                <span className="bg-green-200 dark:bg-green-800 px-2 py-0.5 rounded-full">
                  -{sizeReduction}%
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Download Button */}
        <Button
          onClick={handleDownload}
          className="bg-green-600 hover:bg-green-700 text-white
                   shadow-lg shadow-green-600/30 transition-all
                   hover:shadow-xl hover:shadow-green-600/40"
        >
          <Download className="w-4 h-4 mr-2" />
          {t('common.download')}
        </Button>
      </div>
      
      {/* Preview */}
      {file.result instanceof Blob && file.result.type.startsWith('image/') && (
        <div className="mt-4">
          <img
            src={URL.createObjectURL(file.result)}
            alt="Result preview"
            className="max-h-48 mx-auto rounded-lg shadow-md"
          />
        </div>
      )}
    </Card>
  );
};
