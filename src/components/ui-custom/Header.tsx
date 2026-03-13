import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Menu, X, Moon, Sun, Globe, ChevronDown,
  Image, FileText, FileStack, Home, BookOpen
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
    <header className="sticky top-0 z-50 w-full 
                      bg-white/80 dark:bg-[var(--color-card)]/80 
                      backdrop-blur-xl border-b border-[var(--color-border)]">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)]
                          flex items-center justify-center">
              <FileStack className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[var(--color-text)] hidden sm:block">
              {t('app.name')}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              item.children ? (
                <DropdownMenu key={item.label}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2">
                      <item.icon className="w-4 h-4" />
                      {item.label}
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-48">
                    {item.children.map((child) => (
                      <DropdownMenuItem key={child.path} asChild>
                        <Link 
                          to={child.path}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <child.icon className="w-4 h-4" />
                          {child.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link key={item.path} to={item.path}>
                  <Button 
                    variant={isActive(item.path) ? 'default' : 'ghost'}
                    className="gap-2"
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              )
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden sm:flex">
                  <Globe className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {supportedLanguages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className="gap-2"
                  >
                    <span>{lang.flag}</span>
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggle}
              className="hidden sm:flex"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--color-border)]">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                item.children ? (
                  <div key={item.label} className="space-y-1">
                    <div className="px-3 py-2 text-sm font-medium text-[var(--color-muted)]">
                      {item.label}
                    </div>
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg
                                  ${isActive(child.path) 
                                    ? 'bg-[var(--color-primary)] text-white' 
                                    : 'hover:bg-[var(--color-bg)]'}`}
                      >
                        <child.icon className="w-4 h-4" />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg
                              ${isActive(item.path) 
                                ? 'bg-[var(--color-primary)] text-white' 
                                : 'hover:bg-[var(--color-bg)]'}`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                )
              ))}
              
              {/* Mobile Language & Theme */}
              <div className="flex items-center gap-2 px-3 pt-4 border-t border-[var(--color-border)]">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Globe className="w-4 h-4 mr-2" />
                      {t('common.language')}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {supportedLanguages.map((lang) => (
                      <DropdownMenuItem
                        key={lang.code}
                        onClick={() => changeLanguage(lang.code)}
                      >
                        <span className="mr-2">{lang.flag}</span>
                        {lang.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={toggle}
                >
                  {resolvedTheme === 'dark' ? (
                    <>
                      <Sun className="w-4 h-4 mr-2" />
                      {t('common.lightMode')}
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 mr-2" />
                      {t('common.darkMode')}
                    </>
                  )}
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
