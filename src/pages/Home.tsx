import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, FileStack, FileText, Globe, Image, Lock, Music, Shield, Subtitles, Video, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SEO } from '@/components/ui-custom/SEO';
import type { Tool } from '@/types';

const Home: React.FC = () => {
  const { t, i18n } = useTranslation();
  const spanish = i18n.language.startsWith('es');
  const tools: Tool[] = [
    ...[
      ['jpgToPng','/jpg-to-png'],['pngToJpg','/png-to-jpg'],['avifToJpg','/avif-to-jpg'],['avifToPng','/avif-to-png'],['webpToPng','/webp-to-png'],['webpToJpg','/convert/webp-to-jpg'],['heicToJpg','/convert/heic-to-jpg'],['resizeImage','/resize-image'],['compressImage','/compress-image'], 
    ].map(([id,path]) => ({ id, path, category:'images' as const, title:t(`tools.${id}.title`), description:t(`tools.${id}.description`), icon:'image', color:'from-blue-500 to-cyan-500' })),
    { id:'compressVideo', path:'/compress-video-whatsapp', category:'video', title:t('tools.compressVideo.title'), description:t('tools.compressVideo.description'), icon:'video', color:'from-emerald-500 to-green-600' },
    ...[
      ['wavToMp3','/wav-to-mp3'],['flacToMp3','/flac-to-mp3'],['oggToMp3','/ogg-to-mp3'],['wavToFlac','/wav-to-flac'],
    ].map(([id,path]) => ({ id, path, category:'audio' as const, title:t(`tools.${id}.title`), description:t(`tools.${id}.description`), icon:'audio', color:'from-purple-500 to-indigo-600' })),
    ...[
      ['mergePdf','/merge-pdf','pdf'],['splitPdf','/split-pdf','pdf'],['jpgToPdf','/jpg-to-pdf','pdf'],['docxToPdf','/docx-to-pdf','documents'],['xlsxToPdf','/xlsx-to-pdf','documents'],['txtToPdf','/txt-to-pdf','documents'],['ocr','/ocr','documents'],['srtToVtt','/srt-to-vtt','documents'],['vttToSrt','/vtt-to-srt','documents'],['txtToSrt','/txt-to-srt','documents'],
    ].map(([id,path,type]) => ({ id, path, category:type as Tool['category'], title:t(`tools.${id}.title`), description:t(`tools.${id}.description`), icon:'file', color:'from-violet-500 to-blue-600' })),
  ];
  const categories = [
    { id:'images', path:'/tools/images', icon:Image }, { id:'video', path:'/tools/video', icon:Video },
    { id:'audio', path:'/tools/audio', icon:Music }, { id:'documents', path:'/tools/documents', icon:Subtitles },
  ];
  const featureItems = [
    { icon:Shield, title:spanish?'100 % seguro':'100% Secure', text:spanish?'Procesamiento en tu navegador.':'Processing in your browser.' },
    { icon:Zap, title:spanish?'Rápido':'Fast', text:spanish?'Sin esperas de subida.':'No upload wait times.' },
    { icon:Lock, title:spanish?'Privado':'Private', text:spanish?'Tus archivos no salen de tu dispositivo.':'Files never leave your device.' },
    { icon:Globe, title:spanish?'En cualquier lugar':'Works everywhere', text:spanish?'Compatible con navegadores modernos.':'Works in modern browsers.' },
  ];
  const iconFor = (category: Tool['category']) => category==='images'?Image:category==='video'?Video:category==='audio'?Music:category==='pdf'?FileText:FileStack;
  return <>
    <SEO title={t('app.name')} description={t('app.description')} keywords={['file converter','image converter','PDF tools','audio converter','subtitle converter']} />
    <div className="space-y-14">
      <section className="py-10 text-center md:py-16">
        <h1 className="mb-5 text-4xl font-bold md:text-6xl">{t('app.name')} <span className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] bg-clip-text text-transparent">{t('nav.tools')}</span></h1>
        <p className="mb-8 text-lg text-[var(--color-muted)]">{t('app.tagline')}</p>
        <div className="flex flex-wrap justify-center gap-3">{categories.map(({id,path,icon:Icon})=><Link key={id} to={path}><Button variant="outline" className="gap-2"><Icon className="h-4 w-4"/>{t(`homepage.categories.${id}.title`)}</Button></Link>)}</div>
      </section>
      <section aria-labelledby="quick-access" className="space-y-10">
        <header className="text-center"><h2 id="quick-access" className="text-2xl font-bold md:text-3xl">{t('homepage.quickAccess.title')}</h2><p className="mt-2 text-[var(--color-muted)]">{t('homepage.quickAccess.description')}</p></header>
        {categories.map(({id,path,icon:CategoryIcon})=><section key={id}>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div className="flex items-center gap-3"><CategoryIcon className="h-6 w-6 text-[var(--color-primary)]"/><div><h3 className="text-xl font-bold">{t(`homepage.categories.${id}.title`)}</h3><p className="text-sm text-[var(--color-muted)]">{t(`homepage.categories.${id}.description`)}</p></div></div><Link className="inline-flex items-center gap-1 text-sm text-[var(--color-accent)]" to={path}>{t('homepage.viewAll')}<ArrowRight className="h-4 w-4"/></Link></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{tools.filter(tool=>id==='documents'?tool.category==='documents'||tool.category==='pdf':tool.category===id).map(tool=>{const Icon=iconFor(tool.category);return <Link key={tool.id} to={tool.path} className="group h-full"><Card className="h-full border border-[var(--color-border)] p-5 transition-all group-hover:-translate-y-1 group-hover:shadow-card-hover"><Icon aria-hidden="true" className="mb-4 h-6 w-6 text-[var(--color-primary)]"/><h4 className="mb-2 font-semibold">{tool.title}</h4><p className="mb-4 text-sm text-[var(--color-muted)]">{tool.description}</p><span className="inline-flex items-center text-sm text-[var(--color-accent)]">{t('homepage.convertNow')}<ArrowRight className="ml-1 h-4 w-4"/></span></Card></Link>})}</div>
        </section>)}
      </section>
      <section className="-mx-4 rounded-3xl bg-[var(--color-bg)] px-4 py-10"><h2 className="mb-10 text-center text-2xl font-bold">{t('homepage.features.title',{appName:t('app.name')})}</h2><div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">{featureItems.map(({icon:Icon,title,text})=><div key={title} className="text-center"><Icon className="mx-auto mb-4 h-8 w-8 text-[var(--color-primary)]"/><h3 className="mb-2 font-semibold">{title}</h3><p className="text-sm text-[var(--color-muted)]">{text}</p></div>)}</div></section>
    </div>
  </>;
};
export default Home;
