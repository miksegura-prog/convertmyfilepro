import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  FileStack, Mail, Instagram, 
  Image, FileText, FileStack as FileStackIcon,
  Shield, FileCheck
} from 'lucide-react';

export const Footer: React.FC = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const toolLinks = {
    images: [
      { path: '/jpg-to-png', label: t('tools.jpgToPng.title') },
      { path: '/png-to-jpg', label: t('tools.pngToJpg.title') },
      { path: '/resize-image', label: t('tools.resizeImage.title') },
      { path: '/compress-image', label: t('tools.compressImage.title') },
    ],
    pdf: [
      { path: '/merge-pdf', label: t('tools.mergePdf.title') },
      { path: '/split-pdf', label: t('tools.splitPdf.title') },
      { path: '/compress-pdf', label: t('tools.compressPdf.title') },
      { path: '/pdf-to-jpg', label: t('tools.pdfToJpg.title') },
    ],
    documents: [
      { path: '/docx-to-pdf', label: t('tools.docxToPdf.title') },
      { path: '/pdf-to-docx', label: t('tools.pdfToDocx.title') },
      { path: '/txt-to-pdf', label: t('tools.txtToPdf.title') },
    ]
  };

  return (
    <footer className="bg-[var(--color-bg)] dark:bg-[var(--color-card)] 
                      border-t border-[var(--color-border)]">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)]
                            flex items-center justify-center">
                <FileStack className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-[var(--color-text)]">
                {t('app.name')}
              </span>
            </Link>
            <p className="text-[var(--color-muted)] mb-6 max-w-sm">
              {t('footer.tagline')}
            </p>
            
            {/* Contact */}
            <div className="space-y-2">
              <a 
                href={`mailto:${t('app.email')}`}
                className="flex items-center gap-2 text-[var(--color-muted)] 
                         hover:text-[var(--color-primary)] transition-colors"
              >
                <Mail className="w-4 h-4" />
                {t('app.email')}
              </a>
              <a 
                href={`https://instagram.com/${t('app.instagram').replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[var(--color-muted)] 
                         hover:text-[var(--color-primary)] transition-colors"
              >
                <Instagram className="w-4 h-4" />
                {t('app.instagram')}
              </a>
            </div>
          </div>

          {/* Image Tools */}
          <div>
            <h4 className="font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
              <Image className="w-4 h-4" />
              {t('nav.images')}
            </h4>
            <ul className="space-y-2">
              {toolLinks.images.map((link) => (
                <li key={link.path}>
                  <Link 
                    to={link.path}
                    className="text-sm text-[var(--color-muted)] 
                             hover:text-[var(--color-primary)] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* PDF Tools */}
          <div>
            <h4 className="font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t('nav.pdf')}
            </h4>
            <ul className="space-y-2">
              {toolLinks.pdf.map((link) => (
                <li key={link.path}>
                  <Link 
                    to={link.path}
                    className="text-sm text-[var(--color-muted)] 
                             hover:text-[var(--color-primary)] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Document Tools */}
          <div>
            <h4 className="font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
              <FileStackIcon className="w-4 h-4" />
              {t('nav.documents')}
            </h4>
            <ul className="space-y-2">
              {toolLinks.documents.map((link) => (
                <li key={link.path}>
                  <Link 
                    to={link.path}
                    className="text-sm text-[var(--color-muted)] 
                             hover:text-[var(--color-primary)] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-[var(--color-border)]
                      flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[var(--color-muted)]">
            © {currentYear} {t('app.name')}. {t('footer.allRights')}
          </p>
          
          <div className="flex items-center gap-6">
            <Link 
              to="/privacy"
              className="text-sm text-[var(--color-muted)] 
                       hover:text-[var(--color-primary)] transition-colors
                       flex items-center gap-1"
            >
              <Shield className="w-4 h-4" />
              {t('footer.privacy')}
            </Link>
            <Link 
              to="/terms"
              className="text-sm text-[var(--color-muted)] 
                       hover:text-[var(--color-primary)] transition-colors
                       flex items-center gap-1"
            >
              <FileCheck className="w-4 h-4" />
              {t('footer.terms')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
