'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { trackEvent, trackPageView } from '@/lib/analytics';
import { Check, AlertCircle, Save, Trash2, Calendar, Database, AlertTriangle } from 'lucide-react';

export default function PriceEntryPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [markets, setMarkets] = useState<any[]>([]);
  const [breeds, setBreeds] = useState<any[]>([]);
  const [recentPrices, setRecentPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [purging, setPurging] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 7 Days Cutoff calculation
  const cutoffDateObj = new Date();
  cutoffDateObj.setDate(cutoffDateObj.getDate() - 7);
  const cutoffDateStr = cutoffDateObj.toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    market_name: '',
    breed: 'CB',
    quality: 'A',
    min_price: '',
    max_price: '',
    avg_price: '',
    lot_number: '',
    total_weight: '',
    report_date: new Date().toISOString().split('T')[0],
  });

  const isSuperAdmin = profile?.role === 'super_admin';

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchDropdownData = async () => {
    // 1. Fetch active markets
    const { data: marketData } = await supabase
      .from('markets')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (marketData && marketData.length > 0) {
      setMarkets(marketData);
      if (!formData.market_name) {
        const defaultMarket =
          profile?.assigned_market && profile.assigned_market !== 'all'
            ? profile.assigned_market
            : marketData[0].name;
        setFormData((prev) => ({ ...prev, market_name: defaultMarket }));
      }
    }

    // 2. Fetch all breeds dynamically
    const { data: breedData } = await supabase
      .from('breeds')
      .select('*')
      .order('created_at', { ascending: true });

    if (breedData && breedData.length > 0) {
      setBreeds(breedData);
    }

    // 3. Fetch recent prices
    const { data: pricesData } = await supabase
      .from('cocoon_prices')
      .select('*')
      .order('report_date', { ascending: false })
      .limit(20);

    if (pricesData) {
      setRecentPrices(pricesData);
    }
  };

  useEffect(() => {
    trackPageView('/prices', 'Price Entry Form');
    fetchDropdownData();
  }, [profile]);

  const handlePriceChange = (field: 'min_price' | 'max_price', value: string) => {
    const nextFormData = { ...formData, [field]: value };
    const min = parseFloat(field === 'min_price' ? value : formData.min_price);
    const max = parseFloat(field === 'max_price' ? value : formData.max_price);

    if (!isNaN(min) && !isNaN(max) && min > 0 && max > 0) {
      const avg = ((min + max) / 2).toFixed(2);
      nextFormData.avg_price = avg;
    }
    setFormData(nextFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    const min = parseFloat(formData.min_price);
    const max = parseFloat(formData.max_price);
    const avg = parseFloat(formData.avg_price);

    if (isNaN(min) || isNaN(max) || isNaN(avg)) {
      setErrorMsg('Please enter valid minimum and maximum prices.');
      return;
    }

    if (max < min) {
      setErrorMsg('Maximum price must be greater than or equal to minimum price.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('cocoon_prices').insert({
        market_name: formData.market_name,
        breed: formData.breed as any,
        quality: formData.quality as any,
        min_price: min,
        max_price: max,
        avg_price: avg,
        price_per_kg: avg,
        lot_number: formData.lot_number ? parseInt(formData.lot_number) : null,
        total_weight: formData.total_weight ? parseFloat(formData.total_weight) : null,
        report_date: formData.report_date,
      });

      if (error) throw error;

      trackEvent('price_entry_created', {
        market: formData.market_name,
        breed: formData.breed,
        avgPrice: avg,
      });

      // Automatically dispatch Push Notification if enabled
      if (sendNotification) {
        try {
          await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: `${formData.market_name} Market Price Update`,
              message: `${formData.breed} Cocoon: Avg Rs ${avg}/kg (Min: Rs ${min}, Max: Rs ${max}) on ${formData.report_date}`,
              priority: 'high',
              targetAudience: 'all',
              targetMarket: formData.market_name,
            }),
          });
        } catch (_) {}
      }

      setSuccessMsg(`Successfully saved price entry and dispatched push alert for ${formData.market_name} (${formData.breed})`);
      setFormData((prev) => ({
        ...prev,
        min_price: '',
        max_price: '',
        avg_price: '',
        lot_number: '',
        total_weight: '',
      }));
      fetchDropdownData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit price');
    } finally {
      setLoading(false);
    }
  };

  // 7-Day Data Purge Handler
  const handlePurgeOldRecords = async () => {
    if (!isSuperAdmin) {
      setErrorMsg('Only Super Admins can purge historical market data.');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to permanently delete all market auction prices recorded before ${cutoffDateStr} (older than 7 days)? This action cannot be undone.`
    );
    if (!confirmed) return;

    setPurging(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const { error, count } = await supabase
        .from('cocoon_prices')
        .delete({ count: 'exact' })
        .lt('report_date', cutoffDateStr);

      if (error) throw error;

      trackEvent('market_data_purged', { cutoffDate: cutoffDateStr, deletedCount: count });
      setSuccessMsg(`Successfully purged previous market data recorded before ${cutoffDateStr}. Preserved past 7 days.`);
      fetchDropdownData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to purge old market records.');
    } finally {
      setPurging(false);
    }
  };

  const handleDeleteSingle = async (id: string, market: string, date: string) => {
    if (!isSuperAdmin) return;
    if (!confirm(`Delete rate record for ${market} on ${date}?`)) return;

    try {
      const { error } = await supabase.from('cocoon_prices').delete().eq('id', id);
      if (error) throw error;
      setSuccessMsg(`Record deleted.`);
      fetchDropdownData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete record.');
    }
  };

  if (authLoading || !user) return null;

  return (
    <div style={{ maxWidth: '900px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cocoon Price Entry & Data Management</h1>
          <p className="page-subtitle">Submit daily auction rates and manage historical retention</p>
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

      {/* 7-Day Purge Action Card */}
      {isSuperAdmin && (
        <div className="card" style={{ background: '#fffbeb', border: '1px solid #fde68a', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 700, fontSize: '0.95rem' }}>
                <Database size={18} />
                <span>7-Day Data Retention Cleaner</span>
              </div>
              <p style={{ fontSize: '0.84rem', color: '#78350f', marginTop: '4px' }}>
                Delete all previous market price records recorded before <strong>{cutoffDateStr}</strong> while retaining the latest 7 days.
              </p>
            </div>
            <button
              onClick={handlePurgeOldRecords}
              disabled={purging}
              className="btn btn-danger"
              style={{ padding: '10px 16px', fontSize: '0.88rem' }}
            >
              <Trash2 size={16} />
              {purging ? 'Purging Old Records...' : 'Delete Records Older Than 7 Days'}
            </button>
          </div>
        </div>
      )}

      {/* Price Form Card */}
      <div className="card">
        <h2 className="card-title">Enter Today's Market Auction Rate</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Market</label>
              <select
                className="form-select"
                value={formData.market_name}
                onChange={(e) => setFormData({ ...formData, market_name: e.target.value })}
                required
                disabled={profile?.role !== 'super_admin' && profile?.assigned_market !== 'all'}
              >
                {markets.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} {m.name_kn ? `(${m.name_kn})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Breed Variety</label>
              <select
                className="form-select"
                value={formData.breed}
                onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                required
              >
                {breeds.length > 0 ? (
                  breeds.map((b) => (
                    <option key={b.id} value={b.code}>
                      {b.name} ({b.code})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="CB">Cross Breed (CB)</option>
                    <option value="BV">Bivoltine (BV)</option>
                    <option value="CB_GOLD">CB Gold (CB_GOLD)</option>
                  </>
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Quality Grade</label>
              <select
                className="form-select"
                value={formData.quality}
                onChange={(e) => setFormData({ ...formData, quality: e.target.value })}
              >
                <option value="A">Grade A (Superior)</option>
                <option value="B">Grade B (Medium)</option>
                <option value="C">Grade C (Low)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Min Price (₹ / kg)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                placeholder="e.g. 520"
                value={formData.min_price}
                onChange={(e) => handlePriceChange('min_price', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Max Price (₹ / kg)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                placeholder="e.g. 680"
                value={formData.max_price}
                onChange={(e) => handlePriceChange('max_price', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Avg Price (₹ / kg)</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                placeholder="e.g. 600"
                value={formData.avg_price}
                onChange={(e) => setFormData({ ...formData, avg_price: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Lot Number (Optional)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 42"
                value={formData.lot_number}
                onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Total Weight in KG (Optional)</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                placeholder="e.g. 1250.5"
                value={formData.total_weight}
                onChange={(e) => setFormData({ ...formData, total_weight: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Report Date</label>
              <input
                type="date"
                className="form-input"
                value={formData.report_date}
                onChange={(e) => setFormData({ ...formData, report_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: '#1e40af' }}>
              <input
                type="checkbox"
                checked={sendNotification}
                onChange={(e) => setSendNotification(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span>Send Instant Push Notification to Farmers on Rate Publish</span>
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '4px' }}
          >
            <Save size={16} />
            {loading ? 'Saving Daily Rate...' : 'Submit Cocoon Price Record'}
          </button>
        </form>
      </div>

      {/* Recent Records Table */}
      <div className="card">
        <h2 className="card-title">Recent Price Records ({recentPrices.length})</h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Market</th>
                <th>Breed</th>
                <th>Min (₹)</th>
                <th>Avg (₹)</th>
                <th>Max (₹)</th>
                <th>Date</th>
                {isSuperAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {recentPrices.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 7 : 6} style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                    No recent price records found.
                  </td>
                </tr>
              ) : (
                recentPrices.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.market_name}</td>
                    <td><span className="badge badge-primary">{p.breed}</span></td>
                    <td>₹{p.min_price}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{p.avg_price}</td>
                    <td>₹{p.max_price}</td>
                    <td style={{ color: '#64748b' }}>{p.report_date}</td>
                    {isSuperAdmin && (
                      <td>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                          onClick={() => handleDeleteSingle(p.id, p.market_name, p.report_date)}
                          title="Delete record"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
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
