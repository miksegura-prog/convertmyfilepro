import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SEO } from '@/components/ui-custom/SEO';

const LegalPage: React.FC = () => {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const legalType = pathname === '/privacy' ? 'privacy' : 'terms';
  const titleKey = legalType === 'privacy' ? 'footer.privacy' : 'footer.terms';
  const introKey = `legal.${legalType}.intro`;
  const sections = legalType === 'privacy' ? ['privacyProcessing', 'privacyStorage', 'privacyContact'] : ['termsService', 'termsFiles', 'termsContact'];
  return <>
    <SEO title={t(titleKey)} description={t(introKey)} canonical={`https://www.convertmyfilepro.com/${legalType}`} />
    <article className="mx-auto max-w-3xl space-y-6 py-8">
      <h1 className="text-3xl font-bold text-[var(--color-text)]">{t(titleKey)}</h1>
      <p className="text-[var(--color-muted)]">{t(introKey)}</p>
      {sections.map((key) => <section key={key}><h2 className="mb-2 text-xl font-semibold">{t(`legal.${key}.title`)}</h2><p className="text-[var(--color-muted)]">{t(`legal.${key}.text`)}</p></section>)}
    </article>
  </>;
};
export default LegalPage;
