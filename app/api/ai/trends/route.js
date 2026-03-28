import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const TRENDS_DAILY_LIMIT = 5

let trendsCache     = null
let trendsCacheDate = null

// Llamada directa a la API REST de Google (v1)
async function callGemini(prompt) {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1024, temperature: 0.8 },
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    const errMsg = data.error?.message || `HTTP ${res.status}`
    throw new Error(errMsg)
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  if (!text) throw new Error('Respuesta vacía de Gemini')
  return text
}

export async function GET(request) {
  if (!process.env.GOOGLE_AI_API_KEY) {
    return NextResponse.json({ error: 'GOOGLE_AI_API_KEY no configurada en las variables de entorno.' }, { status: 500 })
  }

  const today = new Date().toISOString().split('T')[0]

  // 1. Cache en memoria
  if (trendsCache && trendsCacheDate === today) {
    return NextResponse.json({ trends: trendsCache, cached: true })
  }

  // 2. Cache persistente en Supabase
  const { data: dbCache } = await supabase
    .from('ai_trends_cache').select('trends').eq('date', today).single()

  if (dbCache?.trends) {
    trendsCache     = dbCache.trends
    trendsCacheDate = today
    return NextResponse.json({ trends: dbCache.trends, cached: true })
  }

  // 3. Rate limiting por usuario
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (userId) {
    const trendKey = `trends_${today}`
    const { data: usageRow } = await supabase
      .from('ai_usage').select('calls').eq('user_id', userId).eq('date', trendKey).single()
    const trendCalls = usageRow?.calls || 0

    if (trendCalls >= TRENDS_DAILY_LIMIT) {
      if (trendsCache) return NextResponse.json({ trends: trendsCache, cached: true })
      return NextResponse.json({
        error: `Límite de actualizaciones alcanzado (${TRENDS_DAILY_LIMIT}/día).`,
        limitReached: true,
      }, { status: 429 })
    }
  }

  try {
    const location = searchParams.get('location') || 'México (Riviera Maya, CDMX, Monterrey)'
    const month    = new Date().toLocaleString('es-MX', { month: 'long' })
    const year     = new Date().getFullYear()

    const prompt = `Eres un experto en marketing inmobiliario y tendencias del mercado en ${location}.

Hoy es ${month} ${year}. Genera exactamente 8 temas de tendencia para crear contenido orgánico en redes sociales (Facebook e Instagram) orientado a bienes raíces.

Considera:
- Tendencias estacionales del mercado inmobiliario para esta época del año
- Temas de interés para compradores, inversionistas y personas buscando rentar
- Contenido educativo sobre el proceso de compra/renta
- Lifestyle asociado a propiedades (Riviera Maya, playa, amenidades)
- Temas sobre financiamiento, inversión, plusvalía

Responde ÚNICAMENTE con JSON válido (sin markdown, sin bloques de código):
{
  "trends": [
    {
      "id": 1,
      "emoji": "🏡",
      "titulo": "Título corto del tema (máx 50 chars)",
      "descripcion": "Descripción de por qué este tema es relevante ahora (1-2 frases)",
      "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
      "tipo": "educativo|lifestyle|mercado|inversion|proceso"
    }
  ]
}`

    const raw    = await callGemini(prompt)
    const clean  = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(clean)

    trendsCache     = parsed.trends
    trendsCacheDate = today

    await supabase.from('ai_trends_cache').upsert(
      { date: today, trends: parsed.trends },
      { onConflict: 'date' }
    )

    if (userId) {
      const trendKey = `trends_${today}`
      const { data: usageRow } = await supabase
        .from('ai_usage').select('calls').eq('user_id', userId).eq('date', trendKey).single()
      const prev = usageRow?.calls || 0
      await supabase.from('ai_usage').upsert(
        { user_id: userId, date: trendKey, calls: prev + 1 },
        { onConflict: 'user_id,date' }
      )
    }

    return NextResponse.json({ trends: parsed.trends, cached: false })
  } catch (err) {
    console.error('Trends API error:', err.message)
    return NextResponse.json({
      trends: [
        { id: 1, emoji: '🏡', titulo: 'Consejos para primera vivienda',       descripcion: 'Todo lo que necesitas saber antes de comprar tu primera casa.',      hashtags: ['#PrimeraVivienda', '#BienesRaices', '#TuHogar'],          tipo: 'educativo' },
        { id: 2, emoji: '📈', titulo: 'Plusvalía en la Riviera Maya',         descripcion: 'Las zonas con mayor crecimiento inmobiliario este año.',             hashtags: ['#RivieraMaya', '#Inversion', '#Plusvalia'],               tipo: 'inversion' },
        { id: 3, emoji: '🌊', titulo: 'Vivir cerca del mar',                 descripcion: 'El lifestyle que ofrece vivir en zona costera.',                     hashtags: ['#VidaEnPlaya', '#PlayaDelCarmen', '#Lifestyle'],          tipo: 'lifestyle' },
        { id: 4, emoji: '💰', titulo: 'Crédito hipotecario en 2025',         descripcion: 'Cómo acceder a crédito y qué opciones existen.',                     hashtags: ['#Hipoteca', '#Infonavit', '#CreditoVivienda'],            tipo: 'proceso'   },
        { id: 5, emoji: '🏢', titulo: 'Inversión en departamentos',          descripcion: 'Por qué los departamentos son la mejor inversión ahora.',            hashtags: ['#Departamentos', '#InversionInmobiliaria', '#Renta'],     tipo: 'inversion' },
        { id: 6, emoji: '🔑', titulo: 'Proceso de compra paso a paso',       descripcion: 'Guía completa para comprar propiedad en México.',                    hashtags: ['#CompraTuCasa', '#GuiaInmobiliaria', '#BienesRaices'],    tipo: 'proceso'   },
        { id: 7, emoji: '🏖️', titulo: 'Propiedades vacacionales rentables',  descripcion: 'Genera ingresos con una propiedad en zona turística.',              hashtags: ['#PropiedadVacacional', '#AirbnbMexico', '#Inversion'],    tipo: 'mercado'   },
        { id: 8, emoji: '🌳', titulo: 'Amenidades más valoradas en 2025',    descripcion: 'Qué buscan hoy los compradores modernos en una propiedad.',          hashtags: ['#Amenidades', '#CalidadDeVida', '#HogarIdeal'],           tipo: 'mercado'   },
      ],
      cached: false,
      fallback: true,
    })
  }
}
