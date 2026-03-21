'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler)

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
      const fields = 'spend,impressions,reach,frequency,clicks,cpc,cpm,ctr,actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions'

      const [ovR, dailyR, campR, adsetR, adR] = await Promise.all([
        fetch(`${base}?fields=${fields}&time_range=${tr}&access_token=${token}`),
        fetch(`${base}?fields=${fields}&time_range=${tr}&time_increment=1&access_token=${token}&limit=90`),
        fetch(`${base}?fields=campaign_name,objective,${fields}&level=campaign&time_range=${tr}&limit=50&access_token=${token}`),
        fetch(`${base}?fields=adset_name,campaign_name,${fields}&level=adset&time_range=${tr}&limit=50&access_token=${token}`),
        fetch(`${base}?fields=ad_name,adset_name,campaign_name,${fields}&level=ad&time_range=${tr}&limit=50&access_token=${token}`)
      ])

      const [ovJ, dailyJ, campJ, adsetJ, adJ] = await Promise.all([ovR.json(), dailyR.json(), campR.json(), adsetR.json(), adR.json()])

      const parseRow = (d) => {
        const actions = d.actions || []
        const results = findAction(actions, ['lead','purchase','onsite_conversion.messaging_conversation_started_7d','link_click']) || parseFloat(d.clicks) || 0
        const spend = parseFloat(d.spend) || 0
        return {
          spend, results,
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
          vid25: parseFloat(d.video_p25_watched_actions?.[0]?.value)||0,
          vid50: parseFloat(d.video_p50_watched_actions?.[0]?.value)||0,
          vid75: parseFloat(d.video_p75_watched_actions?.[0]?.value)||0,
          vid100: parseFloat(d.video_p100_watched_actions?.[0]?.value)||0,
        }
      }

      if (ovJ.data?.[0]) setOverview(parseRow(ovJ.data[0]))
      setDaily((dailyJ.data||[]).map(d => ({ date: d.date_start, ...parseRow(d) })))
      setCampaigns((campJ.data||[]).map(d => ({ name: d.campaign_name, objective: d.objective, ...parseRow(d) })))
      setAdsets((adsetJ.data||[]).map(d => ({ name: d.adset_name, campaign: d.campaign_name, ...parseRow(d) })))
      setAds((adJ.data||[]).map(d => ({ name: d.ad_name, adset: d.adset_name, campaign: d.campaign_name, ...parseRow(d) })))
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  async function exportPDF() {
    const el = reportRef.current
    if (!el) return
    const { default: html2canvas } = await import('html2canvas')
    const { default: jsPDF } = await import('jspdf')
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#0a0a0e', useCORS: true })
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width/2, canvas.height/2] })
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width/2, canvas.height/2)
    pdf.save(`${accountName}-${preset}.pdf`)
  }

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

  const tabs = ['overview', 'campanas', 'conjuntos', 'anuncios']
  const tabLabels = { overview: 'Overview', campanas: 'Campanas', conjuntos: 'Conjuntos', anuncios: 'Anuncios' }

  return (
    <main style={{minHeight:'100vh',background:'#0a0a0e',fontFamily:'Inter,sans-serif'}}>
      <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px',height:'56px',background:'rgba(10,10,14,.97)',borderBottom:'1px solid #1a1a22',position:'sticky',top:0,zIndex:100,flexWrap:'wrap',gap:'8px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <button onClick={()=>window.location.href='/dashboard'} style={{background:'transparent',border:'none',color:'#555',cursor:'pointer',fontSize:'18px'}}>←</button>
          <span style={{fontSize:'16px'}}>📊</span>
          <span style={{color:'#fff',fontWeight:'700',fontSize:'14px'}}>{accountName}</span>
        </div>
        <div style={{display:'flex',gap:'4px'}}>
          {PRESETS.map(p => (
            <button key={p.value} onClick={()=>setPreset(p.value)} style={{padding:'5px 10px',borderRadius:'6px',border:'1px solid',fontSize:'11px',cursor:'pointer',fontFamily:'monospace',borderColor:preset===p.value?'#fff':'#222',background:preset===p.value?'#fff':'transparent',color:preset===p.value?'#0a0a0e':'#555',fontWeight:preset===p.value?'700':'400'}}>
              {p.label}
            </button>
          ))}
        </div>
        <button onClick={exportPDF} style={{padding:'6px 14px',borderRadius:'6px',border:'1px solid #2a2a35',background:'transparent',color:'#888',fontSize:'11px',cursor:'pointer',fontFamily:'monospace',display:'flex',alignItems:'center',gap:'6px'}}>
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

      {loading && <div style={{textAlign:'center',padding:'80px 0',color:'#444',fontFamily:'monospace',fontSize:'12px'}}>Cargando datos...</div>}

      {!loading && (
        <div ref={reportRef} style={{padding:'24px',maxWidth:'1400px',margin:'0 auto'}}>

          {activeTab === 'overview' && overview && (
            <>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'10px',marginBottom:'24px'}}>
                {[
                  {l:'Importe gastado',v:fmt$(overview.spend),sub:'total ejecutado'},
                  {l:'Resultados',v:fmtN(overview.results),sub:'conversiones'},
                  {l:'Costo/resultado',v:overview.cpr>0?fmt$(overview.cpr):'—',sub:'eficiencia'},
                  {l:'Impresiones',v:fmtN(overview.impressions),sub:'total'},
                  {l:'Alcance',v:fmtN(overview.reach),sub:'personas unicas'},
                  {l:'Frecuencia',v:(+overview.frequency).toFixed(2),sub:overview.frequency<=2?'Optima':overview.frequency<=3.5?'Revisar':'Fatiga',alert:overview.frequency>3.5,pos:overview.frequency<=2},
                  {l:'CTR',v:fmtP(overview.ctr),sub:overview.ctr>=2?'Excelente':overview.ctr>=1?'Bueno':'Bajo',alert:overview.ctr<1,pos:overview.ctr>=2},
                  {l:'CPC',v:fmt$(overview.cpc),sub:'por clic'},
                  {l:'CPM',v:fmt$(overview.cpm),sub:'por mil imp'},
                  {l:'Clics',v:fmtN(overview.clicks),sub:'trafico'},
                  {l:'Reacciones',v:fmtN(overview.reactions),sub:'likes'},
                  {l:'Comentarios',v:fmtN(overview.comments),sub:'interacciones'},
                ].map(k => (
                  <div key={k.l} style={{background:'#111116',border:`1px solid ${k.alert?'rgba(248,113,113,.25)':k.pos?'rgba(110,231,183,.2)':'#1a1a22'}`,borderRadius:'10px',padding:'16px'}}>
                    <div style={{fontSize:'9px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'8px'}}>{k.l}</div>
                    <div style={{fontSize:'22px',fontWeight:'800',color:k.alert?'#f87171':k.pos?'#6ee7b7':'#fff',marginBottom:'4px'}}>{k.v}</div>
                    <div style={{fontSize:'10px',color:k.alert?'rgba(248,113,113,.6)':k.pos?'rgba(110,231,183,.6)':'#333',fontFamily:'monospace'}}>{k.sub}</div>
                  </div>
                ))}
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
                  <div style={{display:'flex',gap:'8px',alignItems:'flex-end',height:'120px'}}>
                    {[
                      {l:'25%',v:overview.vid25,color:'#6ee7b7'},
                      {l:'50%',v:overview.vid50,color:'#3b82f6'},
                      {l:'75%',v:overview.vid75,color:'#f97316'},
                      {l:'100%',v:overview.vid100,color:'#f87171'},
                    ].map((b,i,arr) => {
                      const max = arr[0].v||1
                      const pct = Math.round(b.v/max*100)
                      return (
                        <div key={b.l} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'6px'}}>
                          <div style={{fontSize:'11px',color:'#fff',fontWeight:'700'}}>{fmtN(b.v)}</div>
                          <div style={{width:'100%',height:`${Math.max(pct,4)}px`,background:b.color,borderRadius:'4px 4px 0 0',opacity:.8,transition:'height .3s'}}></div>
                          <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace'}}>{b.l}</div>
                          <div style={{fontSize:'10px',color:b.color,fontFamily:'monospace'}}>{pct}%</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'campanas' && (
            <>
              {campaigns.length > 1 && (
                <div style={{background:'#111116',border:'1px solid #1a1a22',borderRadius:'10px',padding:'20px',marginBottom:'16px'}}>
                  <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'16px'}}>CTR por campana</div>
                  <div style={{height:'180px'}}>
                    <Bar data={{
                      labels: campaigns.map(c=>c.name.length>20?c.name.slice(0,20)+'...':c.name),
                      datasets: [{label:'CTR %',data:campaigns.map(c=>+c.ctr.toFixed(2)),backgroundColor:'rgba(110,231,183,.6)',borderColor:'#6ee7b7',borderWidth:1,borderRadius:4}]
                    }} options={chartOpts()}/>
                  </div>
                </div>
              )}
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {campaigns.map((c,i) => {
                  const qs = qualityScore(c)
                  const ql = qualityLabel(qs)
                  return (
                    <div key={i} style={{background:'#111116',border:'1px solid #1a1a22',borderRadius:'10px',padding:'16px 20px'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px',flexWrap:'wrap',gap:'8px'}}>
                        <div>
                          <div style={{color:'#fff',fontSize:'13px',fontWeight:'700',marginBottom:'2px'}}>{c.name}</div>
                          <div style={{color:'#333',fontSize:'10px',fontFamily:'monospace'}}>{c.objective}</div>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                          <div style={{textAlign:'right'}}>
                            <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace',marginBottom:'2px'}}>Calidad</div>
                            <div style={{fontSize:'13px',fontWeight:'700',color:ql.color}}>{ql.label} · {qs}/100</div>
                          </div>
                          <div style={{fontSize:'18px',fontWeight:'800',color:'#fff'}}>{fmt$(c.spend)}</div>
                        </div>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(90px,1fr))',gap:'6px'}}>
                        {[
                          {l:'Resultados',v:fmtN(c.results)},
                          {l:'C/Resultado',v:c.cpr>0?fmt$(c.cpr):'—'},
                          {l:'Impresiones',v:fmtN(c.impressions)},
                          {l:'Alcance',v:fmtN(c.reach)},
                          {l:'CTR',v:fmtP(c.ctr),alert:c.ctr<1,pos:c.ctr>=2},
                          {l:'CPC',v:fmt$(c.cpc)},
                          {l:'CPM',v:fmt$(c.cpm)},
                          {l:'Frecuencia',v:(+c.frequency).toFixed(2),alert:c.frequency>3.5,pos:c.frequency<=2},
                        ].map(m => (
                          <div key={m.l} style={{background:'#0d0d12',borderRadius:'6px',padding:'8px 10px',border:`1px solid ${m.alert?'rgba(248,113,113,.15)':m.pos?'rgba(110,231,183,.1)':'transparent'}`}}>
                            <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace',marginBottom:'3px'}}>{m.l}</div>
                            <div style={{fontSize:'13px',fontWeight:'700',color:m.alert?'#f87171':m.pos?'#6ee7b7':'#fff'}}>{m.v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {activeTab === 'conjuntos' && (
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {adsets.map((a,i) => {
                const qs = qualityScore(a)
                const ql = qualityLabel(qs)
                return (
                  <div key={i} style={{background:'#111116',border:'1px solid #1a1a22',borderRadius:'10px',padding:'16px 20px'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px',flexWrap:'wrap',gap:'8px'}}>
                      <div>
                        <div style={{color:'#fff',fontSize:'13px',fontWeight:'700',marginBottom:'2px'}}>{a.name}</div>
                        <div style={{color:'#333',fontSize:'10px',fontFamily:'monospace'}}>{a.campaign}</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                        <div style={{fontSize:'13px',fontWeight:'700',color:ql.color}}>{ql.label} · {qs}/100</div>
                        <div style={{fontSize:'18px',fontWeight:'800',color:'#fff'}}>{fmt$(a.spend)}</div>
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(90px,1fr))',gap:'6px'}}>
                      {[
                        {l:'Resultados',v:fmtN(a.results)},
                        {l:'C/Resultado',v:a.cpr>0?fmt$(a.cpr):'—'},
                        {l:'Impresiones',v:fmtN(a.impressions)},
                        {l:'Alcance',v:fmtN(a.reach)},
                        {l:'CTR',v:fmtP(a.ctr),alert:a.ctr<1,pos:a.ctr>=2},
                        {l:'CPC',v:fmt$(a.cpc)},
                        {l:'CPM',v:fmt$(a.cpm)},
                        {l:'Frecuencia',v:(+a.frequency).toFixed(2),alert:a.frequency>3.5,pos:a.frequency<=2},
                      ].map(m => (
                        <div key={m.l} style={{background:'#0d0d12',borderRadius:'6px',padding:'8px 10px',border:`1px solid ${m.alert?'rgba(248,113,113,.15)':m.pos?'rgba(110,231,183,.1)':'transparent'}`}}>
                          <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace',marginBottom:'3px'}}>{m.l}</div>
                          <div style={{fontSize:'13px',fontWeight:'700',color:m.alert?'#f87171':m.pos?'#6ee7b7':'#fff'}}>{m.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {adsets.length===0 && <div style={{textAlign:'center',padding:'60px 0',color:'#444',fontFamily:'monospace'}}>Sin datos para este periodo</div>}
            </div>
          )}

          {activeTab === 'anuncios' && (
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {ads.map((a,i) => {
                const qs = qualityScore(a)
                const ql = qualityLabel(qs)
                return (
                  <div key={i} style={{background:'#111116',border:'1px solid #1a1a22',borderRadius:'10px',padding:'16px 20px'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px',flexWrap:'wrap',gap:'8px'}}>
                      <div>
                        <div style={{color:'#fff',fontSize:'13px',fontWeight:'700',marginBottom:'2px'}}>{a.name}</div>
                        <div style={{color:'#333',fontSize:'10px',fontFamily:'monospace'}}>{a.adset} · {a.campaign}</div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                        <div style={{fontSize:'13px',fontWeight:'700',color:ql.color}}>{ql.label} · {qs}/100</div>
                        <div style={{fontSize:'18px',fontWeight:'800',color:'#fff'}}>{fmt$(a.spend)}</div>
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(90px,1fr))',gap:'6px'}}>
                      {[
                        {l:'Resultados',v:fmtN(a.results)},
                        {l:'C/Resultado',v:a.cpr>0?fmt$(a.cpr):'—'},
                        {l:'Impresiones',v:fmtN(a.impressions)},
                        {l:'Alcance',v:fmtN(a.reach)},
                        {l:'CTR',v:fmtP(a.ctr),alert:a.ctr<1,pos:a.ctr>=2},
                        {l:'CPC',v:fmt$(a.cpc)},
                        {l:'CPM',v:fmt$(a.cpm)},
                        {l:'Frecuencia',v:(+a.frequency).toFixed(2),alert:a.frequency>3.5,pos:a.frequency<=2},
                      ].map(m => (
                        <div key={m.l} style={{background:'#0d0d12',borderRadius:'6px',padding:'8px 10px',border:`1px solid ${m.alert?'rgba(248,113,113,.15)':m.pos?'rgba(110,231,183,.1)':'transparent'}`}}>
                          <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace',marginBottom:'3px'}}>{m.l}</div>
                          <div style={{fontSize:'13px',fontWeight:'700',color:m.alert?'#f87171':m.pos?'#6ee7b7':'#fff'}}>{m.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {ads.length===0 && <div style={{textAlign:'center',padding:'60px 0',color:'#444',fontFamily:'monospace'}}>Sin datos para este periodo</div>}
            </div>
          )}
        </div>
      )}
    </main>
  )
}