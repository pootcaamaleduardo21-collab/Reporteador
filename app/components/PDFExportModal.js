'use client'
import { useState, useRef } from 'react'

// ─── Constants ─────────────────────────────────────────────────────
const PW   = 1123
const PH   = 794
const FONT = '"Plus Jakarta Sans","Helvetica Neue",Arial,sans-serif'
const BG   = '#0b0b10'
const BG2  = '#12121a'
const BD   = 'rgba(255,255,255,.07)'
const T1   = '#ffffff'
const T2   = 'rgba(255,255,255,.60)'
const T3   = 'rgba(255,255,255,.30)'
const OK   = '#10b981'
const WARN = '#f59e0b'
const BAD  = '#ef4444'
const C_PAL = ['#6366f1','#10b981','#f59e0b','#ef4444','#ec4899','#3b82f6','#8b5cf6','#0ea5e9','#14b8a6','#f97316']

// ─── Helpers ───────────────────────────────────────────────────────
const fCur = n => (n==null||isNaN(+n)||+n===0)?'—':'$'+Number(n).toLocaleString('es-MX',{minimumFractionDigits:0,maximumFractionDigits:0})
const fPct = n => (n==null||isNaN(+n))?'—':Number(n).toFixed(2)+'%'
const fNum = n => (n==null||isNaN(+n))?'—':Number(n).toLocaleString('es-MX',{maximumFractionDigits:0})
const fK   = n => { if(n==null||isNaN(+n)||+n===0)return '—'; const a=Math.abs(+n); if(a>=1e6)return(+n/1e6).toFixed(1)+'M'; if(a>=1e3)return(+n/1e3).toFixed(1)+'k'; return fNum(n) }
const trunc = (s,n) => (s||'').length>n?(s||'').slice(0,n-1)+'…':(s||'—')
const chunk = (arr,n) => Array.from({length:Math.ceil(arr.length/n)},(_,i)=>arr.slice(i*n,i*n+n))
const PERIOD = {this_month:'Este mes',last_month:'Mes pasado',last_7d:'Últimos 7 días',last_30d:'Últimos 30 días',today:'Hoy',yesterday:'Ayer'}
const PLT    = {meta_ads:'Meta Ads',google_ads:'Google Ads',tiktok_ads:'TikTok Ads'}

// ─── Auto-insights ─────────────────────────────────────────────────
function buildInsights(overview, campaigns) {
  const wins=[], warnings=[]
  const ov=overview||{}
  if((ov.ctr??0)>=2)     wins.push(`CTR de ${fPct(ov.ctr)} — supera el promedio de la industria (1–2%)`)
  else if((ov.ctr??0)>0&&ov.ctr<1) warnings.push(`CTR de ${fPct(ov.ctr)} — por debajo del promedio; revisar creativos y segmentación`)
  if((ov.frequency??0)>4)        warnings.push(`Frecuencia ${Number(ov.frequency).toFixed(1)}x — posible fatiga de audiencia, rotar creativos`)
  else if((ov.frequency??0)>0&&ov.frequency<2) wins.push(`Frecuencia ${Number(ov.frequency).toFixed(1)}x — audiencia fresca, margen para escalar presupuesto`)
  const zeroCamps=(campaigns||[]).filter(c=>(c.results??0)===0&&(c.spend??0)>0.5)
  zeroCamps.slice(0,2).forEach(c=>warnings.push(`"${trunc(c.name||'Campaña',28)}" — presupuesto activo sin conversiones registradas`))
  const topC=[...(campaigns||[])].filter(c=>(c.results??0)>0).sort((a,b)=>(b.results??0)-(a.results??0))[0]
  if(topC) wins.push(`Campaña líder: "${trunc(topC.name||'',28)}" con ${fNum(topC.results)} resultados`)
  if((ov.results??0)===0&&(ov.spend??0)>0) warnings.push('Sin conversiones registradas — verificar píxel y eventos de seguimiento')
  if((ov.shares??0)>200) wins.push(`${fK(ov.shares)} compartidos — contenido genera distribución orgánica adicional`)
  return { wins:wins.slice(0,4), warnings:warnings.slice(0,4) }
}

// ─── SVG Charts ────────────────────────────────────────────────────
// Line/Area chart (no gradient — reliable with html2canvas)
function SvgLine({ vals, color='#6366f1', w=260, h=60, labels=null }) {
  if(!vals||vals.length<2) return <div style={{width:w,height:h}}/>
  const vs=vals.map(v=>+v||0)
  const max=Math.max(...vs)||1
  const pL=2,pR=2,pT=8,pB=labels?16:4
  const W=w-pL-pR, H=h-pT-pB
  const px=i=>+(pL+(i/(vs.length-1))*W).toFixed(1)
  const py=v=>+(pT+H-(v/max)*H).toFixed(1)
  const pts=vs.map((v,i)=>`${px(i)},${py(v)}`).join(' ')
  const area=`M ${px(0)},${py(vs[0])} `+vs.map((v,i)=>`L ${px(i)},${py(v)}`).join(' ')+` L ${px(vs.length-1)},${pT+H} L ${px(0)},${pT+H} Z`
  const labelIdxs = labels ? [0, Math.floor(labels.length/2), labels.length-1] : []
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:'block'}}>
      <path d={area} fill={color} opacity="0.12"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={px(vs.length-1)} cy={py(vs[vs.length-1])} r="2.5" fill={color}/>
      {labels && labelIdxs.map(i=>(
        <text key={i} x={px(i)} y={h-2} fontSize="6.5" fill={T3} textAnchor={i===0?'start':i===labels.length-1?'end':'middle'} fontFamily={FONT}>{labels[i]}</text>
      ))}
    </svg>
  )
}

// Dual line chart (two series)
function SvgDualLine({ vals1, vals2, color1='#6366f1', color2='#10b981', w=260, h=70, labels=null }) {
  const all=[...(vals1||[]),...(vals2||[])].map(v=>+v||0)
  if(all.length<2) return <div style={{width:w,height:h}}/>
  const max=Math.max(...all)||1
  const pL=2,pR=2,pT=8,pB=labels?16:4
  const W=w-pL-pR, H=h-pT-pB
  const len=Math.max((vals1||[]).length,(vals2||[]).length)||1
  const px=i=>+(pL+(i/(len-1))*W).toFixed(1)
  const py=(v,mx)=>+(pT+H-(+v/mx)*H).toFixed(1)
  const line=(vals,color,mx)=>{
    if(!vals||vals.length<2) return null
    const vs=vals.map(v=>+v||0)
    const pts=vs.map((v,i)=>`${px(i)},${py(v,mx)}`).join(' ')
    const area=`M ${px(0)},${py(vs[0],mx)} `+vs.map((v,i)=>`L ${px(i)},${py(v,mx)}`).join(' ')+` L ${px(vs.length-1)},${pT+H} L ${px(0)},${pT+H} Z`
    return (<g key={color}><path d={area} fill={color} opacity="0.08"/><polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx={px(vs.length-1)} cy={py(vs[vs.length-1],mx)} r="2" fill={color}/></g>)
  }
  const labelIdxs = labels ? [0, Math.floor(labels.length/2), labels.length-1] : []
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:'block'}}>
      {line(vals1,color1,max)}
      {line(vals2,color2,max)}
      {labels && labelIdxs.map(i=>(
        <text key={i} x={px(i)} y={h-2} fontSize="6.5" fill={T3} textAnchor={i===0?'start':i===labels.length-1?'end':'middle'} fontFamily={FONT}>{labels[i]}</text>
      ))}
    </svg>
  )
}

// Vertical bars
function SvgBars({ vals, labels, color='#6366f1', w=260, h=70 }) {
  if(!vals||vals.length===0) return <div style={{width:w,height:h}}/>
  const vs=vals.map(v=>+v||0)
  const max=Math.max(...vs)||1
  const n=vs.length
  const pB=labels?14:4, pT=4, pL=2, pR=2
  const W=w-pL-pR, H=h-pT-pB
  const step=W/n, bw=step*0.62
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display:'block'}}>
      {vs.map((v,i)=>{
        const bh=Math.max(1,(v/max)*H)
        const bx=+(pL+i*step+(step-bw)/2).toFixed(1)
        const by=+(pT+H-bh).toFixed(1)
        const iMax=v===max
        return (<g key={i}><rect x={bx} y={by} width={bw.toFixed(1)} height={bh.toFixed(1)} rx="2" fill={iMax?color:color+'55'}/>{labels&&<text x={(bx+bw/2).toFixed(1)} y={h-2} fontSize="6.5" fill={T3} textAnchor="middle" fontFamily={FONT}>{labels[i]}</text>}</g>)
      })}
    </svg>
  )
}

// Donut chart
function SvgDonut({ slices, size=80 }) {
  if(!slices||slices.length===0) return <div style={{width:size,height:size}}/>
  const total=slices.reduce((s,x)=>s+(+x.value||0),0)||1
  const cx=size/2, cy=size/2, R=size/2-4, ri=R*0.54
  let ang=-Math.PI/2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{display:'block'}}>
      {slices.map((s,i)=>{
        const a=(+s.value/total)*Math.PI*2
        if(a<=0.001) return null
        const x1=+(cx+R*Math.cos(ang)).toFixed(2), y1=+(cy+R*Math.sin(ang)).toFixed(2)
        const x2=+(cx+R*Math.cos(ang+a)).toFixed(2), y2=+(cy+R*Math.sin(ang+a)).toFixed(2)
        const xi1=+(cx+ri*Math.cos(ang)).toFixed(2), yi1=+(cy+ri*Math.sin(ang)).toFixed(2)
        const xi2=+(cx+ri*Math.cos(ang+a)).toFixed(2), yi2=+(cy+ri*Math.sin(ang+a)).toFixed(2)
        const lg=a>Math.PI?1:0
        const d=`M ${xi1},${yi1} L ${x1},${y1} A ${R},${R} 0 ${lg},1 ${x2},${y2} L ${xi2},${yi2} A ${ri},${ri} 0 ${lg},0 ${xi1},${yi1} Z`
        ang+=a
        return <path key={i} d={d} fill={s.color}/>
      })}
      <circle cx={cx} cy={cy} r={ri} fill={BG2}/>
    </svg>
  )
}

// Horizontal bar list
function SvgHBars({ items, color='#6366f1', w=280, rowH=15, gap=5 }) {
  if(!items||items.length===0) return null
  const maxV=Math.max(...items.map(x=>+x.value||0))||1
  const LW=82, VW=44, BAR=w-LW-VW-6
  const totalH=items.length*(rowH+gap)-gap
  return (
    <svg width={w} height={totalH} viewBox={`0 0 ${w} ${totalH}`} style={{display:'block'}}>
      {items.map((item,i)=>{
        const y=i*(rowH+gap)
        const bw=Math.max(2,((+item.value||0)/maxV)*BAR)
        return (
          <g key={i}>
            <text x={0} y={y+rowH-3} fontSize="8" fill={T2} fontFamily={FONT}>{trunc(item.label||'',12)}</text>
            <rect x={LW} y={y+1} width={BAR} height={rowH-2} rx="2" fill="rgba(255,255,255,.04)"/>
            <rect x={LW} y={y+1} width={bw.toFixed(1)} height={rowH-2} rx="2" fill={i===0?color:color+'66'}/>
            {item.label2&&<text x={LW+BAR+5} y={y+rowH-3} fontSize="7.5" fill={T3} fontFamily={FONT}>{item.label2}</text>}
          </g>
        )
      })}
    </svg>
  )
}

// ─── Page shell ────────────────────────────────────────────────────
function Page({ children, color }) {
  return (
    <div className="pdf-page" style={{width:PW,height:PH,background:BG,overflow:'hidden',position:'relative',fontFamily:FONT,boxSizing:'border-box',display:'flex',flexDirection:'column'}}>
      <div style={{height:4,background:color,flexShrink:0}}/>
      <div style={{flex:1,padding:'16px 34px 14px',overflow:'hidden',display:'flex',flexDirection:'column'}}>
        {children}
      </div>
    </div>
  )
}

function PageHdr({ acct, title, sub, color, page, total }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:11,flexShrink:0,paddingBottom:9,borderBottom:`1px solid ${BD}`}}>
      <div>
        <div style={{fontSize:7,color:T3,letterSpacing:'.12em',textTransform:'uppercase',marginBottom:2,fontWeight:700}}>{acct}</div>
        <div style={{fontSize:16,fontWeight:800,color:T1,lineHeight:1}}>{title}</div>
        {sub&&<div style={{fontSize:8.5,color:T3,marginTop:2}}>{sub}</div>}
      </div>
      {total>1&&<div style={{fontSize:8.5,color:T3,fontFamily:'monospace'}}>p. {page} / {total}</div>}
    </div>
  )
}

function SecLbl({ text, color }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:6,flexShrink:0}}>
      <div style={{width:3,height:9,background:color,borderRadius:2,flexShrink:0}}/>
      <span style={{fontSize:7,fontWeight:800,color:T3,letterSpacing:'.1em',textTransform:'uppercase'}}>{text}</span>
    </div>
  )
}

function KPIBox({ label, value, note, color, flex=1 }) {
  return (
    <div style={{flex,background:BG2,borderRadius:9,padding:'10px 12px',borderLeft:`3px solid ${color}`,minWidth:0,border:`1px solid ${BD}`,borderLeft:`3px solid ${color}`}}>
      <div style={{fontSize:6.5,color:T3,fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:4}}>{label}</div>
      <div style={{fontSize:20,fontWeight:800,color:T1,lineHeight:1}}>{value}</div>
      {note&&<div style={{fontSize:7,color:T3,marginTop:3}}>{note}</div>}
    </div>
  )
}

function SmallMetric({ label, value }) {
  return (
    <div style={{background:BG2,borderRadius:7,padding:'8px 10px',border:`1px solid ${BD}`,flex:1,minWidth:0}}>
      <div style={{fontSize:6.5,color:T3,fontWeight:800,letterSpacing:'.09em',textTransform:'uppercase',marginBottom:3}}>{label}</div>
      <div style={{fontSize:13,fontWeight:700,color:T1}}>{value}</div>
    </div>
  )
}

function DarkTable({ headers, rows, color, colWidths, rowBg }) {
  return (
    <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed',fontSize:9}}>
      <colgroup>{(colWidths||headers.map((_,i)=>i===0?'32%':`${68/(headers.length-1)}%`)).map((w,i)=><col key={i} style={{width:w}}/>)}</colgroup>
      <thead>
        <tr>{headers.map((h,i)=><th key={i} style={{padding:'6px 8px',textAlign:i===0?'left':'right',background:color,color:'#fff',fontWeight:700,fontSize:7,letterSpacing:'.07em',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row,ri)=>{
          const bg=rowBg?rowBg(ri):(ri%2===0?BG2:'#0e0e16')
          return <tr key={ri} style={{background:bg}}>{row.map((cell,ci)=><td key={ci} style={{padding:'6px 8px',textAlign:ci===0?'left':'right',color:ci===0?T1:T2,fontWeight:ci===0?600:400,fontSize:ci===0?8.5:8,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',borderBottom:`1px solid ${BD}`}}>{cell}</td>)}</tr>
        })}
      </tbody>
    </table>
  )
}

// ─── Page 1: Portada ───────────────────────────────────────────────
function PortadaPage({ color, logo, brandName, accountName, platform, preset, overview }) {
  const plt   = PLT[platform||'meta_ads']||'Meta Ads'
  const today = new Date().toLocaleDateString('es-MX',{year:'numeric',month:'long',day:'numeric'})
  const ov    = overview||{}
  const kpis  = [{l:'Gasto',v:fCur(ov.spend)},{l:'Resultados',v:fK(ov.results)},{l:'Costo/Res.',v:fCur(ov.cpr)},{l:'CTR',v:fPct(ov.ctr)}]
  return (
    <div className="pdf-page" style={{width:PW,height:PH,background:BG,overflow:'hidden',fontFamily:FONT,boxSizing:'border-box',display:'flex'}}>
      {/* Left — colored hero */}
      <div style={{width:370,background:color,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'40px 44px',flexShrink:0,position:'relative'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle at 1px 1px,rgba(255,255,255,.06) 1px,transparent 0)',backgroundSize:'20px 20px'}}/>
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:120,background:'rgba(0,0,0,.15)'}}/>
        {logo
          ? <img src={logo} alt="" style={{maxHeight:60,maxWidth:150,objectFit:'contain',marginBottom:20,position:'relative'}} crossOrigin="anonymous"/>
          : <div style={{width:46,height:46,borderRadius:12,background:'rgba(255,255,255,.2)',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>
            </div>
        }
        {brandName&&<div style={{fontSize:8.5,color:'rgba(255,255,255,.75)',fontWeight:700,marginBottom:6,letterSpacing:'.08em',textTransform:'uppercase',textAlign:'center',position:'relative'}}>{brandName}</div>}
        <div style={{fontSize:22,fontWeight:800,color:'#fff',textAlign:'center',lineHeight:1.3,marginBottom:14,maxWidth:268,position:'relative'}}>{accountName}</div>
        <div style={{background:'rgba(255,255,255,.18)',borderRadius:20,padding:'4px 14px',fontSize:9,fontWeight:700,color:'#fff',letterSpacing:'.04em',position:'relative'}}>{plt}</div>
        <div style={{position:'absolute',bottom:20,fontSize:8,color:'rgba(255,255,255,.35)',letterSpacing:'.04em'}}>Generado con Kaan</div>
      </div>
      {/* Right — dark panel */}
      <div style={{flex:1,padding:'36px 42px',display:'flex',flexDirection:'column',justifyContent:'space-between',background:BG}}>
        <div>
          <div style={{fontSize:7,color:T3,fontWeight:800,letterSpacing:'.14em',textTransform:'uppercase',marginBottom:5}}>Período del reporte</div>
          <div style={{fontSize:28,fontWeight:800,color:T1,marginBottom:4,lineHeight:1}}>{PERIOD[preset]||preset}</div>
          <div style={{fontSize:10,color:T2,marginBottom:24}}>{today}</div>
          {(ov.spend??0)>0&&(
            <>
              <div style={{fontSize:7,color:T3,fontWeight:800,letterSpacing:'.12em',textTransform:'uppercase',marginBottom:9}}>Métricas del período</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {kpis.map((k,i)=>(
                  <div key={i} style={{background:BG2,borderRadius:10,padding:'12px 14px',border:`1px solid ${BD}`,borderLeft:`3px solid ${color}`}}>
                    <div style={{fontSize:6.5,color:T3,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:4}}>{k.l}</div>
                    <div style={{fontSize:19,fontWeight:800,color:T1}}>{k.v}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',gap:6}}>
            <div style={{padding:'3px 10px',borderRadius:20,border:`1px solid ${color}35`,background:`${color}12`,fontSize:8,fontWeight:700,color:T2}}>{plt}</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:8,color:T3}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:color}}/>
            Kaan Analytics
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page 2: Resumen ───────────────────────────────────────────────
function ResumenPage({ color, accountName, overview, campaigns, daily }) {
  if(!overview) return null
  const ov = overview||{}
  const freq = (ov.frequency??0)>0 ? `${Number(ov.frequency).toFixed(1)}×` : '—'
  const { wins, warnings } = buildInsights(ov, campaigns)
  const hasEng = (ov.reactions??0)+(ov.comments??0)+(ov.shares??0) > 0
  const dailyNums  = (daily||[]).map(d=>parseFloat(d.spend)||0)
  const resultNums = (daily||[]).map(d=>parseFloat(d.results)||0)
  const dateLabels = (daily||[]).map(d=>(d.date_start||d.date||'').slice(5))
  const hasDailyChart = dailyNums.length > 2

  return (
    <Page color={color}>
      <PageHdr acct={accountName} title="Resumen de Rendimiento" color={color}/>

      {/* KPI row */}
      <div style={{display:'flex',gap:8,marginBottom:10,flexShrink:0}}>
        <KPIBox label="Gasto Total"     value={fCur(ov.spend)}  note="invertido en el período"   color={color}/>
        <KPIBox label="Resultados"      value={fK(ov.results)}  note="conversiones / acciones"   color={color}/>
        <KPIBox label="Costo/Resultado" value={fCur(ov.cpr)}    note="por resultado obtenido"    color={color}/>
        <KPIBox label="Alcance"         value={fK(ov.reach)}    note="personas únicas"           color={color}/>
        <KPIBox label="CTR"             value={fPct(ov.ctr)}    note={(ov.ctr??0)>=2?'↑ sobre el promedio':(ov.ctr??0)>=1?'en el promedio':'↓ bajo el promedio'} color={(ov.ctr??0)>=2?OK:(ov.ctr??0)>=1?WARN:BAD}/>
        <KPIBox label="CPM"             value={fCur(ov.cpm)}    note="por mil impresiones"       color={color}/>
      </div>

      {/* Body — 2 columns */}
      <div style={{display:'flex',gap:14,flex:1,minHeight:0}}>
        {/* Left col */}
        <div style={{flex:1.2,display:'flex',flexDirection:'column',gap:9}}>
          {/* Secondary metrics */}
          <div>
            <SecLbl text="Rendimiento detallado" color={color}/>
            <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
              <SmallMetric label="CPC"         value={fCur(ov.cpc)}/>
              <SmallMetric label="Impresiones" value={fK(ov.impressions)}/>
              <SmallMetric label="Clics"       value={fK(ov.clicks)}/>
              <SmallMetric label="Frecuencia"  value={freq}/>
              {(ov.hookRate??0)>0&&<SmallMetric label="Hook Rate" value={fPct(ov.hookRate)}/>}
            </div>
          </div>
          {hasEng&&(
            <div>
              <SecLbl text="Interacciones orgánicas" color={color}/>
              <div style={{display:'flex',gap:7}}>
                <SmallMetric label="Reacciones"  value={fK(ov.reactions)}/>
                <SmallMetric label="Comentarios" value={fK(ov.comments)}/>
                <SmallMetric label="Guardados"   value={fK(ov.saves)}/>
                <SmallMetric label="Compartidos" value={fK(ov.shares)}/>
              </div>
            </div>
          )}
          {hasDailyChart&&(
            <div style={{flex:1}}>
              <SecLbl text="Tendencia diaria del período" color={color}/>
              <div style={{background:BG2,borderRadius:10,padding:'10px 12px',border:`1px solid ${BD}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <div style={{display:'flex',gap:12,alignItems:'center'}}>
                    <div style={{display:'flex',alignItems:'center',gap:4}}>
                      <div style={{width:8,height:2,background:color,borderRadius:1}}/>
                      <span style={{fontSize:7,color:T3}}>Gasto</span>
                    </div>
                    {resultNums.some(v=>v>0)&&(
                      <div style={{display:'flex',alignItems:'center',gap:4}}>
                        <div style={{width:8,height:2,background:OK,borderRadius:1}}/>
                        <span style={{fontSize:7,color:T3}}>Resultados</span>
                      </div>
                    )}
                  </div>
                </div>
                <SvgDualLine vals1={dailyNums} vals2={resultNums.some(v=>v>0)?resultNums:null} color1={color} color2={OK} w={320} h={70} labels={dateLabels}/>
              </div>
            </div>
          )}
        </div>

        {/* Vertical divider */}
        <div style={{width:1,background:BD,flexShrink:0}}/>

        {/* Right col — insights */}
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:9}}>
          <SecLbl text="Análisis del período" color={color}/>
          {wins.length>0&&(
            <div style={{background:'rgba(16,185,129,.08)',borderRadius:9,padding:'10px 12px',border:'1px solid rgba(16,185,129,.2)'}}>
              <div style={{fontSize:7,fontWeight:800,color:OK,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:6}}>✓ Lo que funcionó</div>
              {wins.map((w,i)=><div key={i} style={{fontSize:9,color:'rgba(110,231,183,.85)',lineHeight:1.55,marginBottom:3,display:'flex',gap:5}}><span style={{flexShrink:0,color:OK}}>·</span><span>{w}</span></div>)}
            </div>
          )}
          {warnings.length>0&&(
            <div style={{background:'rgba(245,158,11,.07)',borderRadius:9,padding:'10px 12px',border:'1px solid rgba(245,158,11,.2)'}}>
              <div style={{fontSize:7,fontWeight:800,color:WARN,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:6}}>⚠ Puntos de atención</div>
              {warnings.map((w,i)=><div key={i} style={{fontSize:9,color:'rgba(253,230,138,.8)',lineHeight:1.55,marginBottom:3,display:'flex',gap:5}}><span style={{flexShrink:0,color:WARN}}>·</span><span>{w}</span></div>)}
            </div>
          )}
          {wins.length===0&&warnings.length===0&&(
            <div style={{background:BG2,borderRadius:9,padding:'10px 12px',border:`1px solid ${BD}`,fontSize:9,color:T3}}>Sin datos suficientes para generar análisis automático.</div>
          )}
          {/* Benchmark quick table */}
          <div style={{marginTop:'auto'}}>
            <SecLbl text="Tu cuenta vs. benchmarks" color={color}/>
            {[
              {l:'CTR',  bench:'1–2%',  val:fPct(ov.ctr), ok:(ov.ctr??0)>=2, warn:(ov.ctr??0)>=1},
              {l:'Frec.',bench:'1–3x',  val:freq,          ok:(ov.frequency??0)>0&&ov.frequency<=3, warn:(ov.frequency??0)>0&&ov.frequency<=4},
              {l:'CPM',  bench:'—',     val:fCur(ov.cpm), ok:null},
              {l:'CPC',  bench:'—',     val:fCur(ov.cpc), ok:null},
            ].map((b,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 8px',background:i%2===0?BG2:'transparent',borderRadius:5,marginBottom:2}}>
                <span style={{fontSize:8.5,color:T2,fontWeight:600}}>{b.l}</span>
                <div style={{display:'flex',gap:10,alignItems:'center'}}>
                  <span style={{fontSize:7.5,color:T3}}>ref. {b.bench}</span>
                  <span style={{fontSize:9.5,fontWeight:700,color:b.ok===null?T1:b.ok?OK:b.warn?WARN:BAD}}>{b.val}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Page>
  )
}

// ─── Page 3+: Campañas ─────────────────────────────────────────────
function CampanasPageComp({ color, accountName, campaigns, page, total, totalAll, entity='Campañas', entitySub='ordenadas por gasto' }) {
  const sorted = [...campaigns].sort((a,b)=>(b.spend??0)-(a.spend??0))
  const totalSpend = sorted.reduce((s,c)=>s+(c.spend??0),0)||1
  const topIdx = sorted.findIndex(c=>(c.results??0)===Math.max(...sorted.map(x=>x.results??0))&&(c.results??0)>0)
  const topN = sorted.slice(0,8)
  const showChart = topN.length >= 2

  return (
    <Page color={color}>
      <PageHdr acct={accountName} title={entity} sub={`${totalAll} ${entity.toLowerCase()} · ${entitySub}`} color={color} page={page} total={total}/>

      <div style={{display:'flex',gap:14,flex:1,minHeight:0}}>
        {/* Left: chart */}
        {showChart&&(
          <div style={{width:240,flexShrink:0,display:'flex',flexDirection:'column'}}>
            <SecLbl text="Distribución de gasto" color={color}/>
            <div style={{background:BG2,borderRadius:10,padding:'10px 12px',border:`1px solid ${BD}`,flex:1,display:'flex',flexDirection:'column',justifyContent:'center'}}>
              <SvgHBars
                items={topN.map(c=>({label:trunc(c.name||'Sin nombre',13), value:c.spend||0, label2:fCur(c.spend)}))}
                color={color} w={214} rowH={15} gap={4}
              />
              <div style={{marginTop:10}}>
                <SecLbl text="CTR por campaña" color={color}/>
                <SvgBars
                  vals={topN.map(c=>+(c.ctr||0))}
                  labels={topN.map(c=>trunc(c.name||'',5))}
                  color={color} w={214} h={55}
                />
              </div>
            </div>
          </div>
        )}

        {/* Right: table */}
        <div style={{flex:1,overflow:'hidden'}}>
          <SecLbl text="Detalle completo" color={color}/>
          <div style={{display:'flex',gap:6,marginBottom:6,fontSize:7.5,color:T3,flexShrink:0}}>
            {topIdx>=0&&<div style={{display:'flex',alignItems:'center',gap:3}}><div style={{width:7,height:7,borderRadius:2,background:OK+'30',border:`1px solid ${OK}50`}}/><span>★ Mejor desempeño</span></div>}
            <div style={{display:'flex',alignItems:'center',gap:3}}><div style={{width:7,height:7,borderRadius:2,background:WARN+'30',border:`1px solid ${WARN}50`}}/><span>Sin conversiones — revisar</span></div>
          </div>
          <DarkTable
            color={color}
            headers={['Campaña','% Pres.','Gasto','Resultados','Costo/Res.','CTR','CPM','CPC']}
            colWidths={['32%','8%','11%','10%','11%','9%','9%','10%']}
            rowBg={ri=>{
              if(ri===topIdx) return `${OK}18`
              if((sorted[ri]?.results??0)===0&&(sorted[ri]?.spend??0)>0.5) return `${WARN}15`
              return ri%2===0?BG2:'#0e0e16'
            }}
            rows={sorted.map((c,i)=>{
              const pct=`${((c.spend??0)/totalSpend*100).toFixed(0)}%`
              const nm=(i===topIdx?'★ ':'')+trunc(c.name||'Sin nombre',40)
              return [nm,pct,fCur(c.spend),fNum(c.results),fCur(c.cpr),fPct(c.ctr),fCur(c.cpm),fCur(c.cpc)]
            })}
          />
        </div>
      </div>
    </Page>
  )
}

// ─── Page: Anuncios ────────────────────────────────────────────────
function AnunciosPageComp({ color, accountName, ads, page, total, totalAll }) {
  const sorted = [...ads].sort((a,b)=>(b.spend??0)-(a.spend??0))
  const winners = [...ads].filter(a=>(a.results??0)>0).sort((a,b)=>(b.results??0)-(a.results??0))
  const losers  = [...ads].filter(a=>(a.results??0)===0&&(a.spend??0)>0).sort((a,b)=>(b.spend??0)-(a.spend??0))
  const topAd   = winners[0]
  const worstAd = losers[0]
  const hasCTR  = ads.some(a=>(a.ctr??0)>0)

  return (
    <Page color={color}>
      <PageHdr acct={accountName} title="Anuncios" sub={`${totalAll} anuncio${totalAll!==1?'s':''} · ordenados por gasto`} color={color} page={page} total={total}/>

      <div style={{display:'flex',gap:14,flex:1,minHeight:0}}>
        {/* Left: winner/loser cards + CTR chart */}
        <div style={{width:230,flexShrink:0,display:'flex',flexDirection:'column',gap:8}}>
          {topAd&&(
            <div style={{background:`${OK}12`,borderRadius:9,padding:'9px 11px',border:`1px solid ${OK}30`}}>
              <div style={{fontSize:7,fontWeight:800,color:OK,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:4}}>🏆 Top performer</div>
              <div style={{fontSize:9,fontWeight:700,color:T1,marginBottom:2}}>{trunc(topAd.name||'Sin nombre',30)}</div>
              <div style={{fontSize:8,color:T2}}>{fNum(topAd.results)} resultados · {fCur(topAd.cpr)} c/u</div>
              <div style={{fontSize:7.5,color:T3}}>CTR {fPct(topAd.ctr)} · Gasto {fCur(topAd.spend)}</div>
            </div>
          )}
          {worstAd&&(
            <div style={{background:`${BAD}10`,borderRadius:9,padding:'9px 11px',border:`1px solid ${BAD}25`}}>
              <div style={{fontSize:7,fontWeight:800,color:BAD,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:4}}>⚠ Sin conversiones</div>
              <div style={{fontSize:9,fontWeight:700,color:T1,marginBottom:2}}>{trunc(worstAd.name||'Sin nombre',30)}</div>
              <div style={{fontSize:8,color:T2}}>Gastó {fCur(worstAd.spend)} sin resultados</div>
              <div style={{fontSize:7.5,color:T3}}>Recomendación: pausar o revisar</div>
            </div>
          )}
          {hasCTR&&(
            <div style={{flex:1}}>
              <SecLbl text="CTR — top anuncios" color={color}/>
              <div style={{background:BG2,borderRadius:9,padding:'8px 10px',border:`1px solid ${BD}`}}>
                <SvgHBars
                  items={sorted.slice(0,7).map(a=>({label:trunc(a.name||'Sin nombre',11), value:+(a.ctr||0), label2:fPct(a.ctr)}))}
                  color={color} w={208} rowH={14} gap={4}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: table */}
        <div style={{flex:1,overflow:'hidden'}}>
          <SecLbl text="Detalle de anuncios" color={color}/>
          <DarkTable
            color={color}
            headers={['Anuncio','Campaña','Estado','Gasto','Resultados','CTR','Costo/Res.','CPM']}
            colWidths={['26%','22%','8%','10%','9%','8%','9%','8%']}
            rowBg={ri=>{
              if((sorted[ri]?.results??0)>0&&ri===0) return `${OK}18`
              if((sorted[ri]?.results??0)===0&&(sorted[ri]?.spend??0)>0.5) return `${WARN}15`
              return ri%2===0?BG2:'#0e0e16'
            }}
            rows={sorted.map(a=>[
              trunc(a.name||'Sin nombre',30),
              trunc(a.campaign||'—',22),
              a.status==='ACTIVE'?'Activo':a.status==='PAUSED'?'Pausado':(a.status||'—'),
              fCur(a.spend),fNum(a.results),fPct(a.ctr),fCur(a.cpr),fCur(a.cpm),
            ])}
          />
        </div>
      </div>
    </Page>
  )
}

// ─── Page: Audiencias ──────────────────────────────────────────────
function AudienciasPage({ color, accountName, demographics }) {
  const d = demographics||{}
  const age     = (d.age||[]).slice(0,8)
  const gender  = (d.gender||[])
  const device  = (d.device||[]).slice(0,6)
  const country = (d.country||[]).slice(0,8)
  const region  = (d.region||[]).slice(0,6)
  const plt     = (d.platform||[]).slice(0,6)

  const male   = gender.find(g=>g.gender==='male')
  const female = gender.find(g=>g.gender==='female')
  const totalG = (parseFloat(male?.spend)||0)+(parseFloat(female?.spend)||0)||(1)
  const gSlices = [
    {value:parseFloat(male?.spend)||0,   color:'#3b82f6', label:'Hombre'},
    {value:parseFloat(female?.spend)||0, color:'#ec4899', label:'Mujer'},
  ].filter(s=>s.value>0)
  const gPct = v => (totalG>0 ? ((v/totalG)*100).toFixed(0)+'%' : '—')

  return (
    <Page color={color}>
      <PageHdr acct={accountName} title="Audiencias" sub="Segmentación demográfica y geográfica de las campañas" color={color}/>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,flex:1,minHeight:0}}>
        {/* Top-left: Age */}
        <div style={{background:BG2,borderRadius:10,padding:'10px 12px',border:`1px solid ${BD}`}}>
          <SecLbl text="Gasto por rango de edad" color={color}/>
          {age.length>0
            ? <>
                <SvgBars vals={age.map(a=>parseFloat(a.spend)||0)} labels={age.map(a=>a.age||'?')} color={color} w={240} h={68}/>
                <div style={{display:'flex',gap:6,marginTop:6,flexWrap:'wrap'}}>
                  {age.slice(0,4).map((a,i)=>(
                    <div key={i} style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:6.5,color:T3,textTransform:'uppercase',letterSpacing:'.08em',fontWeight:700}}>{a.age}</div>
                      <div style={{fontSize:9,fontWeight:700,color:i===0?color:T1}}>{fCur(a.spend)}</div>
                      <div style={{fontSize:7,color:T3}}>{fNum(a.impressions)} impr.</div>
                    </div>
                  ))}
                </div>
              </>
            : <div style={{fontSize:9,color:T3,padding:'20px 0'}}>Sin datos de edad disponibles</div>}
        </div>

        {/* Top-right: Gender + Device */}
        <div style={{background:BG2,borderRadius:10,padding:'10px 12px',border:`1px solid ${BD}`,display:'flex',gap:10}}>
          <div style={{flex:0.85}}>
            <SecLbl text="Género" color={color}/>
            {gSlices.length>0
              ? <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <SvgDonut slices={gSlices} size={72}/>
                  <div style={{flex:1}}>
                    {gSlices.map((s,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',gap:5,marginBottom:5}}>
                        <div style={{width:8,height:8,borderRadius:2,background:s.color,flexShrink:0}}/>
                        <div>
                          <div style={{fontSize:8.5,color:T1,fontWeight:600}}>{s.label}</div>
                          <div style={{fontSize:8,color:T3}}>{gPct(s.value)} · {fCur(s.value)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              : <div style={{fontSize:9,color:T3}}>Sin datos</div>}
          </div>
          <div style={{width:1,background:BD}}/>
          <div style={{flex:1}}>
            <SecLbl text="Dispositivo" color={color}/>
            {device.length>0
              ? <SvgHBars items={device.map(dv=>({label:(dv.impression_device||dv.device||'').replace(/_/g,' ').slice(0,12), value:parseFloat(dv.spend)||0, label2:fCur(dv.spend)}))} color={color} w={130} rowH={13} gap={4}/>
              : <div style={{fontSize:9,color:T3}}>Sin datos</div>}
            {plt.length>0&&(
              <>
                <div style={{height:1,background:BD,margin:'7px 0'}}/>
                <SecLbl text="Plataforma" color={color}/>
                <SvgHBars items={plt.map(p=>({label:(p.platform||p.publisher_platform||'').slice(0,12), value:parseFloat(p.spend)||0, label2:fCur(p.spend)}))} color={color} w={130} rowH={13} gap={4}/>
              </>
            )}
          </div>
        </div>

        {/* Bottom-left: Country */}
        <div style={{background:BG2,borderRadius:10,padding:'10px 12px',border:`1px solid ${BD}`}}>
          <SecLbl text="Países — gasto por ubicación" color={color}/>
          {country.length>0
            ? <SvgHBars items={country.map(c=>({label:c.country||c.country_name||'—', value:parseFloat(c.spend)||0, label2:fCur(c.spend)}))} color={color} w={268} rowH={14} gap={4}/>
            : <div style={{fontSize:9,color:T3}}>Sin datos de países disponibles</div>}
        </div>

        {/* Bottom-right: Region */}
        <div style={{background:BG2,borderRadius:10,padding:'10px 12px',border:`1px solid ${BD}`}}>
          <SecLbl text="Regiones / Ciudades" color={color}/>
          {region.length>0
            ? <SvgHBars items={region.map(r=>({label:r.region||r.city||'—', value:parseFloat(r.spend)||0, label2:fCur(r.spend)}))} color={color} w={268} rowH={14} gap={4}/>
            : <div style={{fontSize:9,color:T3}}>Sin datos de regiones disponibles</div>}
        </div>
      </div>
    </Page>
  )
}

// ─── Page: Histórico ───────────────────────────────────────────────
function HistoricoPage({ color, accountName, historicoData }) {
  const data   = (historicoData?.monthly||[]).slice(-12)
  const months = data.map(m=>(m.month||'').slice(5)||m.month||'')
  const spends = data.map(m=>parseFloat(m.spend)||0)
  const results= data.map(m=>parseFloat(m.results)||0)
  const ctrs   = data.map(m=>parseFloat(m.ctr)||0)
  const hasRes = results.some(v=>v>0)
  const hasCtr = ctrs.some(v=>v>0)

  return (
    <Page color={color}>
      <PageHdr acct={accountName} title="Histórico Mensual" sub={`Últimos ${data.length} meses de actividad`} color={color}/>

      {data.length===0
        ? <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:T3,fontSize:11}}>No hay datos históricos disponibles para este período.</div>
        : (
          <div style={{display:'flex',gap:12,flex:1,minHeight:0}}>
            {/* Charts column */}
            <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
              <div style={{background:BG2,borderRadius:10,padding:'9px 11px',border:`1px solid ${BD}`}}>
                <div style={{fontSize:7,color:T3,fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:6}}>Gasto mensual ($)</div>
                <SvgBars vals={spends} labels={months} color={color} w={380} h={75}/>
              </div>
              {hasRes&&(
                <div style={{background:BG2,borderRadius:10,padding:'9px 11px',border:`1px solid ${BD}`}}>
                  <div style={{fontSize:7,color:T3,fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:6}}>Resultados por mes</div>
                  <SvgBars vals={results} labels={months} color={OK} w={380} h={65}/>
                </div>
              )}
              {hasCtr&&(
                <div style={{background:BG2,borderRadius:10,padding:'9px 11px',border:`1px solid ${BD}`}}>
                  <div style={{fontSize:7,color:T3,fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:4}}>CTR mensual (%)</div>
                  <SvgLine vals={ctrs} color={WARN} w={380} h={50} labels={months}/>
                </div>
              )}
            </div>

            {/* Table column */}
            <div style={{width:380,flexShrink:0}}>
              <SecLbl text="Detalle mes a mes" color={color}/>
              <DarkTable
                color={color}
                headers={['Mes','Gasto','Resultados','CTR','CPM','CPC']}
                colWidths={['22%','17%','16%','15%','15%','15%']}
                rows={data.map(m=>[
                  m.month||'—',
                  fCur(m.spend),
                  fNum(m.results),
                  fPct(m.ctr),
                  fCur(m.cpm),
                  fCur(m.cpc),
                ])}
              />
              {historicoData?.bestByMonth&&Object.keys(historicoData.bestByMonth).length>0&&(
                <div style={{marginTop:10}}>
                  <SecLbl text="Campaña ganadora por mes" color={color}/>
                  {Object.entries(historicoData.bestByMonth).slice(-5).map(([month, camp],i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'5px 8px',background:i%2===0?BG2:'transparent',borderRadius:5,marginBottom:2}}>
                      <span style={{fontSize:8,color:T2,fontWeight:600}}>{month}</span>
                      <span style={{fontSize:7.5,color:T3,maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{trunc(camp?.name||camp||'—',30)}</span>
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

// ─── Preset colors ──────────────────────────────────────────────────
const PRESET_COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6','#0ea5e9']

// ─── Main Modal ────────────────────────────────────────────────────
export default function PDFExportModal({
  isOpen, onClose,
  accountName, preset, platform,
  overview, campaigns=[], adsets=[], ads=[], daily=[],
  demographics=null, historicoData=null,
  userId, isPro,
}) {
  const [brandColor, setBrandColor] = useState('#6366f1')
  const [brandName,  setBrandName]  = useState('')
  const [logo,       setLogo]       = useState(null)
  const [exporting,  setExporting]  = useState(false)
  const pagesRef = useRef(null)

  function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if(!file) return
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
        if(!d.allowed) { alert(d.error||'No puedes exportar PDF con tu plan actual.'); setExporting(false); return }
      }
      const { default: html2canvas } = await import('html2canvas')
      const { default: jsPDF }       = await import('jspdf')
      const pages = pagesRef.current?.querySelectorAll('.pdf-page')
      if(!pages?.length) { setExporting(false); return }

      const pdf  = new jsPDF({ orientation:'landscape', unit:'pt', format:'a4' })
      const A4W  = 841.89, A4H = 595.28

      for(let i=0; i<pages.length; i++) {
        const canvas = await html2canvas(pages[i], { scale:2, backgroundColor:BG, useCORS:true, logging:false, allowTaint:false })
        const img    = canvas.toDataURL('image/jpeg', 0.93)
        const ratio  = A4W / (canvas.width / 2)
        const imgH   = (canvas.height / 2) * ratio
        if(i>0) pdf.addPage()
        pdf.addImage(img, 'JPEG', 0, 0, A4W, Math.min(imgH, A4H))
      }

      const safe = (accountName||'reporte').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]/g,'').trim().replace(/\s+/g,'-')
      pdf.save(`${safe}-${preset}-reporte.pdf`)
      onClose()
    } catch(e) {
      console.error('PDF export error:',e)
      alert('Error al generar el PDF. Intenta de nuevo.')
    }
    setExporting(false)
  }

  if(!isOpen) return null

  const camChunks = campaigns?.length ? chunk([...campaigns].sort((a,b)=>(b.spend??0)-(a.spend??0)), 14) : []
  const adsetChunks = adsets?.length  ? chunk([...adsets].sort((a,b)=>(b.spend??0)-(a.spend??0)), 14)  : []
  const adChunks  = ads?.length       ? chunk([...ads].sort((a,b)=>(b.spend??0)-(a.spend??0)), 14)      : []
  const hasDemo   = demographics && ((demographics.age||[]).length>0||(demographics.gender||[]).length>0)
  const hasHist   = historicoData && (historicoData.monthly||[]).length>0
  const totalPages = 1 + 1 + camChunks.length + adsetChunks.length + adChunks.length + (hasDemo?1:0) + (hasHist?1:0)

  return (
    <>
      {/* ── Modal UI ── */}
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
        <div style={{background:'#18181e',border:'1px solid rgba(255,255,255,.1)',borderRadius:16,padding:'28px 30px',width:480,maxWidth:'93vw',fontFamily:FONT}} onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:15,fontWeight:800,color:'#fff',marginBottom:3}}>Exportar Reporte PDF</div>
          <div style={{fontSize:10.5,color:'#555',marginBottom:22}}>Diseño oscuro · Landscape A4 · Gráficas incluidas</div>

          <div style={{marginBottom:14}}>
            <label style={{fontSize:10.5,color:'#888',fontWeight:600,display:'block',marginBottom:5}}>Nombre de marca / agencia</label>
            <input value={brandName} onChange={e=>setBrandName(e.target.value)} placeholder="Tu Agencia o Empresa"
              style={{width:'100%',padding:'8px 11px',borderRadius:8,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.05)',color:'#fff',fontSize:11.5,fontFamily:'inherit',boxSizing:'border-box',outline:'none'}}/>
          </div>

          <div style={{marginBottom:14}}>
            <label style={{fontSize:10.5,color:'#888',fontWeight:600,display:'block',marginBottom:7}}>Color de acento</label>
            <div style={{display:'flex',gap:7,alignItems:'center'}}>
              <input type="color" value={brandColor} onChange={e=>setBrandColor(e.target.value)} style={{width:36,height:32,borderRadius:6,border:'1px solid rgba(255,255,255,.1)',background:'transparent',cursor:'pointer',padding:2}}/>
              {PRESET_COLORS.map(c=><div key={c} onClick={()=>setBrandColor(c)} style={{width:22,height:22,borderRadius:5,background:c,cursor:'pointer',border:brandColor===c?'2px solid #fff':'2px solid transparent',transition:'border .1s',flexShrink:0}}/>)}
            </div>
          </div>

          <div style={{marginBottom:22}}>
            <label style={{fontSize:10.5,color:'#888',fontWeight:600,display:'block',marginBottom:5}}>Logo (opcional)</label>
            <label style={{display:'flex',alignItems:'center',gap:9,padding:'8px 13px',border:'1px dashed rgba(255,255,255,.13)',borderRadius:8,cursor:'pointer'}}>
              {logo
                ? <><img src={logo} alt="" style={{height:28,maxWidth:74,objectFit:'contain',borderRadius:3}}/><span style={{fontSize:10.5,color:'#6ee7b7'}}>✓ Logo cargado</span><span style={{fontSize:10.5,color:'#555',marginLeft:'auto',cursor:'pointer'}} onClick={e=>{e.preventDefault();setLogo(null)}}>Quitar</span></>
                : <><span style={{fontSize:15}}>🖼</span><span style={{fontSize:10.5,color:'#555'}}>PNG, SVG o JPG</span></>
              }
              <input type="file" accept="image/*" onChange={handleLogoUpload} style={{display:'none'}}/>
            </label>
          </div>

          {/* Page summary */}
          <div style={{marginBottom:20,padding:'11px 13px',background:'rgba(255,255,255,.03)',borderRadius:8,fontSize:10.5,color:'#555',lineHeight:1.9,border:'1px solid rgba(255,255,255,.05)'}}>
            <div style={{color:'#888',fontWeight:700,marginBottom:4}}>Páginas incluidas:</div>
            <div>1. Portada con KPIs del período</div>
            <div>2. Resumen + gráfica de tendencia + análisis</div>
            {camChunks.length>0&&<div>{2+1}–{2+camChunks.length}. Campañas ({campaigns.length}) con gráfica de distribución</div>}
            {adsetChunks.length>0&&<div>{2+camChunks.length+1}–{2+camChunks.length+adsetChunks.length}. Conjuntos de anuncios ({adsets.length})</div>}
            {adChunks.length>0&&<div>{2+camChunks.length+adsetChunks.length+1}–{2+camChunks.length+adsetChunks.length+adChunks.length}. Anuncios ({ads.length})</div>}
            {hasDemo&&<div>{totalPages-(hasHist?1:0)}. Audiencias — demografía y geografía</div>}
            {hasHist&&<div>{totalPages}. Histórico mensual con gráficas de tendencia</div>}
            <div style={{marginTop:4,color:'#444',fontWeight:600}}>Total: {totalPages} página{totalPages!==1?'s':''} · A4 Landscape</div>
          </div>

          <div style={{display:'flex',gap:9}}>
            <button onClick={onClose} disabled={exporting} style={{flex:1,padding:'9px',borderRadius:8,border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:'#888',fontSize:11.5,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
            <button onClick={handleExport} disabled={exporting} style={{flex:2,padding:'9px',borderRadius:8,border:'none',background:brandColor,color:'#fff',fontSize:11.5,fontWeight:700,cursor:exporting?'default':'pointer',fontFamily:'inherit',opacity:exporting?.75:1}}>
              {exporting ? '⏳ Generando PDF…' : '↓ Generar PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Hidden pages for html2canvas ── */}
      <div ref={pagesRef} style={{position:'fixed',left:'-9999px',top:0,pointerEvents:'none'}}>
        <PortadaPage  color={brandColor} logo={logo} brandName={brandName} accountName={accountName} platform={platform||'meta_ads'} preset={preset} overview={overview}/>
        <ResumenPage  color={brandColor} accountName={accountName} overview={overview} campaigns={campaigns} daily={daily}/>
        {camChunks.map((ch,i)=><CampanasPageComp key={`cam-${i}`} color={brandColor} accountName={accountName} campaigns={ch} page={i+1} total={camChunks.length} totalAll={campaigns?.length??0}/>)}
        {adsetChunks.map((ch,i)=><CampanasPageComp key={`ads-${i}`} color={brandColor} accountName={accountName} campaigns={ch} page={i+1} total={adsetChunks.length} totalAll={adsets?.length??0} entity="Conjuntos de anuncios" entitySub="Ad sets ordenados por gasto"/>)}
        {adChunks.map((ch,i)=><AnunciosPageComp key={`ad-${i}`} color={brandColor} accountName={accountName} ads={ch} page={i+1} total={adChunks.length} totalAll={ads?.length??0}/>)}
        {hasDemo&&<AudienciasPage color={brandColor} accountName={accountName} demographics={demographics}/>}
        {hasHist&&<HistoricoPage  color={brandColor} accountName={accountName} historicoData={historicoData}/>}
      </div>
    </>
  )
}
