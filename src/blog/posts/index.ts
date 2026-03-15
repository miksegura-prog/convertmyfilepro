import type { BlogPost } from '../types';

import { jpgToPngGuide } from './jpg-to-png-guide';
import { compressImagesGuide } from './compress-images-guide';
import { mergePdfGuide } from './merge-pdf-guide';
import { ocrGuide } from './ocr-guide';
import { resizeImagesGuide } from './resize-images-guide';
import { splitPdfGuide } from './split-pdf-guide';
import { heicToJpgGuide } from './heic-to-jpg-guide';
import { webpGuide } from './webp-guide';
import { jpgToPdfGuide } from './jpg-to-pdf-guide';

// Export all posts
export const blogPosts: BlogPost[] = [
  jpgToPngGuide,
  compressImagesGuide,
  mergePdfGuide,
  ocrGuide,
  resizeImagesGuide,
  splitPdfGuide,
  heicToJpgGuide,
  webpGuide,
  jpgToPdfGuide
];

// Export individual posts for direct import
export {
  jpgToPngGuide,
  compressImagesGuide,
  mergePdfGuide,
  ocrGuide,
  resizeImagesGuide,
  splitPdfGuide,
  heicToJpgGuide,
  webpGuide,
  jpgToPdfGuide
};

// Helper functions
export const getPostBySlug = (slug: string): BlogPost | undefined => {
  return blogPosts.find(post => post.slug === slug);
};

export const getPostsByCategory = (category: string): BlogPost[] => {
  return blogPosts.filter(post => 
    post.category.toLowerCase() === category.toLowerCase()
  );
};

export const getFeaturedPosts = (): BlogPost[] => {
  return blogPosts.filter(post => post.featured);
};

export const getRecentPosts = (count: number = 5): BlogPost[] => {
  return [...blogPosts]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, count);
};

export const getAllCategories = (): string[] => {
  const categories = new Set(blogPosts.map(post => post.category));
  return Array.from(categories);
};

export const getAllTags = (): string[] => {
  const tags = new Set(blogPosts.flatMap(post => post.tags));
  return Array.from(tags);
};
