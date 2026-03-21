cat > "app/dashboard/reportes/[accountId]/page.js" << 'ENDOFFILE'
'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { Line, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

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
  if (preset === 'yesterday') { const y = new Date(today); y.setDate(y.getDate()-1); return { since: fmt(y), until: fmt(y) } }
  if (preset === 'last_7d') { const f = new Date(today); f.setDate(f.getDate()-6); return { since: fmt(f), until: fmt(today) } }
  if (preset === 'last_30d') { const f = new Date(today); f.setDate(f.getDate()-29); return { since: fmt(f), until: fmt(today) } }
  if (preset === 'this_month') { const f = new Date(today.getFullYear(), today.getMonth(), 1); return { since: fmt(f), until: fmt(today) } }
  if (preset === 'last_month') { const f = new Date(today.getFullYear(), today.getMonth()-1, 1); const u = new Date(today.getFullYear(), today.getMonth(), 0); return { since: fmt(f), until: fmt(u) } }
}

const fmt$ = v => '$'+((+v)||0).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})
const fmtN = v => (+v||0)>=1e6?((+v/1e6).toFixed(1)+'M'):(+v||0)>=1e3?((+v/1e3).toFixed(1)+'K'):String(Math.round(+v||0))
const fmtP = v => ((+v)||0).toFixed(2)+'%'
const findAction = (actions, types) => { const m = (actions||[]).find(a => types.some(t => a.action_type?.includes(t))); return m ? parseFloat(m.value)||0 : 0 }

const getResults = (actions, objective) => {
  const obj = (objective||'').toLowerCase()
  if (obj.includes('message') || obj.includes('outcome_engagement') || obj.includes('engagement')) {
    return findAction(actions, ['onsite_conversion.messaging_conversation_started_7d']) || findAction(actions, ['onsite_conversion.total_messaging_connection'])
  }
  if (obj.includes('lead') || obj.includes('outcome_leads')) {
    return findAction(actions, ['lead','onsite_conversion.lead'])
  }
  if (obj.includes('purchase') || obj.includes('outcome_sales')) {
    return findAction(actions, ['purchase','offsite_conversion.fb_pixel_purchase'])
  }
  if (obj.includes('traffic') || obj.includes('outcome_traffic')) {
    return findAction(actions, ['link_click'])
  }
  return findAction(actions, ['onsite_conversion.messaging_conversation_started_7d','lead','purchase','link_click'])
}

const chartOpts = (dual=false) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#666', font: { family: 'Inter', size: 11 }, boxWidth: 10, padding: 16 } },
    tooltip: { backgroundColor: '#1a1a1e', borderColor: '#2a2a35', borderWidth: 1, titleColor: '#fff', bodyColor: '#888', padding: 12, cornerRadius: 8 }
  },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#444', font: { size: 10 }, maxRotation: 30 } },
    y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#444', font: { size: 10 } } },
    ...(dual ? { y1: { position: 'right', grid: { display: false }, ticks: { color: '#444', font: { size: 10 } } } } : {})
  }
})

const qualityScore = (row) => {
  if (!row) return 0
  let score = 0
  if (row.ctr >= 2) score += 30
  else if (row.ctr >= 1) score += 15
  if (row.frequency <= 2) score += 25
  else if (row.frequency <= 3.5) score += 12
  if (row.cpm <= 50) score += 25
  else if (row.cpm <= 100) score += 12
  if (row.results > 0) score += 20
  return Math.min(score, 100)
}

const qualityLabel = (s) => s >= 75 ? { label: 'Excelente', color: '#6ee7b7' } : s >= 50 ? { label: 'Bueno', color: '#fcd34d' } : { label: 'Mejorar', color: '#f87171' }

const MetricCard = ({l,v,sub,alert,pos}) => (
  <div style={{background:'#111116',border:`1px solid ${alert?'rgba(248,113,113,.25)':pos?'rgba(110,231,183,.2)':'#1a1a22'}`,borderRadius:'10px',padding:'16px'}}>
    <div style={{fontSize:'9px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'8px'}}>{l}</div>
    <div style={{fontSize:'22px',fontWeight:'800',color:alert?'#f87171':pos?'#6ee7b7':'#fff',marginBottom:'4px'}}>{v}</div>
    <div style={{fontSize:'10px',color:alert?'rgba(248,113,113,.6)':pos?'rgba(110,231,183,.6)':'#333',fontFamily:'monospace'}}>{sub}</div>
  </div>
)

const MiniMetric = ({l,v,alert,pos}) => (
  <div style={{background:'#0d0d12',borderRadius:'6px',padding:'8px 10px',border:`1px solid ${alert?'rgba(248,113,113,.15)':pos?'rgba(110,231,183,.1)':'transparent'}`}}>
    <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace',marginBottom:'3px'}}>{l}</div>
    <div style={{fontSize:'13px',fontWeight:'700',color:alert?'#f87171':pos?'#6ee7b7':'#fff'}}>{v}</div>
  </div>
)

export default function Reportes() {
  const { accountId } = useParams()
  const [token, setToken] = useState(null)
  const [preset, setPreset] = useState('this_month')
  const [overview, setOverview] = useState(null)
  const [daily, setDaily] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [adsets, setAdsets] = useState([])
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(false)
  const [accountName, setAccountName] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const reportRef = useRef(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      const { data: tokenRow } = await supabase.from('meta_tokens').select('access_token').eq('user_id', user.id).single()
      if (!tokenRow) { window.location.href = '/dashboard'; return }
      setToken(tokenRow.access_token)
      const { data: acc } = await supabase.from('ad_accounts').select('account_name').eq('account_id', accountId).single()
      if (acc) setAccountName(acc.account_name)
      else setAccountName(accountId)
    }
    init()
  }, [])

  useEffect(() => { if (token) fetchData() }, [token, preset])

  async function fetchData() {
    setLoading(true)
    setOverview(null); setDaily([]); setCampaigns([]); setAdsets([]); setAds([])
    try {
      const range = getDateRange(preset)
      const tr = JSON.stringify({ since: range.since, until: range.until })
      const base = `https://graph.facebook.com/v21.0/${accountId}/insights`
      const fields = 'spend,impressions,reach,frequency,clicks,cpc,cpm,ctr,actions,objective,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions'

      const [ovR, dailyR, campR, adsetR, adR] = await Promise.all([
        fetch(`${base}?fields=${fields}&time_range=${tr}&access_token=${token}`),
        fetch(`${base}?fields=${fields}&time_range=${tr}&time_increment=1&access_token=${token}&limit=90`),
        fetch(`${base}?fields=campaign_name,objective,${fields}&level=campaign&time_range=${tr}&limit=50&access_token=${token}`),
        fetch(`${base}?fields=adset_name,campaign_name,objective,${fields}&level=adset&time_range=${tr}&limit=50&access_token=${token}`),
        fetch(`${base}?fields=ad_name,adset_name,campaign_name,objective,${fields}&level=ad&time_range=${tr}&limit=50&access_token=${token}`)
      ])

      const [ovJ, dailyJ, campJ, adsetJ, adJ] = await Promise.all([ovR.json(), dailyR.json(), campR.json(), adsetR.json(), adR.json()])

      const parseRow = (d) => {
        const actions = d.actions || []
        const objective = d.objective || ''
        const results = getResults(actions, objective)
        const spend = parseFloat(d.spend) || 0
        return {
          spend, results,
          objective,
          impressions: parseFloat(d.impressions)||0,
          reach: parseFloat(d.reach)||0,
          frequency: parseFloat(d.frequency)||0,
          clicks: parseFloat(d.clicks)||0,
          cpc: parseFloat(d.cpc)||0,
          cpm: parseFloat(d.cpm)||0,
          ctr: parseFloat(d.ctr)||0,
          cpr: results>0?spend/results:0,
          comments: findAction(actions,['comment','post_comment']),
          shares: findAction(actions,['post','share']),
          reactions: findAction(actions,['post_reaction','like']),
          saves: findAction(actions,['onsite_conversion.post_save']),
          vid25: parseFloat(d.video_p25_watched_actions?.[0]?.value)||0,
          vid50: parseFloat(d.video_p50_watched_actions?.[0]?.value)||0,
          vid75: parseFloat(d.video_p75_watched_actions?.[0]?.value)||0,
          vid100: parseFloat(d.video_p100_watched_actions?.[0]?.value)||0,
        }
      }

      if (ovJ.data?.[0]) setOverview(parseRow(ovJ.data[0]))
      setDaily((dailyJ.data||[]).map(d => ({ date: d.date_start, ...parseRow(d) })))
      setCampaigns((campJ.data||[]).map(d => ({ name: d.campaign_name, ...parseRow(d) })))
      setAdsets((adsetJ.data||[]).map(d => ({ name: d.adset_name, campaign: d.campaign_name, ...parseRow(d) })))
      setAds((adJ.data||[]).map(d => ({ name: d.ad_name, adset: d.adset_name, campaign: d.campaign_name, ...parseRow(d) })))
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  async function exportPDF() {
    const el = reportRef.current
    if (!el) return
    try {
      const { default: html2canvas } = await import('html2canvas')
      const { default: jsPDF } = await import('jspdf')
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#0a0a0e', useCORS: true })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width/2, canvas.height/2] })
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width/2, canvas.height/2)
      pdf.save(`${accountName}-${preset}.pdf`)
    } catch(e) { console.error(e) }
  }

  const tabs = ['overview','campanas','conjuntos','anuncios']
  const tabLabels = { overview:'Overview', campanas:'Campanas', conjuntos:'Conjuntos', anuncios:'Anuncios' }

  const rowMetrics = (r) => [
    {l:'Resultados',v:fmtN(r.results),pos:r.results>0},
    {l:'C/Resultado',v:r.cpr>0?fmt$(r.cpr):'—'},
    {l:'Impresiones',v:fmtN(r.impressions)},
    {l:'Alcance',v:fmtN(r.reach)},
    {l:'CTR',v:fmtP(r.ctr),alert:r.ctr<1,pos:r.ctr>=2},
    {l:'CPC',v:fmt$(r.cpc)},
    {l:'CPM',v:fmt$(r.cpm)},
    {l:'Frecuencia',v:(+r.frequency).toFixed(2),alert:r.frequency>3.5,pos:r.frequency<=2},
    {l:'Reacciones',v:fmtN(r.reactions)},
    {l:'Comentarios',v:fmtN(r.comments)},
    {l:'Guardados',v:fmtN(r.saves)},
  ]

  const RowCard = ({name, sub, row}) => {
    const qs = qualityScore(row)
    const ql = qualityLabel(qs)
    return (
      <div style={{background:'#111116',border:'1px solid #1a1a22',borderRadius:'10px',padding:'16px 20px',marginBottom:'8px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px',flexWrap:'wrap',gap:'8px'}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:'#fff',fontSize:'13px',fontWeight:'700',marginBottom:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</div>
            {sub && <div style={{color:'#333',fontSize:'10px',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sub}</div>}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'12px',flexShrink:0}}>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:'9px',color:'#444',fontFamily:'monospace',marginBottom:'2px'}}>CALIDAD</div>
              <div style={{fontSize:'12px',fontWeight:'700',color:ql.color}}>{ql.label} {qs}/100</div>
            </div>
            <div style={{fontSize:'18px',fontWeight:'800',color:'#fff'}}>{fmt$(row.spend)}</div>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(88px,1fr))',gap:'6px'}}>
          {rowMetrics(row).map(m => <MiniMetric key={m.l} {...m}/>)}
        </div>
      </div>
    )
  }

  return (
    <main style={{minHeight:'100vh',background:'#0a0a0e',fontFamily:'Inter,sans-serif'}}>
      <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px',height:'56px',background:'rgba(10,10,14,.97)',borderBottom:'1px solid #1a1a22',position:'sticky',top:0,zIndex:100,gap:'8px',flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <button onClick={()=>window.location.href='/dashboard'} style={{background:'transparent',border:'none',color:'#555',cursor:'pointer',fontSize:'18px'}}>←</button>
          <span style={{fontSize:'16px'}}>📊</span>
          <span style={{color:'#fff',fontWeight:'700',fontSize:'14px'}}>{accountName}</span>
        </div>
        <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
          {PRESETS.map(p => (
            <button key={p.value} onClick={()=>setPreset(p.value)} style={{padding:'5px 10px',borderRadius:'6px',border:'1px solid',fontSize:'11px',cursor:'pointer',fontFamily:'monospace',borderColor:preset===p.value?'#fff':'#222',background:preset===p.value?'#fff':'transparent',color:preset===p.value?'#0a0a0e':'#555',fontWeight:preset===p.value?'700':'400'}}>
              {p.label}
            </button>
          ))}
        </div>
        <button onClick={exportPDF} style={{padding:'6px 14px',borderRadius:'6px',border:'1px solid #2a2a35',background:'transparent',color:'#888',fontSize:'11px',cursor:'pointer',fontFamily:'monospace'}}>
          ↓ PDF
        </button>
      </header>

      <div style={{borderBottom:'1px solid #1a1a22',display:'flex',padding:'0 24px',background:'rgba(10,10,14,.97)'}}>
        {tabs.map(t => (
          <button key={t} onClick={()=>setActiveTab(t)} style={{padding:'12px 16px',fontSize:'11px',fontFamily:'monospace',cursor:'pointer',color:activeTab===t?'#fff':'#444',borderBottom:activeTab===t?'1.5px solid #fff':'1.5px solid transparent',background:'transparent',border:'none',borderBottom:activeTab===t?'1.5px solid #fff':'1.5px solid transparent',textTransform:'uppercase',letterSpacing:'.07em'}}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {loading && <div style={{textAlign:'center',padding:'80px 0',color:'#444',fontFamily:'monospace',fontSize:'12px'}}>Cargando datos de Meta...</div>}

      {!loading && (
        <div ref={reportRef} style={{padding:'24px',maxWidth:'1400px',margin:'0 auto'}}>

          {activeTab==='overview' && overview && (
            <>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'10px',marginBottom:'24px'}}>
                <MetricCard l='Importe gastado' v={fmt$(overview.spend)} sub='total ejecutado'/>
                <MetricCard l='Resultados' v={fmtN(overview.results)} sub='conversiones' pos={overview.results>0}/>
                <MetricCard l='Costo/resultado' v={overview.cpr>0?fmt$(overview.cpr):'—'} sub='eficiencia'/>
                <MetricCard l='Impresiones' v={fmtN(overview.impressions)} sub='total'/>
                <MetricCard l='Alcance' v={fmtN(overview.reach)} sub='personas unicas'/>
                <MetricCard l='Frecuencia' v={(+overview.frequency).toFixed(2)} sub={overview.frequency<=2?'Optima':overview.frequency<=3.5?'Revisar':'Fatiga'} alert={overview.frequency>3.5} pos={overview.frequency<=2}/>
                <MetricCard l='CTR' v={fmtP(overview.ctr)} sub={overview.ctr>=2?'Excelente':overview.ctr>=1?'Bueno':'Bajo'} alert={overview.ctr<1} pos={overview.ctr>=2}/>
                <MetricCard l='CPC' v={fmt$(overview.cpc)} sub='por clic'/>
                <MetricCard l='CPM' v={fmt$(overview.cpm)} sub='por mil imp'/>
                <MetricCard l='Clics' v={fmtN(overview.clicks)} sub='trafico'/>
                <MetricCard l='Reacciones' v={fmtN(overview.reactions)} sub='likes'/>
                <MetricCard l='Guardados' v={fmtN(overview.saves)} sub='post saves'/>
              </div>

              {daily.length > 1 && (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'24px'}}>
                  <div style={{background:'#111116',border:'1px solid #1a1a22',borderRadius:'10px',padding:'20px'}}>
                    <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'16px'}}>Spend vs Resultados por dia</div>
                    <div style={{height:'200px'}}>
                      <Line data={{
                        labels: daily.map(d=>d.date.slice(5)),
                        datasets: [
                          {label:'Gastado ($)',data:daily.map(d=>+d.spend.toFixed(2)),borderColor:'#f97316',backgroundColor:'rgba(249,115,22,.08)',fill:true,tension:.4,yAxisID:'y',pointRadius:2,borderWidth:2},
                          {label:'Resultados',data:daily.map(d=>d.results),borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,.08)',fill:true,tension:.4,yAxisID:'y1',pointRadius:2,borderWidth:2}
                        ]
                      }} options={chartOpts(true)}/>
                    </div>
                  </div>
                  <div style={{background:'#111116',border:'1px solid #1a1a22',borderRadius:'10px',padding:'20px'}}>
                    <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'16px'}}>CTR y CPM por dia</div>
                    <div style={{height:'200px'}}>
                      <Line data={{
                        labels: daily.map(d=>d.date.slice(5)),
                        datasets: [
                          {label:'CTR %',data:daily.map(d=>+d.ctr.toFixed(2)),borderColor:'#6ee7b7',backgroundColor:'rgba(110,231,183,.06)',fill:true,tension:.4,yAxisID:'y',pointRadius:2,borderWidth:2},
                          {label:'CPM $',data:daily.map(d=>+d.cpm.toFixed(2)),borderColor:'#fcd34d',backgroundColor:'rgba(252,211,77,.06)',fill:true,tension:.4,yAxisID:'y1',pointRadius:2,borderWidth:2}
                        ]
                      }} options={chartOpts(true)}/>
                    </div>
                  </div>
                </div>
              )}

              {(overview.vid25>0||overview.vid50>0) && (
                <div style={{background:'#111116',border:'1px solid #1a1a22',borderRadius:'10px',padding:'20px',marginBottom:'24px'}}>
                  <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'16px'}}>Embudo de video</div>
                  <div style={{display:'flex',gap:'8px',alignItems:'flex-end',height:'140px',paddingBottom:'24px'}}>
                    {[
                      {l:'25%',v:overview.vid25,color:'#6ee7b7'},
                      {l:'50%',v:overview.vid50,color:'#3b82f6'},
                      {l:'75%',v:overview.vid75,color:'#f97316'},
                      {l:'100%',v:overview.vid100,color:'#f87171'},
                    ].map((b,i,arr) => {
                      const max = arr[0].v||1
                      const pct = Math.round(b.v/max*100)
                      return (
                        <div key={b.l} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
                          <div style={{fontSize:'11px',color:'#fff',fontWeight:'700'}}>{fmtN(b.v)}</div>
                          <div style={{width:'100%',height:`${Math.max(pct*.8,4)}px`,background:b.color,borderRadius:'4px 4px 0 0',opacity:.8}}></div>
                          <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace'}}>{b.l}</div>
                          <div style={{fontSize:'10px',color:b.color,fontFamily:'monospace',fontWeight:'700'}}>{pct}%</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab==='campanas' && (
            <>
              {campaigns.length > 1 && (
                <div style={{background:'#111116',border:'1px solid #1a1a22',borderRadius:'10px',padding:'20px',marginBottom:'16px'}}>
                  <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'16px'}}>CTR por campana</div>
                  <div style={{height:'180px'}}>
                    <Bar data={{
                      labels: campaigns.map(c=>c.name.length>20?c.name.slice(0,20)+'...':c.name),
                      datasets: [{label:'CTR %',data:campaigns.map(c=>+c.ctr.toFixed(2)),backgroundColor:'rgba(110,231,183,.5)',borderColor:'#6ee7b7',borderWidth:1,borderRadius:4}]
                    }} options={chartOpts()}/>
                  </div>
                </div>
              )}
              {campaigns.map((c,i) => <RowCard key={i} name={c.name} sub={c.objective} row={c}/>)}
              {campaigns.length===0 && <div style={{textAlign:'center',padding:'60px 0',color:'#444',fontFamily:'monospace'}}>Sin datos para este periodo</div>}
            </>
          )}

          {activeTab==='conjuntos' && (
            <>
              {adsets.map((a,i) => <RowCard key={i} name={a.name} sub={a.campaign} row={a}/>)}
              {adsets.length===0 && <div style={{textAlign:'center',padding:'60px 0',color:'#444',fontFamily:'monospace'}}>Sin datos para este periodo</div>}
            </>
          )}

          {activeTab==='anuncios' && (
            <>
              {ads.map((a,i) => <RowCard key={i} name={a.name} sub={`${a.adset} · ${a.campaign}`} row={a}/>)}
              {ads.length===0 && <div style={{textAlign:'center',padding:'60px 0',color:'#444',fontFamily:'monospace'}}>Sin datos para este periodo</div>}
            </>
          )}

        </div>
      )}
    </main>
  )
}
ENDOFFILE