'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { User, Session } from '@supabase/supabase-js';
import { trackEvent } from './analytics';

export interface AdminProfile {
  id: string;
  username: string;
  role: 'super_admin' | 'market_admin';
  assigned_market: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: AdminProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (currentSession: Session) => {
    const userId = currentSession.user.id;
    try {
      // Use maybeSingle() instead of single() to avoid 406 HTTP error when row does not exist yet
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        setProfile(data as AdminProfile);
      } else {
        // Auto-provision profile fallback
        const fallbackProfile: AdminProfile = {
          id: userId,
          username: currentSession.user.email?.split('@')[0] || 'admin',
          role: 'super_admin',
          assigned_market: 'all',
        };

        // Attempt to upsert the row
        try {
          await supabase.from('admin_profiles').upsert(fallbackProfile);
        } catch (_) {}

        setProfile(fallbackProfile);
      }
    } catch (e) {
      console.warn('Profile fetch notice:', e);
      setProfile({
        id: userId,
        username: currentSession.user.email?.split('@')[0] || 'admin',
        role: 'super_admin',
        assigned_market: 'all',
      });
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const res = await supabase.auth.signInWithPassword({ email, password });
    if (!res.error && res.data.user) {
      trackEvent('admin_login', { userId: res.data.user.id });
    }
    return { error: res.error as Error | null };
  };

  const signOut = async () => {
    trackEvent('admin_logout');
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
