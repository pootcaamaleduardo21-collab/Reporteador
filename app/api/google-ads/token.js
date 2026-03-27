// app/api/google-ads/token.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { userId } = await request.json()
    
    const { data, error } = await supabase
      .from('google_ads_tokens')
      .select('access_token, refresh_token, token_expires_at')
      .eq('user_id', userId)
      .single()
    
    if (error) throw error
    
    // Verificar si el token expiró y refrescarlo si es necesario
    const expiresAt = new Date(data.token_expires_at)
    if (new Date() > expiresAt && data.refresh_token) {
      // Aquí iría la lógica para refrescar el token
      // Por ahora retornamos el token actual
    }
    
    return Response.json({ access_token: data.access_token })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}