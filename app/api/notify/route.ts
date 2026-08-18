import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabaseServer';
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin SDK lazily
function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  // 1. Try FIREBASE_SERVICE_ACCOUNT_KEY JSON string
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      if (parsed.private_key && typeof parsed.private_key === 'string') {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      return initializeApp({
        credential: cert(parsed),
      });
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', e);
    }
  }

  // 2. Try individual environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Security Check: Authenticate caller
    const supabaseServer = await createServerClient();
    const { data: { user } } = await supabaseServer.auth.getUser();

    let isAuthorized = !!user;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!isAuthorized) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        if (serviceRoleKey && token === serviceRoleKey) {
          isAuthorized = true;
        } else {
          const { data: userFromToken } = await supabaseServer.auth.getUser(token);
          isAuthorized = !!userFromToken?.user;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required to dispatch push notifications.' }, { status: 401 });
    }

    const body = await request.json();
    const { title, message, body: bodyMessage, priority = 'medium', targetAudience = 'all', targetMarket, imageUrl } = body;
    const notificationMessage = message || bodyMessage;

    if (!title || !notificationMessage) {
      return NextResponse.json({ error: 'Title and Message are required.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error (Supabase credentials missing).' }, { status: 500 });
    }

    const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey);

    // 1. Record notification in database
    const { data: record, error: dbError } = await supabaseAdmin
      .from('notifications')
      .insert({
        title,
        message: notificationMessage,
        priority,
        target_audience: targetAudience,
        target_market: targetMarket,
        image_url: imageUrl,
        is_active: true,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Notification DB insert error:', dbError);
    }

    // 2. Fetch device push tokens
    const { data: tokenRows, error: tokenError } = await supabaseAdmin
      .from('push_tokens')
      .select('token');

    if (tokenError) {
      console.error('Error fetching push tokens:', tokenError);
    }

    const tokens = tokenRows?.map((r) => r.token).filter(Boolean) || [];

    // 3. Dispatch via Firebase Admin SDK (HTTP v1)
    const firebaseApp = getFirebaseAdminApp();
    let topicSent = false;
    let multicastSuccessCount = 0;
    let multicastFailureCount = 0;

    if (firebaseApp) {
      const messaging = getMessaging(firebaseApp);

      // A. Send to Topic broadcast (reaches ALL subscribed app devices)
      try {
        const topicName = targetMarket && targetMarket !== 'all' ? `market_${targetMarket.replace(/\s+/g, '_')}` : 'all';
        await messaging.send({
          topic: topicName,
          notification: {
            title,
            body: message,
            imageUrl: imageUrl || undefined,
          },
          data: {
            priority,
            targetAudience,
            targetMarket: targetMarket || '',
            notificationId: record?.id || '',
          },
        });
        topicSent = true;
      } catch (topicErr) {
        console.warn('Topic broadcast note:', topicErr);
      }

      // B. Send direct multicast to registered device tokens
      if (tokens.length > 0) {
        const chunkSize = 500;
        for (let i = 0; i < tokens.length; i += chunkSize) {
          const batchTokens = tokens.slice(i, i + chunkSize);
          const response = await messaging.sendEachForMulticast({
            tokens: batchTokens,
            notification: {
              title,
              body: message,
              imageUrl: imageUrl || undefined,
            },
            data: {
              priority,
              targetAudience,
              targetMarket: targetMarket || '',
              notificationId: record?.id || '',
            },
          });
          multicastSuccessCount += response.successCount;
          multicastFailureCount += response.failureCount;
        }
      }
    } else if (process.env.FCM_SERVER_KEY && tokens.length > 0) {
      // Legacy FCM Server Key Fallback
      await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${process.env.FCM_SERVER_KEY}`,
        },
        body: JSON.stringify({
          registration_ids: tokens,
          notification: {
            title,
            body: message,
            image: imageUrl || undefined,
            sound: 'default',
          },
          data: {
            priority,
            targetAudience,
            targetMarket,
            notificationId: record?.id,
          },
        }),
      });
      multicastSuccessCount = tokens.length;
    }

    return NextResponse.json({
      success: true,
      deliveredToTokens: multicastSuccessCount,
      topicBroadcast: topicSent,
      registeredTokensTotal: tokens.length,
      method: firebaseApp ? 'firebase-admin-v1' : (process.env.FCM_SERVER_KEY ? 'fcm-legacy' : 'database-only'),
    });
  } catch (err: any) {
    console.error('Broadcast handler exception:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
