import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || 'https://reporteador.vercel.app'}/api/oauth/google-ads/callback`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

    // Obtener el usuario autenticado desde la cookie de sesión
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'https://reporteador.vercel.app'}/login`
      );
    }

    const userId = session.user.id;
    const customerId = process.env.NEXT_PUBLIC_GOOGLE_CUSTOMER_ID;

    // Guardar tokens en Supabase
    const { error: dbError } = await supabase
      .from('google_ads_tokens')
      .upsert({
        user_id: userId,
        customer_id: customerId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,customer_id'
      });

    if (dbError) {
      console.error('DB Error:', dbError);
      throw dbError;
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://reporteador.vercel.app'}/dashboard/google-ads?success=connected`
    );
  } catch (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://reporteador.vercel.app'}/dashboard/google-ads?error=oauth_error`
    );
  }
}