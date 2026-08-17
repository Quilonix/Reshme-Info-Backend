import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Verify if the caller is an authenticated super_admin
 */
async function verifySuperAdmin(req: NextRequest): Promise<{ authorized: boolean; userId?: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return { authorized: false };
  }

  // Check admin_profiles table for super_admin role
  const { data: profile } = await supabaseAdmin
    .from('admin_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role === 'super_admin') {
    return { authorized: true, userId: user.id };
  }

  // Fallback: If no profiles exist yet, allow the first authenticated user
  const { count } = await supabaseAdmin.from('admin_profiles').select('*', { count: 'exact', head: true });
  if (count === 0 || count === null) {
    return { authorized: true, userId: user.id };
  }

  return { authorized: false };
}

/**
 * GET /api/admins
 * List all admin profiles, their auth details, and recent activity stats
 */
export async function GET(req: NextRequest) {
  const auth = await verifySuperAdmin(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
  }

  try {
    // 1. Fetch all admin profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('admin_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) throw profilesError;

    // 2. Fetch all Auth users
    const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers();
    const authUsers = authUsersData?.users || [];

    // 3. Fetch recent price submissions by market to monitor activity
    const { data: recentSubmissions } = await supabaseAdmin
      .from('cocoon_prices')
      .select('market_name, report_date, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    // Merge profiles with Auth user data and activity logs
    const admins = (profiles || []).map((p) => {
      const authUser = authUsers.find((u) => u.id === p.id);
      const userSubmissions = (recentSubmissions || []).filter((s) =>
        p.assigned_market === 'all' || s.market_name?.toLowerCase() === p.assigned_market?.toLowerCase()
      );

      return {
        id: p.id,
        username: p.username || authUser?.email?.split('@')[0] || 'Admin',
        email: authUser?.email || 'N/A',
        role: p.role || 'market_admin',
        assigned_market: p.assigned_market || 'all',
        last_sign_in_at: authUser?.last_sign_in_at || null,
        created_at: p.created_at || authUser?.created_at,
        is_active: !authUser?.banned_until,
        total_recent_submissions: userSubmissions.length,
        last_submission_date: userSubmissions[0]?.report_date || null,
      };
    });

    return NextResponse.json({ admins });
  } catch (error: any) {
    console.error('Failed to fetch admins:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/admins
 * Create or upgrade an admin account (Auth User + Admin Profile)
 */
export async function POST(req: NextRequest) {
  const auth = await verifySuperAdmin(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
  }

  try {
    const { email, password, username, role, assigned_market } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const baseUsername = (username || cleanEmail.split('@')[0]).trim().replace(/\s+/g, '_');
    const validRole = role === 'super_admin' ? 'super_admin' : 'market_admin';
    const validMarket = assigned_market || 'all';

    // 1. Check if user already exists in Supabase Auth
    const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = authUsersData?.users.find((u) => u.email?.toLowerCase() === cleanEmail);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      // Update password & metadata for existing user
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password.trim(),
        user_metadata: {
          username: baseUsername,
          role: validRole,
          assigned_market: validMarket,
        },
      });
    } else {
      // Create new Auth User
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: password.trim(),
        email_confirm: true,
        user_metadata: {
          username: baseUsername,
          role: validRole,
          assigned_market: validMarket,
        },
      });

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }

      userId = newUser.user.id;
    }

    // 2. Ensure profile is upserted with correct role and market in admin_profiles
    const { error: profileError } = await supabaseAdmin.from('admin_profiles').upsert({
      id: userId,
      username: baseUsername,
      role: validRole,
      assigned_market: validMarket,
    });

    if (profileError) {
      console.warn('Profile upsert warning:', profileError);
    }

    return NextResponse.json({
      success: true,
      message: existingUser ? 'Existing user updated to administrator' : 'New admin account created successfully',
      admin: {
        id: userId,
        email: cleanEmail,
        username: baseUsername,
        role: validRole,
        assigned_market: validMarket,
      },
    });
  } catch (error: any) {
    console.error('Admin creation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create admin' }, { status: 500 });
  }
}

/**
 * PATCH /api/admins
 * Update an existing admin's role, assigned market, or password
 */
export async function PATCH(req: NextRequest) {
  const auth = await verifySuperAdmin(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
  }

  try {
    const { id, role, assigned_market, username, newPassword } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Admin ID is required' }, { status: 400 });
    }

    // 1. Update Profile in DB
    const updates: any = {};
    if (role) updates.role = role;
    if (assigned_market) updates.assigned_market = assigned_market;
    if (username) updates.username = username;

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('admin_profiles')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;
    }

    // 2. Update password if requested
    if (newPassword && newPassword.length >= 6) {
      await supabaseAdmin.auth.admin.updateUserById(id, { password: newPassword });
    }

    return NextResponse.json({ success: true, message: 'Admin updated successfully' });
  } catch (error: any) {
    console.error('Admin update error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update admin' }, { status: 500 });
  }
}

/**
 * DELETE /api/admins
 * Delete an admin user from Supabase Auth & admin_profiles
 */
export async function DELETE(req: NextRequest) {
  const auth = await verifySuperAdmin(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized: Super Admin access required' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Admin ID is required' }, { status: 400 });
    }

    // Protect self-deletion
    if (id === auth.userId) {
      return NextResponse.json({ error: 'You cannot delete your own Super Admin account' }, { status: 400 });
    }

    // 1. Delete from admin_profiles
    await supabaseAdmin.from('admin_profiles').delete().eq('id', id);

    // 2. Delete from Supabase Auth
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authDeleteError) {
      console.warn('Auth deletion notice:', authDeleteError);
    }

    return NextResponse.json({ success: true, message: 'Admin deleted successfully' });
  } catch (error: any) {
    console.error('Admin deletion error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete admin' }, { status: 500 });
  }
}
