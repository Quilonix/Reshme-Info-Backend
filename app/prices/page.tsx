'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { trackEvent, trackPageView } from '@/lib/analytics';
import { Check, AlertCircle, Save, Trash2, Calendar, Database, Clock } from 'lucide-react';

export default function PriceEntryPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [markets, setMarkets] = useState<any[]>([]);
  const [breeds, setBreeds] = useState<any[]>([]);
  const [pricesForDate, setPricesForDate] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [purging, setPurging] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Format today, yesterday, day before
  const formatDate = (dt: Date) => {
    return dt.toISOString().split('T')[0];
  };

  const todayStr = formatDate(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = formatDate(yesterdayDate);

  const dayBeforeDate = new Date();
  dayBeforeDate.setDate(dayBeforeDate.getDate() - 2);
  const dayBeforeStr = formatDate(dayBeforeDate);

  // Active viewing date (default locked to today)
  const [selectedViewDate, setSelectedViewDate] = useState<string>(todayStr);

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
    report_date: todayStr,
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
  };

  // Fetch prices filtered by the selected view date
  const fetchPricesForDate = async (targetDate: string) => {
    const query = supabase
      .from('cocoon_prices')
      .select('*')
      .order('avg_price', { ascending: false });

    if (targetDate !== 'all') {
      query.eq('report_date', targetDate);
    }

    const { data } = await query.limit(50);
    if (data) {
      setPricesForDate(data);
    }
  };

  useEffect(() => {
    trackPageView('/prices', 'Price Entry Form');
    fetchDropdownData();
    fetchPricesForDate(selectedViewDate);
  }, [profile]);

  useEffect(() => {
    fetchPricesForDate(selectedViewDate);
  }, [selectedViewDate]);

  const handleDateTabChange = (newDate: string) => {
    setSelectedViewDate(newDate);
    if (newDate !== 'all') {
      setFormData((prev) => ({ ...prev, report_date: newDate }));
    }
  };

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
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const min = parseFloat(formData.min_price);
      const max = parseFloat(formData.max_price);
      const avg = parseFloat(formData.avg_price);

      if (isNaN(min) || isNaN(max) || isNaN(avg)) {
        throw new Error('Please enter valid numeric price values.');
      }
      if (max < min) {
        throw new Error('Maximum price cannot be lower than minimum price.');
      }

      // Check market permission
      if (
        profile?.role === 'market_admin' &&
        profile.assigned_market !== 'all' &&
        profile.assigned_market !== formData.market_name
      ) {
        throw new Error(`You are only permitted to enter prices for ${profile.assigned_market}.`);
      }

      const payload = {
        market_name: formData.market_name,
        breed: formData.breed,
        quality: formData.quality,
        min_price: min,
        max_price: max,
        avg_price: avg,
        lot_number: formData.lot_number ? parseInt(formData.lot_number) : null,
        total_weight: formData.total_weight ? parseFloat(formData.total_weight) : null,
        report_date: formData.report_date,
        source: 'manual',
        created_by: user?.id,
      };

      const { error } = await supabase.from('cocoon_prices').insert([payload]);
      if (error) throw error;

      trackEvent('price_entry_submitted', {
        market: formData.market_name,
        breed: formData.breed,
        avgPrice: avg,
        date: formData.report_date,
      });

      // Send Push Notification Broadcast if enabled
      if (sendNotification) {
        try {
          await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: `Live Silk Rate: ${formData.market_name}`,
              body: `${formData.breed} Silk Cocoon Average: ₹${avg}/kg (Min: ₹${min}, Max: ₹${max}) on ${formData.report_date}`,
              targetMarket: formData.market_name,
              priority: 'high',
            }),
          });
        } catch (notifErr) {
          console.warn('Push notification delivery note:', notifErr);
        }
      }

      setSuccessMsg(`Market auction rate for ${formData.market_name} on ${formData.report_date} successfully saved.`);
      fetchPricesForDate(selectedViewDate);

      // Reset form but retain market & date
      setFormData((prev) => ({
        ...prev,
        min_price: '',
        max_price: '',
        avg_price: '',
        lot_number: '',
        total_weight: '',
      }));
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit price entry.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurgeOldPrices = async () => {
    if (!isSuperAdmin) {
      alert('Only Super Administrators are permitted to purge old auction records.');
      return;
    }

    const confirmPurge = window.confirm(
      `Are you sure you want to permanently delete all price records older than 7 days (before ${cutoffDateStr})? This action cannot be undone.`
    );
    if (!confirmPurge) return;

    setPurging(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { error } = await supabase
        .from('cocoon_prices')
        .delete()
        .lt('report_date', cutoffDateStr);

      if (error) throw error;

      trackEvent('prices_purged_7days', { cutoffDate: cutoffDateStr });
      setSuccessMsg(`All price records older than 7 days (before ${cutoffDateStr}) have been purged.`);
      fetchPricesForDate(selectedViewDate);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to purge old price records.');
    } finally {
      setPurging(false);
    }
  };

  const handleDeletePrice = async (id: string, market: string, date: string) => {
    if (!isSuperAdmin) {
      alert('Only Super Administrators are permitted to delete auction entries.');
      return;
    }
    if (!confirm(`Delete price record for ${market} on ${date}?`)) return;

    try {
      const { error } = await supabase.from('cocoon_prices').delete().eq('id', id);
      if (error) throw error;
      setSuccessMsg('Price record deleted successfully.');
      fetchPricesForDate(selectedViewDate);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete record.');
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Daily APMC Auction Rate Entry</h1>
          <p className="page-subtitle">Publish official sericulture auction results with instant farmer push broadcasting.</p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={handlePurgeOldPrices}
            disabled={purging}
            className="btn btn-danger"
            style={{ fontSize: '0.82rem', padding: '8px 16px', minHeight: '40px' }}
          >
            <Database style={{ width: '16px', height: '16px' }} />
            <span>{purging ? 'Purging...' : 'Purge Records > 7 Days'}</span>
          </button>
        )}
      </div>

      {/* Date-Wise Selector Bar */}
      <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar style={{ width: '18px', height: '18px', color: 'var(--primary)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Date-Wise View:
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleDateTabChange(todayStr)}
              className={selectedViewDate === todayStr ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ fontSize: '0.82rem', padding: '6px 14px', minHeight: '36px', borderRadius: '10px' }}
            >
              Today ({todayStr})
            </button>

            <button
              onClick={() => handleDateTabChange(yesterdayStr)}
              className={selectedViewDate === yesterdayStr ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ fontSize: '0.82rem', padding: '6px 14px', minHeight: '36px', borderRadius: '10px' }}
            >
              Yesterday ({yesterdayStr})
            </button>

            <button
              onClick={() => handleDateTabChange(dayBeforeStr)}
              className={selectedViewDate === dayBeforeStr ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ fontSize: '0.82rem', padding: '6px 14px', minHeight: '36px', borderRadius: '10px' }}
            >
              Day Before ({dayBeforeStr})
            </button>

            <button
              onClick={() => handleDateTabChange('all')}
              className={selectedViewDate === 'all' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ fontSize: '0.82rem', padding: '6px 14px', minHeight: '36px', borderRadius: '10px' }}
            >
              All Dates
            </button>

            {/* Custom Date Input */}
            <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '8px', borderLeft: '1px solid var(--border)' }}>
              <input
                type="date"
                value={selectedViewDate !== 'all' ? selectedViewDate : ''}
                onChange={(e) => {
                  if (e.target.value) handleDateTabChange(e.target.value);
                }}
                className="form-input"
                style={{ padding: '6px 10px', fontSize: '0.82rem', borderRadius: '8px', minHeight: '36px', width: 'auto' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {successMsg && (
        <div className="alert-box alert-success" style={{ marginBottom: '20px', padding: '14px 18px', background: 'var(--success-light)', border: '1px solid #bbf7d0', borderRadius: '12px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
          <Check style={{ width: '20px', height: '20px', flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="alert-box alert-error" style={{ marginBottom: '20px', padding: '14px 18px', background: 'var(--danger-light)', border: '1px solid #fecaca', borderRadius: '12px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600 }}>
          <AlertCircle style={{ width: '20px', height: '20px', flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Entry Form Card */}
      <div className="card" style={{ marginBottom: '24px', padding: '24px' }}>
        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Save style={{ width: '20px', height: '20px', color: 'var(--primary)' }} />
          Publish Auction Rate for {formData.report_date}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Row 1: Market, Breed, Quality */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginBottom: '20px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">APMC Market Name *</label>
              <select
                value={formData.market_name}
                onChange={(e) => setFormData({ ...formData, market_name: e.target.value })}
                required
                className="form-select"
              >
                {markets.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} {m.name_kn ? `(${m.name_kn})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Silk Breed Code *</label>
              <select
                value={formData.breed}
                onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                required
                className="form-select"
              >
                {breeds.length > 0 ? (
                  breeds.map((b) => (
                    <option key={b.id || b.code} value={b.code}>
                      {b.code} - {b.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="CB">Cross Breed (CB)</option>
                    <option value="BV">Bivoltine (BV)</option>
                    <option value="CB_GOLD">CB Gold</option>
                  </>
                )}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Quality Grade</label>
              <select
                value={formData.quality}
                onChange={(e) => setFormData({ ...formData, quality: e.target.value })}
                className="form-select"
              >
                <option value="A">Grade A (Premium)</option>
                <option value="B">Grade B (Standard)</option>
                <option value="C">Grade C (Commercial)</option>
              </select>
            </div>
          </div>

          {/* Row 2: Price Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', padding: '18px', background: 'var(--background)', borderRadius: '14px', border: '1px solid var(--border)', marginBottom: '20px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Minimum Price (₹/kg) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="e.g. 520"
                value={formData.min_price}
                onChange={(e) => handlePriceChange('min_price', e.target.value)}
                className="form-input"
                style={{ fontWeight: 800 }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Maximum Price (₹/kg) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="e.g. 780"
                value={formData.max_price}
                onChange={(e) => handlePriceChange('max_price', e.target.value)}
                className="form-input"
                style={{ fontWeight: 800 }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Average Price (₹/kg) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="Calculated automatically"
                value={formData.avg_price}
                onChange={(e) => setFormData({ ...formData, avg_price: e.target.value })}
                className="form-input"
                style={{ fontWeight: 900, color: 'var(--success)', background: '#f0fdf4', borderColor: '#86efac' }}
              />
            </div>
          </div>

          {/* Row 3: Lots, Weight, Date */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '20px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Lot Count / Number</label>
              <input
                type="number"
                placeholder="e.g. 145"
                value={formData.lot_number}
                onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Total Weight (Kg)</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 1250.5"
                value={formData.total_weight}
                onChange={(e) => setFormData({ ...formData, total_weight: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Report Date *</label>
              <input
                type="date"
                required
                value={formData.report_date}
                onChange={(e) => setFormData({ ...formData, report_date: e.target.value })}
                className="form-input"
                style={{ fontWeight: 700 }}
              />
            </div>
          </div>

          {/* Push Broadcast Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--background)', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '24px' }}>
            <div>
              <p style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)', margin: 0 }}>Broadcast Push Notification to Farmers</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Send an instant alert to farmers subscribed to this APMC market.</p>
            </div>
            <input
              type="checkbox"
              checked={sendNotification}
              onChange={(e) => setSendNotification(e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary)' }}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '16px', fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}
          >
            <Save style={{ width: '20px', height: '20px' }} />
            <span>{loading ? 'Saving Auction Price...' : 'Publish Rate Entry'}</span>
          </button>
        </form>
      </div>

      {/* Date-Wise Records Table Card */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock style={{ width: '18px', height: '18px', color: 'var(--text-muted)' }} />
            <h2 className="card-title" style={{ margin: 0 }}>
              Auction Records for: {selectedViewDate === 'all' ? 'All Dates' : selectedViewDate}
            </h2>
          </div>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, padding: '4px 10px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '8px' }}>
            {pricesForDate.length} entries recorded
          </span>
        </div>

        {pricesForDate.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            No auction rate entries recorded for {selectedViewDate}.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--background)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800 }}>
                  <th style={{ padding: '12px 14px' }}>Market</th>
                  <th style={{ padding: '12px 14px' }}>Breed</th>
                  <th style={{ padding: '12px 14px' }}>Grade</th>
                  <th style={{ padding: '12px 14px' }}>Min (₹)</th>
                  <th style={{ padding: '12px 14px' }}>Max (₹)</th>
                  <th style={{ padding: '12px 14px' }}>Avg (₹/kg)</th>
                  <th style={{ padding: '12px 14px' }}>Lots</th>
                  <th style={{ padding: '12px 14px' }}>Source</th>
                  <th style={{ padding: '12px 14px' }}>Date</th>
                  {isSuperAdmin && <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                {pricesForDate.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 800 }}>{item.market_name}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 8px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                        {item.breed}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>{item.quality || 'A'}</td>
                    <td style={{ padding: '12px 14px' }}>₹{item.min_price}</td>
                    <td style={{ padding: '12px 14px' }}>₹{item.max_price}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 900, color: 'var(--success)', fontSize: '0.98rem' }}>₹{item.avg_price}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{item.lot_number || '-'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {item.source === 'wa_automation' ? (
                        <span style={{ padding: '3px 8px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                          WA Auto
                        </span>
                      ) : item.source === 'ai_extractor' ? (
                        <span style={{ padding: '3px 8px', background: '#faf5ff', color: '#9333ea', border: '1px solid #e9d5ff', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                          AI Extractor
                        </span>
                      ) : (
                        <span style={{ padding: '3px 8px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                          Admin Manual
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>{item.report_date}</td>
                    {isSuperAdmin && (
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeletePrice(item.id, item.market_name, item.report_date)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '6px', borderRadius: '6px' }}
                          title="Delete entry"
                        >
                          <Trash2 style={{ width: '16px', height: '16px' }} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
