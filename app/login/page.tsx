'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Lock, ShieldAlert, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, signIn, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isAnonKeyMissing = !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('your-supabase-anon-key');

  useEffect(() => {
    if (user && !authLoading) {
      router.push('/admin');
      router.refresh();
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    if (isAnonKeyMissing) {
      setError('Missing Supabase Anon Key in admin-pwa/.env.local (NEXT_PUBLIC_SUPABASE_ANON_KEY). Please add your project anon key from Supabase Dashboard.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: signInError } = await signIn(email.trim(), password);
      if (signInError) {
        setError(signInError.message || 'Invalid email or password');
      } else {
        router.push('/admin');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', background: '#f8fafc' }}>
      <div style={{ width: '100%', maxWidth: '420px', padding: '32px 24px', background: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.06)', border: '1.5px solid #e2e8f0' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img
            src="/reshme_logo.png"
            alt="Reshme Info Logo"
            style={{ height: '64px', margin: '0 auto 12px auto', display: 'block', objectFit: 'contain' }}
          />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Reshme Info Admin</h1>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '4px' }}>Sign in to manage market prices and bulletins</p>
        </div>

        {isAnonKeyMissing && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', color: '#b45309', fontSize: '0.82rem', marginBottom: '20px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Action Required:</strong> Paste your Supabase Anon key into <code>admin-pwa/.env.local</code> (from Supabase Dashboard &gt; Project Settings &gt; API).
            </div>
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#dc2626', fontSize: '0.88rem', marginBottom: '20px' }}>
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="admin@reshmeinfo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px', padding: '12px' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
