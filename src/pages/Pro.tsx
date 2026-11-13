import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/ui-custom/SEO';

const Pro: React.FC = () => {
  const { t } = useTranslation();
  const paymentLink = 'https://buy.stripe.com/8x214nfpg8CaeL0bFy2Ry08';
  const benefits = ['adFree', 'unlimitedBatch', 'largeVideos', 'priority'];
  return <>
    <SEO title={t('pro.page.title')} description={t('pro.page.description')} canonical="https://www.convertmyfilepro.com/pro" />
    <main className="mx-auto max-w-3xl py-10 md:py-16">
      <section className="rounded-3xl border border-amber-300/60 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 text-center shadow-lg dark:from-amber-950/30 dark:via-[var(--color-card)] dark:to-orange-950/20 md:p-12">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg"><Crown className="h-8 w-8"/></div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-amber-600">{t('pro.badge')}</p>
        <h1 className="mb-4 text-3xl font-bold text-[var(--color-text)] md:text-4xl">{t('pro.page.title')}</h1>
        <p className="mx-auto mb-8 max-w-xl text-[var(--color-muted)]">{t('pro.page.description')}</p>
        <ul className="mx-auto mb-8 max-w-md space-y-3 text-left">{benefits.map(key=><li key={key} className="flex items-center gap-3 rounded-xl bg-white/80 p-3 dark:bg-black/20"><Check className="h-5 w-5 shrink-0 text-emerald-600"/><span>{t(`pro.benefits.${key}`)}</span></li>)}</ul>
        <Button asChild size="lg" className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"><a href={paymentLink} target="_blank" rel="noopener noreferrer"><Sparkles className="h-4 w-4"/>{t('pro.page.checkout')}</a></Button>
      </section>
    </main>
  </>;
};
export default Pro;
