'use client'
import { useState, useRef } from 'react'

// ─── Design tokens ─────────────────────────────────────────────────
const PW   = 1123
const PH   = 794
const FONT = '"Plus Jakarta Sans","Helvetica Neue",Arial,sans-serif'
const BG   = '#0a0a10'
const BG2  = '#111118'
const BG3  = '#16161f'
const BD   = 'rgba(255,255,255,.08)'
const T1   = '#ffffff'
const T2   = 'rgba(255,255,255,.65)'
const T3   = 'rgba(255,255,255,.32)'
const OK   = '#10b981'
const WARN = '#f59e0b'
const BAD  = '#ef4444'
const INFO = '#6366f1'

// ─── Helpers ───────────────────────────────────────────────────────
const n2  = n => +n||0
const fCur = n => n2(n)===0?'—':'$'+Number(n2(n)).toLocaleString('es-MX',{minimumFractionDigits:0,maximumFractionDigits:0})
const fPct = n => n2(n)===0?'—':Number(n2(n)).toFixed(2)+'%'
const fNum = n => n2(n)===0?'—':Number(n2(n)).toLocaleString('es-MX',{maximumFractionDigits:0})
const fK   = n => { const v=n2(n); if(v===0)return '—'; const a=Math.abs(v); if(a>=1e6)return(v/1e6).toFixed(1)+'M'; if(a>=1e3)return(v/1e3).toFixed(1)+'k'; return fNum(v) }
const fX   = n => n2(n)===0?'—':Number(n2(n)).toFixed(1)+'×'
const trunc = (s,n) => (s||'').length>n?(s||'').slice(0,n-1)+'…':(s||'—')
const chunk  = (a,n) => Array.from({length:Math.ceil(a.length/n)},(_,i)=>a.slice(i*n,i*n+n))
const PERIOD = {this_month:'Este mes',last_month:'Mes pasado',last_7d:'Últimos 7 días',last_30d:'Últimos 30 días',today:'Hoy',yesterday:'Ayer'}
const PLT    = {meta_ads:'Meta Ads',google_ads:'Google Ads',tiktok_ads:'TikTok Ads'}

// ── Delta vs prev period ──
function delta(curr, prev) {
  if(!prev||!curr||n2(prev)===0) return null
  const d = ((n2(curr)-n2(prev))/n2(prev))*100
  return { pct: d, up: d >= 0 }
}
function DeltaBadge({ curr, prev, lowerIsBetter=false }) {
  const d = delta(curr, prev)
  if(!d) return null
  const good = lowerIsBetter ? !d.up : d.up
  const color = good ? OK : BAD
  const sign  = d.up ? '▲' : '▼'
  return <span style={{fontSize:6.5,color,fontWeight:800,marginLeft:4}}>{sign}{Math.abs(d.pct).toFixed(0)}%</span>
}

// ─── Auto-insights ─────────────────────────────────────────────────
function buildInsights(ov, prev, campaigns) {
  const wins=[], warnings=[]
  if(n2(ov.ctr)>=2) wins.push(`CTR ${fPct(ov.ctr)} — supera el promedio de la industria (1–2%)`)
  else if(n2(ov.ctr)>0&&n2(ov.ctr)<1) warnings.push(`CTR ${fPct(ov.ctr)} — por debajo del promedio; revisar creativos y segmentación`)
  if(n2(ov.frequency)>4) warnings.push(`Frecuencia ${fX(ov.frequency)} — posible fatiga de audiencia, rotar creativos`)
  else if(n2(ov.frequency)>0&&n2(ov.frequency)<2) wins.push(`Frecuencia ${fX(ov.frequency)} — audiencia fresca, hay margen para escalar presupuesto`)
  const zeroCamps=(campaigns||[]).filter(c=>n2(c.results)===0&&n2(c.spend)>0.5)
  zeroCamps.slice(0,2).forEach(c=>warnings.push(`"${trunc(c.name||'Campaña',28)}" — presupuesto activo sin conversiones registradas`))
  const topC=[...(campaigns||[])].filter(c=>n2(c.results)>0).sort((a,b)=>n2(b.results)-n2(a.results))[0]
  if(topC) wins.push(`Campaña líder: "${trunc(topC.name||'',28)}" · ${fNum(topC.results)} resultados · ${fCur(topC.cpr)} c/u`)
  if(n2(ov.results)===0&&n2(ov.spend)>0) warnings.push('Sin conversiones registradas — verificar píxel y eventos de seguimiento')
  if(prev) {
    const spendChg = delta(ov.spend, prev.spend)
    const resChg   = delta(ov.results, prev.results)
    if(spendChg&&resChg&&spendChg.up&&resChg.up&&n2(ov.results)/Math.max(1,n2(ov.spend)) > n2(prev.results)/Math.max(1,n2(prev.spend)))
      wins.push(`Eficiencia mejoró vs período anterior — más resultados con gasto similar`)
    if(spendChg&&!spendChg.up&&resChg&&!resChg.up&&Math.abs(resChg.pct)>Math.abs(spendChg.pct))
      warnings.push(`Los resultados cayeron más que el gasto vs el período anterior — revisar optimización`)
  }
  if(n2(ov.shares)>200) wins.push(`${fK(ov.shares)} compartidos — el contenido genera alcance orgánico adicional`)
  return { wins:wins.slice(0,4), warnings:warnings.slice(0,4) }
}

// ─── SVG charts (pure SVG, compatible with html2canvas) ────────────

function SvgLine({ vals, color=INFO, w=260, h=60, labels=null }) {
  const vs=(vals||[]).map(n2); if(vs.length<2) return <div style={{width:w,height:h}}/>
  const max=Math.max(...vs)||1
  const pL=2,pR=2,pT=8,pB=labels?15:3, W=w-pL-pR, H=h-pT-pB
  const px=i=>+(pL+(i/(vs.length-1))*W).toFixed(1)
  const py=v=>+(pT+H-(v/max)*H).toFixed(1)
  const pts=vs.map((v,i)=>`${px(i)},${py(v)}`).join(' ')
  const area=`M${px(0)},${py(vs[0])} `+vs.map((v,i)=>`L${px(i)},${py(v)}`).join(' ')+` L${px(vs.length-1)},${pT+H} L${px(0)},${pT+H}Z`
  const idxs=labels?[0,Math.floor(labels.length/2),labels.length-1]:[]
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:'block'}}>
      <path d={area} fill={color} opacity="0.1"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={px(vs.length-1)} cy={py(vs[vs.length-1])} r="2.5" fill={color}/>
      {labels&&idxs.map(i=><text key={i} x={px(i)} y={h-2} fontSize="6.5" fill={T3} textAnchor={i===0?'start':i===labels.length-1?'end':'middle'} fontFamily={FONT}>{labels[i]}</text>)}
    </svg>
  )
}

function SvgDualLine({ vals1, vals2, color1=INFO, color2=OK, w=260, h=70, labels=null }) {
  const all=[...(vals1||[]),...(vals2||[])].map(n2)
  if(all.length<2) return <div style={{width:w,height:h}}/>
  const max=Math.max(...all)||1
  const pL=2,pR=2,pT=8,pB=labels?15:3, len=Math.max((vals1||[]).length,(vals2||[]).length)||1
  const W=w-pL-pR, H=h-pT-pB
  const px=i=>+(pL+(i/(len-1))*W).toFixed(1)
  const py=(v,mx)=>+(pT+H-(n2(v)/mx)*H).toFixed(1)
  const mkLine=(vals,color)=>{
    if(!vals||vals.length<2) return null
    const vs=vals.map(n2)
    const pts=vs.map((v,i)=>`${px(i)},${py(v,max)}`).join(' ')
    const area=`M${px(0)},${py(vs[0],max)} `+vs.map((v,i)=>`L${px(i)},${py(v,max)}`).join(' ')+` L${px(vs.length-1)},${pT+H} L${px(0)},${pT+H}Z`
    return <g key={color}><path d={area} fill={color} opacity="0.07"/><polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx={px(vs.length-1)} cy={py(vs[vs.length-1],max)} r="2" fill={color}/></g>
  }
  const idxs=labels?[0,Math.floor(labels.length/2),labels.length-1]:[]
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:'block'}}>
      {mkLine(vals1,color1)}{mkLine(vals2,color2)}
      {labels&&idxs.map(i=><text key={i} x={px(i)} y={h-2} fontSize="6.5" fill={T3} textAnchor={i===0?'start':i===labels.length-1?'end':'middle'} fontFamily={FONT}>{labels[i]}</text>)}
    </svg>
  )
}

function SvgBars({ vals, labels, color=INFO, w=260, h=70, showVals=false }) {
  const vs=(vals||[]).map(n2); if(!vs.length) return <div style={{width:w,height:h}}/>
  const max=Math.max(...vs)||1
  const pB=(labels||showVals)?14:3, pT=showVals?12:4, pL=2, pR=2
  const W=w-pL-pR, H=h-pT-pB, step=W/vs.length, bw=step*0.62
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:'block'}}>
      {vs.map((v,i)=>{
        const bh=Math.max(1,(v/max)*H), bx=+(pL+i*step+(step-bw)/2).toFixed(1), by=+(pT+H-bh).toFixed(1)
        const iMax=v===max
        return (
          <g key={i}>
            <rect x={bx} y={by} width={+(bw).toFixed(1)} height={+bh.toFixed(1)} rx="2" fill={iMax?color:color+'55'}/>
            {labels&&<text x={(bx+bw/2).toFixed(1)} y={h-2} fontSize="6.5" fill={T3} textAnchor="middle" fontFamily={FONT}>{labels[i]}</text>}
            {showVals&&v>0&&<text x={(bx+bw/2).toFixed(1)} y={+by-2} fontSize="6.5" fill={iMax?color:T3} textAnchor="middle" fontFamily={FONT}>{fK(v)}</text>}
          </g>
        )
      })}
    </svg>
  )
}

function SvgDonut({ slices, size=80, centerLabel=null }) {
  if(!slices||!slices.length) return <div style={{width:size,height:size}}/>
  const total=slices.reduce((s,x)=>s+n2(x.value),0)||1
  const cx=size/2, cy=size/2, R=size/2-4, ri=R*0.54
  let ang=-Math.PI/2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{display:'block'}}>
      {slices.map((s,i)=>{
        const a=(n2(s.value)/total)*Math.PI*2
        if(a<=0.001) return null
        const x1=+(cx+R*Math.cos(ang)).toFixed(2),y1=+(cy+R*Math.sin(ang)).toFixed(2)
        const x2=+(cx+R*Math.cos(ang+a)).toFixed(2),y2=+(cy+R*Math.sin(ang+a)).toFixed(2)
        const xi1=+(cx+ri*Math.cos(ang)).toFixed(2),yi1=+(cy+ri*Math.sin(ang)).toFixed(2)
        const xi2=+(cx+ri*Math.cos(ang+a)).toFixed(2),yi2=+(cy+ri*Math.sin(ang+a)).toFixed(2)
        const lg=a>Math.PI?1:0
        const d=`M${xi1},${yi1} L${x1},${y1} A${R},${R} 0 ${lg},1 ${x2},${y2} L${xi2},${yi2} A${ri},${ri} 0 ${lg},0 ${xi1},${yi1}Z`
        ang+=a
        return <path key={i} d={d} fill={s.color}/>
      })}
      <circle cx={cx} cy={cy} r={ri} fill={BG2}/>
      {centerLabel&&<text x={cx} y={cy+3} fontSize="9" fontWeight="700" fill={T1} textAnchor="middle" fontFamily={FONT}>{centerLabel}</text>}
    </svg>
  )
}

function SvgHBars({ items, color=INFO, w=280, rowH=15, gap=4 }) {
  if(!items||!items.length) return null
  const maxV=Math.max(...items.map(x=>n2(x.value)))||1
  const LW=80, VW=42, BAR=w-LW-VW-4
  const totalH=items.length*(rowH+gap)-gap
  return (
    <svg width={w} height={totalH} viewBox={`0 0 ${w} ${totalH}`} style={{display:'block'}}>
      {items.map((item,i)=>{
        const y=i*(rowH+gap)
        const bw=Math.max(2,(n2(item.value)/maxV)*BAR)
        return (
          <g key={i}>
            <text x={0} y={y+rowH-3} fontSize="7.5" fill={i===0?T2:T3} fontFamily={FONT} fontWeight={i===0?'700':'400'}>{trunc(item.label||'',12)}</text>
            <rect x={LW} y={y+1} width={BAR} height={rowH-2} rx="2" fill="rgba(255,255,255,.04)"/>
            <rect x={LW} y={y+1} width={+bw.toFixed(1)} height={rowH-2} rx="2" fill={i===0?color:color+'55'}/>
            {item.label2&&<text x={LW+BAR+4} y={y+rowH-3} fontSize="7" fill={i===0?T2:T3} fontFamily={FONT}>{item.label2}</text>}
          </g>
        )
      })}
    </svg>
  )
}

// Mini sparkline for table rows
function Spark({ vals, color=INFO, w=50, h=16 }) {
  const vs=(vals||[]).map(n2); if(vs.length<3) return null
  const max=Math.max(...vs)||1, min=Math.min(...vs)
  const H=h-4, W=w-2
  const px=i=>+(1+(i/(vs.length-1))*W).toFixed(1)
  const py=v=>+(2+(1-((v-min)/(max-min||1)))*H).toFixed(1)
  const pts=vs.map((v,i)=>`${px(i)},${py(v)}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:'inline-block',verticalAlign:'middle',marginLeft:4}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Layout primitives ─────────────────────────────────────────────
function Page({ children, color }) {
  return (
    <div className="pdf-page" style={{width:PW,height:PH,background:BG,overflow:'hidden',position:'relative',fontFamily:FONT,boxSizing:'border-box',display:'flex',flexDirection:'column'}}>
      <div style={{height:4,background:color,flexShrink:0}}/>
      <div style={{flex:1,padding:'14px 30px 12px',overflow:'hidden',display:'flex',flexDirection:'column'}}>
        {children}
      </div>
    </div>
  )
}

function PageHdr({ acct, title, sub, color, page, total, icon=null }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:9,flexShrink:0,paddingBottom:8,borderBottom:`1px solid ${BD}`}}>
      <div>
        <div style={{fontSize:6.5,color:T3,letterSpacing:'.13em',textTransform:'uppercase',marginBottom:1.5,fontWeight:700}}>{acct}</div>
        <div style={{fontSize:15,fontWeight:800,color:T1,lineHeight:1,display:'flex',alignItems:'center',gap:6}}>{icon&&<span style={{fontSize:14}}>{icon}</span>}{title}</div>
        {sub&&<div style={{fontSize:8,color:T3,marginTop:2}}>{sub}</div>}
      </div>
      {total>1&&<div style={{fontSize:8,color:T3,fontFamily:'monospace',background:BG2,border:`1px solid ${BD}`,padding:'3px 8px',borderRadius:4}}>p. {page}/{total}</div>}
    </div>
  )
}

function Lbl({ text, color }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:5,flexShrink:0}}>
      <div style={{width:3,height:8,background:color,borderRadius:2,flexShrink:0}}/>
      <span style={{fontSize:6.5,fontWeight:800,color:T3,letterSpacing:'.12em',textTransform:'uppercase'}}>{text}</span>
    </div>
  )
}

function KPIBox({ label, value, note, color, delta=null, small=false }) {
  return (
    <div style={{flex:1,background:BG2,borderRadius:8,padding:small?'8px 10px':'10px 12px',borderLeft:`3px solid ${color}`,minWidth:0,border:`1px solid ${BD}`,borderLeft:`3px solid ${color}`}}>
      <div style={{fontSize:6,color:T3,fontWeight:800,letterSpacing:'.11em',textTransform:'uppercase',marginBottom:3}}>{label}</div>
      <div style={{display:'flex',alignItems:'baseline',gap:0}}>
        <div style={{fontSize:small?16:19,fontWeight:800,color:T1,lineHeight:1}}>{value}</div>
        {delta}
      </div>
      {note&&<div style={{fontSize:6.5,color:T3,marginTop:2}}>{note}</div>}
    </div>
  )
}

function MetricPill({ label, value, color=null }) {
  return (
    <div style={{background:BG2,borderRadius:6,padding:'7px 9px',border:`1px solid ${BD}`,flex:1,minWidth:0}}>
      <div style={{fontSize:6,color:T3,fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:2.5}}>{label}</div>
      <div style={{fontSize:12,fontWeight:700,color:color||T1}}>{value}</div>
    </div>
  )
}

function DarkTable({ headers, rows, color, colWidths, rowBg, compact=false }) {
  const fs = compact ? 7.5 : 8.5
  const thFs = compact ? 6.5 : 7
  const pad = compact ? '4.5px 7px' : '6px 8px'
  return (
    <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed',fontSize:fs}}>
      <colgroup>{(colWidths||headers.map((_,i)=>i===0?'30%':`${70/(headers.length-1)}%`)).map((w,i)=><col key={i} style={{width:w}}/>)}</colgroup>
      <thead>
        <tr>{headers.map((h,i)=><th key={i} style={{padding:pad,textAlign:i===0?'left':'right',background:color,color:'#fff',fontWeight:700,fontSize:thFs,letterSpacing:'.06em',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row,ri)=>{
          const bg=rowBg?rowBg(ri):(ri%2===0?BG2:BG3)
          return <tr key={ri} style={{background:bg}}>{row.map((cell,ci)=><td key={ci} style={{padding:pad,textAlign:ci===0?'left':'right',color:ci===0?T1:T2,fontWeight:ci===0?600:400,fontSize:ci===0?(compact?8:9):fs-0.5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',borderBottom:`1px solid rgba(255,255,255,.04)`}}>{cell}</td>)}</tr>
        })}
      </tbody>
    </table>
  )
}

// ─────────────────────────────────────────────────────────────────────
// PAGE 1 — PORTADA
// ─────────────────────────────────────────────────────────────────────
function PortadaPage({ color, logo, brandName, accountName, platform, preset, overview, prevOverview }) {
  const plt  = PLT[platform||'meta_ads']||'Meta Ads'
  const today= new Date().toLocaleDateString('es-MX',{year:'numeric',month:'long',day:'numeric'})
  const ov   = overview||{}
  const kpis = [
    {l:'Gasto total',    v:fCur(ov.spend),      prev:prevOverview?.spend,    lowerBetter:true},
    {l:'Resultados',     v:fK(ov.results),      prev:prevOverview?.results,  lowerBetter:false},
    {l:'Costo/resultado',v:fCur(ov.cpr),        prev:prevOverview?.cpr,      lowerBetter:true},
    {l:'Alcance',        v:fK(ov.reach),        prev:prevOverview?.reach,    lowerBetter:false},
    {l:'CTR',            v:fPct(ov.ctr),        prev:prevOverview?.ctr,      lowerBetter:false},
    {l:'CPM',            v:fCur(ov.cpm),        prev:prevOverview?.cpm,      lowerBetter:true},
  ]
  return (
    <div className="pdf-page" style={{width:PW,height:PH,background:BG,overflow:'hidden',fontFamily:FONT,boxSizing:'border-box',display:'flex'}}>
      {/* Hero izquierdo */}
      <div style={{width:380,background:color,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 44px',flexShrink:0,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle at 1px 1px,rgba(255,255,255,.07) 1px,transparent 0)',backgroundSize:'18px 18px'}}/>
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:100,background:'rgba(0,0,0,.2)'}}/>
        {logo
          ? <img src={logo} alt="" style={{maxHeight:56,maxWidth:140,objectFit:'contain',marginBottom:18,position:'relative'}} crossOrigin="anonymous"/>
          : <div style={{width:44,height:44,borderRadius:12,background:'rgba(255,255,255,.18)',marginBottom:18,display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>
            </div>
        }
        {brandName&&<div style={{fontSize:8,color:'rgba(255,255,255,.7)',fontWeight:700,marginBottom:5,letterSpacing:'.08em',textTransform:'uppercase',textAlign:'center',position:'relative'}}>{brandName}</div>}
        <div style={{fontSize:21,fontWeight:800,color:'#fff',textAlign:'center',lineHeight:1.3,marginBottom:12,maxWidth:268,position:'relative'}}>{accountName}</div>
        <div style={{background:'rgba(255,255,255,.18)',borderRadius:20,padding:'3px 13px',fontSize:9,fontWeight:700,color:'#fff',letterSpacing:'.04em',position:'relative',marginBottom:8}}>{plt}</div>
        <div style={{fontSize:8.5,color:'rgba(255,255,255,.55)',position:'relative'}}>{PERIOD[preset]||preset}</div>
        <div style={{position:'absolute',bottom:16,fontSize:7.5,color:'rgba(255,255,255,.25)'}}>Generado con Kaan · {today}</div>
      </div>
      {/* Panel derecho */}
      <div style={{flex:1,padding:'32px 36px',display:'flex',flexDirection:'column',justifyContent:'space-between',background:BG}}>
        <div>
          <div style={{fontSize:7,color:T3,fontWeight:800,letterSpacing:'.14em',textTransform:'uppercase',marginBottom:4}}>Métricas del período — {PERIOD[preset]||preset}</div>
          {prevOverview&&<div style={{fontSize:8,color:T3,marginBottom:12}}>Los indicadores ▲▼ muestran cambio vs período anterior</div>}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:16}}>
            {kpis.map((k,i)=>(
              <div key={i} style={{background:BG2,borderRadius:9,padding:'11px 13px',border:`1px solid ${BD}`,borderLeft:`3px solid ${color}`}}>
                <div style={{fontSize:6,color:T3,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:3}}>{k.l}</div>
                <div style={{display:'flex',alignItems:'baseline',gap:2}}>
                  <div style={{fontSize:17,fontWeight:800,color:T1}}>{k.v}</div>
                  {prevOverview&&<DeltaBadge curr={i===0?ov.spend:i===1?ov.results:i===2?ov.cpr:i===3?ov.reach:i===4?ov.ctr:ov.cpm} prev={i===0?prevOverview.spend:i===1?prevOverview.results:i===2?prevOverview.cpr:i===3?prevOverview.reach:i===4?prevOverview.ctr:prevOverview.cpm} lowerIsBetter={k.lowerBetter}/>}
                </div>
              </div>
            ))}
          </div>
          {/* Resumen en texto */}
          {n2(ov.spend)>0&&(
            <div style={{background:BG2,borderRadius:9,padding:'11px 14px',border:`1px solid ${BD}`,fontSize:9.5,color:T2,lineHeight:1.7}}>
              Se invirtieron <strong style={{color:T1}}>{fCur(ov.spend)}</strong> alcanzando a <strong style={{color:T1}}>{fK(ov.reach)}</strong> personas únicas con frecuencia de <strong style={{color:T1}}>{fX(ov.frequency)}</strong>. Se generaron <strong style={{color:T1}}>{fNum(ov.results)}</strong> resultados a un costo de <strong style={{color:T1}}>{fCur(ov.cpr)}</strong> cada uno. CTR: <strong style={{color:n2(ov.ctr)>=2?OK:n2(ov.ctr)>=1?WARN:BAD}}>{fPct(ov.ctr)}</strong>.
            </div>
          )}
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:8,color:T3}}>Kaan Analytics{brandName?` · ${brandName}`:''}</div>
          <div style={{display:'flex',alignItems:'center',gap:5}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:color}}/>
            <span style={{fontSize:8,color:T3}}>{plt}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// PAGE 2 — RESUMEN COMPLETO
// ─────────────────────────────────────────────────────────────────────
function ResumenPage({ color, accountName, overview, prevOverview, campaigns, daily }) {
  if(!overview) return null
  const ov = overview
  const freq = n2(ov.frequency)>0?`${Number(ov.frequency).toFixed(1)}×`:'—'
  const hasEng= n2(ov.reactions)+n2(ov.comments)+n2(ov.shares)>0
  const hasVid= n2(ov.hookRate)+n2(ov.vid25)+n2(ov.vid50)>0
  const { wins, warnings } = buildInsights(ov, prevOverview, campaigns)
  const dailyNums  = (daily||[]).map(d=>n2(d.spend))
  const resultNums = (daily||[]).map(d=>n2(d.results))
  const ctrNums    = (daily||[]).map(d=>n2(d.ctr))
  const dateLabels = (daily||[]).map(d=>(d.date||'').slice(5))
  const hasDailyChart = dailyNums.length>2

  return (
    <Page color={color}>
      <PageHdr acct={accountName} title="Resumen de Rendimiento" sub="Métricas principales del período seleccionado" color={color} icon="📊"/>

      {/* KPI row principal */}
      <div style={{display:'flex',gap:7,marginBottom:8,flexShrink:0}}>
        <KPIBox label="Gasto Total"      value={fCur(ov.spend)}       color={color}    delta={prevOverview&&<DeltaBadge curr={ov.spend}  prev={prevOverview.spend}  lowerIsBetter/>} note={prevOverview?`Ant: ${fCur(prevOverview.spend)}`:null}/>
        <KPIBox label="Resultados"       value={fK(ov.results)}       color={OK}       delta={prevOverview&&<DeltaBadge curr={ov.results} prev={prevOverview.results}/>}              note={prevOverview?`Ant: ${fK(prevOverview.results)}`:null}/>
        <KPIBox label="Costo/Resultado"  value={fCur(ov.cpr)}         color={n2(ov.cpr)>0?WARN:color} delta={prevOverview&&<DeltaBadge curr={ov.cpr} prev={prevOverview.cpr} lowerIsBetter/>}/>
        <KPIBox label="Alcance"          value={fK(ov.reach)}         color={color}    delta={prevOverview&&<DeltaBadge curr={ov.reach}   prev={prevOverview.reach}/>}/>
        <KPIBox label="CTR"              value={fPct(ov.ctr)}         color={n2(ov.ctr)>=2?OK:n2(ov.ctr)>=1?WARN:BAD} note={n2(ov.ctr)>=2?'↑ sobre el promedio':n2(ov.ctr)>=1?'en el promedio':'↓ bajo el promedio'}/>
        <KPIBox label="CPM"              value={fCur(ov.cpm)}         color={color}/>
        <KPIBox label="Frecuencia"       value={freq}                  color={n2(ov.frequency)<=3?OK:n2(ov.frequency)<=4?WARN:BAD} note={n2(ov.frequency)>4?'⚠ saturación':null}/>
      </div>

      {/* Body 2 cols */}
      <div style={{display:'flex',gap:12,flex:1,minHeight:0}}>
        {/* Left */}
        <div style={{flex:1.15,display:'flex',flexDirection:'column',gap:8,overflow:'hidden'}}>
          {/* Secondary metrics */}
          <div>
            <Lbl text="Rendimiento detallado" color={color}/>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              <MetricPill label="CPC"           value={fCur(ov.cpc)}/>
              <MetricPill label="Impresiones"   value={fK(ov.impressions)}/>
              <MetricPill label="Clics totales" value={fK(ov.clicks)}/>
              <MetricPill label="Costo x 1k imp" value={fCur(ov.cpm)}/>
              {n2(ov.engagementRate)>0&&<MetricPill label="Eng. Rate" value={fPct(ov.engagementRate)}/>}
            </div>
          </div>
          {/* Engagement */}
          {hasEng&&(
            <div>
              <Lbl text="Interacciones orgánicas" color={color}/>
              <div style={{display:'flex',gap:6}}>
                <MetricPill label="👍 Reacciones"  value={fK(ov.reactions)}/>
                <MetricPill label="💬 Comentarios" value={fK(ov.comments)}/>
                <MetricPill label="🔖 Guardados"   value={fK(ov.saves)}/>
                <MetricPill label="↗ Compartidos"  value={fK(ov.shares)}/>
              </div>
            </div>
          )}
          {/* Video */}
          {hasVid&&(
            <div>
              <Lbl text="Métricas de video" color={color}/>
              <div style={{display:'flex',gap:6}}>
                {n2(ov.hookRate)>0&&<MetricPill label="Hook Rate (3s)" value={fPct(ov.hookRate)} color={n2(ov.hookRate)>=30?OK:WARN}/>}
                {n2(ov.holdRate)>0&&<MetricPill label="Hold Rate"      value={fPct(ov.holdRate)}/>}
                {n2(ov.vid25)>0&&  <MetricPill label="Visto 25%"      value={fK(ov.vid25)}/>}
                {n2(ov.vid50)>0&&  <MetricPill label="Visto 50%"      value={fK(ov.vid50)}/>}
                {n2(ov.vid75)>0&&  <MetricPill label="Visto 75%"      value={fK(ov.vid75)}/>}
                {n2(ov.vid100)>0&& <MetricPill label="Completado"     value={fK(ov.vid100)} color={OK}/>}
              </div>
            </div>
          )}
          {/* Daily chart */}
          {hasDailyChart&&(
            <div style={{flex:1}}>
              <Lbl text="Tendencia diaria del período" color={color}/>
              <div style={{background:BG2,borderRadius:9,padding:'8px 10px',border:`1px solid ${BD}`}}>
                <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:5}}>
                  <div style={{display:'flex',alignItems:'center',gap:3}}><div style={{width:10,height:2,background:color,borderRadius:1}}/><span style={{fontSize:6.5,color:T3}}>Gasto</span></div>
                  {resultNums.some(v=>v>0)&&<div style={{display:'flex',alignItems:'center',gap:3}}><div style={{width:10,height:2,background:OK,borderRadius:1}}/><span style={{fontSize:6.5,color:T3}}>Resultados</span></div>}
                  {ctrNums.some(v=>v>0)&&<div style={{display:'flex',alignItems:'center',gap:3}}><div style={{width:10,height:2,background:WARN,borderRadius:1}}/><span style={{fontSize:6.5,color:T3}}>CTR</span></div>}
                </div>
                <SvgDualLine vals1={dailyNums} vals2={resultNums.some(v=>v>0)?resultNums:null} color1={color} color2={OK} w={316} h={65} labels={dateLabels}/>
              </div>
            </div>
          )}
        </div>

        <div style={{width:1,background:BD,flexShrink:0}}/>

        {/* Right — insights + benchmarks */}
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:8,overflow:'hidden'}}>
          <Lbl text="Análisis del período" color={color}/>
          {wins.length>0&&(
            <div style={{background:'rgba(16,185,129,.08)',borderRadius:8,padding:'9px 11px',border:'1px solid rgba(16,185,129,.18)'}}>
              <div style={{fontSize:6.5,fontWeight:800,color:OK,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:5}}>✓ Lo que funcionó</div>
              {wins.map((w,i)=><div key={i} style={{fontSize:8.5,color:'rgba(110,231,183,.85)',lineHeight:1.55,marginBottom:2.5,display:'flex',gap:4}}><span style={{flexShrink:0,color:OK}}>·</span><span>{w}</span></div>)}
            </div>
          )}
          {warnings.length>0&&(
            <div style={{background:'rgba(245,158,11,.07)',borderRadius:8,padding:'9px 11px',border:'1px solid rgba(245,158,11,.18)'}}>
              <div style={{fontSize:6.5,fontWeight:800,color:WARN,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:5}}>⚠ Puntos de atención</div>
              {warnings.map((w,i)=><div key={i} style={{fontSize:8.5,color:'rgba(253,230,138,.8)',lineHeight:1.55,marginBottom:2.5,display:'flex',gap:4}}><span style={{flexShrink:0,color:WARN}}>·</span><span>{w}</span></div>)}
            </div>
          )}
          {/* Benchmarks */}
          <div style={{marginTop:'auto'}}>
            <Lbl text="Tu cuenta vs benchmarks Meta Ads" color={color}/>
            {[
              {l:'CTR',       bench:'1–2%',  val:fPct(ov.ctr),   c:n2(ov.ctr)>=2?OK:n2(ov.ctr)>=1?WARN:BAD},
              {l:'Frecuencia',bench:'1–3×',  val:freq,           c:n2(ov.frequency)<=3?OK:n2(ov.frequency)<=4?WARN:BAD},
              {l:'CPM',       bench:'$10–50',val:fCur(ov.cpm),   c:T1},
              {l:'CPC',       bench:'$5–15', val:fCur(ov.cpc),   c:T1},
              {l:'Hook Rate', bench:'>30%',  val:fPct(ov.hookRate), c:hasVid?(n2(ov.hookRate)>=30?OK:WARN):T3},
            ].map((b,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4.5px 8px',background:i%2===0?BG2:'transparent',borderRadius:5,marginBottom:2}}>
                <span style={{fontSize:8,color:T2,fontWeight:600}}>{b.l}</span>
                <div style={{display:'flex',gap:10,alignItems:'center'}}>
                  <span style={{fontSize:7,color:T3}}>ref. {b.bench}</span>
                  <span style={{fontSize:9,fontWeight:700,color:b.c}}>{b.val}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Page>
  )
}

// ─────────────────────────────────────────────────────────────────────
// PAGE 3+: CAMPAÑAS / CONJUNTOS  (componente reutilizable)
// ─────────────────────────────────────────────────────────────────────
function EntidadPage({ color, accountName, rows, page, total, totalAll, entity='Campañas', entitySub='ordenadas por gasto', prevMap=null }) {
  const sorted = [...rows].sort((a,b)=>n2(b.spend)-n2(a.spend))
  const totalSpend = sorted.reduce((s,c)=>s+n2(c.spend),0)||1
  const maxResults = Math.max(...sorted.map(c=>n2(c.results)))
  const topIdx = sorted.findIndex(c=>n2(c.results)===maxResults&&n2(c.results)>0)
  const top6 = sorted.slice(0,8)
  const hasEng = sorted.some(c=>n2(c.reactions)+n2(c.comments)+n2(c.shares)>0)

  return (
    <Page color={color}>
      <PageHdr acct={accountName} title={entity} sub={`${totalAll} ${entity.toLowerCase()} · ${entitySub}`} color={color} page={page} total={total} icon={entity==='Campañas'?'🎯':'👥'}/>

      <div style={{display:'flex',gap:12,flex:1,minHeight:0}}>
        {/* Charts column */}
        {top6.length>=2&&(
          <div style={{width:210,flexShrink:0,display:'flex',flexDirection:'column',gap:8}}>
            <div style={{background:BG2,borderRadius:9,padding:'8px 10px',border:`1px solid ${BD}`,flex:1}}>
              <Lbl text="Gasto por entidad" color={color}/>
              <SvgHBars items={top6.map(c=>({label:trunc(c.name||'Sin nombre',13), value:n2(c.spend), label2:fCur(c.spend)}))} color={color} w={188} rowH={14} gap={4}/>
              <div style={{marginTop:8}}/>
              <Lbl text="Resultados" color={color}/>
              <SvgBars vals={top6.map(c=>n2(c.results))} labels={top6.map(c=>trunc(c.name||'',4))} color={OK} w={188} h={50} showVals/>
            </div>
            {/* Comparativa vs anterior */}
            {top6.some(c=>n2(c.ctr)>0)&&(
              <div style={{background:BG2,borderRadius:9,padding:'8px 10px',border:`1px solid ${BD}`}}>
                <Lbl text="CTR por entidad" color={color}/>
                <SvgHBars items={top6.map(c=>({label:trunc(c.name||'',13), value:n2(c.ctr), label2:fPct(c.ctr)}))} color={WARN} w={188} rowH={13} gap={3}/>
              </div>
            )}
          </div>
        )}

        {/* Table */}
        <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column',gap:5}}>
          <div style={{display:'flex',gap:5,marginBottom:3,fontSize:7,color:T3,flexShrink:0}}>
            {topIdx>=0&&<span style={{display:'flex',alignItems:'center',gap:3}}><span style={{width:6,height:6,borderRadius:2,background:OK+'40',border:`1px solid ${OK}60`,display:'inline-block'}}/> ★ Mejor resultado</span>}
            <span style={{display:'flex',alignItems:'center',gap:3}}><span style={{width:6,height:6,borderRadius:2,background:WARN+'40',border:`1px solid ${WARN}60`,display:'inline-block'}}/> Sin conversiones</span>
          </div>

          {/* Main metrics table */}
          <DarkTable
            color={color}
            compact
            headers={[entity==='Campañas'?'Campaña':'Conjunto','% Pres.','Gasto','Resultados','Costo/Res.','CTR','CPM','CPC','Impresiones','Clics','Alcance','Frec.']}
            colWidths={['22%','5%','8%','8%','8%','6%','7%','7%','8%','6%','7%','4%']}
            rowBg={ri=>{
              if(ri===topIdx) return `${OK}18`
              if(n2(sorted[ri]?.results)===0&&n2(sorted[ri]?.spend)>0.5) return `${WARN}15`
              return ri%2===0?BG2:BG3
            }}
            rows={sorted.map((c,i)=>[
              (i===topIdx?'★ ':'')+trunc(c.name||'Sin nombre',26),
              `${((n2(c.spend)/totalSpend)*100).toFixed(0)}%`,
              fCur(c.spend),
              fNum(c.results),
              fCur(c.cpr),
              fPct(c.ctr),
              fCur(c.cpm),
              fCur(c.cpc),
              fK(c.impressions),
              fK(c.clicks),
              fK(c.reach),
              n2(c.frequency)>0?`${Number(c.frequency).toFixed(1)}×`:'—',
            ])}
          />

          {/* Engagement table (if data exists) */}
          {hasEng&&sorted.some(c=>n2(c.reactions)+n2(c.comments)+n2(c.shares)>0)&&(
            <div style={{marginTop:4}}>
              <Lbl text="Engagement por entidad" color={color}/>
              <DarkTable
                color={color}
                compact
                headers={['Entidad','👍 Reacciones','💬 Comentarios','🔖 Guardados','↗ Compartidos','Eng. Rate']}
                colWidths={['35%','13%','13%','13%','13%','13%']}
                rows={sorted.filter(c=>n2(c.reactions)+n2(c.comments)+n2(c.shares)>0).slice(0,5).map(c=>[
                  trunc(c.name||'Sin nombre',32),
                  fK(c.reactions),
                  fK(c.comments),
                  fK(c.saves),
                  fK(c.shares),
                  n2(c.engagementRate)>0?fPct(c.engagementRate):'—',
                ])}
              />
            </div>
          )}
        </div>
      </div>
    </Page>
  )
}

// ─────────────────────────────────────────────────────────────────────
// PAGE: ANUNCIOS
// ─────────────────────────────────────────────────────────────────────
function AnunciosPage({ color, accountName, ads, page, total, totalAll }) {
  const sorted = [...ads].sort((a,b)=>n2(b.spend)-n2(a.spend))
  const topAd  = [...ads].filter(a=>n2(a.results)>0).sort((a,b)=>n2(b.results)-n2(a.results))[0]
  const worst  = [...ads].filter(a=>n2(a.results)===0&&n2(a.spend)>0).sort((a,b)=>n2(b.spend)-n2(a.spend))[0]
  const hasVid = ads.some(a=>n2(a.hookRate)>0||n2(a.vid25)>0)
  const topByCtr = [...ads].sort((a,b)=>n2(b.ctr)-n2(a.ctr)).slice(0,6)

  return (
    <Page color={color}>
      <PageHdr acct={accountName} title="Anuncios" sub={`${totalAll} anuncio${totalAll!==1?'s':''} · ordenados por gasto`} color={color} page={page} total={total} icon="🖼"/>

      <div style={{display:'flex',gap:12,flex:1,minHeight:0}}>
        {/* Left */}
        <div style={{width:215,flexShrink:0,display:'flex',flexDirection:'column',gap:8}}>
          {topAd&&(
            <div style={{background:`${OK}12`,borderRadius:9,padding:'9px 11px',border:`1px solid ${OK}30`}}>
              <div style={{fontSize:6.5,fontWeight:800,color:OK,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:4}}>🏆 Top performer</div>
              <div style={{fontSize:9,fontWeight:700,color:T1,marginBottom:2,lineHeight:1.3}}>{trunc(topAd.name||'Sin nombre',34)}</div>
              <div style={{fontSize:7.5,color:T2}}>{fNum(topAd.results)} resultados · {fCur(topAd.cpr)} c/u</div>
              <div style={{fontSize:7,color:T3,marginTop:2}}>CTR {fPct(topAd.ctr)} · Gasto {fCur(topAd.spend)} · CPM {fCur(topAd.cpm)}</div>
            </div>
          )}
          {worst&&(
            <div style={{background:`${BAD}10`,borderRadius:9,padding:'9px 11px',border:`1px solid ${BAD}25`}}>
              <div style={{fontSize:6.5,fontWeight:800,color:BAD,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:4}}>⚠ Sin conversiones</div>
              <div style={{fontSize:9,fontWeight:700,color:T1,marginBottom:2,lineHeight:1.3}}>{trunc(worst.name||'Sin nombre',34)}</div>
              <div style={{fontSize:7.5,color:T2}}>Gastó {fCur(worst.spend)} sin resultados</div>
              <div style={{fontSize:7,color:T3}}>Recomendación: pausar o revisar</div>
            </div>
          )}
          <div style={{flex:1}}>
            <Lbl text="CTR — top anuncios" color={color}/>
            <div style={{background:BG2,borderRadius:9,padding:'8px 10px',border:`1px solid ${BD}`}}>
              <SvgHBars items={topByCtr.map(a=>({label:trunc(a.name||'Sin nombre',12),value:n2(a.ctr),label2:fPct(a.ctr)}))} color={color} w={193} rowH={13} gap={4}/>
            </div>
          </div>
        </div>

        {/* Right */}
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:6,overflow:'hidden'}}>
          <Lbl text="Detalle completo — rendimiento" color={color}/>
          <DarkTable
            color={color}
            compact
            headers={['Anuncio','Conjunto','Campaña','Estado','Gasto','Resultados','CTR','Costo/Res.','CPM','CPC','Impres.','Clics']}
            colWidths={['18%','14%','14%','6%','7%','8%','6%','7%','7%','6%','7%','7%']}
            rowBg={ri=>{
              if(n2(sorted[ri]?.results)>0&&ri===0) return `${OK}18`
              if(n2(sorted[ri]?.results)===0&&n2(sorted[ri]?.spend)>0.5) return `${WARN}15`
              return ri%2===0?BG2:BG3
            }}
            rows={sorted.map(a=>[
              trunc(a.name||'Sin nombre',22),
              trunc(a.adset||'—',16),
              trunc(a.campaign||'—',16),
              a.status==='ACTIVE'?'Activo':a.status==='PAUSED'?'Pausado':(a.status||'—'),
              fCur(a.spend),fNum(a.results),fPct(a.ctr),fCur(a.cpr),fCur(a.cpm),fCur(a.cpc),fK(a.impressions),fK(a.clicks),
            ])}
          />
          {hasVid&&(
            <div style={{marginTop:4}}>
              <Lbl text="Métricas de video por anuncio" color={color}/>
              <DarkTable
                color={color}
                compact
                headers={['Anuncio','Hook Rate (3s)','Visto 25%','Visto 50%','Visto 75%','Completado','Hold Rate']}
                colWidths={['30%','14%','11%','11%','11%','12%','11%']}
                rows={sorted.filter(a=>n2(a.hookRate)>0||n2(a.vid25)>0).slice(0,6).map(a=>[
                  trunc(a.name||'Sin nombre',30),
                  n2(a.hookRate)>0?fPct(a.hookRate):'—',
                  fK(a.vid25),fK(a.vid50),fK(a.vid75),fK(a.vid100),
                  n2(a.holdRate)>0?fPct(a.holdRate):'—',
                ])}
              />
            </div>
          )}
        </div>
      </div>
    </Page>
  )
}

// ─────────────────────────────────────────────────────────────────────
// PAGE: AUDIENCIAS
// ─────────────────────────────────────────────────────────────────────
function AudienciasPage({ color, accountName, demographics }) {
  const d = demographics||{}
  const age    = (d.age||[]).slice(0,8)
  const gender = (d.gender||[])
  const device = (d.device||[]).slice(0,6)
  const country= (d.country||[]).slice(0,8)
  const region = (d.region||[]).slice(0,6)
  const plt    = (d.platform||[]).slice(0,5)
  const male   = gender.find(g=>g.gender==='male')
  const female = gender.find(g=>g.gender==='female')
  const tG     = (parseFloat(male?.spend)||0)+(parseFloat(female?.spend)||0)||1
  const gSlices= [{value:parseFloat(male?.spend)||0,color:'#3b82f6',label:'Hombre'},{value:parseFloat(female?.spend)||0,color:'#ec4899',label:'Mujer'}].filter(s=>s.value>0)
  const gPct   = v => tG>0?((v/tG)*100).toFixed(0)+'%':'—'

  return (
    <Page color={color}>
      <PageHdr acct={accountName} title="Audiencias" sub="Demografía, dispositivos y geografía del período" color={color} icon="🗺"/>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,flex:1,minHeight:0}}>
        {/* TL: Age */}
        <div style={{background:BG2,borderRadius:10,padding:'9px 11px',border:`1px solid ${BD}`,display:'flex',flexDirection:'column'}}>
          <Lbl text="Gasto por rango de edad" color={color}/>
          {age.length>0
            ? <>
                <SvgBars vals={age.map(a=>parseFloat(a.spend)||0)} labels={age.map(a=>a.age||'?')} color={color} w={248} h={62} showVals/>
                <div style={{display:'flex',gap:5,marginTop:6,flexWrap:'wrap'}}>
                  {age.slice(0,5).map((a,i)=>(
                    <div key={i} style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:6,color:T3,textTransform:'uppercase',letterSpacing:'.08em',fontWeight:700}}>{a.age}</div>
                      <div style={{fontSize:8.5,fontWeight:700,color:i===0?color:T1}}>{fCur(a.spend)}</div>
                      <div style={{fontSize:6.5,color:T3}}>{fK(a.impressions)} impr.</div>
                      <div style={{fontSize:6.5,color:T3}}>{fPct(a.ctr)} CTR</div>
                    </div>
                  ))}
                </div>
              </>
            : <div style={{fontSize:9,color:T3,paddingTop:16}}>Sin datos de edad disponibles</div>}
        </div>

        {/* TR: Gender + Device + Platform */}
        <div style={{background:BG2,borderRadius:10,padding:'9px 11px',border:`1px solid ${BD}`,display:'flex',gap:9}}>
          <div style={{flex:1}}>
            <Lbl text="Género" color={color}/>
            {gSlices.length>0
              ? <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <SvgDonut slices={gSlices} size={66} centerLabel={male&&female?gPct(Math.max(parseFloat(male.spend)||0,parseFloat(female.spend)||0)):null}/>
                  <div style={{flex:1}}>
                    {gSlices.map((s,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',gap:4,marginBottom:5}}>
                        <div style={{width:7,height:7,borderRadius:2,background:s.color,flexShrink:0}}/>
                        <div>
                          <div style={{fontSize:8,color:T1,fontWeight:700}}>{s.label}</div>
                          <div style={{fontSize:7,color:T3}}>{gPct(s.value)} · {fCur(s.value)}</div>
                        </div>
                      </div>
                    ))}
                    {male&&female&&<div style={{fontSize:7,color:T3,marginTop:4,borderTop:`1px solid ${BD}`,paddingTop:4}}>♂ {fK(male.clicks||0)} clics<br/>♀ {fK(female.clicks||0)} clics</div>}
                  </div>
                </div>
              : <div style={{fontSize:9,color:T3}}>Sin datos</div>}
          </div>
          <div style={{width:1,background:BD}}/>
          <div style={{flex:1}}>
            <Lbl text="Dispositivo" color={color}/>
            {device.length>0
              ? <SvgHBars items={device.map(dv=>({label:(dv.impression_device||dv.device||'').replace(/_/g,' ').slice(0,13), value:parseFloat(dv.spend)||0, label2:fCur(dv.spend)}))} color={color} w={120} rowH={12} gap={3}/>
              : <div style={{fontSize:9,color:T3}}>Sin datos</div>}
            {plt.length>0&&(
              <>
                <div style={{height:1,background:BD,margin:'6px 0'}}/>
                <Lbl text="Plataforma" color={color}/>
                <SvgHBars items={plt.map(p=>({label:(p.platform||p.publisher_platform||'').slice(0,13), value:parseFloat(p.spend)||0, label2:fCur(p.spend)}))} color={color} w={120} rowH={12} gap={3}/>
              </>
            )}
          </div>
        </div>

        {/* BL: Countries */}
        <div style={{background:BG2,borderRadius:10,padding:'9px 11px',border:`1px solid ${BD}`}}>
          <Lbl text="Países — gasto por ubicación" color={color}/>
          {country.length>0
            ? <SvgHBars items={country.map(c=>({label:c.country||c.country_name||'—', value:parseFloat(c.spend)||0, label2:`${fCur(c.spend)} · ${fK(c.impressions||0)} impr.`}))} color={color} w={274} rowH={14} gap={4}/>
            : <div style={{fontSize:9,color:T3}}>Sin datos de países</div>}
        </div>

        {/* BR: Regions */}
        <div style={{background:BG2,borderRadius:10,padding:'9px 11px',border:`1px solid ${BD}`}}>
          <Lbl text="Regiones / Ciudades top" color={color}/>
          {region.length>0
            ? <SvgHBars items={region.map(r=>({label:r.region||r.city||'—', value:parseFloat(r.spend)||0, label2:`${fCur(r.spend)} · CTR ${fPct(r.ctr||0)}`}))} color={color} w={274} rowH={14} gap={4}/>
            : <div style={{fontSize:9,color:T3}}>Sin datos de regiones</div>}
        </div>
      </div>
    </Page>
  )
}

// ─────────────────────────────────────────────────────────────────────
// PAGE: HISTÓRICO MENSUAL
// ─────────────────────────────────────────────────────────────────────
function HistoricoPage({ color, accountName, historicoData }) {
  const data    = (historicoData?.monthly||[]).slice(-12)
  const months  = data.map(m=>(m.month||'').slice(5)||m.month||'')
  const spends  = data.map(m=>parseFloat(m.spend)||0)
  const results = data.map(m=>parseFloat(m.results)||0)
  const ctrs    = data.map(m=>parseFloat(m.ctr)||0)
  const cpms    = data.map(m=>parseFloat(m.cpm)||0)
  const cprs    = data.map(m=>parseFloat(m.cpr)||0)
  const hasRes  = results.some(v=>v>0)
  const hasCtr  = ctrs.some(v=>v>0)
  const totalSpend = spends.reduce((s,v)=>s+v,0)
  const totalRes   = results.reduce((s,v)=>s+v,0)
  const avgCtr     = hasCtr ? ctrs.filter(v=>v>0).reduce((s,v)=>s+v,0)/ctrs.filter(v=>v>0).length : 0
  const bestMonth  = data.reduce((best,m)=>n2(m.results)>n2(best?.results||0)?m:best, data[0])
  const worstMonth = data.filter(m=>n2(m.results)===0&&n2(m.spend)>0).sort((a,b)=>n2(b.spend)-n2(a.spend))[0]

  return (
    <Page color={color}>
      <PageHdr acct={accountName} title="Histórico Mensual" sub={`${data.length} meses analizados · gasto total ${fCur(totalSpend)}`} color={color} icon="📅"/>

      {data.length===0
        ? <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:T3,fontSize:11}}>No hay datos históricos disponibles para este período.</div>
        : (
          <div style={{display:'flex',gap:12,flex:1,minHeight:0}}>
            {/* Charts */}
            <div style={{flex:1,display:'flex',flexDirection:'column',gap:7}}>
              {/* Summary KPIs */}
              <div style={{display:'flex',gap:7}}>
                <div style={{flex:1,background:BG2,borderRadius:8,padding:'8px 10px',border:`1px solid ${BD}`,borderLeft:`3px solid ${color}`}}>
                  <div style={{fontSize:6,color:T3,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:2}}>Total invertido</div>
                  <div style={{fontSize:15,fontWeight:800,color:T1}}>{fCur(totalSpend)}</div>
                </div>
                <div style={{flex:1,background:BG2,borderRadius:8,padding:'8px 10px',border:`1px solid ${BD}`,borderLeft:`3px solid ${OK}`}}>
                  <div style={{fontSize:6,color:T3,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:2}}>Total resultados</div>
                  <div style={{fontSize:15,fontWeight:800,color:T1}}>{fNum(totalRes)}</div>
                </div>
                <div style={{flex:1,background:BG2,borderRadius:8,padding:'8px 10px',border:`1px solid ${BD}`,borderLeft:`3px solid ${WARN}`}}>
                  <div style={{fontSize:6,color:T3,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:2}}>CTR promedio</div>
                  <div style={{fontSize:15,fontWeight:800,color:T1}}>{hasCtr?fPct(avgCtr):'—'}</div>
                </div>
                {bestMonth&&<div style={{flex:2,background:`${OK}12`,borderRadius:8,padding:'8px 10px',border:`1px solid ${OK}30`}}>
                  <div style={{fontSize:6,color:OK,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:2}}>🏆 Mejor mes</div>
                  <div style={{fontSize:11,fontWeight:800,color:T1}}>{bestMonth.month} · {fNum(bestMonth.results)} res.</div>
                  <div style={{fontSize:7,color:T3}}>{fCur(bestMonth.spend)} · {fCur(bestMonth.cpr)} c/u</div>
                </div>}
              </div>

              <div style={{background:BG2,borderRadius:9,padding:'8px 10px',border:`1px solid ${BD}`}}>
                <div style={{fontSize:6.5,color:T3,fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:5}}>Gasto mensual</div>
                <SvgBars vals={spends} labels={months} color={color} w={390} h={68} showVals/>
              </div>
              {hasRes&&(
                <div style={{background:BG2,borderRadius:9,padding:'8px 10px',border:`1px solid ${BD}`}}>
                  <div style={{fontSize:6.5,color:T3,fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:5}}>Resultados por mes</div>
                  <SvgBars vals={results} labels={months} color={OK} w={390} h={55} showVals/>
                </div>
              )}
              {hasCtr&&(
                <div style={{background:BG2,borderRadius:9,padding:'8px 10px',border:`1px solid ${BD}`}}>
                  <div style={{fontSize:6.5,color:T3,fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:4}}>Tendencia CTR</div>
                  <SvgLine vals={ctrs} color={WARN} w={390} h={44} labels={months}/>
                </div>
              )}
            </div>

            {/* Table */}
            <div style={{width:380,flexShrink:0,display:'flex',flexDirection:'column',gap:6}}>
              <Lbl text="Tabla mes a mes — métricas completas" color={color}/>
              <DarkTable
                color={color}
                compact
                headers={['Mes','Gasto','Resultados','Costo/Res.','CTR','CPM','CPC','Impr.']}
                colWidths={['17%','14%','12%','13%','11%','11%','10%','12%']}
                rowBg={ri=>{
                  if(data[ri]===bestMonth) return `${OK}18`
                  if(data[ri]===worstMonth) return `${WARN}15`
                  return ri%2===0?BG2:BG3
                }}
                rows={data.map(m=>[
                  m.month||'—',
                  fCur(m.spend),
                  fNum(m.results),
                  fCur(m.cpr),
                  fPct(m.ctr),
                  fCur(m.cpm),
                  fCur(m.cpc),
                  fK(m.impressions),
                ])}
              />
              {historicoData?.bestByMonth&&Object.keys(historicoData.bestByMonth).length>0&&(
                <div style={{marginTop:6}}>
                  <Lbl text="Campaña ganadora por mes" color={color}/>
                  {Object.entries(historicoData.bestByMonth).slice(-6).map(([month,camp],i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'4px 7px',background:i%2===0?BG2:'transparent',borderRadius:4,marginBottom:2}}>
                      <span style={{fontSize:7.5,color:T2,fontWeight:600,flexShrink:0,marginRight:8}}>{month}</span>
                      <span style={{fontSize:7,color:T3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{trunc(camp?.name||camp||'—',40)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      }
    </Page>
  )
}

// ─────────────────────────────────────────────────────────────────────
// PAGE: PLAN DE ACCIÓN
// ─────────────────────────────────────────────────────────────────────
function AccionesPage({ color, accountName, overview, prevOverview, campaigns }) {
  const ov = overview||{}
  const { wins, warnings } = buildInsights(ov, prevOverview, campaigns)
  const actions = []
  const zeroCamps = (campaigns||[]).filter(c=>n2(c.results)===0&&n2(c.spend)>0.5)
  const topC = [...(campaigns||[])].filter(c=>n2(c.results)>0).sort((a,b)=>n2(b.results)-n2(a.results))[0]
  if(topC) actions.push({p:'Alta',icon:'📈',text:`Escalar 20–30% en "${trunc(topC.name,28)}" — mejor desempeño del período (${fNum(topC.results)} resultados)`})
  zeroCamps.slice(0,2).forEach(c=>actions.push({p:'Alta',icon:'⏸',text:`Pausar o revisar "${trunc(c.name,28)}" — gastó ${fCur(c.spend)} sin conversiones`}))
  if(n2(ov.ctr)<1&&n2(ov.ctr)>0) actions.push({p:'Alta',icon:'🎨',text:'CTR bajo — probar nuevos creativos: imágenes, videos, copies distintos'})
  if(n2(ov.frequency)>4) actions.push({p:'Alta',icon:'🔄',text:`Frecuencia ${fX(ov.frequency)} — rotar creativos o ampliar audiencia para reducir fatiga`})
  if(n2(ov.frequency)<2&&n2(ov.frequency)>0&&n2(ov.results)>0) actions.push({p:'Media',icon:'💡',text:'Frecuencia baja — hay margen para aumentar presupuesto sin saturar la audiencia'})
  if(prevOverview&&delta(ov.cpr, prevOverview.cpr)?.up) actions.push({p:'Media',icon:'⚙️',text:`Costo por resultado subió vs período anterior — revisar segmentación y puja`})
  if(n2(ov.hookRate)>0&&n2(ov.hookRate)<30) actions.push({p:'Media',icon:'▶',text:`Hook Rate ${fPct(ov.hookRate)} — los primeros 3 segundos no enganchan, reforzar apertura del video`})
  if(actions.length<3) actions.push({p:'Media',icon:'🧪',text:'Realizar test A/B con distintos formatos de creativos para identificar qué mensaje genera más resultados'})

  const PR = {Alta:{bg:'rgba(239,68,68,.08)',border:'rgba(239,68,68,.2)',text:BAD}, Media:{bg:'rgba(245,158,11,.07)',border:'rgba(245,158,11,.18)',text:WARN}, Baja:{bg:'rgba(16,185,129,.08)',border:'rgba(16,185,129,.18)',text:OK}}

  return (
    <Page color={color}>
      <PageHdr acct={accountName} title="Plan de Acción" sub="Recomendaciones concretas y priorizadas basadas en los datos" color={color} icon="⚡"/>

      <div style={{display:'flex',gap:14,flex:1,minHeight:0}}>
        {/* Actions */}
        <div style={{flex:3,display:'flex',flexDirection:'column',gap:7}}>
          {actions.slice(0,5).map((a,i)=>{
            const s = PR[a.p]||PR.Media
            return (
              <div key={i} style={{display:'flex',gap:10,padding:'10px 13px',background:s.bg,border:`1px solid ${s.border}`,borderRadius:9,alignItems:'flex-start'}}>
                <div style={{fontSize:16,lineHeight:1,flexShrink:0}}>{a.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:9.5,color:s.text=== BAD?'rgba(252,165,165,.9)':s.text===WARN?'rgba(253,230,138,.9)':'rgba(110,231,183,.9)',lineHeight:1.55}}>{a.text}</div>
                </div>
                <div style={{fontSize:7,fontWeight:800,color:s.text,background:`${s.border}`,padding:'2px 8px',borderRadius:10,letterSpacing:'.07em',flexShrink:0,border:`1px solid ${s.border}`}}>{a.p.toUpperCase()}</div>
              </div>
            )
          })}
        </div>

        <div style={{width:1,background:BD,flexShrink:0}}/>

        {/* Right: ROI summary + benchmarks */}
        <div style={{flex:2,display:'flex',flexDirection:'column',gap:8}}>
          <Lbl text="Resumen de inversión" color={color}/>
          <div style={{background:BG2,borderRadius:9,padding:'12px 14px',border:`1px solid ${BD}`}}>
            <div style={{fontSize:7,color:T3,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:4}}>Total invertido</div>
            <div style={{fontSize:22,fontWeight:800,color:T1,marginBottom:3}}>{fCur(ov.spend)}</div>
            {prevOverview&&<div style={{fontSize:8,color:T3,marginBottom:8}}>Ant: {fCur(prevOverview.spend)} <DeltaBadge curr={ov.spend} prev={prevOverview.spend} lowerIsBetter/></div>}
            <div style={{display:'flex',gap:8}}>
              <div style={{flex:1}}>
                <div style={{fontSize:6.5,color:T3,fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em'}}>Resultados</div>
                <div style={{fontSize:14,fontWeight:700,color:OK}}>{fNum(ov.results)}</div>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:6.5,color:T3,fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em'}}>Costo/Res.</div>
                <div style={{fontSize:14,fontWeight:700,color:T1}}>{fCur(ov.cpr)}</div>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:6.5,color:T3,fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em'}}>Alcance</div>
                <div style={{fontSize:14,fontWeight:700,color:T1}}>{fK(ov.reach)}</div>
              </div>
            </div>
          </div>
          <Lbl text="Tu cuenta vs benchmarks" color={color}/>
          {[
            {l:'CTR',        bench:'1–2%',  val:fPct(ov.ctr),   c:n2(ov.ctr)>=2?OK:n2(ov.ctr)>=1?WARN:BAD},
            {l:'Frecuencia', bench:'1–3×',  val:fX(ov.frequency), c:n2(ov.frequency)<=3?OK:n2(ov.frequency)<=4?WARN:BAD},
            {l:'CPM',        bench:'$10–50',val:fCur(ov.cpm),   c:T1},
            {l:'CPC',        bench:'$5–15', val:fCur(ov.cpc),   c:T1},
          ].map((b,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 8px',background:i%2===0?BG2:'transparent',borderRadius:5}}>
              <span style={{fontSize:8.5,color:T2,fontWeight:600}}>{b.l}</span>
              <div style={{display:'flex',gap:10,alignItems:'center'}}>
                <span style={{fontSize:7.5,color:T3}}>ref. {b.bench}</span>
                <span style={{fontSize:10,fontWeight:700,color:b.c}}>{b.val}</span>
              </div>
            </div>
          ))}
          {wins.length>0&&(
            <div style={{marginTop:4,background:`${OK}08`,borderRadius:8,padding:'8px 10px',border:`1px solid ${OK}20`}}>
              <div style={{fontSize:6,fontWeight:800,color:OK,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:4}}>✓ Puntos fuertes del período</div>
              {wins.slice(0,3).map((w,i)=><div key={i} style={{fontSize:7.5,color:'rgba(110,231,183,.75)',lineHeight:1.5,marginBottom:2,display:'flex',gap:3}}><span style={{color:OK,flexShrink:0}}>·</span>{w}</div>)}
            </div>
          )}
        </div>
      </div>
    </Page>
  )
}

// ─── Preset colors ──────────────────────────────────────────────────
const PRESET_COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6','#0ea5e9']

// ─────────────────────────────────────────────────────────────────────
// MAIN MODAL
// ─────────────────────────────────────────────────────────────────────
export default function PDFExportModal({
  isOpen, onClose,
  accountName, preset, platform,
  overview, prevOverview=null,
  campaigns=[], adsets=[], ads=[], daily=[],
  demographics=null, historicoData=null,
  userId, isPro,
}) {
  const [brandColor, setBrandColor] = useState('#6366f1')
  const [brandName,  setBrandName]  = useState('')
  const [logo,       setLogo]       = useState(null)
  const [exporting,  setExporting]  = useState(false)
  const pagesRef = useRef(null)

  function handleLogoUpload(e) {
    const file = e.target.files?.[0]; if(!file) return
    const reader = new FileReader()
    reader.onload = ev => setLogo(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleExport() {
    setExporting(true)
    try {
      if(!isPro) {
        const r = await fetch('/api/pdf/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId})})
        const d = await r.json()
        if(!d.allowed){ alert(d.error||'No puedes exportar PDF con tu plan actual.'); setExporting(false); return }
      }
      const { default: html2canvas } = await import('html2canvas')
      const { default: jsPDF }       = await import('jspdf')
      const pages = pagesRef.current?.querySelectorAll('.pdf-page')
      if(!pages?.length){ setExporting(false); return }
      const pdf = new jsPDF({ orientation:'landscape', unit:'pt', format:'a4' })
      const A4W = 841.89, A4H = 595.28
      for(let i=0;i<pages.length;i++){
        const canvas = await html2canvas(pages[i],{scale:2,backgroundColor:BG,useCORS:true,logging:false,allowTaint:false})
        const img    = canvas.toDataURL('image/jpeg',0.93)
        const ratio  = A4W/(canvas.width/2)
        const imgH   = (canvas.height/2)*ratio
        if(i>0) pdf.addPage()
        pdf.addImage(img,'JPEG',0,0,A4W,Math.min(imgH,A4H))
      }
      const safe=(accountName||'reporte').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]/g,'').trim().replace(/\s+/g,'-')
      pdf.save(`${safe}-${preset}-reporte.pdf`)
      onClose()
    } catch(e){
      console.error('PDF export error:',e)
      alert('Error al generar el PDF. Intenta de nuevo.')
    }
    setExporting(false)
  }

  if(!isOpen) return null

  const camChunks   = campaigns?.length ? chunk([...campaigns].sort((a,b)=>n2(b.spend)-n2(a.spend)), 12) : []
  const adsetChunks = adsets?.length    ? chunk([...adsets].sort((a,b)=>n2(b.spend)-n2(a.spend)),    12) : []
  const adChunks    = ads?.length       ? chunk([...ads].sort((a,b)=>n2(b.spend)-n2(a.spend)),       10) : []
  const hasDemo  = demographics&&((demographics.age||[]).length>0||(demographics.gender||[]).length>0)
  const hasHist  = historicoData&&(historicoData.monthly||[]).length>0
  const totalPages = 1+1+camChunks.length+adsetChunks.length+adChunks.length+(hasDemo?1:0)+(hasHist?1:0)+1

  return (
    <>
      {/* Modal */}
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.82)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
        <div style={{background:'#15151c',border:'1px solid rgba(255,255,255,.1)',borderRadius:16,padding:'26px 28px',width:490,maxWidth:'93vw',fontFamily:FONT}} onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:15,fontWeight:800,color:'#fff',marginBottom:2}}>Exportar Reporte PDF</div>
          <div style={{fontSize:10,color:'#555',marginBottom:20}}>Tema oscuro · Gráficas incluidas · Todas las métricas · Landscape A4</div>

          <div style={{marginBottom:13}}>
            <label style={{fontSize:10,color:'#888',fontWeight:600,display:'block',marginBottom:4}}>Nombre de marca / agencia</label>
            <input value={brandName} onChange={e=>setBrandName(e.target.value)} placeholder="Tu Agencia o Empresa"
              style={{width:'100%',padding:'8px 11px',borderRadius:8,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.04)',color:'#fff',fontSize:11,fontFamily:'inherit',boxSizing:'border-box',outline:'none'}}/>
          </div>

          <div style={{marginBottom:13}}>
            <label style={{fontSize:10,color:'#888',fontWeight:600,display:'block',marginBottom:6}}>Color de acento</label>
            <div style={{display:'flex',gap:7,alignItems:'center'}}>
              <input type="color" value={brandColor} onChange={e=>setBrandColor(e.target.value)} style={{width:34,height:30,borderRadius:6,border:'1px solid rgba(255,255,255,.1)',background:'transparent',cursor:'pointer',padding:2}}/>
              {PRESET_COLORS.map(c=><div key={c} onClick={()=>setBrandColor(c)} style={{width:22,height:22,borderRadius:5,background:c,cursor:'pointer',border:brandColor===c?'2.5px solid #fff':'2px solid transparent',transition:'border .1s',flexShrink:0}}/>)}
            </div>
          </div>

          <div style={{marginBottom:18}}>
            <label style={{fontSize:10,color:'#888',fontWeight:600,display:'block',marginBottom:5}}>Logo (opcional)</label>
            <label style={{display:'flex',alignItems:'center',gap:9,padding:'8px 13px',border:'1px dashed rgba(255,255,255,.12)',borderRadius:8,cursor:'pointer'}}>
              {logo
                ? <><img src={logo} alt="" style={{height:26,maxWidth:70,objectFit:'contain',borderRadius:3}}/><span style={{fontSize:10,color:'#6ee7b7'}}>✓ Logo cargado</span><span style={{fontSize:10,color:'#555',marginLeft:'auto'}} onClick={e=>{e.preventDefault();setLogo(null)}}>Quitar</span></>
                : <><span style={{fontSize:14}}>🖼</span><span style={{fontSize:10,color:'#555'}}>PNG, SVG o JPG</span></>
              }
              <input type="file" accept="image/*" onChange={handleLogoUpload} style={{display:'none'}}/>
            </label>
          </div>

          {/* Page preview */}
          <div style={{marginBottom:18,padding:'10px 13px',background:'rgba(255,255,255,.03)',borderRadius:8,fontSize:10,color:'#555',lineHeight:1.95,border:'1px solid rgba(255,255,255,.05)'}}>
            <div style={{color:'#888',fontWeight:700,marginBottom:3}}>Páginas incluidas:</div>
            <div>1. Portada + 6 KPIs{prevOverview?' con comparativa vs período anterior':''}</div>
            <div>2. Resumen completo + gráfica diaria + análisis + benchmarks</div>
            {camChunks.length>0&&<div>{2+1}–{2+camChunks.length}. Campañas ({campaigns.length}) — gráficas + tabla completa con impresiones, clics, alcance, frecuencia</div>}
            {adsetChunks.length>0&&<div>{2+camChunks.length+1}–{2+camChunks.length+adsetChunks.length}. Conjuntos de anuncios ({adsets.length})</div>}
            {adChunks.length>0&&<div>{2+camChunks.length+adsetChunks.length+1}–{2+camChunks.length+adsetChunks.length+adChunks.length}. Anuncios ({ads.length}) — tabla + métricas de video</div>}
            {hasDemo&&<div>{totalPages-1-(hasHist?1:0)}. Audiencias — edad, género, dispositivos, países, ciudades</div>}
            {hasHist&&<div>{totalPages-1}. Histórico mensual — gráficas + tabla mes a mes</div>}
            <div>{totalPages}. Plan de acción con recomendaciones priorizadas</div>
            <div style={{marginTop:3,color:'#3a3a4a',fontWeight:700}}>Total: {totalPages} páginas · A4 Landscape</div>
          </div>

          <div style={{display:'flex',gap:8}}>
            <button onClick={onClose} disabled={exporting} style={{flex:1,padding:'9px',borderRadius:8,border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:'#888',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
            <button onClick={handleExport} disabled={exporting} style={{flex:2,padding:'9px',borderRadius:8,border:'none',background:exporting?'rgba(99,102,241,.4)':brandColor,color:'#fff',fontSize:11,fontWeight:700,cursor:exporting?'default':'pointer',fontFamily:'inherit',transition:'background .2s'}}>
              {exporting?'⏳ Generando PDF…':'↓ Generar PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden pages */}
      <div ref={pagesRef} style={{position:'fixed',left:'-9999px',top:0,pointerEvents:'none'}}>
        <PortadaPage  color={brandColor} logo={logo} brandName={brandName} accountName={accountName} platform={platform||'meta_ads'} preset={preset} overview={overview} prevOverview={prevOverview}/>
        <ResumenPage  color={brandColor} accountName={accountName} overview={overview} prevOverview={prevOverview} campaigns={campaigns} daily={daily}/>
        {camChunks.map((ch,i)=><EntidadPage key={`cam-${i}`} color={brandColor} accountName={accountName} rows={ch} page={i+1} total={camChunks.length} totalAll={campaigns?.length??0} entity="Campañas" entitySub="ordenadas por gasto"/>)}
        {adsetChunks.map((ch,i)=><EntidadPage key={`ads-${i}`} color={brandColor} accountName={accountName} rows={ch} page={i+1} total={adsetChunks.length} totalAll={adsets?.length??0} entity="Conjuntos de anuncios" entitySub="Ad sets ordenados por gasto"/>)}
        {adChunks.map((ch,i)=><AnunciosPage key={`ad-${i}`} color={brandColor} accountName={accountName} ads={ch} page={i+1} total={adChunks.length} totalAll={ads?.length??0}/>)}
        {hasDemo&&<AudienciasPage color={brandColor} accountName={accountName} demographics={demographics}/>}
        {hasHist&&<HistoricoPage  color={brandColor} accountName={accountName} historicoData={historicoData}/>}
        <AccionesPage color={brandColor} accountName={accountName} overview={overview} prevOverview={prevOverview} campaigns={campaigns}/>
      </div>
    </>
  )
}
