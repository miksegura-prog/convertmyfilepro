import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import './App.css';

import { Layout } from '@/components/ui-custom/Layout';

import BlogIndex from '@/pages/blog/BlogIndex';
import BlogPost from '@/pages/blog/BlogPost';

const Home = lazy(() => import('@/pages/Home'));
const ToolCategory = lazy(() => import('@/pages/ToolCategory'));

const JpgToPng = lazy(() => import('@/pages/tools/JpgToPng'));
const PngToJpg = lazy(() => import('@/pages/tools/PngToJpg'));
const ResizeImage = lazy(() => import('@/pages/tools/ResizeImage'));
const CompressImage = lazy(() => import('@/pages/tools/CompressImage'));

const MergePdf = lazy(() => import('@/pages/tools/MergePdf'));
const SplitPdf = lazy(() => import('@/pages/tools/SplitPdf'));
const JpgToPdf = lazy(() => import('@/pages/tools/JpgToPdf'));

const DocxToPdf = lazy(() => import('@/pages/tools/DocxToPdf'));
const XlsxToPdf = lazy(() => import('@/pages/tools/XlsxToPdf'));
const TxtToPdf = lazy(() => import('@/pages/tools/TxtToPdf'));

const WavToMp3 = lazy(() => import('@/pages/tools/WavToMp3'));
const CompressVideo = lazy(() => import('@/pages/tools/CompressVideo'));

const SrtToVtt = lazy(() => import('@/pages/tools/SrtToVtt'));
const VttToSrt = lazy(() => import('@/pages/tools/VttToSrt'));
const TxtToSrt = lazy(() => import('@/pages/tools/TxtToSrt'));

const AvifToPng = lazy(() => import('@/pages/tools/AvifToPng'));
const AvifToJpg = lazy(() => import('@/pages/tools/AvifToJpg'));
const WebpToPng = lazy(() => import('@/pages/tools/WebpToPng'));

const FlacToMp3 = lazy(() => import('@/pages/tools/FlacToMp3'));
const OggToMp3 = lazy(() => import('@/pages/tools/OggToMp3'));
const WavToFlac = lazy(() => import('@/pages/tools/WavToFlac'));

const OcrTool = lazy(() => import('@/pages/tools/OcrTool'));

const SeoToolPage = lazy(() => import('@/pages/SeoToolPage'));

const ProSuccess = lazy(() => import('@/pages/ProSuccess'));

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <HelmetProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route
                index
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Home />
                  </Suspense>
                }
              />

              <Route
                path="tools/:category"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ToolCategory />
                  </Suspense>
                }
              />

              <Route
                path="jpg-to-png"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <JpgToPng />
                  </Suspense>
                }
              />
              <Route
                path="png-to-jpg"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <PngToJpg />
                  </Suspense>
                }
              />
              <Route
                path="resize-image"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ResizeImage />
                  </Suspense>
                }
              />
              <Route
                path="compress-image"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <CompressImage />
                  </Suspense>
                }
              />

              <Route
                path="merge-pdf"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <MergePdf />
                  </Suspense>
                }
              />
              <Route
                path="split-pdf"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <SplitPdf />
                  </Suspense>
                }
              />
              <Route
                path="jpg-to-pdf"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <JpgToPdf />
                  </Suspense>
                }
              />

              <Route
                path="docx-to-pdf"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <DocxToPdf />
                  </Suspense>
                }
              />
              <Route
                path="xlsx-to-pdf"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <XlsxToPdf />
                  </Suspense>
                }
              />
              <Route
                path="txt-to-pdf"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <TxtToPdf />
                  </Suspense>
                }
              />

              <Route
                path="wav-to-mp3"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <WavToMp3 />
                  </Suspense>
                }
              />
              <Route
                path="compress-video-whatsapp"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <CompressVideo />
                  </Suspense>
                }
              />

              <Route
                path="srt-to-vtt"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <SrtToVtt />
                  </Suspense>
                }
              />
              <Route
                path="vtt-to-srt"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <VttToSrt />
                  </Suspense>
                }
              />
              <Route
                path="txt-to-srt"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <TxtToSrt />
                  </Suspense>
                }
              />

              <Route
                path="avif-to-png"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AvifToPng />
                  </Suspense>
                }
              />
              <Route
                path="avif-to-jpg"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AvifToJpg />
                  </Suspense>
                }
              />
              <Route
                path="webp-to-png"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <WebpToPng />
                  </Suspense>
                }
              />

              <Route
                path="flac-to-mp3"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <FlacToMp3 />
                  </Suspense>
                }
              />
              <Route
                path="ogg-to-mp3"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <OggToMp3 />
                  </Suspense>
                }
              />
              <Route
                path="wav-to-flac"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <WavToFlac />
                  </Suspense>
                }
              />

              <Route
                path="ocr"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <OcrTool />
                  </Suspense>
                }
              />

              <Route path="blog" element={<BlogIndex />} />
              <Route path="blog/:slug" element={<BlogPost />} />

              <Route
                path="convert/:slug"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <SeoToolPage />
                  </Suspense>
                }
              />

              <Route
                path="pro-success"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ProSuccess />
                  </Suspense>
                }
              />

              <Route
                path="*"
                element={
                  <div className="text-center py-20">
                    <h1 className="text-4xl font-bold text-[var(--color-text)] mb-4">404</h1>
                    <p className="text-[var(--color-muted)]">Page not found</p>
                  </div>
                }
              />
            </Route>
          </Routes>
        </Router>
      </HelmetProvider>
    </I18nextProvider>
  );
}

export default App;