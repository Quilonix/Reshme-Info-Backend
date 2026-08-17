'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { translateToKannada } from '@/lib/translator';
import { Plus, Trash2, Check, AlertCircle, Languages } from 'lucide-react';
import { trackPageView, trackEvent } from '@/lib/analytics';

export default function CMSPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    type: 'video',
    title: '',
    title_kn: '',
    url: '',
    description: '',
    description_kn: '',
  });

  const fetchContent = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('content_items')
      .select('*')
      .order('sort_order', { ascending: true });
    if (data) setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    trackPageView('/cms', 'Content CMS');
    fetchContent();
  }, []);

  const extractYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const handleAutoTranslateTitle = async () => {
    if (!formData.title) return;
    setTranslating(true);
    const trans = await translateToKannada(formData.title);
    if (trans) {
      setFormData((prev) => ({ ...prev, title_kn: trans }));
    }
    setTranslating(false);
  };

  const handleAutoTranslateDesc = async () => {
    if (!formData.description) return;
    setTranslating(true);
    const trans = await translateToKannada(formData.description);
    if (trans) {
      setFormData((prev) => ({ ...prev, description_kn: trans }));
    }
    setTranslating(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    let youtubeId: string | null = null;
    let youtubeThumbnail: string | null = null;

    if (formData.type === 'video' && formData.url) {
      youtubeId = extractYouTubeId(formData.url);
      if (youtubeId) {
        youtubeThumbnail = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
      }
    }

    try {
      const { error } = await supabase.from('content_items').insert({
        type: formData.type,
        title: formData.title,
        title_kn: formData.title_kn,
        url: formData.url,
        description: formData.description,
        description_kn: formData.description_kn,
        youtube_video_id: youtubeId,
        youtube_thumbnail: youtubeThumbnail,
        sort_order: items.length + 1,
        is_active: true,
      });

      if (error) throw error;

      trackEvent('content_item_created', { type: formData.type, title: formData.title });

      // Automatically dispatch Push Notification to Farmers
      if (sendNotification) {
        try {
          await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: `New Sericulture Guide: ${formData.title}`,
              message: formData.description || 'A new sericulture video guide and farming advisory is available in Reshme Info app.',
              priority: 'medium',
              targetAudience: 'all',
            }),
          });
        } catch (_) {}
      }

      setSuccessMsg('Guide content published and push notification dispatched to farmers!');
      setFormData({
        type: 'video',
        title: '',
        title_kn: '',
        url: '',
        description: '',
        description_kn: '',
      });
      fetchContent();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save content');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this guide?')) return;
    await supabase.from('content_items').delete().eq('id', id);
    fetchContent();
  };

  if (authLoading || !user) return null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Knowledge Base & Guides CMS</h1>
          <p className="page-subtitle">Publish bilingual sericulture video tutorials and farming documentation</p>
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
        <h2 className="card-title">Add New Content / Tutorial</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Content Type</label>
              <select
                className="form-select"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="video">YouTube Video Guide</option>
                <option value="basicInfo">Article / FAQ</option>
                <option value="pdf">PDF Handbook Link</option>
                <option value="image">Poster / Info Image</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Resource URL (YouTube, PDF or Image)</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://youtube.com/watch?v=..."
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Title (English)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Mulberry Plantation Techniques"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0 }}>Title (Kannada / ಕನ್ನಡ ಶೀರ್ಷಿಕೆ)</label>
                <button
                  type="button"
                  onClick={handleAutoTranslateTitle}
                  disabled={translating || !formData.title}
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
              </div>
              <input
                type="text"
                className="form-input"
                placeholder="ಉದಾ: ಹಿಪ್ಪುನೇರಳೆ ತೋಟ ನಿರ್ವಹಣೆ..."
                value={formData.title_kn}
                onChange={(e) => setFormData({ ...formData, title_kn: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Description (English)</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Detailed guidance..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0 }}>Description (Kannada / ಕನ್ನಡ ವಿವರಣೆ)</label>
                <button
                  type="button"
                  onClick={handleAutoTranslateDesc}
                  disabled={translating || !formData.description}
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
              </div>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="ವಿವರವಾದ ಮಾಹಿತಿ..."
                value={formData.description_kn}
                onChange={(e) => setFormData({ ...formData, description_kn: e.target.value })}
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
              <span>Send Push Notification Alert to Farmers upon Publishing Guide</span>
            </label>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '4px' }}>
            <Plus size={16} /> Publish Knowledge Article
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="card-title">Existing Knowledge Articles ({items.length})</h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>English Title</th>
                <th>Kannada Title</th>
                <th>Resource Link</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="badge badge-primary">{item.type}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{item.title}</td>
                  <td>{item.title_kn || '-'}</td>
                  <td>
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                        View Link
                      </a>
                    ) : '-'}
                  </td>
                  <td>
                    <button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => handleDelete(item.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
