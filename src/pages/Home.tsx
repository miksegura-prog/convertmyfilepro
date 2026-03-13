import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Image, FileText, FileStack, ArrowRight,
  Shield, Zap, Lock, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SEO } from '@/components/ui-custom/SEO';
import type { Tool } from '@/types';

const Home: React.FC = () => {
  const { t } = useTranslation();

  const imageTools: Tool[] = [
    { id: 'jpg-to-png', title: t('tools.jpgToPng.title'), description: t('tools.jpgToPng.description'), category: 'images', icon: 'image', path: '/jpg-to-png', color: 'from-blue-500 to-cyan-500' },
    { id: 'png-to-jpg', title: t('tools.pngToJpg.title'), description: t('tools.pngToJpg.description'), category: 'images', icon: 'image', path: '/png-to-jpg', color: 'from-green-500 to-emerald-500' },
    { id: 'resize-image', title: t('tools.resizeImage.title'), description: t('tools.resizeImage.description'), category: 'images', icon: 'image', path: '/resize-image', color: 'from-purple-500 to-pink-500' },
    { id: 'compress-image', title: t('tools.compressImage.title'), description: t('tools.compressImage.description'), category: 'images', icon: 'image', path: '/compress-image', color: 'from-orange-500 to-red-500' },
  ];

  const pdfTools: Tool[] = [
    { id: 'merge-pdf', title: t('tools.mergePdf.title'), description: t('tools.mergePdf.description'), category: 'pdf', icon: 'pdf', path: '/merge-pdf', color: 'from-red-500 to-rose-500' },
    { id: 'split-pdf', title: t('tools.splitPdf.title'), description: t('tools.splitPdf.description'), category: 'pdf', icon: 'pdf', path: '/split-pdf', color: 'from-amber-500 to-orange-500' },
    { id: 'jpg-to-pdf', title: t('tools.jpgToPdf.title'), description: t('tools.jpgToPdf.description'), category: 'pdf', icon: 'pdf', path: '/jpg-to-pdf', color: 'from-indigo-500 to-blue-500' },
    { id: 'compress-pdf', title: t('tools.compressPdf.title'), description: t('tools.compressPdf.description'), category: 'pdf', icon: 'pdf', path: '/compress-pdf', color: 'from-teal-500 to-cyan-500' },
  ];

  const docTools: Tool[] = [
    { id: 'docx-to-pdf', title: t('tools.docxToPdf.title'), description: t('tools.docxToPdf.description'), category: 'documents', icon: 'doc', path: '/docx-to-pdf', color: 'from-blue-600 to-indigo-600' },
    { id: 'pdf-to-docx', title: t('tools.pdfToDocx.title'), description: t('tools.pdfToDocx.description'), category: 'documents', icon: 'doc', path: '/pdf-to-docx', color: 'from-slate-500 to-gray-500' },
  ];

  const features = [
    { icon: Shield, title: '100% Secure', description: 'All processing happens in your browser. Files never leave your device.' },
    { icon: Zap, title: 'Lightning Fast', description: 'Client-side processing means no upload wait times.' },
    { icon: Lock, title: 'Privacy First', description: 'No registration required. No data collection.' },
    { icon: Globe, title: 'Works Everywhere', description: 'Compatible with all modern browsers and devices.' },
  ];

  const ToolCard: React.FC<{ tool: Tool }> = ({ tool }) => (
    <Link to={tool.path}>
      <Card className="p-6 h-full hover:shadow-card-hover transition-all duration-300 
                      border border-[var(--color-border)] group cursor-pointer
                      hover:-translate-y-1">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} 
                        flex items-center justify-center mb-4
                        group-hover:scale-110 transition-transform`}>
          {tool.category === 'images' && <Image className="w-6 h-6 text-white" />}
          {tool.category === 'pdf' && <FileText className="w-6 h-6 text-white" />}
          {tool.category === 'documents' && <FileStack className="w-6 h-6 text-white" />}
        </div>
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
          {tool.title}
        </h3>
        <p className="text-sm text-[var(--color-muted)]">
          {tool.description}
        </p>
        <div className="mt-4 flex items-center text-[var(--color-accent)] text-sm font-medium
                      opacity-0 group-hover:opacity-100 transition-opacity">
          {t('common.convert')} now
          <ArrowRight className="w-4 h-4 ml-1" />
        </div>
      </Card>
    </Link>
  );

  return (
    <>
      <SEO 
        title={t('app.name')}
        description={t('app.description')}
        keywords={['file converter', 'image converter', 'pdf tools', 'online converter', 'free converter']}
      />
      
      <div className="space-y-16">
        {/* Hero Section */}
        <section className="text-center py-12 md:py-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full 
                        bg-[var(--color-accent-light)]/20 text-[var(--color-accent)]
                        text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            {t('app.tagline')}
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-[var(--color-text)] mb-6 leading-tight">
            Convert Your Files
            <span className="block text-transparent bg-clip-text 
                           bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]">
              Fast & Secure
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-[var(--color-muted)] max-w-2xl mx-auto mb-8">
            {t('app.description')}
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/tools/images">
              <Button size="lg" className="gap-2">
                <Image className="w-5 h-5" />
                {t('nav.images')}
              </Button>
            </Link>
            <Link to="/tools/pdf">
              <Button size="lg" variant="outline" className="gap-2">
                <FileText className="w-5 h-5" />
                {t('nav.pdf')}
              </Button>
            </Link>
          </div>
        </section>

        {/* Image Tools */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[var(--color-text)]">
                {t('tools.categories.images.title')}
              </h2>
              <p className="text-[var(--color-muted)]">
                {t('tools.categories.images.description')}
              </p>
            </div>
            <Link to="/tools/images">
              <Button variant="ghost" className="gap-2">
                View all <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {imageTools.map(tool => <ToolCard key={tool.id} tool={tool} />)}
          </div>
        </section>

        {/* PDF Tools */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[var(--color-text)]">
                {t('tools.categories.pdf.title')}
              </h2>
              <p className="text-[var(--color-muted)]">
                {t('tools.categories.pdf.description')}
              </p>
            </div>
            <Link to="/tools/pdf">
              <Button variant="ghost" className="gap-2">
                View all <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pdfTools.map(tool => <ToolCard key={tool.id} tool={tool} />)}
          </div>
        </section>

        {/* Document Tools */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[var(--color-text)]">
                {t('tools.categories.documents.title')}
              </h2>
              <p className="text-[var(--color-muted)]">
                {t('tools.categories.documents.description')}
              </p>
            </div>
            <Link to="/tools/documents">
              <Button variant="ghost" className="gap-2">
                View all <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {docTools.map(tool => <ToolCard key={tool.id} tool={tool} />)}
          </div>
        </section>

        {/* Features */}
        <section className="py-12 bg-[var(--color-bg)] rounded-3xl -mx-4 px-4">
          <h2 className="text-2xl font-bold text-center text-[var(--color-text)] mb-12">
            Why Choose {t('app.name')}?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-white dark:bg-[var(--color-card)]
                              shadow-md flex items-center justify-center mb-4">
                  <feature.icon className="w-8 h-8 text-[var(--color-primary)]" />
                </div>
                <h3 className="font-semibold text-[var(--color-text)] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[var(--color-muted)]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
};

export default Home;
