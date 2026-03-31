import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || 'https://reporteador.vercel.app'}/api/auth/google-ads/callback`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Obtener cuentas accesibles de Google Ads
async function getAccessibleCustomers(accessToken) {
  try {
    const response = await fetch(
      'https://googleads.googleapis.com/v16/customers:listAccessibleCustomers',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
        },
      }
    );

    if (!response.ok) {
      console.error('Google Ads API error:', response.status, await response.text());
      // Si falla, retornamos array vacío - el usuario podrá agregar manualmente
      return [];
    }

    const data = await response.json();
    // Format: { resource_names: ['customers/1234567890', 'customers/0987654321'] }
    const customers = data.resource_names || [];
    return customers.map(resource => {
      const customerId = resource.split('/')[1];
      return { customerId, resourceName: resource };
    });
  } catch (error) {
    console.error('Error fetching accessible customers:', error);
    return [];
  }
}

// Obtener información de una cuenta específica
async function getCustomerInfo(customerId, accessToken) {
  try {
    const query = `
      SELECT
        customer.id,
        customer.descriptive_name,
        customer.manager,
        customer.status
      FROM customer
      LIMIT 1
    `;

    const response = await fetch(
      `https://googleads.googleapis.com/v16/customers/${customerId}/googleAds:search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!response.ok) {
      return { customerId, displayName: `Google Ads Account ${customerId}` };
    }

    const data = await response.json();
    const customer = data.results?.[0]?.customer;

    return {
      customerId,
      displayName: customer?.descriptive_name || `Google Ads Account ${customerId}`,
      isManager: customer?.manager || false,
      status: customer?.status || 'ACTIVE',
    };
  } catch (error) {
    console.error('Error fetching customer info:', error);
    return { customerId, displayName: `Google Ads Account ${customerId}` };
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://reporteador.vercel.app'}/dashboard?error=oauth_denied`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://reporteador.vercel.app'}/dashboard?error=no_code`
    );
  }

  try {
    // Obtener usuario autenticado primero
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://reporteador.vercel.app'}/login`
      );
    }

    const userId = session.user.id;

    // Intercambiar código por tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(tokens.error || 'Token exchange failed');
    }

    // Obtener cuentas accesibles
    const customers = await getAccessibleCustomers(tokens.access_token);

    if (customers.length === 0) {
      // Si no hay cuentas, redirigir con error pero guardar token para uso manual
      const { error: tokenError } = await supabase
        .from('google_ads_tokens_v2')
        .upsert({
          user_id: userId,
          customer_id: 'pending',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,customer_id'
        });

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://reporteador.vercel.app'}/dashboard/google-ads-connect?status=pending&error=no_accounts`
      );
    }

    // Obtener información de cada cuenta
    const accountsInfo = await Promise.all(
      customers.map(c => getCustomerInfo(c.customerId, tokens.access_token))
    );

    // Guardar tokens para cada cuenta
    for (const accountInfo of accountsInfo) {
      const { error: tokenError } = await supabase
        .from('google_ads_tokens_v2')
        .upsert({
          user_id: userId,
          customer_id: accountInfo.customerId,
          customer_display_name: accountInfo.displayName,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          manager_account: accountInfo.isManager || false,
          added_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,customer_id'
        });

      if (tokenError) {
        console.error('Error saving token for', accountInfo.customerId, tokenError);
      }
    }

    // Check plan limit before saving accounts
    const PLATFORM_LIMITS = { free: 1, starter: 3 }
    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', userId).single()
    const userPlan = profile?.plan || 'free'
    const platformLimit = PLATFORM_LIMITS[userPlan]
    let savedCount = 0
    if (platformLimit !== undefined) {
      const { count: existingCount } = await supabase.from('ad_accounts').select('*', { count: 'exact', head: true }).eq('user_id', userId)
      savedCount = existingCount || 0
    }

    // Guardar cuentas en ad_accounts
    for (const accountInfo of accountsInfo) {
      if (platformLimit !== undefined && savedCount >= platformLimit) {
        console.log(`Plan limit reached (${platformLimit}) for user ${userId}, skipping account ${accountInfo.customerId}`)
        continue
      }
      const { error: accError } = await supabase
        .from('ad_accounts')
        .upsert({
          user_id: userId,
          account_id: `gads_${accountInfo.customerId}`,
          account_name: accountInfo.displayName,
          platform: 'google_ads',
          is_active: true,
        }, {
          onConflict: 'user_id,account_id'
        });

      if (accError) {
        console.error('Error saving account', accountInfo.customerId, accError);
      } else {
        savedCount++
      }
    }

    // Redirigir a página de selección de cuentas
    const encoded = encodeURIComponent(JSON.stringify({
      token: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      accounts: accountsInfo,
    }));

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://reporteador.vercel.app'}/dashboard/google-ads-connect?data=${encoded}`
    );
  } catch (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://reporteador.vercel.app'}/dashboard?error=oauth_error&message=${encodeURIComponent(error.message)}`
    );
  }
}