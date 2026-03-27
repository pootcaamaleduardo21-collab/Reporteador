// lib/googleAds.js
export async function getGoogleAdsToken(userId) {
  const response = await fetch('/api/google-ads/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  })
  const data = await response.json()
  return data.access_token
}

export async function fetchGoogleAdsCampaigns(accessToken, customerId, dateRange) {
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.cost_micros,
      metrics.conversions,
      metrics.clicks,
      metrics.impressions,
      metrics.average_cpc,
      metrics.ctr,
      metrics.cpm
    FROM campaign
    WHERE segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'
    ORDER BY metrics.cost_micros DESC
    LIMIT 50
  `
  
  const response = await fetch(
    `https://googleads.googleapis.com/v15/customers/${customerId.replace('-', '')}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'developer-token': process.env.NEXT_PUBLIC_GOOGLE_DEVELOPER_TOKEN
      },
      body: JSON.stringify({ query })
    }
  )
  
  if (!response.ok) {
    throw new Error(`Google Ads API error: ${response.status}`)
  }
  
  return response.json()
}