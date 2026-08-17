'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Activity,
  AlertTriangle,
  Smartphone,
  Users,
  Search,
  CheckCircle2,
  Download,
  RefreshCw,
  UserCheck,
  Phone,
  Store
} from 'lucide-react';
import { trackPageView } from '@/lib/analytics';

interface OnboardedFarmer {
  id: string;
  name: string;
  phone_number: string;
  preferred_market: string;
  created_at: string;
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'super_admin' | 'market_admin';
  assigned_market: string;
  last_sign_in_at: string | null;
  created_at: string;
  is_active: boolean;
  total_recent_submissions: number;
  last_submission_date: string | null;
}

interface AppDeviceUser {
  token: string;
  platform: string;
  device_info: any;
  created_at: string;
  updated_at: string;
}

export default function UsersDirectoryPage() {
  const router = useRouter();
  const { user, profile, session, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'onboarded_farmers' | 'app_devices' | 'admins'>('onboarded_farmers');
  
  // Onboarded Farmers State
  const [farmers, setFarmers] = useState<OnboardedFarmer[]>([]);
  const [farmersLoading, setFarmersLoading] = useState(true);
  const [farmerSearch, setFarmerSearch] = useState('');

  // App Devices State
  const [appDevices, setAppDevices] = useState<AppDeviceUser[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [deviceSearch, setDeviceSearch] = useState('');

  // Admins State
  const [markets, setMarkets] = useState<any[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [showEditAdminModal, setShowEditAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);

  // New Admin Form State
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'super_admin' | 'market_admin'>('market_admin');
  const [newAdminMarket, setNewAdminMarket] = useState('all');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isSuperAdmin = profile?.role === 'super_admin';

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchMarkets = async () => {
    const { data } = await supabase.from('markets').select('*').eq('is_active', true).order('sort_order');
    if (data) setMarkets(data);
  };

  const fetchFarmers = async () => {
    setFarmersLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error && data) {
        // Group by phone_number to ensure unique farmer records (keeping most recent)
        const uniqueMap = new Map<string, OnboardedFarmer>();
        for (const item of (data as OnboardedFarmer[])) {
          const key = item.phone_number ? item.phone_number.trim() : item.id;
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, item);
          }
        }
        setFarmers(Array.from(uniqueMap.values()));
      }
    } catch (e) {
      console.error('Failed to fetch onboarded farmers:', e);
    } finally {
      setFarmersLoading(false);
    }
  };

  const fetchAppDevices = async () => {
    setDevicesLoading(true);
    try {
      const { data, error } = await supabase
        .from('push_tokens')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error && data) {
        setAppDevices(data as AppDeviceUser[]);
      }
    } catch (e) {
      console.error('Failed to fetch app devices:', e);
    } finally {
      setDevicesLoading(false);
    }
  };

  const fetchAdmins = async () => {
    if (!session?.access_token) return;
    setAdminsLoading(true);
    try {
      const res = await fetch('/api/admins', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (data.admins) {
        setAdmins(data.admins);
      }
    } catch (e) {
      console.error('Failed to fetch admins:', e);
    } finally {
      setAdminsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      trackPageView('/users', 'Users & Admin Directory');
      fetchMarkets();
      fetchFarmers();
      fetchAppDevices();
      fetchAdmins();
    }
  }, [isSuperAdmin, session]);

  const handleExportFarmersCSV = () => {
    if (farmers.length === 0) return;
    const headers = ['ID,Name,Phone Number,Preferred Market,Onboarded Date\n'];
    const rows = farmers.map(
      (f) =>
        `"${f.id}","${f.name.replace(/"/g, '""')}","${f.phone_number || ''}","${f.preferred_market || ''}","${new Date(f.created_at).toISOString()}"\n`
    );
    const blob = new Blob([headers.concat(rows).join('')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reshme_onboarded_farmers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;
    setFormSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: newAdminEmail,
          password: newAdminPassword,
          username: newAdminUsername,
          role: newAdminRole,
          assigned_market: newAdminMarket,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create admin');
      }

      setShowAddAdminModal(false);
      setNewAdminEmail('');
      setNewAdminUsername('');
      setNewAdminPassword('');
      fetchAdmins();
    } catch (err: any) {
      setFormError(err.message || 'Error creating admin');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin || !session?.access_token) return;
    setFormSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch('/api/admins', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: editingAdmin.id,
          username: editingAdmin.username,
          role: editingAdmin.role,
          assigned_market: editingAdmin.assigned_market,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update admin');

      setShowEditAdminModal(false);
      setEditingAdmin(null);
      fetchAdmins();
    } catch (err: any) {
      setFormError(err.message || 'Error updating admin');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteAdmin = async (admin: AdminUser) => {
    if (!session?.access_token) return;
    if (admin.id === user?.id) {
      alert('You cannot delete your own active Super Admin account.');
      return;
    }
    if (!confirm(`Are you sure you want to permanently remove admin "${admin.username}" (${admin.email})?`)) return;

    try {
      const res = await fetch(`/api/admins?id=${admin.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete admin');
      fetchAdmins();
    } catch (err: any) {
      alert(err.message || 'Error deleting admin');
    }
  };

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
          User monitoring and administrative management are restricted to Super Administrators.
        </p>
        <button className="btn btn-primary" onClick={() => router.push('/prices')}>
          Go to Price Entry
        </button>
      </div>
    );
  }

  const filteredFarmers = farmers.filter((f) => {
    if (!farmerSearch) return true;
    const q = farmerSearch.toLowerCase();
    return (
      (f.name || '').toLowerCase().includes(q) ||
      (f.phone_number || '').toLowerCase().includes(q) ||
      (f.preferred_market || '').toLowerCase().includes(q)
    );
  });

  const filteredDevices = appDevices.filter((d) => {
    if (!deviceSearch) return true;
    const q = deviceSearch.toLowerCase();
    const tokenStr = d.token.toLowerCase();
    const modelStr = (d.device_info?.model || '').toLowerCase();
    const platformStr = (d.platform || '').toLowerCase();
    return tokenStr.includes(q) || modelStr.includes(q) || platformStr.includes(q);
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Users & Administration Directory</h1>
          <p className="page-subtitle">Track onboarded farmers, push device installations, and supervise APMC market administrators</p>
        </div>
        {activeTab === 'onboarded_farmers' && farmers.length > 0 && (
          <button className="btn btn-secondary" onClick={handleExportFarmersCSV}>
            <Download size={16} /> Export Farmers CSV
          </button>
        )}
        {activeTab === 'admins' && (
          <button className="btn btn-primary" onClick={() => setShowAddAdminModal(true)}>
            <Plus size={16} /> Add Market Admin
          </button>
        )}
      </div>

      {/* Triple Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('onboarded_farmers')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.92rem',
            background: activeTab === 'onboarded_farmers' ? 'var(--primary)' : '#f1f5f9',
            color: activeTab === 'onboarded_farmers' ? '#ffffff' : '#475569',
            transition: 'all 0.15s ease',
          }}
        >
          <UserCheck size={17} />
          <span>Onboarded Farmers ({farmers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('app_devices')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.92rem',
            background: activeTab === 'app_devices' ? 'var(--primary)' : '#f1f5f9',
            color: activeTab === 'app_devices' ? '#ffffff' : '#475569',
            transition: 'all 0.15s ease',
          }}
        >
          <Smartphone size={17} />
          <span>App Device Installs ({appDevices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('admins')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.92rem',
            background: activeTab === 'admins' ? 'var(--primary)' : '#f1f5f9',
            color: activeTab === 'admins' ? '#ffffff' : '#475569',
            transition: 'all 0.15s ease',
          }}
        >
          <ShieldCheck size={17} />
          <span>Admin Team & Watch ({admins.length})</span>
        </button>
      </div>

      {/* TAB 1: ONBOARDED FARMERS */}
      {activeTab === 'onboarded_farmers' && (
        <div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Onboarded Farmers</div>
              <div className="stat-value" style={{ color: 'var(--primary)' }}>{farmers.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Preferred APMC Markets</div>
              <div className="stat-value" style={{ color: '#0f766e' }}>{markets.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Mobile Verification</div>
              <div className="stat-value" style={{ color: '#16a34a' }}>Completed</div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={18} color="var(--primary)" /> Registered & Onboarded Farmers
                </h2>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                  Farmers who completed mobile app onboarding with their name, phone number, and preferred APMC market.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '320px' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Search name, phone, market..."
                    className="form-input"
                    style={{ paddingLeft: '36px', height: '40px', fontSize: '0.86rem' }}
                    value={farmerSearch}
                    onChange={(e) => setFarmerSearch(e.target.value)}
                  />
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '8px 12px', height: '40px' }}
                  onClick={fetchFarmers}
                  title="Refresh farmers"
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Farmer Name</th>
                    <th>Phone Number</th>
                    <th>Preferred APMC Market</th>
                    <th>Onboarding Date</th>
                  </tr>
                </thead>
                <tbody>
                  {farmersLoading ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '32px' }}>
                        Loading onboarded farmers...
                      </td>
                    </tr>
                  ) : filteredFarmers.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                        No onboarded farmer records found.
                      </td>
                    </tr>
                  ) : (
                    filteredFarmers.map((farmer) => (
                      <tr key={farmer.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{farmer.name}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', color: '#334155' }}>
                            <Phone size={13} color="#94a3b8" />
                            {farmer.phone_number || '—'}
                          </div>
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: '#eff6ff',
                              color: 'var(--primary)',
                              fontWeight: 700,
                            }}
                          >
                            <Store size={12} style={{ display: 'inline', marginRight: '4px' }} />
                            {farmer.preferred_market || 'Ramanagara'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.84rem', color: '#64748b' }}>
                          {new Date(farmer.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MOBILE APP USERS & REGISTERED DEVICES */}
      {activeTab === 'app_devices' && (
        <div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Registered Push Devices</div>
              <div className="stat-value">{appDevices.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Platform</div>
              <div className="stat-value" style={{ color: '#16a34a' }}>Android APK</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">FCM Broadcast Status</div>
              <div className="stat-value" style={{ color: '#0f766e' }}>Active & Ready</div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Smartphone size={18} color="var(--primary)" /> Registered Device Hardware & Tokens
                </h2>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                  Live registry of Flutter app installations receiving instant auction price notifications.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '320px' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Search model or token..."
                    className="form-input"
                    style={{ paddingLeft: '36px', height: '40px', fontSize: '0.86rem' }}
                    value={deviceSearch}
                    onChange={(e) => setDeviceSearch(e.target.value)}
                  />
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '8px 12px', height: '40px' }}
                  onClick={fetchAppDevices}
                  title="Refresh device registry"
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Device & Hardware</th>
                    <th>Platform</th>
                    <th>FCM Push Status</th>
                    <th>Registered At</th>
                    <th>Last Active Update</th>
                    <th>Device Token</th>
                  </tr>
                </thead>
                <tbody>
                  {devicesLoading ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>
                        Loading device records...
                      </td>
                    </tr>
                  ) : filteredDevices.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                        No registered device records found.
                      </td>
                    </tr>
                  ) : (
                    filteredDevices.map((d, index) => {
                      const model = d.device_info?.model || d.device_info?.brand || 'Android Device';
                      const os = d.device_info?.version ? `Android ${d.device_info.version}` : 'Android';
                      return (
                        <tr key={d.token || index}>
                          <td>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{model}</div>
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{os}</span>
                          </td>
                          <td>
                            <span className="badge badge-primary">{d.platform || 'android'}</span>
                          </td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontWeight: 600, fontSize: '0.82rem' }}>
                              <CheckCircle2 size={14} /> Subscribed
                            </span>
                          </td>
                          <td style={{ fontSize: '0.84rem', color: '#475569' }}>
                            {new Date(d.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td style={{ fontSize: '0.84rem', color: '#64748b' }}>
                            {d.updated_at ? new Date(d.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.76rem', color: '#64748b', background: '#f1f5f9', padding: '3px 6px', borderRadius: '4px' }}>
                              {d.token ? `${d.token.substring(0, 16)}...` : '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: APMC ADMIN TEAM & WATCH CENTER */}
      {activeTab === 'admins' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="var(--primary)" /> APMC Market Admin Watch & Audit
              </h2>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                Monitor market manager login sessions, price entries, and administrative permissions.
              </p>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Administrator</th>
                  <th>Email & Login</th>
                  <th>Role</th>
                  <th>Assigned APMC Market</th>
                  <th>Last Active</th>
                  <th>Recent Entries</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminsLoading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}>
                      Loading administrators...
                    </td>
                  </tr>
                ) : admins.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      No administrators found.
                    </td>
                  </tr>
                ) : (
                  admins.map((admin) => {
                    const isSelf = admin.id === user?.id;
                    return (
                      <tr key={admin.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>
                            {admin.username}
                            {isSelf && (
                              <span style={{ marginLeft: '6px', fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                                (You)
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                            Created: {new Date(admin.created_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.88rem', color: '#334155' }}>
                            {admin.email}
                          </span>
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: admin.role === 'super_admin' ? '#dbeafe' : '#f1f5f9',
                              color: admin.role === 'super_admin' ? '#1d4ed8' : '#475569',
                              fontWeight: 700,
                            }}
                          >
                            {admin.role === 'super_admin' ? 'Super Admin' : 'Market Admin'}
                          </span>
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: admin.assigned_market === 'all' ? '#f0fdf4' : '#fef3c7',
                              color: admin.assigned_market === 'all' ? '#15803d' : '#b45309',
                              fontWeight: 600,
                            }}
                          >
                            {admin.assigned_market === 'all' ? 'All Markets' : admin.assigned_market}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', color: '#475569' }}>
                            <Clock size={13} color="#94a3b8" />
                            {admin.last_sign_in_at
                              ? new Date(admin.last_sign_in_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : 'Never'}
                          </div>
                        </td>
                        <td>
                          <div>
                            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                              {admin.total_recent_submissions} lots
                            </span>
                            {admin.last_submission_date && (
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                Last: {admin.last_submission_date}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '6px' }}
                              onClick={() => {
                                setEditingAdmin(admin);
                                setShowEditAdminModal(true);
                              }}
                              title="Edit admin permissions"
                            >
                              <Edit2 size={14} />
                            </button>
                            {!isSelf && (
                              <button
                                className="btn btn-secondary"
                                style={{ color: '#ef4444', padding: '6px' }}
                                onClick={() => handleDeleteAdmin(admin)}
                                title="Remove admin"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE ADMIN MODAL */}
      {showAddAdminModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', background: 'white' }}>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="var(--primary)" /> Add New Administrator
            </h2>
            <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '-8px', marginBottom: '16px' }}>
              Provision login credentials and set market access permissions.
            </p>

            {formError && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.86rem', marginBottom: '16px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateAdmin}>
              <div className="form-group">
                <label className="form-label">Full Name / Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Officer"
                  className="form-input"
                  value={newAdminUsername}
                  onChange={(e) => setNewAdminUsername(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh@reshmeinfo.com"
                  className="form-input"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Initial Password (Min 6 chars)</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="form-input"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="form-input"
                    value={newAdminRole}
                    onChange={(e) => setNewAdminRole(e.target.value as any)}
                  >
                    <option value="market_admin">Market Admin (Entry Only)</option>
                    <option value="super_admin">Super Admin (Full Access)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Assigned APMC Market</label>
                  <select
                    className="form-input"
                    value={newAdminMarket}
                    onChange={(e) => setNewAdminMarket(e.target.value)}
                  >
                    <option value="all">All Markets</option>
                    {markets.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddAdminModal(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={formSubmitting}>
                  {formSubmitting ? 'Creating...' : 'Create Admin Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ADMIN MODAL */}
      {showEditAdminModal && editingAdmin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', background: 'white' }}>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit2 size={20} color="var(--primary)" /> Edit Administrator Permissions
            </h2>
            <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '-8px', marginBottom: '16px' }}>
              Modify permissions for {editingAdmin.email}
            </p>

            {formError && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.86rem', marginBottom: '16px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdateAdmin}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editingAdmin.username}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, username: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="form-input"
                    value={editingAdmin.role}
                    onChange={(e) => setEditingAdmin({ ...editingAdmin, role: e.target.value as any })}
                  >
                    <option value="market_admin">Market Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Assigned APMC Market</label>
                  <select
                    className="form-input"
                    value={editingAdmin.assigned_market}
                    onChange={(e) => setEditingAdmin({ ...editingAdmin, assigned_market: e.target.value })}
                  >
                    <option value="all">All Markets</option>
                    {markets.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowEditAdminModal(false);
                    setEditingAdmin(null);
                  }}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={formSubmitting}>
                  {formSubmitting ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
