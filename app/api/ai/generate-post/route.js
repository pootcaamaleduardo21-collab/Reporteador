import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  try {
    const { topic, platform, accountName, followers, style, customPrompt } = await request.json()

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

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
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

    return NextResponse.json({ posts: parsed.posts })
  } catch (err) {
    console.error('Generate post error:', err)
    return NextResponse.json({ error: err.message || 'Error generating post' }, { status: 500 })
  }
}
