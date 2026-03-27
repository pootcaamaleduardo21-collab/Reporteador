import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Refrescar token de Google
async function refreshGoogleToken(refreshToken) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      expires_in: data.expires_in,
      refresh_token: data.refresh_token || refreshToken, // Mantener refresh token anterior si no se devuelve uno nuevo
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

export async function POST(request) {
  try {
    const { userId, customerId } = await request.json();

    if (!userId) {
      return Response.json({ error: 'userId es requerido' }, { status: 400 });
    }

    // Obtener token actual
    const { data, error } = await supabase
      .from('google_ads_tokens_v2')
      .select('access_token, refresh_token, token_expires_at, customer_id')
      .eq('user_id', userId)
      .eq('customer_id', customerId || 'default')
      .maybeSingle();

    if (error) {
      console.error('Error fetching token:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return Response.json({ error: 'Token no encontrado' }, { status: 404 });
    }

    const expiresAt = new Date(data.token_expires_at);
    const now = new Date();
    const minutesUntilExpiry = (expiresAt - now) / (1000 * 60);

    // Si el token expira en menos de 5 minutos, refrescarlo
    if (minutesUntilExpiry < 5 && data.refresh_token) {
      try {
        const newTokens = await refreshGoogleToken(data.refresh_token);
        const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

        // Actualizar token en BD
        const { error: updateError } = await supabase
          .from('google_ads_tokens_v2')
          .update({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token,
            token_expires_at: newExpiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('customer_id', data.customer_id);

        if (updateError) {
          console.error('Error updating token:', updateError);
          throw updateError;
        }

        return Response.json({
          access_token: newTokens.access_token,
          refreshed: true,
          expires_in: newTokens.expires_in,
        });
      } catch (refreshError) {
        console.error('Token refresh failed, returning current token:', refreshError);
        // Retornar token actual si el refresh falla
        return Response.json({
          access_token: data.access_token,
          refreshed: false,
          error: 'Token refresh failed, using current token',
        });
      }
    }

    return Response.json({
      access_token: data.access_token,
      refreshed: false,
      expires_in: Math.round(minutesUntilExpiry * 60), // Segundos hasta expiración
    });
  } catch (error) {
    console.error('Error in token endpoint:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}