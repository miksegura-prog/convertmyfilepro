import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';

export const Layout: React.FC = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Header />
    <main className="flex-1 container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl w-full">
        <Outlet />
      </div>
    </main>
    <Footer />
  </div>
);
