'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import {
  LayoutDashboard,
  PlusCircle,
  Sparkles,
  BookOpen,
  Bell,
  LogOut,
  Menu,
  X,
  Store,
  BarChart3,
  Settings,
  ShieldCheck,
  Users,
  Layers
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Hide sidebar on public landing page, login, and legal pages
  if (!user || pathname === '/' || pathname === '/login' || pathname === '/privacy-policy' || pathname === '/terms') {
    return null;
  }

  const isSuperAdmin = profile?.role === 'super_admin';

  const generalNavItems = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Enter Price', href: '/prices', icon: PlusCircle },
    { label: 'AI Extractor', href: '/ai-extractor', icon: Sparkles },
    { label: 'Notification Studio', href: '/notifications', icon: Bell },
    { label: 'Knowledge CMS', href: '/cms', icon: BookOpen },
  ];

  const superAdminNavItems = [
    { label: 'Live Farmers Telemetry', href: '/analytics', icon: BarChart3 },
    { label: 'Users & Admin Team', href: '/users', icon: Users },
    { label: 'Markets & Breeds', href: '/markets', icon: Store },
    { label: 'App Version Control', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Top App Bar */}
      <div className="mobile-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="mobile-hamburger-btn"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open Navigation Menu"
          >
            <Menu size={22} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img
              src="/reshme_logo.png"
              alt="Reshme Info"
              style={{ height: '28px', width: 'auto', objectFit: 'contain' }}
            />
            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary)', letterSpacing: '-0.3px' }}>
              Reshme Admin
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '6px',
              background: isSuperAdmin ? '#dbeafe' : '#fef3c7',
              color: isSuperAdmin ? '#1d4ed8' : '#b45309',
            }}
          >
            {isSuperAdmin ? 'Super' : profile?.assigned_market || 'Admin'}
          </span>
          <button
            onClick={() => signOut()}
            className="mobile-logout-btn"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Sidebar (Desktop + Mobile Slideout Drawer) */}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
            <img
              src="/reshme_logo.png"
              alt="Reshme Info"
              style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
            />
            <div>
              <span className="sidebar-brand">Reshme Info</span>
              <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                Admin Workspace
              </span>
            </div>
          </div>
          <button
            className="mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close Navigation Menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', padding: '8px 12px 4px', letterSpacing: '0.5px' }}>
            Core Operations
          </div>
          {generalNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Super Admin Dedicated Section */}
          {isSuperAdmin && (
            <>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', padding: '16px 12px 4px', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} color="var(--primary)" /> Super Admin
              </div>
              {superAdminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge">
            <span className="user-name">
              {profile?.username || user.email?.split('@')[0]}
            </span>
            <span className="user-role">
              {isSuperAdmin ? 'Super Admin' : `Admin: ${profile?.assigned_market}`}
            </span>
          </div>
          <button
            onClick={() => signOut()}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '8px',
              borderRadius: '6px',
            }}
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Quick Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <Link
          href="/admin"
          className={`bottom-nav-item ${pathname === '/admin' ? 'active' : ''}`}
        >
          <LayoutDashboard size={19} />
          <span>Home</span>
        </Link>
        <Link
          href="/prices"
          className={`bottom-nav-item ${pathname === '/prices' ? 'active' : ''}`}
        >
          <PlusCircle size={19} />
          <span>Prices</span>
        </Link>
        <Link
          href="/ai-extractor"
          className={`bottom-nav-item ${pathname === '/ai-extractor' ? 'active' : ''}`}
        >
          <Sparkles size={19} />
          <span>AI OCR</span>
        </Link>
        <Link
          href="/notifications"
          className={`bottom-nav-item ${pathname === '/notifications' ? 'active' : ''}`}
        >
          <Bell size={19} />
          <span>Alerts</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={`bottom-nav-item ${mobileMenuOpen ? 'active' : ''}`}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Layers size={19} />
          <span>More</span>
        </button>
      </nav>
    </>
  );
};
