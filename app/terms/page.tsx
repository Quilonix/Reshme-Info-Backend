import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Terms & Conditions | Reshme Info',
  description: 'Terms and Conditions of use for Reshme Info platform',
};

export default function TermsPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', background: '#ffffff', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <img src="/reshme_logo.png" alt="Reshme Info Logo" style={{ height: '48px', objectFit: 'contain' }} />
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a' }}>Terms and Conditions</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Last Updated: August 17, 2026</p>
        </div>
      </div>

      <div style={{ fontSize: '0.95rem', color: '#334155', lineHeight: 1.7 }}>
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e40af', marginBottom: '8px' }}>1. Agreement to Terms</h2>
          <p>
            By accessing or using the <strong>Reshme Info</strong> mobile app or web portal, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, please discontinue using the service.
          </p>
        </section>

        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e40af', marginBottom: '8px' }}>2. Informational Purpose</h2>
          <p>
            All silk cocoon market prices, historical charts, statistics, and sericulture advisory content provided on Reshme Info are published for informational purposes to support farmers, reelers, and silk industry stakeholders across Karnataka. Daily auction figures reflect reported APMC market lot transactions.
          </p>
        </section>

        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e40af', marginBottom: '8px' }}>3. User Conduct</h2>
          <p>
            You agree not to misuse the services, attempt unauthorized access to administrative portals, disrupt servers, or scrape data using automated bots.
          </p>
        </section>

        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e40af', marginBottom: '8px' }}>4. Limitation of Liability</h2>
          <p>
            Reshme Info strives to provide timely and accurate market rates. However, we do not warrant that all prices will be uninterrupted or error-free. Reshme Info shall not be liable for any commercial decisions or financial transactions made based on published rates.
          </p>
        </section>

        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e40af', marginBottom: '8px' }}>5. Contact Information</h2>
          <p>
            For questions regarding these Terms, contact us at: <span style={{ fontWeight: 600, color: '#1e40af' }}>reshmeinfo@quilonix.in</span>
          </p>
        </section>
      </div>

      <div style={{ marginTop: '40px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
        &copy; 2026 Reshme Info. All rights reserved. | <Link href="/privacy-policy" style={{ color: '#1e40af', textDecoration: 'underline' }}>Privacy Policy</Link>
      </div>
    </div>
  );
}
