import React from 'react';
import { ToolLayout } from '@/components/ui-custom/ToolLayout';
import { xlsxToPdf } from '@/tools/documentConverter';
import type { FileWithPreview } from '@/types';

const XlsxToPdf: React.FC = () => {

  const handleConvert = async (
    files: FileWithPreview[],
    options: { setProgress: (p: number) => void }
  ) => {
    const total = files.length;
    for (let i = 0; i < total; i++) {
      const f = files[i];
      const startP = Math.round((i / total) * 100);
      const endP = Math.round(((i + 1) / total) * 100);

      options.setProgress(startP + 20);
      const pdfBlob = await xlsxToPdf(f.file);
      options.setProgress(endP);

      f.result = pdfBlob;
      f.resultUrl = URL.createObjectURL(pdfBlob);
    }
    options.setProgress(100);
  };

  return (
    <ToolLayout
      toolId="xlsx-to-pdf"
      title="Excel (XLSX) a PDF"
      description="Convierte hojas de cálculo de Excel (.xlsx, .xls) a documentos PDF organizados y listos para compartir o imprimir."
      seoTitle="Convertir Excel XLSX a PDF Online Gratis | ConvertMyFilePro"
      seoDescription="Convierte archivos de Excel XLSX a formato PDF en línea. Gratis, instantáneo y procesado con privacidad total en tu navegador."
      accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
      multiple={true}
      maxFiles={20}
      onConvert={handleConvert}
      outputFormat="pdf"
      keywords={['xlsx to pdf', 'excel to pdf', 'convert spreadsheet to pdf']}
    />
  );
};

export default XlsxToPdf;
