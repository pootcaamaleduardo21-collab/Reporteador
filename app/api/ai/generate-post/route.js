import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const DAILY_LIMIT = 10   // generaciones por día por usuario
const MONTHLY_LIMIT = 50 // generaciones por mes por usuario

export async function POST(request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  try {
    const { topic, platform, accountName, followers, style, customPrompt, userId } = await request.json()

    const today = new Date().toISOString().split('T')[0]
    const monthStart = today.slice(0, 7) + '-01'
    let todayCalls = 0

    // ── Rate limiting por usuario ──
    if (userId) {
      const { data: todayRow } = await supabase
        .from('ai_usage')
        .select('calls')
        .eq('user_id', userId)
        .eq('date', today)
        .single()

      todayCalls = todayRow?.calls || 0

      if (todayCalls >= DAILY_LIMIT) {
        return NextResponse.json({
          error: `Límite diario alcanzado (${DAILY_LIMIT} generaciones/día). Regresa mañana.`,
          limitReached: true,
          type: 'daily',
          used: todayCalls,
          limit: DAILY_LIMIT,
        }, { status: 429 })
      }

      const { data: monthRows } = await supabase
        .from('ai_usage')
        .select('calls')
        .eq('user_id', userId)
        .gte('date', monthStart)

      const monthlyCalls = (monthRows || []).reduce((s, r) => s + (r.calls || 0), 0)

      if (monthlyCalls >= MONTHLY_LIMIT) {
        return NextResponse.json({
          error: `Límite mensual alcanzado (${MONTHLY_LIMIT} generaciones/mes). Se renueva el 1 del próximo mes.`,
          limitReached: true,
          type: 'monthly',
          used: monthlyCalls,
          limit: MONTHLY_LIMIT,
        }, { status: 429 })
      }
    }

    // ── Contextos ──
    const platformCtx = platform === 'instagram'
      ? 'Instagram (máximo 2,200 caracteres, usa emojis estratégicamente, formato visual con saltos de línea)'
      : 'Facebook (máximo 63,206 caracteres, puedes ser más detallado, incluye una llamada a la acción clara)'

    const styleCtx = style === 'profesional'
      ? 'tono profesional y de autoridad, lenguaje formal pero accesible'
      : style === 'casual'
      ? 'tono cercano y conversacional, como hablarle a un amigo'
      : 'tono equilibrado — profesional pero amigable'

    const prompt = customPrompt
      ? `Genera 3 variaciones de un post para ${platformCtx} con esta instrucción: "${customPrompt}".`
      : `Genera 3 variaciones de un post para ${platformCtx} sobre el tema: "${topic}".`

    // ── Llamada a Claude Haiku (rápido y económico) ──
    const message = await client.messages.create({
      model: 'claude-haiku-3-5',
      max_tokens: 2048,
      system: `Eres un experto copywriter de marketing inmobiliario en México, especializado en redes sociales para agentes y desarrolladoras inmobiliarias.

La cuenta es "${accountName || 'Agente Inmobiliario'}" con ${followers ? followers + ' seguidores' : 'audiencia en crecimiento'}.
Usa ${styleCtx}.
Eres experto en: hooks que detienen el scroll, storytelling inmobiliario, llamadas a la acción que generan leads, y tendencias de contenido en México.`,
      messages: [{
        role: 'user',
        content: `${prompt}

Cada variación debe tener:
- Hook poderoso en la primera línea (que haga parar el scroll)
- Cuerpo del post con valor real
- Llamada a la acción clara al final
- Emojis estratégicos (no en exceso)
- Hashtags relevantes al final (8-12 hashtags para Instagram, 3-5 para Facebook)

Responde ÚNICAMENTE con JSON válido (sin markdown):
{
  "posts": [
    {
      "id": 1,
      "variacion": "Hook emocional",
      "texto": "El texto completo del post listo para publicar",
      "hook": "Solo la primera línea/gancho",
      "cta": "La llamada a la acción",
      "hashtags": ["#hashtag1", "#hashtag2"],
      "emoji_principal": "🏡",
      "caracteres": 450
    }
  ]
}`
      }]
    })

    const raw = message.content[0].text.trim()
    const parsed = JSON.parse(raw)

    // ── Incrementar contador de uso ──
    if (userId) {
      await supabase.from('ai_usage').upsert(
        { user_id: userId, date: today, calls: todayCalls + 1 },
        { onConflict: 'user_id,date' }
      )
    }

    return NextResponse.json({ posts: parsed.posts })
  } catch (err) {
    console.error('Generate post error:', err)
    return NextResponse.json({ error: err.message || 'Error generating post' }, { status: 500 })
  }
}
