import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { AdSlot } from './AdSlot';

interface LayoutProps {
  showTopAd?: boolean;
  showSidebarAd?: boolean;
  showBottomAd?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  showTopAd = true,
  showSidebarAd = false,
  showBottomAd = true
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      {/* Top Ad Banner */}
      {showTopAd && (
        <div className="w-full flex justify-center py-4 bg-[var(--color-bg)]">
          <AdSlot position="top" id="top-ad" />
        </div>
      )}
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className={`flex gap-8 ${showSidebarAd ? '' : 'justify-center'}`}>
          {/* Main Content */}
          <div className={`${showSidebarAd ? 'flex-1' : 'max-w-4xl w-full'}`}>
            <Outlet />
            
            {/* Bottom Ad */}
            {showBottomAd && (
              <div className="mt-12 flex justify-center">
                <AdSlot position="bottom" id="bottom-ad" />
              </div>
            )}
          </div>
          
          {/* Sidebar Ad */}
          {showSidebarAd && (
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
