'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import {
  PlusCircle,
  Sparkles,
  BookOpen,
  Bell,
  BarChart3,
  Store,
  Users,
  Settings,
  TrendingUp,
  Clock,
  ShieldCheck,
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import { trackPageView } from '@/lib/analytics';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  
  const [stats, setStats] = useState({
    todayPrices: 0,
    activeMarkets: 0,
    totalGuides: 0,
    totalNotifications: 0,
  });
  const [recentPrices, setRecentPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = profile?.role === 'super_admin';

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    trackPageView('/admin', 'Admin Dashboard');
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // 1. Fetch today's price count
      const { count: pricesCount } = await supabase
        .from('cocoon_prices')
        .select('*', { count: 'exact', head: true })
        .eq('report_date', today);

      // 2. Fetch active markets count
      const { count: marketsCount } = await supabase
        .from('markets')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // 3. Fetch guides count
      const { count: guidesCount } = await supabase
        .from('content_items')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // 4. Fetch notifications count
      const { count: notificationsCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // 5. Fetch recent 5 prices
      const { data: prices } = await supabase
        .from('cocoon_prices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        todayPrices: pricesCount || 0,
        activeMarkets: marketsCount || 0,
        totalGuides: guidesCount || 0,
        totalNotifications: notificationsCount || 0,
      });

      if (prices) setRecentPrices(prices);
    } catch (e) {
      console.error('Dashboard stats fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Command Center</h1>
          <p className="page-subtitle">
            Welcome back, <strong>{profile?.username || user.email?.split('@')[0]}</strong> ({isSuperAdmin ? 'Super Admin' : `Market Admin: ${profile?.assigned_market}`})
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={() => router.push('/prices')}>
            <PlusCircle size={16} /> Enter Daily Price
          </button>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => router.push('/prices')}>
          <div className="stat-label">Today's Price Submissions</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>
            {stats.todayPrices}
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => router.push('/cms')}>
          <div className="stat-label">Published Guides & Videos</div>
          <div className="stat-value" style={{ color: '#0f766e' }}>
            {stats.totalGuides}
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => router.push('/notifications')}>
          <div className="stat-label">Active Push Bulletins</div>
          <div className="stat-value" style={{ color: '#d97706' }}>
            {stats.totalNotifications}
          </div>
        </div>

        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => router.push(isSuperAdmin ? '/markets' : '/prices')}>
          <div className="stat-label">Active APMC Markets</div>
          <div className="stat-value" style={{ color: '#16a34a' }}>
            {stats.activeMarkets}
          </div>
        </div>
      </div>

      {/* Quick Launch Operations Grid */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '24px 0 12px' }}>
        Quick Administrative Workflows
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div
          className="card"
          style={{ cursor: 'pointer', transition: 'all 0.15s ease', border: '1.5px solid #e2e8f0' }}
          onClick={() => router.push('/prices')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <div style={{ padding: '10px', background: '#eff6ff', borderRadius: '10px', color: 'var(--primary)' }}>
              <PlusCircle size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Enter Daily Prices</h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Post APMC market rates</span>
            </div>
          </div>
          <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
            Input Min, Max, and Average cocoon prices with auto push notification toggle.
          </p>
        </div>

        <div
          className="card"
          style={{ cursor: 'pointer', transition: 'all 0.15s ease', border: '1.5px solid #e2e8f0' }}
          onClick={() => router.push('/ai-extractor')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <div style={{ padding: '10px', background: '#f5f3ff', borderRadius: '10px', color: '#7c3aed' }}>
              <Sparkles size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>AI Bulletin Extractor</h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>OCR & WhatsApp parsing</span>
            </div>
          </div>
          <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
            Upload APMC bulletin text or PDFs to automatically extract structured lots.
          </p>
        </div>

        <div
          className="card"
          style={{ cursor: 'pointer', transition: 'all 0.15s ease', border: '1.5px solid #e2e8f0' }}
          onClick={() => router.push('/notifications')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <div style={{ padding: '10px', background: '#fffbeb', borderRadius: '10px', color: '#d97706' }}>
              <Bell size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Notification Studio</h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Broadcast FCM alerts</span>
            </div>
          </div>
          <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
            Send instant push notifications to all farmers or specific market topics.
          </p>
        </div>

        <div
          className="card"
          style={{ cursor: 'pointer', transition: 'all 0.15s ease', border: '1.5px solid #e2e8f0' }}
          onClick={() => router.push('/cms')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <div style={{ padding: '10px', background: '#f0fdf4', borderRadius: '10px', color: '#16a34a' }}>
              <BookOpen size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Knowledge CMS</h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Publish farming guides</span>
            </div>
          </div>
          <p style={{ fontSize: '0.84rem', color: '#64748b', margin: 0 }}>
            Publish bilingual sericulture tutorials and YouTube video lessons.
          </p>
        </div>
      </div>

      {/* Super Admin Exclusive Row */}
      {isSuperAdmin && (
        <>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '24px 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="var(--primary)" /> Super Admin Management Center
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div
              className="card"
              style={{ cursor: 'pointer', transition: 'all 0.15s ease', border: '1.5px solid #bfdbfe', background: '#eff6ff' }}
              onClick={() => router.push('/analytics')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <BarChart3 size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>App Telemetry & GA4</h3>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#1e3a8a', margin: 0 }}>
                Stream live active farmers, DAU, sessions, and Karnataka district telemetry.
              </p>
            </div>

            <div
              className="card"
              style={{ cursor: 'pointer', transition: 'all 0.15s ease', border: '1.5px solid #bfdbfe', background: '#eff6ff' }}
              onClick={() => router.push('/users')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <Users size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>Admin Team & Watch</h3>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#1e3a8a', margin: 0 }}>
                Provision new market administrators and audit price submission history.
              </p>
            </div>

            <div
              className="card"
              style={{ cursor: 'pointer', transition: 'all 0.15s ease', border: '1.5px solid #bfdbfe', background: '#eff6ff' }}
              onClick={() => router.push('/markets')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <Store size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>Markets & Breeds</h3>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#1e3a8a', margin: 0 }}>
                Configure APMC market locations, Kannada translations, and silkworm breeds.
              </p>
            </div>

            <div
              className="card"
              style={{ cursor: 'pointer', transition: 'all 0.15s ease', border: '1.5px solid #bfdbfe', background: '#eff6ff' }}
              onClick={() => router.push('/settings')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <Settings size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: 'var(--primary)' }}>App Version Control</h3>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#1e3a8a', margin: 0 }}>
                Manage Android APK release versions and enforce remote force-updates.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Recent Activity Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="card-title" style={{ margin: 0 }}>Recent Market Price Submissions</h2>
          <button className="btn btn-secondary" onClick={() => router.push('/prices')}>
            View All Prices <ArrowRight size={14} />
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>APMC Market</th>
                <th>Breed</th>
                <th>Average Price</th>
                <th>Min / Max Range</th>
                <th>Lots & Weight</th>
                <th>Report Date</th>
              </tr>
            </thead>
            <tbody>
              {recentPrices.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    {loading ? 'Loading recent submissions...' : 'No price records submitted yet.'}
                  </td>
                </tr>
              ) : (
                recentPrices.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{row.market_name}</td>
                    <td><span className="badge badge-primary">{row.breed}</span></td>
                    <td style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1rem' }}>
                      ₹{row.avg_price || row.price_per_kg}/kg
                    </td>
                    <td style={{ color: '#475569', fontSize: '0.86rem' }}>
                      ₹{row.min_price} to ₹{row.max_price}
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.86rem' }}>
                      {row.lot_number ? `${row.lot_number} lots` : '—'} {row.total_weight ? `(${row.total_weight}kg)` : ''}
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.84rem' }}>{row.report_date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
