'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

const PRESETS = [
  { label: 'Hoy', value: 'today' },
  { label: 'Ayer', value: 'yesterday' },
  { label: '7 dias', value: 'last_7d' },
  { label: '30 dias', value: 'last_30d' },
  { label: 'Este mes', value: 'this_month' },
  { label: 'Mes pasado', value: 'last_month' },
]

function getDateRange(preset) {
  const today = new Date()
  const fmt = d => d.toISOString().split('T')[0]
  if (preset === 'today') return { since: fmt(today), until: fmt(today) }
  if (preset === 'yesterday') {
    const y = new Date(today); y.setDate(y.getDate()-1)
    return { since: fmt(y), until: fmt(y) }
  }
  if (preset === 'last_7d') {
    const f = new Date(today); f.setDate(f.getDate()-6)
    return { since: fmt(f), until: fmt(today) }
  }
  if (preset === 'last_30d') {
    const f = new Date(today); f.setDate(f.getDate()-29)
    return { since: fmt(f), until: fmt(today) }
  }
  if (preset === 'this_month') {
    const f = new Date(today.getFullYear(), today.getMonth(), 1)
    return { since: fmt(f), until: fmt(today) }
  }
  if (preset === 'last_month') {
    const f = new Date(today.getFullYear(), today.getMonth()-1, 1)
    const u = new Date(today.getFullYear(), today.getMonth(), 0)
    return { since: fmt(f), until: fmt(u) }
  }
}

function fmt$(v) { return '$'+((+v)||0).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2}) }
function fmtN(v) { return (+v||0)>=1e6?((+v/1e6).toFixed(1)+'M'):(+v||0)>=1e3?((+v/1e3).toFixed(1)+'K'):String(Math.round(+v||0)) }
function fmtP(v) { return ((+v)||0).toFixed(2)+'%' }

export default function Reportes() {
  const { accountId } = useParams()
  const [token, setToken] = useState(null)
  const [preset, setPreset] = useState('this_month')
  const [data, setData] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [accountName, setAccountName] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      const { data: tokenRow } = await supabase.from('meta_tokens').select('access_token').eq('user_id', user.id).single()
      if (!tokenRow) { window.location.href = '/dashboard'; return }
      setToken(tokenRow.access_token)
      const { data: acc } = await supabase.from('ad_accounts').select('account_name').eq('account_id', accountId).single()
      if (acc) setAccountName(acc.account_name)
    }
    init()
  }, [])

  useEffect(() => {
    if (token) fetchData()
  }, [token, preset])

  async function fetchData() {
    setLoading(true)
    setData(null)
    setCampaigns([])
    try {
      const range = getDateRange(preset)
      const fields = 'spend,impressions,reach,frequency,clicks,cpc,cpm,ctr,actions,cost_per_action_type,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions'
      
      const [overviewRes, campRes] = await Promise.all([
        fetch(`https://graph.facebook.com/v21.0/${accountId}/insights?fields=${fields}&time_range={"since":"${range.since}","until":"${range.until}"}&access_token=${token}`),
        fetch(`https://graph.facebook.com/v21.0/${accountId}/insights?fields=campaign_name,objective,${fields}&level=campaign&time_range={"since":"${range.since}","until":"${range.until}"}&limit=50&access_token=${token}`)
      ])

      const overviewJson = await overviewRes.json()
      const campJson = await campRes.json()

      const d = overviewJson.data?.[0] || {}
      const findAction = (actions, types) => {
        const match = (actions||[]).find(a => types.some(t => a.action_type?.includes(t)))
        return match ? parseFloat(match.value) || 0 : 0
      }
      const actions = d.actions || []
      const results = findAction(actions, ['lead','purchase','onsite_conversion.messaging_conversation_started_7d','link_click']) || parseFloat(d.clicks) || 0
      const spend = parseFloat(d.spend) || 0

      setData({
        spend,
        impressions: parseFloat(d.impressions) || 0,
        reach: parseFloat(d.reach) || 0,
        frequency: parseFloat(d.frequency) || 0,
        clicks: parseFloat(d.clicks) || 0,
        cpc: parseFloat(d.cpc) || 0,
        cpm: parseFloat(d.cpm) || 0,
        ctr: parseFloat(d.ctr) || 0,
        results,
        cpr: results > 0 ? spend/results : 0,
        comments: findAction(actions, ['comment','post_comment']),
        shares: findAction(actions, ['post','share']),
        reactions: findAction(actions, ['post_reaction','like']),
      })

      setCampaigns((campJson.data || []).map(c => {
        const ca = c.actions || []
        const r = findAction(ca, ['lead','purchase','onsite_conversion.messaging_conversation_started_7d','link_click']) || parseFloat(c.clicks) || 0
        const s = parseFloat(c.spend) || 0
        return {
          name: c.campaign_name,
          objective: c.objective,
          spend: s,
          impressions: parseFloat(c.impressions) || 0,
          reach: parseFloat(c.reach) || 0,
          clicks: parseFloat(c.clicks) || 0,
          ctr: parseFloat(c.ctr) || 0,
          cpm: parseFloat(c.cpm) || 0,
          cpc: parseFloat(c.cpc) || 0,
          results: r,
          cpr: r > 0 ? s/r : 0,
          frequency: parseFloat(c.frequency) || 0,
        }
      }))
    } catch(e) {
      console.error(e)
    }
    setLoading(false)
  }

  const kpis = data ? [
    { label: 'Importe gastado', value: fmt$(data.spend), sub: 'presupuesto ejecutado', color: '#fff' },
    { label: 'Resultados', value: fmtN(data.results), sub: 'conversiones / eventos' },
    { label: 'Costo por resultado', value: data.cpr > 0 ? fmt$(data.cpr) : '—', sub: 'eficiencia' },
    { label: 'Impresiones', value: fmtN(data.impressions), sub: 'total' },
    { label: 'Alcance', value: fmtN(data.reach), sub: 'personas unicas' },
    { label: 'Frecuencia', value: (+data.frequency).toFixed(2), sub: data.frequency <= 2 ? 'Optima' : data.frequency <= 3.5 ? 'Revisar' : 'Fatiga detectada', alert: data.frequency > 3.5 },
    { label: 'CTR', value: fmtP(data.ctr), sub: data.ctr > 2 ? 'Buen rendimiento' : data.ctr > 1 ? 'Mejorable' : 'Bajo', alert: data.ctr < 1 },
    { label: 'CPC', value: fmt$(data.cpc), sub: 'costo por clic' },
    { label: 'CPM', value: fmt$(data.cpm), sub: 'por mil impresiones' },
    { label: 'Clics', value: fmtN(data.clicks), sub: 'trafico generado' },
    { label: 'Reacciones', value: fmtN(data.reactions), sub: 'likes y reacciones' },
    { label: 'Comentarios', value: fmtN(data
cat > "app/dashboard/reportes/[accountId]/page.js" << 'ENDOFFILE'
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

const PRESETS = [
  { label: 'Hoy', value: 'today' },
  { label: 'Ayer', value: 'yesterday' },
  { label: '7 dias', value: 'last_7d' },
  { label: '30 dias', value: 'last_30d' },
  { label: 'Este mes', value: 'this_month' },
  { label: 'Mes pasado', value: 'last_month' },
]

function getDateRange(preset) {
  const today = new Date()
  const fmt = d => d.toISOString().split('T')[0]
  if (preset === 'today') return { since: fmt(today), until: fmt(today) }
  if (preset === 'yesterday') {
    const y = new Date(today); y.setDate(y.getDate()-1)
    return { since: fmt(y), until: fmt(y) }
  }
  if (preset === 'last_7d') {
    const f = new Date(today); f.setDate(f.getDate()-6)
    return { since: fmt(f), until: fmt(today) }
  }
  if (preset === 'last_30d') {
    const f = new Date(today); f.setDate(f.getDate()-29)
    return { since: fmt(f), until: fmt(today) }
  }
  if (preset === 'this_month') {
    const f = new Date(today.getFullYear(), today.getMonth(), 1)
    return { since: fmt(f), until: fmt(today) }
  }
  if (preset === 'last_month') {
    const f = new Date(today.getFullYear(), today.getMonth()-1, 1)
    const u = new Date(today.getFullYear(), today.getMonth(), 0)
    return { since: fmt(f), until: fmt(u) }
  }
}

function fmt$(v) { return '$'+((+v)||0).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2}) }
function fmtN(v) { return (+v||0)>=1e6?((+v/1e6).toFixed(1)+'M'):(+v||0)>=1e3?((+v/1e3).toFixed(1)+'K'):String(Math.round(+v||0)) }
function fmtP(v) { return ((+v)||0).toFixed(2)+'%' }

export default function Reportes() {
  const { accountId } = useParams()
  const [token, setToken] = useState(null)
  const [preset, setPreset] = useState('this_month')
  const [data, setData] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [accountName, setAccountName] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      const { data: tokenRow } = await supabase.from('meta_tokens').select('access_token').eq('user_id', user.id).single()
      if (!tokenRow) { window.location.href = '/dashboard'; return }
      setToken(tokenRow.access_token)
      const { data: acc } = await supabase.from('ad_accounts').select('account_name').eq('account_id', accountId).single()
      if (acc) setAccountName(acc.account_name)
    }
    init()
  }, [])

  useEffect(() => {
    if (token) fetchData()
  }, [token, preset])

  async function fetchData() {
    setLoading(true)
    setData(null)
    setCampaigns([])
    try {
      const range = getDateRange(preset)
      const fields = 'spend,impressions,reach,frequency,clicks,cpc,cpm,ctr,actions,cost_per_action_type,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions'
      
      const [overviewRes, campRes] = await Promise.all([
        fetch(`https://graph.facebook.com/v21.0/${accountId}/insights?fields=${fields}&time_range={"since":"${range.since}","until":"${range.until}"}&access_token=${token}`),
        fetch(`https://graph.facebook.com/v21.0/${accountId}/insights?fields=campaign_name,objective,${fields}&level=campaign&time_range={"since":"${range.since}","until":"${range.until}"}&limit=50&access_token=${token}`)
      ])

      const overviewJson = await overviewRes.json()
      const campJson = await campRes.json()

      const d = overviewJson.data?.[0] || {}
      const findAction = (actions, types) => {
        const match = (actions||[]).find(a => types.some(t => a.action_type?.includes(t)))
        return match ? parseFloat(match.value) || 0 : 0
      }
      const actions = d.actions || []
      const results = findAction(actions, ['lead','purchase','onsite_conversion.messaging_conversation_started_7d','link_click']) || parseFloat(d.clicks) || 0
      const spend = parseFloat(d.spend) || 0

      setData({
        spend,
        impressions: parseFloat(d.impressions) || 0,
        reach: parseFloat(d.reach) || 0,
        frequency: parseFloat(d.frequency) || 0,
        clicks: parseFloat(d.clicks) || 0,
        cpc: parseFloat(d.cpc) || 0,
        cpm: parseFloat(d.cpm) || 0,
        ctr: parseFloat(d.ctr) || 0,
        results,
        cpr: results > 0 ? spend/results : 0,
        comments: findAction(actions, ['comment','post_comment']),
        shares: findAction(actions, ['post','share']),
        reactions: findAction(actions, ['post_reaction','like']),
      })

      setCampaigns((campJson.data || []).map(c => {
        const ca = c.actions || []
        const r = findAction(ca, ['lead','purchase','onsite_conversion.messaging_conversation_started_7d','link_click']) || parseFloat(c.clicks) || 0
        const s = parseFloat(c.spend) || 0
        return {
          name: c.campaign_name,
          objective: c.objective,
          spend: s,
          impressions: parseFloat(c.impressions) || 0,
          reach: parseFloat(c.reach) || 0,
          clicks: parseFloat(c.clicks) || 0,
          ctr: parseFloat(c.ctr) || 0,
          cpm: parseFloat(c.cpm) || 0,
          cpc: parseFloat(c.cpc) || 0,
          results: r,
          cpr: r > 0 ? s/r : 0,
          frequency: parseFloat(c.frequency) || 0,
        }
      }))
    } catch(e) {
      console.error(e)
    }
    setLoading(false)
  }

  const kpis = data ? [
    { label: 'Importe gastado', value: fmt$(data.spend), sub: 'presupuesto ejecutado', color: '#fff' },
    { label: 'Resultados', value: fmtN(data.results), sub: 'conversiones / eventos' },
    { label: 'Costo por resultado', value: data.cpr > 0 ? fmt$(data.cpr) : '—', sub: 'eficiencia' },
    { label: 'Impresiones', value: fmtN(data.impressions), sub: 'total' },
    { label: 'Alcance', value: fmtN(data.reach), sub: 'personas unicas' },
    { label: 'Frecuencia', value: (+data.frequency).toFixed(2), sub: data.frequency <= 2 ? 'Optima' : data.frequency <= 3.5 ? 'Revisar' : 'Fatiga detectada', alert: data.frequency > 3.5 },
    { label: 'CTR', value: fmtP(data.ctr), sub: data.ctr > 2 ? 'Buen rendimiento' : data.ctr > 1 ? 'Mejorable' : 'Bajo', alert: data.ctr < 1 },
    { label: 'CPC', value: fmt$(data.cpc), sub: 'costo por clic' },
    { label: 'CPM', value: fmt$(data.cpm), sub: 'por mil impresiones' },
    { label: 'Clics', value: fmtN(data.clicks), sub: 'trafico generado' },
    { label: 'Reacciones', value: fmtN(data.reactions), sub: 'likes y reacciones' },
    { label: 'Comentarios', value: fmtN(data.comments), sub: 'interacciones' },
  ] : []

  return (
    <main style={{minHeight:'100vh',background:'#0a0a0e',fontFamily:'Inter,sans-serif'}}>
      <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 36px',height:'60px',background:'rgba(10,10,14,.97)',borderBottom:'1px solid #2a2a35',position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <button onClick={()=>window.location.href='/dashboard'} style={{background:'transparent',border:'none',color:'#666',cursor:'pointer',fontSize:'20px',padding:'0'}}>←</button>
          <span style={{fontSize:'18px'}}>📊</span>
          <span style={{color:'#fff',fontWeight:'800',fontSize:'15px'}}>{accountName || accountId}</span>
        </div>
        <div style={{display:'flex',gap:'6px'}}>
          {PRESETS.map(p => (
            <button key={p.value} onClick={()=>setPreset(p.value)}
              style={{padding:'6px 12px',borderRadius:'6px',border:'1px solid',fontSize:'11px',cursor:'pointer',fontFamily:'monospace',
                borderColor: preset===p.value ? '#fff' : '#2a2a35',
                background: preset===p.value ? '#fff' : 'transparent',
                color: preset===p.value ? '#0a0a0e' : '#666',
                fontWeight: preset===p.value ? '700' : '400'
              }}>
              {p.label}
            </button>
          ))}
        </div>
      </header>

      <div style={{padding:'32px 36px',maxWidth:'1400px',margin:'0 auto'}}>
        {loading && (
          <div style={{textAlign:'center',padding:'80px 0',color:'#666',fontFamily:'monospace'}}>Cargando datos de Meta...</div>
        )}

        {!loading && data && (
          <>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:'12px',marginBottom:'32px'}}>
              {kpis.map(k => (
                <div key={k.label} style={{background:'#111116',border:`1px solid ${k.alert?'rgba(248,113,113,.3)':'#2a2a35'}`,borderRadius:'12px',padding:'20px'}}>
                  <div style={{fontSize:'10px',color:'#666',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'10px'}}>{k.label}</div>
                  <div style={{fontSize:'24px',fontWeight:'800',color:k.alert?'#f87171':k.color||'#fff',marginBottom:'6px'}}>{k.value}</div>
                  <div style={{fontSize:'11px',color:k.alert?'#f87171':'#444',fontFamily:'monospace'}}>{k.sub}</div>
                </div>
              ))}
            </div>

            <div style={{marginBottom:'12px',display:'flex',alignItems:'center',gap:'12px'}}>
              <span style={{fontSize:'10px',color:'#666',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.07em'}}>Campanas</span>
              <div style={{flex:1,height:'1px',background:'#2a2a35'}}></div>
              <span style={{fontSize:'10px',color:'#444',fontFamily:'monospace'}}>{campaigns.length} campanas</span>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {campaigns.map((c,i) => (
                <div key={i} style={{background:'#111116',border:'1px solid #2a2a35',borderRadius:'12px',padding:'16px 20px'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
                    <div>
                      <div style={{color:'#fff',fontSize:'13px',fontWeight:'700',marginBottom:'3px'}}>{c.name}</div>
                      <div style={{color:'#444',fontSize:'10px',fontFamily:'monospace'}}>{c.objective}</div>
                    </div>
                    <div style={{fontSize:'18px',fontWeight:'800',color:'#fff'}}>{fmt$(c.spend)}</div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))',gap:'8px'}}>
                    {[
                      {l:'Resultados',v:fmtN(c.results)},
                      {l:'C/Resultado',v:c.cpr>0?fmt$(c.cpr):'—'},
                      {l:'Impresiones',v:fmtN(c.impressions)},
                      {l:'Alcance',v:fmtN(c.reach)},
                      {l:'CTR',v:fmtP(c.ctr)},
                      {l:'CPC',v:fmt$(c.cpc)},
                      {l:'CPM',v:fmt$(c.cpm)},
                      {l:'Frecuencia',v:(+c.frequency).toFixed(2)},
                    ].map(m => (
                      <div key={m.l} style={{background:'#18181f',borderRadius:'8px',padding:'10px 12px'}}>
                        <div style={{fontSize:'9px',color:'#444',fontFamily:'monospace',marginBottom:'4px'}}>{m.l}</div>
                        <div style={{fontSize:'14px',fontWeight:'700',color:'#fff'}}>{m.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && !data && (
          <div style={{textAlign:'center',padding:'80px 0'}}>
            <div style={{fontSize:'48px',marginBottom:'16px'}}>📭</div>
            <p style={{color:'#666',fontFamily:'monospace'}}>No hay datos para este periodo</p>
          </div>
        )}
      </div>
    </main>
  )
}
