import { PDFDocument, PDFImage } from 'pdf-lib';
import { readFileAsArrayBuffer } from '@/utils/fileHelpers';

export const mergePdfs = async (files: File[]): Promise<Blob> => {
  const mergedPdf = await PDFDocument.create();
  
  for (const file of files) {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach(page => mergedPdf.addPage(page));
  }
  
  const pdfBytes = await mergedPdf.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
};

export const splitPdf = async (
  file: File,
  pageRanges: string
): Promise<Blob[]> => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(arrayBuffer);
  const totalPages = pdf.getPageCount();
  
  const pagesToExtract = parsePageRanges(pageRanges, totalPages);
  const resultBlobs: Blob[] = [];
  
  // Group consecutive pages
  const groups: number[][] = [];
  let currentGroup: number[] = [];
  
  for (let i = 0; i < pagesToExtract.length; i++) {
    if (i === 0 || pagesToExtract[i] === pagesToExtract[i - 1] + 1) {
      currentGroup.push(pagesToExtract[i]);
    } else {
      groups.push([...currentGroup]);
      currentGroup = [pagesToExtract[i]];
    }
  }
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }
  
  // Create separate PDF for each group
  for (const group of groups) {
    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(pdf, group);
    copiedPages.forEach(page => newPdf.addPage(page));
    
    const pdfBytes = await newPdf.save();
    resultBlobs.push(new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' }));
  }
  
  return resultBlobs;
};

const parsePageRanges = (rangeStr: string, totalPages: number): number[] => {
  const pages = new Set<number>();
  const parts = rangeStr.split(',').map(p => p.trim());
  
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(n => parseInt(n.trim()));
      for (let i = start; i <= end && i <= totalPages; i++) {
        if (i >= 1) pages.add(i - 1); // Convert to 0-based index
      }
    } else {
      const page = parseInt(part);
      if (page >= 1 && page <= totalPages) {
        pages.add(page - 1);
      }
    }
  }
  
  return Array.from(pages).sort((a, b) => a - b);
};

export const compressPdf = async (file: File): Promise<Blob> => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(arrayBuffer, {
    updateMetadata: false
  });
  
  // Compress by saving with optimization
  const pdfBytes = await pdf.save({
    useObjectStreams: true,
    addDefaultPage: false
  });
  
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
};

export const pdfToJpg = async (_file: File): Promise<Blob[]> => {
  // For now, return empty array - pdf.js integration can be added later
  // This is a placeholder that would need pdf.js to be properly set up
  throw new Error('PDF to JPG conversion requires pdf.js setup');
};

export const jpgToPdf = async (files: File[]): Promise<Blob> => {
  const pdf = await PDFDocument.create();
  
  for (const file of files) {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    let image: PDFImage;
    
    if (file.type === 'image/png') {
      image = await pdf.embedPng(arrayBuffer);
    } else {
      image = await pdf.embedJpg(arrayBuffer);
    }
    
    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height
    });
  }
  
  const pdfBytes = await pdf.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
};

export const getPdfPageCount = async (file: File): Promise<number> => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(arrayBuffer);
  return pdf.getPageCount();
};
