import './globals.css';
import React from 'react';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { AuthProvider } from '@/lib/AuthContext';
import { Sidebar } from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Reshme Info | Karnataka Silk Cocoon Intelligence Platform',
  description: 'Real-time Karnataka APMC silk cocoon market prices, auction analytics, and farming advisory.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Reshme Info',
  },
};

export const viewport: Viewport = {
  themeColor: '#1E40AF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {gaId && gaId !== 'G-XXXXXXXXXX' && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}', {
                  send_page_view: true
                });
              `}
            </Script>
          </>
        )}
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <div className="app-root">
            <Sidebar />
            <div className="app-content-area">{children}</div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
