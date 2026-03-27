// app/api/google-ads/campaigns.js - versión simplificada
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { dateRange } = await request.json()
    
    // Por ahora, retornamos datos de ejemplo
    // Cuando tengas el Developer Token, conectamos la API real
    const mockCampaigns = [
      {
        id: '1',
        name: 'Campaña de Búsqueda - Verano',
        status: 'ENABLED',
        spend: 2500.00,
        conversions: 145,
        clicks: 3200,
        impressions: 45000,
        cpc: 0.78,
        ctr: 7.1,
        cpm: 55.56
      },
      {
        id: '2',
        name: 'Display - Remarketing',
        status: 'ENABLED',
        spend: 1200.00,
        conversions: 68,
        clicks: 1560,
        impressions: 28000,
        cpc: 0.77,
        ctr: 5.6,
        cpm: 42.86
      },
      {
        id: '3',
        name: 'Shopping - Productos',
        status: 'ENABLED',
        spend: 3100.00,
        conversions: 210,
        clicks: 4100,
        impressions: 52000,
        cpc: 0.76,
        ctr: 7.88,
        cpm: 59.62
      }
    ]

    return new Response(JSON.stringify({ campaigns: mockCampaigns }), { status: 200 })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}