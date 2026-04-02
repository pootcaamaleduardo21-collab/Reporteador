import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ─── Google Ads API helper ────────────────────────────────────
async function runQuery(customerId, accessToken, query) {
  const res = await fetch(
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
  )
  if (!res.ok) {
    const err = await res.text()
    console.error('[gads] API error', res.status, err)
    throw new Error(`Google Ads API error: ${res.status}`)
  }
  const data = await res.json()
  return data.results || []
}

// Safe field access: try camelCase AND snake_case paths
function g(obj, ...paths) {
  for (const p of paths) {
    const parts = p.split('.')
    let v = obj
    for (const part of parts) {
      if (v == null) break
      v = v[part]
    }
    if (v != null) return v
  }
  return undefined
}

// Parse metrics from a result row — handles both camelCase (API) and snake_case (legacy)
function parseM(metrics) {
  if (!metrics) return { spend:0, impressions:0, clicks:0, conversions:0, convValue:0, ctr:0, cpc:0, cpm:0 }
  const costMicros = g(metrics, 'costMicros', 'cost_micros') || 0
  const avCpc      = g(metrics, 'averageCpc', 'average_cpc') || 0
  const avCpm      = g(metrics, 'averageCpm', 'average_cpm') || 0
  const ctrRaw     = parseFloat(g(metrics, 'ctr') || 0)
  return {
    spend:       costMicros / 1e6,
    impressions: parseInt(g(metrics, 'impressions') || 0),
    clicks:      parseInt(g(metrics, 'clicks') || 0),
    conversions: parseFloat(g(metrics, 'conversions') || 0),
    convValue:   parseFloat(g(metrics, 'conversionValue', 'conversion_value') || 0),
    ctr:         ctrRaw * 100, // API returns decimal (0.05 → 5%)
    cpc:         avCpc / 1e6,
    cpm:         avCpm / 1e6,
  }
}

// ─── Label maps ───────────────────────────────────────────────
const CHANNEL_LABELS = {
  SEARCH: 'Search', DISPLAY: 'Display', VIDEO: 'Video (YouTube)',
  SHOPPING: 'Shopping', PERFORMANCE_MAX: 'Performance Max',
  SMART: 'Smart', MULTI_CHANNEL: 'Multi-canal', DEMAND_GEN: 'Demand Gen', LOCAL: 'Local',
}
const AGE_LABELS = {
  AGE_RANGE_18_24:'18–24', AGE_RANGE_25_34:'25–34', AGE_RANGE_35_44:'35–44',
  AGE_RANGE_45_54:'45–54', AGE_RANGE_55_64:'55–64', AGE_RANGE_65_UP:'65+',
}
const GENDER_LABELS = { MALE:'Hombre', FEMALE:'Mujer' }
const DEVICE_LABELS = { MOBILE:'Móvil', DESKTOP:'Escritorio', TABLET:'Tablet', CONNECTED_TV:'Smart TV' }
const GEO_NAMES = {
  '2484':'México','2840':'Estados Unidos','2076':'Brasil','2032':'Argentina',
  '2170':'Colombia','2724':'España','2152':'Chile','2604':'Perú','2218':'Ecuador',
  '2222':'El Salvador','2188':'Costa Rica','2558':'Paraguay','2858':'Uruguay',
  '2068':'Bolivia','2320':'Guatemala','2340':'Honduras','2591':'Panamá',
  '2630':'Puerto Rico','2214':'República Dominicana','2756':'Suiza','2276':'Alemania',
  '2250':'Francia','2380':'Italia','2826':'Reino Unido','2036':'Australia',
}

// ─── Token helper ─────────────────────────────────────────────
async function getToken(userId, customerId) {
  const { data, error } = await supabase
    .from('google_ads_tokens_v2')
    .select('access_token, token_expires_at')
    .eq('user_id', userId)
    .eq('customer_id', customerId)
    .single()
  if (error || !data) throw new Error('Token no encontrado — reconecta tu cuenta de Google Ads')
  if (new Date(data.token_expires_at) < new Date()) throw new Error('Token expirado — reconecta tu cuenta de Google Ads')
  return data.access_token
}

// ─── Main route ───────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json()
    const { userId, customerId, dateFrom, dateTo, type, monthFrom, monthTo } = body

    if (!userId || !customerId)
      return Response.json({ error: 'userId y customerId requeridos' }, { status: 400 })

    let accessToken
    try { accessToken = await getToken(userId, customerId) }
    catch (e) { return Response.json({ error: e.message }, { status: 401 }) }

    // ── HISTÓRICO MODE ────────────────────────────────────────
    if (type === 'historico') {
      const fromStr = (monthFrom || dateFrom) + '-01'
      const toBase  = new Date((monthTo || dateTo) + '-01')
      toBase.setMonth(toBase.getMonth() + 1); toBase.setDate(0)
      const toStr = toBase.toISOString().slice(0, 10)

      const results = await runQuery(customerId, accessToken, `
        SELECT
          segments.date,
          campaign.id,
          campaign.name,
          campaign.advertising_channel_type,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions,
          metrics.conversion_value
        FROM campaign
        WHERE segments.date BETWEEN '${fromStr}' AND '${toStr}'
          AND campaign.status != 'REMOVED'
        ORDER BY segments.date ASC
      `)

      const byMonth = {}
      results.forEach(r => {
        const date  = g(r, 'segments.date') || ''
        const month = date.slice(0, 7)
        if (!month) return
        if (!byMonth[month]) byMonth[month] = { month, spend:0, clicks:0, impressions:0, conversions:0, convValue:0, byChannel:{}, bycamp:{} }
        const m     = parseM(r.metrics)
        byMonth[month].spend       += m.spend
        byMonth[month].clicks      += m.clicks
        byMonth[month].impressions += m.impressions
        byMonth[month].conversions += m.conversions
        byMonth[month].convValue   += m.convValue
        const ctype = g(r, 'campaign.advertisingChannelType', 'campaign.advertising_channel_type') || 'SEARCH'
        const cname = g(r, 'campaign.name') || '—'
        if (!byMonth[month].byChannel[ctype]) byMonth[month].byChannel[ctype] = { spend:0, conversions:0 }
        byMonth[month].byChannel[ctype].spend       += m.spend
        byMonth[month].byChannel[ctype].conversions += m.conversions
        if (!byMonth[month].bycamp[cname]) byMonth[month].bycamp[cname] = { name:cname, type:ctype, conversions:0, spend:0 }
        byMonth[month].bycamp[cname].conversions += m.conversions
        byMonth[month].bycamp[cname].spend       += m.spend
      })

      const monthly = Object.values(byMonth)
        .sort((a, b) => a.month.localeCompare(b.month))
        .map(m => ({
          month: m.month, spend: m.spend, clicks: m.clicks,
          impressions: m.impressions, conversions: m.conversions, convValue: m.convValue,
          ctr:  m.impressions > 0 ? m.clicks       / m.impressions * 100 : 0,
          cpc:  m.clicks      > 0 ? m.spend        / m.clicks            : 0,
          cpa:  m.conversions > 0 ? m.spend        / m.conversions       : 0,
          roas: m.spend       > 0 ? m.convValue    / m.spend             : 0,
          byChannel: m.byChannel,
          bestCampaign: Object.values(m.bycamp).sort((a, b) => b.conversions - a.conversions)[0] || null,
        }))

      const channelTypes = [...new Set(
        results.map(r => g(r, 'campaign.advertisingChannelType', 'campaign.advertising_channel_type') || 'SEARCH')
      )]

      return Response.json({ success: true, monthly, channelTypes })
    }

    // ── FULL DATA MODE ────────────────────────────────────────
    const [campR, dailyR, agR, adR, ageR, genderR, deviceR, geoR] = await Promise.all([
      runQuery(customerId, accessToken, `
        SELECT campaign.id, campaign.name, campaign.status,
          campaign.advertising_channel_type, campaign.bidding_strategy_type,
          metrics.impressions, metrics.clicks, metrics.cost_micros,
          metrics.conversions, metrics.conversion_value,
          metrics.ctr, metrics.average_cpc, metrics.average_cpm
        FROM campaign
        WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
          AND campaign.status != 'REMOVED'
        ORDER BY metrics.cost_micros DESC LIMIT 50
      `),
      runQuery(customerId, accessToken, `
        SELECT segments.date, metrics.impressions, metrics.clicks,
          metrics.cost_micros, metrics.conversions, metrics.conversion_value, metrics.ctr
        FROM campaign
        WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
          AND campaign.status != 'REMOVED'
        ORDER BY segments.date ASC
      `).catch(() => []),
      runQuery(customerId, accessToken, `
        SELECT ad_group.id, ad_group.name, ad_group.status, ad_group.type,
          campaign.id, campaign.name, campaign.advertising_channel_type,
          metrics.impressions, metrics.clicks, metrics.cost_micros,
          metrics.conversions, metrics.conversion_value,
          metrics.ctr, metrics.average_cpc, metrics.average_cpm
        FROM ad_group
        WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
          AND campaign.status != 'REMOVED' AND ad_group.status != 'REMOVED'
        ORDER BY metrics.cost_micros DESC LIMIT 50
      `).catch(() => []),
      runQuery(customerId, accessToken, `
        SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.ad.type,
          ad_group_ad.status, ad_group.id, ad_group.name,
          campaign.id, campaign.name, campaign.advertising_channel_type,
          metrics.impressions, metrics.clicks, metrics.cost_micros,
          metrics.conversions, metrics.conversion_value,
          metrics.ctr, metrics.average_cpc, metrics.average_cpm,
          metrics.video_views, metrics.video_quartile_p25_rate, metrics.video_quartile_p100_rate
        FROM ad_group_ad
        WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
          AND campaign.status != 'REMOVED' AND ad_group.status != 'REMOVED'
          AND ad_group_ad.status != 'REMOVED'
        ORDER BY metrics.cost_micros DESC LIMIT 50
      `).catch(() => []),
      runQuery(customerId, accessToken, `
        SELECT ad_group_criterion.age_range.type,
          metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
        FROM age_range_view
        WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
        ORDER BY metrics.impressions DESC
      `).catch(() => []),
      runQuery(customerId, accessToken, `
        SELECT ad_group_criterion.gender.type,
          metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
        FROM gender_view
        WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
        ORDER BY metrics.impressions DESC
      `).catch(() => []),
      runQuery(customerId, accessToken, `
        SELECT segments.device, metrics.impressions, metrics.clicks,
          metrics.cost_micros, metrics.conversions
        FROM campaign
        WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
          AND campaign.status != 'REMOVED'
        ORDER BY metrics.impressions DESC
      `).catch(() => []),
      runQuery(customerId, accessToken, `
        SELECT geographic_view.country_criterion_id, geographic_view.location_type,
          metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
        FROM geographic_view
        WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
        ORDER BY metrics.cost_micros DESC LIMIT 20
      `).catch(() => []),
    ])

    // Parse campaigns
    const campaigns = campR.map(r => {
      const camp = r.campaign || {}
      const ctype = g(camp, 'advertisingChannelType', 'advertising_channel_type') || 'SEARCH'
      return {
        id: camp.id, name: camp.name, status: camp.status,
        channelType: ctype, channelLabel: CHANNEL_LABELS[ctype] || ctype,
        biddingType: g(camp, 'biddingStrategyType', 'bidding_strategy_type'),
        ...parseM(r.metrics),
      }
    })

    // Aggregate daily data
    const dailyMap = {}
    dailyR.forEach(r => {
      const date = g(r, 'segments.date') || ''; if (!date) return
      if (!dailyMap[date]) dailyMap[date] = { date, spend:0, impressions:0, clicks:0, conversions:0, convValue:0 }
      const m = parseM(r.metrics)
      dailyMap[date].spend       += m.spend
      dailyMap[date].impressions += m.impressions
      dailyMap[date].clicks      += m.clicks
      dailyMap[date].conversions += m.conversions
      dailyMap[date].convValue   += m.convValue
    })
    const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date))

    // Parse ad groups
    const adGroups = agR.map(r => {
      const ag   = r.adGroup   || r.ad_group   || {}
      const camp = r.campaign  || {}
      const ctype = g(camp, 'advertisingChannelType', 'advertising_channel_type') || 'SEARCH'
      return {
        id: ag.id, name: ag.name || '—', status: ag.status, type: ag.type,
        campaignId: camp.id, campaignName: camp.name || '—',
        channelType: ctype, channelLabel: CHANNEL_LABELS[ctype] || ctype,
        ...parseM(r.metrics),
      }
    })

    // Parse ads
    const ads = adR.map((r, i) => {
      const ada  = r.adGroupAd || r.ad_group_ad || {}
      const ad   = ada.ad      || {}
      const ag   = r.adGroup   || r.ad_group   || {}
      const camp = r.campaign  || {}
      const ctype = g(camp, 'advertisingChannelType', 'advertising_channel_type') || 'SEARCH'
      const m    = parseM(r.metrics)
      const vid25  = parseFloat(g(r, 'metrics.videoQuartileP25Rate',  'metrics.video_quartile_p25_rate')  || 0)
      const vid100 = parseFloat(g(r, 'metrics.videoQuartileP100Rate', 'metrics.video_quartile_p100_rate') || 0)
      const vviews = parseInt(g(r, 'metrics.videoViews', 'metrics.video_views') || 0)
      return {
        id: ad.id || i, name: ad.name || `Anuncio ${i + 1}`, type: ad.type,
        status: ada.status,
        adGroupId: ag.id, adGroupName: ag.name || '—',
        campaignId: camp.id, campaignName: camp.name || '—',
        channelType: ctype, channelLabel: CHANNEL_LABELS[ctype] || ctype,
        videoViews: vviews, vid25: vid25*100, vid100: vid100*100,
        viewRate: m.impressions > 0 ? vviews / m.impressions * 100 : 0,
        ...m,
      }
    })

    // Demographics aggregation helpers
    function aggregateDemo(arr, keyFn, labelMap) {
      const map = {}
      arr.forEach(r => {
        const type = keyFn(r) || 'UNKNOWN'
        if (type === 'UNKNOWN' || type === 'UNDETERMINED' || type === 'AGE_RANGE_UNDETERMINED') return
        if (!map[type]) map[type] = { type, label: labelMap[type] || type, impressions:0, clicks:0, spend:0, conversions:0 }
        const m = parseM(r.metrics)
        map[type].impressions += m.impressions; map[type].clicks += m.clicks
        map[type].spend += m.spend; map[type].conversions += m.conversions
      })
      return Object.values(map).sort((a, b) => b.impressions - a.impressions)
    }

    const age    = aggregateDemo(ageR,    r => g(r, 'adGroupCriterion.ageRange.type',  'ad_group_criterion.age_range.type'),  AGE_LABELS)
    const gender = aggregateDemo(genderR, r => g(r, 'adGroupCriterion.gender.type',    'ad_group_criterion.gender.type'),     GENDER_LABELS)
    const device = aggregateDemo(deviceR, r => g(r, 'segments.device'),                                                       DEVICE_LABELS)

    const geoMap = {}
    geoR.forEach(r => {
      const id = String(g(r, 'geographicView.countryCriterionId', 'geographic_view.country_criterion_id') || '0')
      if (!geoMap[id]) geoMap[id] = { countryId:id, name: GEO_NAMES[id] || `País ID:${id}`, impressions:0, clicks:0, spend:0, conversions:0 }
      const m = parseM(r.metrics)
      geoMap[id].impressions += m.impressions; geoMap[id].clicks += m.clicks
      geoMap[id].spend += m.spend; geoMap[id].conversions += m.conversions
    })
    const geo = Object.values(geoMap).sort((a, b) => b.spend - a.spend).slice(0, 10)

    // Totals
    const totalSpend       = campaigns.reduce((s, c) => s + c.spend,       0)
    const totalConversions = campaigns.reduce((s, c) => s + c.conversions,  0)
    const totalConvValue   = campaigns.reduce((s, c) => s + c.convValue,    0)
    const totalClicks      = campaigns.reduce((s, c) => s + c.clicks,       0)
    const totalImpressions = campaigns.reduce((s, c) => s + c.impressions,  0)

    await supabase.from('google_ads_tokens_v2')
      .update({ last_synced: new Date().toISOString() })
      .eq('user_id', userId).eq('customer_id', customerId)

    return Response.json({
      success: true, campaigns, adGroups, ads, daily,
      demographics: { age, gender, device, geo },
      summary: {
        totalSpend, totalConversions, totalConvValue, totalClicks, totalImpressions,
        roas: totalSpend > 0 ? totalConvValue / totalSpend : 0,
        cpa:  totalConversions > 0 ? totalSpend / totalConversions : 0,
        ctr:  totalImpressions > 0 ? totalClicks / totalImpressions * 100 : 0,
        cpc:  totalClicks > 0 ? totalSpend / totalClicks : 0,
        cpm:  totalImpressions > 0 ? totalSpend / (totalImpressions / 1000) : 0,
      },
    })

  } catch (err) {
    console.error('[gads fetch]', err)
    return Response.json({ error: err.message || 'Error al obtener datos de Google Ads' }, { status: 500 })
  }
}

// Re-export for server-side usage
export async function fetchGoogleAdsData(userId, customerId, dateFrom, dateTo) {
  const res = await POST(new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ userId, customerId, dateFrom, dateTo }),
    headers: { 'Content-Type': 'application/json' },
  }))
  return res.json()
}
