import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Image, FileText, FileStack } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { SEO } from '@/components/ui-custom/SEO';
import type { Tool } from '@/types';

const ToolCategory: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const { t } = useTranslation();

  const allTools: Record<string, Tool[]> = {
    images: [
      { id: 'jpg-to-png', title: t('tools.jpgToPng.title'), description: t('tools.jpgToPng.description'), category: 'images', icon: 'image', path: '/jpg-to-png', color: 'from-blue-500 to-cyan-500' },
      { id: 'png-to-jpg', title: t('tools.pngToJpg.title'), description: t('tools.pngToJpg.description'), category: 'images', icon: 'image', path: '/png-to-jpg', color: 'from-green-500 to-emerald-500' },
      { id: 'webp-to-jpg', title: t('tools.webpToJpg.title'), description: t('tools.webpToJpg.description'), category: 'images', icon: 'image', path: '/webp-to-jpg', color: 'from-violet-500 to-purple-500' },
      { id: 'webp-to-png', title: t('tools.webpToPng.title'), description: t('tools.webpToPng.description'), category: 'images', icon: 'image', path: '/webp-to-png', color: 'from-fuchsia-500 to-pink-500' },
      { id: 'heic-to-jpg', title: t('tools.heicToJpg.title'), description: t('tools.heicToJpg.description'), category: 'images', icon: 'image', path: '/heic-to-jpg', color: 'from-rose-500 to-red-500' },
      { id: 'resize-image', title: t('tools.resizeImage.title'), description: t('tools.resizeImage.description'), category: 'images', icon: 'image', path: '/resize-image', color: 'from-purple-500 to-pink-500' },
      { id: 'compress-image', title: t('tools.compressImage.title'), description: t('tools.compressImage.description'), category: 'images', icon: 'image', path: '/compress-image', color: 'from-orange-500 to-red-500' },
      { id: 'enhance-image', title: t('tools.enhanceImage.title'), description: t('tools.enhanceImage.description'), category: 'images', icon: 'image', path: '/enhance-image', color: 'from-cyan-500 to-blue-500' },
    ],
    pdf: [
      { id: 'merge-pdf', title: t('tools.mergePdf.title'), description: t('tools.mergePdf.description'), category: 'pdf', icon: 'pdf', path: '/merge-pdf', color: 'from-red-500 to-rose-500' },
      { id: 'split-pdf', title: t('tools.splitPdf.title'), description: t('tools.splitPdf.description'), category: 'pdf', icon: 'pdf', path: '/split-pdf', color: 'from-amber-500 to-orange-500' },
      { id: 'compress-pdf', title: t('tools.compressPdf.title'), description: t('tools.compressPdf.description'), category: 'pdf', icon: 'pdf', path: '/compress-pdf', color: 'from-teal-500 to-cyan-500' },
      { id: 'pdf-to-jpg', title: t('tools.pdfToJpg.title'), description: t('tools.pdfToJpg.description'), category: 'pdf', icon: 'pdf', path: '/pdf-to-jpg', color: 'from-indigo-500 to-blue-500' },
      { id: 'jpg-to-pdf', title: t('tools.jpgToPdf.title'), description: t('tools.jpgToPdf.description'), category: 'pdf', icon: 'pdf', path: '/jpg-to-pdf', color: 'from-blue-500 to-indigo-500' },
    ],
    documents: [
      { id: 'docx-to-pdf', title: t('tools.docxToPdf.title'), description: t('tools.docxToPdf.description'), category: 'documents', icon: 'doc', path: '/docx-to-pdf', color: 'from-blue-600 to-indigo-600' },
      { id: 'pdf-to-docx', title: t('tools.pdfToDocx.title'), description: t('tools.pdfToDocx.description'), category: 'documents', icon: 'doc', path: '/pdf-to-docx', color: 'from-slate-500 to-gray-500' },
      { id: 'txt-to-pdf', title: t('tools.txtToPdf.title'), description: t('tools.txtToPdf.description'), category: 'documents', icon: 'doc', path: '/txt-to-pdf', color: 'from-zinc-500 to-neutral-500' },
    ],
    bonus: [
      { id: 'ocr', title: t('tools.ocr.title'), description: t('tools.ocr.description'), category: 'bonus', icon: 'ocr', path: '/ocr', color: 'from-emerald-500 to-green-500' },
      { id: 'watermark', title: t('tools.watermark.title'), description: t('tools.watermark.description'), category: 'bonus', icon: 'watermark', path: '/watermark', color: 'from-sky-500 to-blue-500' },
      { id: 'batch-convert', title: t('tools.batchConvert.title'), description: t('tools.batchConvert.description'), category: 'bonus', icon: 'batch', path: '/batch-convert', color: 'from-lime-500 to-green-500' },
    ]
  };

  const tools = category ? allTools[category] || [] : [];
  
  const categoryInfo = {
    images: { title: t('tools.categories.images.title'), description: t('tools.categories.images.description'), icon: Image },
    pdf: { title: t('tools.categories.pdf.title'), description: t('tools.categories.pdf.description'), icon: FileText },
    documents: { title: t('tools.categories.documents.title'), description: t('tools.categories.documents.description'), icon: FileStack },
  };

  const info = category ? categoryInfo[category as keyof typeof categoryInfo] : null;
  const Icon = info?.icon || FileStack;

  return (
    <>
      <SEO 
        title={`${info?.title || 'Tools'} | ConvertMyFilePro`}
        description={info?.description || 'Free online file conversion tools'}
      />
      
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)]
                        flex items-center justify-center mb-4">
            <Icon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text)] mb-3">
            {info?.title}
          </h1>
          <p className="text-[var(--color-muted)] text-lg max-w-2xl mx-auto">
            {info?.description}
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <Link key={tool.id} to={tool.path}>
              <Card className="p-6 h-full hover:shadow-card-hover transition-all duration-300 
                              border border-[var(--color-border)] group cursor-pointer
                              hover:-translate-y-1">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} 
                                flex items-center justify-center mb-4
                                group-hover:scale-110 transition-transform`}>
                  {tool.category === 'images' && <Image className="w-6 h-6 text-white" />}
                  {tool.category === 'pdf' && <FileText className="w-6 h-6 text-white" />}
                  {tool.category === 'documents' && <FileStack className="w-6 h-6 text-white" />}
                  {tool.category === 'bonus' && <Icon className="w-6 h-6 text-white" />}
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
                  {tool.title}
                </h3>
                <p className="text-sm text-[var(--color-muted)] mb-4">
                  {tool.description}
                </p>
                <div className="flex items-center text-[var(--color-accent)] text-sm font-medium">
                  Use tool
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
};

export default ToolCategory;
