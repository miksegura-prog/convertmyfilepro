import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, FileText } from 'lucide-react';
import { getSeoTool, getRelatedTools } from '@/data/seoTools';
import { SEO, FAQSchema } from '@/components/ui-custom/SEO';
import { ToolLayout } from '@/components/ui-custom/ToolLayout';
import { convertImage } from '@/tools/imageConverter';
import { convertAudioToMp3, convertAudioToWav } from '@/tools/audioConverter';
import { mergePdfs, splitPdf, compressPdf, jpgToPdf } from '@/tools/pdfTools';
import { docxToPdf, xlsxToPdf, txtToPdf } from '@/tools/documentConverter';
import { compressVideoForWhatsApp } from '@/tools/videoCompressor';
import { compressImage, resizeImage, convertHeicToJpg } from '@/tools/imageConverter';
import { srtToVtt, vttToSrt, txtToSrt } from '@/tools/subtitleConverter';
import type { FileWithPreview } from '@/types';
import { Card } from '@/components/ui/card';
const SeoToolPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { i18n } = useTranslation();
  const isSpanish = i18n.language?.startsWith('es');
  const tool = slug ? getSeoTool(slug) : undefined;

  if (!tool) {
    return (
      <div className="text-center py-20">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p>Tool not found</p>
        <Link to="/">Go home</Link>
      </div>
    );
  }

  const title = isSpanish ? tool.h1Es : tool.h1;
  const desc = tool.seoDescription;
  const keywords = isSpanish ? tool.keywordsEs : tool.keywords;
  const faqs = isSpanish ? tool.faqItemsEs : tool.faqItems;
  const steps = isSpanish ? tool.howToStepsEs : tool.howToSteps;
  const related = slug ? getRelatedTools(slug) : [];

  const handleConvert = async (files: FileWithPreview[], o: { setProgress: (p: number) => void }) => {
    const n = files.length;
    switch (tool.converterType) {
      case 'image-convert': {
        const format = tool.converterOptions?.format;
        const fmt = format === 'jpeg' || format === 'png' || format === 'webp' || format === 'avif'
          ? format
          : 'png';
        const q = tool.converterOptions?.quality as number;
        for (let i = 0; i < n; i++) {
          o.setProgress((i / n) * 50);
          files[i].result = await convertImage(files[i].file, { format: fmt, quality: q });
          files[i].resultUrl = URL.createObjectURL(files[i].result!);
          o.setProgress(((i + 1) / n) * 100);
        }
        break;
      }
      case 'image-compress': {
        for (let i = 0; i < n; i++) {
          o.setProgress((i / n) * 50);
          files[i].result = await compressImage(files[i].file, 0.8);
          files[i].resultUrl = URL.createObjectURL(files[i].result!);
          o.setProgress(((i + 1) / n) * 100);
        }
        break;
      }
      case 'image-resize': {
        files[0].result = await resizeImage(files[0].file, 0, 0, true);
        files[0].resultUrl = URL.createObjectURL(files[0].result!);
        o.setProgress(100);
        break;
      }
      case 'heic-to-jpg': {
        for (let i = 0; i < n; i++) {
          o.setProgress((i / n) * 50);
          files[i].result = await convertHeicToJpg(files[i].file);
          files[i].resultUrl = URL.createObjectURL(files[i].result!);
          o.setProgress(((i + 1) / n) * 100);
        }
        break;
      }
      case 'audio-to-mp3': {
        for (let i = 0; i < n; i++) {
          const sp = Math.round((i / n) * 100);
          const ep = Math.round(((i + 1) / n) * 100);
          files[i].result = await convertAudioToMp3(files[i].file, {
            bitrate: 128, onProgress: (p) => o.setProgress(sp + Math.round((p / 100) * (ep - sp)))
          });
          files[i].resultUrl = URL.createObjectURL(files[i].result!);
        }
        o.setProgress(100);
        break;
      }
      case 'audio-to-wav': {
        for (let i = 0; i < n; i++) {
          const sp = Math.round((i / n) * 100);
          const ep = Math.round(((i + 1) / n) * 100);
          files[i].result = await convertAudioToWav(files[i].file, {
            onProgress: (p) => o.setProgress(sp + Math.round((p / 100) * (ep - sp))),
          });
          files[i].resultUrl = URL.createObjectURL(files[i].result!);
        }
        o.setProgress(100);
        break;
      }
      case 'video-compress': {
        files[0].result = await compressVideoForWhatsApp(files[0].file, {
          targetSizeMB: 15, onProgress: (p) => o.setProgress(p)
        });
        files[0].resultUrl = URL.createObjectURL(files[0].result!);
        o.setProgress(100);
        break;
      }
      case 'pdf-merge': {
        o.setProgress(30);
        const blob = await mergePdfs(files.map(f => f.file));
        o.setProgress(100);
        files[0].result = blob; files[0].resultUrl = URL.createObjectURL(blob);
        break;
      }
      case 'pdf-split': {
        o.setProgress(30);
        const blobs = await splitPdf(files[0].file, '1-2');
        o.setProgress(100);
        files[0].result = blobs[0]; files[0].resultUrl = URL.createObjectURL(blobs[0]);
        break;
      }
      case 'pdf-compress': {
        for (let i = 0; i < n; i++) {
          o.setProgress((i / n) * 50);
          files[i].result = await compressPdf(files[i].file);
          files[i].resultUrl = URL.createObjectURL(files[i].result!);
          o.setProgress(((i + 1) / n) * 100);
        }
        break;
      }
      case 'images-to-pdf': {
        o.setProgress(30);
        const blob = await jpgToPdf(files.map(f => f.file));
        o.setProgress(100);
        files[0].result = blob; files[0].resultUrl = URL.createObjectURL(blob);
        break;
      }
      case 'doc-to-pdf': {
        const dt = (tool.converterOptions?.docType as string) || 'txt';
        for (let i = 0; i < n; i++) {
          o.setProgress((i / n) * 50);
          let blob: Blob;
          if (dt === 'docx') blob = await docxToPdf(files[i].file);
          else if (dt === 'xlsx') blob = await xlsxToPdf(files[i].file);
          else blob = await txtToPdf(files[i].file);
          files[i].result = blob; files[i].resultUrl = URL.createObjectURL(blob);
          o.setProgress(((i + 1) / n) * 100);
        }
        break;
      }
      case 'subtitle-convert': {
        const direction = (tool.converterOptions?.direction as string) || 'srt-to-vtt';
        for (let i = 0; i < n; i++) {
          o.setProgress((i / n) * 50);
          const content = await files[i].file.text();
          let result: string;
          if (direction === 'vtt-to-srt') result = vttToSrt(content);
          else if (direction === 'txt-to-srt') result = txtToSrt(content);
          else result = srtToVtt(content);
          const mime = direction === 'srt-to-vtt' ? 'text/vtt' : 'text/plain';
          files[i].result = new Blob([result], { type: mime });
          files[i].resultUrl = URL.createObjectURL(files[i].result!);
          o.setProgress(((i + 1) / n) * 100);
        }
        break;
      }
      default: o.setProgress(100);
    }
  };

  if (tool.converterType === 'ocr') {
    return (
      <div className="max-w-4xl mx-auto">
        <SEO title={tool.seoTitle} description={desc} keywords={keywords} />
        <FAQSchema faqs={faqs} />
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-3">{title}</h1>
          <p>{desc}</p>
        </div>
        <Card className="p-8 text-center">
          <p className="mb-4">{isSpanish ? 'Usa la interfaz OCR.' : 'Use OCR interface.'}</p>
          <Link to="/ocr" className="inline-flex items-center gap-2 bg-accent text-white px-6 py-3 rounded-xl">
            <FileText className="w-5 h-5" />{isSpanish ? 'Ir a OCR' : 'Go to OCR'}
          </Link>
        </Card>
        {related.length > 0 && renderRelated(related, isSpanish)}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <SEO title={tool.seoTitle} description={desc} keywords={keywords}
        canonical={`https://convertmyfilepro.com/convert/${slug}`} />
      <FAQSchema faqs={faqs} />
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-3">{title}</h1>
        <p className="text-muted text-lg max-w-2xl mx-auto">
          {isSpanish ? `Convierte ${tool.slug.replace(/-/g, ' ')} gratis.` : tool.description}
        </p>
      </div>
      <ToolLayout
        toolId={slug || ''} title={isSpanish ? tool.h1Es : tool.title}
        description={desc} seoTitle={tool.seoTitle} seoDescription={tool.seoDescription}
        accept={tool.accept} multiple={tool.multiple} maxFiles={tool.maxFiles}
        onConvert={handleConvert} outputFormat={tool.outputFormat} keywords={keywords} faqItems={faqs}
      />
      <section className="py-12">
        <h2 className="text-2xl font-bold text-center mb-8">
          {isSpanish ? 'C\u00f3mo convertir en 3 pasos' : 'How to convert in 3 steps'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white dark:bg-card border shadow-sm">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent text-white font-bold flex items-center justify-center mb-4">{i + 1}</div>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </section>
      {related.length > 0 && renderRelated(related, isSpanish)}
    </div>
  );
};

function renderRelated(tools: ReturnType<typeof getRelatedTools>, isSpanish: boolean) {
  return (
    <section className="py-8">
      <h2 className="text-2xl font-bold text-center mb-6">
        {isSpanish ? 'Herramientas relacionadas' : 'Related tools'}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {tools.map((rt) => (
          <Link key={rt.slug} to={`/convert/${rt.slug}`}>
            <Card className="p-4 h-full hover:shadow-md border group cursor-pointer hover:-translate-y-0.5">
              <h3 className="text-sm font-semibold mb-1 group-hover:text-primary">
                {isSpanish ? rt.h1Es : rt.h1}
              </h3>
              <p className="text-xs text-muted line-clamp-2">
                {isSpanish ? `Convertir ${rt.slug.replace(/-/g, ' ')} gratis` : rt.description}
              </p>
              <div className="flex items-center text-accent text-xs font-medium mt-2">
                <span>{isSpanish ? 'Usar' : 'Use'}</span>
                <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default SeoToolPage;