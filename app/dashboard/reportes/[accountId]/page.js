'use client'
import React, { useEffect, useState, useRef } from 'react'
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
  { label: 'Personalizado', value: 'custom' },
]

const OBJECTIVE_MAP = {
  OUTCOME_ENGAGEMENT: { label: 'Interaccion', resultTypes: ['messages','engagement','leads'] },
  OUTCOME_LEADS: { label: 'Clientes potenciales', resultTypes: ['leads','messages'] },
  OUTCOME_SALES: { label: 'Ventas', resultTypes: ['purchases','leads'] },
  OUTCOME_TRAFFIC: { label: 'Trafico', resultTypes: ['traffic','leads'] },
  OUTCOME_AWARENESS: { label: 'Reconocimiento', resultTypes: ['engagement','traffic'] },
  OUTCOME_APP_PROMOTION: { label: 'Promocion de app', resultTypes: ['traffic','engagement'] },
  MULTIPLE: { label: 'Multiples', resultTypes: ['messages','leads','purchases','traffic','engagement'] },
}

const RESULT_TYPE_LABELS = {
  messages: 'Mensajes/WhatsApp',
  leads: 'Leads/Formularios',
  purchases: 'Compras',
  traffic: 'Trafico/Clics',
  video: 'Video',
  engagement: 'Engagement',
}

function getDateRange(preset, customFrom, customTo) {
  const today = new Date()
  const fmt = d => d.toISOString().split('T')[0]
  if (preset === 'custom') return { since: customFrom, until: customTo }
  if (preset === 'today') return { since: fmt(today), until: fmt(today) }
  if (preset === 'yesterday') { const y = new Date(today); y.setDate(y.getDate()-1); return { since: fmt(y), until: fmt(y) } }
  if (preset === 'last_7d') { const f = new Date(today); f.setDate(f.getDate()-6); return { since: fmt(f), until: fmt(today) } }
  if (preset === 'last_30d') { const f = new Date(today); f.setDate(f.getDate()-29); return { since: fmt(f), until: fmt(today) } }
  if (preset === 'this_month') { const f = new Date(today.getFullYear(), today.getMonth(), 1); return { since: fmt(f), until: fmt(today) } }
  if (preset === 'last_month') { const f = new Date(today.getFullYear(), today.getMonth()-1, 1); const u = new Date(today.getFullYear(), today.getMonth(), 0); return { since: fmt(f), until: fmt(u) } }
}

function getPrevRange(since, until) {
  const s = new Date(since), u = new Date(until)
  const days = Math.round((u-s)/(1000*60*60*24))+1
  const ps = new Date(s); ps.setDate(ps.getDate()-days)
  const pu = new Date(s); pu.setDate(pu.getDate()-1)
  const fmt = d => d.toISOString().split('T')[0]
  return { since: fmt(ps), until: fmt(pu) }
}

const fmt$ = v => '$'+((+v)||0).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})
const fmtN = v => (+v||0)>=1e6?((+v/1e6).toFixed(1)+'M'):(+v||0)>=1e3?((+v/1e3).toFixed(1)+'K'):String(Math.round(+v||0))
const fmtP = v => ((+v)||0).toFixed(2)+'%'
const findAction = (actions, types) => { const m = (actions||[]).find(a => types.some(t => a.action_type?.includes(t))); return m ? parseFloat(m.value)||0 : 0 }

function getResults(actions, resultType) {
  if (resultType === 'messages') return findAction(actions, ['onsite_conversion.messaging_conversation_started_7d'])
  if (resultType === 'leads') return findAction(actions, ['lead','onsite_conversion.lead','offsite_complete_registration'])
  if (resultType === 'purchases') return findAction(actions, ['purchase','offsite_conversion.fb_pixel_purchase'])
  if (resultType === 'traffic') return findAction(actions, ['link_click'])
  if (resultType === 'video') return findAction(actions, ['video_view'])
  if (resultType === 'engagement') return findAction(actions, ['post_engagement','post_reaction','like','comment'])
  return findAction(actions, ['onsite_conversion.messaging_conversation_started_7d','lead','purchase','link_click'])
}

const chartOpts = (dual=false) => ({
  responsive:true, maintainAspectRatio:false,
  plugins:{
    legend:{labels:{color:'#666',font:{family:'Inter',size:11},boxWidth:10,padding:16}},
    tooltip:{backgroundColor:'#1a1a1e',borderColor:'#2a2a35',borderWidth:1,titleColor:'#fff',bodyColor:'#888',padding:12,cornerRadius:8}
  },
  scales:{
    x:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#444',font:{size:10},maxRotation:30}},
    y:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#444',font:{size:10}}},
    ...(dual?{y1:{position:'right',grid:{display:false},ticks:{color:'#444',font:{size:10}}}}:{})
  }
})

const qualityScore = (row) => {
  if (!row) return 0
  let s = 0
  if (row.ctr>=2) s+=30; else if(row.ctr>=1) s+=15
  if (row.frequency<=2) s+=25; else if(row.frequency<=3.5) s+=12
  if (row.cpm<=50) s+=25; else if(row.cpm<=100) s+=12
  if (row.results>0) s+=20
  return Math.min(s,100)
}
const qualityLabel = s => s>=75?{label:'Excelente',color:'#6ee7b7'}:s>=50?{label:'Bueno',color:'#fcd34d'}:{label:'Mejorar',color:'#f87171'}
const delta = (curr, prev) => { if (!prev||prev===0) return null; const pct = ((curr-prev)/prev*100).toFixed(1); return { pct, up: curr>=prev } }

const MetricCard = ({l,v,sub,alert,pos,prev,comparing}) => {
  const d = (comparing && prev!=null) ? delta(parseFloat(String(v).replace(/[^0-9.-]/g,''))||0, prev) : null
  return (
    <div style={{background:'#111116',border:`1px solid ${alert?'rgba(248,113,113,.25)':pos?'rgba(110,231,183,.2)':'#1a1a22'}`,borderRadius:'10px',padding:'16px'}}>
      <div style={{fontSize:'9px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'8px'}}>{l}</div>
      <div style={{fontSize:'22px',fontWeight:'800',color:alert?'#f87171':pos?'#6ee7b7':'#fff',marginBottom:'4px'}}>{v}</div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontSize:'10px',color:'#333',fontFamily:'monospace'}}>{sub}</div>
        {d && <div style={{fontSize:'10px',fontFamily:'monospace',color:d.up?'#6ee7b7':'#f87171',fontWeight:'700'}}>{d.up?'+':''}{d.pct}%</div>}
      </div>
    </div>
  )
}

const MiniMetric = ({l,v,alert,pos}) => (
  <div style={{background:'#0d0d12',borderRadius:'6px',padding:'8px 10px',border:`1px solid ${alert?'rgba(248,113,113,.15)':pos?'rgba(110,231,183,.1)':'transparent'}`}}>
    <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace',marginBottom:'3px'}}>{l}</div>
    <div style={{fontSize:'13px',fontWeight:'700',color:alert?'#f87171':pos?'#6ee7b7':'#fff'}}>{v}</div>
  </div>
)


const diagnoseCampaign = (row) => {
  const issues = []
  const wins = []
  if (row.frequency > 3.5) issues.push({ icon: '🔴', msg: 'Fatiga publicitaria — rota los creativos urgente', action: 'Pausa los anuncios con mas de 3.5 frecuencia y lanza nuevos creativos' })
  else if (row.frequency > 2.5) issues.push({ icon: '🟡', msg: 'Frecuencia elevada — monitorea el CTR', action: 'Prepara nuevos creativos antes de que el rendimiento caiga' })
  if (row.ctr < 0.5) issues.push({ icon: '🔴', msg: 'CTR muy bajo — el creativo no engancha', action: 'Cambia la imagen/video y el primer segundo del copy' })
  else if (row.ctr < 1) issues.push({ icon: '🟡', msg: 'CTR mejorable', action: 'Prueba un hook mas directo o una oferta mas clara' })
  else if (row.ctr >= 2) wins.push({ icon: '🟢', msg: 'CTR excelente — este creativo funciona', action: 'Escala el presupuesto 20-30% cada 3 dias' })
  if (row.cpm > 150) issues.push({ icon: '🔴', msg: 'CPM muy alto — audiencia saturada o puja competitiva', action: 'Amplia la segmentacion o prueba otras ubicaciones' })
  else if (row.cpm > 100) issues.push({ icon: '🟡', msg: 'CPM elevado', action: 'Revisa la segmentacion y considera ampliar la audiencia' })
  if (row.results > 0 && row.cpr > 0) wins.push({ icon: '🟢', msg: 'Generando resultados', action: 'Mantener activo y escalar si el CPR es rentable' })
  if (row.results === 0 && row.spend > 50) issues.push({ icon: '🔴', msg: 'Sin resultados con gasto significativo', action: 'Revisa el objetivo, la segmentacion y la landing page' })
  if (row.vid25 > 0 && row.vid100 > 0) {
    const retention = Math.round(row.vid100/row.vid25*100)
    if (retention < 20) issues.push({ icon: '🟡', msg: `Retencion de video baja (${retention}% llega al final)`, action: 'El gancho inicial funciona pero el video pierde atencion — edita el ritmo' })
    else if (retention >= 40) wins.push({ icon: '🟢', msg: `Buena retencion de video (${retention}% llega al final)`, action: 'Video efectivo — considera usarlo en mas conjuntos' })
  }
  return { issues, wins }
}

const AdScoreCard = ({ ad }) => {
  const qs = qualityScore(ad)
  const ql = qualityLabel(qs)
  const diag = diagnoseCampaign(ad)
  const [open, setOpen] = React.useState(false)
  return (
    <div style={{background:'#111116',border:`1px solid ${qs>=75?'rgba(110,231,183,.2)':qs>=50?'rgba(252,211,77,.15)':'rgba(248,113,113,.2)'}`,borderRadius:'10px',padding:'16px 20px',marginBottom:'8px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px',flexWrap:'wrap',gap:'8px',cursor:'pointer'}} onClick={()=>setOpen(!open)}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'2px'}}>
            <div style={{width:'8px',height:'8px',borderRadius:'50%',background:ad.status==='ACTIVE'?'#6ee7b7':ad.status==='PAUSED'?'#fcd34d':'#555',flexShrink:0}}></div>
            <div style={{color:'#fff',fontSize:'13px',fontWeight:'700',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ad.name}</div>
          </div>
          <div style={{color:'#333',fontSize:'10px',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingLeft:'16px'}}>{ad.adset} · {ad.campaign}</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'12px',flexShrink:0}}>
          <div style={{textAlign:'center',background:qs>=75?'rgba(110,231,183,.08)':qs>=50?'rgba(252,211,77,.08)':'rgba(248,113,113,.08)',borderRadius:'8px',padding:'6px 12px',border:`1px solid ${qs>=75?'rgba(110,231,183,.2)':qs>=50?'rgba(252,211,77,.15)':'rgba(248,113,113,.2)'}`}}>
            <div style={{fontSize:'18px',fontWeight:'800',color:ql.color}}>{qs}</div>
            <div style={{fontSize:'9px',color:ql.color,fontFamily:'monospace'}}>/100</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:'16px',fontWeight:'800',color:'#fff'}}>{fmt$(ad.spend)}</div>
            <div style={{fontSize:'10px',color:ad.results>0?'#6ee7b7':'#555',fontFamily:'monospace'}}>{fmtN(ad.results)} resultados</div>
          </div>
          <div style={{color:'#444',fontSize:'16px'}}>{open?'▲':'▼'}</div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(80px,1fr))',gap:'6px',marginBottom:open?'12px':'0'}}>
        {[
          {l:'CTR',v:fmtP(ad.ctr),alert:ad.ctr<1,pos:ad.ctr>=2},
          {l:'CPM',v:fmt$(ad.cpm),alert:ad.cpm>150},
          {l:'CPC',v:fmt$(ad.cpc)},
          {l:'Frecuencia',v:(+ad.frequency).toFixed(2),alert:ad.frequency>3.5,pos:ad.frequency<=2},
          {l:'Alcance',v:fmtN(ad.reach)},
          {l:'Impresiones',v:fmtN(ad.impressions)},
          {l:'Reacciones',v:fmtN(ad.reactions)},
          {l:'Guardados',v:fmtN(ad.saves)},
        ].map(m=>(
          <div key={m.l} style={{background:'#0d0d12',borderRadius:'6px',padding:'6px 8px',border:`1px solid ${m.alert?'rgba(248,113,113,.15)':m.pos?'rgba(110,231,183,.1)':'transparent'}`}}>
            <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace',marginBottom:'2px'}}>{m.l}</div>
            <div style={{fontSize:'12px',fontWeight:'700',color:m.alert?'#f87171':m.pos?'#6ee7b7':'#fff'}}>{m.v}</div>
          </div>
        ))}
      </div>

      {open && (
        <div style={{borderTop:'1px solid #1a1a22',paddingTop:'12px',marginTop:'4px'}}>
          {diag.wins.length>0 && (
            <div style={{marginBottom:'8px'}}>
              {diag.wins.map((w,i)=>(
                <div key={i} style={{display:'flex',gap:'8px',marginBottom:'6px',padding:'8px 12px',background:'rgba(110,231,183,.05)',borderRadius:'6px',border:'1px solid rgba(110,231,183,.1)'}}>
                  <span style={{fontSize:'14px',flexShrink:0}}>{w.icon}</span>
                  <div>
                    <div style={{fontSize:'12px',color:'#6ee7b7',fontWeight:'600',marginBottom:'2px'}}>{w.msg}</div>
                    <div style={{fontSize:'11px',color:'#444',fontFamily:'monospace'}}>→ {w.action}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {diag.issues.length>0 && (
            <div>
              {diag.issues.map((issue,i)=>(
                <div key={i} style={{display:'flex',gap:'8px',marginBottom:'6px',padding:'8px 12px',background:'rgba(248,113,113,.04)',borderRadius:'6px',border:'1px solid rgba(248,113,113,.1)'}}>
                  <span style={{fontSize:'14px',flexShrink:0}}>{issue.icon}</span>
                  <div>
                    <div style={{fontSize:'12px',color:'#f87171',fontWeight:'600',marginBottom:'2px'}}>{issue.msg}</div>
                    <div style={{fontSize:'11px',color:'#444',fontFamily:'monospace'}}>→ {issue.action}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {diag.wins.length===0 && diag.issues.length===0 && (
            <div style={{fontSize:'11px',color:'#444',fontFamily:'monospace',textAlign:'center',padding:'8px'}}>Sin datos suficientes para diagnosticar</div>
          )}

          {ad.vid25>0 && (
            <div style={{marginTop:'12px'}}>
              <div style={{fontSize:'9px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'8px'}}>Retencion de video</div>
              <div style={{display:'flex',gap:'4px',alignItems:'flex-end',height:'60px'}}>
                {[{l:'25%',v:ad.vid25},{l:'50%',v:ad.vid50},{l:'75%',v:ad.vid75},{l:'100%',v:ad.vid100}].map((b,i,arr)=>{
                  const max=arr[0].v||1; const pct=Math.round(b.v/max*100)
                  const color = pct>60?'#6ee7b7':pct>30?'#fcd34d':'#f87171'
                  return (
                    <div key={b.l} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
                      <div style={{fontSize:'9px',color:'#fff',fontWeight:'700'}}>{pct}%</div>
                      <div style={{width:'100%',height:Math.max(pct*.4,2)+'px',background:color,borderRadius:'2px 2px 0 0',opacity:.8}}></div>
                      <div style={{fontSize:'9px',color:'#444',fontFamily:'monospace'}}>{b.l}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const RowCard = ({name, sub, row}) => {
  const qs = qualityScore(row); const ql = qualityLabel(qs)
  return (
    <div style={{background:'#111116',border:'1px solid #1a1a22',borderRadius:'10px',padding:'16px 20px',marginBottom:'8px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px',flexWrap:'wrap',gap:'8px'}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:'#fff',fontSize:'13px',fontWeight:'700',marginBottom:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</div>
          {sub && <div style={{color:'#333',fontSize:'10px',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sub}</div>}{row.status && <div style={{display:'inline-flex',alignItems:'center',gap:'4px',marginTop:'4px'}}><div style={{width:'6px',height:'6px',borderRadius:'50%',background:row.status==='ACTIVE'?'#6ee7b7':row.status==='PAUSED'?'#fcd34d':'#f87171',flexShrink:0}}></div><span style={{fontSize:'9px',fontFamily:'monospace',color:row.status==='ACTIVE'?'#6ee7b7':row.status==='PAUSED'?'#fcd34d':'#f87171'}}>{row.status==='ACTIVE'?'ACTIVO':row.status==='PAUSED'?'PAUSADO':'INACTIVO'}</span></div>}
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
        {[
          {l:'Resultados',v:fmtN(row.results),pos:row.results>0},
          {l:'C/Resultado',v:row.cpr>0?fmt$(row.cpr):'—'},
          {l:'Impresiones',v:fmtN(row.impressions)},
          {l:'Alcance',v:fmtN(row.reach)},
          {l:'CTR',v:fmtP(row.ctr),alert:row.ctr<1,pos:row.ctr>=2},
          {l:'CPC',v:fmt$(row.cpc)},
          {l:'CPM',v:fmt$(row.cpm)},
          {l:'Frecuencia',v:(+row.frequency).toFixed(2),alert:row.frequency>3.5,pos:row.frequency<=2},
          {l:'Reacciones',v:fmtN(row.reactions)},
          {l:'Comentarios',v:fmtN(row.comments)},
          {l:'Guardados',v:fmtN(row.saves)},
        ].map(m=><MiniMetric key={m.l} {...m}/>)}
      </div>
    </div>
  )
}

export default function Reportes() {
  const { accountId } = useParams()
  const [token, setToken] = useState(null)
  const [preset, setPreset] = useState('this_month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [resultType, setResultType] = useState('auto')
  const [detectedObjective, setDetectedObjective] = useState(null)
  const [availableTypes, setAvailableTypes] = useState([])
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [overview, setOverview] = useState(null)
  const [prevOverview, setPrevOverview] = useState(null)
  const [daily, setDaily] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [adsets, setAdsets] = useState([])
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(false)
  const [accountName, setAccountName] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [comparing, setComparing] = useState(false)
  const reportRef = useRef(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      const { data: tokenRow } = await supabase.from('meta_tokens').select('access_token').eq('user_id', user.id).single()
      if (!tokenRow) { window.location.href = '/dashboard'; return }
      setToken(tokenRow.access_token)
      const { data: acc } = await supabase.from('ad_accounts').select('account_name').eq('account_id', accountId).single()
      setAccountName(acc?.account_name || accountId)
    }
    init()
  }, [])

  useEffect(() => { if (token && (preset !== 'custom' || (customFrom && customTo))) fetchData() }, [token, preset, customFrom, customTo, resultType])

  async function fetchData() {
    setLoading(true)
    setOverview(null); setPrevOverview(null); setDaily([]); setCampaigns([]); setAdsets([]); setAds([])
    try {
      const range = getDateRange(preset, customFrom, customTo)
      if (!range||!range.since||!range.until) { setLoading(false); return }
      const prev = getPrevRange(range.since, range.until)
      const tr = JSON.stringify({since:range.since,until:range.until})
      const trPrev = JSON.stringify({since:prev.since,until:prev.until})
      const base = `https://graph.facebook.com/v21.0/${accountId}/insights`
      const fields = 'spend,impressions,reach,frequency,clicks,cpc,cpm,ctr,actions,objective,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions'
      const campFields = `campaign_name,objective,spend,impressions,reach,frequency,clicks,cpc,cpm,ctr,actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions`
      const adsetFields = `adset_name,campaign_name,spend,impressions,reach,frequency,clicks,cpc,cpm,ctr,actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions`
      const adFields = `ad_name,adset_name,campaign_name,spend,impressions,reach,frequency,clicks,cpc,cpm,ctr,actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions`

      const [ovR,ovPrevR,dailyR,campR,adsetR,adR] = await Promise.all([
        fetch(`${base}?fields=${fields}&time_range=${tr}&access_token=${token}`),
        fetch(`${base}?fields=${fields}&time_range=${trPrev}&access_token=${token}`),
        fetch(`${base}?fields=${fields}&time_range=${tr}&time_increment=1&access_token=${token}&limit=90`),
        fetch(`${base}?fields=${campFields}&level=campaign&time_range=${tr}&limit=50&access_token=${token}`),
        fetch(`${base}?fields=${adsetFields}&level=adset&time_range=${tr}&limit=50&access_token=${token}`),
        fetch(`${base}?fields=${adFields}&level=ad&time_range=${tr}&limit=50&access_token=${token}`)
      ])

      const [ovJ,ovPrevJ,dailyJ,campJ,adsetJ,adJ] = await Promise.all([ovR.json(),ovPrevR.json(),dailyR.json(),campR.json(),adsetR.json(),adR.json()])
      const adStatusRes = await fetch(`https://graph.facebook.com/v21.0/${accountId}/ads?fields=id,name,effective_status&limit=100&access_token=${token}`)
      const adStatusJ = await adStatusRes.json()
      const adStatusMap = {}
      ;(adStatusJ.data||[]).forEach(a=>{ adStatusMap[a.name]=a.effective_status })

      const objective = ovJ.data?.[0]?.objective || 'MULTIPLE'
      setDetectedObjective(objective)
      const objInfo = OBJECTIVE_MAP[objective] || OBJECTIVE_MAP.MULTIPLE
      setAvailableTypes(objInfo.resultTypes)

      const autoType = resultType === 'auto' ? objInfo.resultTypes[0] : resultType

      const parseRow = (d) => {
        const actions = d.actions||[]
        const rowObjective = d.objective || objective
        const objT = OBJECTIVE_MAP[rowObjective] || OBJECTIVE_MAP.MULTIPLE
        const type = resultType === 'auto' ? objT.resultTypes[0] : resultType
        const results = getResults(actions, type)
        const spend = parseFloat(d.spend)||0
        return {
          spend, results,
          impressions:parseFloat(d.impressions)||0,
          reach:parseFloat(d.reach)||0,
          frequency:parseFloat(d.frequency)||0,
          clicks:parseFloat(d.clicks)||0,
          cpc:parseFloat(d.cpc)||0,
          cpm:parseFloat(d.cpm)||0,
          ctr:parseFloat(d.ctr)||0,
          cpr:results>0?spend/results:0,
          comments:findAction(actions,['comment','post_comment']),
          shares:findAction(actions,['post','share']),
          reactions:findAction(actions,['post_reaction','like']),
          saves:findAction(actions,['onsite_conversion.post_save']),
          vid25:parseFloat(d.video_p25_watched_actions?.[0]?.value)||0,
          vid50:parseFloat(d.video_p50_watched_actions?.[0]?.value)||0,
          vid75:parseFloat(d.video_p75_watched_actions?.[0]?.value)||0,
          vid100:parseFloat(d.video_p100_watched_actions?.[0]?.value)||0,
        }
      }

      if (ovJ.data?.[0]) setOverview(parseRow(ovJ.data[0]))
      if (ovPrevJ.data?.[0]) setPrevOverview(parseRow(ovPrevJ.data[0]))
      setDaily((dailyJ.data||[]).map(d=>({date:d.date_start,...parseRow(d)})))
      setCampaigns((campJ.data||[]).map(d=>({name:d.campaign_name,objective:d.objective,...parseRow(d)})))
      setAdsets((adsetJ.data||[]).map(d=>({name:d.adset_name,campaign:d.campaign_name,...parseRow(d)})))
      setAds((adJ.data||[]).map(d=>({name:d.ad_name,adset:d.adset_name,campaign:d.campaign_name,status:adStatusMap[d.ad_name]||'UNKNOWN',...parseRow(d)})))
    } catch(e){console.error(e)}
    setLoading(false)
  }

  async function exportPDF() {
    try {
      const { default: html2canvas } = await import('html2canvas')
      const { default: jsPDF } = await import('jspdf')
      const canvas = await html2canvas(reportRef.current,{scale:2,backgroundColor:'#0a0a0e',useCORS:true})
      const pdf = new jsPDF({orientation:'portrait',unit:'px',format:[canvas.width/2,canvas.height/2]})
      pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,canvas.width/2,canvas.height/2)
      pdf.save(accountName+'-'+preset+'.pdf')
    } catch(e){console.error(e)}
  }

  const tabs = ['overview','campanas','conjuntos','anuncios']
  const tabLabels = {overview:'Overview',campanas:'Campanas',conjuntos:'Conjuntos',anuncios:'Anuncios'}
  const objInfo = OBJECTIVE_MAP[detectedObjective] || OBJECTIVE_MAP.MULTIPLE
  const currentTypeLabel = resultType === 'auto' ? `Auto · ${RESULT_TYPE_LABELS[objInfo?.resultTypes?.[0]]||''}` : RESULT_TYPE_LABELS[resultType] || resultType

  return (
    <main style={{minHeight:'100vh',background:'#0a0a0e',fontFamily:'Inter,sans-serif'}}>
      <header style={{padding:'0 24px',background:'rgba(10,10,14,.97)',borderBottom:'1px solid #1a1a22',position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',height:'52px',gap:'8px',flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <button onClick={()=>window.location.href='/dashboard'} style={{background:'transparent',border:'none',color:'#555',cursor:'pointer',fontSize:'18px'}}>←</button>
            <span style={{fontSize:'16px'}}>📊</span>
            <span style={{color:'#fff',fontWeight:'700',fontSize:'14px'}}>{accountName}</span>
            {detectedObjective && <span style={{fontSize:'10px',color:'#444',fontFamily:'monospace',background:'#18181f',padding:'3px 8px',borderRadius:'4px'}}>{OBJECTIVE_MAP[detectedObjective]?.label||detectedObjective}</span>}
          </div>
          <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
            {PRESETS.map(p=>(
              <button key={p.value} onClick={()=>{setPreset(p.value);setShowCustom(p.value==='custom')}}
                style={{padding:'5px 10px',borderRadius:'6px',border:'1px solid',fontSize:'11px',cursor:'pointer',fontFamily:'monospace',borderColor:preset===p.value?'#fff':'#222',background:preset===p.value?'#fff':'transparent',color:preset===p.value?'#0a0a0e':'#555',fontWeight:preset===p.value?'700':'400'}}>
                {p.label}
              </button>
            ))}
          </div>
          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
            <button onClick={()=>setComparing(!comparing)}
              style={{padding:'5px 12px',borderRadius:'6px',border:'1px solid',fontSize:'11px',cursor:'pointer',fontFamily:'monospace',borderColor:comparing?'#6ee7b7':'#222',background:comparing?'rgba(110,231,183,.1)':'transparent',color:comparing?'#6ee7b7':'#555'}}>
              {comparing?'Comparando':'Comparar'}
            </button>
            <button onClick={exportPDF} style={{padding:'5px 12px',borderRadius:'6px',border:'1px solid #222',background:'transparent',color:'#555',fontSize:'11px',cursor:'pointer',fontFamily:'monospace'}}>
              ↓ PDF
            </button>
          </div>
        </div>

        {showCustom && (
          <div style={{display:'flex',gap:'8px',padding:'6px 0',alignItems:'center'}}>
            <span style={{fontSize:'11px',color:'#444',fontFamily:'monospace'}}>Desde</span>
            <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} style={{background:'#18181f',border:'1px solid #2a2a35',color:'#fff',padding:'4px 8px',borderRadius:'6px',fontSize:'11px',outline:'none'}}/>
            <span style={{fontSize:'11px',color:'#444',fontFamily:'monospace'}}>Hasta</span>
            <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} style={{background:'#18181f',border:'1px solid #2a2a35',color:'#fff',padding:'4px 8px',borderRadius:'6px',fontSize:'11px',outline:'none'}}/>
          </div>
        )}

        <div style={{display:'flex',alignItems:'center',gap:'0',borderTop:'1px solid #111',overflowX:'auto'}}>
          <div style={{position:'relative',marginRight:'16px',flexShrink:0,padding:'6px 0'}}>
            <button onClick={()=>setShowTypeDropdown(!showTypeDropdown)}
              style={{padding:'5px 12px',borderRadius:'6px',border:'1px solid #a78bfa',background:'rgba(167,139,250,.1)',color:'#a78bfa',fontSize:'11px',cursor:'pointer',fontFamily:'monospace',display:'flex',alignItems:'center',gap:'6px',whiteSpace:'nowrap'}}>
              🎯 {currentTypeLabel} ▾
            </button>
            {showTypeDropdown && (
              <div style={{position:'absolute',top:'100%',left:0,background:'#18181f',border:'1px solid #2a2a35',borderRadius:'8px',padding:'6px',zIndex:200,minWidth:'220px',boxShadow:'0 8px 24px rgba(0,0,0,.5)'}}>
                <div onClick={()=>{setResultType('auto');setShowTypeDropdown(false)}}
                  style={{padding:'8px 12px',borderRadius:'6px',cursor:'pointer',color:resultType==='auto'?'#a78bfa':'#888',background:resultType==='auto'?'rgba(167,139,250,.1)':'transparent',fontSize:'12px',fontFamily:'monospace',marginBottom:'4px'}}>
                  🤖 Auto — detectar automaticamente
                </div>
                <div style={{height:'1px',background:'#2a2a35',margin:'4px 0'}}></div>
                {availableTypes.map(t=>(
                  <div key={t} onClick={()=>{setResultType(t);setShowTypeDropdown(false)}}
                    style={{padding:'8px 12px',borderRadius:'6px',cursor:'pointer',color:resultType===t?'#a78bfa':'#888',background:resultType===t?'rgba(167,139,250,.1)':'transparent',fontSize:'12px',fontFamily:'monospace'}}>
                    {RESULT_TYPE_LABELS[t]}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{flex:1,display:'flex'}}>
            {tabs.map(t=>(
              <button key={t} onClick={()=>setActiveTab(t)}
                style={{padding:'8px 14px',fontSize:'10px',fontFamily:'monospace',cursor:'pointer',color:activeTab===t?'#fff':'#444',borderBottom:activeTab===t?'1.5px solid #fff':'1.5px solid transparent',background:'transparent',border:'none',textTransform:'uppercase',letterSpacing:'.07em',whiteSpace:'nowrap'}}>
                {tabLabels[t]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {loading && <div style={{textAlign:'center',padding:'80px 0',color:'#444',fontFamily:'monospace',fontSize:'12px'}}>Cargando datos de Meta...</div>}

      {!loading && (
        <div ref={reportRef} style={{padding:'24px',maxWidth:'1400px',margin:'0 auto'}}>
          {activeTab==='overview' && overview && (
            <>
              {comparing && prevOverview && (
                <div style={{background:'rgba(110,231,183,.05)',border:'1px solid rgba(110,231,183,.15)',borderRadius:'8px',padding:'10px 16px',marginBottom:'16px',fontSize:'11px',color:'#6ee7b7',fontFamily:'monospace'}}>
                  Comparando periodo actual vs periodo anterior — los porcentajes muestran el cambio
                </div>
              )}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'10px',marginBottom:'24px'}}>
                <MetricCard l='Importe gastado' v={fmt$(overview.spend)} sub='total ejecutado' prev={prevOverview?.spend} comparing={comparing}/>
                <MetricCard l='Resultados' v={fmtN(overview.results)} sub='conversiones' pos={overview.results>0} prev={prevOverview?.results} comparing={comparing}/>
                <MetricCard l='Costo/resultado' v={overview.cpr>0?fmt$(overview.cpr):'—'} sub='eficiencia' prev={prevOverview?.cpr} comparing={comparing}/>
                <MetricCard l='Impresiones' v={fmtN(overview.impressions)} sub='total' prev={prevOverview?.impressions} comparing={comparing}/>
                <MetricCard l='Alcance' v={fmtN(overview.reach)} sub='personas unicas' prev={prevOverview?.reach} comparing={comparing}/>
                <MetricCard l='Frecuencia' v={(+overview.frequency).toFixed(2)} sub={overview.frequency<=2?'Optima':overview.frequency<=3.5?'Revisar':'Fatiga'} alert={overview.frequency>3.5} pos={overview.frequency<=2} prev={prevOverview?.frequency} comparing={comparing}/>
                <MetricCard l='CTR' v={fmtP(overview.ctr)} sub={overview.ctr>=2?'Excelente':overview.ctr>=1?'Bueno':'Bajo'} alert={overview.ctr<1} pos={overview.ctr>=2} prev={prevOverview?.ctr} comparing={comparing}/>
                <MetricCard l='CPC' v={fmt$(overview.cpc)} sub='por clic' prev={prevOverview?.cpc} comparing={comparing}/>
                <MetricCard l='CPM' v={fmt$(overview.cpm)} sub='por mil imp' prev={prevOverview?.cpm} comparing={comparing}/>
                <MetricCard l='Clics' v={fmtN(overview.clicks)} sub='trafico' prev={prevOverview?.clicks} comparing={comparing}/>
                <MetricCard l='Reacciones' v={fmtN(overview.reactions)} sub='likes' prev={prevOverview?.reactions} comparing={comparing}/>
                <MetricCard l='Guardados' v={fmtN(overview.saves)} sub='post saves' prev={prevOverview?.saves} comparing={comparing}/>
              </div>

              {daily.length>1 && (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'24px'}}>
                  <div style={{background:'#111116',border:'1px solid #1a1a22',borderRadius:'10px',padding:'20px'}}>
                    <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'16px'}}>Spend vs Resultados por dia</div>
                    <div style={{height:'200px'}}>
                      <Line data={{labels:daily.map(d=>d.date.slice(5)),datasets:[
                        {label:'Gastado ($)',data:daily.map(d=>+d.spend.toFixed(2)),borderColor:'#f97316',backgroundColor:'rgba(249,115,22,.08)',fill:true,tension:.4,yAxisID:'y',pointRadius:2,borderWidth:2},
                        {label:'Resultados',data:daily.map(d=>d.results),borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,.08)',fill:true,tension:.4,yAxisID:'y1',pointRadius:2,borderWidth:2}
                      ]}} options={chartOpts(true)}/>
                    </div>
                  </div>
                  <div style={{background:'#111116',border:'1px solid #1a1a22',borderRadius:'10px',padding:'20px'}}>
                    <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'16px'}}>CTR y CPM por dia</div>
                    <div style={{height:'200px'}}>
                      <Line data={{labels:daily.map(d=>d.date.slice(5)),datasets:[
                        {label:'CTR %',data:daily.map(d=>+d.ctr.toFixed(2)),borderColor:'#6ee7b7',backgroundColor:'rgba(110,231,183,.06)',fill:true,tension:.4,yAxisID:'y',pointRadius:2,borderWidth:2},
                        {label:'CPM',data:daily.map(d=>+d.cpm.toFixed(2)),borderColor:'#fcd34d',backgroundColor:'rgba(252,211,77,.06)',fill:true,tension:.4,yAxisID:'y1',pointRadius:2,borderWidth:2}
                      ]}} options={chartOpts(true)}/>
                    </div>
                  </div>
                </div>
              )}

              {(overview.vid25>0||overview.vid50>0) && (
                <div style={{background:'#111116',border:'1px solid #1a1a22',borderRadius:'10px',padding:'20px',marginBottom:'24px'}}>
                  <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'16px'}}>Embudo de video</div>
                  <div style={{display:'flex',gap:'8px',alignItems:'flex-end',height:'140px',paddingBottom:'24px'}}>
                    {[{l:'25%',v:overview.vid25,color:'#6ee7b7'},{l:'50%',v:overview.vid50,color:'#3b82f6'},{l:'75%',v:overview.vid75,color:'#f97316'},{l:'100%',v:overview.vid100,color:'#f87171'}].map((b,i,arr)=>{
                      const max=arr[0].v||1; const pct=Math.round(b.v/max*100)
                      return (
                        <div key={b.l} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
                          <div style={{fontSize:'11px',color:'#fff',fontWeight:'700'}}>{fmtN(b.v)}</div>
                          <div style={{width:'100%',height:Math.max(pct*.8,4)+'px',background:b.color,borderRadius:'4px 4px 0 0',opacity:.8}}></div>
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
              {campaigns.length>1 && (
                <div style={{background:'#111116',border:'1px solid #1a1a22',borderRadius:'10px',padding:'20px',marginBottom:'16px'}}>
                  <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'16px'}}>CTR por campana</div>
                  <div style={{height:'180px'}}>
                    <Bar data={{labels:campaigns.map(c=>c.name.length>20?c.name.slice(0,20)+'...':c.name),datasets:[{label:'CTR %',data:campaigns.map(c=>+c.ctr.toFixed(2)),backgroundColor:'rgba(110,231,183,.5)',borderColor:'#6ee7b7',borderWidth:1,borderRadius:4}]}} options={chartOpts()}/>
                  </div>
                </div>
              )}
              {campaigns.map((c,i)=><RowCard key={i} name={c.name} sub={c.objective} row={c}/>)}
              {campaigns.length===0&&<div style={{textAlign:'center',padding:'60px 0',color:'#444',fontFamily:'monospace'}}>Sin datos para este periodo</div>}
            </>
          )}

          {activeTab==='conjuntos' && (
            <>
              {adsets.map((a,i)=><RowCard key={i} name={a.name} sub={a.campaign} row={a}/>)}
              {adsets.length===0&&<div style={{textAlign:'center',padding:'60px 0',color:'#444',fontFamily:'monospace'}}>Sin datos para este periodo</div>}
            </>
          )}

          {activeTab==='anuncios' && (
            <>
              {ads.length>0 && (
                <div style={{background:'rgba(167,139,250,.05)',border:'1px solid rgba(167,139,250,.15)',borderRadius:'8px',padding:'10px 16px',marginBottom:'16px',fontSize:'11px',color:'#a78bfa',fontFamily:'monospace'}}>
                  🎯 Score de creativos — haz clic en cada anuncio para ver el diagnostico detallado y recomendaciones
                </div>
              )}
              {[...ads].sort((a,b)=>qualityScore(b)-qualityScore(a)).map((a,i)=><AdScoreCard key={i} ad={a}/>)}
              {ads.length===0&&<div style={{textAlign:'center',padding:'60px 0',color:'#444',fontFamily:'monospace'}}>Sin datos para este periodo</div>}
            </>
          )}
        </div>
      )}
    </main>
  )
}
