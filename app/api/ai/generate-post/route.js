import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { NICHE_AI_CONTEXT, DEFAULT_NICHE } from '@/app/lib/niches'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const DAILY_LIMIT   = 10
const MONTHLY_LIMIT = 50

async function callGroq(systemPrompt, userPrompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      max_tokens: 2048,
      temperature: 0.9,
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`)
  const text = data.choices?.[0]?.message?.content || ''
  if (!text) throw new Error('Respuesta vacía de Groq')
  return text
}

export async function POST(request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY no configurada en las variables de entorno de Vercel.' }, { status: 500 })
  }

  try {
    const { topic, platform, accountName, followers, style, customPrompt, userId, niche } = await request.json()

    const today      = new Date().toISOString().split('T')[0]
    const monthStart = today.slice(0, 7) + '-01'
    let todayCalls   = 0

    // ── Rate limiting por usuario ──
    if (userId) {
      const { data: todayRow } = await supabase
        .from('ai_usage').select('calls').eq('user_id', userId).eq('date', today).single()
      todayCalls = todayRow?.calls || 0

      if (todayCalls >= DAILY_LIMIT) {
        return NextResponse.json({
          error: `Límite diario alcanzado (${DAILY_LIMIT} generaciones/día). Regresa mañana.`,
          limitReached: true, type: 'daily',
        }, { status: 429 })
      }

      const { data: monthRows } = await supabase
        .from('ai_usage').select('calls').eq('user_id', userId).gte('date', monthStart)
      const monthlyCalls = (monthRows || []).reduce((s, r) => s + (r.calls || 0), 0)

      if (monthlyCalls >= MONTHLY_LIMIT) {
        return NextResponse.json({
          error: `Límite mensual alcanzado (${MONTHLY_LIMIT} generaciones/mes). Se renueva el 1 del próximo mes.`,
          limitReached: true, type: 'monthly',
        }, { status: 429 })
      }
    }

    // ── Contexto de nicho ──
    const nicheKey  = niche && NICHE_AI_CONTEXT[niche] ? niche : DEFAULT_NICHE
    const nicheCtx  = NICHE_AI_CONTEXT[nicheKey]

    // ── Contexto de plataforma ──
    const platformCtx = platform === 'instagram'
      ? 'Instagram (máximo 2,200 caracteres, usa emojis estratégicamente, formato visual con saltos de línea)'
      : 'Facebook (máximo 63,206 caracteres, puedes ser más detallado, incluye una llamada a la acción clara)'

    // ── Contexto de tono ──
    const styleCtx = style === 'profesional'
      ? 'tono profesional y de autoridad, lenguaje formal pero accesible'
      : style === 'casual'
      ? 'tono cercano y conversacional, como hablarle a un amigo'
      : 'tono equilibrado — profesional pero amigable'

    const topicLine = customPrompt
      ? `Instrucción del usuario: "${customPrompt}"`
      : `Tema: "${topic}"`

    const systemPrompt = `Eres un experto copywriter de ${nicheCtx.expertiseDesc} especializado en redes sociales.
La cuenta es "${accountName || 'Mi negocio'}" con ${followers ? followers + ' seguidores' : 'audiencia en crecimiento'}.
Tu audiencia objetivo: ${nicheCtx.audience}.
Usa ${styleCtx}.
Eres experto en: ${nicheCtx.expertise}.`

    const userPrompt = `Genera 3 variaciones de un post para ${platformCtx}.
${topicLine}

Cada variación debe tener:
- Hook poderoso en la primera línea (que haga parar el scroll)
- Cuerpo del post con valor real para la audiencia
- Llamada a la acción clara al final
- Emojis estratégicos (no en exceso)
- Hashtags relevantes al final (8-12 para Instagram, 3-5 para Facebook)

Responde ÚNICAMENTE con JSON válido (sin markdown, sin bloques de código):
{
  "posts": [
    {
      "id": 1,
      "variacion": "Nombre de la variación (ej: Hook emocional, Dato curioso, Pregunta directa)",
      "texto": "El texto completo del post listo para publicar",
      "hook": "Solo la primera línea/gancho",
      "cta": "La llamada a la acción",
      "hashtags": ["#hashtag1", "#hashtag2"],
      "emoji_principal": "🏡",
      "caracteres": 450
    }
  ]
}`

    const raw    = await callGroq(systemPrompt, userPrompt)
    const clean  = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(clean)

    // ── Incrementar uso ──
    if (userId) {
      await supabase.from('ai_usage').upsert(
        { user_id: userId, date: today, calls: todayCalls + 1 },
        { onConflict: 'user_id,date' }
      )
    }

    return NextResponse.json({ posts: parsed.posts })
  } catch (err) {
    console.error('Generate post error:', err.message)
    return NextResponse.json({ error: err.message || 'Error al generar el post' }, { status: 500 })
  }
}
