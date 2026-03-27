import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Ejecutar query de Google Ads API
async function runGoogleAdsQuery(customerId, accessToken, query) {
  try {
    const response = await fetch(
      `https://googleads.googleapis.com/v16/customers/${customerId}/googleAds:search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Google Ads API error:', response.status, error);
      throw new Error(`Google Ads API error: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error running Google Ads query:', error);
    throw error;
  }
}

// Parsear resultado de campaign
function parseCampaignRow(result) {
  const campaign = result.campaign;
  const metrics = result.metrics;

  return {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    spend: (metrics.cost_micros || 0) / 1e6, // Convertir de micros a unidad normal
    impressions: parseInt(metrics.impressions) || 0,
    clicks: parseInt(metrics.clicks) || 0,
    conversions: parseFloat(metrics.conversions) || 0,
    conversion_value: parseFloat(metrics.conversion_value) || 0,
    ctr: metrics.ctr ? parseFloat(metrics.ctr) * 100 : 0, // Convertir a porcentaje
    cpc: (metrics.average_cpc || 0) / 1e6,
    cpm: (metrics.average_cpm || 0) / 1e6,
  };
}

// Exportar función para uso en rutas
export async function POST(request) {
  try {
    const { userId, customerId, dateFrom, dateTo } = await request.json();

    if (!userId || !customerId) {
      return Response.json(
        { error: 'userId y customerId son requeridos' },
        { status: 400 }
      );
    }

    // Obtener token de acceso
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_ads_tokens_v2')
      .select('access_token, token_expires_at')
      .eq('user_id', userId)
      .eq('customer_id', customerId)
      .single();

    if (tokenError || !tokenData) {
      return Response.json(
        { error: 'Token no encontrado' },
        { status: 401 }
      );
    }

    // Verificar si token expiró
    if (new Date(tokenData.token_expires_at) < new Date()) {
      return Response.json(
        { error: 'Token expirado' },
        { status: 401 }
      );
    }

    const accessToken = tokenData.access_token;

    // Query GAQL para obtener campañas con métricas
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.budget_period,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversion_value,
        metrics.ctr,
        metrics.average_cpc,
        metrics.average_cpm
      FROM campaign
      WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      ORDER BY metrics.cost_micros DESC
    `;

    const results = await runGoogleAdsQuery(customerId, accessToken, query);
    const campaigns = results.map(parseCampaignRow);

    // Actualizar último sync
    await supabase
      .from('google_ads_tokens_v2')
      .update({ last_synced: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('customer_id', customerId);

    return Response.json({
      success: true,
      campaigns,
      total: campaigns.length,
      currency: 'USD', // Google Ads usa USD
    });
  } catch (error) {
    console.error('Error in Google Ads fetch:', error);
    return Response.json(
      { error: error.message || 'Error fetching Google Ads data' },
      { status: 500 }
    );
  }
}

// Función auxiliar para obtener datos de Google Ads (uso en servidor)
export async function fetchGoogleAdsData(userId, customerId, dateFrom, dateTo) {
  try {
    // Obtener token de acceso
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_ads_tokens_v2')
      .select('access_token, token_expires_at')
      .eq('user_id', userId)
      .eq('customer_id', customerId)
      .single();

    if (tokenError || !tokenData) {
      throw new Error('Token no encontrado');
    }

    // Verificar si token expiró
    if (new Date(tokenData.token_expires_at) < new Date()) {
      throw new Error('Token expirado');
    }

    const accessToken = tokenData.access_token;

    // Query para campañas
    const campaignQuery = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversion_value,
        metrics.ctr,
        metrics.average_cpc,
        metrics.average_cpm
      FROM campaign
      WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      ORDER BY metrics.cost_micros DESC
    `;

    const campaignResults = await runGoogleAdsQuery(customerId, accessToken, campaignQuery);
    const campaigns = campaignResults.map(parseCampaignRow);

    // Query para datos diarios
    const dailyQuery = `
      SELECT
        segments.date,
        campaign.id,
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversion_value,
        metrics.ctr,
        metrics.average_cpc,
        metrics.average_cpm
      FROM campaign
      WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      ORDER BY segments.date ASC
    `;

    const dailyResults = await runGoogleAdsQuery(customerId, accessToken, dailyQuery);

    // Agrupar por fecha
    const dailyData = {};
    dailyResults.forEach(result => {
      const date = result.segments.date;
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          spend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          conversion_value: 0,
        };
      }
      dailyData[date].spend += (result.metrics.cost_micros || 0) / 1e6;
      dailyData[date].impressions += parseInt(result.metrics.impressions) || 0;
      dailyData[date].clicks += parseInt(result.metrics.clicks) || 0;
      dailyData[date].conversions += parseFloat(result.metrics.conversions) || 0;
      dailyData[date].conversion_value += parseFloat(result.metrics.conversion_value) || 0;
    });

    // Actualizar último sync
    await supabase
      .from('google_ads_tokens_v2')
      .update({ last_synced: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('customer_id', customerId);

    return {
      campaigns,
      daily: Object.values(dailyData),
      totalSpend: campaigns.reduce((sum, c) => sum + c.spend, 0),
      totalImpressions: campaigns.reduce((sum, c) => sum + c.impressions, 0),
      totalClicks: campaigns.reduce((sum, c) => sum + c.clicks, 0),
      totalConversions: campaigns.reduce((sum, c) => sum + c.conversions, 0),
    };
  } catch (error) {
    console.error('Error fetching Google Ads data:', error);
    throw error;
  }
}
