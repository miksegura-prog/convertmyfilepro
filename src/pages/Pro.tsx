import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight, CalendarDays, Check, Clock, Crown, Download, EyeOff,
  FileText, Info, Layers, Megaphone, Rocket, ScanText, Sparkles, Type,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SEO } from '@/components/ui-custom/SEO';
import { FAQ } from '@/components/ui-custom/FAQ';
import { useProStatus } from '@/hooks/useProStatus';
import {
  FREE_BATCH_FILES, FREE_OCR_PAGES, FREE_VIDEO_MB, PRO_BATCH_FILES,
  PRO_PAYMENT_LINK, PRO_PRICE_EUR,
} from '@/config/plans';

type BadgeKind = 'available' | 'beta' | 'soon';

interface PlanFeature {
  key: string;
  icon: React.ElementType;
  badge: BadgeKind;
}

const BADGE_STYLES: Record<BadgeKind, string> = {
  available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  beta: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  soon: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

const FeatureBadge: React.FC<{ kind: BadgeKind }> = ({ kind }) => {
  const { t } = useTranslation();
  return (
    <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${BADGE_STYLES[kind]}`}>
      {t(`plans.badges.${kind}`)}
    </span>
  );
};

const FREE_FEATURES: PlanFeature[] = [
  { key: 'freeLimits', icon: Layers, badge: 'available' },
  { key: 'video', icon: FileText, badge: 'available' },
  { key: 'studioReplace', icon: Type, badge: 'beta' },
  { key: 'studioAddText', icon: Type, badge: 'beta' },
  { key: 'downloads', icon: Download, badge: 'available' },
  { key: 'ads', icon: Megaphone, badge: 'available' },
];

const PRO_FEATURES: PlanFeature[] = [
  { key: 'everythingFree', icon: Check, badge: 'available' },
  { key: 'batch', icon: Layers, badge: 'available' },
  { key: 'ocr', icon: ScanText, badge: 'available' },
  { key: 'studio', icon: Type, badge: 'beta' },
  { key: 'noAds', icon: EyeOff, badge: 'available' },
  { key: 'advancedEditing', icon: Rocket, badge: 'soon' },
  { key: 'priority', icon: Clock, badge: 'soon' },
];

const money = (value: number, language: string) =>
  new Intl.NumberFormat(language === 'es' ? 'es-ES' : 'en-GB', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);

const Pro: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isPro, hasProAccess, isOwner, expiresAt, betaExpiresAt } = useProStatus();

  const price = money(PRO_PRICE_EUR, i18n.language);
  const featureValues = {
    freeBatch: FREE_BATCH_FILES,
    proBatch: PRO_BATCH_FILES,
    freeVideo: FREE_VIDEO_MB,
    freeOcr: FREE_OCR_PAGES,
    price,
  };

  const expiryLabel =
    hasProAccess && (isPro ? expiresAt : betaExpiresAt)
      ? new Intl.DateTimeFormat(i18n.language === 'es' ? 'es-ES' : 'en-GB', {
          dateStyle: 'long',
        }).format(new Date((isPro ? expiresAt : betaExpiresAt) as number))
      : null;

  const faqItems = t('plans.faq.items', { returnObjects: true, ...featureValues }) as Array<{
    question: string;
    answer: string;
  }>;

  const renderFeature = (feature: PlanFeature) => {
    const Icon = feature.icon;
    return (
      <li key={feature.key} className="rounded-xl bg-white/70 p-3 dark:bg-black/20">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg)] text-[var(--color-primary)]">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-[var(--color-text)]">
                {t(`plans.features.${feature.key}.title`, featureValues)}
              </p>
              <FeatureBadge kind={feature.badge} />
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
              {t(`plans.features.${feature.key}.description`, featureValues)}
            </p>
          </div>
        </div>
      </li>
    );
  };

  return (
    <>
      <SEO
        title={t('plans.seoTitle')}
        description={t('plans.seoDescription')}
        canonical="https://www.convertmyfilepro.com/pro"
        lang={i18n.language}
      />

      <main className="mx-auto max-w-5xl py-10 md:py-16">
        <section className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            <Sparkles className="h-3.5 w-3.5" />
            {t('plans.badge')}
          </span>
          <h1 className="mt-4 text-3xl font-bold text-[var(--color-text)] md:text-4xl">
            {t('plans.title')}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[var(--color-muted)]">
            {t('plans.description', { price })}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--color-muted)]">
            {(['available', 'beta', 'soon'] as BadgeKind[]).map((kind) => (
              <FeatureBadge key={kind} kind={kind} />
            ))}
            <span>{t('plans.badgesHelp')}</span>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Card className="flex h-full flex-col border border-[var(--color-border)] p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-[var(--color-text)]">{t('plans.free.name')}</h2>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-[var(--color-text)]">{money(0, i18n.language)}</span>
                <span className="text-sm text-[var(--color-muted)]">{t('plans.free.period')}</span>
              </div>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{t('plans.free.tagline')}</p>
            </div>

            <ul className="mb-6 space-y-2">
              {FREE_FEATURES.map(renderFeature)}
            </ul>

            <div className="mt-auto">
              <Button asChild variant="outline" className="w-full py-6 font-semibold">
                <Link to="/">
                  {t('plans.free.cta')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <p className="mt-3 text-center text-xs text-[var(--color-muted)]">{t('plans.free.note')}</p>
            </div>
          </Card>

          <Card className="relative flex h-full flex-col overflow-hidden border-2 border-amber-400/70 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-lg dark:from-amber-950/30 dark:via-[var(--color-card)] dark:to-orange-950/20">
            <span className="absolute right-4 top-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              {t('plans.pro.recommended')}
            </span>
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow">
                  <Crown className="h-5 w-5" />
                </span>
                <h2 className="text-lg font-bold text-[var(--color-text)]">{t('plans.pro.name')}</h2>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-[var(--color-text)]">{price}</span>
                <span className="text-sm text-[var(--color-muted)]">{t('plans.pro.period')}</span>
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {t('plans.pro.monthly', { monthly: money(PRO_PRICE_EUR / 12, i18n.language) })}
              </p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{t('plans.pro.tagline')}</p>
            </div>

            <ul className="mb-6 space-y-2">
              {PRO_FEATURES.map(renderFeature)}
            </ul>

            <div className="mt-auto">
              {hasProAccess ? (
                <>
                  <Button disabled className="w-full bg-emerald-600 py-6 font-semibold text-white">
                    <Check className="mr-2 h-4 w-4" />
                    {isOwner ? 'OWNER · PRO activo' : t('plans.pro.active', { date: expiryLabel || '' })}
                  </Button>
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-[var(--color-muted)]">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {t('plans.pro.activeHint')}
                  </p>
                </>
              ) : (
                <>
                  <Button
                    asChild
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 py-6 font-semibold text-white shadow-lg shadow-amber-500/30 hover:from-amber-600 hover:to-orange-600"
                  >
                    <a href={PRO_PAYMENT_LINK} target="_blank" rel="noopener noreferrer">
                      <Sparkles className="mr-2 h-4 w-4" />
                      {t('plans.pro.cta', { price })}
                    </a>
                  </Button>
                  <p className="mt-3 text-center text-xs text-[var(--color-muted)]">
                    {t('plans.pro.checkoutNote')}
                  </p>
                </>
              )}
            </div>
          </Card>
        </section>

        {/* Notas verificables */}
        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { key: 'billing', icon: Info },
            { key: 'browserAccess', icon: CalendarDays },
            { key: 'beta', icon: FileText },
          ].map(({ key, icon: Icon }) => (
            <Card key={key} className="border border-[var(--color-border)] p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                <Icon className="h-4 w-4 text-[var(--color-primary)]" />
                {t(`plans.notes.${key}.title`)}
              </h3>
              <p className="text-xs leading-relaxed text-[var(--color-muted)]">
                {t(`plans.notes.${key}.description`, featureValues)}
              </p>
            </Card>
          ))}
        </section>

        <FAQ items={faqItems} />

        <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
          {t('plans.support')}{' '}
          <a className="text-[var(--color-accent)] hover:underline" href={`mailto:${t('app.email')}`}>
            {t('app.email')}
          </a>
        </p>
      </main>
    </>
  );
};

export default Pro;