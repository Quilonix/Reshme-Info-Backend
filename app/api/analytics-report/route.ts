import { NextRequest, NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { createClient as createServerClient } from '@/lib/supabaseServer';

function getAnalyticsClient() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountJson) {
    try {
      const credentials = JSON.parse(serviceAccountJson);
      if (credentials.private_key && typeof credentials.private_key === 'string') {
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
      }
      return new BetaAnalyticsDataClient({ credentials });
    } catch (e) {
      console.error('Failed to parse service account for Google Analytics Data API:', e);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      projectId,
    });
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    // 1. Security Check: Authenticate admin caller
    const supabaseServer = await createServerClient();
    const { data: { user } } = await supabaseServer.auth.getUser();

    let isAuthorized = !!user;
    if (!isAuthorized) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const { data: userFromToken } = await supabaseServer.auth.getUser(token);
        isAuthorized = !!userFromToken?.user;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
    }

    // 2. Resolve Property ID
    const propertyId = process.env.GA_PROPERTY_ID || process.env.NEXT_PUBLIC_GA_PROPERTY_ID;

    if (!propertyId || propertyId === 'your-numeric-property-id-here') {
      return NextResponse.json({
        configured: false,
        message: 'GA_PROPERTY_ID not configured yet in .env.local. Please provide your numeric Property ID.',
      });
    }

    const analyticsDataClient = getAnalyticsClient();
    if (!analyticsDataClient) {
      return NextResponse.json({
        configured: false,
        message: 'Google Service Account credentials not found in FIREBASE_SERVICE_ACCOUNT_KEY.',
      });
    }

    const propPath = `properties/${propertyId}`;

    // Execute queries in parallel using Google Analytics Data API
    const [
      [overviewRes],
      [dauTrendRes],
      [topScreensRes],
      [topEventsRes],
      [topCitiesRes],
      [deviceRes],
      [osRes],
    ] = await Promise.all([
      // 1. Overview metrics (30 days)
      analyticsDataClient.runReport({
        property: propPath,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'newUsers' },
          { name: 'userEngagementDuration' },
        ],
      }),

      // 2. DAU Daily Trend (Last 14 days)
      analyticsDataClient.runReport({
        property: propPath,
        dateRanges: [{ startDate: '14daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
      }),

      // 3. Top Screens
      analyticsDataClient.runReport({
        property: propPath,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'unifiedScreenName' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }],
        limit: 10,
      }),

      // 4. Top Events
      analyticsDataClient.runReport({
        property: propPath,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }, { name: 'activeUsers' }],
        limit: 10,
      }),

      // 5. Top Cities in Karnataka
      analyticsDataClient.runReport({
        property: propPath,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'city' }],
        metrics: [{ name: 'activeUsers' }],
        limit: 8,
      }),

      // 6. Device Category Breakdown
      analyticsDataClient.runReport({
        property: propPath,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
      }),

      // 7. Operating System Breakdown
      analyticsDataClient.runReport({
        property: propPath,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'operatingSystem' }],
        metrics: [{ name: 'activeUsers' }],
      }),
    ]);

    // Realtime users in last 30 minutes
    let realtimeActiveUsers = 0;
    try {
      const [realtimeRes] = await analyticsDataClient.runRealtimeReport({
        property: propPath,
        metrics: [{ name: 'activeUsers' }],
      });
      realtimeActiveUsers = parseInt(realtimeRes.rows?.[0]?.metricValues?.[0]?.value || '0', 10);
    } catch (_) {}

    // Parse Overview Metrics
    const ovRow = overviewRes.rows?.[0]?.metricValues || [];
    const totalActiveUsers = parseInt(ovRow[0]?.value || '0', 10);
    const totalSessions = parseInt(ovRow[1]?.value || '0', 10);
    const totalScreenViews = parseInt(ovRow[2]?.value || '0', 10);
    const newUsers = parseInt(ovRow[3]?.value || '0', 10);
    const totalDurationSec = parseFloat(ovRow[4]?.value || '0');
    const avgSessionSec = totalSessions > 0 ? Math.round(totalDurationSec / totalSessions) : 0;

    // Parse DAU Trend
    const dauTrend = (dauTrendRes.rows || []).map((row) => ({
      date: row.dimensionValues?.[0]?.value || '',
      users: parseInt(row.metricValues?.[0]?.value || '0', 10),
      sessions: parseInt(row.metricValues?.[1]?.value || '0', 10),
    }));

    // Parse Top Screens
    const topScreens = (topScreensRes.rows || []).map((row) => ({
      screen: row.dimensionValues?.[0]?.value || 'Unknown',
      views: parseInt(row.metricValues?.[0]?.value || '0', 10),
      sessions: parseInt(row.metricValues?.[1]?.value || '0', 10),
    }));

    // Parse Top Events
    const topEvents = (topEventsRes.rows || []).map((row) => ({
      event: row.dimensionValues?.[0]?.value || 'Unknown',
      count: parseInt(row.metricValues?.[0]?.value || '0', 10),
      users: parseInt(row.metricValues?.[1]?.value || '0', 10),
    }));

    // Parse Top Cities
    const topCities = (topCitiesRes.rows || []).map((row) => ({
      city: row.dimensionValues?.[0]?.value || 'Unknown',
      users: parseInt(row.metricValues?.[0]?.value || '0', 10),
    }));

    // Parse Device & OS
    const deviceBreakdown = (deviceRes.rows || []).map((row) => ({
      device: row.dimensionValues?.[0]?.value || 'mobile',
      users: parseInt(row.metricValues?.[0]?.value || '0', 10),
    }));

    const osBreakdown = (osRes.rows || []).map((row) => ({
      os: row.dimensionValues?.[0]?.value || 'Android',
      users: parseInt(row.metricValues?.[0]?.value || '0', 10),
    }));

    return NextResponse.json({
      configured: true,
      propertyId,
      overview: {
        realtime_users: realtimeActiveUsers,
        dau: dauTrend.length > 0 ? dauTrend[dauTrend.length - 1].users : 0,
        mau: totalActiveUsers,
        sessions: totalSessions,
        new_users: newUsers,
        screen_views: totalScreenViews,
        avg_session_s: avgSessionSec,
      },
      dau_trend: dauTrend,
      top_screens: topScreens,
      top_events: topEvents,
      top_cities: topCities,
      device_breakdown: deviceBreakdown,
      os_breakdown: osBreakdown,
    });
  } catch (err: any) {
    console.error('Google Analytics Data API Error:', err);
    return NextResponse.json({
      configured: false,
      message: err.message || 'Failed to query Google Analytics Data API',
    }, { status: 500 });
  }
}
