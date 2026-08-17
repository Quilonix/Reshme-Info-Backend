'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { translateToKannada } from '@/lib/translator';
import { Store, Dna, Plus, Trash2, Languages, Check, AlertCircle, ShieldAlert } from 'lucide-react';
import { trackPageView, trackEvent } from '@/lib/analytics';

export default function MarketsAndBreedsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'markets' | 'breeds'>('markets');
  const [markets, setMarkets] = useState<any[]>([]);
  const [breeds, setBreeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Market Form State
  const [marketForm, setMarketForm] = useState({
    name: '',
    name_kn: '',
    location: '',
  });

  // Breed Form State
  const [breedForm, setBreedForm] = useState({
    code: 'CB' as 'CB' | 'BV' | 'CB_GOLD',
    name: '',
    name_kn: '',
    description: '',
    description_kn: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    setLoading(true);
    const { data: mData } = await supabase.from('markets').select('*').order('sort_order', { ascending: true });
    const { data: bData } = await supabase.from('breeds').select('*').order('created_at', { ascending: true });
    if (mData) setMarkets(mData);
    if (bData) setBreeds(bData);
    setLoading(false);
  };

  useEffect(() => {
    trackPageView('/markets', 'Markets & Breeds Management');
    fetchData();
  }, []);

  const isSuperAdmin = profile?.role === 'super_admin';

  // Auto Translate Market
  const handleTranslateMarket = async () => {
    if (!marketForm.name) return;
    setTranslating(true);
    const translated = await translateToKannada(marketForm.name);
    if (translated) {
      setMarketForm((prev) => ({ ...prev, name_kn: translated }));
    }
    setTranslating(false);
  };

  // Auto Translate Breed
  const handleTranslateBreed = async () => {
    if (!breedForm.name && !breedForm.description) return;
    setTranslating(true);
    if (breedForm.name) {
      const transName = await translateToKannada(breedForm.name);
      if (transName) setBreedForm((prev) => ({ ...prev, name_kn: transName }));
    }
    if (breedForm.description) {
      const transDesc = await translateToKannada(breedForm.description);
      if (transDesc) setBreedForm((prev) => ({ ...prev, description_kn: transDesc }));
    }
    setTranslating(false);
  };

  // Submit Market
  const handleAddMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setErrorMsg('Only Super Admins can add new markets.');
      return;
    }

    setSuccessMsg('');
    setErrorMsg('');
    setLoading(true);

    try {
      const { error } = await supabase.from('markets').insert({
        name: marketForm.name.trim(),
        name_kn: marketForm.name_kn.trim() || null,
        location: marketForm.location.trim(),
        is_active: true,
        sort_order: markets.length + 1,
      });

      if (error) throw error;

      trackEvent('market_created', { name: marketForm.name });
      setSuccessMsg(`Market "${marketForm.name}" added successfully!`);
      setMarketForm({ name: '', name_kn: '', location: '' });
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create market');
    } finally {
      setLoading(false);
    }
  };

  // Delete Market
  const handleDeleteMarket = async (id: string, name: string) => {
    if (!isSuperAdmin) {
      setErrorMsg('Only Super Admins can delete markets.');
      return;
    }
    if (!confirm(`Are you sure you want to delete market "${name}"?`)) return;

    try {
      const { error } = await supabase.from('markets').delete().eq('id', id);
      if (error) throw error;
      setSuccessMsg(`Market "${name}" removed.`);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete market');
    }
  };

  // Submit Breed
  const handleAddBreed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setErrorMsg('Only Super Admins can add breeds.');
      return;
    }

    setSuccessMsg('');
    setErrorMsg('');
    setLoading(true);

    try {
      const { error } = await supabase.from('breeds').insert({
        code: breedForm.code,
        name: breedForm.name.trim(),
        name_kn: breedForm.name_kn.trim() || null,
        description: breedForm.description.trim() || null,
        description_kn: breedForm.description_kn.trim() || null,
      });

      if (error) throw error;

      trackEvent('breed_created', { code: breedForm.code });
      setSuccessMsg(`Breed "${breedForm.name}" added successfully!`);
      setBreedForm({ code: 'CB', name: '', name_kn: '', description: '', description_kn: '' });
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create breed');
    } finally {
      setLoading(false);
    }
  };

  // Delete Breed
  const handleDeleteBreed = async (id: string, name: string) => {
    if (!isSuperAdmin) {
      setErrorMsg('Only Super Admins can delete breeds.');
      return;
    }
    if (!confirm(`Are you sure you want to delete breed "${name}"?`)) return;

    try {
      const { error } = await supabase.from('breeds').delete().eq('id', id);
      if (error) throw error;
      setSuccessMsg(`Breed "${name}" removed.`);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete breed');
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
          Configuring APMC silk markets and silkworm breeds is restricted to Super Administrators.
        </p>
        <button className="btn btn-primary" onClick={() => router.push('/prices')}>
          Go to Price Entry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Markets & Breeds Management</h1>
          <p className="page-subtitle">Configure Karnataka APMC silk markets and silkworm breeds</p>
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          className={`btn ${activeTab === 'markets' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('markets')}
        >
          <Store size={18} /> APMC Markets ({markets.length})
        </button>
        <button
          className={`btn ${activeTab === 'breeds' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('breeds')}
        >
          <Dna size={18} /> Breeds ({breeds.length})
        </button>
      </div>

      {/* Markets Section */}
      {activeTab === 'markets' && (
        <div>
          {isSuperAdmin && (
            <div className="card">
              <h2 className="card-title">Add New APMC Market</h2>
              <form onSubmit={handleAddMarket}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Market Name (English)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Ramanagara"
                      value={marketForm.name}
                      onChange={(e) => setMarketForm({ ...marketForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="form-label" style={{ margin: 0 }}>Market Name (Kannada)</label>
                      <button
                        type="button"
                        onClick={handleTranslateMarket}
                        disabled={translating || !marketForm.name}
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
                      placeholder="ಉದಾ: ರಾಮನಗರ"
                      value={marketForm.name_kn}
                      onChange={(e) => setMarketForm({ ...marketForm, name_kn: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Location / District</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Ramanagara, Karnataka"
                      value={marketForm.location}
                      onChange={(e) => setMarketForm({ ...marketForm, location: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <Plus size={16} /> Add Market
                </button>
              </form>
            </div>
          )}

          <div className="card">
            <h2 className="card-title">Existing Markets ({markets.length})</h2>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Market Name</th>
                    <th>Kannada Name</th>
                    <th>Location</th>
                    <th>Status</th>
                    {isSuperAdmin && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {markets.map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600 }}>{m.name}</td>
                      <td>{m.name_kn || '-'}</td>
                      <td>{m.location}</td>
                      <td>
                        <span className={`badge ${m.is_active ? 'badge-primary' : 'badge-danger'}`}>
                          {m.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                            onClick={() => handleDeleteMarket(m.id, m.name)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Breeds Section */}
      {activeTab === 'breeds' && (
        <div>
          {isSuperAdmin && (
            <div className="card">
              <h2 className="card-title">Add New Cocoon Breed</h2>
              <form onSubmit={handleAddBreed}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Breed Code</label>
                    <select
                      className="form-select"
                      value={breedForm.code}
                      onChange={(e) => setBreedForm({ ...breedForm, code: e.target.value as any })}
                    >
                      <option value="CB">CB (Cross Breed)</option>
                      <option value="BV">BV (Bivoltine)</option>
                      <option value="CB_GOLD">CB_GOLD (CB Gold)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Breed Name (English)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Cross Breed (CB)"
                      value={breedForm.name}
                      onChange={(e) => setBreedForm({ ...breedForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="form-label" style={{ margin: 0 }}>Breed Name (Kannada)</label>
                      <button
                        type="button"
                        onClick={handleTranslateBreed}
                        disabled={translating || !breedForm.name}
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
                      placeholder="ಉದಾ: ಮಿಶ್ರತಳಿ (ಸಿ.ಬಿ)"
                      value={breedForm.name_kn}
                      onChange={(e) => setBreedForm({ ...breedForm, name_kn: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Description (English)</label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      placeholder="Breed characteristics..."
                      value={breedForm.description}
                      onChange={(e) => setBreedForm({ ...breedForm, description: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description (Kannada)</label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      placeholder="ವಿವರಣೆ..."
                      value={breedForm.description_kn}
                      onChange={(e) => setBreedForm({ ...breedForm, description_kn: e.target.value })}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <Plus size={16} /> Add Breed
                </button>
              </form>
            </div>
          )}

          <div className="card">
            <h2 className="card-title">Existing Breeds ({breeds.length})</h2>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name (English)</th>
                    <th>Name (Kannada)</th>
                    <th>Description</th>
                    {isSuperAdmin && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {breeds.map((b) => (
                    <tr key={b.id}>
                      <td><span className="badge badge-primary">{b.code}</span></td>
                      <td style={{ fontWeight: 600 }}>{b.name}</td>
                      <td>{b.name_kn || '-'}</td>
                      <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{b.description || '-'}</td>
                      {isSuperAdmin && (
                        <td>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                            onClick={() => handleDeleteBreed(b.id, b.name)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
