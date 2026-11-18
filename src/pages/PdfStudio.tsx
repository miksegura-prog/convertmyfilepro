import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Type,
  Layers,
  Scissors,
  ImagePlus,
  Minimize2,
  FileSpreadsheet,
  ScanText,
  Globe,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { SEO } from '@/components/ui-custom/SEO';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface StudioTool {
  key: string;
  path: string;
  icon: React.ElementType;
  color: string;
}

/**
 * Página central de PDF Studio (Beta).
 * Reutiliza las herramientas PDF EXISTENTES enlazando a sus URLs públicas:
 * no duplica motores ni modifica las rutas actuales.
 */
const PdfStudio: React.FC = () => {
  const { t } = useTranslation();

  const editorTool = {
    key: 'editor',
    path: '/pdf-studio/edit',
    icon: Type,
    color: 'from-indigo-500 to-violet-600',
  };

  const tools: StudioTool[] = [
    { key: 'mergePdf', path: '/merge-pdf', icon: Layers, color: 'from-red-500 to-rose-600' },
    { key: 'splitPdf', path: '/split-pdf', icon: Scissors, color: 'from-amber-500 to-orange-600' },
    { key: 'jpgToPdf', path: '/jpg-to-pdf', icon: ImagePlus, color: 'from-blue-500 to-indigo-600' },
    { key: 'pngToPdf', path: '/convert/png-to-pdf', icon: ImagePlus, color: 'from-emerald-500 to-teal-600' },
    { key: 'compressPdf', path: '/convert/compress-pdf', icon: Minimize2, color: 'from-teal-500 to-cyan-600' },
  ];

  // Conversiones relacionadas: documentos a PDF y OCR (rutas actuales existentes).
  const conversionTools: StudioTool[] = [
    { key: 'docxToPdf', path: '/docx-to-pdf', icon: FileText, color: 'from-blue-600 to-indigo-600' },
    { key: 'xlsxToPdf', path: '/xlsx-to-pdf', icon: FileSpreadsheet, color: 'from-emerald-600 to-teal-600' },
    { key: 'txtToPdf', path: '/txt-to-pdf', icon: FileText, color: 'from-zinc-500 to-neutral-600' },
    { key: 'htmlToPdf', path: '/convert/html-to-pdf', icon: Globe, color: 'from-rose-500 to-pink-600' },
    { key: 'ocr', path: '/ocr', icon: ScanText, color: 'from-violet-500 to-purple-600' },
  ];

  const renderToolGrid = (items: StudioTool[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {items.map((tool) => {
        const Icon = tool.icon;
        return (
          <Link key={tool.key} to={tool.path} className="group h-full">
            <Card className="h-full border border-[var(--color-border)] p-5 transition-all group-hover:-translate-y-1 group-hover:shadow-card-hover">
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${tool.color}`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-2 font-semibold text-[var(--color-text)]">
                {t(`tools.${tool.key}.title`)}
              </h3>
              <p className="mb-4 text-sm text-[var(--color-muted)]">
                {t(`tools.${tool.key}.description`)}
              </p>
              <span className="inline-flex items-center text-sm text-[var(--color-accent)]">
                {t('common.useTool')}
                <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Card>
          </Link>
        );
      })}
    </div>
  );

  const limitations = t('tools.pdfStudio.limitationsList', { returnObjects: true }) as string[];

  return (
    <>
      <SEO
        title={t('tools.pdfStudio.seoTitle')}
        description={t('tools.pdfStudio.seoDescription')}
        keywords={['pdf studio', 'pdf tools online', 'edit pdf text', 'merge pdf', 'compress pdf', 'split pdf']}
        canonical="https://convertmyfilepro.com/pdf-studio"
      />

      <div className="mx-auto max-w-6xl">
        {/* Hero */}
        <section className="text-center py-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)]">
              <FileText className="h-7 w-7 text-white" />
            </span>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              {t('tools.pdfStudio.beta')}
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-[var(--color-text)] mb-4">
            {t('tools.pdfStudio.title')}
          </h1>
          <p className="text-lg text-[var(--color-muted)] max-w-2xl mx-auto mb-2">
            {t('tools.pdfStudio.heroTitle')}
          </p>
          <p className="text-[var(--color-muted)] max-w-2xl mx-auto">
            {t('tools.pdfStudio.heroDescription')}
          </p>
        </section>

        {/* Editor destacado (Beta) */}
        <section className="mb-12">
          <Link to={editorTool.path} className="group block">
            <Card className="h-full border border-[var(--color-border)] p-6 md:p-8 transition-all group-hover:-translate-y-1 group-hover:shadow-card-hover">
              <div className="flex flex-col md:flex-row md:items-center gap-5">
                <div className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${editorTool.color}`}>
                  <editorTool.icon className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl md:text-2xl font-bold text-[var(--color-text)]">
                      {t('tools.pdfStudio.editorCardTitle')}
                    </h2>
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      {t('tools.pdfStudio.beta')}
                    </span>
                  </div>
                  <p className="mt-2 text-sm md:text-base text-[var(--color-muted)]">
                    {t('tools.pdfStudio.editorCardDescription')}
                  </p>
                </div>
                <Button className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-white font-semibold flex-shrink-0">
                  {t('tools.pdfStudio.editorCta')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </Link>
        </section>

        {/* Herramientas PDF existentes */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[var(--color-text)] mb-6 text-center">
            {t('tools.pdfStudio.toolsTitle')}
          </h2>
          {renderToolGrid(tools)}
        </section>

        {/* Conversiones a PDF y OCR */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[var(--color-text)] mb-6 text-center">
            {t('tools.pdfStudio.conversionsTitle')}
          </h2>
          {renderToolGrid(conversionTools)}
        </section>

        {/* Limitaciones Beta */}
        <section className="mb-12">
          <Card className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-6">
            <h2 className="text-lg font-bold text-[var(--color-text)] mb-3 flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              {t('tools.pdfStudio.limitationsTitle')}
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-sm text-[var(--color-muted)]">
              {(limitations as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </Card>
        </section>

        {/* Nota de privacidad */}
        <p className="text-center text-sm text-[var(--color-muted)] mb-4">
          {t('tools.pdfStudio.privacyNote')}
        </p>
      </div>
    </>
  );
};

export default PdfStudio;

