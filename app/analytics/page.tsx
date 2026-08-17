'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import {
  BarChart3,
  Activity,
  Store,
  Users,
  ExternalLink,
  RefreshCw,
  Layers,
  Sparkles,
  TrendingUp,
  Clock,
  Radio,
  Smartphone,
  MapPin,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { trackPageView } from '@/lib/analytics';

interface AnalyticsPayload {
  configured: boolean;
  propertyId?: string;
  message?: string;
  overview?: {
    realtime_users: number;
    dau: number;
    mau: number;
    sessions: number;
    new_users: number;
    screen_views: number;
    avg_session_s: number;
  };
  dau_trend?: Array<{ date: string; users: number; sessions: number }>;
  top_screens?: Array<{ screen: string; views: number; sessions: number }>;
  top_events?: Array<{ event: string; count: number; users: number }>;
  top_cities?: Array<{ city: string; users: number }>;
  device_breakdown?: Array<{ device: string; users: number }>;
  os_breakdown?: Array<{ os: string; users: number }>;
}

export default function AnalyticsDashboardPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const isSuperAdmin = profile?.role === 'super_admin';

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics-report');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      trackPageView('/analytics', 'Google Analytics Command Center');
      loadAnalytics();
    }
  }, [isSuperAdmin]);

  // 10s auto-refresh
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh && isSuperAdmin) {
      interval = setInterval(() => {
        loadAnalytics();
      }, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, isSuperAdmin]);

  if (authLoading || !user) return null;

  if (!isSuperAdmin) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 24px', maxWidth: '520px', margin: '40px auto' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <AlertTriangle size={28} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          Super Admin Access Required
        </h2>
        <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '24px' }}>
          Live App Telemetry, GA4 streaming, and farmer engagement metrics are restricted to Super Administrators.
        </p>
        <button className="btn btn-primary" onClick={() => router.push('/prices')}>
          Go to Price Entry
        </button>
      </div>
    );
  }

  const ov = data?.overview || {
    realtime_users: 0,
    dau: 0,
    mau: 0,
    sessions: 0,
    new_users: 0,
    screen_views: 0,
    avg_session_s: 0,
  };

  const avgMin = Math.floor(ov.avg_session_s / 60);
  const avgSec = Math.round(ov.avg_session_s % 60);
  const avgSessionFormatted = ov.avg_session_s > 0 ? `${avgMin}m ${avgSec}s` : '—';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Google Analytics Command Center</h1>
          <p className="page-subtitle">Live farmer telemetry powered by Google Analytics Data API v1beta</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', cursor: 'pointer', color: '#475569' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            <span>Auto-refresh (10s)</span>
          </label>
          <a
            href="https://analytics.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ExternalLink size={16} /> Open GA4 Console
          </a>
          <button className="btn btn-primary" onClick={loadAnalytics} disabled={loading}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Connection & Configuration Notice */}
      {!data?.configured && (
        <div className="card" style={{ border: '1px solid #fde047', background: '#fefce8', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={24} color="#ca8a04" />
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#854d0e', fontWeight: 700 }}>
                Google Analytics Data API Ready
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#a16207' }}>
                {data?.message || 'Add GA_PROPERTY_ID into admin-pwa/.env.local to stream live analytics data directly into this panel.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Realtime KPI Banner */}
      <div className="card" style={{ border: '1px solid #86efac', background: '#f0fdf4', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#16a34a', boxShadow: '0 0 0 4px rgba(22,163,74,0.2)' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                Real-Time User Stream Active
                {data?.propertyId && (
                  <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#15803d' }}>
                    (Property: {data.propertyId})
                  </span>
                )}
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#15803d' }}>
                Streaming live screen transitions, market clicks, and language switches from Android APK.
              </p>
            </div>
          </div>
          <span className="badge" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}>
            <Radio size={14} color="#16a34a" /> Live Farmers (Last 30m): {ov.realtime_users}
          </span>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Daily Active Users (DAU)</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>
            {data?.configured ? ov.dau.toLocaleString() : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Monthly Active Users (30D)</div>
          <div className="stat-value">
            {data?.configured ? ov.mau.toLocaleString() : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Sessions</div>
          <div className="stat-value">
            {data?.configured ? ov.sessions.toLocaleString() : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">New Farmers (30D)</div>
          <div className="stat-value" style={{ color: '#16a34a' }}>
            {data?.configured ? ov.new_users.toLocaleString() : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Screen & Page Views</div>
          <div className="stat-value">
            {data?.configured ? ov.screen_views.toLocaleString() : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Session Duration</div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>
            {data?.configured ? avgSessionFormatted : '—'}
          </div>
        </div>
      </div>

      {/* DAU Daily Trend Visualizer */}
      {data?.dau_trend && data.dau_trend.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="var(--primary)" /> Daily Active Farmers Trend (Last 14 Days)
          </h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '140px', padding: '16px 0 8px' }}>
            {data.dau_trend.map((item) => {
              const maxUsers = Math.max(...(data.dau_trend || []).map((t) => t.users), 1);
              const heightPercent = Math.round((item.users / maxUsers) * 100);
              const formattedDate = item.date.length === 8 ? `${item.date.slice(6, 8)}/${item.date.slice(4, 6)}` : item.date;
              return (
                <div key={item.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '4px' }}>{item.users}</span>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '28px',
                      height: `${Math.max(heightPercent, 6)}%`,
                      background: 'var(--primary)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease',
                    }}
                    title={`${formattedDate}: ${item.users} active farmers, ${item.sessions} sessions`}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '6px' }}>{formattedDate}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="form-row" style={{ marginTop: '20px' }}>
        {/* Top Screens Table */}
        <div className="card">
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="var(--primary)" /> Top Visited Screens
          </h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Screen Name</th>
                  <th>Views</th>
                  <th>Sessions</th>
                </tr>
              </thead>
              <tbody>
                {(!data?.top_screens || data.top_screens.length === 0) ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: '#64748b', padding: '16px' }}>
                      {data?.configured ? 'No screen view data recorded yet.' : 'Configuring GA Data API...'}
                    </td>
                  </tr>
                ) : (
                  data.top_screens.map((row) => (
                    <tr key={row.screen}>
                      <td style={{ fontWeight: 600 }}>{row.screen}</td>
                      <td><span className="badge badge-primary">{row.views.toLocaleString()}</span></td>
                      <td style={{ color: '#64748b' }}>{row.sessions.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Events Table */}
        <div className="card">
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="var(--primary)" /> Top User Events
          </h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Occurrences</th>
                  <th>Active Users</th>
                </tr>
              </thead>
              <tbody>
                {(!data?.top_events || data.top_events.length === 0) ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: '#64748b', padding: '16px' }}>
                      {data?.configured ? 'No events recorded yet.' : 'Configuring GA Data API...'}
                    </td>
                  </tr>
                ) : (
                  data.top_events.map((row) => (
                    <tr key={row.event}>
                      <td><span className="badge" style={{ fontFamily: 'monospace', background: '#eff6ff', color: '#1d4ed8' }}>{row.event}</span></td>
                      <td style={{ fontWeight: 600 }}>{row.count.toLocaleString()}</td>
                      <td style={{ color: '#64748b' }}>{row.users.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="form-row">
        {/* Top Cities (Districts in Karnataka) */}
        <div className="card">
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} color="var(--primary)" /> Top Farmer Locations (Cities & Districts)
          </h2>
          {(!data?.top_cities || data.top_cities.length === 0) ? (
            <p style={{ color: '#64748b', fontSize: '0.88rem' }}>No geographic telemetry recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {data.top_cities.map((row) => {
                const maxUsers = Math.max(...(data.top_cities || []).map((c) => c.users), 1);
                const percent = Math.round((row.users / maxUsers) * 100);
                return (
                  <div key={row.city}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600 }}>{row.city}</span>
                      <span>{row.users} active farmers</span>
                    </div>
                    <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${percent}%`, background: '#16a34a', borderRadius: '4px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Device & OS Breakdown */}
        <div className="card">
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Smartphone size={18} color="var(--primary)" /> Device & Operating System Breakdown
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Operating System</div>
              {data?.os_breakdown && data.os_breakdown.length > 0 ? (
                data.os_breakdown.map((row) => (
                  <div key={row.os} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>{row.os}</span>
                    <strong>{row.users} users</strong>
                  </div>
                ))
              ) : (
                <p style={{ color: '#64748b', fontSize: '0.86rem', margin: 0 }}>Android (Primary)</p>
              )}
            </div>

            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Device Category</div>
              {data?.device_breakdown && data.device_breakdown.length > 0 ? (
                data.device_breakdown.map((row) => (
                  <div key={row.device} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ textTransform: 'capitalize' }}>{row.device}</span>
                    <strong>{row.users} users</strong>
                  </div>
                ))
              ) : (
                <p style={{ color: '#64748b', fontSize: '0.86rem', margin: 0 }}>Mobile devices</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
