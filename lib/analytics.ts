/**
 * Google Analytics 4 Logger (Official Google tag gtag.js)
 */
export const trackEvent = (eventName: string, params: Record<string, any> = {}) => {
  // Google Analytics (gtag.js)
  if (typeof window !== 'undefined' && (window as any).gtag) {
    try {
      (window as any).gtag('event', eventName, params);
    } catch (_) {}
  }
};

export const trackPageView = (url: string, title?: string) => {
  // Google Analytics Page View
  if (typeof window !== 'undefined' && (window as any).gtag) {
    const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-RESHMEINFO';
    try {
      (window as any).gtag('config', gaId, {
        page_path: url,
        page_title: title || document.title,
      });
    } catch (_) {}
  }
};
