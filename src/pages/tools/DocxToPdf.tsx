import React from 'react';
import { ToolLayout } from '@/components/ui-custom/ToolLayout';
import { docxToPdf } from '@/tools/documentConverter';
import type { FileWithPreview } from '@/types';

const DocxToPdf: React.FC = () => {

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
      const pdfBlob = await docxToPdf(f.file);
      options.setProgress(endP);

      f.result = pdfBlob;
      f.resultUrl = URL.createObjectURL(pdfBlob);
    }
    options.setProgress(100);
  };

  return (
    <ToolLayout
      toolId="docx-to-pdf"
      title="DOCX a PDF"
      description="Convierte documentos Word (.docx) a documentos PDF con formato limpio y listo para imprimir o enviar."
      seoTitle="Convertir DOCX a PDF Online Gratis | ConvertMyFilePro"
      seoDescription="Convierte archivos de Word DOCX a formato PDF en línea. Gratis, instantáneo y procesado de forma confidencial en tu dispositivo."
      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      multiple={true}
      maxFiles={20}
      onConvert={handleConvert}
      outputFormat="pdf"
      keywords={['docx to pdf', 'convert word to pdf', 'word to pdf online free']}
    />
  );
};

export default DocxToPdf;
