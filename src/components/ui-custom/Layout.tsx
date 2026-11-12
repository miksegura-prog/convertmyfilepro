import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { AdSlot } from './AdSlot';
import { useProStatus } from '@/hooks/useProStatus';

interface LayoutProps {
  showSidebarAd?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  showSidebarAd = false
}) => {
  const { isPro } = useProStatus();
  // Hide sidebar ad for PRO users
  const effectiveShowAd = showSidebarAd && !isPro;
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className={`flex gap-8 ${effectiveShowAd ? '' : 'justify-center'}`}>
          {/* Main Content */}
          <div className={`${effectiveShowAd ? 'flex-1' : 'max-w-4xl w-full'}`}>
            <Outlet />
          </div>
          
          {/* Sidebar Ad */}
          {effectiveShowAd && (
            <aside className="hidden lg:block w-[300px] flex-shrink-0">
              <div className="sticky top-24">
                <AdSlot position="sidebar" id="sidebar-ad" />
              </div>
            </aside>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};
