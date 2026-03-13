import { canvasToBlob } from '@/utils/fileHelpers';
import imageCompression from 'browser-image-compression';

export interface ConvertImageOptions {
  format: 'jpeg' | 'png' | 'webp';
  quality?: number;
}

export const convertImage = async (
  file: File,
  options: ConvertImageOptions
): Promise<Blob> => {
  const { format, quality = 0.92 } = options;
  
  // If it's already the target format, just compress if needed
  const currentFormat = file.type.split('/')[1];
  if (currentFormat === format && quality >= 0.95) {
    return file;
  }

  // Create image element
  const img = new Image();
  const url = URL.createObjectURL(file);
  
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    
    // Draw image
    ctx.drawImage(img, 0, 0);
    
    // Convert to blob
    const mimeType = `image/${format}`;
    const blob = await canvasToBlob(canvas, mimeType, quality);
    
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const resizeImage = async (
  file: File,
  width: number,
  height: number,
  maintainAspectRatio: boolean = true
): Promise<Blob> => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });

    let targetWidth = width;
    let targetHeight = height;

    if (maintainAspectRatio) {
      const aspectRatio = img.width / img.height;
      
      if (width && !height) {
        targetHeight = Math.round(width / aspectRatio);
      } else if (height && !width) {
        targetWidth = Math.round(height * aspectRatio);
      } else if (width && height) {
        // Fit within bounds while maintaining aspect ratio
        const targetRatio = width / height;
        if (aspectRatio > targetRatio) {
          targetHeight = Math.round(width / aspectRatio);
        } else {
          targetWidth = Math.round(height * aspectRatio);
        }
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    
    // Use better quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    
    const format = file.type || 'image/jpeg';
    const blob = await canvasToBlob(canvas, format, 0.95);
    
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const compressImage = async (
  file: File,
  quality: number = 0.8,
  maxWidthOrHeight: number = 4096
): Promise<Blob> => {
  const options = {
    maxSizeMB: file.size / (1024 * 1024) * quality,
    maxWidthOrHeight,
    useWebWorker: true,
    fileType: file.type,
    initialQuality: quality
  };

  const compressedFile = await imageCompression(file, options);
  return compressedFile;
};

export const enhanceImage = async (file: File): Promise<Blob> => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    
    // Apply sharpening and contrast enhancement
    ctx.filter = 'contrast(1.1) saturate(1.1)';
    ctx.drawImage(img, 0, 0);
    
    // Apply unsharp mask effect
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const sharpened = applySharpen(imageData);
    ctx.putImageData(sharpened, 0, 0);
    
    const format = file.type || 'image/jpeg';
    const blob = await canvasToBlob(canvas, format, 0.95);
    
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
};

// Simple sharpening convolution
const applySharpen = (imageData: ImageData): ImageData => {
  const { width, height, data } = imageData;
  const output = new ImageData(width, height);
  const outputData = output.data;
  
  // Sharpen kernel
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0, g = 0, b = 0;
      
      for (let ky = 0; ky < 3; ky++) {
        for (let kx = 0; kx < 3; kx++) {
          const idx = ((y + ky - 1) * width + (x + kx - 1)) * 4;
          const kidx = ky * 3 + kx;
          
          r += data[idx] * kernel[kidx];
          g += data[idx + 1] * kernel[kidx];
          b += data[idx + 2] * kernel[kidx];
        }
      }
      
      const idx = (y * width + x) * 4;
      outputData[idx] = Math.min(255, Math.max(0, r));
      outputData[idx + 1] = Math.min(255, Math.max(0, g));
      outputData[idx + 2] = Math.min(255, Math.max(0, b));
      outputData[idx + 3] = data[idx + 3];
    }
  }
  
  return output;
};

export const convertHeicToJpg = async (file: File): Promise<Blob> => {
  // Dynamically import heic2any to avoid issues if not needed
  const heic2any = await import('heic2any');
  
  const result = await heic2any.default({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.92
  });
  
  return result as Blob;
};

export const addWatermark = async (
  file: File,
  text: string,
  options: {
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity?: number;
    fontSize?: number;
    color?: string;
  } = {}
): Promise<Blob> => {
  const {
    position = 'bottom-right',
    opacity = 0.5,
    fontSize = 48,
    color = 'white'
  } = options;

  const img = new Image();
  const url = URL.createObjectURL(file);
  
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    
    // Draw original image
    ctx.drawImage(img, 0, 0);
    
    // Configure watermark text
    ctx.globalAlpha = opacity;
    ctx.font = `${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    
    // Calculate position
    const padding = 20;
    const textWidth = ctx.measureText(text).width;
    let x = padding;
    let y = padding;
    
    switch (position) {
      case 'top-right':
        x = canvas.width - textWidth - padding;
        break;
      case 'bottom-left':
        y = canvas.height - fontSize - padding;
        break;
      case 'bottom-right':
        x = canvas.width - textWidth - padding;
        y = canvas.height - fontSize - padding;
        break;
      case 'center':
        x = (canvas.width - textWidth) / 2;
        y = canvas.height / 2;
        break;
    }
    
    // Draw watermark
    ctx.fillText(text, x, y);
    
    // Reset alpha
    ctx.globalAlpha = 1;
    
    const format = file.type || 'image/jpeg';
    const blob = await canvasToBlob(canvas, format, 0.95);
    
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
};
