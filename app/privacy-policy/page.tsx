import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'Privacy Policy | Reshme Info',
  description: 'Privacy Policy for Reshme Info (Karnataka Silk Cocoon Market Rates)',
};

export default function PrivacyPolicyPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', background: '#ffffff', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <img src="/reshme_logo.png" alt="Reshme Info Logo" style={{ height: '48px', objectFit: 'contain' }} />
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>Privacy Policy</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Last Updated: August 17, 2026</p>
        </div>
      </div>

      <div style={{ fontSize: '0.95rem', color: '#334155', lineHeight: 1.7 }}>
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e40af', marginBottom: '8px' }}>1. Introduction</h2>
          <p>
            Welcome to <strong>Reshme Info</strong> ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how our mobile application and web portal collect, use, and safeguard information when you access Karnataka silk cocoon market rates and sericulture services.
          </p>
        </section>

        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e40af', marginBottom: '8px' }}>2. Information We Collect</h2>
          <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
            <li><strong>Device Tokens:</strong> We collect Firebase Cloud Messaging (FCM) device tokens to deliver price alerts and market bulletins upon your permission.</li>
            <li><strong>Usage & Telemetry Data:</strong> We collect anonymous navigation metrics (such as market filter preferences and guide views) via Google Analytics to improve app performance.</li>
            <li><strong>No Ads Data:</strong> Our application contains zero advertising networks and does not collect advertising identifiers or tracking data.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e40af', marginBottom: '8px' }}>3. How We Use Your Information</h2>
          <p>We use the collected information to:</p>
          <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
            <li>Broadcast real-time cocoon auction prices and weather alerts.</li>
            <li>Deliver sericulture farming guides and video tutorials.</li>
            <li>Monitor and improve the reliability of our services across Karnataka.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e40af', marginBottom: '8px' }}>4. Data Security</h2>
          <p>
            Your information is stored securely on encrypted Supabase PostgreSQL infrastructure with Row Level Security (RLS) policies. We do not sell, rent, or monetize your personal data.
          </p>
        </section>

        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e40af', marginBottom: '8px' }}>5. Contact Us</h2>
          <p>
            If you have questions regarding this Privacy Policy or your data, please contact our support team at:
          </p>
          <p style={{ marginTop: '6px', fontWeight: 600, color: '#1e40af' }}>
            reshmeinfo@quilonix.in
          </p>
        </section>
      </div>

      <div style={{ marginTop: '40px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
        &copy; 2026 Reshme Info. All rights reserved. | <Link href="/terms" style={{ color: '#1e40af', textDecoration: 'underline' }}>Terms and Conditions</Link>
      </div>
    </div>
  );
}
