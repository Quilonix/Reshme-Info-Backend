'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { trackEvent, trackPageView } from '@/lib/analytics';
import { Check, AlertCircle, Save, Trash2, Calendar, Database, AlertTriangle, Clock, Filter } from 'lucide-react';

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

    const { data, error } = await query.limit(50);
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
        created_by: user?.id,
      };

      const { data, error } = await supabase.from('cocoon_prices').insert([payload]).select();

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
      const { data, error, count } = await supabase
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
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Title & 7-Day Cleaner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Daily APMC Auction Rate Entry</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Publish official sericulture auction results with instant farmer push broadcasting.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={handlePurgeOldPrices}
            disabled={purging}
            className="flex items-center justify-center space-x-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-4 py-2.5 rounded-xl text-xs font-bold transition duration-150 disabled:opacity-50 shadow-sm"
          >
            <Database className="w-4 h-4 text-rose-600" />
            <span>{purging ? 'Purging records...' : 'Purge Records > 7 Days'}</span>
          </button>
        )}
      </div>

      {/* Date-Wise Viewing & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Date-Wise View:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleDateTabChange(todayStr)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedViewDate === todayStr
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Today ({todayStr})
            </button>

            <button
              onClick={() => handleDateTabChange(yesterdayStr)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedViewDate === yesterdayStr
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Yesterday ({yesterdayStr})
            </button>

            <button
              onClick={() => handleDateTabChange(dayBeforeStr)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedViewDate === dayBeforeStr
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Day Before ({dayBeforeStr})
            </button>

            <button
              onClick={() => handleDateTabChange('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedViewDate === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Dates
            </button>

            {/* Custom Date Input */}
            <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
              <input
                type="date"
                value={selectedViewDate !== 'all' ? selectedViewDate : ''}
                onChange={(e) => {
                  if (e.target.value) handleDateTabChange(e.target.value);
                }}
                className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-3 text-sm font-semibold">
          <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center space-x-3 text-sm font-semibold">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Entry Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Market Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                APMC Market Name *
              </label>
              <select
                value={formData.market_name}
                onChange={(e) => setFormData({ ...formData, market_name: e.target.value })}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                {markets.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} {m.name_kn ? `(${m.name_kn})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Breed Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Silk Breed Code *
              </label>
              <select
                value={formData.breed}
                onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
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

            {/* Quality Grade */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Quality Grade
              </label>
              <select
                value={formData.quality}
                onChange={(e) => setFormData({ ...formData, quality: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                <option value="A">Grade A (Premium)</option>
                <option value="B">Grade B (Standard)</option>
                <option value="C">Grade C (Commercial)</option>
              </select>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Minimum Price (₹/kg) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="e.g. 520"
                value={formData.min_price}
                onChange={(e) => handlePriceChange('min_price', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Maximum Price (₹/kg) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="e.g. 780"
                value={formData.max_price}
                onChange={(e) => handlePriceChange('max_price', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Average Price (₹/kg) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="Calculated automatically"
                value={formData.avg_price}
                onChange={(e) => setFormData({ ...formData, avg_price: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 font-black text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          {/* Volume & Date Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Lot Number / Count
              </label>
              <input
                type="number"
                placeholder="e.g. 145"
                value={formData.lot_number}
                onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Total Weight (Kg)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 1250.5"
                value={formData.total_weight}
                onChange={(e) => setFormData({ ...formData, total_weight: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Report Date *
              </label>
              <input
                type="date"
                required
                value={formData.report_date}
                onChange={(e) => setFormData({ ...formData, report_date: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          {/* Push Broadcast Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="text-sm font-bold text-slate-900">Broadcast Push Notification to Farmers</p>
              <p className="text-xs text-slate-500">Send an instant alert to farmers subscribed to this APMC market.</p>
            </div>
            <input
              type="checkbox"
              checked={sendNotification}
              onChange={(e) => setSendNotification(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-wider rounded-xl transition duration-150 flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{loading ? 'Saving Auction Price...' : 'Publish Rate Entry'}</span>
          </button>
        </form>
      </div>

      {/* Date-Wise Price Records Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h2 className="text-base font-bold text-slate-900">
              Auction Records for: {selectedViewDate === 'all' ? 'All Dates' : selectedViewDate}
            </h2>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg">
            {pricesForDate.length} entries
          </span>
        </div>

        {pricesForDate.length === 0 ? (
          <div className="text-center py-10 text-slate-400 font-medium text-sm">
            No auction rate entries recorded for {selectedViewDate}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase font-bold text-slate-500">
                  <th className="py-3 px-4">Market</th>
                  <th className="py-3 px-4">Breed</th>
                  <th className="py-3 px-4">Grade</th>
                  <th className="py-3 px-4">Min (₹)</th>
                  <th className="py-3 px-4">Max (₹)</th>
                  <th className="py-3 px-4">Avg (₹/kg)</th>
                  <th className="py-3 px-4">Lots</th>
                  <th className="py-3 px-4">Date</th>
                  {isSuperAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {pricesForDate.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{item.market_name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-bold text-xs">
                        {item.breed}
                      </span>
                    </td>
                    <td className="py-3 px-4">{item.quality || 'A'}</td>
                    <td className="py-3 px-4">₹{item.min_price}</td>
                    <td className="py-3 px-4">₹{item.max_price}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">₹{item.avg_price}</td>
                    <td className="py-3 px-4 text-slate-500">{item.lot_number || '-'}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{item.report_date}</td>
                    {isSuperAdmin && (
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeletePrice(item.id, item.market_name, item.report_date)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          title="Delete entry"
                        >
                          <Trash2 className="w-4 h-4" />
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
