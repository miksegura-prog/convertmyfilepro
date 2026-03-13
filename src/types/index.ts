export interface Tool {
  id: string;
  title: string;
  description: string;
  category: 'images' | 'pdf' | 'documents' | 'bonus';
  icon: string;
  path: string;
  color: string;
}

export interface FileWithPreview {
  file: File;
  id: string;
  preview?: string;
  progress?: number;
  result?: Blob;
  resultUrl?: string;
  error?: string;
}

export interface ConversionOptions {
  quality?: number;
  width?: number;
  height?: number;
  maintainAspectRatio?: boolean;
  format?: string;
  pageRange?: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface OcrResult {
  text: string;
  confidence: number;
}

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'heic';
export type PdfOperation = 'merge' | 'split' | 'compress' | 'toJpg' | 'fromJpg';
export type DocumentFormat = 'docx' | 'pdf' | 'txt';

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  category: string;
  content: string;
  image?: string;
}

export interface SeoMeta {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  canonical?: string;
}

export interface AdSlot {
  id: string;
  position: 'top' | 'sidebar' | 'bottom' | 'inline';
  size: string;
}
