import React from 'react';
import { Download, Check, FileText } from 'lucide-react';
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
  const isReduced = resultSize > 0 && resultSize < file.file.size;
  const sizeReduction = isReduced 
    ? ((file.file.size - resultSize) / file.file.size * 100).toFixed(1)
    : '0';

  const isAudio = file.result instanceof Blob && (file.result.type.startsWith('audio/') || outputFormat === 'mp3');
  const isVideo = file.result instanceof Blob && (file.result.type.startsWith('video/') || outputFormat === 'mp4');
  const isImage = file.result instanceof Blob && file.result.type.startsWith('image/');
  const isPdf = file.result instanceof Blob && file.result.type === 'application/pdf';

  return (
    <Card className="p-5 md:p-6 bg-gradient-to-br from-green-50 to-emerald-50 
                     dark:from-green-900/20 dark:to-emerald-900/20
                     border-green-200 dark:border-green-800">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Success Icon */}
          <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-green-500/20">
            <Check className="w-6 h-6 text-white" />
          </div>
          
          {/* File Info */}
          <div className="min-w-0">
            <h4 className="text-base font-semibold text-green-800 dark:text-green-300">
              {t('common.success')}!
            </h4>
            <p className="text-sm text-green-700 dark:text-green-400 truncate max-w-xs sm:max-w-md">
              {file.file.name}
            </p>
            
            {/* Size Comparison */}
            {resultSize > 0 && (
              <div className="flex items-center gap-2 mt-1 text-xs text-green-600 dark:text-green-500">
                <span>{formatFileSize(file.file.size)} → {formatFileSize(resultSize)}</span>
                {parseFloat(sizeReduction) > 0 && (
                  <span className="bg-green-200 dark:bg-green-800 font-medium px-2 py-0.5 rounded-full">
                    -{sizeReduction}%
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Download Button */}
        <Button
          onClick={handleDownload}
          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white
                   shadow-md shadow-green-600/30 transition-all flex items-center justify-center"
        >
          <Download className="w-4 h-4 mr-2" />
          {t('common.download')}
        </Button>
      </div>
      
      {/* Live Previews */}
      {file.result instanceof Blob && (
        <div className="mt-4 pt-4 border-t border-green-200/60 dark:border-green-800/40">
          {/* Image Preview */}
          {isImage && (
            <div className="text-center">
              <img
                src={URL.createObjectURL(file.result)}
                alt="Result preview"
                className="max-h-56 mx-auto rounded-lg shadow-md object-contain"
              />
            </div>
          )}

          {/* Audio Player Preview */}
          {isAudio && (
            <div className="bg-white/80 dark:bg-black/20 p-3 rounded-xl">
              <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-2">
                Vista previa de audio:
              </p>
              <audio
                controls
                src={URL.createObjectURL(file.result)}
                className="w-full h-10"
              />
            </div>
          )}

          {/* Video Player Preview */}
          {isVideo && (
            <div className="bg-white/80 dark:bg-black/20 p-3 rounded-xl text-center">
              <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-2 text-left">
                Vista previa de vídeo optimizado:
              </p>
              <video
                controls
                playsInline
                src={URL.createObjectURL(file.result)}
                className="max-h-64 mx-auto rounded-lg shadow-md bg-black"
              />
            </div>
          )}

          {/* PDF Viewer preview trigger */}
          {isPdf && (
            <div className="flex items-center justify-between bg-white/70 dark:bg-black/20 p-3 rounded-xl text-xs text-green-800 dark:text-green-300">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-500" />
                <span>Documento PDF generado y listo para guardar</span>
              </div>
              <a
                href={URL.createObjectURL(file.result)}
                target="_blank"
                rel="noreferrer"
                className="underline font-medium hover:text-green-950"
              >
                Abrir en nueva pestaña
              </a>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

