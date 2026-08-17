'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { translateToKannada } from '@/lib/translator';
import { Settings, RefreshCw, Save, Check, AlertCircle, ShieldAlert, Languages, ExternalLink } from 'lucide-react';
import { trackPageView, trackEvent } from '@/lib/analytics';

interface VersionConfig {
  latest_version: string;
  min_supported_version: string;
  force_update: boolean;
  update_url: string;
  release_notes: string;
  release_notes_kn: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Default date version helper (e.g. 2026.8.17)
  const today = new Date();
  const defaultDateVersion = `${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}`;

  const [config, setConfig] = useState<VersionConfig>({
    latest_version: defaultDateVersion,
    min_supported_version: defaultDateVersion,
    force_update: false,
    update_url: 'https://play.google.com/store/apps/details?id=com.master.reshmeinfo',
    release_notes: 'New price analytics charts, real-time APMC auction reports, and bug fixes.',
    release_notes_kn: 'ಹೊಸ ಮಾರುಕಟ್ಟೆ ಚಾರ್ಟ್‌ಗಳು, ನೈಜ ಸಮಯದ ಎಪಿಎಂಸಿ ದರಗಳು ಮತ್ತು ಸುಧಾರಣೆಗಳು.',
  });

  const isSuperAdmin = profile?.role === 'super_admin';

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'app_version_config')
      .maybeSingle();

    if (!error && data?.value) {
      setConfig(data.value as VersionConfig);
    }
    setLoading(false);
  };

  useEffect(() => {
    trackPageView('/settings', 'App Version Settings');
    fetchSettings();
  }, []);

  const handleAutoTranslateNotes = async () => {
    if (!config.release_notes) return;
    setTranslating(true);
    const trans = await translateToKannada(config.release_notes);
    if (trans) {
      setConfig((prev) => ({ ...prev, release_notes_kn: trans }));
    }
    setTranslating(false);
  };

  const handleSetTodayVersion = () => {
    setConfig((prev) => ({
      ...prev,
      latest_version: defaultDateVersion,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setErrorMsg('Only Super Admins can update app versioning settings.');
      return;
    }

    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const { error } = await supabase.from('app_settings').upsert({
        key: 'app_version_config',
        value: config,
        description: 'Remote version control and force update rules for Android APK',
      });

      if (error) throw error;

      trackEvent('app_version_updated', {
        latest: config.latest_version,
        forceUpdate: config.force_update,
      });

      setSuccessMsg(`Version settings successfully updated to ${config.latest_version}! Active mobile devices will receive update prompts.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return null;

  if (!isSuperAdmin) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 24px', maxWidth: '520px', margin: '40px auto' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <ShieldAlert size={28} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          Super Admin Access Required
        </h2>
        <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '24px' }}>
          Configuring Android APK release versions, force update policies, and remote app configuration is restricted to Super Administrators.
        </p>
        <button className="btn btn-primary" onClick={() => router.push('/prices')}>
          Go to Price Entry
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">App Version & Remote Update Control</h1>
          <p className="page-subtitle">Configure Android APK date-based release versions and force update rules</p>
        </div>
      </div>

      {successMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', color: '#16a34a', marginBottom: '20px' }}>
          <Check size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#dc2626', marginBottom: '20px' }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Version Status Card */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Published APK Version</div>
          <div className="stat-value">{config.latest_version}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Force Update Enforced</div>
          <div className="stat-value" style={{ color: config.force_update ? '#dc2626' : '#16a34a' }}>
            {config.force_update ? 'ENABLED' : 'OPTIONAL'}
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="card">
        <h2 className="card-title">Publish Version Release</h2>
        <form onSubmit={handleSave}>
          <div className="form-row">
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0 }}>Latest Version (YYYY.M.D)</label>
                <button
                  type="button"
                  onClick={handleSetTodayVersion}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 600,
                  }}
                >
                  <RefreshCw size={12} /> Set to Today ({defaultDateVersion})
                </button>
              </div>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 2026.8.17"
                value={config.latest_version}
                onChange={(e) => setConfig({ ...config, latest_version: e.target.value })}
                required
                disabled={!isSuperAdmin}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Minimum Supported Version</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 2026.8.10"
                value={config.min_supported_version}
                onChange={(e) => setConfig({ ...config, min_supported_version: e.target.value })}
                required
                disabled={!isSuperAdmin}
              />
              <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Devices running below this date version will be forced to update immediately.
              </span>
            </div>
          </div>

          <div className="form-group" style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: isSuperAdmin ? 'pointer' : 'default' }}>
              <input
                type="checkbox"
                checked={config.force_update}
                onChange={(e) => setConfig({ ...config, force_update: e.target.checked })}
                disabled={!isSuperAdmin}
                style={{ width: '18px', height: '18px' }}
              />
              <div>
                <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>Require Force Update for All Users</strong>
                <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                  When enabled, farmers cannot skip the update dialog and must download the new APK version to continue.
                </p>
              </div>
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">Play Store / APK Download URL</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="url"
                className="form-input"
                placeholder="https://play.google.com/store/apps/details?id=com.master.reshmeinfo"
                value={config.update_url}
                onChange={(e) => setConfig({ ...config, update_url: e.target.value })}
                required
                disabled={!isSuperAdmin}
              />
              <a
                href={config.update_url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ whiteSpace: 'nowrap' }}
              >
                <ExternalLink size={16} /> Test Link
              </a>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Release Notes (English)</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="What is new in this release..."
                value={config.release_notes}
                onChange={(e) => setConfig({ ...config, release_notes: e.target.value })}
                disabled={!isSuperAdmin}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0 }}>Release Notes (Kannada)</label>
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={handleAutoTranslateNotes}
                    disabled={translating || !config.release_notes}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 600,
                    }}
                  >
                    <Languages size={14} />
                    {translating ? 'Translating...' : 'Auto-Translate'}
                  </button>
                )}
              </div>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="ಹೊಸ ವೈಶಿಷ್ಟ್ಯಗಳ ವಿವರಣೆ..."
                value={config.release_notes_kn}
                onChange={(e) => setConfig({ ...config, release_notes_kn: e.target.value })}
                disabled={!isSuperAdmin}
              />
            </div>
          </div>

          {isSuperAdmin && (
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', marginTop: '8px' }}
            >
              <Save size={16} />
              {loading ? 'Saving Version Settings...' : 'Save & Publish Version Rules'}
            </button>
          )}
        </form>
      </div>

      {/* Database Retention Cleaner Card */}
      {isSuperAdmin && (
        <div className="card" style={{ marginTop: '24px', border: '1px solid #fecaca', background: '#fff5f5' }}>
          <h2 className="card-title" style={{ color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} /> Database Maintenance & 7-Day Market Retention
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#7f1d1d', marginBottom: '16px', lineHeight: 1.5 }}>
            To ensure optimal database performance and mobile app sync speeds, you can purge all historical auction records recorded before 7 days ago while preserving the past week's market rates.
          </p>
          <button
            onClick={async () => {
              const cutoff = new Date();
              cutoff.setDate(cutoff.getDate() - 7);
              const cutoffStr = cutoff.toISOString().split('T')[0];
              if (!confirm(`Permanently delete all market auction prices older than 7 days (recorded before ${cutoffStr})?`)) return;

              setLoading(true);
              try {
                const { error, count } = await supabase
                  .from('cocoon_prices')
                  .delete({ count: 'exact' })
                  .lt('report_date', cutoffStr);
                if (error) throw error;
                setSuccessMsg(`Database cleaned: Purged historical market records before ${cutoffStr}.`);
              } catch (err: any) {
                setErrorMsg(err.message || 'Failed to clean database.');
              } finally {
                setLoading(false);
              }
            }}
            className="btn btn-danger"
            disabled={loading}
            style={{ padding: '10px 18px' }}
          >
            Purge Historical Market Data (Older Than 7 Days)
          </button>
        </div>
      )}
    </div>
  );
}
