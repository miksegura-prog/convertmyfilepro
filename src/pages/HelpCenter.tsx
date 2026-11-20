import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, HelpCircle, Mail, Search, X } from 'lucide-react';
import { SEO } from '@/components/ui-custom/SEO';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import helpEs from '@/data/helpFaqEs.json';
import helpEn from '@/data/helpFaqEn.json';

const fold = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();

const HelpCenter: React.FC = () => {
  const { i18n } = useTranslation();
  const isSpanish = i18n.language.startsWith('es');
  const content = isSpanish ? helpEs : helpEn;
  const [term, setTerm] = useState('');
  const [category, setCategory] = useState('all');

  const matches = useMemo(() => {
    const query = fold(term);
    return content.items.filter((item) => {
      if (category !== 'all' && item.topic !== category) return false;
      if (!query) return true;
      const label = content.topics[item.topic as keyof typeof content.topics];
      return fold([item.question, item.answer, label].join(' ')).includes(query);
    });
  }, [content, term, category]);

  const groups = Object.entries(content.topics)
    .map(([id, label]) => ({
      id, label, items: matches.filter((item) => item.topic === id),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <SEO
        title={content.title}
        description={content.description}
        canonical="https://www.convertmyfilepro.com/faq"
        lang={isSpanish ? 'es' : 'en'}
      />
      <div className="mx-auto max-w-5xl py-6 md:py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-bg)] text-[var(--color-primary)]">
            <BookOpen className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--color-text)] md:text-4xl">
            {content.title}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[var(--color-muted)]">{content.subtitle}</p>
        </div>

        <Card className="mb-6 space-y-4 border border-[var(--color-border)] p-4 md:p-6">
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-[var(--color-muted)]" />
            <input
              type="search"
              value={term}
              onChange={event => setTerm(event.target.value)}
              aria-label={content.searchPlaceholder}
              placeholder={content.searchPlaceholder}
              className="w-full rounded-xl border border-[var(--color-border)] bg-transparent py-3 pl-11 pr-12 text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            {term && (
              <button type="button" onClick={() => setTerm('')} aria-label={content.clear}
                className="absolute right-2 top-2 rounded-lg p-2 text-[var(--color-muted)] hover:bg-[var(--color-bg)]">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <nav aria-label={isSpanish ? 'Categorías de ayuda' : 'Help categories'} className="flex flex-wrap gap-2">
            {[{ id: 'all', label: content.all }, ...Object.entries(content.topics).map(([id, label]) => ({ id, label }))].map(option => (
              <button
                type="button"
                key={option.id}
                aria-pressed={category === option.id}
                onClick={() => setCategory(option.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors
                  ${category === option.id
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                    : 'border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg)]'}`}
              >
                {option.label}
              </button>
            ))}
          </nav>
          <p role="status" className="text-xs text-[var(--color-muted)]">
            {matches.length} / {content.items.length} {content.results}
          </p>
        </Card>

        {groups.length ? (
          <div className="space-y-7">
            {groups.map(group => (
              <section key={group.id} id={`help-${group.id}`} aria-labelledby={`help-heading-${group.id}`}>
                <h2 id={`help-heading-${group.id}`} className="mb-3 flex items-center gap-2 text-xl font-semibold text-[var(--color-text)]">
                  <HelpCircle className="h-5 w-5 text-[var(--color-primary)]" />
                  {group.label} <span className="text-sm font-normal text-[var(--color-muted)]">({group.items.length})</span>
                </h2>
                <Accordion type="multiple" className="space-y-2">
                  {group.items.map(item => (
                    <AccordionItem key={item.id} value={item.id} id={`faq-${item.id}`}
                      className="rounded-xl border border-[var(--color-border)] bg-white px-5 dark:bg-[var(--color-card)]">
                      <AccordionTrigger className="py-4 text-left font-medium text-[var(--color-text)] hover:no-underline">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 pb-4 text-sm leading-relaxed text-[var(--color-muted)]">
                        <p>{item.answer}</p>
                        {'path' in item && item.path && (
                          <Link to={item.path} className="inline-flex items-center gap-1 font-semibold text-[var(--color-primary)] hover:underline">
                            {content.toolLink}<ArrowRight className="h-4 w-4" />
                          </Link>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ))}
          </div>
        ) : (
          <Card role="status" className="p-8 text-center text-[var(--color-muted)]">{content.noResults}</Card>
        )}

        <Card className="mt-10 flex flex-col gap-3 border border-[var(--color-border)] p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">{content.contactTitle}</h2>
            <p className="mt-1 max-w-xl text-sm text-[var(--color-muted)]">{content.contactText}</p>
          </div>
          <Button asChild className="shrink-0">
            <a href="mailto:info@convertmyfilepro.com?subject=ConvertMyFilePro%20Support">
              <Mail className="mr-2 h-4 w-4" />{content.contactButton}
            </a>
          </Button>
        </Card>
      </div>
    </>
  );
};
export default HelpCenter;
