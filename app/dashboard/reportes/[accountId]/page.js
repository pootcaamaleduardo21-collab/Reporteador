'use client'
import React, { Suspense, useEffect, useState, useRef } from 'react'
import { usePlan } from '../../../lib/usePlan'
import ProGate from '../../../components/ProGate'
import PDFExportModal from '../../../components/PDFExportModal'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler)

const ALL_PRESETS = [
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
  OUTCOME_APP_PROMOTION: { label: 'App', resultTypes: ['traffic','engagement'] },
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

const doughnutOpts = {
  responsive:true, maintainAspectRatio:false,
  plugins:{
    legend:{position:'right',labels:{color:'#888',font:{family:'Inter',size:11},boxWidth:10,padding:12}},
    tooltip:{backgroundColor:'#1a1a1e',borderColor:'#2a2a35',borderWidth:1,titleColor:'#fff',bodyColor:'#888',padding:10,cornerRadius:8}
  }
}

const hBarOpts = (tickPrefix='') => ({
  indexAxis:'y',
  responsive:true, maintainAspectRatio:false,
  plugins:{
    legend:{display:false},
    tooltip:{backgroundColor:'#1a1a1e',borderColor:'#2a2a35',borderWidth:1,titleColor:'#fff',bodyColor:'#888',padding:12,cornerRadius:8}
  },
  scales:{
    x:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#444',font:{size:10},callback:(v)=>tickPrefix?tickPrefix+v:v}},
    y:{grid:{display:false},ticks:{color:'#ddd',font:{size:12,family:'Plus Jakarta Sans, sans-serif'}}}
  }
})

const COLORS = ['#6ee7b7','#3b82f6','#f97316','#a78bfa','#fcd34d','#f87171','#ec4899','#14b8a6','#84cc16','#f59e0b']

const qualityScore = (row) => {
  if (!row) return 0
  let s = 0
  if (row.ctr>=2) s+=20; else if(row.ctr>=1) s+=10
  if (row.frequency<=2) s+=20; else if(row.frequency<=3.5) s+=10
  if (row.cpm<=50) s+=15; else if(row.cpm<=100) s+=8
  if (row.results>0) s+=15
  if (row.hookRate>=25) s+=15; else if(row.hookRate>=15) s+=8
  if (row.holdRate>=40) s+=15; else if(row.holdRate>=25) s+=8
  return Math.min(s,100)
}
const qualityLabel = s => s>=75?{label:'Excelente',color:'#6ee7b7'}:s>=50?{label:'Bueno',color:'#fcd34d'}:{label:'Mejorar',color:'#f87171'}
const delta = (curr, prev) => { if (!prev||prev===0) return null; const pct = ((curr-prev)/prev*100).toFixed(1); return { pct, up: curr>=prev } }

// ── Google Ads quality & diagnosis ──────────────────────────
const GADS_BENCHMARKS = { SEARCH:{ctr:3,cpm:50}, DISPLAY:{ctr:0.35,cpm:5}, VIDEO:{ctr:0.5,cpm:10}, SHOPPING:{ctr:0.8,cpm:30}, PERFORMANCE_MAX:{ctr:1,cpm:20} }
const gadsQualityScore = (row) => {
  if (!row) return 0
  const bench = GADS_BENCHMARKS[row.channelType] || GADS_BENCHMARKS.SEARCH
  let s = 0
  if (row.ctr >= bench.ctr*2) s+=25; else if(row.ctr>=bench.ctr) s+=15; else if(row.ctr>0) s+=5
  if (row.conversions>10) s+=25; else if(row.conversions>3) s+=18; else if(row.conversions>0) s+=10
  const cr = row.clicks>0 ? row.conversions/row.clicks*100 : 0
  if (cr>=5) s+=25; else if(cr>=2) s+=15; else if(cr>=1) s+=8
  if (row.spend>0&&row.convValue>0) { const r=row.convValue/row.spend; if(r>=3) s+=25; else if(r>=2) s+=15; else if(r>=1) s+=5 }
  return Math.min(s,100)
}
const diagnoseGads = (row) => {
  const issues=[], wins=[]
  const bench = GADS_BENCHMARKS[row.channelType] || GADS_BENCHMARKS.SEARCH
  const isSearch = row.channelType==='SEARCH'
  const cr = row.clicks>0 ? (row.conversions/row.clicks*100) : 0
  if (row.ctr<bench.ctr/2) issues.push({t:'R',msg:`CTR muy bajo (${row.ctr.toFixed(2)}%)`,action:isSearch?'Mejora títulos, descripciones y extensiones':'Renueva el creativo — imagen o video'})
  else if(row.ctr<bench.ctr) issues.push({t:'Y',msg:`CTR mejorable (${row.ctr.toFixed(2)}%)`,action:'Prueba variaciones de copy o segmentación más específica'})
  else wins.push({t:'G',msg:`CTR excelente (${row.ctr.toFixed(2)}%)`,action:'Escala el presupuesto 20-30% gradualmente'})
  if (row.conversions===0&&row.spend>200) issues.push({t:'R',msg:'Sin conversiones con gasto significativo',action:'Verifica el tracking de conversiones y la landing page'})
  else if(row.conversions===0&&row.spend>50) issues.push({t:'Y',msg:'Sin conversiones aún',action:'Dale más tiempo o revisa la segmentación y el mensaje'})
  else if(row.conversions>0) { const cpa=row.spend/row.conversions; wins.push({t:'G',msg:`${row.conversions.toFixed(1)} conversiones · CPA: $${cpa.toFixed(0)}`,action:'Mantén activo y escala si el CPA es rentable'}) }
  if (cr>0&&cr<1) issues.push({t:'Y',msg:`Tasa de conversión baja (${cr.toFixed(1)}%)`,action:'Mejora la landing page y el llamado a la acción'})
  else if(cr>=5) wins.push({t:'G',msg:`Excelente tasa de conversión (${cr.toFixed(1)}%)`,action:'La landing convierte muy bien — escala tráfico'})
  if (row.spend>0&&row.convValue>0) { const roas=row.convValue/row.spend; if(roas<1) issues.push({t:'R',msg:`ROAS negativo (${roas.toFixed(2)}x)`,action:'El costo supera el valor generado — revisa precios y márgenes'}); else if(roas>=3) wins.push({t:'G',msg:`ROAS excelente (${roas.toFixed(2)}x)`,action:'Campaña muy rentable — aumenta presupuesto agresivamente'}) }
  return {issues,wins}
}
const GadsDiagPanel = ({row}) => {
  const {issues,wins} = diagnoseGads(row)
  const all = [...wins,...issues]
  if (all.length===0) return <div style={{fontSize:'11px',color:'#444',fontFamily:'monospace',padding:'8px'}}>Sin datos suficientes para diagnosticar</div>
  const colors={R:'#f87171',Y:'#fcd34d',G:'#6ee7b7'}
  const bgs={R:'rgba(248,113,113,.04)',Y:'rgba(252,211,77,.04)',G:'rgba(110,231,183,.05)'}
  const borders={R:'rgba(248,113,113,.1)',Y:'rgba(252,211,77,.1)',G:'rgba(110,231,183,.15)'}
  return (
    <div style={{borderTop:'1px solid #1a1a22',paddingTop:'12px',marginTop:'8px'}}>
      <div style={{fontSize:'9px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'8px'}}>Diagnóstico</div>
      {all.map((item,i)=>(
        <div key={i} style={{display:'flex',gap:'8px',marginBottom:'6px',padding:'8px 12px',background:bgs[item.t],borderRadius:'6px',border:'1px solid '+borders[item.t]}}>
          <span style={{fontSize:'10px',color:colors[item.t],fontWeight:'800',flexShrink:0,fontFamily:'monospace',minWidth:'16px'}}>{item.t==='G'?'OK':item.t==='Y'?'!':'!!'}</span>
          <div>
            <div style={{fontSize:'12px',color:colors[item.t],fontWeight:'600',marginBottom:'2px'}}>{item.msg}</div>
            <div style={{fontSize:'11px',color:'#444',fontFamily:'monospace'}}>Acción: {item.action}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

const diagnoseCampaign = (row) => {
  const issues = [], wins = []
  if (row.frequency > 3.5) issues.push({ t:'R', msg:'Fatiga publicitaria detectada', action:'Pausa anuncios con frecuencia >3.5 y lanza nuevos creativos esta semana' })
  else if (row.frequency > 2.5) issues.push({ t:'Y', msg:'Frecuencia elevada', action:'Prepara nuevos creativos antes de que el rendimiento caiga' })
  if (row.ctr < 0.5) issues.push({ t:'R', msg:'CTR muy bajo — el creativo no engancha', action:'Cambia la imagen/video y el copy del primer segundo' })
  else if (row.ctr < 1) issues.push({ t:'Y', msg:'CTR mejorable', action:'Prueba un hook mas directo o una oferta mas clara' })
  else if (row.ctr >= 2) wins.push({ t:'G', msg:'CTR excelente', action:'Escala el presupuesto 20-30% cada 3 dias' })
  if (row.hookRate > 0) {
    if (row.hookRate < 15) issues.push({ t:'R', msg:'Hook Rate bajo ('+row.hookRate.toFixed(1)+'%) — el video no detiene el scroll', action:'Cambia los primeros 3 segundos del video completamente' })
    else if (row.hookRate < 25) issues.push({ t:'Y', msg:'Hook Rate mejorable ('+row.hookRate.toFixed(1)+'%)', action:'Prueba un hook mas impactante: pregunta, estadistica o situacion reconocible' })
    else wins.push({ t:'G', msg:'Hook Rate solido ('+row.hookRate.toFixed(1)+'%)', action:'El gancho funciona — mantener y probar variaciones del cuerpo del video' })
  }
  if (row.holdRate > 0) {
    if (row.holdRate < 25) issues.push({ t:'R', msg:'Hold Rate bajo ('+row.holdRate.toFixed(1)+'%) — la gente abandona el video rapido', action:'El gancho funciona pero el contenido no engancha — edita el ritmo y agrega subtitulos' })
    else if (row.holdRate >= 40) wins.push({ t:'G', msg:'Hold Rate excelente ('+row.holdRate.toFixed(1)+'%)', action:'El video retiene muy bien — considera usarlo en mas conjuntos y aumentar presupuesto' })
  }
  if (row.cpm > 150) issues.push({ t:'R', msg:'CPM muy alto — audiencia saturada o puja competitiva', action:'Amplia la segmentacion o prueba otras ubicaciones' })
  else if (row.cpm > 100) issues.push({ t:'Y', msg:'CPM elevado', action:'Revisa la segmentacion y considera ampliar la audiencia' })
  if (row.results > 0 && row.cpr > 0) wins.push({ t:'G', msg:'Generando resultados — CPR: '+fmt$(row.cpr), action:'Mantener activo y escalar si el CPR es rentable para el cliente' })
  if (row.results === 0 && row.spend > 50) issues.push({ t:'R', msg:'Sin resultados con gasto significativo', action:'Revisa el objetivo, la segmentacion y la landing/formulario' })
  return { issues, wins }
}

const DiagPanel = ({ row }) => {
  const diag = diagnoseCampaign(row)
  const all = [...diag.wins, ...diag.issues]
  if (all.length === 0) return <div style={{fontSize:'11px',color:'#444',fontFamily:'monospace',padding:'8px'}}>Sin datos suficientes para diagnosticar</div>
  const colors = { R:'#f87171', Y:'#fcd34d', G:'#6ee7b7' }
  const bgs = { R:'rgba(248,113,113,.04)', Y:'rgba(252,211,77,.04)', G:'rgba(110,231,183,.05)' }
  const borders = { R:'rgba(248,113,113,.1)', Y:'rgba(252,211,77,.1)', G:'rgba(110,231,183,.15)' }
  return (
    <div style={{borderTop:'1px solid #1a1a22',paddingTop:'12px',marginTop:'8px'}}>
      <div style={{fontSize:'9px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'8px'}}>Diagnostico y recomendaciones</div>
      {all.map((item,i)=>(
        <div key={i} style={{display:'flex',gap:'8px',marginBottom:'6px',padding:'8px 12px',background:bgs[item.t],borderRadius:'6px',border:'1px solid '+borders[item.t]}}>
          <span style={{fontSize:'10px',color:colors[item.t],fontWeight:'800',flexShrink:0,fontFamily:'monospace',minWidth:'16px'}}>{item.t==='G'?'OK':item.t==='Y'?'!':'!!'}</span>
          <div>
            <div style={{fontSize:'12px',color:colors[item.t],fontWeight:'600',marginBottom:'2px'}}>{item.msg}</div>
            <div style={{fontSize:'11px',color:'#444',fontFamily:'monospace'}}>Accion: {item.action}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

const MetricCard = ({l,v,sub,alert,pos,prev,comparing,help}) => {
  const d = (comparing && prev!=null) ? delta(parseFloat(String(v).replace(/[^0-9.-]/g,''))||0, prev) : null
  return (
    <div className="metric-card" style={{background:'var(--sidebar)',border:'1px solid '+(alert?'rgba(248,113,113,.3)':pos?'rgba(110,231,183,.25)':'var(--border)'),borderRadius:'10px',padding:'16px',position:'relative',transition:'border-color .15s'}}>
      <div style={{display:'flex',alignItems:'center',gap:'4px',marginBottom:'8px'}}>
        <div style={{fontSize:'10px',color:'var(--text4)',textTransform:'uppercase',letterSpacing:'.07em',fontWeight:'600'}}>{l}</div>
        {help&&<div style={{width:'14px',height:'14px',borderRadius:'50%',background:'rgba(255,255,255,.06)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'8px',color:'var(--text4)',cursor:'help',flexShrink:0,border:'1px solid rgba(255,255,255,.08)'}}>?</div>}
      </div>
      {help&&(
        <div className="metric-help" style={{position:'absolute',top:'100%',left:0,right:0,background:'#18181f',border:'1px solid #2a2a35',borderRadius:'8px',padding:'10px 12px',zIndex:100,fontSize:'11px',color:'#888',lineHeight:'1.5',boxShadow:'0 8px 20px rgba(0,0,0,.5)',marginTop:'4px'}}>
          {help}
        </div>
      )}
      <div style={{fontSize:'22px',fontWeight:'800',color:alert?'#f87171':pos?'#6ee7b7':'var(--text)',marginBottom:'4px',lineHeight:1}}>{v}</div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:'4px'}}>
        <div style={{fontSize:'10px',color:alert?'rgba(248,113,113,.6)':pos?'rgba(110,231,183,.6)':'var(--text4)'}}>{sub}</div>
        {d && <div style={{fontSize:'10px',color:d.up?'#6ee7b7':'#f87171',fontWeight:'700'}}>{d.up?'↑':'↓'}{Math.abs(d.pct)}%</div>}
      </div>
    </div>
  )
}

const MiniMetric = ({l,v,alert,pos,info}) => (
  <div style={{background:'rgba(255,255,255,.03)',borderRadius:'6px',padding:'8px 10px',border:'1px solid '+(alert?'rgba(248,113,113,.2)':pos?'rgba(110,231,183,.15)':'rgba(255,255,255,.05)')}}>
    <div style={{fontSize:'9px',color:'var(--text4)',fontFamily:'monospace',marginBottom:'3px',textTransform:'uppercase',letterSpacing:'.05em'}}>{l}</div>
    <div style={{fontSize:'13px',fontWeight:'700',color:alert?'#f87171':pos?'#6ee7b7':'var(--text)'}}>{v}</div>
  </div>
)

const VideoMetrics = ({ row }) => {
  if (!row.vid3s && !row.vid25) return null
  return (
    <div style={{marginTop:'12px',borderTop:'1px solid #1a1a22',paddingTop:'12px'}}>
      <div style={{fontSize:'9px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'10px'}}>Metricas de video</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(90px,1fr))',gap:'6px',marginBottom:'10px'}}>
        <div style={{background:'#0d0d12',borderRadius:'6px',padding:'8px 10px',border:'1px solid '+(row.hookRate>=25?'rgba(110,231,183,.15)':row.hookRate>0&&row.hookRate<15?'rgba(248,113,113,.15)':'transparent')}}>
          <div style={{fontSize:'9px',color:'#444',fontFamily:'monospace',marginBottom:'3px'}}>Hook Rate</div>
          <div style={{fontSize:'14px',fontWeight:'800',color:row.hookRate>=25?'#6ee7b7':row.hookRate>0&&row.hookRate<15?'#f87171':'#fff'}}>{row.hookRate>0?row.hookRate.toFixed(1)+'%':'—'}</div>
          <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace'}}>ref: 25%+ bueno</div>
        </div>
        <div style={{background:'#0d0d12',borderRadius:'6px',padding:'8px 10px',border:'1px solid '+(row.holdRate>=40?'rgba(110,231,183,.15)':row.holdRate>0&&row.holdRate<25?'rgba(248,113,113,.15)':'transparent')}}>
          <div style={{fontSize:'9px',color:'#444',fontFamily:'monospace',marginBottom:'3px'}}>Hold Rate</div>
          <div style={{fontSize:'14px',fontWeight:'800',color:row.holdRate>=40?'#6ee7b7':row.holdRate>0&&row.holdRate<25?'#f87171':'#fff'}}>{row.holdRate>0?row.holdRate.toFixed(1)+'%':'—'}</div>
          <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace'}}>ref: 40%+ bueno</div>
        </div>
        {row.vid3s>0&&<MiniMetric l='3s views' v={fmtN(row.vid3s)}/>}
        {row.vid25>0&&<MiniMetric l='25% visto' v={fmtN(row.vid25)}/>}
        {row.vid50>0&&<MiniMetric l='50% visto' v={fmtN(row.vid50)}/>}
        {row.vid75>0&&<MiniMetric l='75% visto' v={fmtN(row.vid75)}/>}
        {row.vid100>0&&<MiniMetric l='Completo' v={fmtN(row.vid100)}/>}
      </div>
      {row.vid25>0&&(
        <div style={{display:'flex',gap:'4px',alignItems:'flex-end',height:'50px'}}>
          {[{l:'25%',v:row.vid25,c:'#6ee7b7'},{l:'50%',v:row.vid50,c:'#3b82f6'},{l:'75%',v:row.vid75,c:'#f97316'},{l:'100%',v:row.vid100,c:'#f87171'}].map((b,i,arr)=>{
            const max=arr[0].v||1; const pct=Math.round(b.v/max*100)
            return (
              <div key={b.l} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
                <div style={{fontSize:'9px',color:'#fff',fontWeight:'700'}}>{pct}%</div>
                <div style={{width:'100%',height:Math.max(pct*.3,2)+'px',background:b.c,borderRadius:'2px 2px 0 0',opacity:.8}}></div>
                <div style={{fontSize:'9px',color:'#444',fontFamily:'monospace'}}>{b.l}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Generic Google Ads card (expandable) ───────────────────
const CampCard = ({ title, subtitle, status, statusOk, children }) => {
  const [open, setOpen] = React.useState(false)
  return (
    <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'16px 20px',marginBottom:'8px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',flexWrap:'wrap',gap:'8px',marginBottom:open?'12px':'0'}} onClick={()=>setOpen(!open)}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'2px'}}>
            <div style={{color:'#fff',fontSize:'13px',fontWeight:'700',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{title}</div>
            {status && <span style={{fontSize:'9px',fontFamily:'monospace',padding:'2px 7px',borderRadius:'3px',background:statusOk?'rgba(110,231,183,.12)':'rgba(255,255,255,.06)',color:statusOk?'#6ee7b7':'#555',border:`1px solid ${statusOk?'rgba(110,231,183,.25)':'rgba(255,255,255,.08)'}`}}>{status}</span>}
          </div>
          {subtitle && <div style={{color:'#555',fontSize:'10px',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{subtitle}</div>}
        </div>
        <div style={{color:'#444',fontSize:'14px',flexShrink:0}}>{open?'▲':'▼'}</div>
      </div>
      {open && children}
    </div>
  )
}

const EmptyState = ({icon,title,sub}) => (
  <div style={{textAlign:'center',padding:'60px 20px',color:'var(--text4)'}}>
    <div style={{fontSize:'32px',marginBottom:'12px'}}>{icon}</div>
    <div style={{fontSize:'14px',fontWeight:'700',color:'var(--text)',marginBottom:'6px'}}>{title}</div>
    {sub && <div style={{fontSize:'12px',color:'var(--text4)'}}>{sub}</div>}
  </div>
)

const ExpandCard = ({ name, sub, badge, row }) => {
  const [open, setOpen] = React.useState(false)
  const qs = qualityScore(row); const ql = qualityLabel(qs)
  return (
    <div style={{background:'var(--sidebar)',border:'1px solid '+(qs>=75?'rgba(110,231,183,.2)':qs>=50?'rgba(252,211,77,.15)':'rgba(248,113,113,.18)'),borderRadius:'10px',padding:'16px 20px',marginBottom:'8px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',flexWrap:'wrap',gap:'8px'}} onClick={()=>setOpen(!open)}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'2px'}}>
            <div style={{color:'#fff',fontSize:'13px',fontWeight:'700',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</div>
            {badge&&<span style={{fontSize:'9px',fontFamily:'monospace',color:'#555',background:'#18181f',padding:'2px 6px',borderRadius:'3px',flexShrink:0}}>{badge}</span>}
          </div>
          {sub&&<div style={{color:'#333',fontSize:'10px',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sub}</div>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'12px',flexShrink:0}}>
          <div style={{textAlign:'center',background:qs>=75?'rgba(110,231,183,.08)':qs>=50?'rgba(252,211,77,.08)':'rgba(248,113,113,.08)',borderRadius:'8px',padding:'6px 10px',border:'1px solid '+(qs>=75?'rgba(110,231,183,.2)':qs>=50?'rgba(252,211,77,.15)':'rgba(248,113,113,.2)')}}>
            <div style={{fontSize:'16px',fontWeight:'800',color:ql.color}}>{qs}</div>
            <div style={{fontSize:'9px',color:ql.color,fontFamily:'monospace'}}>{ql.label}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:'16px',fontWeight:'800',color:'#fff'}}>{fmt$(row.spend)}</div>
            <div style={{fontSize:'10px',color:row.results>0?'#6ee7b7':'#555',fontFamily:'monospace'}}>{fmtN(row.results)} resultados</div>
          </div>
          <div style={{color:'#444',fontSize:'14px'}}>{open?'▲':'▼'}</div>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(80px,1fr))',gap:'6px',marginTop:'10px'}}>
        {[
          {l:'CTR',v:fmtP(row.ctr),alert:row.ctr<1,pos:row.ctr>=2},
          {l:'CPM',v:fmt$(row.cpm),alert:row.cpm>150},
          {l:'CPC',v:fmt$(row.cpc)},
          {l:'C/Resultado',v:row.cpr>0?fmt$(row.cpr):'—'},
          {l:'Frecuencia',v:(+row.frequency).toFixed(2),alert:row.frequency>3.5,pos:row.frequency<=2},
          {l:'Hook Rate',v:row.hookRate>0?row.hookRate.toFixed(1)+'%':'—',pos:row.hookRate>=25,alert:row.hookRate>0&&row.hookRate<15},
          {l:'Hold Rate',v:row.holdRate>0?row.holdRate.toFixed(1)+'%':'—',pos:row.holdRate>=40,alert:row.holdRate>0&&row.holdRate<25},
          {l:'Alcance',v:fmtN(row.reach)},
          {l:'Impresiones',v:fmtN(row.impressions)},
          {l:'Clics',v:fmtN(row.clicks)},
          {l:'Reacciones',v:fmtN(row.reactions)},
          {l:'Comentarios',v:fmtN(row.comments)},
          {l:'Guardados',v:fmtN(row.saves)},
          {l:'Shares',v:fmtN(row.shares)},
        ].map(m=><MiniMetric key={m.l} {...m}/>)}
      </div>
      {open&&(
        <>
          <DiagPanel row={row}/>
          <VideoMetrics row={row}/>
        </>
      )}
    </div>
  )
}

const AdScoreCard = ({ ad }) => {
  const [open, setOpen] = React.useState(false)
  const qs = qualityScore(ad); const ql = qualityLabel(qs)
  const diag = diagnoseCampaign(ad)
  const all = [...diag.wins,...diag.issues]
  const colors = { R:'#f87171', Y:'#fcd34d', G:'#6ee7b7' }
  const bgs = { R:'rgba(248,113,113,.04)', Y:'rgba(252,211,77,.04)', G:'rgba(110,231,183,.05)' }
  const borders = { R:'rgba(248,113,113,.1)', Y:'rgba(252,211,77,.1)', G:'rgba(110,231,183,.15)' }
  return (
    <div style={{background:'var(--sidebar)',border:'1px solid '+(qs>=75?'rgba(110,231,183,.2)':qs>=50?'rgba(252,211,77,.15)':'rgba(248,113,113,.2)'),borderRadius:'10px',padding:'16px 20px',marginBottom:'8px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px',flexWrap:'wrap',gap:'8px',cursor:'pointer'}} onClick={()=>setOpen(!open)}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'2px'}}>
            <div style={{width:'7px',height:'7px',borderRadius:'50%',background:ad.status==='ACTIVE'?'#6ee7b7':ad.status==='PAUSED'?'#fcd34d':'#555',flexShrink:0}}></div>
            <div style={{color:'#fff',fontSize:'13px',fontWeight:'700',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ad.name}</div>
            <span style={{fontSize:'9px',fontFamily:'monospace',color:ad.status==='ACTIVE'?'#6ee7b7':ad.status==='PAUSED'?'#fcd34d':'#555',flexShrink:0}}>{ad.status==='ACTIVE'?'ACTIVO':ad.status==='PAUSED'?'PAUSADO':'INACTIVO'}</span>
          </div>
          <div style={{color:'#333',fontSize:'10px',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingLeft:'15px'}}>{ad.adset} - {ad.campaign}</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'12px',flexShrink:0}}>
          <div style={{textAlign:'center',background:qs>=75?'rgba(110,231,183,.08)':qs>=50?'rgba(252,211,77,.08)':'rgba(248,113,113,.08)',borderRadius:'8px',padding:'6px 12px',border:'1px solid '+(qs>=75?'rgba(110,231,183,.2)':qs>=50?'rgba(252,211,77,.15)':'rgba(248,113,113,.2)')}}>
            <div style={{fontSize:'18px',fontWeight:'800',color:ql.color}}>{qs}</div>
            <div style={{fontSize:'9px',color:ql.color,fontFamily:'monospace'}}>/100</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:'16px',fontWeight:'800',color:'#fff'}}>{fmt$(ad.spend)}</div>
            <div style={{fontSize:'10px',color:ad.results>0?'#6ee7b7':'#555',fontFamily:'monospace'}}>{fmtN(ad.results)} resultados</div>
          </div>
          <div style={{color:'#444',fontSize:'14px'}}>{open?'▲':'▼'}</div>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(80px,1fr))',gap:'6px'}}>
        {[
          {l:'CTR',v:fmtP(ad.ctr),alert:ad.ctr<1,pos:ad.ctr>=2},
          {l:'Hook Rate',v:ad.hookRate>0?ad.hookRate.toFixed(1)+'%':'—',pos:ad.hookRate>=25,alert:ad.hookRate>0&&ad.hookRate<15},
          {l:'Hold Rate',v:ad.holdRate>0?ad.holdRate.toFixed(1)+'%':'—',pos:ad.holdRate>=40,alert:ad.holdRate>0&&ad.holdRate<25},
          {l:'CPM',v:fmt$(ad.cpm),alert:ad.cpm>150},
          {l:'CPC',v:fmt$(ad.cpc)},
          {l:'C/Resultado',v:ad.cpr>0?fmt$(ad.cpr):'—'},
          {l:'Frecuencia',v:(+ad.frequency).toFixed(2),alert:ad.frequency>3.5,pos:ad.frequency<=2},
          {l:'Alcance',v:fmtN(ad.reach)},
          {l:'Reacciones',v:fmtN(ad.reactions)},
          {l:'Comentarios',v:fmtN(ad.comments)},
          {l:'Guardados',v:fmtN(ad.saves)},
          {l:'Shares',v:fmtN(ad.shares)},
        ].map(m=><MiniMetric key={m.l} {...m}/>)}
      </div>
      {open&&(
        <div style={{borderTop:'1px solid #1a1a22',paddingTop:'12px',marginTop:'12px'}}>
          {all.map((item,i)=>(
            <div key={i} style={{display:'flex',gap:'8px',marginBottom:'6px',padding:'8px 12px',background:bgs[item.t],borderRadius:'6px',border:'1px solid '+borders[item.t]}}>
              <span style={{fontSize:'10px',color:colors[item.t],fontWeight:'800',flexShrink:0,fontFamily:'monospace',minWidth:'16px'}}>{item.t==='G'?'OK':item.t==='Y'?'!':'!!'}</span>
              <div>
                <div style={{fontSize:'12px',color:colors[item.t],fontWeight:'600',marginBottom:'2px'}}>{item.msg}</div>
                <div style={{fontSize:'11px',color:'#444',fontFamily:'monospace'}}>Accion: {item.action}</div>
              </div>
            </div>
          ))}
          <VideoMetrics row={ad}/>
        </div>
      )}
    </div>
  )
}

const COUNTRY_COORDS = {
  MX:{lat:23.6345,lng:-102.5528,name:'Mexico'},
  US:{lat:37.0902,lng:-95.7129,name:'Estados Unidos'},
  CO:{lat:4.5709,lng:-74.2973,name:'Colombia'},
  AR:{lat:-38.4161,lng:-63.6167,name:'Argentina'},
  CL:{lat:-35.6751,lng:-71.543,name:'Chile'},
  PE:{lat:-9.19,lng:-75.0152,name:'Peru'},
  ES:{lat:40.4637,lng:-3.7492,name:'Espana'},
  BR:{lat:-14.235,lng:-51.9253,name:'Brasil'},
  GT:{lat:15.7835,lng:-90.2308,name:'Guatemala'},
  EC:{lat:-1.8312,lng:-78.1834,name:'Ecuador'},
  VE:{lat:6.4238,lng:-66.5897,name:'Venezuela'},
  BO:{lat:-16.2902,lng:-63.5887,name:'Bolivia'},
  UY:{lat:-32.5228,lng:-55.7658,name:'Uruguay'},
  PY:{lat:-23.4425,lng:-58.4438,name:'Paraguay'},
  CR:{lat:9.7489,lng:-83.7534,name:'Costa Rica'},
  PA:{lat:8.538,lng:-80.7821,name:'Panama'},
  HN:{lat:15.2,lng:-86.2419,name:'Honduras'},
  SV:{lat:13.7942,lng:-88.8965,name:'El Salvador'},
  DO:{lat:18.7357,lng:-70.1627,name:'Rep. Dominicana'},
  PR:{lat:18.2208,lng:-66.5901,name:'Puerto Rico'},
  GB:{lat:55.3781,lng:-3.436,name:'Reino Unido'},
  CA:{lat:56.1304,lng:-106.3468,name:'Canada'},
  DE:{lat:51.1657,lng:10.4515,name:'Alemania'},
  FR:{lat:46.2276,lng:2.2137,name:'Francia'},
  IT:{lat:41.8719,lng:12.5674,name:'Italia'},
  PT:{lat:39.3999,lng:-8.2245,name:'Portugal'},
}

const MapChart = ({ countryData, regionData }) => {
  const mapRef = React.useRef(null)
  const mapInstanceRef = React.useRef(null)

  const RC = {
    'Ciudad de Mexico':{lat:19.4326,lng:-99.1332},'Ciudad de México':{lat:19.4326,lng:-99.1332},
    'Distrito Federal':{lat:19.4326,lng:-99.1332},'Mexico City':{lat:19.4326,lng:-99.1332},
    'Estado de Mexico':{lat:19.2952,lng:-99.8938},'State of Mexico':{lat:19.2952,lng:-99.8938},'Mexico State':{lat:19.2952,lng:-99.8938},
    'Jalisco':{lat:20.6597,lng:-103.3496},'Guadalajara':{lat:20.6597,lng:-103.3496},
    'Nuevo Leon':{lat:25.5922,lng:-99.9962},'Nuevo León':{lat:25.5922,lng:-99.9962},'Monterrey':{lat:25.6866,lng:-100.3161},
    'Veracruz':{lat:19.1738,lng:-96.1342},'Veracruz-Llave':{lat:19.1738,lng:-96.1342},
    'Puebla':{lat:19.0414,lng:-98.2063},
    'Guanajuato':{lat:21.019,lng:-101.2574},
    'Chihuahua':{lat:28.6353,lng:-106.0889},
    'Baja California':{lat:30.8406,lng:-115.2838},
    'Sonora':{lat:29.2972,lng:-110.3309},
    'Tamaulipas':{lat:24.2669,lng:-98.8363},
    'Sinaloa':{lat:25.1721,lng:-107.4795},
    'Coahuila':{lat:27.0587,lng:-101.7068},'Coahuila de Zaragoza':{lat:27.0587,lng:-101.7068},
    'Oaxaca':{lat:17.0732,lng:-96.7266},
    'Chiapas':{lat:16.7569,lng:-93.1292},
    'Michoacan':{lat:19.5665,lng:-101.7068},'Michoacán':{lat:19.5665,lng:-101.7068},'Michoacán de Ocampo':{lat:19.5665,lng:-101.7068},
    'Guerrero':{lat:17.4392,lng:-99.5451},
    'Hidalgo':{lat:20.0911,lng:-98.7624},
    'Morelos':{lat:18.6813,lng:-99.1013},
    'Tabasco':{lat:17.8409,lng:-92.6189},
    'Yucatan':{lat:20.7099,lng:-89.0943},'Yucatán':{lat:20.7099,lng:-89.0943},
    'Queretaro':{lat:20.5888,lng:-100.3899},'Querétaro':{lat:20.5888,lng:-100.3899},
    'San Luis Potosi':{lat:22.1565,lng:-100.9855},'San Luis Potosí':{lat:22.1565,lng:-100.9855},
    'Durango':{lat:24.0277,lng:-104.6532},
    'Zacatecas':{lat:22.7709,lng:-102.5832},
    'Aguascalientes':{lat:21.8853,lng:-102.2916},
    'Nayarit':{lat:21.7514,lng:-104.8455},
    'Tlaxcala':{lat:19.3182,lng:-98.2375},
    'Colima':{lat:19.2452,lng:-103.7241},
    'Campeche':{lat:19.8301,lng:-90.5349},
    'Quintana Roo':{lat:19.1817,lng:-88.4791},
    'Baja California Sur':{lat:23.7369,lng:-110.7563},
    'Bogota':{lat:4.711,lng:-74.0721},'Cundinamarca':{lat:4.711,lng:-74.0721},
    'Antioquia':{lat:6.2442,lng:-75.5812},
    'Valle del Cauca':{lat:3.4516,lng:-76.532},
    'Buenos Aires':{lat:-34.6037,lng:-58.3816},
    'Santiago':{lat:-33.4489,lng:-70.6693},
    'Lima':{lat:-12.0464,lng:-77.0428},
    'Sao Paulo':{lat:-23.5505,lng:-46.6333},
    'Madrid':{lat:40.4168,lng:-3.7038},
    'Miami':{lat:25.7617,lng:-80.1918},
    'Texas':{lat:31.9686,lng:-99.9018},
    'California':{lat:36.7783,lng:-119.4179},
    'Florida':{lat:27.6648,lng:-81.5158},
  }

  const CC = {
    MX:{lat:23.6345,lng:-102.5528,name:'Mexico'},
    US:{lat:37.0902,lng:-95.7129,name:'Estados Unidos'},
    CO:{lat:4.5709,lng:-74.2973,name:'Colombia'},
    AR:{lat:-38.4161,lng:-63.6167,name:'Argentina'},
    CL:{lat:-35.6751,lng:-71.543,name:'Chile'},
    PE:{lat:-9.19,lng:-75.0152,name:'Peru'},
    ES:{lat:40.4637,lng:-3.7492,name:'Espana'},
    BR:{lat:-14.235,lng:-51.9253,name:'Brasil'},
    GT:{lat:15.7835,lng:-90.2308,name:'Guatemala'},
    EC:{lat:-1.8312,lng:-78.1834,name:'Ecuador'},
    VE:{lat:6.4238,lng:-66.5897,name:'Venezuela'},
    DO:{lat:18.7357,lng:-70.1627,name:'Rep. Dominicana'},
    GB:{lat:55.3781,lng:-3.436,name:'Reino Unido'},
    CA:{lat:56.1304,lng:-106.3468,name:'Canada'},
    DE:{lat:51.1657,lng:10.4515,name:'Alemania'},
    FR:{lat:46.2276,lng:2.2137,name:'Francia'},
    PT:{lat:39.3999,lng:-8.2245,name:'Portugal'},
  }

  React.useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null }

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => {
      if (!mapRef.current || mapInstanceRef.current) return
      const L = window.L

      const map = L.map(mapRef.current, { center:[22,-95], zoom:4, zoomControl:true, scrollWheelZoom:true })
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution:'', maxZoom:12 }).addTo(map)
      mapInstanceRef.current = map

      const style = document.createElement('style')
      style.textContent = '.dp .leaflet-popup-content-wrapper{background:#18181f;border:1px solid #2a2a35;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.5);color:#fff}.dp .leaflet-popup-tip{background:#18181f}.leaflet-popup-content{margin:0;padding:0}.leaflet-container{background:#0d0d12}'
      document.head.appendChild(style)

      const totalRegion = (regionData||[]).reduce((s,r)=>s+(parseFloat(r.spend)||0),0)
      const maxRegion = parseFloat(regionData?.[0]?.spend)||1
      let topLat=22, topLng=-100, topZoom=5, hasRegion=false

      ;(regionData||[]).forEach((r,i) => {
        const coords = RC[r.region]
        if (!coords) return
        const spend = parseFloat(r.spend)||0
        const pct = totalRegion>0?Math.round(spend/totalRegion*100):0
        const size = Math.max(14, Math.min(45, (spend/maxRegion)*45))
        const color = i===0?'#6ee7b7':i<3?'#3b82f6':i<6?'#f97316':'#a78bfa'

        L.circleMarker([coords.lat, coords.lng], {
          radius: size, fillColor: color, color: color, weight:2, opacity:.9, fillOpacity:.4
        }).addTo(map).bindPopup(
          '<div style="padding:10px;min-width:150px"><div style="font-weight:800;font-size:13px;margin-bottom:6px;color:#fff">'+r.region+'</div><div style="color:#6ee7b7;font-size:13px;font-weight:700">$'+spend.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})+'</div><div style="color:#888;font-size:11px;margin-top:4px">'+pct+'% del gasto regional</div></div>',
          { className: 'dp' }
        )

        if (i===0) { topLat=coords.lat; topLng=coords.lng; topZoom=6; hasRegion=true }
      })

      const totalCountry = (countryData||[]).reduce((s,c)=>s+(parseFloat(c.spend)||0),0)
      const maxCountry = parseFloat(countryData?.[0]?.spend)||1

      ;(countryData||[]).forEach((c,i) => {
        const coords = CC[c.country]
        if (!coords) return
        const spend = parseFloat(c.spend)||0
        const pct = totalCountry>0?Math.round(spend/totalCountry*100):0
        const size = Math.max(8, Math.min(20, (spend/maxCountry)*20))

        L.circleMarker([coords.lat, coords.lng], {
          radius: size, fillColor: '#fcd34d', color: '#fcd34d', weight:1, opacity:.6, fillOpacity:.2
        }).addTo(map).bindPopup(
          '<div style="padding:10px;min-width:150px"><div style="font-weight:800;font-size:13px;margin-bottom:6px;color:#fff">'+coords.name+'</div><div style="color:#fcd34d;font-size:13px;font-weight:700">$'+spend.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})+'</div><div style="color:#888;font-size:11px;margin-top:4px">'+pct+'% del gasto total</div></div>',
          { className: 'dp' }
        )

        if (!hasRegion && i===0) { topLat=coords.lat; topLng=coords.lng; topZoom=5 }
      })

      setTimeout(()=>map.flyTo([topLat,topLng],topZoom,{duration:1.5}), 600)
    }
    document.head.appendChild(script)
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current=null } }
  }, [countryData, regionData])

  return (
    <div style={{position:'relative'}}>
      <div ref={mapRef} style={{height:'420px',borderRadius:'8px',overflow:'hidden',background:'#0d0d12'}}></div>
      <div style={{position:'absolute',top:'12px',right:'12px',background:'rgba(10,10,14,.92)',border:'1px solid #2a2a35',borderRadius:'8px',padding:'10px 14px',zIndex:1000}}>
        <div style={{fontSize:'9px',color:'#555',fontFamily:'monospace',marginBottom:'6px'}}>CAPAS</div>
        <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px'}}>
          <div style={{width:'10px',height:'10px',borderRadius:'50%',background:'#6ee7b7',opacity:.8}}></div>
          <span style={{fontSize:'10px',color:'#888',fontFamily:'monospace'}}>Estados/Regiones</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
          <div style={{width:'10px',height:'10px',borderRadius:'50%',background:'#fcd34d',opacity:.6}}></div>
          <span style={{fontSize:'10px',color:'#888',fontFamily:'monospace'}}>Paises</span>
        </div>
      </div>
    </div>
  )
}


function ReportesInner() {
  const { accountId } = useParams()
  const searchParams = useSearchParams()
  const { isPro, loading: planLoading } = usePlan()
  const [userId, setUserId] = useState(null)
  const [showPDFModal, setShowPDFModal] = useState(false)
  const PRESETS = (!planLoading && isPro === false) ? ALL_PRESETS.filter(p => !['today','yesterday','last_7d','custom'].includes(p.value)) : ALL_PRESETS
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
  const [demographics, setDemographics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingDemo, setLoadingDemo] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [demoError, setDemoError] = useState(null)
  const [accountName, setAccountName] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [platform, setPlatform] = useState(null)
  const [googleAdsData, setGoogleAdsData] = useState(null)
  const [gadsError, setGadsError] = useState(null)
  // Google Ads histórico
  const [gadsHistorico, setGadsHistorico] = useState(null)
  const [loadingGadsHistorico, setLoadingGadsHistorico] = useState(false)
  const [gadsHistoricoError, setGadsHistoricoError] = useState(null)
  const [gadsHistoricoFrom, setGadsHistoricoFrom] = useState(()=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-5);return d.toISOString().slice(0,7)})
  const [gadsHistoricoTo, setGadsHistoricoTo] = useState(()=>{const d=new Date();d.setDate(1);return d.toISOString().slice(0,7)})
  // Meta histórico
  const [historicoData, setHistoricoData] = useState(null)
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [historicoError, setHistoricoError] = useState(null)
  const [historicoFrom, setHistoricoFrom] = useState(()=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-5);return d.toISOString().slice(0,7)})
  const [historicoTo, setHistoricoTo] = useState(()=>{const d=new Date();d.setDate(1);return d.toISOString().slice(0,7)})

  const HIST_MONTHS = React.useMemo(()=>Array.from({length:24},(_,i)=>{
    const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-23+i)
    const val=d.toISOString().slice(0,7)
    const lbl=d.toLocaleString('es-MX',{month:'long',year:'numeric'})
    return {value:val, label:lbl.charAt(0).toUpperCase()+lbl.slice(1)}
  }),[])

  // Sync tab from URL ?tab= param
  useEffect(() => {
    const tab = searchParams?.get('tab')
    if (tab && ['overview','campanas','conjuntos','anuncios','audiencia','historico',
                 'gads-campanas','gads-grupos','gads-anuncios','gads-audiencia','gads-historico',
                 'google-ads','tiktok-ads'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])
  const [comparing, setComparing] = useState(false)
  const reportRef = useRef(null)

  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { window.location.href = '/'; return }
        setUserId(user.id)
        const { data: acc } = await supabase.from('ad_accounts').select('account_name,platform').eq('account_id', accountId).single()
        if (!acc) { window.location.href = '/dashboard/meta-ads'; return }
        setAccountName(acc.account_name || accountId)
        setPlatform(acc.platform || 'meta_ads')

        // Fetch appropriate token based on platform
        if (acc.platform === 'google_ads') {
          const customerId = accountId.replace('gads_', '')
          const { data: tokenRow } = await supabase.from('google_ads_tokens_v2').select('access_token').eq('user_id', user.id).eq('customer_id', customerId).single()
          if (!tokenRow) { window.location.href = '/dashboard'; return }
          setToken(tokenRow.access_token)
        } else {
          const { data: tokenRow } = await supabase.from('meta_tokens').select('access_token').eq('user_id', user.id).single()
          if (!tokenRow) { window.location.href = '/dashboard'; return }
          setToken(tokenRow.access_token)
        }
      } catch(e) {
        console.error('init error:', e)
        setFetchError('general')
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (token && platform && (preset !== 'custom' || (customFrom && customTo))) {
      if (platform === 'google_ads') {
        fetchGoogleAdsData()
      } else {
        fetchData()
      }
    }
  }, [token, platform, preset, customFrom, customTo, resultType])

  useEffect(() => {
    if (token && platform === 'meta_ads' && activeTab === 'audiencia') fetchDemographics()
  }, [token, platform, activeTab, preset, customFrom, customTo])

  useEffect(() => {
    if (token && platform === 'meta_ads' && activeTab === 'historico' && !historicoData && !loadingHistorico) fetchHistorico()
    if (token && platform === 'google_ads' && activeTab === 'gads-historico' && !gadsHistorico && !loadingGadsHistorico) fetchGadsHistorico()
  }, [token, platform, activeTab])

  async function fetchData() {
    setLoading(true)
    setFetchError(null)
    setOverview(null); setPrevOverview(null); setDaily([]); setCampaigns([]); setAdsets([]); setAds([])
    try {
      const range = getDateRange(preset, customFrom, customTo)
      if (!range||!range.since||!range.until) { setLoading(false); return }
      const prev = getPrevRange(range.since, range.until)
      const tr = JSON.stringify({since:range.since,until:range.until})
      const trPrev = JSON.stringify({since:prev.since,until:prev.until})
      const base = 'https://graph.facebook.com/v21.0/'+accountId+'/insights'
      const vidFields = 'video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions'
      const baseFields = 'spend,impressions,reach,frequency,clicks,cpc,cpm,ctr,actions,objective,'+vidFields
      const campFields = 'campaign_name,objective,spend,impressions,reach,frequency,clicks,cpc,cpm,ctr,actions,'+vidFields
      const adsetFields = 'adset_name,campaign_name,spend,impressions,reach,frequency,clicks,cpc,cpm,ctr,actions,'+vidFields
      const adFields = 'ad_name,adset_name,campaign_name,spend,impressions,reach,frequency,clicks,cpc,cpm,ctr,actions,'+vidFields

      const [ovR,ovPrevR,dailyR,campR,adsetR,adR] = await Promise.all([
        fetch(base+'?fields='+baseFields+'&time_range='+tr+'&access_token='+token),
        fetch(base+'?fields='+baseFields+'&time_range='+trPrev+'&access_token='+token),
        fetch(base+'?fields='+baseFields+'&time_range='+tr+'&time_increment=1&access_token='+token+'&limit=90'),
        fetch(base+'?fields='+campFields+'&level=campaign&time_range='+tr+'&limit=50&access_token='+token),
        fetch(base+'?fields='+adsetFields+'&level=adset&time_range='+tr+'&limit=50&access_token='+token),
        fetch(base+'?fields='+adFields+'&level=ad&time_range='+tr+'&limit=50&access_token='+token)
      ])

      const [ovJ,ovPrevJ,dailyJ,campJ,adsetJ,adJ] = await Promise.all([ovR.json(),ovPrevR.json(),dailyR.json(),campR.json(),adsetR.json(),adR.json()])

      const adStatusRes = await fetch('https://graph.facebook.com/v21.0/'+accountId+'/ads?fields=id,name,effective_status&limit=100&access_token='+token)
      const adStatusJ = await adStatusRes.json()
      const adStatusMap = {}
      ;(adStatusJ.data||[]).forEach(a=>{ adStatusMap[a.name]=a.effective_status })

      const objective = ovJ.data?.[0]?.objective || 'MULTIPLE'
      setDetectedObjective(objective)
      const objInfo = OBJECTIVE_MAP[objective] || OBJECTIVE_MAP.MULTIPLE
      setAvailableTypes(objInfo.resultTypes)

      const parseRow = (d) => {
        const actions = d.actions||[]
        const rowObj = d.objective || objective
        const objT = OBJECTIVE_MAP[rowObj] || OBJECTIVE_MAP.MULTIPLE
        const type = resultType === 'auto' ? objT.resultTypes[0] : resultType
        const results = getResults(actions, type)
        const spend = parseFloat(d.spend)||0
        const imp = parseFloat(d.impressions)||0
        const vid3s = 0
        const vid25 = parseFloat(d.video_p25_watched_actions?.[0]?.value)||0
        const vid50 = parseFloat(d.video_p50_watched_actions?.[0]?.value)||0
        const vid75 = parseFloat(d.video_p75_watched_actions?.[0]?.value)||0
        const vid100 = parseFloat(d.video_p100_watched_actions?.[0]?.value)||0
        const hookRate = imp>0&&vid3s>0 ? (vid3s/imp*100) : 0
        const holdRate = vid3s>0&&vid100>0 ? (vid100/vid3s*100) : 0
        return {
          spend, results, hookRate, holdRate,
          impressions:imp,
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
          engagementRate: imp>0 ? ((findAction(actions,['post_engagement'])/imp)*100) : 0,
          vid3s, vid25, vid50, vid75, vid100,
        }
      }

      if (ovJ.data?.[0]) setOverview(parseRow(ovJ.data[0]))
      if (ovPrevJ.data?.[0]) setPrevOverview(parseRow(ovPrevJ.data[0]))
      setDaily((dailyJ.data||[]).map(d=>({date:d.date_start,...parseRow(d)})))
      setCampaigns((campJ.data||[]).map(d=>({name:d.campaign_name,objective:d.objective,...parseRow(d)})))
      setAdsets((adsetJ.data||[]).map(d=>({name:d.adset_name,campaign:d.campaign_name,...parseRow(d)})))
      setAds((adJ.data||[]).map(d=>({name:d.ad_name,adset:d.adset_name,campaign:d.campaign_name,status:adStatusMap[d.ad_name]||'UNKNOWN',...parseRow(d)})))
    } catch(e){
      console.error(e)
      const msg = e?.message || String(e)
      if (msg.includes('190') || msg.includes('OAuthException') || msg.includes('token')) {
        setFetchError('token_expired')
      } else {
        setFetchError('general')
      }
    }
    setLoading(false)
  }

  async function fetchGoogleAdsData() {
    setLoading(true)
    setGoogleAdsData(null)
    setGadsError(null)
    try {
      const range = getDateRange(preset, customFrom, customTo)
      if (!range||!range.since||!range.until) { setLoading(false); return }
      const customerId = accountId.replace('gads_', '')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const res = await fetch('/api/google-ads/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, customerId, dateFrom: range.since, dateTo: range.until })
      })
      const data = await res.json()
      if (data.success) {
        setGoogleAdsData(data)
      } else {
        setGadsError(data.error || 'Error al obtener datos de Google Ads')
      }
    } catch(e) {
      console.error('fetchGoogleAdsData:', e)
      setGadsError(e.message || 'Error de conexión')
    }
    setLoading(false)
  }

  async function fetchGadsHistorico() {
    setLoadingGadsHistorico(true)
    setGadsHistorico(null)
    setGadsHistoricoError(null)
    try {
      const customerId = accountId.replace('gads_', '')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const res = await fetch('/api/google-ads/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, customerId, type: 'historico', monthFrom: gadsHistoricoFrom, monthTo: gadsHistoricoTo })
      })
      const data = await res.json()
      if (data.success) setGadsHistorico(data)
      else setGadsHistoricoError(data.error || 'Error al cargar histórico')
    } catch(e) {
      setGadsHistoricoError(e.message || 'Error de conexión')
    }
    setLoadingGadsHistorico(false)
  }

  async function fetchDemographics() {
    setLoadingDemo(true)
    setDemographics(null)
    setDemoError(null)
    try {
      const range = getDateRange(preset, customFrom, customTo) || getDateRange('this_month')
      if (!range||!range.since||!range.until) { setLoadingDemo(false); return }
      const tr = JSON.stringify({since:range.since,until:range.until})
      const base = 'https://graph.facebook.com/v21.0/'+accountId+'/insights'
      const fields = 'spend,impressions,clicks,actions,reach'

      const [ageR,genderR,countryR,deviceR,platformR,regionR] = await Promise.all([
        fetch(base+'?fields='+fields+'&breakdowns=age&time_range='+tr+'&access_token='+token+'&limit=100'),
        fetch(base+'?fields='+fields+'&breakdowns=gender&time_range='+tr+'&access_token='+token+'&limit=100'),
        fetch(base+'?fields='+fields+'&breakdowns=country&time_range='+tr+'&access_token='+token+'&limit=50'),
        fetch(base+'?fields='+fields+'&breakdowns=impression_device&time_range='+tr+'&access_token='+token+'&limit=20'),
        fetch(base+'?fields='+fields+'&breakdowns=publisher_platform&time_range='+tr+'&access_token='+token+'&limit=20'),
        fetch(base+'?fields='+fields+'&breakdowns=region&time_range='+tr+'&access_token='+token+'&limit=20'),
      ])

      const [ageJ,genderJ,countryJ,deviceJ,platformJ,regionJ] = await Promise.all([ageR.json(),genderR.json(),countryR.json(),deviceR.json(),platformR.json(),regionR.json()])

      console.log('[audiencia] ageJ:', ageJ, 'genderJ:', genderJ)

      // Detect token/auth error (separate from main fetchError)
      const firstErr = ageJ.error || genderJ.error || countryJ.error
      if (firstErr) {
        const msg = firstErr.message || ''
        const isToken = msg.includes('190') || msg.includes('OAuthException') || firstErr.code === 190 || firstErr.type === 'OAuthException'
        setDemoError(isToken ? 'token_expired' : firstErr.message || 'Error de API')
        setLoadingDemo(false)
        return
      }

      setDemographics({
        age:(ageJ.data||[]).sort((a,b)=>parseFloat(b.spend)-parseFloat(a.spend)),
        gender:(genderJ.data||[]),
        country:(countryJ.data||[]).sort((a,b)=>parseFloat(b.spend)-parseFloat(a.spend)),
        device:(deviceJ.data||[]).sort((a,b)=>parseFloat(b.spend)-parseFloat(a.spend)),
        platform:(platformJ.data||[]).sort((a,b)=>parseFloat(b.spend)-parseFloat(a.spend)),
        region:(regionJ.data||[]).sort((a,b)=>parseFloat(b.spend)-parseFloat(a.spend)).slice(0,15),
      })
    } catch(e){
      console.error('fetchDemographics error:', e)
      setDemoError(e?.message || 'Error desconocido')
    }
    setLoadingDemo(false)
  }

  async function fetchHistorico() {
    if (!token) return
    setLoadingHistorico(true)
    setHistoricoError(null)
    setHistoricoData(null)
    try {
      const since = historicoFrom + '-01'
      const toD = new Date(historicoTo + '-01')
      toD.setMonth(toD.getMonth() + 1); toD.setDate(0)
      const until = toD.toISOString().slice(0, 10)
      const tr = JSON.stringify({since, until})
      const base = 'https://graph.facebook.com/v21.0/' + accountId + '/insights'
      const flds = 'spend,impressions,reach,frequency,clicks,cpc,cpm,ctr,actions,objective'
      const campFlds = 'campaign_name,objective,spend,impressions,reach,clicks,cpc,cpm,ctr,actions'

      const [accR, campR] = await Promise.all([
        fetch(base+'?fields='+flds+'&time_range='+tr+'&time_increment=monthly&access_token='+token+'&limit=36'),
        fetch(base+'?fields='+campFlds+'&level=campaign&time_range='+tr+'&time_increment=monthly&access_token='+token+'&limit=300'),
      ])
      const [accJ, campJ] = await Promise.all([accR.json(), campR.json()])
      if (accJ.error) throw new Error(accJ.error.message)

      const parseH = (d) => {
        const actions = d.actions || []
        const obj = d.objective || 'MULTIPLE'
        const objI = OBJECTIVE_MAP[obj] || OBJECTIVE_MAP.MULTIPLE
        const type = resultType === 'auto' ? objI.resultTypes[0] : resultType
        const results = getResults(actions, type)
        const spend = parseFloat(d.spend) || 0
        return {
          spend, results,
          impressions: parseFloat(d.impressions) || 0,
          reach: parseFloat(d.reach) || 0,
          clicks: parseFloat(d.clicks) || 0,
          cpm: parseFloat(d.cpm) || 0,
          ctr: parseFloat(d.ctr) || 0,
          frequency: parseFloat(d.frequency) || 0,
          cpr: results > 0 ? spend / results : 0,
        }
      }

      const monthly = (accJ.data || []).map(d => {
        const dt = new Date(d.date_start + 'T12:00:00')
        return {
          month: d.date_start.slice(0, 7),
          label: dt.toLocaleString('es-MX', {month:'short', year:'2-digit'}).replace('.',''),
          ...parseH(d)
        }
      }).sort((a,b) => a.month.localeCompare(b.month))

      const campRows = (campJ.data || []).map(d => ({
        month: d.date_start.slice(0, 7),
        campaign: d.campaign_name,
        objective: d.objective || 'MULTIPLE',
        ...parseH(d)
      }))

      const objectives = [...new Set(campRows.map(r => r.objective))].filter(Boolean)

      const byObj = {}
      objectives.forEach(obj => {
        byObj[obj] = monthly.map(m => {
          const rows = campRows.filter(r => r.objective === obj && r.month === m.month)
          return {
            month: m.month, label: m.label,
            spend: rows.reduce((s,r) => s+r.spend, 0),
            results: rows.reduce((s,r) => s+r.results, 0),
          }
        })
      })

      const bestByMonth = {}
      campRows.forEach(r => {
        if (!bestByMonth[r.month] || r.results > (bestByMonth[r.month].results || 0))
          bestByMonth[r.month] = {campaign: r.campaign, results: r.results, spend: r.spend, objective: r.objective}
      })

      setHistoricoData({monthly, objectives, byObj, bestByMonth})
    } catch(e) {
      console.error('fetchHistorico error:', e)
      setHistoricoError(e.message || 'Error al cargar el histórico')
    }
    setLoadingHistorico(false)
  }

  function exportPDF() {
    setShowPDFModal(true)
  }

  const isGoogle = platform === 'google_ads'
  const tabs = isGoogle
    ? [
        {id:'overview',        label:'Resumen',           icon:'📊', desc:'Vista general de la cuenta'},
        {id:'gads-campanas',   label:'Campañas',          icon:'🎯', desc:'Cada campaña activa'},
        {id:'gads-grupos',     label:'Grupos de anuncios',icon:'👥', desc:'Ad Groups'},
        {id:'gads-anuncios',   label:'Anuncios',          icon:'🖼', desc:'Creativos individuales'},
        {id:'gads-audiencia',  label:'Audiencias',        icon:'🗺', desc:'Quién ve tus anuncios'},
        {id:'gads-historico',  label:'Histórico',         icon:'📅', desc:'Mes a mes'},
      ]
    : [
        {id:'overview', label:'Resumen',    icon:'📊', desc:'Vista general'},
        {id:'campanas', label:'Campañas',   icon:'🎯', desc:'Cada campaña activa'},
        {id:'conjuntos',label:'Conjuntos',  icon:'👥', desc:'Grupos de anuncios'},
        {id:'anuncios', label:'Anuncios',   icon:'🖼', desc:'Creativos individuales'},
        {id:'audiencia',label:'Audiencia',  icon:'🗺', desc:'Quién ve tus anuncios'},
        {id:'historico',label:'Histórico',  icon:'📅', desc:'Mes a mes'},
      ]
  const objInfo = OBJECTIVE_MAP[detectedObjective] || OBJECTIVE_MAP.MULTIPLE

  const METRIC_HELP = {
    'Importe gastado': 'Dinero total que Meta cobró en este período',
    'Resultados': 'Acciones clave que logró tu campaña (mensajes, leads, ventas…)',
    'Costo/resultado': 'Cuánto pagaste en promedio por cada resultado obtenido',
    'Impresiones': 'Veces que tu anuncio fue mostrado (puede ser a la misma persona varias veces)',
    'Alcance': 'Personas únicas que vieron tu anuncio al menos una vez',
    'Frecuencia': 'Promedio de veces que cada persona vio tu anuncio. +3.5 puede causar fatiga',
    'CTR': 'Porcentaje de personas que hicieron clic. +1% es bueno, +2% excelente',
    'CPC': 'Costo por cada clic que recibiste',
    'CPM': 'Cuánto pagaste por cada 1,000 impresiones',
    'Hook Rate': 'Qué % de personas vio los primeros 3 segundos del video. Referencia: 25%+ bueno',
    'Hold Rate': 'Qué % de quienes iniciaron el video lo terminaron. Referencia: 40%+ bueno',
  }

  return (
    <div style={{background:'var(--bg)',fontFamily:'"Plus Jakarta Sans",Inter,sans-serif',minHeight:'100%'}}>
      <style>{`.tab-btn:hover{background:rgba(99,102,241,.08)!important} .metric-help{display:none} .metric-card:hover .metric-help{display:block}`}</style>

      {/* BARRA SUPERIOR: tabs + fechas */}
      <div style={{background:'var(--sidebar)',borderBottom:'1px solid var(--border)',position:'sticky',top:0,zIndex:50}}>

        {/* TABS - navegación principal */}
        <div style={{padding:'0 20px',display:'flex',gap:'2px',overflowX:'auto',scrollbarWidth:'none'}}>
          {tabs.map(t=>(
            <button key={t.id} className="tab-btn" onClick={()=>setActiveTab(t.id)}
              style={{display:'flex',alignItems:'center',gap:'6px',padding:'12px 14px',borderRadius:'0',border:'none',borderBottom:'2px solid',
                borderBottomColor:activeTab===t.id?'#6366f1':'transparent',
                background:'transparent',cursor:'pointer',fontFamily:'inherit',flexShrink:0,
                transition:'all .15s'}}>
              <span style={{fontSize:'14px'}}>{t.icon}</span>
              <div style={{textAlign:'left'}}>
                <div style={{fontSize:'12px',fontWeight:'700',color:activeTab===t.id?'#a5b4fc':'var(--text3)'}}>{t.label}</div>
                <div style={{fontSize:'9px',color:'var(--text4)',marginTop:'1px'}}>{t.desc}</div>
              </div>
            </button>
          ))}

          {/* Spacer + fecha + objetivo */}
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:'6px',padding:'8px 0',flexShrink:0}}>
            {/* Objetivo */}
            {platform==='meta_ads' && (
              <div style={{position:'relative'}}>
                <button onClick={()=>setShowTypeDropdown(!showTypeDropdown)}
                  style={{padding:'5px 10px',borderRadius:'6px',border:'1px solid rgba(167,139,250,.3)',background:'rgba(167,139,250,.08)',color:'#a78bfa',fontSize:'10px',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:'4px'}}>
                  <span>🎯</span>
                  <span>{resultType==='auto'?'Auto':(RESULT_TYPE_LABELS[resultType]||resultType)}</span>
                  <span>▾</span>
                </button>
                {showTypeDropdown&&(
                  <div style={{position:'absolute',top:'100%',right:0,background:'#18181f',border:'1px solid #2a2a35',borderRadius:'8px',padding:'6px',zIndex:200,minWidth:'190px',boxShadow:'0 8px 24px rgba(0,0,0,.6)'}}>
                    <div style={{fontSize:'9px',color:'#444',fontFamily:'monospace',padding:'4px 8px 6px',textTransform:'uppercase',letterSpacing:'.08em'}}>Tipo de resultado</div>
                    <div onClick={()=>{setResultType('auto');setShowTypeDropdown(false)}} style={{padding:'8px 10px',borderRadius:'5px',cursor:'pointer',color:resultType==='auto'?'#a78bfa':'#888',background:resultType==='auto'?'rgba(167,139,250,.1)':'transparent',fontSize:'11px',fontFamily:'monospace'}}>Auto — detectar por objetivo</div>
                    <div style={{height:'1px',background:'#2a2a35',margin:'3px 0'}}></div>
                    {availableTypes.map(t=>(
                      <div key={t} onClick={()=>{setResultType(t);setShowTypeDropdown(false)}} style={{padding:'8px 10px',borderRadius:'5px',cursor:'pointer',color:resultType===t?'#a78bfa':'#888',background:resultType===t?'rgba(167,139,250,.1)':'transparent',fontSize:'11px',fontFamily:'monospace'}}>
                        {RESULT_TYPE_LABELS[t]}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Comparar */}
            <button onClick={()=>setComparing(!comparing)}
              style={{padding:'5px 10px',borderRadius:'6px',border:'1px solid',fontSize:'10px',cursor:'pointer',fontFamily:'inherit',
                borderColor:comparing?'rgba(110,231,183,.4)':'rgba(255,255,255,.08)',
                background:comparing?'rgba(110,231,183,.08)':'transparent',
                color:comparing?'#6ee7b7':'var(--text4)'}}>
              {comparing?'✓ Comparando':'Comparar'}
            </button>

            {/* PDF */}
            <button onClick={exportPDF}
              style={{padding:'5px 10px',borderRadius:'6px',border:'1px solid rgba(255,255,255,.08)',background:'transparent',color:'var(--text4)',fontSize:'10px',cursor:'pointer',fontFamily:'inherit'}}>
              ↓ PDF
            </button>
          </div>
        </div>

        {/* DATE PRESETS - segunda fila */}
        <div style={{padding:'6px 20px',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',gap:'4px',flexWrap:'wrap'}}>
          <span style={{fontSize:'9px',color:'var(--text4)',fontFamily:'monospace',marginRight:'4px',flexShrink:0}}>PERÍODO:</span>
          {PRESETS.map(p=>(
            <button key={p.value} onClick={()=>{setPreset(p.value);setShowCustom(p.value==='custom');if(p.value!=='custom')setDemographics(null)}}
              style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid',fontSize:'10px',cursor:'pointer',fontFamily:'inherit',
                borderColor:preset===p.value?'rgba(99,102,241,.6)':'rgba(255,255,255,.08)',
                background:preset===p.value?'rgba(99,102,241,.15)':'transparent',
                color:preset===p.value?'#a5b4fc':'var(--text4)',
                fontWeight:preset===p.value?'700':'400',transition:'all .15s'}}>
              {p.label}
            </button>
          ))}
          {showCustom&&(
            <>
              <input type="date" value={customFrom} onChange={e=>{setCustomFrom(e.target.value);setDemographics(null)}} style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',color:'#fff',padding:'4px 8px',borderRadius:'5px',fontSize:'10px',outline:'none',fontFamily:'inherit'}}/>
              <span style={{fontSize:'10px',color:'var(--text4)'}}>→</span>
              <input type="date" value={customTo} onChange={e=>{setCustomTo(e.target.value);setDemographics(null)}} style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',color:'#fff',padding:'4px 8px',borderRadius:'5px',fontSize:'10px',outline:'none',fontFamily:'inherit'}}/>
            </>
          )}
        </div>
      </div>

      {loading&&(
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'80px 0',gap:'12px'}}>
          <div style={{width:'32px',height:'32px',borderRadius:'50%',border:'3px solid rgba(99,102,241,.2)',borderTop:'3px solid #6366f1',animation:'spin 1s linear infinite'}}></div>
          <div style={{fontSize:'12px',color:'var(--text4)',fontFamily:'monospace'}}>Cargando datos de tu cuenta...</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {!loading&&(
        <div ref={reportRef} style={{padding:'20px 24px',maxWidth:'1400px',margin:'0 auto'}}>

          {activeTab==='overview'&&(
            <>
              {fetchError && (
                <div style={{background:'rgba(248,113,113,.08)',border:'1px solid rgba(248,113,113,.2)',borderRadius:'10px',padding:'20px 24px',marginBottom:'24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'16px'}}>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:'700',color:'#f87171',marginBottom:'4px'}}>
                      {fetchError === 'token_expired' ? '🔑 Sesión de Meta Ads vencida' : '⚠ Error al cargar los datos'}
                    </div>
                    <div style={{fontSize:'11px',color:'#888',lineHeight:'1.6'}}>
                      {fetchError === 'token_expired'
                        ? 'Tu token de acceso de Meta Ads expiró. Reconecta tu cuenta para continuar viendo los reportes.'
                        : 'No se pudieron cargar los datos. Verifica tu conexión o intenta de nuevo.'}
                    </div>
                  </div>
                  <button onClick={() => window.location.href='/dashboard/meta-ads'}
                    style={{padding:'8px 16px',borderRadius:'7px',border:'1px solid rgba(248,113,113,.3)',background:'rgba(248,113,113,.12)',color:'#f87171',fontSize:'11px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>
                    {fetchError === 'token_expired' ? 'Reconectar Meta →' : 'Reintentar'}
                  </button>
                </div>
              )}
              {platform === 'google_ads' && googleAdsData ? (()=>{
                const s = googleAdsData.summary || {}
                const hasConv = s.totalConversions > 0
                const isBad   = !hasConv && s.totalSpend > 100
                const color   = hasConv ? '#6ee7b7' : isBad ? '#f87171' : '#fcd34d'
                const bg      = hasConv ? 'rgba(110,231,183,.05)' : isBad ? 'rgba(248,113,113,.05)' : 'rgba(252,211,77,.05)'
                const border  = hasConv ? 'rgba(110,231,183,.2)' : isBad ? 'rgba(248,113,113,.2)' : 'rgba(252,211,77,.2)'
                const icon    = hasConv ? '✅' : isBad ? '🔴' : '⏳'
                const headline= hasConv ? 'La inversión está generando conversiones' : isBad ? 'Hubo gasto pero no se registraron conversiones — revisa el tracking' : 'Poca actividad en este período'
                // tendencia diaria
                const dl = googleAdsData.daily||[]
                let trendMsg = null
                if (dl.length>=6) {
                  const half = Math.floor(dl.length/2)
                  const f1 = dl.slice(0,half), f2 = dl.slice(dl.length-half)
                  const cpa1 = f1.filter(d=>d.conversions>0).reduce((s,d)=>s+(d.spend/d.conversions),0)/Math.max(f1.filter(d=>d.conversions>0).length,1)
                  const cpa2 = f2.filter(d=>d.conversions>0).reduce((s,d)=>s+(d.spend/d.conversions),0)/Math.max(f2.filter(d=>d.conversions>0).length,1)
                  if (cpa1>0&&cpa2>0) {
                    const pct = Math.round((cpa1-cpa2)/cpa1*100)
                    if (pct>10) trendMsg={up:true,text:`El CPA bajó ${pct}% en la segunda mitad del período — las campañas están mejorando`}
                    else if (pct<-10) trendMsg={up:false,text:`El CPA subió ${Math.abs(pct)}% en la segunda mitad — revisa la competencia y las pujas`}
                  }
                }
                return (
                  <>
                    {/* Executive summary */}
                    <div style={{background:bg,border:'1px solid '+border,borderRadius:'14px',padding:'20px 24px',marginBottom:'24px'}}>
                      <div style={{display:'flex',alignItems:'flex-start',gap:'16px',flexWrap:'wrap'}}>
                        <div style={{fontSize:'36px',lineHeight:1,flexShrink:0}}>{icon}</div>
                        <div style={{flex:1,minWidth:'220px'}}>
                          <div style={{fontSize:'15px',fontWeight:'800',color,marginBottom:'8px'}}>{headline}</div>
                          <div style={{fontSize:'13px',color:'#999',lineHeight:'1.8'}}>
                            Se invirtieron{' '}<strong style={{color:'#fff',fontSize:'14px'}}>{fmt$(s.totalSpend)}</strong>
                            {hasConv && <> y se obtuvieron{' '}<strong style={{color:'#6ee7b7',fontSize:'14px'}}>{s.totalConversions.toFixed(1)} conversiones</strong></>}
                            {s.cpa>0 && <> — cada conversión costó en promedio{' '}<strong style={{color:'#fff'}}>{fmt$(s.cpa)}</strong></>}
                            {s.roas>0 && <> · ROAS de{' '}<strong style={{color:s.roas>=2?'#6ee7b7':'#fcd34d'}}>{s.roas.toFixed(2)}x</strong></>}
                          </div>
                          {trendMsg && (
                            <div style={{marginTop:'8px',fontSize:'12px',color:trendMsg.up?'#6ee7b7':'#fcd34d',display:'flex',alignItems:'center',gap:'6px'}}>
                              <span>{trendMsg.up?'📈':'📉'}</span><span>{trendMsg.text}</span>
                            </div>
                          )}
                        </div>
                        <div style={{display:'flex',gap:'24px',flexWrap:'wrap',alignItems:'center',flexShrink:0}}>
                          {[
                            {l:'Impresiones',v:fmtN(s.totalImpressions),c:'#a78bfa'},
                            {l:'Clics',v:fmtN(s.totalClicks),c:'#60a5fa'},
                            {l:'CTR',v:fmtP(s.ctr),c:s.ctr>=2?'#6ee7b7':s.ctr>=1?'#fcd34d':'#f87171'},
                          ].map((x,i)=>(
                            <div key={i} style={{textAlign:'center'}}>
                              <div style={{fontSize:'22px',fontWeight:'800',color:x.c,marginBottom:'2px'}}>{x.v}</div>
                              <div style={{fontSize:'9px',color:'#555',fontFamily:'monospace',maxWidth:'80px',textAlign:'center',lineHeight:'1.4',textTransform:'uppercase',letterSpacing:'.04em'}}>{x.l}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* KPIs */}
                    <div style={{marginBottom:'8px'}}>
                      <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'10px'}}>📌 Métricas clave</div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:'10px',marginBottom:'20px'}}>
                        <MetricCard l='Gasto total' v={fmt$(s.totalSpend)} sub='ejecutado'/>
                        <MetricCard l='Conversiones' v={s.totalConversions.toFixed(1)} sub={hasConv?'obtenidas':'sin conversiones'} pos={hasConv} alert={!hasConv&&s.totalSpend>100}/>
                        <MetricCard l='CPA' v={s.cpa>0?fmt$(s.cpa):'Sin datos'} sub='costo por conversión' alert={s.cpa===0&&s.totalSpend>100}/>
                        <MetricCard l='ROAS' v={s.roas>0?s.roas.toFixed(2)+'x':'Sin datos'} sub='retorno sobre inversión' pos={s.roas>=2} alert={s.roas>0&&s.roas<1}/>
                      </div>
                    </div>
                    <div style={{marginBottom:'24px'}}>
                      <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'10px'}}>⚡ Rendimiento del anuncio</div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(145px,1fr))',gap:'10px',marginBottom:'20px'}}>
                        <MetricCard l='CTR' v={fmtP(s.ctr)} sub={s.ctr>=2?'Excelente ✓':s.ctr>=1?'Bueno':'Bajo — mejorar'} pos={s.ctr>=2} alert={s.ctr<0.5}/>
                        <MetricCard l='CPC' v={fmt$(s.cpc)} sub='por clic recibido'/>
                        <MetricCard l='CPM' v={fmt$(s.cpm)} sub='por 1,000 impresiones'/>
                        <MetricCard l='Clics' v={fmtN(s.totalClicks)} sub='tráfico total'/>
                        <MetricCard l='Impresiones' v={fmtN(s.totalImpressions)} sub='veces mostrado'/>
                        {s.totalConvValue>0&&<MetricCard l='Valor de conv.' v={fmt$(s.totalConvValue)} sub='ingresos atribuidos' pos/>}
                      </div>
                    </div>

                    {/* Daily charts */}
                    {(googleAdsData.daily||[]).length>1 && (
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'24px'}}>
                        <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px'}}>
                          <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'14px'}}>Gasto vs Conversiones por día</div>
                          <div style={{height:'200px'}}>
                            <Line data={{labels:(googleAdsData.daily||[]).map(d=>d.date.slice(5)),datasets:[
                              {label:'Gasto ($)',data:(googleAdsData.daily||[]).map(d=>+d.spend.toFixed(2)),borderColor:'#f97316',backgroundColor:'rgba(249,115,22,.08)',fill:true,tension:.4,yAxisID:'y',pointRadius:2,borderWidth:2},
                              {label:'Conversiones',data:(googleAdsData.daily||[]).map(d=>+d.conversions.toFixed(1)),borderColor:'#6ee7b7',backgroundColor:'rgba(110,231,183,.06)',fill:true,tension:.4,yAxisID:'y1',pointRadius:2,borderWidth:2}
                            ]}} options={chartOpts(true)}/>
                          </div>
                        </div>
                        <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px'}}>
                          <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'14px'}}>CTR y CPC por día</div>
                          <div style={{height:'200px'}}>
                            <Line data={{labels:(googleAdsData.daily||[]).map(d=>d.date.slice(5)),datasets:[
                              {label:'CTR %',data:(googleAdsData.daily||[]).map(d=>+(d.clicks/(d.impressions||1)*100).toFixed(2)),borderColor:'#6ee7b7',backgroundColor:'rgba(110,231,183,.06)',fill:true,tension:.4,yAxisID:'y',pointRadius:2,borderWidth:2},
                              {label:'CPC ($)',data:(googleAdsData.daily||[]).map(d=>+(d.clicks>0?d.spend/d.clicks:0).toFixed(2)),borderColor:'#fcd34d',backgroundColor:'rgba(252,211,77,.06)',fill:true,tension:.4,yAxisID:'y1',pointRadius:2,borderWidth:2}
                            ]}} options={chartOpts(true)}/>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )
              })() : overview && (
                <>
                  {comparing&&prevOverview&&(
                    <div style={{background:'rgba(110,231,183,.05)',border:'1px solid rgba(110,231,183,.2)',borderRadius:'8px',padding:'10px 16px',marginBottom:'16px',fontSize:'11px',color:'#6ee7b7',display:'flex',alignItems:'center',gap:'8px'}}>
                      <span>↕</span>
                      <span>Comparando período actual vs período anterior — las flechas ↑↓ muestran si mejoró o bajó cada métrica</span>
                    </div>
                  )}
                  {/* RESUMEN EJECUTIVO — respuesta directa: ¿está funcionando la inversión? */}
                  {(()=>{
                    const hasResults = overview.results > 0
                    const isBad = !hasResults && overview.spend > 50
                    const color  = hasResults ? '#6ee7b7' : isBad ? '#f87171' : '#fcd34d'
                    const bg     = hasResults ? 'rgba(110,231,183,.05)' : isBad ? 'rgba(248,113,113,.05)' : 'rgba(252,211,77,.05)'
                    const border = hasResults ? 'rgba(110,231,183,.2)' : isBad ? 'rgba(248,113,113,.2)' : 'rgba(252,211,77,.2)'
                    const icon   = hasResults ? '✅' : isBad ? '🔴' : '⏳'
                    const headline = hasResults
                      ? 'La inversión está generando resultados'
                      : isBad ? 'Se invirtió sin obtener resultados — hay algo que revisar'
                      : 'Poca actividad registrada en este período'
                    // Tendencia: últimos 3 días vs primeros 3 días de cpr
                    let trendMsg = null
                    if (daily.length >= 6) {
                      const half = Math.floor(daily.length/2)
                      const firstHalf = daily.slice(0, half)
                      const secondHalf = daily.slice(daily.length-half)
                      const avgFirst  = firstHalf.reduce((s,d)=>s+(d.cpr||0),0)/firstHalf.length
                      const avgSecond = secondHalf.reduce((s,d)=>s+(d.cpr||0),0)/secondHalf.length
                      if (avgFirst>0 && avgSecond>0) {
                        const pct = Math.round((avgFirst-avgSecond)/avgFirst*100)
                        if (pct>10) trendMsg = { up:true, text: 'El costo por resultado bajó '+pct+'% en la segunda mitad del período — la campaña está mejorando' }
                        else if (pct<-10) trendMsg = { up:false, text: 'El costo por resultado subió '+Math.abs(pct)+'% en la segunda mitad del período — revisar frecuencia y creativos' }
                      }
                    }
                    return (
                      <div style={{background:bg,border:'1px solid '+border,borderRadius:'14px',padding:'20px 24px',marginBottom:'24px'}}>
                        <div style={{display:'flex',alignItems:'flex-start',gap:'16px',flexWrap:'wrap'}}>
                          <div style={{fontSize:'36px',lineHeight:1,flexShrink:0}}>{icon}</div>
                          <div style={{flex:1,minWidth:'220px'}}>
                            <div style={{fontSize:'15px',fontWeight:'800',color,marginBottom:'8px'}}>{headline}</div>
                            <div style={{fontSize:'13px',color:'#999',lineHeight:'1.8'}}>
                              Se invirtieron{' '}<strong style={{color:'#fff',fontSize:'14px'}}>{fmt$(overview.spend)}</strong>
                              {hasResults && <> y se obtuvieron{' '}<strong style={{color:'#6ee7b7',fontSize:'14px'}}>{fmtN(overview.results)} resultados</strong></>}
                              {overview.cpr>0 && <> — cada resultado costó en promedio{' '}<strong style={{color:'#fff'}}>{fmt$(overview.cpr)}</strong></>}
                              {!hasResults && isBad && <>. Revisa el objetivo, la segmentación y el creativo.</>}
                            </div>
                            {trendMsg && (
                              <div style={{marginTop:'8px',fontSize:'12px',color:trendMsg.up?'#6ee7b7':'#fcd34d',display:'flex',alignItems:'center',gap:'6px'}}>
                                <span>{trendMsg.up?'📈':'📉'}</span>
                                <span>{trendMsg.text}</span>
                              </div>
                            )}
                          </div>
                          <div style={{display:'flex',gap:'24px',flexWrap:'wrap',alignItems:'center',flexShrink:0}}>
                            {[
                              {l:'Personas alcanzadas',v:fmtN(overview.reach),c:'#60a5fa'},
                              {l:'Veces que vio el anuncio',v:(+overview.frequency).toFixed(1)+'x',c:overview.frequency>3.5?'#f87171':overview.frequency>2.5?'#fcd34d':'#6ee7b7'},
                              ...(overview.impressions>0?[{l:'Impresiones totales',v:fmtN(overview.impressions),c:'#a78bfa'}]:[]),
                            ].map((s,i)=>(
                              <div key={i} style={{textAlign:'center'}}>
                                <div style={{fontSize:'22px',fontWeight:'800',color:s.c,marginBottom:'2px'}}>{s.v}</div>
                                <div style={{fontSize:'9px',color:'#555',fontFamily:'monospace',maxWidth:'80px',textAlign:'center',lineHeight:'1.4',textTransform:'uppercase',letterSpacing:'.04em'}}>{s.l}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* KPIs principales - las métricas más importantes */}
                  <div style={{marginBottom:'8px'}}>
                    <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'10px'}}>📌 Métricas clave</div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:'10px',marginBottom:'20px'}}>
                      <MetricCard l='Dinero gastado' v={fmt$(overview.spend)} sub='total del período' prev={prevOverview?.spend} comparing={comparing} help='Dinero total que Meta cobró en este período por mostrar tus anuncios.'/>
                      <MetricCard l='Resultados' v={fmtN(overview.results)} sub={overview.results>0?'¡obtenidos!':'sin resultados'} pos={overview.results>0} prev={prevOverview?.results} comparing={comparing} help='Acciones clave logradas: mensajes, leads, ventas o clics — según el objetivo de tu campaña.'/>
                      <MetricCard l='Costo por resultado' v={overview.cpr>0?fmt$(overview.cpr):'Sin resultados'} sub={overview.cpr>0?'por cada resultado':'revisa tu campaña'} alert={overview.cpr===0&&overview.spend>50} prev={prevOverview?.cpr} comparing={comparing} help='Cuánto pagaste en promedio por cada resultado. Mientras más bajo, más eficiente es tu campaña.'/>
                      <MetricCard l='Personas alcanzadas' v={fmtN(overview.reach)} sub='personas únicas' prev={prevOverview?.reach} comparing={comparing} help='Cuántas personas diferentes vieron tu anuncio al menos una vez en este período.'/>
                    </div>
                  </div>

                  {/* Rendimiento del anuncio */}
                  <div style={{marginBottom:'8px'}}>
                    <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'10px'}}>⚡ Rendimiento del anuncio</div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(145px,1fr))',gap:'10px',marginBottom:'20px'}}>
                      <MetricCard l='CTR (clics)' v={fmtP(overview.ctr)} sub={overview.ctr>=2?'Excelente ✓':overview.ctr>=1?'Bueno':'Bajo — mejorar'} alert={overview.ctr<1} pos={overview.ctr>=2} prev={prevOverview?.ctr} comparing={comparing} help='Porcentaje de personas que hacen clic en tu anuncio. Menos de 1% es bajo; arriba de 2% es excelente.'/>
                      <MetricCard l='Frecuencia' v={(+overview.frequency).toFixed(2)} sub={overview.frequency<=2?'Óptima ✓':overview.frequency<=3.5?'Revisar':'⚠ Fatiga publicitaria'} alert={overview.frequency>3.5} pos={overview.frequency<=2} prev={prevOverview?.frequency} comparing={comparing} help='Cuántas veces vio tu anuncio cada persona en promedio. Si supera 3.5, la gente empieza a ignorarlo.'/>
                      <MetricCard l='CPM' v={fmt$(overview.cpm)} sub='por 1,000 impresiones' prev={prevOverview?.cpm} comparing={comparing} help='Cuánto pagas por cada 1,000 veces que se muestra tu anuncio. Útil para comparar campañas.'/>
                      <MetricCard l='CPC' v={fmt$(overview.cpc)} sub='por clic recibido' prev={prevOverview?.cpc} comparing={comparing} help='Cuánto pagas por cada clic. Si es muy alto, tu anuncio no está siendo relevante para el público.'/>
                      <MetricCard l='Impresiones' v={fmtN(overview.impressions)} sub='veces mostrado' prev={prevOverview?.impressions} comparing={comparing} help='Número de veces que tu anuncio apareció en pantalla (incluyendo la misma persona varias veces).'/>
                      <MetricCard l='Clics totales' v={fmtN(overview.clicks)} sub='a tu destino' prev={prevOverview?.clicks} comparing={comparing} help='Total de clics recibidos en el anuncio. Puede incluir clics en "Me gusta" o "Compartir".'/>
                      {overview.hookRate>0&&<MetricCard l='Hook Rate' v={overview.hookRate.toFixed(1)+'%'} sub={overview.hookRate>=25?'Buen gancho ✓':'Mejorar los primeros 3s'} pos={overview.hookRate>=25} alert={overview.hookRate<15} prev={prevOverview?.hookRate} comparing={comparing} help='Qué % de personas vio los primeros 3 segundos del video. Es el "gancho". 25%+ es bueno, 35%+ excelente.'/>}
                      {overview.holdRate>0&&<MetricCard l='Hold Rate' v={overview.holdRate.toFixed(1)+'%'} sub={overview.holdRate>=40?'Buen contenido ✓':'El video no retiene'} pos={overview.holdRate>=40} alert={overview.holdRate<25} prev={prevOverview?.holdRate} comparing={comparing} help='Qué % de quienes empezaron el video lo terminaron. 40%+ significa que el contenido engancha.'/>}
                    </div>
                  </div>

                  {/* Engagement */}
                  <div style={{marginBottom:'24px'}}>
                    <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'10px'}}>💬 Engagement (interacciones)</div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:'10px'}}>
                      <MetricCard l='Reacciones' v={fmtN(overview.reactions)} sub='likes y emojis' prev={prevOverview?.reactions} comparing={comparing} help='Número de reacciones (Me gusta, Me encanta, etc.) en tus anuncios.'/>
                      <MetricCard l='Comentarios' v={fmtN(overview.comments)} sub='en tus anuncios' prev={prevOverview?.comments} comparing={comparing} help='Comentarios que dejaron las personas en tus anuncios.'/>
                      <MetricCard l='Guardados' v={fmtN(overview.saves)} sub='guardaron tu post' prev={prevOverview?.saves} comparing={comparing} help='Personas que guardaron tu anuncio. Una señal de que el contenido es muy valioso.'/>
                      <MetricCard l='Compartidos' v={fmtN(overview.shares)} sub='veces compartido' prev={prevOverview?.shares} comparing={comparing} help='Cuántas veces se compartió tu anuncio. Si es alto, el contenido resuena mucho.'/>
                    </div>
                  </div>
                </>
              )}


              {platform === 'meta_ads' && daily.length>1&&(
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'24px'}}>
                  <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px'}}>
                    <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'14px'}}>Spend vs Resultados por dia</div>
                    <div style={{height:'200px'}}>
                      <Line data={{labels:daily.map(d=>d.date.slice(5)),datasets:[
                        {label:'Gastado ($)',data:daily.map(d=>+d.spend.toFixed(2)),borderColor:'#f97316',backgroundColor:'rgba(249,115,22,.08)',fill:true,tension:.4,yAxisID:'y',pointRadius:2,borderWidth:2},
                        {label:'Resultados',data:daily.map(d=>d.results),borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,.08)',fill:true,tension:.4,yAxisID:'y1',pointRadius:2,borderWidth:2}
                      ]}} options={chartOpts(true)}/>
                    </div>
                  </div>
                  <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px'}}>
                    <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'14px'}}>CTR y CPM por dia</div>
                    <div style={{height:'200px'}}>
                      <Line data={{labels:daily.map(d=>d.date.slice(5)),datasets:[
                        {label:'CTR %',data:daily.map(d=>+d.ctr.toFixed(2)),borderColor:'#6ee7b7',backgroundColor:'rgba(110,231,183,.06)',fill:true,tension:.4,yAxisID:'y',pointRadius:2,borderWidth:2},
                        {label:'CPM',data:daily.map(d=>+d.cpm.toFixed(2)),borderColor:'#fcd34d',backgroundColor:'rgba(252,211,77,.06)',fill:true,tension:.4,yAxisID:'y1',pointRadius:2,borderWidth:2}
                      ]}} options={chartOpts(true)}/>
                    </div>
                  </div>
                  {daily.some(d=>d.hookRate>0)&&(
                    <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px'}}>
                      <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'14px'}}>Hook Rate y Hold Rate por dia</div>
                      <div style={{height:'200px'}}>
                        <Line data={{labels:daily.map(d=>d.date.slice(5)),datasets:[
                          {label:'Hook Rate %',data:daily.map(d=>+d.hookRate.toFixed(2)),borderColor:'#a78bfa',backgroundColor:'rgba(167,139,250,.06)',fill:true,tension:.4,yAxisID:'y',pointRadius:2,borderWidth:2},
                          {label:'Hold Rate %',data:daily.map(d=>+d.holdRate.toFixed(2)),borderColor:'#ec4899',backgroundColor:'rgba(236,72,153,.06)',fill:true,tension:.4,yAxisID:'y1',pointRadius:2,borderWidth:2}
                        ]}} options={chartOpts(true)}/>
                      </div>
                    </div>
                  )}
                  {daily.some(d=>d.frequency>0)&&(
                    <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px'}}>
                      <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'14px'}}>Frecuencia por dia</div>
                      <div style={{height:'200px'}}>
                        <Line data={{labels:daily.map(d=>d.date.slice(5)),datasets:[
                          {label:'Frecuencia',data:daily.map(d=>+d.frequency.toFixed(2)),borderColor:'#fcd34d',backgroundColor:'rgba(252,211,77,.06)',fill:true,tension:.4,pointRadius:2,borderWidth:2,
                          pointBackgroundColor:daily.map(d=>d.frequency>3.5?'#f87171':d.frequency>2.5?'#fcd34d':'#6ee7b7')}
                        ]}} options={{...chartOpts(),plugins:{...chartOpts().plugins,annotation:{annotations:{line1:{type:'line',yMin:2,yMax:2,borderColor:'rgba(110,231,183,.4)',borderWidth:1,borderDash:[4,4]},line2:{type:'line',yMin:3.5,yMax:3.5,borderColor:'rgba(248,113,113,.4)',borderWidth:1,borderDash:[4,4]}}}}}}/>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {platform === 'meta_ads' && overview && overview.vid25>0&&(
                <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px',marginBottom:'24px'}}>
                  <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'14px'}}>Embudo de video completo</div>
                  <div style={{display:'flex',gap:'8px',alignItems:'flex-end',height:'140px',paddingBottom:'24px'}}>
                    {[{l:'3s',v:overview.vid3s,c:'#a78bfa'},{l:'25%',v:overview.vid25,c:'#6ee7b7'},{l:'50%',v:overview.vid50,c:'#3b82f6'},{l:'75%',v:overview.vid75,c:'#f97316'},{l:'100%',v:overview.vid100,c:'#f87171'}].map((b,i,arr)=>{
                      const max=(arr[0].v||arr[1].v)||1; const pct=Math.round(b.v/max*100)
                      return (
                        <div key={b.l} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>
                          <div style={{fontSize:'11px',color:'#fff',fontWeight:'700'}}>{fmtN(b.v)}</div>
                          <div style={{width:'100%',height:Math.max(pct*.8,4)+'px',background:b.c,borderRadius:'4px 4px 0 0',opacity:.8}}></div>
                          <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace'}}>{b.l}</div>
                          <div style={{fontSize:'10px',color:b.c,fontFamily:'monospace',fontWeight:'700'}}>{pct}%</div>
                        </div>
                      )
                    })}
                  </div>
                  {overview.hookRate>0&&(
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginTop:'12px',borderTop:'1px solid #1a1a22',paddingTop:'12px'}}>
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:'9px',color:'#555',fontFamily:'monospace',marginBottom:'4px'}}>HOOK RATE (detiene el scroll)</div>
                        <div style={{fontSize:'22px',fontWeight:'800',color:overview.hookRate>=25?'#6ee7b7':overview.hookRate<15?'#f87171':'#fcd34d'}}>{overview.hookRate.toFixed(1)}%</div>
                        <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace'}}>benchmark: 25%+ bueno · 35%+ excelente</div>
                      </div>
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:'9px',color:'#555',fontFamily:'monospace',marginBottom:'4px'}}>HOLD RATE (termina el video)</div>
                        <div style={{fontSize:'22px',fontWeight:'800',color:overview.holdRate>=40?'#6ee7b7':overview.holdRate<25?'#f87171':'#fcd34d'}}>{overview.holdRate.toFixed(1)}%</div>
                        <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace'}}>benchmark: 40%+ bueno · 50%+ excelente</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab==='campanas'&&(
            isPro === false ? <ProGate feature="el desglose de campañas" type="campanas"/> :
            <>
              <div style={{background:'rgba(99,102,241,.06)',border:'1px solid rgba(99,102,241,.15)',borderRadius:'8px',padding:'10px 16px',marginBottom:'16px',fontSize:'11px',color:'#a5b4fc',display:'flex',alignItems:'center',gap:'8px'}}>
                <span>🎯</span>
                <span>Cada fila es una campaña. Haz clic en cualquiera para ver su diagnóstico y recomendaciones personalizadas.</span>
              </div>
              {campaigns.length>0&&(()=>{
                const hasResults  = campaigns.some(c=>c.results>0)
                const byResults   = [...campaigns].sort((a,b)=>b.results-a.results)
                const bySpend     = [...campaigns].sort((a,b)=>b.spend-a.spend)
                const cprList     = campaigns.filter(c=>c.cpr>0).sort((a,b)=>a.cpr-b.cpr)
                const totalRes    = campaigns.reduce((s,c)=>s+c.results,0)
                const totalSpend  = campaigns.reduce((s,c)=>s+c.spend,0)
                const best        = hasResults ? byResults[0] : bySpend[0]
                const bestResPct  = totalRes>0 ? Math.round(best.results/totalRes*100) : 0
                const bestSpPct   = totalSpend>0 ? Math.round(best.spend/totalSpend*100) : 0
                const shortName   = n => n.length>32?n.slice(0,32)+'…':n
                const barBg       = (arr,i) => i===0?'rgba(110,231,183,.55)':i===arr.length-1&&arr.length>2?'rgba(248,113,113,.4)':'rgba(99,102,241,.35)'
                const barBorder   = (arr,i) => i===0?'#6ee7b7':i===arr.length-1&&arr.length>2?'#f87171':'#6366f1'
                const rowH        = (n) => Math.min(360, Math.max(140, n*46))
                return (
                  <>
                    {/* CHART 1 — ¿Qué campaña genera más resultados? */}
                    <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'14px',padding:'24px',marginBottom:'14px'}}>
                      <div style={{marginBottom:'16px'}}>
                        <div style={{fontSize:'15px',fontWeight:'800',color:'#e0e0e0',marginBottom:'4px'}}>
                          {hasResults ? '¿Cuál campaña genera más resultados?' : '¿Cómo se distribuye el presupuesto?'}
                        </div>
                        <div style={{fontSize:'11px',color:'#555',fontFamily:'monospace'}}>
                          {hasResults ? 'Campañas ordenadas de la que más genera a la que menos — verde = líder' : 'Sin resultados registrados · mostrando distribución del gasto por campaña'}
                        </div>
                      </div>
                      <div style={{height:rowH(hasResults?byResults.length:bySpend.length)+'px'}}>
                        <Bar
                          data={{
                            labels:(hasResults?byResults:bySpend).map(c=>shortName(c.name)),
                            datasets:[{
                              label:hasResults?'Resultados':'Gastado ($)',
                              data:(hasResults?byResults:bySpend).map(c=>hasResults?c.results:+c.spend.toFixed(2)),
                              backgroundColor:(hasResults?byResults:bySpend).map((_,i,arr)=>barBg(arr,i)),
                              borderColor:(hasResults?byResults:bySpend).map((_,i,arr)=>barBorder(arr,i)),
                              borderWidth:1,borderRadius:4
                            }]
                          }}
                          options={hBarOpts(hasResults?'':'$')}
                        />
                      </div>
                      {hasResults && best.results>0 && (
                        <div style={{marginTop:'14px',padding:'12px 16px',background:'rgba(110,231,183,.05)',border:'1px solid rgba(110,231,183,.15)',borderRadius:'8px',fontSize:'12px',color:'#999',lineHeight:'1.7'}}>
                          <strong style={{color:'#6ee7b7'}}>🏆 {shortName(best.name)}</strong> lidera con{' '}
                          <strong style={{color:'#fff'}}>{fmtN(best.results)} resultados</strong>
                          {totalRes>0 && <> ({bestResPct}% del total)</>}
                          {bestSpPct<bestResPct && <>, usando solo el <strong style={{color:'#fcd34d'}}>{bestSpPct}%</strong> del presupuesto — es tu campaña más eficiente</>}
                          {bestSpPct>=bestResPct && <>, con el <strong style={{color:'#fcd34d'}}>{bestSpPct}%</strong> del presupuesto</>}
                          .
                        </div>
                      )}
                      {!hasResults && (
                        <div style={{marginTop:'14px',padding:'12px 16px',background:'rgba(248,113,113,.05)',border:'1px solid rgba(248,113,113,.15)',borderRadius:'8px',fontSize:'12px',color:'#999',lineHeight:'1.7'}}>
                          <strong style={{color:'#f87171'}}>⚠️ Ninguna campaña registra resultados</strong> en este período. Revisa el objetivo de conversión, la segmentación y el creativo. Si son campañas de reconocimiento, verifica el alcance en la pestaña Resumen.
                        </div>
                      )}
                    </div>

                    {/* CHART 2 — ¿Cuánto cuesta cada resultado? */}
                    {cprList.length>1&&(
                      <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'14px',padding:'24px',marginBottom:'14px'}}>
                        <div style={{marginBottom:'16px'}}>
                          <div style={{fontSize:'15px',fontWeight:'800',color:'#e0e0e0',marginBottom:'4px'}}>¿Cuánto cuesta obtener cada resultado?</div>
                          <div style={{fontSize:'11px',color:'#555',fontFamily:'monospace'}}>Barra más corta = más barato = más eficiente — verde es la mejor, rojo la más cara</div>
                        </div>
                        <div style={{height:rowH(cprList.length)+'px'}}>
                          <Bar
                            data={{
                              labels:cprList.map(c=>shortName(c.name)),
                              datasets:[{
                                label:'Costo por resultado ($)',
                                data:cprList.map(c=>+c.cpr.toFixed(2)),
                                backgroundColor:cprList.map((_,i,arr)=>barBg(arr,i)),
                                borderColor:cprList.map((_,i,arr)=>barBorder(arr,i)),
                                borderWidth:1,borderRadius:4
                              }]
                            }}
                            options={hBarOpts('$')}
                          />
                        </div>
                        <div style={{marginTop:'14px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                          <div style={{padding:'12px 14px',background:'rgba(110,231,183,.05)',border:'1px solid rgba(110,231,183,.15)',borderRadius:'8px'}}>
                            <div style={{fontSize:'9px',color:'#6ee7b7',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'4px'}}>✅ Más eficiente</div>
                            <div style={{fontSize:'13px',fontWeight:'800',color:'#fff',marginBottom:'2px'}}>{shortName(cprList[0].name)}</div>
                            <div style={{fontSize:'12px',color:'#6ee7b7'}}>{fmt$(cprList[0].cpr)} por resultado</div>
                          </div>
                          <div style={{padding:'12px 14px',background:'rgba(248,113,113,.05)',border:'1px solid rgba(248,113,113,.15)',borderRadius:'8px'}}>
                            <div style={{fontSize:'9px',color:'#f87171',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'4px'}}>⚠️ Más cara</div>
                            <div style={{fontSize:'13px',fontWeight:'800',color:'#fff',marginBottom:'2px'}}>{shortName(cprList[cprList.length-1].name)}</div>
                            <div style={{fontSize:'12px',color:'#f87171'}}>{fmt$(cprList[cprList.length-1].cpr)} por resultado · {(cprList[cprList.length-1].cpr/cprList[0].cpr).toFixed(1)}x más cara</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
              {campaigns.map((c,i)=><ExpandCard key={i} name={c.name} badge={OBJECTIVE_MAP[c.objective]?.label||c.objective} row={c}/>)}
              {campaigns.length===0&&(
                <div style={{textAlign:'center',padding:'60px 20px',color:'var(--text4)'}}>
                  <div style={{fontSize:'32px',marginBottom:'12px'}}>🔍</div>
                  <div style={{fontSize:'14px',fontWeight:'700',color:'var(--text)',marginBottom:'6px'}}>Sin campañas en este período</div>
                  <div style={{fontSize:'12px',color:'var(--text4)'}}>Prueba seleccionando un rango de fechas diferente</div>
                </div>
              )}
            </>
          )}

          {activeTab==='conjuntos'&&(
            isPro === false ? <ProGate feature="el desglose de conjuntos de anuncios" type="conjuntos"/> :
            <>
              <div style={{background:'rgba(99,102,241,.06)',border:'1px solid rgba(99,102,241,.15)',borderRadius:'8px',padding:'10px 16px',marginBottom:'16px',fontSize:'11px',color:'#a5b4fc',display:'flex',alignItems:'center',gap:'8px'}}>
                <span>👥</span>
                <span>Los conjuntos definen a quién se muestra tu anuncio (segmentación, presupuesto y ubicación). Haz clic para ver diagnóstico.</span>
              </div>
              {adsets.length>0&&(()=>{
                const hasResults = adsets.some(a=>a.results>0)
                const byResults  = [...adsets].sort((a,b)=>b.results-a.results)
                const bySpend    = [...adsets].sort((a,b)=>b.spend-a.spend)
                const cprList    = adsets.filter(a=>a.cpr>0).sort((a,b)=>a.cpr-b.cpr)
                const totalRes   = adsets.reduce((s,a)=>s+a.results,0)
                const best       = hasResults ? byResults[0] : bySpend[0]
                const bestResPct = totalRes>0 ? Math.round(best.results/totalRes*100) : 0
                const shortName  = n => n.length>32?n.slice(0,32)+'…':n
                const barBg      = (arr,i) => i===0?'rgba(110,231,183,.55)':i===arr.length-1&&arr.length>2?'rgba(248,113,113,.4)':'rgba(99,102,241,.35)'
                const barBorder  = (arr,i) => i===0?'#6ee7b7':i===arr.length-1&&arr.length>2?'#f87171':'#6366f1'
                const rowH       = n => Math.min(380, Math.max(140, n*46))
                return (
                  <>
                    {/* CHART 1 — ¿Qué audiencia responde mejor? */}
                    <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'14px',padding:'24px',marginBottom:'14px'}}>
                      <div style={{marginBottom:'16px'}}>
                        <div style={{fontSize:'15px',fontWeight:'800',color:'#e0e0e0',marginBottom:'4px'}}>
                          {hasResults ? '¿Qué audiencia está respondiendo mejor?' : '¿Cómo se distribuye el presupuesto por audiencia?'}
                        </div>
                        <div style={{fontSize:'11px',color:'#555',fontFamily:'monospace'}}>
                          Cada conjunto de anuncios define una audiencia distinta — verde = la que más resultados genera
                        </div>
                      </div>
                      <div style={{height:rowH((hasResults?byResults:bySpend).length)+'px'}}>
                        <Bar
                          data={{
                            labels:(hasResults?byResults:bySpend).map(a=>shortName(a.name)),
                            datasets:[{
                              label:hasResults?'Resultados':'Gastado ($)',
                              data:(hasResults?byResults:bySpend).map(a=>hasResults?a.results:+a.spend.toFixed(2)),
                              backgroundColor:(hasResults?byResults:bySpend).map((_,i,arr)=>barBg(arr,i)),
                              borderColor:(hasResults?byResults:bySpend).map((_,i,arr)=>barBorder(arr,i)),
                              borderWidth:1,borderRadius:4
                            }]
                          }}
                          options={hBarOpts(hasResults?'':'$')}
                        />
                      </div>
                      {hasResults && best.results>0 && (
                        <div style={{marginTop:'14px',padding:'12px 16px',background:'rgba(110,231,183,.05)',border:'1px solid rgba(110,231,183,.15)',borderRadius:'8px',fontSize:'12px',color:'#999',lineHeight:'1.7'}}>
                          <strong style={{color:'#6ee7b7'}}>🏆 {shortName(best.name)}</strong> es la audiencia más efectiva con{' '}
                          <strong style={{color:'#fff'}}>{fmtN(best.results)} resultados</strong>
                          {totalRes>0&&<> ({bestResPct}% del total)</>}.
                          {byResults.length>1&&byResults[byResults.length-1].spend>0&&byResults[byResults.length-1].results===0&&
                            <> La audiencia <strong style={{color:'#f87171'}}>{shortName(byResults[byResults.length-1].name)}</strong> no está generando resultados — considera ajustar su segmentación o pausarla.</>
                          }
                        </div>
                      )}
                    </div>

                    {/* CHART 2 — ¿Cuál audiencia tiene el mejor costo? */}
                    {cprList.length>1&&(
                      <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'14px',padding:'24px',marginBottom:'14px'}}>
                        <div style={{marginBottom:'16px'}}>
                          <div style={{fontSize:'15px',fontWeight:'800',color:'#e0e0e0',marginBottom:'4px'}}>¿Cuál audiencia convierte al menor costo?</div>
                          <div style={{fontSize:'11px',color:'#555',fontFamily:'monospace'}}>Barra más corta = cada resultado le costó menos — esa audiencia es la más rentable</div>
                        </div>
                        <div style={{height:rowH(cprList.length)+'px'}}>
                          <Bar
                            data={{
                              labels:cprList.map(a=>shortName(a.name)),
                              datasets:[{
                                label:'Costo por resultado ($)',
                                data:cprList.map(a=>+a.cpr.toFixed(2)),
                                backgroundColor:cprList.map((_,i,arr)=>barBg(arr,i)),
                                borderColor:cprList.map((_,i,arr)=>barBorder(arr,i)),
                                borderWidth:1,borderRadius:4
                              }]
                            }}
                            options={hBarOpts('$')}
                          />
                        </div>
                        <div style={{marginTop:'14px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                          <div style={{padding:'12px 14px',background:'rgba(110,231,183,.05)',border:'1px solid rgba(110,231,183,.15)',borderRadius:'8px'}}>
                            <div style={{fontSize:'9px',color:'#6ee7b7',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'4px'}}>✅ Audiencia más rentable</div>
                            <div style={{fontSize:'13px',fontWeight:'800',color:'#fff',marginBottom:'2px'}}>{shortName(cprList[0].name)}</div>
                            <div style={{fontSize:'12px',color:'#6ee7b7'}}>{fmt$(cprList[0].cpr)} por resultado</div>
                          </div>
                          <div style={{padding:'12px 14px',background:'rgba(248,113,113,.05)',border:'1px solid rgba(248,113,113,.15)',borderRadius:'8px'}}>
                            <div style={{fontSize:'9px',color:'#f87171',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'4px'}}>⚠️ Audiencia más cara</div>
                            <div style={{fontSize:'13px',fontWeight:'800',color:'#fff',marginBottom:'2px'}}>{shortName(cprList[cprList.length-1].name)}</div>
                            <div style={{fontSize:'12px',color:'#f87171'}}>{fmt$(cprList[cprList.length-1].cpr)} por resultado · {(cprList[cprList.length-1].cpr/cprList[0].cpr).toFixed(1)}x más cara</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
              {adsets.map((a,i)=><ExpandCard key={i} name={a.name} sub={'Campaña: '+a.campaign} row={a}/>)}
              {adsets.length===0&&(
                <div style={{textAlign:'center',padding:'60px 20px',color:'var(--text4)'}}>
                  <div style={{fontSize:'32px',marginBottom:'12px'}}>🔍</div>
                  <div style={{fontSize:'14px',fontWeight:'700',color:'var(--text)',marginBottom:'6px'}}>Sin conjuntos en este período</div>
                  <div style={{fontSize:'12px',color:'var(--text4)'}}>Prueba seleccionando un rango de fechas diferente</div>
                </div>
              )}
            </>
          )}

          {activeTab==='anuncios'&&(
            isPro === false ? <ProGate feature="el score de creativos" type="anuncios"/> :
            <>
              <div style={{background:'rgba(167,139,250,.06)',border:'1px solid rgba(167,139,250,.15)',borderRadius:'8px',padding:'10px 16px',marginBottom:'16px',fontSize:'11px',color:'#a78bfa',display:'flex',alignItems:'center',gap:'8px'}}>
                <span>🖼</span>
                <span>Cada anuncio tiene un <strong>Score del 0 al 100</strong> — ordenados del mejor al peor. Haz clic para ver qué mejorar.</span>
              </div>
              {ads.length>0&&(()=>{
                const byScore   = [...ads].sort((a,b)=>qualityScore(b)-qualityScore(a))
                const byResults = [...ads].sort((a,b)=>b.results-a.results)
                const cprList   = ads.filter(a=>a.cpr>0).sort((a,b)=>a.cpr-b.cpr)
                const winner    = byScore[0]
                const loser     = byScore[byScore.length-1]
                const hasResults= ads.some(a=>a.results>0)
                const shortName = n => n.length>32?n.slice(0,32)+'…':n
                const rowH      = n => Math.min(420, Math.max(140, n*46))
                const scoreColor= q => q>=75?'rgba(110,231,183,.55)':q>=50?'rgba(252,211,77,.5)':'rgba(248,113,113,.4)'
                const scoreBorder=q => q>=75?'#6ee7b7':q>=50?'#fcd34d':'#f87171'
                const top = byScore.slice(0,10)
                return (
                  <>
                    {/* HEADER: ganador y el que necesita atención */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'14px'}}>
                      <div style={{background:'rgba(110,231,183,.05)',border:'1px solid rgba(110,231,183,.2)',borderRadius:'14px',padding:'20px'}}>
                        <div style={{fontSize:'9px',color:'#6ee7b7',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'8px'}}>🏆 Anuncio ganador</div>
                        <div style={{fontSize:'13px',fontWeight:'800',color:'#fff',marginBottom:'6px',lineHeight:'1.4'}}>{shortName(winner.name)}</div>
                        <div style={{display:'flex',gap:'16px',flexWrap:'wrap'}}>
                          <div><div style={{fontSize:'18px',fontWeight:'800',color:'#6ee7b7'}}>{qualityScore(winner)}<span style={{fontSize:'11px',color:'#555'}}>/100</span></div><div style={{fontSize:'9px',color:'#555',fontFamily:'monospace'}}>SCORE</div></div>
                          {winner.results>0&&<div><div style={{fontSize:'18px',fontWeight:'800',color:'#fff'}}>{fmtN(winner.results)}</div><div style={{fontSize:'9px',color:'#555',fontFamily:'monospace'}}>RESULTADOS</div></div>}
                          {winner.cpr>0&&<div><div style={{fontSize:'18px',fontWeight:'800',color:'#6ee7b7'}}>{fmt$(winner.cpr)}</div><div style={{fontSize:'9px',color:'#555',fontFamily:'monospace'}}>C/RESULTADO</div></div>}
                        </div>
                      </div>
                      {byScore.length>1&&(
                        <div style={{background:'rgba(248,113,113,.05)',border:'1px solid rgba(248,113,113,.2)',borderRadius:'14px',padding:'20px'}}>
                          <div style={{fontSize:'9px',color:'#f87171',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'8px'}}>⚠️ Necesita atención</div>
                          <div style={{fontSize:'13px',fontWeight:'800',color:'#fff',marginBottom:'6px',lineHeight:'1.4'}}>{shortName(loser.name)}</div>
                          <div style={{display:'flex',gap:'16px',flexWrap:'wrap'}}>
                            <div><div style={{fontSize:'18px',fontWeight:'800',color:'#f87171'}}>{qualityScore(loser)}<span style={{fontSize:'11px',color:'#555'}}>/100</span></div><div style={{fontSize:'9px',color:'#555',fontFamily:'monospace'}}>SCORE</div></div>
                            <div><div style={{fontSize:'18px',fontWeight:'800',color:'#fff'}}>{fmt$(loser.spend)}</div><div style={{fontSize:'9px',color:'#555',fontFamily:'monospace'}}>GASTADO</div></div>
                            {loser.results===0&&<div style={{display:'flex',alignItems:'center'}}><span style={{fontSize:'11px',color:'#f87171',fontFamily:'monospace'}}>Sin resultados</span></div>}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CHART 1 — Ranking de creativos por score */}
                    <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'14px',padding:'24px',marginBottom:'14px'}}>
                      <div style={{marginBottom:'16px'}}>
                        <div style={{fontSize:'15px',fontWeight:'800',color:'#e0e0e0',marginBottom:'4px'}}>¿Cuál anuncio está funcionando mejor?</div>
                        <div style={{fontSize:'11px',color:'#555',fontFamily:'monospace'}}>Score del 0-100 que combina CTR, frecuencia, resultados y métricas de video — verde = excelente, rojo = revisar</div>
                      </div>
                      <div style={{height:rowH(top.length)+'px'}}>
                        <Bar
                          data={{
                            labels:top.map(a=>shortName(a.name)),
                            datasets:[{
                              label:'Score /100',
                              data:top.map(a=>qualityScore(a)),
                              backgroundColor:top.map(a=>scoreColor(qualityScore(a))),
                              borderColor:top.map(a=>scoreBorder(qualityScore(a))),
                              borderWidth:1,borderRadius:4
                            }]
                          }}
                          options={hBarOpts()}
                        />
                      </div>
                    </div>

                    {/* CHART 2 — ¿Cuál anuncio genera más resultados? */}
                    {hasResults&&(
                      <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'14px',padding:'24px',marginBottom:'14px'}}>
                        <div style={{marginBottom:'16px'}}>
                          <div style={{fontSize:'15px',fontWeight:'800',color:'#e0e0e0',marginBottom:'4px'}}>¿Cuál anuncio genera más resultados?</div>
                          <div style={{fontSize:'11px',color:'#555',fontFamily:'monospace'}}>El creativo que más leads, mensajes o ventas produce en este período</div>
                        </div>
                        <div style={{height:rowH(Math.min(byResults.filter(a=>a.results>0).length,10))+'px'}}>
                          <Bar
                            data={{
                              labels:byResults.filter(a=>a.results>0).slice(0,10).map(a=>shortName(a.name)),
                              datasets:[{
                                label:'Resultados',
                                data:byResults.filter(a=>a.results>0).slice(0,10).map(a=>a.results),
                                backgroundColor:byResults.filter(a=>a.results>0).slice(0,10).map((_,i,arr)=>i===0?'rgba(110,231,183,.55)':i===arr.length-1&&arr.length>2?'rgba(248,113,113,.4)':'rgba(99,102,241,.35)'),
                                borderColor:byResults.filter(a=>a.results>0).slice(0,10).map((_,i,arr)=>i===0?'#6ee7b7':i===arr.length-1&&arr.length>2?'#f87171':'#6366f1'),
                                borderWidth:1,borderRadius:4
                              }]
                            }}
                            options={hBarOpts()}
                          />
                        </div>
                        {cprList.length>1&&(
                          <div style={{marginTop:'14px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                            <div style={{padding:'12px 14px',background:'rgba(110,231,183,.05)',border:'1px solid rgba(110,231,183,.15)',borderRadius:'8px'}}>
                              <div style={{fontSize:'9px',color:'#6ee7b7',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'4px'}}>✅ Creativo más rentable</div>
                              <div style={{fontSize:'13px',fontWeight:'800',color:'#fff',marginBottom:'2px'}}>{shortName(cprList[0].name)}</div>
                              <div style={{fontSize:'12px',color:'#6ee7b7'}}>{fmt$(cprList[0].cpr)} por resultado</div>
                            </div>
                            <div style={{padding:'12px 14px',background:'rgba(248,113,113,.05)',border:'1px solid rgba(248,113,113,.15)',borderRadius:'8px'}}>
                              <div style={{fontSize:'9px',color:'#f87171',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'4px'}}>⚠️ Creativo más caro</div>
                              <div style={{fontSize:'13px',fontWeight:'800',color:'#fff',marginBottom:'2px'}}>{shortName(cprList[cprList.length-1].name)}</div>
                              <div style={{fontSize:'12px',color:'#f87171'}}>{fmt$(cprList[cprList.length-1].cpr)} por resultado · {(cprList[cprList.length-1].cpr/cprList[0].cpr).toFixed(1)}x más caro</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )
              })()}
              {[...ads].sort((a,b)=>qualityScore(b)-qualityScore(a)).map((a,i)=><AdScoreCard key={i} ad={a}/>)}
              {ads.length===0&&(
                <div style={{textAlign:'center',padding:'60px 20px',color:'var(--text4)'}}>
                  <div style={{fontSize:'32px',marginBottom:'12px'}}>🔍</div>
                  <div style={{fontSize:'14px',fontWeight:'700',color:'var(--text)',marginBottom:'6px'}}>Sin anuncios en este período</div>
                  <div style={{fontSize:'12px',color:'var(--text4)'}}>Prueba seleccionando un rango de fechas diferente</div>
                </div>
              )}
            </>
          )}
{/* ══ GOOGLE ADS TABS ══ */}
{(()=>{
  if (!isGoogle) return null
  // Shared loading/error state
  if (loading) return (
    <div style={{textAlign:'center',padding:'80px 0'}}>
      <div style={{width:'32px',height:'32px',borderRadius:'50%',border:'3px solid rgba(99,102,241,.2)',borderTop:'3px solid #6366f1',animation:'spin 1s linear infinite',margin:'0 auto 12px'}}></div>
      <div style={{fontSize:'12px',color:'var(--text4)'}}>Cargando datos de Google Ads...</div>
    </div>
  )
  if (gadsError) return (
    <div style={{background:'rgba(248,113,113,.06)',border:'1px solid rgba(248,113,113,.2)',borderRadius:'10px',padding:'20px 24px',marginBottom:'20px',display:'flex',alignItems:'center',gap:'16px'}}>
      <div style={{fontSize:'24px'}}>⚠️</div>
      <div style={{flex:1}}>
        <div style={{fontSize:'13px',fontWeight:'700',color:'#f87171',marginBottom:'4px'}}>Error al cargar Google Ads</div>
        <div style={{fontSize:'12px',color:'var(--text4)'}}>{gadsError}</div>
      </div>
      <button onClick={fetchGoogleAdsData} style={{padding:'8px 16px',borderRadius:'7px',border:'1px solid rgba(248,113,113,.3)',background:'rgba(248,113,113,.12)',color:'#f87171',fontSize:'11px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>Reintentar</button>
    </div>
  )
  if (!googleAdsData) return null

  const gd = googleAdsData
  const s  = gd.summary || {}
  const sn = n => n && n.length>32 ? n.slice(0,32)+'…' : (n||'—')
  const barBg     = (arr,i) => i===0?'rgba(110,231,183,.55)':i===arr.length-1&&arr.length>2?'rgba(248,113,113,.4)':'rgba(99,102,241,.35)'
  const barBorder = (arr,i) => i===0?'#6ee7b7':i===arr.length-1&&arr.length>2?'#f87171':'#6366f1'
  const rowH      = n => Math.min(420, Math.max(140, n*46))

  // ── RESUMEN (overview) ───────────────────────────────────────
  if (activeTab==='overview') return null // se renderiza en el bloque overview principal

  // ── CAMPAÑAS ─────────────────────────────────────────────────
  if (activeTab==='gads-campanas') {
    const camps = gd.campaigns || []
    const sorted = [...camps].sort((a,b)=>b.conversions-a.conversions)
    const byCtr  = [...camps].sort((a,b)=>b.ctr-a.ctr)
    const hasConv = camps.some(c=>c.conversions>0)
    return (
      <>
        <div style={{background:'rgba(59,130,246,.06)',border:'1px solid rgba(59,130,246,.15)',borderRadius:'8px',padding:'10px 16px',marginBottom:'16px',fontSize:'11px',color:'#60a5fa',display:'flex',alignItems:'center',gap:'8px'}}>
          <span>🎯</span><span>Cada fila es una campaña. Haz clic para ver su diagnóstico y recomendaciones.</span>
        </div>

        {camps.length > 0 && (
          <>
            {/* CHART 1 — ¿Qué campaña genera más conversiones? */}
            <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'14px',padding:'24px',marginBottom:'14px'}}>
              <div style={{marginBottom:'16px'}}>
                <div style={{fontSize:'15px',fontWeight:'800',color:'#e0e0e0',marginBottom:'4px'}}>
                  {hasConv ? '¿Cuál campaña genera más conversiones?' : '¿Cómo se distribuye el presupuesto?'}
                </div>
                <div style={{fontSize:'11px',color:'#555',fontFamily:'monospace'}}>
                  {hasConv ? 'Verde = líder · Rojo = la que menos genera' : 'Sin conversiones · mostrando gasto por campaña'}
                </div>
              </div>
              <div style={{height:rowH(sorted.length)+'px'}}>
                <Bar data={{
                  labels:(hasConv?sorted:camps).map(c=>sn(c.name)),
                  datasets:[{
                    label:hasConv?'Conversiones':'Gasto ($)',
                    data:(hasConv?sorted:camps).map(c=>hasConv?+c.conversions.toFixed(1):+c.spend.toFixed(2)),
                    backgroundColor:(hasConv?sorted:camps).map((_,i,arr)=>barBg(arr,i)),
                    borderColor:(hasConv?sorted:camps).map((_,i,arr)=>barBorder(arr,i)),
                    borderWidth:1,borderRadius:4
                  }]
                }} options={hBarOpts(hasConv?'':'')}/>
              </div>
              {hasConv && sorted[0] && (
                <div style={{marginTop:'14px',padding:'12px 16px',background:'rgba(110,231,183,.05)',border:'1px solid rgba(110,231,183,.15)',borderRadius:'8px',fontSize:'12px',color:'#999',lineHeight:'1.7'}}>
                  <strong style={{color:'#6ee7b7'}}>🏆 {sn(sorted[0].name)}</strong>{' '}lidera con{' '}
                  <strong style={{color:'#fff'}}>{sorted[0].conversions.toFixed(1)} conversiones</strong>
                  {sorted[0].spend>0 && <> · CPA de <strong style={{color:'#fcd34d'}}>{fmt$(sorted[0].spend/sorted[0].conversions)}</strong></>}.
                </div>
              )}
            </div>

            {/* CHART 2 — CTR por campaña */}
            <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'14px',padding:'24px',marginBottom:'14px'}}>
              <div style={{marginBottom:'16px'}}>
                <div style={{fontSize:'15px',fontWeight:'800',color:'#e0e0e0',marginBottom:'4px'}}>¿Cuál campaña tiene mejor CTR?</div>
                <div style={{fontSize:'11px',color:'#555',fontFamily:'monospace'}}>Mayor CTR = más relevante para tu audiencia · Verde = mejor · Rojo = más baja</div>
              </div>
              <div style={{height:rowH(byCtr.length)+'px'}}>
                <Bar data={{
                  labels:byCtr.map(c=>sn(c.name)),
                  datasets:[{
                    label:'CTR %',
                    data:byCtr.map(c=>+c.ctr.toFixed(2)),
                    backgroundColor:byCtr.map((_,i,arr)=>barBg(arr,i)),
                    borderColor:byCtr.map((_,i,arr)=>barBorder(arr,i)),
                    borderWidth:1,borderRadius:4
                  }]
                }} options={hBarOpts('%')}/>
              </div>
              {byCtr[0] && (
                <div style={{marginTop:'14px',padding:'12px 16px',background:'rgba(110,231,183,.05)',border:'1px solid rgba(110,231,183,.15)',borderRadius:'8px',fontSize:'12px',color:'#999',lineHeight:'1.7'}}>
                  <strong style={{color:'#6ee7b7'}}>✓ {sn(byCtr[0].name)}</strong> tiene el mejor CTR ({byCtr[0].ctr.toFixed(2)}%) — su anuncio es el más relevante para las búsquedas.
                </div>
              )}
            </div>
          </>
        )}

        {/* Tarjetas de campaña con diagnóstico */}
        {camps.map((c,i)=>{
          const cr = c.clicks>0 ? (c.conversions/c.clicks*100) : 0
          const roas = c.spend>0 && c.convValue>0 ? c.convValue/c.spend : 0
          return (
            <CampCard key={i} title={c.name} subtitle={c.channelLabel||c.channelType||'—'} status={c.status} statusOk={c.status==='ENABLED'}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(90px,1fr))',gap:'6px',marginBottom:'8px'}}>
                {[
                  {l:'Gasto',v:fmt$(c.spend)},
                  {l:'Impresiones',v:fmtN(c.impressions)},
                  {l:'Clics',v:fmtN(c.clicks)},
                  {l:'CTR',v:fmtP(c.ctr),pos:c.ctr>=2,alert:c.ctr<0.5},
                  {l:'CPC',v:fmt$(c.cpc)},
                  {l:'CPM',v:fmt$(c.cpm)},
                  {l:'Conversiones',v:c.conversions.toFixed(1),pos:c.conversions>0},
                  {l:'Conv. Rate',v:fmtP(cr),pos:cr>=2,alert:cr>0&&cr<1},
                  ...(c.convValue>0?[{l:'Valor conv.',v:fmt$(c.convValue)}]:[]),
                  ...(roas>0?[{l:'ROAS',v:roas.toFixed(2)+'x',pos:roas>=2,alert:roas>0&&roas<1}]:[]),
                ].map(m=><MiniMetric key={m.l} {...m}/>)}
              </div>
              <GadsDiagPanel row={c}/>
            </CampCard>
          )
        })}
        {camps.length===0&&<EmptyState icon='🎯' title='Sin campañas en este período' sub='Prueba otro rango de fechas'/>}
      </>
    )
  }

  // ── GRUPOS DE ANUNCIOS ───────────────────────────────────────
  if (activeTab==='gads-grupos') {
    const groups = gd.adGroups || []
    const sorted = [...groups].sort((a,b)=>b.conversions-a.conversions)
    const byCtr  = [...groups].sort((a,b)=>b.ctr-a.ctr)
    const hasConv = groups.some(g=>g.conversions>0)
    return (
      <>
        <div style={{background:'rgba(99,102,241,.06)',border:'1px solid rgba(99,102,241,.15)',borderRadius:'8px',padding:'10px 16px',marginBottom:'16px',fontSize:'11px',color:'#a5b4fc',display:'flex',alignItems:'center',gap:'8px'}}>
          <span>👥</span><span>Un grupo de anuncios agrupa keywords y anuncios bajo una misma campaña. Identifica cuál está convirtiendo mejor.</span>
        </div>

        {groups.length > 0 && (
          <>
            <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'14px',padding:'24px',marginBottom:'14px'}}>
              <div style={{marginBottom:'16px'}}>
                <div style={{fontSize:'15px',fontWeight:'800',color:'#e0e0e0',marginBottom:'4px'}}>
                  {hasConv ? '¿Qué grupo de anuncios convierte mejor?' : '¿Cómo se distribuye el gasto entre grupos?'}
                </div>
                <div style={{fontSize:'11px',color:'#555',fontFamily:'monospace'}}>Verde = líder · Rojo = el que menos aporta</div>
              </div>
              <div style={{height:rowH(Math.min(sorted.length,12))+'px'}}>
                <Bar data={{
                  labels:(hasConv?sorted:groups).slice(0,12).map(g=>sn(g.name)),
                  datasets:[{
                    label:hasConv?'Conversiones':'Gasto ($)',
                    data:(hasConv?sorted:groups).slice(0,12).map(g=>hasConv?+g.conversions.toFixed(1):+g.spend.toFixed(2)),
                    backgroundColor:(hasConv?sorted:groups).slice(0,12).map((_,i,arr)=>barBg(arr,i)),
                    borderColor:(hasConv?sorted:groups).slice(0,12).map((_,i,arr)=>barBorder(arr,i)),
                    borderWidth:1,borderRadius:4
                  }]
                }} options={hBarOpts()}/>
              </div>
            </div>

            <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'14px',padding:'24px',marginBottom:'14px'}}>
              <div style={{marginBottom:'16px'}}>
                <div style={{fontSize:'15px',fontWeight:'800',color:'#e0e0e0',marginBottom:'4px'}}>¿Cuál grupo tiene mejor CTR?</div>
                <div style={{fontSize:'11px',color:'#555',fontFamily:'monospace'}}>El CTR más alto indica que ese grupo tiene los anuncios más relevantes</div>
              </div>
              <div style={{height:rowH(Math.min(byCtr.length,12))+'px'}}>
                <Bar data={{
                  labels:byCtr.slice(0,12).map(g=>sn(g.name)),
                  datasets:[{label:'CTR %',data:byCtr.slice(0,12).map(g=>+g.ctr.toFixed(2)),backgroundColor:byCtr.slice(0,12).map((_,i,arr)=>barBg(arr,i)),borderColor:byCtr.slice(0,12).map((_,i,arr)=>barBorder(arr,i)),borderWidth:1,borderRadius:4}]
                }} options={hBarOpts('%')}/>
              </div>
            </div>
          </>
        )}

        {groups.map((g,i)=>{
          const cr = g.clicks>0 ? (g.conversions/g.clicks*100) : 0
          return (
            <CampCard key={i} title={g.name} subtitle={`${g.channelLabel||g.channelType||'—'} · ${g.campaignName}`} status={g.status} statusOk={g.status==='ENABLED'}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(90px,1fr))',gap:'6px'}}>
                {[
                  {l:'Gasto',v:fmt$(g.spend)},
                  {l:'Impresiones',v:fmtN(g.impressions)},
                  {l:'Clics',v:fmtN(g.clicks)},
                  {l:'CTR',v:fmtP(g.ctr),pos:g.ctr>=2,alert:g.ctr<0.5},
                  {l:'CPC',v:fmt$(g.cpc)},
                  {l:'Conversiones',v:g.conversions.toFixed(1),pos:g.conversions>0},
                  {l:'Conv. Rate',v:fmtP(cr),pos:cr>=2},
                ].map(m=><MiniMetric key={m.l} {...m}/>)}
              </div>
            </CampCard>
          )
        })}
        {groups.length===0&&<EmptyState icon='👥' title='Sin grupos de anuncios en este período' sub='Prueba otro rango de fechas'/>}
      </>
    )
  }

  // ── ANUNCIOS ─────────────────────────────────────────────────
  if (activeTab==='gads-anuncios') {
    const adsList = gd.ads || []
    const scored  = [...adsList].map(a=>({...a, score:gadsQualityScore(a)})).sort((a,b)=>b.score-a.score)
    const hasConv = adsList.some(a=>a.conversions>0)
    const winner  = scored[0]
    const loser   = scored.length>1 ? scored[scored.length-1] : null
    const byCtr   = [...adsList].sort((a,b)=>b.ctr-a.ctr)
    return (
      <>
        {winner && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px'}}>
            <div style={{background:'rgba(110,231,183,.06)',border:'1px solid rgba(110,231,183,.2)',borderRadius:'12px',padding:'16px 20px'}}>
              <div style={{fontSize:'10px',color:'#6ee7b7',fontWeight:'700',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.07em'}}>🏆 Mejor anuncio</div>
              <div style={{fontSize:'13px',fontWeight:'800',color:'#fff',marginBottom:'4px'}}>{sn(winner.name)}</div>
              <div style={{fontSize:'12px',color:'#888'}}>{hasConv ? `${winner.conversions.toFixed(1)} conv · CTR ${winner.ctr.toFixed(2)}%` : `CTR ${winner.ctr.toFixed(2)}% · ${fmtN(winner.clicks)} clics`}</div>
            </div>
            {loser && (
              <div style={{background:'rgba(248,113,113,.05)',border:'1px solid rgba(248,113,113,.15)',borderRadius:'12px',padding:'16px 20px'}}>
                <div style={{fontSize:'10px',color:'#f87171',fontWeight:'700',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.07em'}}>⚠️ Necesita atención</div>
                <div style={{fontSize:'13px',fontWeight:'800',color:'#fff',marginBottom:'4px'}}>{sn(loser.name)}</div>
                <div style={{fontSize:'12px',color:'#888'}}>{hasConv ? `${loser.conversions.toFixed(1)} conv · CTR ${loser.ctr.toFixed(2)}%` : `CTR ${loser.ctr.toFixed(2)}% · ${fmtN(loser.clicks)} clics`}</div>
              </div>
            )}
          </div>
        )}

        {adsList.length>0 && (
          <>
            <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'14px',padding:'24px',marginBottom:'14px'}}>
              <div style={{marginBottom:'16px'}}>
                <div style={{fontSize:'15px',fontWeight:'800',color:'#e0e0e0',marginBottom:'4px'}}>¿Cuál anuncio tiene mejor CTR?</div>
                <div style={{fontSize:'11px',color:'#555',fontFamily:'monospace'}}>Mayor CTR = más relevante y atractivo para la audiencia</div>
              </div>
              <div style={{height:rowH(Math.min(byCtr.length,10))+'px'}}>
                <Bar data={{
                  labels:byCtr.slice(0,10).map(a=>sn(a.name)),
                  datasets:[{label:'CTR %',data:byCtr.slice(0,10).map(a=>+a.ctr.toFixed(2)),backgroundColor:byCtr.slice(0,10).map((_,i,arr)=>barBg(arr,i)),borderColor:byCtr.slice(0,10).map((_,i,arr)=>barBorder(arr,i)),borderWidth:1,borderRadius:4}]
                }} options={hBarOpts('%')}/>
              </div>
            </div>
          </>
        )}

        {scored.map((a,i)=>{
          const cr   = a.clicks>0 ? (a.conversions/a.clicks*100) : 0
          const roas = a.spend>0 && a.convValue>0 ? a.convValue/a.spend : 0
          const ql   = qualityLabel(a.score)
          return (
            <CampCard key={i} title={a.name||`Anuncio ${i+1}`} subtitle={`${a.channelLabel||a.channelType||'—'} · ${a.campaignName}`} status={a.status} statusOk={a.status==='ENABLED'}>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px'}}>
                <div style={{fontSize:'9px',fontWeight:'700',padding:'3px 10px',borderRadius:'20px',background:`rgba(${ql.color==='#6ee7b7'?'110,231,183':ql.color==='#fcd34d'?'252,211,77':'248,113,113'},.15)`,color:ql.color,border:`1px solid ${ql.color}40`}}>Score {a.score}/100 · {ql.label}</div>
                <div style={{height:'4px',flex:1,background:'rgba(255,255,255,.06)',borderRadius:'2px',overflow:'hidden'}}>
                  <div style={{height:'100%',width:a.score+'%',background:ql.color,borderRadius:'2px',transition:'width .6s ease'}}></div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(90px,1fr))',gap:'6px',marginBottom:'8px'}}>
                {[
                  {l:'Gasto',v:fmt$(a.spend)},
                  {l:'Clics',v:fmtN(a.clicks)},
                  {l:'CTR',v:fmtP(a.ctr),pos:a.ctr>=2,alert:a.ctr<0.5},
                  {l:'CPC',v:fmt$(a.cpc)},
                  {l:'Conversiones',v:a.conversions.toFixed(1),pos:a.conversions>0},
                  {l:'Conv. Rate',v:fmtP(cr),pos:cr>=2},
                  ...(roas>0?[{l:'ROAS',v:roas.toFixed(2)+'x',pos:roas>=2,alert:roas<1}]:[]),
                  ...(a.videoViews>0?[{l:'Vistas',v:fmtN(a.videoViews)},{l:'View Rate',v:fmtP(a.viewRate),pos:a.viewRate>=15}]:[]),
                ].map(m=><MiniMetric key={m.l} {...m}/>)}
              </div>
              <GadsDiagPanel row={a}/>
            </CampCard>
          )
        })}
        {adsList.length===0&&<EmptyState icon='🖼' title='Sin anuncios en este período' sub='Prueba otro rango de fechas'/>}
      </>
    )
  }

  // ── AUDIENCIAS ───────────────────────────────────────────────
  if (activeTab==='gads-audiencia') {
    const demo = gd.demographics || {}
    const age    = demo.age    || []
    const gender = demo.gender || []
    const device = demo.device || []
    const geo    = demo.geo    || []
    const hasData = age.length>0||gender.length>0||device.length>0||geo.length>0
    return (
      <>
        <div style={{background:'rgba(59,130,246,.06)',border:'1px solid rgba(59,130,246,.15)',borderRadius:'8px',padding:'10px 16px',marginBottom:'20px',fontSize:'11px',color:'#60a5fa',display:'flex',alignItems:'center',gap:'8px'}}>
          <span>🗺</span><span>Muestra <strong>quién ve realmente tus anuncios</strong> en Google — por edad, género, dispositivo y país.</span>
        </div>

        {!hasData && <EmptyState icon='🗺' title='Sin datos de audiencia' sub='Aumenta el rango de fechas para obtener datos demográficos'/>}

        {age.length>0 && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'20px'}}>
            <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px'}}>
              <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'14px'}}>Gasto por grupo de edad</div>
              <div style={{height:'220px'}}>
                <Bar data={{labels:age.map(d=>d.label),datasets:[{label:'Gasto ($)',data:age.map(d=>+d.spend.toFixed(2)),backgroundColor:age.map((_,i)=>COLORS[i%COLORS.length]+'80'),borderColor:age.map((_,i)=>COLORS[i%COLORS.length]),borderWidth:1,borderRadius:4}]}} options={chartOpts()}/>
              </div>
            </div>
            <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px'}}>
              <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'14px'}}>CTR por grupo de edad</div>
              <div style={{height:'220px'}}>
                <Bar data={{labels:age.map(d=>d.label),datasets:[{label:'CTR %',data:age.map(d=>d.impressions>0?+(d.clicks/d.impressions*100).toFixed(2):0),backgroundColor:age.map((_,i)=>COLORS[i%COLORS.length]+'80'),borderColor:age.map((_,i)=>COLORS[i%COLORS.length]),borderWidth:1,borderRadius:4}]}} options={chartOpts()}/>
              </div>
            </div>
          </div>
        )}

        {gender.length>0 && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'20px'}}>
            <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px'}}>
              <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'14px'}}>Distribución por género (gasto)</div>
              <div style={{height:'220px'}}>
                <Doughnut data={{labels:gender.map(d=>d.label),datasets:[{data:gender.map(d=>+d.spend.toFixed(2)),backgroundColor:['#3b82f6','#ec4899','#6ee7b7'],borderWidth:0}]}} options={doughnutOpts}/>
              </div>
            </div>
            <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px'}}>
              <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'14px'}}>Conversiones por género</div>
              <div style={{height:'220px'}}>
                <Bar data={{labels:gender.map(d=>d.label),datasets:[{label:'Conversiones',data:gender.map(d=>+d.conversions.toFixed(1)),backgroundColor:['#3b82f680','#ec489980'],borderColor:['#3b82f6','#ec4899'],borderWidth:1,borderRadius:4}]}} options={chartOpts()}/>
              </div>
            </div>
          </div>
        )}

        {device.length>0 && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'20px'}}>
            <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px'}}>
              <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'14px'}}>Gasto por dispositivo</div>
              <div style={{height:'220px'}}>
                <Doughnut data={{labels:device.map(d=>d.label),datasets:[{data:device.map(d=>+d.spend.toFixed(2)),backgroundColor:COLORS.slice(0,device.length).map(c=>c+'cc'),borderWidth:0}]}} options={doughnutOpts}/>
              </div>
            </div>
            <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px'}}>
              <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'14px'}}>CTR por dispositivo</div>
              <div style={{height:'220px'}}>
                <Bar data={{labels:device.map(d=>d.label),datasets:[{label:'CTR %',data:device.map(d=>d.impressions>0?+(d.clicks/d.impressions*100).toFixed(2):0),backgroundColor:COLORS.slice(0,device.length).map(c=>c+'80'),borderColor:COLORS.slice(0,device.length),borderWidth:1,borderRadius:4}]}} options={chartOpts()}/>
              </div>
            </div>
          </div>
        )}

        {geo.length>0 && (
          <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px',marginBottom:'20px'}}>
            <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'16px'}}>Top países por gasto</div>
            {geo.map((g,i)=>{
              const total = geo.reduce((s,x)=>s+x.spend,0)
              const pct   = total>0 ? g.spend/total*100 : 0
              return (
                <div key={i} style={{marginBottom:'10px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                    <span style={{fontSize:'12px',color:'var(--text)',fontWeight:'600'}}>{g.name}</span>
                    <div style={{display:'flex',gap:'16px',fontSize:'11px',color:'var(--text4)'}}>
                      <span>{fmt$(g.spend)}</span>
                      <span>{fmtN(g.clicks)} clics</span>
                      <span>{g.conversions.toFixed(1)} conv.</span>
                    </div>
                  </div>
                  <div style={{height:'5px',background:'rgba(255,255,255,.06)',borderRadius:'3px',overflow:'hidden'}}>
                    <div style={{height:'100%',width:pct+'%',background:COLORS[i%COLORS.length],borderRadius:'3px'}}></div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </>
    )
  }

  // ── HISTÓRICO ────────────────────────────────────────────────
  if (activeTab==='gads-historico') {
    return (
      <>
        {/* Selector de período */}
        <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'12px',padding:'16px 20px',marginBottom:'20px',display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
          <span style={{fontSize:'11px',color:'var(--text4)',fontWeight:'700',flexShrink:0}}>Período:</span>
          <select value={gadsHistoricoFrom} onChange={e=>{setGadsHistoricoFrom(e.target.value);setGadsHistorico(null)}} style={{padding:'6px 10px',borderRadius:'7px',border:'1px solid var(--border)',background:'var(--bg)',color:'var(--text)',fontSize:'11px',cursor:'pointer',fontFamily:'inherit'}}>
            {HIST_MONTHS.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <span style={{fontSize:'11px',color:'var(--text4)'}}>→</span>
          <select value={gadsHistoricoTo} onChange={e=>{setGadsHistoricoTo(e.target.value);setGadsHistorico(null)}} style={{padding:'6px 10px',borderRadius:'7px',border:'1px solid var(--border)',background:'var(--bg)',color:'var(--text)',fontSize:'11px',cursor:'pointer',fontFamily:'inherit'}}>
            {HIST_MONTHS.filter(m=>m.value>=gadsHistoricoFrom).map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <button onClick={fetchGadsHistorico} style={{padding:'6px 16px',borderRadius:'7px',border:'1px solid rgba(99,102,241,.4)',background:'rgba(99,102,241,.15)',color:'#a5b4fc',fontSize:'11px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>
            {loadingGadsHistorico ? 'Cargando…' : 'Ver período'}
          </button>
        </div>

        {loadingGadsHistorico&&(
          <div style={{textAlign:'center',padding:'60px 0'}}>
            <div style={{width:'28px',height:'28px',borderRadius:'50%',border:'3px solid rgba(99,102,241,.2)',borderTop:'3px solid #6366f1',animation:'spin 1s linear infinite',margin:'0 auto 12px'}}></div>
            <div style={{fontSize:'12px',color:'var(--text4)'}}>Cargando histórico...</div>
          </div>
        )}

        {gadsHistoricoError&&(
          <div style={{background:'rgba(248,113,113,.06)',border:'1px solid rgba(248,113,113,.2)',borderRadius:'8px',padding:'16px',color:'#f87171',fontSize:'12px',marginBottom:'16px'}}>{gadsHistoricoError}</div>
        )}

        {gadsHistorico&&(()=>{
          const data = gadsHistorico.monthly || []
          if (data.length===0) return <EmptyState icon='📅' title='Sin datos en este período' sub='Selecciona un período con actividad'/>
          const labels = data.map(m=>{ const [y,mo]=m.month.split('-'); return new Date(y,+mo-1).toLocaleString('es-MX',{month:'short',year:'2-digit'}).toUpperCase() })
          const totSpend = data.reduce((s,m)=>s+m.spend,0)
          const totConv  = data.reduce((s,m)=>s+m.conversions,0)
          const totClk   = data.reduce((s,m)=>s+m.clicks,0)
          const totVal   = data.reduce((s,m)=>s+m.convValue,0)
          const avgCtr   = data.reduce((s,m)=>s+m.ctr,0)/data.length
          const avgCpa   = totConv>0?totSpend/totConv:0
          const avgRoas  = totSpend>0?totVal/totSpend:0
          return (
            <>
              {/* Resumen del período */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:'10px',marginBottom:'20px'}}>
                {[
                  {l:'Gasto total',v:fmt$(totSpend),sub:'en el período'},
                  {l:'Conversiones',v:fmtN(totConv),sub:'total',pos:totConv>0},
                  {l:'Clics totales',v:fmtN(totClk),sub:'tráfico'},
                  {l:'CTR promedio',v:fmtP(avgCtr),sub:'del período'},
                  ...(avgCpa>0?[{l:'CPA promedio',v:fmt$(avgCpa),sub:'por conversión'}]:[]),
                  ...(avgRoas>0?[{l:'ROAS promedio',v:avgRoas.toFixed(2)+'x',sub:'retorno',pos:avgRoas>=2}]:[]),
                  ...(totVal>0?[{l:'Valor total',v:fmt$(totVal),sub:'generado'}]:[]),
                ].map(m=><MetricCard key={m.l} l={m.l} v={m.v} sub={m.sub} pos={m.pos}/>)}
              </div>

              {/* Gasto mes a mes */}
              <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px',marginBottom:'14px'}}>
                <div style={{fontSize:'14px',fontWeight:'800',color:'#e0e0e0',marginBottom:'3px'}}>💰 Gasto mes a mes</div>
                <div style={{fontSize:'10px',color:'#555',fontFamily:'monospace',marginBottom:'14px'}}>¿Cuánto se invirtió cada mes?</div>
                <div style={{height:'220px'}}>
                  <Bar data={{labels,datasets:[{label:'Gasto ($)',data:data.map(m=>+m.spend.toFixed(2)),backgroundColor:'rgba(249,115,22,.45)',borderColor:'#f97316',borderWidth:1,borderRadius:4}]}} options={chartOpts()}/>
                </div>
              </div>

              {/* Conversiones mes a mes */}
              <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px',marginBottom:'14px'}}>
                <div style={{fontSize:'14px',fontWeight:'800',color:'#e0e0e0',marginBottom:'3px'}}>🎯 Conversiones mes a mes</div>
                <div style={{fontSize:'10px',color:'#555',fontFamily:'monospace',marginBottom:'14px'}}>¿Cuántos resultados generó cada mes?</div>
                <div style={{height:'220px'}}>
                  <Bar data={{labels,datasets:[{label:'Conversiones',data:data.map(m=>+m.conversions.toFixed(1)),backgroundColor:'rgba(110,231,183,.45)',borderColor:'#6ee7b7',borderWidth:1,borderRadius:4}]}} options={chartOpts()}/>
                </div>
              </div>

              {/* CTR y CPA tendencia */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'14px'}}>
                <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px'}}>
                  <div style={{fontSize:'13px',fontWeight:'800',color:'#e0e0e0',marginBottom:'3px'}}>📈 CTR por mes</div>
                  <div style={{fontSize:'10px',color:'#555',fontFamily:'monospace',marginBottom:'12px'}}>Tendencia de relevancia</div>
                  <div style={{height:'180px'}}>
                    <Line data={{labels,datasets:[{label:'CTR %',data:data.map(m=>+m.ctr.toFixed(2)),borderColor:'#6ee7b7',backgroundColor:'rgba(110,231,183,.06)',fill:true,tension:.4,pointRadius:3,borderWidth:2}]}} options={chartOpts()}/>
                  </div>
                </div>
                <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px'}}>
                  <div style={{fontSize:'13px',fontWeight:'800',color:'#e0e0e0',marginBottom:'3px'}}>💵 CPA por mes</div>
                  <div style={{fontSize:'10px',color:'#555',fontFamily:'monospace',marginBottom:'12px'}}>Costo por conversión (más bajo = mejor)</div>
                  <div style={{height:'180px'}}>
                    <Line data={{labels,datasets:[{label:'CPA ($)',data:data.map(m=>+m.cpa.toFixed(2)),borderColor:'#fcd34d',backgroundColor:'rgba(252,211,77,.06)',fill:true,tension:.4,pointRadius:3,borderWidth:2}]}} options={chartOpts()}/>
                  </div>
                </div>
              </div>

              {/* ROAS si hay valor de conversiones */}
              {data.some(m=>m.convValue>0) && (
                <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px',marginBottom:'14px'}}>
                  <div style={{fontSize:'14px',fontWeight:'800',color:'#e0e0e0',marginBottom:'3px'}}>📊 ROAS mes a mes</div>
                  <div style={{fontSize:'10px',color:'#555',fontFamily:'monospace',marginBottom:'14px'}}>Retorno sobre inversión publicitaria — +2x es bueno, +4x excelente</div>
                  <div style={{height:'200px'}}>
                    <Line data={{labels,datasets:[
                      {label:'ROAS',data:data.map(m=>+m.roas.toFixed(2)),borderColor:'#a78bfa',backgroundColor:'rgba(167,139,250,.06)',fill:true,tension:.4,pointRadius:3,borderWidth:2},
                    ]}} options={{...chartOpts(),plugins:{...chartOpts().plugins,annotation:{annotations:{line1:{type:'line',yMin:2,yMax:2,borderColor:'rgba(110,231,183,.4)',borderWidth:1,borderDash:[4,4]}}}}}}/>
                  </div>
                </div>
              )}

              {/* Breakdown por tipo de canal */}
              {(gadsHistorico.channelTypes||[]).length>1 && (
                <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px',marginBottom:'14px'}}>
                  <div style={{fontSize:'14px',fontWeight:'800',color:'#e0e0e0',marginBottom:'3px'}}>🗂 Gasto por tipo de campaña</div>
                  <div style={{fontSize:'10px',color:'#555',fontFamily:'monospace',marginBottom:'14px'}}>Search vs Display vs Video vs Shopping — ¿dónde va el presupuesto?</div>
                  <div style={{height:'220px'}}>
                    <Bar data={{
                      labels,
                      datasets:(gadsHistorico.channelTypes||[]).map((ct,i)=>({
                        label:{SEARCH:'Search',DISPLAY:'Display',VIDEO:'Video',SHOPPING:'Shopping',PERFORMANCE_MAX:'Perf Max',DEMAND_GEN:'Demand Gen'}[ct]||ct,
                        data:data.map(m=>(m.byChannel||{})[ct]?.spend?.toFixed(2)||0),
                        backgroundColor:COLORS[i%COLORS.length]+'80',
                        borderColor:COLORS[i%COLORS.length],
                        borderWidth:1,borderRadius:3,
                      }))
                    }} options={{...chartOpts(),plugins:{...chartOpts().plugins,legend:{labels:{color:'#888',font:{family:'Plus Jakarta Sans, sans-serif',size:11},boxWidth:10,padding:12}}}}}/>
                  </div>
                </div>
              )}

              {/* Tabla: mejor campaña por mes */}
              <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px',marginBottom:'14px'}}>
                <div style={{fontSize:'14px',fontWeight:'800',color:'#e0e0e0',marginBottom:'3px'}}>🏆 Campaña líder por mes</div>
                <div style={{fontSize:'10px',color:'#555',fontFamily:'monospace',marginBottom:'16px'}}>La campaña con más conversiones en cada mes del período</div>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{borderBottom:'1px solid rgba(255,255,255,.07)'}}>
                        {['Mes','Campaña líder','Tipo','Conversiones','Invertido','CPA'].map(h=>(
                          <th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:'9px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.07em',fontWeight:'600',whiteSpace:'nowrap'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((m,i)=>{
                        const best = m.bestCampaign
                        const monthLabel = labels[i]
                        if (!best) return (
                          <tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,.04)'}}>
                            <td style={{padding:'10px 12px',color:'#a5b4fc',fontFamily:'monospace',fontWeight:'700'}}>{monthLabel}</td>
                            <td colSpan={5} style={{padding:'10px 12px',color:'#444',fontSize:'11px',fontFamily:'monospace'}}>Sin actividad</td>
                          </tr>
                        )
                        const cpa = best.conversions>0 ? best.spend/best.conversions : 0
                        return (
                          <tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,.04)'}}
                            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.025)'}
                            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                            <td style={{padding:'10px 12px',color:'#a5b4fc',fontFamily:'monospace',fontWeight:'700',whiteSpace:'nowrap'}}>{monthLabel}</td>
                            <td style={{padding:'10px 12px',color:'#e0e0e0',fontSize:'12px',maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{best.name}</td>
                            <td style={{padding:'10px 12px'}}><span style={{fontSize:'9px',fontFamily:'monospace',color:'#888',background:'rgba(255,255,255,.05)',padding:'2px 8px',borderRadius:'4px',whiteSpace:'nowrap'}}>{({SEARCH:'Search',DISPLAY:'Display',VIDEO:'Video',SHOPPING:'Shopping',PERFORMANCE_MAX:'Perf Max',DEMAND_GEN:'Demand Gen'})[best.type]||best.type||'—'}</span></td>
                            <td style={{padding:'10px 12px',color:best.conversions>0?'#6ee7b7':'#555',fontWeight:'700',fontSize:'13px'}}>{best.conversions.toFixed(1)}</td>
                            <td style={{padding:'10px 12px',color:'#fff',fontSize:'12px'}}>{fmt$(best.spend)}</td>
                            <td style={{padding:'10px 12px',color:cpa>0?'#fff':'#555',fontSize:'12px'}}>{cpa>0?fmt$(cpa):'—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )
        })()}
      </>
    )
  }

  return null
})()}
{activeTab==='tiktok-ads'&&(
  <div style={{background:'rgba(168,85,247,.05)',border:'1px solid rgba(168,85,247,.15)',borderRadius:'8px',padding:'20px',marginBottom:'20px'}}>
    <div style={{fontSize:'14px',color:'#a855f7',fontFamily:'monospace',fontWeight:'700',marginBottom:'12px'}}>TikTok Ads</div>
    <div style={{fontSize:'11px',color:'#888',fontFamily:'monospace',lineHeight:'1.8'}}>
      <p style={{marginBottom:'12px'}}>La integración con TikTok Ads está en desarrollo.</p>
      <p style={{marginBottom:'12px'}}>Próximamente podrás ver:</p>
      <ul style={{marginLeft:'20px',marginBottom:'12px'}}>
        <li>Campañas de TikTok Ads</li>
        <li>Grupos de anuncios y desempeño</li>
        <li>Análisis de creativos por anuncio</li>
        <li>Comparativa con otras plataformas</li>
      </ul>
      <p>Por ahora, exporta tus datos desde TikTok Ads Manager e importa CSVs en la sección de reportes.</p>
    </div>
  </div>
)}
          {activeTab==='audiencia'&&(
            isPro === false ? <ProGate feature="los datos de audiencia" type="audiencia"/> :

            <>
              {loadingDemo&&(
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'60px',gap:'12px'}}>
                  <div style={{width:'28px',height:'28px',borderRadius:'50%',border:'3px solid rgba(99,102,241,.2)',borderTop:'3px solid #6366f1',animation:'spin 1s linear infinite'}}></div>
                  <div style={{fontSize:'12px',color:'var(--text4)'}}>Cargando datos de audiencia...</div>
                </div>
              )}
              {!loadingDemo&&!demographics&&(
                <div style={{textAlign:'center',padding:'60px 20px'}}>
                  <div style={{fontSize:'32px',marginBottom:'12px'}}>🗺</div>
                  <div style={{fontSize:'14px',fontWeight:'700',color:'var(--text)',marginBottom:'6px'}}>
                    {demoError === 'token_expired' ? 'Token de Meta expirado' : 'Sin datos de audiencia'}
                  </div>
                  <div style={{fontSize:'12px',color:'var(--text4)',marginBottom:demoError?'16px':'0'}}>
                    {demoError === 'token_expired'
                      ? 'Tu sesión de Meta Ads venció. Reconecta la cuenta para ver los datos de audiencia.'
                      : demoError
                        ? `Error: ${demoError}`
                        : 'Meta no tiene suficientes datos demográficos para este período. Prueba con "Este mes" o "Mes pasado".'}
                  </div>
                  {demoError === 'token_expired' && (
                    <button onClick={() => window.location.href='/dashboard/meta-ads'}
                      style={{padding:'8px 20px',borderRadius:'7px',border:'1px solid rgba(248,113,113,.3)',background:'rgba(248,113,113,.12)',color:'#f87171',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>
                      Reconectar Meta →
                    </button>
                  )}
                </div>
              )}
              {!loadingDemo&&demographics&&demographics.age.length===0&&demographics.gender.length===0&&(
                <div style={{textAlign:'center',padding:'60px 20px'}}>
                  <div style={{fontSize:'32px',marginBottom:'12px'}}>🗺</div>
                  <div style={{fontSize:'14px',fontWeight:'700',color:'var(--text)',marginBottom:'6px'}}>Sin datos demográficos</div>
                  <div style={{fontSize:'12px',color:'var(--text4)'}}>Meta no tiene suficientes datos para mostrar el desglose de audiencia en este período. Prueba con "Este mes" o "Mes pasado".</div>
                </div>
              )}
              {!loadingDemo&&demographics&&(demographics.age.length>0||demographics.gender.length>0)&&(
                <>
                  <div style={{background:'rgba(59,130,246,.06)',border:'1px solid rgba(59,130,246,.15)',borderRadius:'8px',padding:'10px 16px',marginBottom:'20px',fontSize:'11px',color:'#60a5fa',display:'flex',alignItems:'center',gap:'8px'}}>
                    <span>🗺</span>
                    <span>Muestra <strong>quién ve realmente tus anuncios</strong> — puede diferir de tu segmentación objetivo. Úsalo para ajustar tu estrategia.</span>
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'20px'}}>
                    <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px'}}>
                      <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'14px'}}>Gasto por edad</div>
                      <div style={{height:'200px'}}>
                        <Bar data={{labels:demographics.age.map(d=>d.age),datasets:[{label:'Gastado ($)',data:demographics.age.map(d=>parseFloat(d.spend)||0),backgroundColor:demographics.age.map((_,i)=>COLORS[i%COLORS.length]+'80'),borderColor:demographics.age.map((_,i)=>COLORS[i%COLORS.length]),borderWidth:1,borderRadius:4}]}} options={chartOpts()}/>
                      </div>
                    </div>

                    <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px'}}>
                      <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'14px'}}>CTR por grupo de edad</div>
                      <div style={{height:'200px'}}>
                        <Bar data={{labels:demographics.age.map(d=>d.age),datasets:[{label:'CTR %',data:demographics.age.map(d=>{const imp=parseFloat(d.impressions)||0;const clk=parseFloat(d.clicks)||0;return imp>0?+(clk/imp*100).toFixed(2):0}),backgroundColor:demographics.age.map((_,i)=>COLORS[i%COLORS.length]+'80'),borderColor:demographics.age.map((_,i)=>COLORS[i%COLORS.length]),borderWidth:1,borderRadius:4}]}} options={chartOpts()}/>
                      </div>
                    </div>
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'20px'}}>
                    <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px'}}>
                      <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'14px'}}>Distribucion por genero</div>
                      <div style={{height:'200px'}}>
                        <Doughnut data={{labels:demographics.gender.map(d=>d.gender==='male'?'Hombre':d.gender==='female'?'Mujer':'Otro'),datasets:[{data:demographics.gender.map(d=>parseFloat(d.spend)||0),backgroundColor:['#3b82f6','#ec4899','#6ee7b7'],borderWidth:0}]}} options={doughnutOpts}/>
                      </div>
                    </div>

                    <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px'}}>
                      <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'14px'}}>Plataforma y dispositivo</div>
                      <div style={{marginBottom:'12px'}}>
                        <div style={{fontSize:'9px',color:'#555',fontFamily:'monospace',marginBottom:'8px'}}>Por plataforma</div>
                        {demographics.platform.map((p,i)=>{
                          const max=parseFloat(demographics.platform[0]?.spend)||1
                          const pct=Math.round(parseFloat(p.spend)/max*100)
                          return (
                            <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
                              <div style={{fontSize:'11px',color:'#888',fontFamily:'monospace',width:'80px',flexShrink:0,textTransform:'capitalize'}}>{p.publisher_platform}</div>
                              <div style={{flex:1,height:'6px',background:'#1a1a22',borderRadius:'3px',overflow:'hidden'}}>
                                <div style={{width:pct+'%',height:'100%',background:COLORS[i%COLORS.length],borderRadius:'3px'}}></div>
                              </div>
                              <div style={{fontSize:'11px',color:'#fff',fontFamily:'monospace',width:'70px',textAlign:'right',flexShrink:0}}>{fmt$(p.spend)}</div>
                            </div>
                          )
                        })}
                      </div>
                      <div>
                        <div style={{fontSize:'9px',color:'#555',fontFamily:'monospace',marginBottom:'8px'}}>Por dispositivo</div>
                        {demographics.device.map((d,i)=>{
                          const max=parseFloat(demographics.device[0]?.spend)||1
                          const pct=Math.round(parseFloat(d.spend)/max*100)
                          return (
                            <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
                              <div style={{fontSize:'11px',color:'#888',fontFamily:'monospace',width:'80px',flexShrink:0,textTransform:'capitalize'}}>{d.impression_device}</div>
                              <div style={{flex:1,height:'6px',background:'#1a1a22',borderRadius:'3px',overflow:'hidden'}}>
                                <div style={{width:pct+'%',height:'100%',background:COLORS[(i+3)%COLORS.length],borderRadius:'3px'}}></div>
                              </div>
                              <div style={{fontSize:'11px',color:'#fff',fontFamily:'monospace',width:'70px',textAlign:'right',flexShrink:0}}>{fmt$(d.spend)}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'20px'}}>
                    <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px'}}>
                      <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'14px'}}>Top paises por gasto</div>
                      <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                        {demographics.country.slice(0,10).map((c,i)=>{
                          const max=parseFloat(demographics.country[0]?.spend)||1
                          const pct=Math.round(parseFloat(c.spend)/max*100)
                          const totalSpend=demographics.country.reduce((s,x)=>s+(parseFloat(x.spend)||0),0)
                          const sharePct=totalSpend>0?Math.round(parseFloat(c.spend)/totalSpend*100):0
                          return (
                            <div key={i} style={{display:'flex',alignItems:'center',gap:'10px'}}>
                              <div style={{fontSize:'11px',color:'#888',fontFamily:'monospace',width:'32px',flexShrink:0}}>{c.country}</div>
                              <div style={{flex:1,height:'6px',background:'#1a1a22',borderRadius:'3px',overflow:'hidden'}}>
                                <div style={{width:pct+'%',height:'100%',background:COLORS[i%COLORS.length],borderRadius:'3px'}}></div>
                              </div>
                              <div style={{fontSize:'11px',color:'#fff',fontFamily:'monospace',width:'60px',textAlign:'right',flexShrink:0}}>{fmt$(c.spend)}</div>
                              <div style={{fontSize:'10px',color:'#555',fontFamily:'monospace',width:'30px',textAlign:'right',flexShrink:0}}>{sharePct}%</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px'}}>
                      <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'14px'}}>Top regiones/estados</div>
                      <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                        {demographics.region.slice(0,10).map((r,i)=>{
                          const max=parseFloat(demographics.region[0]?.spend)||1
                          const pct=Math.round(parseFloat(r.spend)/max*100)
                          return (
                            <div key={i} style={{display:'flex',alignItems:'center',gap:'10px'}}>
                              <div style={{fontSize:'10px',color:'#888',fontFamily:'monospace',width:'120px',flexShrink:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.region}</div>
                              <div style={{flex:1,height:'6px',background:'#1a1a22',borderRadius:'3px',overflow:'hidden'}}>
                                <div style={{width:pct+'%',height:'100%',background:COLORS[i%COLORS.length],borderRadius:'3px'}}></div>
                              </div>
                              <div style={{fontSize:'11px',color:'#fff',fontFamily:'monospace',width:'60px',textAlign:'right',flexShrink:0}}>{fmt$(r.spend)}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>



                  <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px',marginBottom:'20px'}}>
                    <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'4px'}}>Mapa de alcance por estado y pais</div>
                    <div style={{fontSize:'10px',color:'#333',fontFamily:'monospace',marginBottom:'16px'}}>Burbujas grandes = estados · Burbujas pequenas = paises · Tamano proporcional al gasto · Haz clic para ver detalle</div>
                    <MapChart countryData={demographics.country} regionData={demographics.region}/>
                  </div>

                  <div style={{background:'rgba(167,139,250,.05)',border:'1px solid rgba(167,139,250,.15)',borderRadius:'10px',padding:'20px'}}>
                    <div style={{fontSize:'10px',color:'#a78bfa',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'12px'}}>Recomendaciones de audiencia</div>
                    {(()=>{
                      const recs=[]
                      const topAge=demographics.age[0]
                      if(topAge) recs.push('El grupo '+topAge.age+' recibe el mayor gasto ('+fmt$(topAge.spend)+') — crea creativos especificos para este segmento')
                      const ages=demographics.age
                      const young=ages.filter(a=>['18-24','25-34'].includes(a.age)).reduce((s,a)=>s+(parseFloat(a.spend)||0),0)
                      const mature=ages.filter(a=>['45-54','55-64','65+'].includes(a.age)).reduce((s,a)=>s+(parseFloat(a.spend)||0),0)
                      const totalAge=ages.reduce((s,a)=>s+(parseFloat(a.spend)||0),0)
                      if(totalAge>0&&mature/totalAge>0.4) recs.push('El '+(Math.round(mature/totalAge*100))+'% del gasto va a mayores de 45 — si no son tu publico objetivo, considera ajustar la segmentacion por edad')
                      const male=demographics.gender.find(g=>g.gender==='male')
                      const female=demographics.gender.find(g=>g.gender==='female')
                      if(male&&female){
                        const mt=parseFloat(male.spend)||0, ft=parseFloat(female.spend)||0
                        const dom=mt>ft?'hombres':'mujeres'
                        const pct=Math.round(Math.max(mt,ft)/(mt+ft)*100)
                        recs.push('El '+pct+'% del gasto es en '+dom+' — verifica si coincide con tu cliente ideal y considera si debes ajustar')
                      }
                      const topRegion=demographics.region[0]
                      if(topRegion) recs.push('La region con mayor gasto es '+topRegion.region+' ('+fmt$(topRegion.spend)+') — asegurate de que el copy sea relevante para esa zona')
                      const mobile=demographics.device.find(d=>d.impression_device==='mobile_app'||d.impression_device==='iphone'||d.impression_device==='android_smartphone')
                      if(mobile) recs.push('La mayoria del trafico es mobile — asegurate de que tus creativos esten optimizados para pantalla vertical y que la landing cargue rapido en celular')
                      return recs.map((rec,i)=>(
                        <div key={i} style={{display:'flex',gap:'8px',marginBottom:'8px',padding:'10px 12px',background:'rgba(167,139,250,.05)',borderRadius:'6px',border:'1px solid rgba(167,139,250,.1)'}}>
                          <span style={{color:'#a78bfa',fontWeight:'800',fontSize:'12px',flexShrink:0}}>→</span>
                          <div style={{fontSize:'12px',color:'#888',fontFamily:'monospace',lineHeight:'1.6'}}>{rec}</div>
                        </div>
                      ))
                    })()}
                  </div>
                </>
              )}
            </>
          )}
          {activeTab==='historico'&&platform==='meta_ads'&&(
            isPro === false ? <ProGate feature="el histórico mensual" type="historico"/> :
            <>
              {/* Selector de período */}
              <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'12px',padding:'14px 20px',marginBottom:'20px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
                <span style={{fontSize:'10px',color:'var(--text4)',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.07em',flexShrink:0}}>Período:</span>
                <select value={historicoFrom} onChange={e=>{setHistoricoFrom(e.target.value);setHistoricoData(null)}}
                  style={{background:'rgba(255,255,255,.06)',border:'1px solid var(--border)',borderRadius:'6px',color:'#e0e0e0',padding:'6px 10px',fontSize:'11px',fontFamily:'inherit',cursor:'pointer',outline:'none'}}>
                  {HIST_MONTHS.map(m=><option key={m.value} value={m.value} style={{background:'#18181f'}}>{m.label}</option>)}
                </select>
                <span style={{color:'var(--text4)',fontSize:'12px'}}>→</span>
                <select value={historicoTo} onChange={e=>{setHistoricoTo(e.target.value);setHistoricoData(null)}}
                  style={{background:'rgba(255,255,255,.06)',border:'1px solid var(--border)',borderRadius:'6px',color:'#e0e0e0',padding:'6px 10px',fontSize:'11px',fontFamily:'inherit',cursor:'pointer',outline:'none'}}>
                  {HIST_MONTHS.filter(m=>m.value>=historicoFrom).map(m=><option key={m.value} value={m.value} style={{background:'#18181f'}}>{m.label}</option>)}
                </select>
                <button onClick={fetchHistorico} disabled={loadingHistorico}
                  style={{padding:'6px 18px',background:'rgba(99,102,241,.2)',border:'1px solid rgba(99,102,241,.4)',borderRadius:'6px',color:'#a5b4fc',fontSize:'11px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit',opacity:loadingHistorico?.6:1}}>
                  {loadingHistorico ? 'Cargando…' : 'Cargar datos'}
                </button>
              </div>

              {loadingHistorico&&(
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'80px 0',gap:'12px'}}>
                  <div style={{width:'32px',height:'32px',borderRadius:'50%',border:'3px solid rgba(99,102,241,.2)',borderTop:'3px solid #6366f1',animation:'spin 1s linear infinite'}}></div>
                  <div style={{fontSize:'12px',color:'var(--text4)',fontFamily:'monospace'}}>Cargando histórico mensual...</div>
                </div>
              )}

              {!loadingHistorico&&historicoError&&(
                <div style={{background:'rgba(248,113,113,.08)',border:'1px solid rgba(248,113,113,.2)',borderRadius:'10px',padding:'16px 20px',fontSize:'12px',color:'#f87171'}}>
                  ⚠️ {historicoError}
                </div>
              )}

              {!loadingHistorico&&historicoData&&historicoData.monthly.length===0&&(
                <div style={{textAlign:'center',padding:'60px 20px',color:'var(--text4)'}}>
                  <div style={{fontSize:'32px',marginBottom:'12px'}}>📅</div>
                  <div style={{fontSize:'14px',fontWeight:'700',color:'var(--text)',marginBottom:'6px'}}>Sin datos en este período</div>
                  <div style={{fontSize:'12px'}}>No hay actividad registrada en los meses seleccionados.</div>
                </div>
              )}

              {!loadingHistorico&&historicoData&&historicoData.monthly.length>0&&(()=>{
                const data = historicoData.monthly
                const totalSpend   = data.reduce((s,m)=>s+m.spend,0)
                const totalResults = data.reduce((s,m)=>s+m.results,0)
                const totalImpr    = data.reduce((s,m)=>s+m.impressions,0)
                const avgCpr       = totalResults>0 ? totalSpend/totalResults : 0
                const bestMonth    = [...data].sort((a,b)=>b.results-a.results)[0]
                const improving    = data.length>1&&data[0].cpr>0&&data[data.length-1].cpr>0
                  ? data[data.length-1].cpr < data[0].cpr : null
                const spendTrend   = data.length>1
                  ? Math.round((data[data.length-1].spend - data[0].spend)/Math.max(data[0].spend,1)*100) : null

                return (
                  <>
                    {/* RESUMEN DEL PERÍODO */}
                    <div style={{background:'rgba(99,102,241,.06)',border:'1px solid rgba(99,102,241,.2)',borderRadius:'14px',padding:'20px 24px',marginBottom:'20px'}}>
                      <div style={{fontSize:'10px',color:'#a5b4fc',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'14px'}}>
                        📅 Resumen — {data.length} {data.length===1?'mes':'meses'} analizados
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:'20px'}}>
                        {[
                          {l:'Total invertido',   v:fmt$(totalSpend),            c:'#fff'},
                          {l:'Total resultados',  v:fmtN(totalResults),          c:totalResults>0?'#6ee7b7':'#f87171'},
                          {l:'Costo prom. / resultado', v:avgCpr>0?fmt$(avgCpr):'—', c:'#fff'},
                          {l:'Impresiones totales',v:fmtN(totalImpr),            c:'#60a5fa'},
                          ...(bestMonth&&bestMonth.results>0?[{l:'Mejor mes',v:bestMonth.label.toUpperCase(),c:'#6ee7b7',sub:fmtN(bestMonth.results)+' resultados · '+fmt$(bestMonth.spend)}]:[]),
                          ...(improving!==null?[{l:'Tendencia del costo',v:improving?'Mejorando ↓':'Empeorando ↑',c:improving?'#6ee7b7':'#f87171',sub:improving?'El costo/resultado bajó':'El costo/resultado subió'}]:[]),
                        ].map((s,i)=>(
                          <div key={i}>
                            <div style={{fontSize:'9px',color:'#555',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'4px'}}>{s.l}</div>
                            <div style={{fontSize:'20px',fontWeight:'800',color:s.c,lineHeight:1.1}}>{s.v}</div>
                            {s.sub&&<div style={{fontSize:'10px',color:'#666',fontFamily:'monospace',marginTop:'3px'}}>{s.sub}</div>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CHARTS GRID — 4 preguntas clave */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'14px'}}>

                      {/* Gasto mensual */}
                      <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px'}}>
                        <div style={{fontSize:'14px',fontWeight:'800',color:'#e0e0e0',marginBottom:'3px'}}>💰 ¿Cuánto se invirtió por mes?</div>
                        <div style={{fontSize:'10px',color:'#555',fontFamily:'monospace',marginBottom:'14px'}}>
                          {spendTrend!==null&&(spendTrend>10?'El gasto subió '+spendTrend+'% vs el primer mes':spendTrend<-10?'El gasto bajó '+Math.abs(spendTrend)+'% vs el primer mes':'Gasto estable entre meses')}
                        </div>
                        <div style={{height:'190px'}}>
                          <Bar data={{
                            labels:data.map(d=>d.label),
                            datasets:[{
                              label:'Gastado ($)',
                              data:data.map(d=>+d.spend.toFixed(2)),
                              backgroundColor:data.map((_,i)=>i===data.length-1?'rgba(99,102,241,.65)':'rgba(99,102,241,.3)'),
                              borderColor:'#6366f1',borderWidth:1,borderRadius:4
                            }]
                          }} options={chartOpts()}/>
                        </div>
                      </div>

                      {/* Resultados mensuales */}
                      <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px'}}>
                        <div style={{fontSize:'14px',fontWeight:'800',color:'#e0e0e0',marginBottom:'3px'}}>🎯 ¿Cuántos resultados se obtuvieron?</div>
                        <div style={{fontSize:'10px',color:'#555',fontFamily:'monospace',marginBottom:'14px'}}>
                          {totalResults>0?'Total de '+fmtN(totalResults)+' resultados en el período':'Sin resultados registrados — revisar objetivo de conversión'}
                        </div>
                        <div style={{height:'190px'}}>
                          <Bar data={{
                            labels:data.map(d=>d.label),
                            datasets:[{
                              label:'Resultados',
                              data:data.map(d=>d.results),
                              backgroundColor:data.map(d=>d.results>0?'rgba(110,231,183,.5)':'rgba(248,113,113,.3)'),
                              borderColor:data.map(d=>d.results>0?'#6ee7b7':'#f87171'),
                              borderWidth:1,borderRadius:4
                            }]
                          }} options={chartOpts()}/>
                        </div>
                      </div>

                      {/* Costo por resultado — tendencia */}
                      <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px'}}>
                        <div style={{fontSize:'14px',fontWeight:'800',color:'#e0e0e0',marginBottom:'3px'}}>📉 ¿El costo por resultado mejora?</div>
                        <div style={{fontSize:'10px',color:improving===true?'#6ee7b7':improving===false?'#f87171':'#555',fontFamily:'monospace',marginBottom:'14px'}}>
                          {improving===true?'↓ Sí — el costo por resultado está bajando con el tiempo':improving===false?'↑ El costo está subiendo — revisar segmentación y creativos':'Selecciona más meses para ver la tendencia'}
                        </div>
                        <div style={{height:'190px'}}>
                          <Line data={{
                            labels:data.filter(d=>d.cpr>0).map(d=>d.label),
                            datasets:[{
                              label:'C/Resultado ($)',
                              data:data.filter(d=>d.cpr>0).map(d=>+d.cpr.toFixed(2)),
                              borderColor:'#f97316',backgroundColor:'rgba(249,115,22,.08)',
                              fill:true,tension:.4,pointRadius:4,borderWidth:2,
                              pointBackgroundColor:'#f97316',pointBorderColor:'#0d0d12',pointBorderWidth:2
                            }]
                          }} options={chartOpts()}/>
                        </div>
                      </div>

                      {/* CTR mensual */}
                      <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px'}}>
                        <div style={{fontSize:'14px',fontWeight:'800',color:'#e0e0e0',marginBottom:'3px'}}>📈 ¿Los anuncios generan más clics?</div>
                        <div style={{fontSize:'10px',color:'#555',fontFamily:'monospace',marginBottom:'14px'}}>
                          {data.length>1&&data[data.length-1].ctr>0&&data[0].ctr>0
                            ?(data[data.length-1].ctr>data[0].ctr?'↑ El CTR mejoró vs el primer mes — los creativos están funcionando mejor':'↓ El CTR bajó vs el primer mes — considera rotar los creativos')
                            :'CTR promedio del período'}
                        </div>
                        <div style={{height:'190px'}}>
                          <Line data={{
                            labels:data.map(d=>d.label),
                            datasets:[{
                              label:'CTR %',
                              data:data.map(d=>+d.ctr.toFixed(2)),
                              borderColor:'#6ee7b7',backgroundColor:'rgba(110,231,183,.06)',
                              fill:true,tension:.4,pointRadius:4,borderWidth:2,
                              pointBackgroundColor:'#6ee7b7',pointBorderColor:'#0d0d12',pointBorderWidth:2
                            }]
                          }} options={chartOpts()}/>
                        </div>
                      </div>
                    </div>

                    {/* INVERSIÓN VS RESULTADOS — gráfico combinado */}
                    <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px',marginBottom:'14px'}}>
                      <div style={{fontSize:'14px',fontWeight:'800',color:'#e0e0e0',marginBottom:'3px'}}>📊 Inversión vs Resultados — evolución mensual</div>
                      <div style={{fontSize:'10px',color:'#555',fontFamily:'monospace',marginBottom:'14px'}}>
                        Las líneas deberían moverse juntas. Si el gasto sube pero los resultados no, hay algo que optimizar.
                      </div>
                      <div style={{height:'230px'}}>
                        <Line data={{
                          labels:data.map(d=>d.label),
                          datasets:[
                            {label:'Gastado ($)',data:data.map(d=>+d.spend.toFixed(2)),borderColor:'#f97316',backgroundColor:'rgba(249,115,22,.06)',fill:true,tension:.4,yAxisID:'y',pointRadius:3,borderWidth:2},
                            {label:'Resultados',data:data.map(d=>d.results),borderColor:'#6ee7b7',backgroundColor:'rgba(110,231,183,.06)',fill:true,tension:.4,yAxisID:'y1',pointRadius:3,borderWidth:2}
                          ]
                        }} options={chartOpts(true)}/>
                      </div>
                    </div>

                    {/* DESGLOSE POR OBJETIVO */}
                    {historicoData.objectives.length>1&&(
                      <>
                        <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px',marginBottom:'14px'}}>
                          <div style={{fontSize:'14px',fontWeight:'800',color:'#e0e0e0',marginBottom:'3px'}}>🎯 Resultados por tipo de campaña</div>
                          <div style={{fontSize:'10px',color:'#555',fontFamily:'monospace',marginBottom:'14px'}}>
                            ¿Qué objetivo de campaña genera más resultados cada mes?
                          </div>
                          <div style={{height:'220px'}}>
                            <Bar data={{
                              labels:data.map(d=>d.label),
                              datasets:historicoData.objectives.map((obj,i)=>({
                                label:OBJECTIVE_MAP[obj]?.label||obj,
                                data:(historicoData.byObj[obj]||[]).map(m=>m.results),
                                backgroundColor:COLORS[i%COLORS.length]+'80',
                                borderColor:COLORS[i%COLORS.length],
                                borderWidth:1,borderRadius:3
                              }))
                            }} options={{...chartOpts(),plugins:{...chartOpts().plugins,legend:{labels:{color:'#888',font:{family:'Plus Jakarta Sans, sans-serif',size:11},boxWidth:10,padding:12}}}}}/>
                          </div>
                        </div>

                        <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px',marginBottom:'14px'}}>
                          <div style={{fontSize:'14px',fontWeight:'800',color:'#e0e0e0',marginBottom:'3px'}}>💰 Gasto por tipo de campaña</div>
                          <div style={{fontSize:'10px',color:'#555',fontFamily:'monospace',marginBottom:'14px'}}>
                            ¿Cómo se distribuye el presupuesto entre los distintos objetivos?
                          </div>
                          <div style={{height:'220px'}}>
                            <Bar data={{
                              labels:data.map(d=>d.label),
                              datasets:historicoData.objectives.map((obj,i)=>({
                                label:OBJECTIVE_MAP[obj]?.label||obj,
                                data:(historicoData.byObj[obj]||[]).map(m=>+m.spend.toFixed(2)),
                                backgroundColor:COLORS[i%COLORS.length]+'80',
                                borderColor:COLORS[i%COLORS.length],
                                borderWidth:1,borderRadius:3
                              }))
                            }} options={{...chartOpts(),plugins:{...chartOpts().plugins,legend:{labels:{color:'#888',font:{family:'Plus Jakarta Sans, sans-serif',size:11},boxWidth:10,padding:12}}}}}/>
                          </div>
                        </div>
                      </>
                    )}

                    {/* TABLA: MEJOR CAMPAÑA POR MES */}
                    <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'12px',padding:'20px',marginBottom:'14px'}}>
                      <div style={{fontSize:'14px',fontWeight:'800',color:'#e0e0e0',marginBottom:'3px'}}>🏆 Mejor campaña por mes</div>
                      <div style={{fontSize:'10px',color:'#555',fontFamily:'monospace',marginBottom:'16px'}}>
                        La campaña que más resultados generó en cada mes del período
                      </div>
                      <div style={{overflowX:'auto'}}>
                        <table style={{width:'100%',borderCollapse:'collapse'}}>
                          <thead>
                            <tr style={{borderBottom:'1px solid rgba(255,255,255,.07)'}}>
                              {['Mes','Campaña líder','Tipo','Resultados','Invertido','Costo / resultado'].map(h=>(
                                <th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:'9px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.07em',fontWeight:'600',whiteSpace:'nowrap'}}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {data.map((m,i)=>{
                              const best = historicoData.bestByMonth[m.month]
                              if (!best) return (
                                <tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,.04)'}}>
                                  <td style={{padding:'10px 12px',color:'#a5b4fc',fontFamily:'monospace',fontWeight:'700'}}>{m.label.toUpperCase()}</td>
                                  <td colSpan={5} style={{padding:'10px 12px',color:'#444',fontSize:'11px',fontFamily:'monospace'}}>Sin actividad</td>
                                </tr>
                              )
                              const cpr = best.results>0 ? best.spend/best.results : 0
                              return (
                                <tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,.04)'}}
                                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.025)'}
                                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                                  <td style={{padding:'10px 12px',color:'#a5b4fc',fontFamily:'monospace',fontWeight:'700',whiteSpace:'nowrap'}}>{m.label.toUpperCase()}</td>
                                  <td style={{padding:'10px 12px',color:'#e0e0e0',fontSize:'12px',maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{best.campaign}</td>
                                  <td style={{padding:'10px 12px'}}><span style={{fontSize:'9px',fontFamily:'monospace',color:'#888',background:'rgba(255,255,255,.05)',padding:'2px 8px',borderRadius:'4px',whiteSpace:'nowrap'}}>{OBJECTIVE_MAP[best.objective]?.label||best.objective||'—'}</span></td>
                                  <td style={{padding:'10px 12px',color:best.results>0?'#6ee7b7':'#555',fontWeight:'700',fontSize:'13px'}}>{fmtN(best.results)}</td>
                                  <td style={{padding:'10px 12px',color:'#fff',fontSize:'12px'}}>{fmt$(best.spend)}</td>
                                  <td style={{padding:'10px 12px',color:cpr>0?'#fff':'#555',fontSize:'12px'}}>{cpr>0?fmt$(cpr):'—'}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )
              })()}
            </>
          )}
        </div>
      )}

      <PDFExportModal
        isOpen={showPDFModal}
        onClose={() => setShowPDFModal(false)}
        accountName={accountName}
        preset={preset}
        platform={platform}
        overview={overview}
        prevOverview={isPro ? prevOverview : null}
        campaigns={isPro ? campaigns : []}
        adsets={isPro ? adsets : []}
        ads={isPro ? ads : []}
        daily={isPro ? daily : []}
        demographics={isPro ? demographics : null}
        historicoData={isPro ? historicoData : null}
        userId={userId}
        isPro={isPro}
      />
    </div>
  )
}

export default function Reportes() {
  return (
    <Suspense>
      <ReportesInner />
    </Suspense>
  )
}
