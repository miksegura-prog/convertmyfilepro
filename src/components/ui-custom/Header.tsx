import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu, X, Moon, Sun, Globe, ChevronDown,
  Image, FileText, FileStack, Home, BookOpen, Music, Video
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/hooks/useTheme';
import { supportedLanguages } from '@/i18n';

export const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { resolvedTheme, toggle } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const navItems = [
    { path: '/', label: t('nav.home'), icon: Home },
    {
      label: t('nav.images'),
      icon: Image,
      children: [
        { path: '/jpg-to-png', label: t('tools.jpgToPng.title'), icon: Image },
        { path: '/png-to-jpg', label: t('tools.pngToJpg.title'), icon: Image },
        { path: '/resize-image', label: t('tools.resizeImage.title'), icon: Image },
        { path: '/compress-image', label: t('tools.compressImage.title'), icon: Image },
      ]
    },
    {
      label: t('nav.pdf'),
      icon: FileText,
      children: [
        { path: '/merge-pdf', label: t('tools.mergePdf.title'), icon: FileText },
        { path: '/split-pdf', label: t('tools.splitPdf.title'), icon: FileText },
        { path: '/jpg-to-pdf', label: t('tools.jpgToPdf.title'), icon: FileText },
      ]
    },
    {
      label: t('nav.documents'),
      icon: FileStack,
      children: [
        { path: '/docx-to-pdf', label: t('tools.docxToPdf.title'), icon: FileStack },
        { path: '/xlsx-to-pdf', label: t('tools.xlsxToPdf.title'), icon: FileStack },
        { path: '/txt-to-pdf', label: t('tools.txtToPdf.title'), icon: FileStack },
      ]
    },
    {
      label: t('nav.audioVideo'),
      icon: Music,
      children: [
        { path: '/wav-to-mp3', label: t('tools.wavToMp3.title'), icon: Music },
        { path: '/compress-video-whatsapp', label: t('tools.compressVideo.title'), icon: Video },
      ]
    },
    {
      label: t('nav.tools'),
      icon: FileStack,
      children: [
        { path: '/tools/images', label: t('nav.images'), icon: Image },
        { path: '/tools/pdf', label: t('nav.pdf'), icon: FileText },
        { path: '/tools/documents', label: t('nav.documents'), icon: FileStack },
      ]
    },
    { path: '/blog', label: t('nav.blog'), icon: BookOpen },
  ];
  const isActive = (path: string) => location.pathname === path;
  return (
<header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-[var(--color-card)]/80 backdrop-blur-xl border-b border-[var(--color-border)]">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center">
              <FileStack className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[var(--color-text)] hidden sm:block">{t('app.name')}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              item.children ? (
                <DropdownMenu key={item.label}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2">
                      <item.icon className="w-4 h-4" />{item.label}<ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-52">
                    {item.children.map((child) => (
                      <DropdownMenuItem key={child.path} asChild>
                        <Link to={child.path} className="flex items-center gap-2 cursor-pointer">
                          <child.icon className="w-4 h-4" />{child.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link key={item.path} to={item.path}>
                  <Button variant="ghost" className={`gap-2 ${isActive(item.path) ? 'text-[var(--color-primary)]' : ''}`}>
                    <item.icon className="w-4 h-4" />{item.label}
                  </Button>
                </Link>
              )
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm"><Globe className="w-4 h-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {supportedLanguages.map((lang) => (
                  <DropdownMenuItem key={lang.code} onClick={() => changeLanguage(lang.code)}>
                    <span className="mr-2">{lang.flag}</span>{lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="sm" onClick={toggle}>
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </nav>
          <div className="flex md:hidden items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm"><Globe className="w-4 h-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {supportedLanguages.map((lang) => (
                  <DropdownMenuItem key={lang.code} onClick={() => changeLanguage(lang.code)}>
                    <span className="mr-2">{lang.flag}</span>{lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="sm" onClick={toggle}>
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--color-border)] overflow-y-auto max-h-[70vh]">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                item.children ? (
                  <div key={item.label} className="space-y-0.5">
                    <div className="px-3 py-1.5 text-xs font-semibold text-[var(--color-muted)] uppercase flex items-center gap-2">
                      <item.icon className="w-3.5 h-3.5" />{item.label}
                    </div>
                    {item.children.map((child) => (
                      <Link key={child.path} to={child.path} onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isActive(child.path) ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--color-bg)]'}`}>
                        <child.icon className="w-4 h-4" />{child.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isActive(item.path) ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--color-bg)]'}`}>
                    <item.icon className="w-4 h-4" />{item.label}
                  </Link>
                )
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};