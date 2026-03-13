import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import './App.css';

// Layout
import { Layout } from '@/components/ui-custom/Layout';

// Lazy load pages for better performance
const Home = lazy(() => import('@/pages/Home'));
const ToolCategory = lazy(() => import('@/pages/ToolCategory'));

// Image Tools
const JpgToPng = lazy(() => import('@/pages/tools/JpgToPng'));
const PngToJpg = lazy(() => import('@/pages/tools/PngToJpg'));
const ResizeImage = lazy(() => import('@/pages/tools/ResizeImage'));
const CompressImage = lazy(() => import('@/pages/tools/CompressImage'));

// PDF Tools
const MergePdf = lazy(() => import('@/pages/tools/MergePdf'));
const SplitPdf = lazy(() => import('@/pages/tools/SplitPdf'));
const JpgToPdf = lazy(() => import('@/pages/tools/JpgToPdf'));

// OCR
const OcrTool = lazy(() => import('@/pages/tools/OcrTool'));

// Loading component
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent 
                    rounded-full animate-spin" />
  </div>
);

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <HelmetProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={
                <Suspense fallback={<PageLoader />}>
                  <Home />
                </Suspense>
              } />
              
              {/* Tool Categories */}
              <Route path="tools/:category" element={
                <Suspense fallback={<PageLoader />}>
                  <ToolCategory />
                </Suspense>
              } />
              
              {/* Image Tools */}
              <Route path="jpg-to-png" element={
                <Suspense fallback={<PageLoader />}>
                  <JpgToPng />
                </Suspense>
              } />
              <Route path="png-to-jpg" element={
                <Suspense fallback={<PageLoader />}>
                  <PngToJpg />
                </Suspense>
              } />
              <Route path="resize-image" element={
                <Suspense fallback={<PageLoader />}>
                  <ResizeImage />
                </Suspense>
              } />
              <Route path="compress-image" element={
                <Suspense fallback={<PageLoader />}>
                  <CompressImage />
                </Suspense>
              } />
              
              {/* PDF Tools */}
              <Route path="merge-pdf" element={
                <Suspense fallback={<PageLoader />}>
                  <MergePdf />
                </Suspense>
              } />
              <Route path="split-pdf" element={
                <Suspense fallback={<PageLoader />}>
                  <SplitPdf />
                </Suspense>
              } />
              <Route path="jpg-to-pdf" element={
                <Suspense fallback={<PageLoader />}>
                  <JpgToPdf />
                </Suspense>
              } />
              
              {/* OCR */}
              <Route path="ocr" element={
                <Suspense fallback={<PageLoader />}>
                  <OcrTool />
                </Suspense>
              } />
              
              {/* 404 */}
              <Route path="*" element={
                <div className="text-center py-20">
                  <h1 className="text-4xl font-bold text-[var(--color-text)] mb-4">404</h1>
                  <p className="text-[var(--color-muted)]">Page not found</p>
                </div>
              } />
            </Route>
          </Routes>
        </Router>
      </HelmetProvider>
    </I18nextProvider>
  );
}

export default App;
