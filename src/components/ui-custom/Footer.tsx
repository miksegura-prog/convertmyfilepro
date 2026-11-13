import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FileStack, Mail, Instagram,
  Image, FileText, Music,
  BookOpen, Shield, FileCheck, Grid
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
      { path: '/jpg-to-pdf', label: t('tools.jpgToPdf.title') },
    ],
    documents: [
      { path: '/docx-to-pdf', label: t('tools.docxToPdf.title') },
      { path: '/xlsx-to-pdf', label: t('tools.xlsxToPdf.title') },
      { path: '/txt-to-pdf', label: t('tools.txtToPdf.title') },
    ],
    audioVideo: [
      { path: '/wav-to-mp3', label: t('tools.wavToMp3.title') },
      { path: '/flac-to-mp3', label: t('tools.flacToMp3.title') },
      { path: '/ogg-to-mp3', label: t('tools.oggToMp3.title') },
      { path: '/wav-to-flac', label: t('tools.wavToFlac.title') },
      { path: '/compress-video-whatsapp', label: t('tools.compressVideo.title') },
    ],
  };

  const allToolsList = [
    { path: '/jpg-to-png', label: t('tools.jpgToPng.title') },
    { path: '/png-to-jpg', label: t('tools.pngToJpg.title') },
    { path: '/avif-to-jpg', label: t('tools.avifToJpg.title') },
    { path: '/avif-to-png', label: t('tools.avifToPng.title') },
    { path: '/webp-to-png', label: t('tools.webpToPng.title') },
    { path: '/convert/webp-to-jpg', label: t('tools.webpToJpg.title') },
    { path: '/convert/heic-to-jpg', label: t('tools.heicToJpg.title') },
    { path: '/resize-image', label: t('tools.resizeImage.title') },
    { path: '/compress-image', label: t('tools.compressImage.title') },
    { path: '/wav-to-mp3', label: t('tools.wavToMp3.title') },
    { path: '/flac-to-mp3', label: t('tools.flacToMp3.title') },
    { path: '/ogg-to-mp3', label: t('tools.oggToMp3.title') },
    { path: '/wav-to-flac', label: t('tools.wavToFlac.title') },
    { path: '/compress-video-whatsapp', label: t('tools.compressVideo.title') },
    { path: '/merge-pdf', label: t('tools.mergePdf.title') },
    { path: '/split-pdf', label: t('tools.splitPdf.title') },
    { path: '/jpg-to-pdf', label: t('tools.jpgToPdf.title') },
    { path: '/docx-to-pdf', label: t('tools.docxToPdf.title') },
    { path: '/xlsx-to-pdf', label: t('tools.xlsxToPdf.title') },
    { path: '/txt-to-pdf', label: t('tools.txtToPdf.title') },
    { path: '/ocr', label: t('tools.ocr.title') },
    { path: '/srt-to-vtt', label: t('tools.srtToVtt.title') },
    { path: '/vtt-to-srt', label: t('tools.vttToSrt.title') },
    { path: '/txt-to-srt', label: t('tools.txtToSrt.title') },
  ];

  const bottomLinks = [
    { path: '/privacy', label: t('footer.privacy'), icon: Shield },
    { path: '/terms', label: t('footer.terms'), icon: FileCheck },
    { path: '/blog', label: t('nav.blog'), icon: BookOpen },
  ];

  return (
    <footer className="bg-[var(--color-bg)] dark:bg-[var(--color-card)]
                      border-t border-[var(--color-border)]">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-8">
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
              <a href={`mailto:${t('app.email')}`}
                className="flex items-center gap-2 text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors">
                <Mail className="w-4 h-4" />
                {t('app.email')}
              </a>
              <a href={`https://instagram.com/${t('app.instagram').replace('@', '')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors">
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
                  <Link to={link.path}
                    className="text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors">
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
                  <Link to={link.path}
                    className="text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Document Tools */}
          <div>
            <h4 className="font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t('nav.documents')}
            </h4>
            <ul className="space-y-2">
              {toolLinks.documents.map((link) => (
                <li key={link.path}>
                  <Link to={link.path}
                    className="text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Audio & Video Tools */}
          <div>
            <h4 className="font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
              <Music className="w-4 h-4" />
              {t('nav.audioVideo')}
            </h4>
            <ul className="space-y-2">
              {toolLinks.audioVideo.map((link) => (
                <li key={link.path}>
                  <Link to={link.path}
                    className="text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* All Tools */}
          <div>
            <h4 className="font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
              <Grid className="w-4 h-4" />
              {t('footer.allTools')}
            </h4>
            <ul className="space-y-2">
              {allToolsList.map((tool) => (
                <li key={tool.path}>
                  <Link to={tool.path}
                    className="text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors">
                    {tool.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Blog & Legal */}
          <div>
            <h4 className="font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              {t('nav.blog')}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/blog"
                  className="text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors">
                  {t('blog.title')}
                </Link>
              </li>
              <li>
                <a href="https://buy.stripe.com/8x214nfpg8CaeL0bFy2Ry08" target="_blank" rel="noopener noreferrer"
                  className="text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors">
                  {t('pro.badge')}
                </a>
              </li>
              <li>
                <Link to="/privacy"
                  className="text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors">
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link to="/terms"
                  className="text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors">
                  {t('footer.terms')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-[var(--color-border)]
                      flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[var(--color-muted)]">
            &copy; {currentYear} {t('app.name')}. {t('footer.allRights')}
          </p>
          <div className="flex items-center gap-6">
            {bottomLinks.map((link) => (
              <Link key={link.path} to={link.path}
                className="text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-1">
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};