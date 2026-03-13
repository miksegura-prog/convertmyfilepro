import { useState, useCallback } from 'react';
import type { FileWithPreview } from '@/types';
import { createFileWithPreview, validateFileSize, validateFileType } from '@/utils/fileHelpers';

interface UseFileUploadOptions {
  maxFiles?: number;
  maxSizeMB?: number;
  allowedTypes?: string[];
  multiple?: boolean;
}

interface UseFileUploadReturn {
  files: FileWithPreview[];
  isDragging: boolean;
  error: string | null;
  addFiles: (files: FileList | null) => Promise<void>;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  setIsDragging: (dragging: boolean) => void;
}

export const useFileUpload = (options: UseFileUploadOptions = {}): UseFileUploadReturn => {
  const {
    maxFiles = 10,
    maxSizeMB = 50,
    allowedTypes,
    multiple = true
  } = options;

  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback(async (newFiles: FileList | null) => {
    setError(null);
    
    if (!newFiles || newFiles.length === 0) return;

    const filesArray = Array.from(newFiles);
    
    // Check max files limit
    if (multiple && files.length + filesArray.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate each file
    for (const file of filesArray) {
      if (!validateFileSize(file, maxSizeMB)) {
        setError(`File size must be less than ${maxSizeMB}MB`);
        return;
      }

      if (allowedTypes && !validateFileType(file, allowedTypes)) {
        setError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
        return;
      }
    }

    try {
      const filesWithPreview = await Promise.all(
        filesArray.map(file => createFileWithPreview(file))
      );

      setFiles(prev => multiple ? [...prev, ...filesWithPreview] : filesWithPreview);
    } catch (err) {
      setError('Failed to process files');
    }
  }, [files.length, maxFiles, maxSizeMB, allowedTypes, multiple]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.resultUrl) {
        URL.revokeObjectURL(file.resultUrl);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const clearFiles = useCallback(() => {
    files.forEach(file => {
      if (file.resultUrl) {
        URL.revokeObjectURL(file.resultUrl);
      }
    });
    setFiles([]);
    setError(null);
  }, [files]);

  return {
    files,
    isDragging,
    error,
    addFiles,
    removeFile,
    clearFiles,
    setIsDragging
  };
};
