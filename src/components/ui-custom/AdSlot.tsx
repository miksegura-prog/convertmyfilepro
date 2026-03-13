import React from 'react';
import { useTranslation } from 'react-i18next';

interface AdSlotProps {
  position: 'top' | 'sidebar' | 'bottom' | 'inline';
  className?: string;
  id?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({ 
  position, 
  className = '',
  id 
}) => {
  const { t } = useTranslation();
  
  const dimensions = {
    top: 'w-full h-[90px] max-w-[728px]',
    sidebar: 'w-[300px] h-[250px]',
    bottom: 'w-full h-[90px] max-w-[728px]',
    inline: 'w-full h-[250px] max-w-[300px]'
  };

  return (
    <div 
      className={`
        relative mx-auto my-4 
        bg-[var(--color-bg)] dark:bg-[var(--color-card)] 
        border border-dashed border-[var(--color-border)]
        rounded-lg overflow-hidden
        flex flex-col items-center justify-center
        ${dimensions[position]}
        ${className}
      `}
      data-ad-position={position}
      id={id}
    >
      <span className="text-xs text-[var(--color-muted)] uppercase tracking-wider">
        {t('ads.advertisement')}
      </span>
      <span className="text-sm text-[var(--color-muted)] mt-1">
        {position === 'top' && '728x90'}
        {position === 'sidebar' && '300x250'}
        {position === 'bottom' && '728x90'}
        {position === 'inline' && '300x250'}
      </span>
      
      {/* Ad container - scripts will inject ads here */}
      <div className="ad-container absolute inset-0" />
    </div>
  );
};

// Google AdSense initialization hook
export const useAdSense = () => {
  React.useEffect(() => {
    // Check if AdSense script is already loaded
    const existingScript = document.getElementById('adsense-script');
    
    if (!existingScript && typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.id = 'adsense-script';
      script.async = true;
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
      script.crossOrigin = 'anonymous';
      // Replace with your AdSense publisher ID
      // script.setAttribute('data-ad-client', 'ca-pub-XXXXXXXXXXXXXXXX');
      
      document.head.appendChild(script);
      
      script.onload = () => {
        // Initialize ads
        if ((window as any).adsbygoogle) {
          (window as any).adsbygoogle.push({});
        }
      };
    }
  }, []);
};

// Initialize ads on a specific element
export const initializeAd = (elementId: string) => {
  if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
    const element = document.getElementById(elementId);
    if (element) {
      (window as any).adsbygoogle.push({});
    }
  }
};
