import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { readFileAsArrayBuffer, readFileAsText } from '@/utils/fileHelpers';

/**
 * Renders formatted multi-line text into a cleanly paginated PDF using pdf-lib
 */
export const textToPdf = async (text: string, title?: string): Promise<Blob> => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const fontSize = 11;
  const lineHeight = fontSize * 1.4;
  const margin = 50;
  const pageWidth = 595.28; // A4
  const pageHeight = 841.89; // A4
  const printableWidth = pageWidth - margin * 2;
  const maxLinesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);

  // Split text into lines and wrap words
  const rawParagraphs = text.replace(/\r\n/g, '\n').split('\n');
  const wrappedLines: { text: string; isTitle?: boolean }[] = [];

  if (title) {
    wrappedLines.push({ text: title, isTitle: true });
    wrappedLines.push({ text: '' });
  }

  for (const paragraph of rawParagraphs) {
    if (!paragraph.trim()) {
      wrappedLines.push({ text: '' });
      continue;
    }

    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width <= printableWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) wrappedLines.push({ text: currentLine });
        currentLine = word;
      }
    }
    if (currentLine) {
      wrappedLines.push({ text: currentLine });
    }
  }

  // Generate pages
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let lineCountOnPage = 0;

  for (const lineObj of wrappedLines) {
    if (lineCountOnPage >= maxLinesPerPage) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      lineCountOnPage = 0;
    }

    if (lineObj.text) {
      const y = pageHeight - margin - (lineCountOnPage + 1) * lineHeight;
      const usedFont = lineObj.isTitle ? boldFont : font;
      const usedSize = lineObj.isTitle ? 16 : fontSize;

      currentPage.drawText(lineObj.text, {
        x: margin,
        y,
        size: usedSize,
        font: usedFont,
        color: rgb(0.1, 0.15, 0.2),
      });
    }

    lineCountOnPage += lineObj.isTitle ? 2 : 1;
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
};

/**
 * Converts DOCX file to cleanly formatted PDF completely in-browser
 */
export const docxToPdf = async (file: File): Promise<Blob> => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const result = await mammoth.extractRawText({ arrayBuffer });
  const rawText = result.value || 'Empty document';
  const docTitle = file.name.replace(/\.docx$/i, '');
  return textToPdf(rawText, docTitle);
};

/**
 * Converts XLSX spreadsheet to PDF table layout in-browser
 */
export const xlsxToPdf = async (file: File): Promise<Blob> => {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Read all sheets into text/table representation
  let fullText = '';
  for (const sheetName of workbook.SheetNames) {
    fullText += `=== Sheet: ${sheetName} ===\n\n`;
    const worksheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    // Format CSV lines cleanly
    const lines = csv.split('\n');
    for (const line of lines) {
      const cells = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cells.some(c => c.length > 0)) {
        fullText += cells.join('  |  ') + '\n';
      }
    }
    fullText += '\n\n';
  }

  const docTitle = file.name.replace(/\.xlsx$/i, '');
  return textToPdf(fullText, docTitle);
};

/**
 * Converts plain text or HTML files to PDF
 */
export const txtToPdf = async (file: File): Promise<Blob> => {
  let content = await readFileAsText(file);
  // If HTML, strip basic tags for clean text reading
  if (file.type.includes('html') || file.name.endsWith('.html')) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    content = tempDiv.textContent || tempDiv.innerText || content;
  }
  const title = file.name.replace(/\.[^/.]+$/, '');
  return textToPdf(content, title);
};
