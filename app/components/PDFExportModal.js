'use client'
import { useState, useRef } from 'react'

// ── Helpers ───────────────────────────────────────────────────────
const fCur = n => (n == null || isNaN(n) || n === 0) ? '—' : `$${Number(n).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const fPct = n => (n == null || isNaN(n)) ? '—' : `${Number(n).toFixed(2)}%`
const fNum = n => (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('es-MX',{maximumFractionDigits:0})
const fK   = n => {
  if (n == null || isNaN(n) || n === 0) return '—'
  if (Math.abs(n) >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000)     return `${(n/1_000).toFixed(1)}k`
  return fNum(n)
}
const chunk = (arr, n) =>
  Array.from({length: Math.ceil(arr.length / n)}, (_, i) => arr.slice(i * n, i * n + n))
const PRESET_LABELS = { this_month:'Este mes', last_month:'Mes pasado', last_7d:'Últimos 7 días', last_30d:'Últimos 30 días', today:'Hoy', yesterday:'Ayer' }
const PLT_LABEL     = { meta_ads:'Meta Ads', google_ads:'Google Ads', tiktok_ads:'TikTok Ads' }

// Landscape A4 at 96dpi = 1123 × 794px
// jsPDF landscape A4 = 841.89pt wide × 595.28pt tall
// scale:2 → canvas 2246 × 1588px → ratio = 841.89/1123 ≈ 0.7496 → imgH = 794 × 0.7496 ≈ 595.3pt ✓
const PW = 1123
const PH = 794
const FONT = '"Plus Jakarta Sans","Helvetica Neue",Arial,sans-serif'

// ── Auto insights ─────────────────────────────────────────────────
function buildInsights(overview, campaigns) {
  const wins = [], warnings = [], actions = []
  const ov = overview || {}

  if ((ov.ctr ?? 0) >= 2)        wins.push(`CTR de ${fPct(ov.ctr)} — supera el promedio de Meta Ads (1–2%)`)
  else if ((ov.ctr ?? 0) > 0 && ov.ctr < 1) warnings.push(`CTR de ${fPct(ov.ctr)} — por debajo del promedio; revisar creativo o segmentación`)

  if ((ov.frequency ?? 0) > 4) {
    warnings.push(`Frecuencia de ${Number(ov.frequency).toFixed(1)}x — posible saturación de audiencia`)
    actions.push({ p:'Alta', icon:'🔄', text:'Rotar creativos o ampliar el público objetivo para reducir fatiga de audiencia' })
  } else if ((ov.frequency ?? 0) > 0 && ov.frequency < 2) {
    wins.push(`Frecuencia de ${Number(ov.frequency).toFixed(1)}x — audiencia fresca con margen para escalar`)
  }

  const zeroCamps = (campaigns || []).filter(c => (c.results ?? 0) === 0 && (c.spend ?? 0) > 0.5)
  zeroCamps.forEach(c => {
    warnings.push(`"${c.name?.slice(0,32) ?? 'Campaña'}" gastó ${fCur(c.spend)} con 0 resultados`)
    actions.push({ p:'Alta', icon:'⏸', text:`Pausar o revisar "${c.name?.slice(0,28) ?? 'Campaña'}" — presupuesto sin conversiones` })
  })

  const winCamps = (campaigns || []).filter(c => (c.results ?? 0) > 0).sort((a,b) => (b.results??0)-(a.results??0))
  if (winCamps.length > 0) {
    wins.push(`Campaña líder: "${winCamps[0].name?.slice(0,32) ?? ''}" con ${winCamps[0].results} resultados`)
    actions.push({ p:'Alta', icon:'📈', text:`Escalar 20–30% el presupuesto en "${winCamps[0].name?.slice(0,28) ?? ''}" — mejor desempeño del período` })
  }

  if ((ov.shares ?? 0) > 200) wins.push(`${fK(ov.shares)} compartidos — el contenido genera distribución orgánica adicional`)
  if ((ov.results ?? 0) === 0 && (ov.spend ?? 0) > 0) {
    warnings.push('Sin conversiones registradas — verificar píxel y eventos de seguimiento')
    actions.push({ p:'Alta', icon:'⚙️', text:'Verificar el píxel de Meta y los eventos de conversión en el administrador de anuncios' })
  }
  if ((ov.ctr ?? 0) > 0 && ov.ctr < 1)
    actions.push({ p:'Alta', icon:'🎨', text:'Probar nuevos creativos — CTR bajo indica que el anuncio no capta suficiente atención' })
  if ((ov.frequency ?? 0) > 0 && ov.frequency < 2 && (ov.results ?? 0) > 0)
    actions.push({ p:'Media', icon:'💡', text:'Hay margen para aumentar el presupuesto — frecuencia baja indica audiencia disponible sin alcanzar' })
  if (actions.length < 2)
    actions.push({ p:'Media', icon:'🧪', text:'Realizar test A/B con distintos copys o imágenes para identificar qué mensaje resuena más' })

  return { wins, warnings, actions: actions.slice(0,5) }
}

function buildSummary(overview) {
  const ov = overview || {}
  const parts = []
  if ((ov.spend ?? 0) > 0)
    parts.push(`Se invirtieron ${fCur(ov.spend)} generando ${fNum(ov.results)} resultado${ov.results !== 1 ? 's' : ''} a ${fCur(ov.cpr)} c/u.`)
  if ((ov.reach ?? 0) > 0) {
    const freqTxt = (ov.frequency ?? 0) > 0 ? `, frecuencia ${Number(ov.frequency).toFixed(1)}x` : ''
    parts.push(`Se alcanzaron ${fK(ov.reach)} personas únicas${freqTxt}.`)
  }
  if ((ov.ctr ?? 0) > 0) {
    const a = ov.ctr >= 2 ? 'por encima del promedio' : ov.ctr >= 1 ? 'dentro del promedio' : 'por debajo del promedio'
    parts.push(`CTR ${a} de la industria (ref. 1–2%).`)
  }
  return parts.join(' ') || '—'
}

function ctrPerf(v)  { return !v ? null : v >= 2 ? 'good' : v >= 1 ? 'avg' : 'poor' }
function freqPerf(v) { return !v ? null : v <= 3 ? 'good' : v <= 5 ? 'avg' : 'poor' }
const PERF_COLOR = { good:'#10b981', avg:'#f59e0b', poor:'#ef4444' }
function Dot({ level }) {
  const c = PERF_COLOR[level] || 'transparent'
  return <div style={{ width:7, height:7, borderRadius:'50%', background:c, flexShrink:0, marginTop:3 }} />
}

// ── PDF Page shell (landscape 1123×794) ───────────────────────────
function Page({ children, color }) {
  return (
    <div className="pdf-page" style={{
      width:PW, height:PH, background:'#fff', overflow:'hidden', position:'relative',
      fontFamily:FONT, boxSizing:'border-box', display:'flex', flexDirection:'column',
    }}>
      <div style={{ height:5, background:color, flexShrink:0 }} />
      <div style={{ flex:1, padding:'24px 44px 20px', overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {children}
      </div>
      <div style={{ height:20, background:color, opacity:0.1, flexShrink:0 }} />
    </div>
  )
}

function PageHeader({ accountName, title, subtitle, color, page, total }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:14, flexShrink:0 }}>
      <div>
        <div style={{ fontSize:8, color:'#bbb', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:2 }}>{accountName}</div>
        <div style={{ fontSize:18, fontWeight:800, color:'#111', lineHeight:1 }}>{title}</div>
        {subtitle && <div style={{ fontSize:9.5, color:'#aaa', marginTop:3 }}>{subtitle}</div>}
      </div>
      {total > 1 && <div style={{ fontSize:10, color:'#bbb' }}>p. {page} / {total}</div>}
    </div>
  )
}

function SectionLabel({ text, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8, flexShrink:0 }}>
      <div style={{ width:3, height:12, background:color, borderRadius:2, flexShrink:0 }} />
      <span style={{ fontSize:8.5, fontWeight:700, color:'#999', letterSpacing:'.1em', textTransform:'uppercase' }}>{text}</span>
    </div>
  )
}

function KPI({ label, value, note, color }) {
  return (
    <div style={{ flex:1, background:'#f7f7fb', borderRadius:10, padding:'12px', borderLeft:`3px solid ${color}`, minWidth:0 }}>
      <div style={{ fontSize:7.5, color:'#bbb', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:800, color:'#111', lineHeight:1 }}>{value}</div>
      {note && <div style={{ fontSize:7.5, color:'#bbb', marginTop:3 }}>{note}</div>}
    </div>
  )
}

function Metric({ label, value, perf }) {
  return (
    <div style={{ flex:1, background:'#f7f7fb', borderRadius:7, padding:'9px 10px', minWidth:60 }}>
      <div style={{ fontSize:7, color:'#ccc', fontWeight:700, letterSpacing:'.09em', textTransform:'uppercase', marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:700, color:'#222', display:'flex', alignItems:'flex-start', gap:4 }}>
        {value}{perf && <Dot level={perf} />}
      </div>
    </div>
  )
}

function Divider() {
  return <div style={{ height:1, background:'#f0f0f0', margin:'12px 0', flexShrink:0 }} />
}

function DataTable({ headers, rows, color, colWidths, rowBg }) {
  return (
    <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed', fontSize:10 }}>
      <colgroup>
        {(colWidths || headers.map((_,i) => i===0 ? '30%' : `${70/(headers.length-1)}%`)).map((w,i) => <col key={i} style={{ width:w }} />)}
      </colgroup>
      <thead>
        <tr>
          {headers.map((h,i) => (
            <th key={i} style={{ padding:'8px 10px', textAlign:i===0?'left':'right', background:color, color:'#fff', fontWeight:700, fontSize:8, letterSpacing:'.07em', textTransform:'uppercase', whiteSpace:'nowrap', overflow:'hidden' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => {
          const bg = rowBg ? rowBg(ri) : (ri%2===0?'#fff':'#f9f9fc')
          return (
            <tr key={ri} style={{ background:bg }}>
              {row.map((cell,ci) => (
                <td key={ci} style={{ padding:'7.5px 10px', textAlign:ci===0?'left':'right', color:ci===0?'#1a1a1a':'#555', fontWeight:ci===0?600:400, fontSize:ci===0?9.5:9, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', borderBottom:'1px solid #f0f0f0' }}>{cell}</td>
              ))}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Page 1: Cover (landscape split layout) ────────────────────────
function CoverPage({ color, logo, brandName, accountName, platform, preset, overview }) {
  const plt   = PLT_LABEL[platform || 'meta_ads'] ?? 'Meta Ads'
  const today = new Date().toLocaleDateString('es-MX', { year:'numeric', month:'long', day:'numeric' })
  const ov    = overview || {}
  return (
    <div className="pdf-page" style={{ width:PW, height:PH, background:'#fff', overflow:'hidden', fontFamily:FONT, boxSizing:'border-box', display:'flex' }}>
      {/* Left: colored hero */}
      <div style={{ width:400, background:color, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 48px', flexShrink:0 }}>
        {logo
          ? <img src={logo} alt="" style={{ maxHeight:70, maxWidth:180, objectFit:'contain', marginBottom:20 }} crossOrigin="anonymous" />
          : <div style={{ width:52, height:52, borderRadius:12, background:'rgba(255,255,255,.2)', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>
            </div>
        }
        {brandName && <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', fontWeight:600, marginBottom:8, letterSpacing:'.07em', textTransform:'uppercase', textAlign:'center' }}>{brandName}</div>}
        <div style={{ fontSize:26, fontWeight:800, color:'#fff', textAlign:'center', lineHeight:1.25, marginBottom:14, maxWidth:320 }}>{accountName}</div>
        <div style={{ background:'rgba(255,255,255,.22)', borderRadius:20, padding:'4px 14px', fontSize:10, fontWeight:700, color:'#fff', letterSpacing:'.04em' }}>{plt}</div>
      </div>

      {/* Right: info + mini KPIs */}
      <div style={{ flex:1, padding:'36px 44px', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:8, color:'#c0c0c0', fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:6 }}>Período del Reporte</div>
          <div style={{ fontSize:24, fontWeight:800, color:'#111', marginBottom:20 }}>{PRESET_LABELS[preset] ?? preset}</div>
          <div style={{ display:'flex', gap:32, marginBottom:24 }}>
            <div>
              <div style={{ fontSize:8, color:'#c0c0c0', fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:4 }}>Generado</div>
              <div style={{ fontSize:12, fontWeight:600, color:'#666' }}>{today}</div>
            </div>
            <div>
              <div style={{ fontSize:8, color:'#c0c0c0', fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:4 }}>Plataforma</div>
              <div style={{ fontSize:12, fontWeight:600, color:'#666' }}>{plt}</div>
            </div>
          </div>
          {/* Mini KPI preview */}
          {(ov.spend ?? 0) > 0 && (
            <div>
              <div style={{ fontSize:8, color:'#c0c0c0', fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', marginBottom:10 }}>Resumen del Período</div>
              <div style={{ display:'flex', gap:8 }}>
                {[
                  { l:'Gasto',         v: fCur(ov.spend) },
                  { l:'Resultados',    v: fNum(ov.results) },
                  { l:'Costo/Res.',    v: fCur(ov.cpr) },
                  { l:'Alcance',       v: fK(ov.reach) },
                ].map((k,i) => (
                  <div key={i} style={{ flex:1, background:'#f7f7fb', borderRadius:8, padding:'10px', borderLeft:`2px solid ${color}` }}>
                    <div style={{ fontSize:7, color:'#bbb', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:3 }}>{k.l}</div>
                    <div style={{ fontSize:16, fontWeight:800, color:'#111' }}>{k.v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ borderTop:'1px solid #f0f0f0', paddingTop:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:8.5, color:'#ccc' }}>Reporteador{brandName ? ` · ${brandName}` : ''}</div>
          <div style={{ width:7, height:7, borderRadius:'50%', background:color }} />
        </div>
      </div>
    </div>
  )
}

// ── Page 2: Overview + Analysis ───────────────────────────────────
function OverviewPage({ color, accountName, overview, campaigns }) {
  if (!overview) return null
  const hasVideo = (overview.hookRate ?? 0) > 0
  const hasEng   = (overview.reactions ?? 0) > 0 || (overview.shares ?? 0) > 0
  const freq     = (overview.frequency ?? 0) > 0 ? `${Number(overview.frequency).toFixed(1)}x` : '—'
  const { wins, warnings } = buildInsights(overview, campaigns)
  const summary = buildSummary(overview)

  return (
    <Page color={color}>
      <PageHeader accountName={accountName} title="Resumen de Rendimiento" color={color} />

      {/* KPI row */}
      <SectionLabel text="Métricas Principales" color={color} />
      <div style={{ display:'flex', gap:10, marginBottom:14, flexShrink:0 }}>
        <KPI label="Gasto Total"         value={fCur(overview.spend)}  note="invertido en el período"  color={color} />
        <KPI label="Resultados"          value={fK(overview.results)}  note="conversiones / acciones"  color={color} />
        <KPI label="Costo / Resultado"   value={fCur(overview.cpr)}    note="por resultado"            color={color} />
        <KPI label="Personas Alcanzadas" value={fK(overview.reach)}    note="únicas"                   color={color} />
        <KPI label="CTR"                 value={fPct(overview.ctr)}    note={ctrPerf(overview.ctr) === 'good' ? '↑ sobre el promedio' : ctrPerf(overview.ctr) === 'poor' ? '↓ bajo el promedio' : 'promedio de la industria'} color={PERF_COLOR[ctrPerf(overview.ctr) ?? ''] || color} />
        <KPI label="CPM"                 value={fCur(overview.cpm)}    note="por 1,000 impresiones"    color={color} />
        <KPI label="Frecuencia"          value={freq}                  note="impresiones por persona"  color={PERF_COLOR[freqPerf(overview.frequency) ?? ''] || color} />
      </div>

      {/* Performance + Engagement in 2 columns */}
      <div style={{ display:'flex', gap:20, flex:1, minHeight:0 }}>
        {/* Left: secondary metrics + engagement */}
        <div style={{ flex:1 }}>
          <SectionLabel text="Rendimiento Detallado" color={color} />
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
            <Metric label="CPC"         value={fCur(overview.cpc)} />
            <Metric label="Impresiones" value={fK(overview.impressions)} />
            <Metric label="Clics"       value={fK(overview.clicks)} />
            {hasVideo && <Metric label="Hook Rate" value={fPct(overview.hookRate)} />}
            {hasVideo && <Metric label="Hold Rate" value={fPct(overview.holdRate)} />}
          </div>
          {hasEng && (
            <>
              <SectionLabel text="Interacciones" color={color} />
              <div style={{ display:'flex', gap:8 }}>
                <Metric label="Reacciones"  value={fK(overview.reactions)} />
                <Metric label="Comentarios" value={fK(overview.comments)} />
                <Metric label="Guardados"   value={fK(overview.saves)} />
                <Metric label="Compartidos" value={fK(overview.shares)} />
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div style={{ width:1, background:'#f0f0f0', flexShrink:0 }} />

        {/* Right: analysis + wins/warnings */}
        <div style={{ flex:1 }}>
          <SectionLabel text="Análisis del Período" color={color} />
          <div style={{ fontSize:10.5, color:'#444', lineHeight:1.7, marginBottom:14 }}>{summary}</div>

          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {wins.length > 0 && (
              <div style={{ background:'#f0fdf4', borderRadius:8, padding:'10px 12px', border:'1px solid #bbf7d0' }}>
                <div style={{ fontSize:8, fontWeight:700, color:'#16a34a', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:7 }}>✓ Lo que funcionó</div>
                {wins.slice(0,3).map((w,i) => <div key={i} style={{ fontSize:9.5, color:'#166534', lineHeight:1.5, marginBottom:3, display:'flex', gap:5 }}><span style={{ flexShrink:0 }}>·</span><span>{w}</span></div>)}
              </div>
            )}
            {warnings.length > 0 && (
              <div style={{ background:'#fffbeb', borderRadius:8, padding:'10px 12px', border:'1px solid #fde68a' }}>
                <div style={{ fontSize:8, fontWeight:700, color:'#d97706', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:7 }}>⚠ Puntos de atención</div>
                {warnings.slice(0,3).map((w,i) => <div key={i} style={{ fontSize:9.5, color:'#92400e', lineHeight:1.5, marginBottom:3, display:'flex', gap:5 }}><span style={{ flexShrink:0 }}>·</span><span>{w}</span></div>)}
              </div>
            )}
          </div>
        </div>
      </div>
    </Page>
  )
}

// ── Page 3+: Campaigns ────────────────────────────────────────────
function CampaignsPage({ color, accountName, campaigns, page, total, totalAll }) {
  const sorted     = [...campaigns].sort((a,b) => (b.spend??0)-(a.spend??0))
  const totalSpend = sorted.reduce((s,c) => s + (c.spend??0), 0)
  const topIdx     = sorted.findIndex(c => (c.results??0) === Math.max(...sorted.map(c=>c.results??0)) && (c.results??0) > 0)

  return (
    <Page color={color}>
      <PageHeader accountName={accountName} title="Campañas" subtitle={`${totalAll} campaña${totalAll!==1?'s':''} · ordenadas por gasto`} color={color} page={page} total={total} />

      <div style={{ display:'flex', gap:12, marginBottom:8, fontSize:8.5, flexShrink:0 }}>
        {topIdx >= 0 && <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:8, height:8, borderRadius:2, background:'#dcfce7', border:'1px solid #86efac' }}/><span style={{ color:'#666' }}>★ Campaña ganadora</span></div>}
        <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:8, height:8, borderRadius:2, background:'#fef9c3', border:'1px solid #fde047' }}/><span style={{ color:'#666' }}>Sin resultados — revisar</span></div>
      </div>

      <DataTable
        color={color}
        headers={['Campaña', '% Pres.', 'Gasto', 'Resultados', 'Costo/Res.', 'CTR', 'CPM', 'CPC']}
        colWidths={['34%','8%','11%','11%','11%','9%','9%','7%']}
        rowBg={ri => {
          if (ri === topIdx)                                                      return '#f0fdf4'
          if ((sorted[ri]?.results??0) === 0 && (sorted[ri]?.spend??0) > 0.5)   return '#fefce8'
          return ri%2===0 ? '#fff' : '#f9f9fc'
        }}
        rows={sorted.map((c,i) => {
          const pct  = totalSpend > 0 ? `${((c.spend??0)/totalSpend*100).toFixed(0)}%` : '—'
          const name = (c.name||'Sin nombre').length > 40 ? (c.name||'').slice(0,37)+'…' : (c.name||'Sin nombre')
          return [(i===topIdx ? '★ ' : '') + name, pct, fCur(c.spend), fNum(c.results), fCur(c.cpr), fPct(c.ctr), fCur(c.cpm), fCur(c.cpc)]
        })}
      />

      {sorted.some(c => (c.results??0)===0 && (c.spend??0)>0.5) && (
        <div style={{ marginTop:12, padding:'8px 12px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:7, fontSize:9.5, color:'#92400e', flexShrink:0 }}>
          ⚠ Hay campaña(s) con gasto activo y 0 resultados. Se recomienda pausarlas o revisar segmentación y creativos antes del próximo ciclo.
        </div>
      )}
    </Page>
  )
}

// ── Page: Ads ─────────────────────────────────────────────────────
function AdsPage({ color, accountName, ads, page, total, totalAll }) {
  const sorted = [...ads].sort((a,b) => (b.spend??0)-(a.spend??0))
  return (
    <Page color={color}>
      <PageHeader accountName={accountName} title="Anuncios" subtitle={`${totalAll} anuncio${totalAll!==1?'s':''} · ordenados por gasto`} color={color} page={page} total={total} />
      <DataTable
        color={color}
        headers={['Anuncio', 'Campaña', 'Estado', 'Gasto', 'Resultados', 'CTR', 'Costo/Res.', 'CPM']}
        colWidths={['28%','24%','9%','10%','10%','7%','7%','5%']}
        rowBg={ri => (sorted[ri]?.results??0)===0 && (sorted[ri]?.spend??0)>0.5 ? '#fefce8' : ri%2===0 ? '#fff' : '#f9f9fc'}
        rows={sorted.map(a => [
          (a.name||'Sin nombre').length > 32 ? (a.name||'').slice(0,29)+'…' : (a.name||'Sin nombre'),
          (a.campaign||'—').length > 28 ? (a.campaign||'').slice(0,25)+'…' : (a.campaign||'—'),
          a.status==='ACTIVE'?'Activo':a.status==='PAUSED'?'Pausado':a.status||'—',
          fCur(a.spend), fNum(a.results), fPct(a.ctr), fCur(a.cpr), fCur(a.cpm),
        ])}
      />
    </Page>
  )
}

// ── Page: Action Plan ─────────────────────────────────────────────
function ActionsPage({ color, accountName, overview, campaigns }) {
  const { actions } = buildInsights(overview, campaigns)
  const ov = overview || {}
  const PR = {
    Alta:  { bg:'#fef2f2', border:'#fecaca', text:'#991b1b' },
    Media: { bg:'#fffbeb', border:'#fde68a', text:'#92400e' },
    Baja:  { bg:'#f0fdf4', border:'#bbf7d0', text:'#166534' },
  }
  return (
    <Page color={color}>
      <PageHeader accountName={accountName} title="Plan de Acción" subtitle="Recomendaciones concretas basadas en los datos del período" color={color} />

      <div style={{ display:'flex', gap:20, flex:1, minHeight:0 }}>
        {/* Left: action items */}
        <div style={{ flex:3, display:'flex', flexDirection:'column', gap:9 }}>
          {actions.map((a,i) => {
            const s = PR[a.p] || PR['Media']
            return (
              <div key={i} style={{ display:'flex', gap:12, padding:'12px 14px', background:s.bg, border:`1px solid ${s.border}`, borderRadius:9, alignItems:'flex-start' }}>
                <div style={{ fontSize:18, lineHeight:1, flexShrink:0 }}>{a.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10.5, color:s.text, lineHeight:1.55 }}>{a.text}</div>
                </div>
                <div style={{ fontSize:7.5, fontWeight:700, color:s.text, background:s.border, padding:'2px 8px', borderRadius:10, letterSpacing:'.07em', flexShrink:0, marginTop:1 }}>{a.p.toUpperCase()}</div>
              </div>
            )
          })}
        </div>

        {/* Divider */}
        <div style={{ width:1, background:'#f0f0f0', flexShrink:0 }} />

        {/* Right: benchmarks + account metrics */}
        <div style={{ flex:2, display:'flex', flexDirection:'column', gap:10 }}>
          <SectionLabel text="Tu cuenta vs. Benchmarks" color={color} />
          {[
            { label:'CTR', bench:'1 – 2%', val:fPct(ov.ctr), perf:ctrPerf(ov.ctr) },
            { label:'Frecuencia', bench:'1 – 3x', val:(ov.frequency??0)>0?`${Number(ov.frequency).toFixed(1)}x`:'—', perf:freqPerf(ov.frequency) },
            { label:'Impresiones', bench:'—', val:fK(ov.impressions), perf:null },
            { label:'Alcance', bench:'—', val:fK(ov.reach), perf:null },
          ].map((b,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:'#f7f7fb', borderRadius:7 }}>
              <div style={{ fontSize:9.5, color:'#666', fontWeight:600 }}>{b.label}</div>
              <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                <div style={{ fontSize:8.5, color:'#aaa' }}>Ref: {b.bench}</div>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#222' }}>{b.val}</div>
                  {b.perf && <Dot level={b.perf} />}
                </div>
              </div>
            </div>
          ))}

          <Divider />
          <div style={{ padding:'10px 12px', background:'#f7f7fb', borderRadius:7 }}>
            <div style={{ fontSize:8, color:'#aaa', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>Inversión del Período</div>
            <div style={{ fontSize:20, fontWeight:800, color:'#111', marginBottom:2 }}>{fCur(ov.spend)}</div>
            <div style={{ fontSize:9, color:'#aaa' }}>{fNum(ov.results)} resultado{ov.results!==1?'s':''} · {fCur(ov.cpr)} c/u</div>
          </div>
        </div>
      </div>
    </Page>
  )
}

// ── Preset colors ─────────────────────────────────────────────────
const PRESET_COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6','#0ea5e9']

// ── Main Modal ────────────────────────────────────────────────────
export default function PDFExportModal({ isOpen, onClose, accountName, preset, platform, overview, campaigns, ads, userId, isPro }) {
  const [brandColor, setBrandColor] = useState('#6366f1')
  const [brandName,  setBrandName]  = useState('')
  const [logo,       setLogo]       = useState(null)
  const [exporting,  setExporting]  = useState(false)
  const pagesRef = useRef(null)

  function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setLogo(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleExport() {
    setExporting(true)
    try {
      if (!isPro) {
        const r = await fetch('/api/pdf/track', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ userId }) })
        const d = await r.json()
        if (!d.allowed) { alert(d.error || 'No puedes exportar PDF con tu plan actual.'); setExporting(false); return }
      }

      const { default: html2canvas } = await import('html2canvas')
      const { default: jsPDF }       = await import('jspdf')
      const pages = pagesRef.current?.querySelectorAll('.pdf-page')
      if (!pages?.length) { setExporting(false); return }

      // Landscape A4: 841.89pt wide × 595.28pt tall
      const pdf = new jsPDF({ orientation:'landscape', unit:'pt', format:'a4' })
      const A4W = 841.89, A4H = 595.28

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], { scale:2, backgroundColor:'#ffffff', useCORS:true, logging:false, allowTaint:false })
        const img   = canvas.toDataURL('image/jpeg', 0.95)
        const ratio = A4W / (canvas.width / 2)   // 841.89 / 1123 ≈ 0.7496
        const imgH  = (canvas.height / 2) * ratio // 794 * 0.7496 ≈ 595.3 ✓
        if (i > 0) pdf.addPage()
        pdf.addImage(img, 'JPEG', 0, 0, A4W, Math.min(imgH, A4H))
      }

      const safe = (accountName||'reporte').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]/g,'').trim().replace(/\s+/g,'-')
      pdf.save(`${safe}-${preset}-reporte.pdf`)
      onClose()
    } catch(e) {
      console.error('PDF export error:', e)
      alert('Error al generar el PDF. Intenta de nuevo.')
    }
    setExporting(false)
  }

  if (!isOpen) return null

  // Landscape pages fit ~15 rows comfortably
  const camChunks = campaigns?.length ? chunk([...campaigns].sort((a,b)=>(b.spend??0)-(a.spend??0)), 15) : []
  const adChunks  = ads?.length       ? chunk([...ads].sort((a,b)=>(b.spend??0)-(a.spend??0)),       15) : []
  const totalPages = 1 + 1 + camChunks.length + adChunks.length + 1

  return (
    <>
      {/* Modal */}
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
        <div style={{ background:'#18181e', border:'1px solid rgba(255,255,255,.1)', borderRadius:16, padding:'32px', width:460, maxWidth:'92vw' }} onClick={e=>e.stopPropagation()}>
          <div style={{ fontSize:16, fontWeight:800, color:'#fff', marginBottom:4 }}>Exportar Reporte PDF</div>
          <div style={{ fontSize:11, color:'#555', marginBottom:24 }}>Landscape A4 · diseño optimizado para presentaciones</div>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:6 }}>Nombre de marca / agencia</label>
            <input value={brandName} onChange={e=>setBrandName(e.target.value)} placeholder="Tu Agencia o Empresa"
              style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.05)', color:'#fff', fontSize:12, fontFamily:'inherit', boxSizing:'border-box', outline:'none' }} />
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:8 }}>Color de marca</label>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input type="color" value={brandColor} onChange={e=>setBrandColor(e.target.value)} style={{ width:38, height:34, borderRadius:6, border:'1px solid rgba(255,255,255,.1)', background:'transparent', cursor:'pointer', padding:2 }} />
              {PRESET_COLORS.map(c => <div key={c} onClick={()=>setBrandColor(c)} style={{ width:24, height:24, borderRadius:6, background:c, cursor:'pointer', border:brandColor===c?'2px solid #fff':'2px solid transparent', transition:'border .1s', flexShrink:0 }} />)}
            </div>
          </div>

          <div style={{ marginBottom:24 }}>
            <label style={{ fontSize:11, color:'#888', fontWeight:600, display:'block', marginBottom:6 }}>Logo (opcional)</label>
            <label style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', border:'1px dashed rgba(255,255,255,.15)', borderRadius:8, cursor:'pointer' }}>
              {logo
                ? <><img src={logo} alt="" style={{ height:30, maxWidth:80, objectFit:'contain', borderRadius:4 }} /><span style={{ fontSize:11, color:'#6ee7b7' }}>✓ Logo cargado</span><span style={{ fontSize:11, color:'#666', marginLeft:'auto', cursor:'pointer' }} onClick={e=>{e.preventDefault();setLogo(null)}}>Quitar</span></>
                : <><span style={{ fontSize:16 }}>🖼</span><span style={{ fontSize:11, color:'#555' }}>PNG, SVG o JPG</span></>
              }
              <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display:'none' }} />
            </label>
          </div>

          <div style={{ marginBottom:24, padding:'12px 14px', background:'rgba(255,255,255,.04)', borderRadius:8, fontSize:11, color:'#555', lineHeight:1.9 }}>
            <div style={{ color:'#888', fontWeight:600, marginBottom:4 }}>Páginas incluidas:</div>
            <div>1. Portada con KPIs del período</div>
            <div>2. Resumen completo + análisis + puntos de atención</div>
            {camChunks.length > 0 && <div>{2 + 1}–{2 + camChunks.length}. Campañas ({campaigns.length}) con % de presupuesto</div>}
            {adChunks.length  > 0 && <div>{2 + camChunks.length + 1}–{2 + camChunks.length + adChunks.length}. Anuncios ({ads.length})</div>}
            <div>{totalPages}. Plan de acción con recomendaciones priorizadas</div>
            <div style={{ marginTop:4, color:'#444', fontWeight:600 }}>Total: {totalPages} páginas · Orientación: Horizontal</div>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onClose} disabled={exporting} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid rgba(255,255,255,.1)', background:'transparent', color:'#888', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>Cancelar</button>
            <button onClick={handleExport} disabled={exporting} style={{ flex:2, padding:'10px', borderRadius:8, border:'none', background:brandColor, color:'#fff', fontSize:12, fontWeight:700, cursor:exporting?'default':'pointer', fontFamily:'inherit', opacity:exporting?.75:1 }}>
              {exporting ? 'Generando PDF…' : '↓ Generar PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden landscape pages */}
      <div ref={pagesRef} style={{ position:'fixed', left:'-9999px', top:0, pointerEvents:'none' }}>
        <CoverPage    color={brandColor} logo={logo} brandName={brandName} accountName={accountName} platform={platform||'meta_ads'} preset={preset} overview={overview} />
        <OverviewPage color={brandColor} accountName={accountName} overview={overview} campaigns={campaigns} />
        {camChunks.map((ch,i) => <CampaignsPage key={i} color={brandColor} accountName={accountName} campaigns={ch} page={i+1} total={camChunks.length} totalAll={campaigns?.length??0} />)}
        {adChunks.map((ch,i)  => <AdsPage       key={i} color={brandColor} accountName={accountName} ads={ch}       page={i+1} total={adChunks.length}  totalAll={ads?.length??0} />)}
        <ActionsPage  color={brandColor} accountName={accountName} overview={overview} campaigns={campaigns} />
      </div>
    </>
  )
}
