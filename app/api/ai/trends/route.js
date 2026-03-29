import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { NICHE_AI_CONTEXT, DEFAULT_NICHE } from '@/app/lib/niches'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const TRENDS_DAILY_LIMIT = 5

// Caché en memoria por clave "fecha_nicho"
const memCache = {}

async function callGroq(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
      temperature: 0.8,
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`)
  const text = data.choices?.[0]?.message?.content || ''
  if (!text) throw new Error('Respuesta vacía de Groq')
  return text
}

export async function GET(request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY no configurada en las variables de entorno de Vercel.' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const userId   = searchParams.get('userId')
  const location = searchParams.get('location') || 'México'

  // ── Nicho ──
  const rawNiche  = searchParams.get('niche') || DEFAULT_NICHE
  const nicheKey  = NICHE_AI_CONTEXT[rawNiche] ? rawNiche : DEFAULT_NICHE
  const nicheCtx  = NICHE_AI_CONTEXT[nicheKey]

  const today    = new Date().toISOString().split('T')[0]
  const cacheKey = `${today}_${nicheKey}` // Caché independiente por fecha + nicho

  // 1. Caché en memoria
  if (memCache[cacheKey]) {
    return NextResponse.json({ trends: memCache[cacheKey], cached: true })
  }

  // 2. Caché persistente en Supabase (usando cacheKey como date)
  const { data: dbCache } = await supabase
    .from('ai_trends_cache').select('trends').eq('date', cacheKey).single()

  if (dbCache?.trends) {
    memCache[cacheKey] = dbCache.trends
    return NextResponse.json({ trends: dbCache.trends, cached: true })
  }

  // 3. Rate limiting por usuario
  if (userId) {
    const rateLimitKey = `trends_${today}`
    const { data: usageRow } = await supabase
      .from('ai_usage').select('calls').eq('user_id', userId).eq('date', rateLimitKey).single()
    const trendCalls = usageRow?.calls || 0

    if (trendCalls >= TRENDS_DAILY_LIMIT) {
      if (memCache[cacheKey]) return NextResponse.json({ trends: memCache[cacheKey], cached: true })
      return NextResponse.json({
        error: `Límite de actualizaciones alcanzado (${TRENDS_DAILY_LIMIT}/día).`,
        limitReached: true,
      }, { status: 429 })
    }
  }

  try {
    const month = new Date().toLocaleString('es-MX', { month: 'long' })
    const year  = new Date().getFullYear()

    const prompt = `Eres un experto en ${nicheCtx.trendsContext} y estrategia de contenido en redes sociales.

Hoy es ${month} ${year}. Ubicación de referencia: ${location}.
Genera exactamente 8 temas de tendencia para crear contenido orgánico en Facebook e Instagram para negocios de ${nicheCtx.trendsContext}.

Considera:
- Tendencias estacionales del sector para esta época del año
- Temas de interés para la audiencia: ${nicheCtx.audience}
- Contenido educativo y de valor para el sector
- Temas sobre: ${nicheCtx.trendTopics}
- Oportunidades de contenido de alta interacción (preguntas, debates, inspiración)

Responde ÚNICAMENTE con JSON válido (sin markdown, sin bloques de código):
{
  "trends": [
    {
      "id": 1,
      "emoji": "🏡",
      "titulo": "Título corto del tema (máx 50 chars)",
      "descripcion": "Por qué este tema es relevante ahora para el sector (1-2 frases)",
      "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
      "tipo": "educativo|lifestyle|mercado|inversion|proceso"
    }
  ]
}`

    const raw    = await callGroq(prompt)
    const clean  = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(clean)

    // Guardar en caché
    memCache[cacheKey] = parsed.trends

    await supabase.from('ai_trends_cache').upsert(
      { date: cacheKey, trends: parsed.trends },
      { onConflict: 'date' }
    )

    // Incrementar rate limit del usuario
    if (userId) {
      const rateLimitKey = `trends_${today}`
      const { data: usageRow } = await supabase
        .from('ai_usage').select('calls').eq('user_id', userId).eq('date', rateLimitKey).single()
      const prev = usageRow?.calls || 0
      await supabase.from('ai_usage').upsert(
        { user_id: userId, date: rateLimitKey, calls: prev + 1 },
        { onConflict: 'user_id,date' }
      )
    }

    return NextResponse.json({ trends: parsed.trends, cached: false })

  } catch (err) {
    console.error('Trends API error:', err.message)
    // Fallback con tendencias del nicho
    return NextResponse.json({
      trends: nicheCtx.fallbackTrends,
      cached: false,
      fallback: true,
    })
  }
}
