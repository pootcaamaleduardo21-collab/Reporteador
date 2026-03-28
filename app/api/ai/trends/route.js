import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Cache simple en memoria (se reinicia con cada deploy, pero sirve para una sesión del servidor)
let trendsCache = null
let trendsCacheDate = null

export async function GET(request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const today = new Date().toISOString().split('T')[0]

  // Retornar caché si ya se generó hoy
  if (trendsCache && trendsCacheDate === today) {
    return NextResponse.json({ trends: trendsCache, cached: true })
  }

  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location') || 'México (Riviera Maya, CDMX, Monterrey)'
    const month = new Date().toLocaleString('es-MX', { month: 'long' })
    const year = new Date().getFullYear()

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Eres un experto en marketing inmobiliario y tendencias del mercado en ${location}.

Hoy es ${month} ${year}. Genera exactamente 8 temas de tendencia para crear contenido orgánico en redes sociales (Facebook e Instagram) orientado a bienes raíces.

Considera:
- Tendencias estacionales del mercado inmobiliario para esta época del año
- Temas de interés para compradores, inversionistas y personas buscando rentar
- Contenido educativo sobre el proceso de compra/renta
- Lifestyle asociado a propiedades (Riviera Maya, playa, amenidades)
- Temas sobre financiamiento, inversión, plusvalía
- Noticias relevantes del sector inmobiliario en México

Responde ÚNICAMENTE con un JSON válido con este formato exacto (sin markdown, sin explicaciones):
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
      }]
    })

    const raw = message.content[0].text.trim()
    const parsed = JSON.parse(raw)

    trendsCache = parsed.trends
    trendsCacheDate = today

    return NextResponse.json({ trends: parsed.trends, cached: false })
  } catch (err) {
    console.error('Trends API error:', err)
    // Tendencias de fallback si la API falla
    return NextResponse.json({
      trends: [
        { id: 1, emoji: '🏡', titulo: 'Consejos para primera vivienda', descripcion: 'Todo lo que necesitas saber antes de comprar tu primera casa.', hashtags: ['#PrimeraVivienda', '#BienesRaices', '#TuHogar'], tipo: 'educativo' },
        { id: 2, emoji: '📈', titulo: 'Plusvalía en la Riviera Maya', descripcion: 'Las zonas con mayor crecimiento inmobiliario este año.', hashtags: ['#RivieraMaya', '#Inversion', '#Plusvalia'], tipo: 'inversion' },
        { id: 3, emoji: '🌊', titulo: 'Vivir cerca del mar', descripcion: 'El lifestyle que ofrece vivir en zona costera.', hashtags: ['#VidaEnPlaya', '#PlayaDelCarmen', '#Lifestyle'], tipo: 'lifestyle' },
        { id: 4, emoji: '💰', titulo: 'Crédito hipotecario en 2025', descripcion: 'Cómo acceder a crédito y qué opciones existen.', hashtags: ['#Hipoteca', '#Infonavit', '#CreditoVivienda'], tipo: 'proceso' },
        { id: 5, emoji: '🏢', titulo: 'Inversión en departamentos', descripcion: 'Por qué los departamentos son la mejor inversión ahora.', hashtags: ['#Departamentos', '#InversionInmobiliaria', '#Renta'], tipo: 'inversion' },
        { id: 6, emoji: '🔑', titulo: 'Proceso de compra paso a paso', descripcion: 'Guía completa para comprar propiedad en México.', hashtags: ['#CompraTuCasa', '#GuiaInmobiliaria', '#BienesRaices'], tipo: 'proceso' },
        { id: 7, emoji: '🏖️', titulo: 'Propiedades vacacionales rentables', descripcion: 'Genera ingresos con una propiedad en zona turística.', hashtags: ['#PropiedadVacacional', '#AirbnbMexico', '#Inversion'], tipo: 'mercado' },
        { id: 8, emoji: '🌳', titulo: 'Amenidades que más valoran los compradores', descripcion: 'Qué buscan hoy los compradores modernos.', hashtags: ['#Amenidades', '#CalidadDeVida', '#HogarIdeal'], tipo: 'mercado' },
      ],
      cached: false,
      fallback: true
    })
  }
}
