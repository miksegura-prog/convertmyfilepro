import type { BlogPost } from '../types';

import { wavToMp3Guide } from './convertir-wav-a-mp3-navegador-guide';
import { compressVideoGuide } from './comprimir-video-para-whatsapp-sin-perder-calidad-guide';
import { docxToPdfGuide } from './convertir-word-docx-a-pdf-sin-word-guide';
import { xlsxToPdfGuide } from './convertir-excel-xlsx-a-pdf-tablas-perfectas-guide';
import { ocrGuide } from './extraer-texto-de-imagenes-ocr-gratis-guide';
import { mergePdfGuide } from './unir-archivos-pdf-online-gratis-guide';
import { splitPdfGuide } from './dividir-paginas-pdf-extraer-documentos-guide';
import { jpgToPdfGuide } from './convertir-imagenes-jpg-a-pdf-alta-calidad-guide';
import { compressImageGuide } from './comprimir-imagenes-web-sin-perder-nitidez-guide';
import { pngJpgFormatsGuide } from './convertir-png-a-jpg-y-viceversa-guia-formatos-guide';

export const blogPosts: BlogPost[] = [
  wavToMp3Guide,
  compressVideoGuide,
  docxToPdfGuide,
  xlsxToPdfGuide,
  ocrGuide,
  mergePdfGuide,
  splitPdfGuide,
  jpgToPdfGuide,
  compressImageGuide,
  pngJpgFormatsGuide
];

export {
  wavToMp3Guide,
  compressVideoGuide,
  docxToPdfGuide,
  xlsxToPdfGuide,
  ocrGuide,
  mergePdfGuide,
  splitPdfGuide,
  jpgToPdfGuide,
  compressImageGuide,
  pngJpgFormatsGuide
};

export const getPostBySlug = (slug: string): BlogPost | undefined => {
  return blogPosts.find(post => post.slug === slug);
};

export const getPostsByCategory = (category: string): BlogPost[] => {
  return blogPosts.filter(post =>
    post.es.category.toLowerCase() === category.toLowerCase() ||
    post.en.category.toLowerCase() === category.toLowerCase()
  );
};

export const getPublishedPosts = (): BlogPost[] => {
  const today = new Date().toISOString().split('T')[0];
  return blogPosts.filter(post => post.publishDate <= today);
};

export const getFeaturedPosts = (): BlogPost[] => {
  return blogPosts.filter(post => post.featured);
};

export const getRecentPosts = (count: number = 5): BlogPost[] => {
  return [...blogPosts]
    .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
    .slice(0, count);
};

export const getAllCategories = (): string[] => {
  const categories = new Set(blogPosts.map(post => post.es.category));
  return Array.from(categories);
};

export const getAllTags = (): string[] => {
  const tags = new Set(blogPosts.flatMap(post => [...post.es.tags, ...post.en.tags]));
  return Array.from(tags);
};
