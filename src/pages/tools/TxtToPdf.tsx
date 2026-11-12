import React from 'react';
import { ToolLayout } from '@/components/ui-custom/ToolLayout';
import { txtToPdf } from '@/tools/documentConverter';
import type { FileWithPreview } from '@/types';

const TxtToPdf: React.FC = () => {

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
      const pdfBlob = await txtToPdf(f.file);
      options.setProgress(endP);

      f.result = pdfBlob;
      f.resultUrl = URL.createObjectURL(pdfBlob);
    }
    options.setProgress(100);
  };

  return (
    <ToolLayout
      toolId="txt-to-pdf"
      title="TXT / HTML a PDF"
      description="Convierte archivos de texto plano (.txt) o páginas HTML a documentos PDF profesionales con paginación limpia."
      seoTitle="Convertir TXT o HTML a PDF Online Gratis | ConvertMyFilePro"
      seoDescription="Convierte archivos de texto y código HTML a PDF sin software adicional. 100% en el navegador y con total privacidad."
      accept=".txt,.html,.htm,text/plain,text/html"
      multiple={true}
      maxFiles={20}
      onConvert={handleConvert}
      outputFormat="pdf"
      keywords={['txt to pdf', 'html to pdf', 'convert text to pdf']}
      proRequired={{ maxFiles: 3, trigger: 'batch' }}
    />
  );
};

export default TxtToPdf;
