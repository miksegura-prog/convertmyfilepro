import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Crown, FileArchive, FileImage, FileText, Layers, ScanText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProStatus } from '@/hooks/useProStatus';
import { BLACK_FRIDAY_CODE, isBlackFridayActive } from '@/config/plans';

/** First-party promotional card. No ad network, cookies or pop-ups. */
export const BlackFridaySidebar: React.FC = () => {
  const { i18n } = useTranslation();
  const { hasProAccess } = useProStatus();
  if (!isBlackFridayActive() || hasProAccess) return null;
  const es = i18n.language.startsWith('es');

  return (
    <aside aria-label={es ? 'Oferta de Black Friday de ConvertMyFilePro PRO' : 'ConvertMyFilePro PRO Black Friday offer'}
      className="sticky top-24 w-full">
      <Link to="/pro"
        className="group block overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-b from-white via-emerald-50 to-teal-100 p-5 text-center shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl dark:border-emerald-800 dark:from-slate-900 dark:via-teal-950 dark:to-slate-900"
        aria-label={es ? 'Black Friday: descubre PRO por 3,99 euros el primer año, con código promocional' : 'Black Friday: discover PRO for €3.99 the first year with a promotion code'}>
        <div className="mb-5 flex justify-between">
          <span className="rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
            {es ? 'Presentación' : 'Launch deal'}
          </span>
          <Crown aria-hidden="true" className="h-6 w-6 text-emerald-700 dark:text-emerald-300"/>
        </div>
        <div className="font-black uppercase leading-none tracking-tighter">
          <span className="block text-4xl text-slate-900 dark:text-white">BLACK</span>
          <span className="block text-4xl text-emerald-600 dark:text-emerald-400">FRIDAY</span>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 text-base font-extrabold text-slate-800 dark:text-slate-100">
          <FileArchive aria-hidden="true" className="h-5 w-5 text-emerald-600"/>
          ConvertMyFilePro <span className="rounded-md bg-emerald-700 px-1.5 py-0.5 text-xs text-white">PRO</span>
        </div>
        <div className="relative mx-auto mt-6 w-44 rounded-2xl bg-white p-4 shadow-md dark:bg-slate-800">
          <div className="flex items-center justify-center gap-3 text-emerald-600">
            <FileText aria-hidden="true" className="h-8 w-8 text-rose-500"/>
            <ArrowRight aria-hidden="true" className="h-6 w-6"/>
            <FileImage aria-hidden="true" className="h-8 w-8 text-blue-500"/>
          </div>
          <div className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
            PDF · OCR · {es ? 'Audio' : 'Audio'}
          </div>
        </div>
        <div className="mt-6 text-slate-900 dark:text-white">
          <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            {es ? 'OFERTA DE LANZAMIENTO' : 'LAUNCH OFFER'}
          </div>
          <div className="mt-1 text-5xl font-black tracking-tight">
            3,99 <span className="text-3xl">€</span>
          </div>
          <div className="text-sm font-semibold">
            {es ? 'el primer año' : 'first year'}
            {' '}<span className="text-slate-400 line-through">5,99 €</span>
          </div>
        </div>
        <div className="mt-5 space-y-3 text-left text-sm font-semibold text-slate-800 dark:text-slate-100">
          <div className="flex items-center gap-2"><ScanText aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-600"/>{es ? 'OCR sin límite diario' : 'Unlimited daily OCR'}</div>
          <div className="flex items-center gap-2"><Layers aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-600"/>{es ? 'Lotes ampliados' : 'Larger batches'}</div>
        </div>
        <div className="mt-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 p-3 text-base font-extrabold text-white shadow-md transition-colors group-hover:from-emerald-700 group-hover:to-teal-800">
          {es ? 'Descubrir PRO' : 'Discover PRO'} <ArrowRight aria-hidden="true" className="ml-1 inline h-4 w-4"/>
        </div>
        <div className="mt-3 rounded-lg border border-dashed border-emerald-400 bg-white/80 py-2 font-mono text-xs font-bold tracking-wide text-emerald-900 dark:bg-slate-800 dark:text-emerald-200">
          {BLACK_FRIDAY_CODE}
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-slate-600 dark:text-slate-300">
          {es ? 'Código en Stripe · Solo nuevas compras · Hasta el 30/11/2026' : 'Enter code at Stripe · New purchases only · Until 30 Nov 2026'}
          <span className="mt-1 block">{es ? 'Renovación: 5,99 €/año, impuestos aparte si corresponden.' : 'Renews at €5.99/year, plus applicable taxes.'}</span>
        </p>
      </Link>
      <p className="mt-2 text-center text-[10px] text-[var(--color-muted)]">{es ? 'Promoción propia' : 'Our own promotion'}</p>
    </aside>
  );
};
