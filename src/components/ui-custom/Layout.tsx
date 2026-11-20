import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { BlackFridaySidebar } from './BlackFridaySidebar';
import { isBlackFridayActive } from '@/config/plans';

export const Layout: React.FC = () => {
  const { pathname } = useLocation();
  // First-party promo: homepage only, desktop only, and automatically ends.
  // Never overlays upload, payment, conversion or download controls.
  const showCampaign = pathname === '/' && isBlackFridayActive();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        {showCampaign ? (
          <div className="mx-auto w-full max-w-7xl xl:grid xl:grid-cols-[minmax(0,1fr)_270px] xl:items-start xl:gap-8">
            <div className="mx-auto w-full max-w-4xl min-w-0">
              <Outlet />
            </div>
            <div className="hidden xl:block">
              <BlackFridaySidebar />
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl w-full">
            <Outlet />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};
