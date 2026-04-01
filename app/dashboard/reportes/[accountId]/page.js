'use client'
import React, { useEffect, useState, useRef } from 'react'
import { usePlan } from '../../../lib/usePlan'
import ProGate from '../../../components/ProGate'
import PDFExportModal from '../../../components/PDFExportModal'
import { useParams } from 'next/navigation'
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


export default function Reportes() {
  const { accountId } = useParams()
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
  const [accountName, setAccountName] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [platform, setPlatform] = useState(null)
  const [googleAdsData, setGoogleAdsData] = useState(null)

  // Sync tab from URL ?tab= param (client-side only to avoid useSearchParams Suspense requirement)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab && ['overview','campanas','conjuntos','anuncios','audiencia','google-ads','tiktok-ads'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [])
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
    try {
      const range = getDateRange(preset, customFrom, customTo)
      if (!range||!range.since||!range.until) { setLoading(false); return }
      const customerId = accountId.replace('gads_', '')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const response = await fetch('/api/google-ads/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          customerId: customerId,
          dateFrom: range.since,
          dateTo: range.until
        })
      })

      const data = await response.json()
      if (data.success) {
        setGoogleAdsData(data)
      } else {
        console.error('Error fetching Google Ads data:', data.error)
      }
    } catch(e){console.error('Error in fetchGoogleAdsData:', e)}
    setLoading(false)
  }

  async function fetchDemographics() {
    setLoadingDemo(true)
    setDemographics(null)
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

      setDemographics({
        age:(ageJ.data||[]).sort((a,b)=>parseFloat(b.spend)-parseFloat(a.spend)),
        gender:(genderJ.data||[]),
        country:(countryJ.data||[]).sort((a,b)=>parseFloat(b.spend)-parseFloat(a.spend)),
        device:(deviceJ.data||[]).sort((a,b)=>parseFloat(b.spend)-parseFloat(a.spend)),
        platform:(platformJ.data||[]).sort((a,b)=>parseFloat(b.spend)-parseFloat(a.spend)),
        region:(regionJ.data||[]).sort((a,b)=>parseFloat(b.spend)-parseFloat(a.spend)).slice(0,15),
      })
    } catch(e){console.error(e)}
    setLoadingDemo(false)
  }

  function exportPDF() {
    setShowPDFModal(true)
  }

  const isGoogle = platform === 'google_ads'
  const tabs = isGoogle
    ? [{id:'overview',label:'Resumen',icon:'📊',desc:'Vista general de la cuenta'},{id:'google-ads',label:'Campañas',icon:'🎯',desc:'Detalle por campaña'}]
    : [{id:'overview',label:'Resumen',icon:'📊',desc:'Vista general'},{id:'campanas',label:'Campañas',icon:'🎯',desc:'Cada campaña activa'},{id:'conjuntos',label:'Conjuntos',icon:'👥',desc:'Grupos de anuncios'},{id:'anuncios',label:'Anuncios',icon:'🖼',desc:'Creativos individuales'},{id:'audiencia',label:'Audiencia',icon:'🗺',desc:'Quién ve tus anuncios'}]
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
              {platform === 'google_ads' && googleAdsData ? (
                <>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:'10px',marginBottom:'24px'}}>
                    <MetricCard l='Gasto total' v={fmt$(googleAdsData.campaigns?.reduce((s,c)=>s+c.spend,0)||0)} sub='ejecutado'/>
                    <MetricCard l='Impresiones' v={fmtN(googleAdsData.campaigns?.reduce((s,c)=>s+c.impressions,0)||0)} sub='total'/>
                    <MetricCard l='Clics' v={fmtN(googleAdsData.campaigns?.reduce((s,c)=>s+c.clicks,0)||0)} sub='trafico'/>
                    <MetricCard l='CTR' v={fmtP((googleAdsData.campaigns?.reduce((s,c)=>s+c.clicks,0)||0)/Math.max(googleAdsData.campaigns?.reduce((s,c)=>s+c.impressions,0)||1,1)*100)} sub='tasa'/>
                    <MetricCard l='CPC' v={fmt$((googleAdsData.campaigns?.reduce((s,c)=>s+c.spend,0)||0)/Math.max(googleAdsData.campaigns?.reduce((s,c)=>s+c.clicks,0)||1,1))} sub='por clic'/>
                    <MetricCard l='CPM' v={fmt$((googleAdsData.campaigns?.reduce((s,c)=>s+c.spend,0)||0)/(Math.max(googleAdsData.campaigns?.reduce((s,c)=>s+c.impressions,0)||1,1)/1000))} sub='por mil'/>
                    <MetricCard l='Conversiones' v={fmtN(googleAdsData.campaigns?.reduce((s,c)=>s+c.conversions,0)||0)} sub='total'/>
                    <MetricCard l='Valor de conversiones' v={fmt$(googleAdsData.campaigns?.reduce((s,c)=>s+c.conversion_value,0)||0)} sub='total'/>
                  </div>
                </>
              ) : overview && (
                <>
                  {comparing&&prevOverview&&(
                    <div style={{background:'rgba(110,231,183,.05)',border:'1px solid rgba(110,231,183,.2)',borderRadius:'8px',padding:'10px 16px',marginBottom:'16px',fontSize:'11px',color:'#6ee7b7',display:'flex',alignItems:'center',gap:'8px'}}>
                      <span>↕</span>
                      <span>Comparando período actual vs período anterior — las flechas ↑↓ muestran si mejoró o bajó cada métrica</span>
                    </div>
                  )}
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


              {platform === 'google_ads' && googleAdsData?.daily?.length>1&&(
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'24px'}}>
                  <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px'}}>
                    <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'14px'}}>Gasto vs Clics por dia</div>
                    <div style={{height:'200px'}}>
                      <Line data={{labels:googleAdsData.daily.map(d=>d.date.slice(5)),datasets:[
                        {label:'Gastado ($)',data:googleAdsData.daily.map(d=>+d.spend.toFixed(2)),borderColor:'#f97316',backgroundColor:'rgba(249,115,22,.08)',fill:true,tension:.4,yAxisID:'y',pointRadius:2,borderWidth:2},
                        {label:'Clics',data:googleAdsData.daily.map(d=>d.clicks),borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,.08)',fill:true,tension:.4,yAxisID:'y1',pointRadius:2,borderWidth:2}
                      ]}} options={chartOpts(true)}/>
                    </div>
                  </div>
                  <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px'}}>
                    <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'14px'}}>CTR y CPM por dia</div>
                    <div style={{height:'200px'}}>
                      <Line data={{labels:googleAdsData.daily.map(d=>d.date.slice(5)),datasets:[
                        {label:'CTR %',data:googleAdsData.daily.map(d=>+(d.clicks/(d.impressions||1)*100).toFixed(2)),borderColor:'#6ee7b7',backgroundColor:'rgba(110,231,183,.06)',fill:true,tension:.4,yAxisID:'y',pointRadius:2,borderWidth:2},
                        {label:'CPM',data:googleAdsData.daily.map(d=>+(d.spend/(d.impressions/1000||1)).toFixed(2)),borderColor:'#fcd34d',backgroundColor:'rgba(252,211,77,.06)',fill:true,tension:.4,yAxisID:'y1',pointRadius:2,borderWidth:2}
                      ]}} options={chartOpts(true)}/>
                    </div>
                  </div>
                </div>
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

              {platform === 'meta_ads' && overview.vid25>0&&(
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
              {campaigns.length>1&&(
                <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px',marginBottom:'16px'}}>
                  <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'16px'}}>Comparativa de CTR por campaña</div>
                  <div style={{height:'160px'}}>
                    <Bar data={{labels:campaigns.map(c=>c.name.length>22?c.name.slice(0,22)+'...':c.name),datasets:[{label:'CTR %',data:campaigns.map(c=>+c.ctr.toFixed(2)),backgroundColor:campaigns.map((_,i)=>COLORS[i%COLORS.length]+'80'),borderColor:campaigns.map((_,i)=>COLORS[i%COLORS.length]),borderWidth:1,borderRadius:4}]}} options={chartOpts()}/>
                  </div>
                </div>
              )}
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
              {adsets.length>1&&(
                <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px',marginBottom:'16px'}}>
                  <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'16px'}}>Gasto por conjunto de anuncios</div>
                  <div style={{height:'160px'}}>
                    <Bar data={{labels:adsets.map(a=>a.name.length>22?a.name.slice(0,22)+'...':a.name),datasets:[{label:'Gastado ($)',data:adsets.map(a=>+a.spend.toFixed(2)),backgroundColor:adsets.map((_,i)=>COLORS[i%COLORS.length]+'80'),borderColor:adsets.map((_,i)=>COLORS[i%COLORS.length]),borderWidth:1,borderRadius:4}]}} options={chartOpts()}/>
                  </div>
                </div>
              )}
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
{activeTab==='google-ads'&&(
  <>
    {!googleAdsData ? (
      <div style={{textAlign:'center',padding:'80px 0',color:'#444',fontFamily:'monospace',fontSize:'12px'}}>
        Cargando datos de Google Ads...
      </div>
    ) : (
      <>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:'10px',marginBottom:'24px'}}>
          <MetricCard l='Gasto total' v={fmt$(googleAdsData.campaigns?.reduce((s,c)=>s+c.spend,0)||0)} sub='ejecutado'/>
          <MetricCard l='Impresiones' v={fmtN(googleAdsData.campaigns?.reduce((s,c)=>s+c.impressions,0)||0)} sub='total'/>
          <MetricCard l='Clics' v={fmtN(googleAdsData.campaigns?.reduce((s,c)=>s+c.clicks,0)||0)} sub='trafico'/>
          <MetricCard l='CTR' v={fmtP((googleAdsData.campaigns?.reduce((s,c)=>s+c.clicks,0)||0)/Math.max(googleAdsData.campaigns?.reduce((s,c)=>s+c.impressions,0)||1,1)*100)} sub='%'/>
          <MetricCard l='CPC' v={fmt$((googleAdsData.campaigns?.reduce((s,c)=>s+c.spend,0)||0)/Math.max(googleAdsData.campaigns?.reduce((s,c)=>s+c.clicks,0)||1,1))} sub='por clic'/>
          <MetricCard l='CPM' v={fmt$((googleAdsData.campaigns?.reduce((s,c)=>s+c.spend,0)||0)/(Math.max(googleAdsData.campaigns?.reduce((s,c)=>s+c.impressions,0)||1,1)/1000))} sub='por mil'/>
          <MetricCard l='Conversiones' v={fmtN(googleAdsData.campaigns?.reduce((s,c)=>s+c.conversions,0)||0)} sub='total'/>
          <MetricCard l='Valor de conversiones' v={fmt$(googleAdsData.campaigns?.reduce((s,c)=>s+c.conversion_value,0)||0)} sub='total'/>
        </div>

        {googleAdsData.campaigns?.length>0&&(
          <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px',marginBottom:'24px'}}>
            <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'14px'}}>Campañas - Gasto por campaña</div>
            <div style={{height:'200px'}}>
              <Bar data={{labels:googleAdsData.campaigns.map(c=>c.name.length>20?c.name.slice(0,20)+'...':c.name),datasets:[{label:'Gastado ($)',data:googleAdsData.campaigns.map(c=>+c.spend.toFixed(2)),backgroundColor:googleAdsData.campaigns.map((_,i)=>COLORS[i%COLORS.length]+'80'),borderColor:googleAdsData.campaigns.map((_,i)=>COLORS[i%COLORS.length]),borderWidth:1,borderRadius:4}]}} options={chartOpts()}/>
            </div>
          </div>
        )}

        {googleAdsData.daily?.length>1&&(
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'24px'}}>
            <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px'}}>
              <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'14px'}}>Gasto vs Clics por dia</div>
              <div style={{height:'200px'}}>
                <Line data={{labels:googleAdsData.daily.map(d=>d.date.slice(5)),datasets:[
                  {label:'Gastado ($)',data:googleAdsData.daily.map(d=>+d.spend.toFixed(2)),borderColor:'#f97316',backgroundColor:'rgba(249,115,22,.08)',fill:true,tension:.4,yAxisID:'y',pointRadius:2,borderWidth:2},
                  {label:'Clics',data:googleAdsData.daily.map(d=>d.clicks),borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,.08)',fill:true,tension:.4,yAxisID:'y1',pointRadius:2,borderWidth:2}
                ]}} options={chartOpts(true)}/>
              </div>
            </div>
            <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'20px'}}>
              <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',marginBottom:'14px'}}>CTR y CPM por dia</div>
              <div style={{height:'200px'}}>
                <Line data={{labels:googleAdsData.daily.map(d=>d.date.slice(5)),datasets:[
                  {label:'CTR %',data:googleAdsData.daily.map(d=>+(d.clicks/(d.impressions||1)*100).toFixed(2)),borderColor:'#6ee7b7',backgroundColor:'rgba(110,231,183,.06)',fill:true,tension:.4,yAxisID:'y',pointRadius:2,borderWidth:2},
                  {label:'CPM',data:googleAdsData.daily.map(d=>+(d.spend/(d.impressions/1000||1)).toFixed(2)),borderColor:'#fcd34d',backgroundColor:'rgba(252,211,77,.06)',fill:true,tension:.4,yAxisID:'y1',pointRadius:2,borderWidth:2}
                ]}} options={chartOpts(true)}/>
              </div>
            </div>
          </div>
        )}

        {googleAdsData.campaigns?.length>0&&(
          <>
            <div style={{fontSize:'12px',color:'#888',fontFamily:'monospace',marginBottom:'12px',fontWeight:'700'}}>Campañas</div>
            {googleAdsData.campaigns.map((c,i)=>(
              <div key={i} style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'10px',padding:'16px 20px',marginBottom:'8px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                  <div>
                    <div style={{color:'#fff',fontSize:'13px',fontWeight:'700',marginBottom:'2px'}}>{c.name}</div>
                    <div style={{color:'#555',fontSize:'10px',fontFamily:'monospace'}}>Status: {c.status || 'DESCONOCIDO'}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:'16px',fontWeight:'800',color:'#fff'}}>{fmt$(c.spend)}</div>
                    <div style={{fontSize:'10px',color:'#555',fontFamily:'monospace'}}>{fmtN(c.clicks)} clics</div>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(80px,1fr))',gap:'6px'}}>
                  {[
                    {l:'Impresiones',v:fmtN(c.impressions)},
                    {l:'CTR',v:fmtP(c.ctr)},
                    {l:'CPC',v:fmt$(c.cpc)},
                    {l:'CPM',v:fmt$(c.cpm)},
                    {l:'Conversiones',v:fmtN(c.conversions)},
                    {l:'Valor',v:fmt$(c.conversion_value)},
                  ].map(m=><MiniMetric key={m.l} {...m}/>)}
                </div>
              </div>
            ))}
          </>
        )}

        {!googleAdsData.campaigns||googleAdsData.campaigns.length===0&&(
          <div style={{textAlign:'center',padding:'60px 0',color:'#444',fontFamily:'monospace'}}>Sin datos disponibles para este periodo</div>
        )}
      </>
    )}
  </>
)}
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
                  <div style={{fontSize:'14px',fontWeight:'700',color:'var(--text)',marginBottom:'6px'}}>Sin datos de audiencia</div>
                  <div style={{fontSize:'12px',color:'var(--text4)'}}>Prueba un período con más gasto o selecciona un mes con actividad</div>
                </div>
              )}
              {!loadingDemo&&demographics&&(
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
        </div>
      )}

      <PDFExportModal
        isOpen={showPDFModal}
        onClose={() => setShowPDFModal(false)}
        accountName={accountName}
        preset={preset}
        platform={platform}
        overview={overview}
        campaigns={isPro ? campaigns : []}
        ads={isPro ? ads : []}
        userId={userId}
        isPro={isPro}
      />
    </div>
  )
}
