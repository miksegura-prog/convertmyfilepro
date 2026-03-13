import React, { useRef, useCallback } from 'react';
import { Upload, X, File, Image, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FileWithPreview } from '@/types';
import { formatFileSize } from '@/utils/fileHelpers';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface DropZoneProps {
  files: FileWithPreview[];
  onFilesAdd: (files: FileList | null) => void;
  onFileRemove: (id: string) => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  accept?: string;
  multiple?: boolean;
  error?: string | null;
}

const getFileIcon = (file: File) => {
  if (file.type.startsWith('image/')) {
    return <Image className="w-5 h-5" />;
  }
  if (file.type === 'application/pdf') {
    return <FileText className="w-5 h-5" />;
  }
  return <File className="w-5 h-5" />;
};

export const DropZone: React.FC<DropZoneProps> = ({
  files,
  onFilesAdd,
  onFileRemove,
  isDragging,
  setIsDragging,
  accept = '*/*',
  multiple = true,
  error
}) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, [setIsDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, [setIsDragging]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    onFilesAdd(e.dataTransfer.files);
  }, [onFilesAdd, setIsDragging]);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilesAdd(e.target.files);
    e.target.value = ''; // Reset input
  };

  return (
    <div className="w-full">
      {/* Drop Zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
          transition-all duration-300 ease-in-out
          ${isDragging 
            ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]/10' 
            : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-bg)]'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-4">
          <div className={`
            w-16 h-16 rounded-full flex items-center justify-center
            transition-all duration-300
            ${isDragging 
              ? 'bg-[var(--color-accent)] text-white' 
              : 'bg-[var(--color-bg)] text-[var(--color-primary)]'
            }
          `}>
            <Upload className="w-8 h-8" />
          </div>
          
          <div>
            <p className="text-lg font-medium text-[var(--color-text)]">
              {t('common.dragDrop')}
            </p>
            <p className="text-sm text-[var(--color-muted)] mt-1">
              {t('common.orBrowse')}
            </p>
          </div>
          
          <p className="text-xs text-[var(--color-muted)]">
            {t('common.fileSizeLimit', { size: 50 })}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-[var(--color-text)]">
              {multiple ? `${files.length} file(s) selected` : 'File selected'}
            </h4>
            {multiple && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => files.forEach(f => onFileRemove(f.id))}
                className="text-[var(--color-muted)] hover:text-red-500"
              >
                <X className="w-4 h-4 mr-1" />
                {t('common.clear')}
              </Button>
            )}
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-white dark:bg-[var(--color-card)] 
                         border border-[var(--color-border)] rounded-xl
                         shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Preview or Icon */}
                <div className="flex-shrink-0">
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.file.name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-[var(--color-bg)] rounded-lg 
                                  flex items-center justify-center text-[var(--color-primary)]">
                      {getFileIcon(file.file)}
                    </div>
                  )}
                </div>
                
                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)] truncate">
                    {file.file.name}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    {formatFileSize(file.file.size)}
                  </p>
                  {file.progress !== undefined && file.progress < 100 && (
                    <Progress value={file.progress} className="h-1 mt-2" />
                  )}
                </div>
                
                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onFileRemove(file.id)}
                  className="flex-shrink-0 text-[var(--color-muted)] hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
