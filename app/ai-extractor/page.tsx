'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Sparkles, Check, AlertCircle, Trash2, Edit3, Save } from 'lucide-react';
import { trackEvent, trackPageView } from '@/lib/analytics';

interface ExtractedPriceItem {
  market_name: string;
  breed: 'CB' | 'BV' | 'CB_GOLD';
  quality?: string;
  min_price: number;
  max_price: number;
  avg_price: number;
  lot_number?: number;
  total_weight?: number;
  report_date: string;
}

export default function AIExtractorPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [extractedList, setExtractedList] = useState<ExtractedPriceItem[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<'groq' | 'gemini'>('groq');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    trackPageView('/ai-extractor', 'AI Price Extractor');
  }, []);

  const handleExtract = async () => {
    if (!inputText.trim()) {
      setErrorMessage('Please paste daily market WhatsApp text or bulletin report.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      // Call secure backend API route handler
      const res = await fetch('/api/ai-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          provider: selectedProvider,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to extract price data');
      }

      const results: ExtractedPriceItem[] = Array.isArray(json.data) ? json.data : [json.data];
      setExtractedList(results);
      setStatusMessage(`AI successfully extracted ${results.length} price record(s). Please review and approve below.`);

      trackEvent('ai_extraction_run', {
        provider: json.provider || selectedProvider,
        itemCount: results.length,
        success: true,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Extraction error occurred');
      trackEvent('ai_extraction_run', { provider: selectedProvider, success: false });
    } finally {
      setLoading(false);
    }
  };

  const handleRowChange = (index: number, field: keyof ExtractedPriceItem, value: any) => {
    setExtractedList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleDeleteRow = (index: number) => {
    setExtractedList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleApproveAndSave = async () => {
    if (extractedList.length === 0) return;
    setLoading(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const recordsToInsert = extractedList.map((item) => ({
        market_name: item.market_name,
        breed: item.breed,
        quality: item.quality || 'A',
        min_price: parseFloat(item.min_price as any) || 0,
        max_price: parseFloat(item.max_price as any) || 0,
        avg_price: parseFloat(item.avg_price as any) || 0,
        price_per_kg: parseFloat(item.avg_price as any) || 0,
        lot_number: item.lot_number ? parseInt(item.lot_number as any) : null,
        total_weight: item.total_weight ? parseFloat(item.total_weight as any) : null,
        report_date: item.report_date,
        source: 'ai_extractor',
      }));

      const { error } = await supabase.from('cocoon_prices').insert(recordsToInsert);
      if (error) throw error;

      trackEvent('ai_extracted_prices_saved', { count: recordsToInsert.length });

      // Automatically dispatch push notification
      try {
        const marketsList = Array.from(new Set(recordsToInsert.map((r) => r.market_name))).join(', ');
        const date = recordsToInsert[0]?.report_date || 'Today';
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${marketsList} Market Auction Update`,
            message: `Latest cocoon rates for ${recordsToInsert.length} variety lots on ${date} are now available in Reshme Info.`,
            priority: 'high',
            targetAudience: 'all',
          }),
        });
      } catch (_) {}

      setStatusMessage(`Approved and saved ${recordsToInsert.length} price records to the live database, and dispatched push notifications to farmers!`);
      setExtractedList([]);
      setInputText('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save price records to database.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div style={{ maxWidth: '1000px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Price Extractor & Review Studio</h1>
          <p className="page-subtitle">Paste raw WhatsApp market notices, review extracted prices, and approve them to the database</p>
        </div>
      </div>

      {statusMessage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', color: '#16a34a', marginBottom: '20px' }}>
          <Check size={18} />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#dc2626', marginBottom: '20px' }}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Paste Raw WhatsApp Market Bulletin / Slip (Kannada or English)</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>AI Engine:</span>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '4px 10px', fontSize: '0.82rem' }}
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as any)}
            >
              <option value="groq">Groq Llama 3.1 Instant (Active)</option>
              <option value="gemini">Google Gemini Flash</option>
            </select>
          </div>
        </div>

        <textarea
          className="form-textarea"
          rows={6}
          placeholder="Paste raw market text here, for example:&#10;GCM Shidlaghatta&#10;Date:17/08/2026&#10;CB: lots:- 437, Qty:- 23181 kg, Mx :-786, Mn :- 480, Avg:- 709&#10;BV: lots: 8, Qty:- 383 kg, Mx:- 870, Mn:- 652, Avg:- 809"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />

        <button
          className="btn btn-primary"
          style={{ marginTop: '16px', padding: '10px 20px', fontSize: '0.92rem' }}
          onClick={handleExtract}
          disabled={loading || !inputText.trim()}
        >
          <Sparkles size={18} />
          {loading ? 'Analyzing & Extracting with AI...' : 'Extract Market Data (AI)'}
        </button>
      </div>

      {/* Extracted Interactive Review & Approval Table */}
      {extractedList.length > 0 && (
        <div className="card" style={{ border: '2px solid #93c5fd', background: '#f8fafc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 className="card-title" style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={18} /> Review & Approve Extracted Records ({extractedList.length})
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
                Verify or edit any numbers below before approving to the live database.
              </p>
            </div>
            <button
              className="btn btn-primary"
              style={{ background: '#16a34a', borderColor: '#15803d', padding: '10px 20px', fontSize: '0.92rem', fontWeight: 700 }}
              onClick={handleApproveAndSave}
              disabled={loading}
            >
              <Check size={18} />
              {loading ? 'Saving to Database...' : `Approve & Publish ${extractedList.length} Record(s)`}
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Market Name</th>
                  <th>Breed</th>
                  <th>Min Price (₹)</th>
                  <th>Avg Price (₹)</th>
                  <th>Max Price (₹)</th>
                  <th>Lots</th>
                  <th>Total Weight (kg)</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {extractedList.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '4px 8px', fontSize: '0.86rem', width: '130px' }}
                        value={item.market_name}
                        onChange={(e) => handleRowChange(idx, 'market_name', e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        className="form-select"
                        style={{ padding: '4px 6px', fontSize: '0.86rem', width: '90px' }}
                        value={item.breed}
                        onChange={(e) => handleRowChange(idx, 'breed', e.target.value)}
                      >
                        <option value="CB">CB</option>
                        <option value="BV">BV</option>
                        <option value="CB_GOLD">CB_GOLD</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-input"
                        style={{ padding: '4px 8px', fontSize: '0.86rem', width: '90px' }}
                        value={item.min_price}
                        onChange={(e) => handleRowChange(idx, 'min_price', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-input"
                        style={{ padding: '4px 8px', fontSize: '0.86rem', width: '90px', fontWeight: 700, color: 'var(--primary)' }}
                        value={item.avg_price}
                        onChange={(e) => handleRowChange(idx, 'avg_price', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-input"
                        style={{ padding: '4px 8px', fontSize: '0.86rem', width: '90px' }}
                        value={item.max_price}
                        onChange={(e) => handleRowChange(idx, 'max_price', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-input"
                        style={{ padding: '4px 8px', fontSize: '0.86rem', width: '80px' }}
                        value={item.lot_number || ''}
                        onChange={(e) => handleRowChange(idx, 'lot_number', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.1"
                        className="form-input"
                        style={{ padding: '4px 8px', fontSize: '0.86rem', width: '100px' }}
                        value={item.total_weight || ''}
                        onChange={(e) => handleRowChange(idx, 'total_weight', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        className="form-input"
                        style={{ padding: '4px 6px', fontSize: '0.84rem', width: '130px' }}
                        value={item.report_date}
                        onChange={(e) => handleRowChange(idx, 'report_date', e.target.value)}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ padding: '4px 8px' }}
                        onClick={() => handleDeleteRow(idx)}
                        title="Remove row"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
