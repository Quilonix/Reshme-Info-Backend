'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { translateToKannada } from '@/lib/translator';
import { Send, Check, AlertCircle, Languages } from 'lucide-react';
import { trackPageView, trackEvent } from '@/lib/analytics';

export default function NotificationStudioPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [markets, setMarkets] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [targetAudience, setTargetAudience] = useState<'all' | 'market_specific'>('all');
  const [targetMarket, setTargetMarket] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    trackPageView('/notifications', 'Notification Studio');
    const fetchMarkets = async () => {
      const { data } = await supabase
        .from('markets')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (data && data.length > 0) {
        setMarkets(data);
        setTargetMarket(data[0].name);
      }
    };
    fetchMarkets();
  }, []);

  const handleAutoTranslateTitle = async () => {
    if (!title) return;
    setTranslating(true);
    const trans = await translateToKannada(title);
    if (trans) setTitle(trans);
    setTranslating(false);
  };

  const handleAutoTranslateMessage = async () => {
    if (!message) return;
    setTranslating(true);
    const trans = await translateToKannada(message);
    if (trans) setMessage(trans);
    setTranslating(false);
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      setErrorMsg('Title and Message are required.');
      return;
    }

    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message,
          priority,
          targetAudience,
          targetMarket: targetAudience === 'market_specific' ? targetMarket : null,
          imageUrl: imageUrl || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to dispatch broadcast');
      }

      trackEvent('broadcast_notification_sent', {
        priority,
        targetAudience,
        targetMarket,
      });

      setSuccessMsg(
        `Notification broadcast successfully dispatched via ${json.method}! (Delivered to ${json.deliveredToTokens} device tokens, Topic broadcast: ${json.topicBroadcast ? 'Active' : 'N/A'})`
      );
      setTitle('');
      setMessage('');
      setImageUrl('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch notification broadcast');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div style={{ maxWidth: '800px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notification Studio</h1>
          <p className="page-subtitle">Send urgent market alerts, weather bulletins, and price advisories</p>
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

      <div className="card">
        <form onSubmit={handleBroadcast}>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ margin: 0 }}>Notification Title</label>
              <button
                type="button"
                onClick={handleAutoTranslateTitle}
                disabled={translating || !title}
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
                {translating ? 'Translating...' : 'Auto-Translate to Kannada'}
              </button>
            </div>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Ramanagara Market Price Surge"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ margin: 0 }}>Message Body</label>
              <button
                type="button"
                onClick={handleAutoTranslateMessage}
                disabled={translating || !message}
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
                {translating ? 'Translating...' : 'Auto-Translate to Kannada'}
              </button>
            </div>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="e.g. Bivoltine cocoons crossed ₹850/kg today due to heavy demand from reelers..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Priority Level</label>
              <select
                className="form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High (Urgent Alert)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Target Audience</label>
              <select
                className="form-select"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as any)}
              >
                <option value="all">All Farmers (Entire Karnataka)</option>
                <option value="market_specific">Market Specific</option>
              </select>
            </div>

            {targetAudience === 'market_specific' && (
              <div className="form-group">
                <label className="form-label">Target Market Picker</label>
                <select
                  className="form-select"
                  value={targetMarket}
                  onChange={(e) => setTargetMarket(e.target.value)}
                  required
                >
                  {markets.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} {m.name_kn ? `(${m.name_kn})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Banner Image URL (Optional)</label>
            <input
              type="url"
              className="form-input"
              placeholder="https://.../banner.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '12px' }}
          >
            <Send size={16} />
            {loading ? 'Dispatching Broadcast...' : 'Broadcast to Mobile Users'}
          </button>
        </form>
      </div>
    </div>
  );
}
