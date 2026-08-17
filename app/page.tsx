'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Store,
  Sparkles,
  BookOpen,
  Bell,
  Smartphone,
  ShieldCheck,
  TrendingUp,
  Download,
  ExternalLink,
  Share2,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { trackPageView } from '@/lib/analytics';

export default function ReshmeInfoLandingPage() {
  const [livePrices, setLivePrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    trackPageView('/', 'Reshme Info Public Landing Page');
    fetchLivePrices();
  }, []);

  const fetchLivePrices = async () => {
    try {
      const { data } = await supabase
        .from('cocoon_prices')
        .select('*')
        .order('report_date', { ascending: false })
        .limit(6);

      if (data) setLivePrices(data);
    } catch (e) {
      console.error('Failed to load prices:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="public-page-wrapper">
      {/* 1. Public Header / Navbar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e2e8f0',
          zIndex: 100,
          width: '100%',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Brand Logo & Name */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src="/reshme_logo.png"
              alt="Reshme Info"
              style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
            />
            <div>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.4px', display: 'block', lineHeight: 1.1 }}>
                Reshme Info
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                ರೇಷ್ಮೆ ಮಾಹಿತಿ
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav style={{ display: 'none', alignItems: 'center', gap: '24px' }} className="desktop-nav">
            <a href="#live-rates" style={{ fontSize: '0.92rem', fontWeight: 600, color: '#334155' }}>
              Live Rates
            </a>
            <a href="#features" style={{ fontSize: '0.92rem', fontWeight: 600, color: '#334155' }}>
              Features
            </a>
            <a href="#quilonix" style={{ fontSize: '0.92rem', fontWeight: 600, color: '#334155' }}>
              About Quilonix
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.master.reshmeinfo"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ padding: '8px 18px', fontSize: '0.88rem', borderRadius: '8px', minHeight: '40px' }}
            >
              <Download size={15} /> Get Android App
            </a>
          </nav>

          {/* Mobile Right Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} className="mobile-header-actions">
            <a
              href="https://play.google.com/store/apps/details?id=com.master.reshmeinfo"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', minHeight: '36px' }}
            >
              <Download size={14} /> Get App
            </a>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#0f172a' }}
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div
            style={{
              background: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08)',
            }}
          >
            <a
              href="#live-rates"
              onClick={() => setMobileMenuOpen(false)}
              style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}
            >
              Live Rates
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}
            >
              Features
            </a>
            <a
              href="#quilonix"
              onClick={() => setMobileMenuOpen(false)}
              style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}
            >
              About Quilonix
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.master.reshmeinfo"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '6px' }}
            >
              <Download size={16} /> Download Official Android APK
            </a>
          </div>
        )}

        <style jsx>{`
          @media (min-width: 768px) {
            .desktop-nav {
              display: flex !important;
            }
            .mobile-header-actions {
              display: none !important;
            }
          }
        `}</style>
      </header>

      {/* 2. Hero Section */}
      <section
        style={{
          background: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)',
          padding: 'clamp(40px, 8vw, 72px) 20px clamp(32px, 6vw, 48px)',
          textAlign: 'center',
          width: '100%',
        }}
      >
        <div style={{ maxWidth: '840px', margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              background: '#dbeafe',
              borderRadius: '20px',
              color: '#1e40af',
              fontSize: '0.82rem',
              fontWeight: 700,
              marginBottom: '18px',
            }}
          >
            <Sparkles size={14} /> Karnataka's Official Silk Cocoon Portal
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.75rem, 5vw, 2.75rem)',
              fontWeight: 900,
              color: '#0f172a',
              lineHeight: 1.2,
              marginBottom: '16px',
              letterSpacing: '-0.5px',
            }}
          >
            Karnataka Silk Cocoon Real-Time Auction Intelligence
          </h1>

          <p
            style={{
              fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)',
              color: '#334155',
              lineHeight: 1.6,
              marginBottom: '28px',
              fontWeight: 500,
            }}
          >
            ಕರ್ನಾಟಕದ ರೇಷ್ಮೆ ಕೃಷಿಕರು, ನೂಲು ಬಿಚ್ಚಾಣಿಕೆದಾರರು ಮತ್ತು ವ್ಯಾಪಾರಿಗಳಿಗೆ ನಿಖರವಾದ ಹಾಗೂ ನೈಜ ಸಮಯದ ಮಾರುಕಟ್ಟೆ ಧಾರಣೆಗಳನ್ನು ಒದಗಿಸುವ ಅಧಿಕೃತ ಡಿಜಿಟಲ್ ವೇದಿಕೆ.
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <a
              href="https://play.google.com/store/apps/details?id=com.master.reshmeinfo"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{
                padding: '14px 28px',
                fontSize: '1rem',
                borderRadius: '10px',
                width: 'auto',
                minWidth: '220px',
              }}
            >
              <Download size={18} /> Download Android App
            </a>
            <a
              href="#live-rates"
              className="btn btn-secondary"
              style={{
                padding: '14px 24px',
                fontSize: '1rem',
                borderRadius: '10px',
                minWidth: '180px',
              }}
            >
              <TrendingUp size={18} /> View Today's Rates
            </a>
          </div>
        </div>
      </section>

      {/* 3. Live Price Ticker & Preview */}
      <section
        id="live-rates"
        style={{
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: 'clamp(32px, 6vw, 48px) 20px',
        }}
      >
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 4vw, 1.75rem)', fontWeight: 900, color: '#0f172a', margin: 0 }}>
            Today's Live Cocoon Auction Rates
          </h2>
          <p style={{ fontSize: '0.92rem', color: '#64748b', marginTop: '4px' }}>
            Verified rates from Ramanagara, Sidlaghatta, Kolar, Vijayapura and all major Karnataka APMCs
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {livePrices.length === 0 ? (
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '36px' }}>
              <p style={{ color: '#64748b', margin: 0 }}>
                {loading ? 'Streaming latest APMC prices...' : 'No price records found for today.'}
              </p>
            </div>
          ) : (
            livePrices.map((item) => (
              <div
                key={item.id}
                className="card"
                style={{
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
                  background: '#ffffff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {item.market_name}
                  </h3>
                  <span className="badge badge-primary" style={{ fontWeight: 700 }}>
                    {item.breed} Cocoon
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '14px' }}>
                  Report Date: {item.report_date}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Average Rate</span>
                    <span style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary)' }}>
                      ₹{item.avg_price || item.price_per_kg}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}> / kg</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.82rem', color: '#475569', display: 'block' }}>
                      Min: <strong>₹{item.min_price}</strong>
                    </span>
                    <span style={{ fontSize: '0.82rem', color: '#166534', display: 'block' }}>
                      Max: <strong>₹{item.max_price}</strong>
                    </span>
                  </div>
                </div>

                {item.lot_number && (
                  <div style={{ padding: '6px 10px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.78rem', color: '#64748b' }}>
                    Lots: <strong>{item.lot_number}</strong> {item.total_weight ? `• Qty: ${item.total_weight} kg` : ''}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* 4. Core Features Grid */}
      <section
        id="features"
        style={{
          width: '100%',
          background: '#f8fafc',
          padding: 'clamp(40px, 8vw, 64px) 20px',
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 900, color: '#0f172a', marginBottom: '10px' }}>
              Built for Karnataka's Sericulture Community
            </h2>
            <p style={{ fontSize: '0.96rem', color: '#64748b', maxWidth: '640px', margin: '0 auto' }}>
              High-speed auction telemetry, automated bulletin processing, and farmer advisory tools.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div className="card" style={{ background: '#ffffff', padding: '24px', borderRadius: '16px' }}>
              <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '12px', color: 'var(--primary)', width: 'fit-content', marginBottom: '14px' }}>
                <Store size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                Real-Time APMC Market Prices
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                Directly connects farmers to live auction prices across Karnataka APMC markets with high-contrast sunlight readability.
              </p>
            </div>

            <div className="card" style={{ background: '#ffffff', padding: '24px', borderRadius: '16px' }}>
              <div style={{ padding: '12px', background: '#f5f3ff', borderRadius: '12px', color: '#7c3aed', width: 'fit-content', marginBottom: '14px' }}>
                <Sparkles size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                Automated Market Bulletins
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                Instant digital summaries of APMC daily bulletins direct from market authorities formatted for clarity.
              </p>
            </div>

            <div className="card" style={{ background: '#ffffff', padding: '24px', borderRadius: '16px' }}>
              <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '12px', color: '#16a34a', width: 'fit-content', marginBottom: '14px' }}>
                <BookOpen size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                Kannada Knowledge Hub & Videos
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                Comprehensive disease prevention guides, mulberry cultivation best practices, and expert sericulture video tutorials.
              </p>
            </div>

            <div className="card" style={{ background: '#ffffff', padding: '24px', borderRadius: '16px' }}>
              <div style={{ padding: '12px', background: '#fffbeb', borderRadius: '12px', color: '#d97706', width: 'fit-content', marginBottom: '14px' }}>
                <Bell size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                Instant Market Push Alerts
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                Broadcast notifications to 50k+ farmers across Karnataka with market-specific topic filtering and urgent bulletins.
              </p>
            </div>

            <div className="card" style={{ background: '#ffffff', padding: '24px', borderRadius: '16px' }}>
              <div style={{ padding: '12px', background: '#ecfdf5', borderRadius: '12px', color: '#059669', width: 'fit-content', marginBottom: '14px' }}>
                <Share2 size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                1-Tap WhatsApp Share
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                Empowers farmers and reelers to instantly share daily rate slips with farmer groups and agricultural communities.
              </p>
            </div>

            <div className="card" style={{ background: '#ffffff', padding: '24px', borderRadius: '16px' }}>
              <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '12px', color: 'var(--primary)', width: 'fit-content', marginBottom: '14px' }}>
                <Smartphone size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                Ultra-Fast Flutter Android App
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                Smooth 60FPS Flutter architecture with offline caching, local notifications, and instantaneous bilingual switching.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. About Quilonix Section */}
      <section
        id="quilonix"
        style={{
          width: '100%',
          maxWidth: '1000px',
          margin: '0 auto',
          padding: 'clamp(40px, 8vw, 64px) 20px',
          textAlign: 'center',
        }}
      >
        <div style={{ padding: 'clamp(24px, 5vw, 36px)', background: '#f8fafc', borderRadius: '24px', border: '1.5px solid #e2e8f0' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#eff6ff', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <ShieldCheck size={24} />
          </div>
          <h2 style={{ fontSize: 'clamp(1.35rem, 3.5vw, 1.6rem)', fontWeight: 900, color: '#0f172a', marginBottom: '10px' }}>
            Powered by Quilonix
          </h2>
          <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, maxWidth: '720px', margin: '0 auto 20px' }}>
            ಕ್ವಿಲೋನಿಕ್ಸ್ (Quilonix) ಭಾರತದ ಕೃಷಿಕರಿಗೆ ಡಿಜಿಟಲ್ ತಂತ್ರಜ್ಞಾನ ಮತ್ತು ನೈಜ ಸಮಯದ ಮಾರುಕಟ್ಟೆ ಬುದ್ಧಿಮತ್ತೆ ಒದಗಿಸುವ ಪ್ರಮುಖ ಸಾಫ್ಟ್‌ವೇರ್ ಸಂಸ್ಥೆಯಾಗಿದೆ.
            Quilonix is dedicated to delivering transparent, fast, and accessible digital tools for rural agricultural economies.
          </p>
          <a
            href="https://quilonix.in"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
          >
            Visit quilonix.in <ExternalLink size={16} />
          </a>
        </div>
      </section>

      {/* 6. Public Footer */}
      <footer
        style={{
          width: '100%',
          background: '#0f172a',
          color: '#94a3b8',
          padding: '40px 20px 32px',
          marginTop: 'auto',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px',
          }}
        >
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
              Reshme Info (ರೇಷ್ಮೆ ಮಾಹಿತಿ)
            </div>
            <p style={{ fontSize: '0.84rem', margin: 0 }}>
              Karnataka Silk Cocoon Market Intelligence Platform • Developed by Quilonix
            </p>
          </div>

          <div style={{ display: 'flex', gap: '20px', fontSize: '0.88rem', flexWrap: 'wrap' }}>
            <Link href="/privacy-policy" style={{ color: '#cbd5e1' }}>
              Privacy Policy
            </Link>
            <Link href="/terms" style={{ color: '#cbd5e1' }}>
              Terms of Service
            </Link>
            <a href="mailto:reshmeinfo@quilonix.in" style={{ color: '#cbd5e1' }}>
              Contact Support
            </a>
          </div>
        </div>

        <div
          style={{
            maxWidth: '1200px',
            margin: '24px auto 0',
            paddingTop: '16px',
            borderTop: '1px solid #1e293b',
            fontSize: '0.78rem',
            textAlign: 'center',
            color: '#64748b',
          }}
        >
          © {new Date().getFullYear()} Reshme Info & Quilonix. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
