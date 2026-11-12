import { useCallback } from 'react';

interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
}

interface GoogleAnalyticsParameters {
  event_category?: string;
  event_label?: string;
  value?: number;
  page_path?: string;
  page_title?: string;
}

interface PlausibleOptions {
  props?: Record<string, string | number | undefined>;
}

declare global {
  interface Window {
    gtag?: (
      command: 'event' | 'config',
      target: string,
      parameters?: GoogleAnalyticsParameters
    ) => void;
    plausible?: (eventName: string, options?: PlausibleOptions) => void;
  }
}

export const useAnalytics = () => {
  const trackEvent = useCallback(({ action, category, label, value }: AnalyticsEvent) => {
    // Google Analytics 4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value
      });
    }

    // Plausible Analytics
    if (typeof window !== 'undefined' && window.plausible) {
      window.plausible(action, {
        props: {
          category,
          label
        }
      });
    }

    // Console log for development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', { action, category, label, value });
    }
  }, []);

  const trackPageView = useCallback((path: string, title?: string) => {
    // Google Analytics 4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', 'GA_MEASUREMENT_ID', {
        page_path: path,
        page_title: title
      });
    }

    // Plausible Analytics
    if (typeof window !== 'undefined' && window.plausible) {
      window.plausible('pageview', {
        props: {
          path,
          title
        }
      });
    }
  }, []);

  const trackConversion = useCallback((tool: string, fileCount: number, success: boolean) => {
    trackEvent({
      action: success ? 'conversion_success' : 'conversion_error',
      category: 'conversion',
      label: tool,
      value: fileCount
    });
  }, [trackEvent]);

  const trackDownload = useCallback((tool: string, fileSize: number) => {
    trackEvent({
      action: 'download',
      category: 'engagement',
      label: tool,
      value: fileSize
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackPageView,
    trackConversion,
    trackDownload
  };
};
