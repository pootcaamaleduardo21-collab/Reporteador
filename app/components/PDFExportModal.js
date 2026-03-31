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

const PRESET_LABELS = {
  this_month: 'Este mes', last_month: 'Mes pasado',
  last_7d: 'Últimos 7 días', last_30d: 'Últimos 30 días',
  today: 'Hoy', yesterday: 'Ayer',
}

// ── PDF building blocks ───────────────────────────────────────────

// Fixed A4 page shell — 794×1123px at 96dpi maps perfectly to A4 in jsPDF
function Page({ children, color }) {
  return (
    <div
      className="pdf-page"
      style={{
        width: 794, height: 1123, background: '#fff',
        overflow: 'hidden', position: 'relative',
        fontFamily: '"Plus Jakarta Sans","Helvetica Neue",Arial,sans-serif',
        boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ height: 5, background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: '28px 44px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      <div style={{ height: 24, background: color, opacity: 0.1, flexShrink: 0 }} />
    </div>
  )
}

function SectionLabel({ text, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <div style={{ width: 3, height: 14, background: color, borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontSize: 9, fontWeight: 700, color: '#888', letterSpacing: '.1em', textTransform: 'uppercase' }}>
        {text}
      </span>
    </div>
  )
}

function KPI({ label, value, note, color }) {
  return (
    <div style={{ flex: 1, background: '#f7f7fb', borderRadius: 10, padding: '14px 12px', borderLeft: `3px solid ${color}`, minWidth: 0 }}>
      <div style={{ fontSize: 8, color: '#bbb', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#111', lineHeight: 1, letterSpacing: '-.02em' }}>{value}</div>
      {note && <div style={{ fontSize: 8, color: '#bbb', marginTop: 4 }}>{note}</div>}
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div style={{ flex: 1, background: '#f7f7fb', borderRadius: 8, padding: '10px 11px', minWidth: 68 }}>
      <div style={{ fontSize: 7.5, color: '#ccc', fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#222' }}>{value}</div>
    </div>
  )
}

function DataTable({ headers, rows, color, firstColWidth = '40%' }) {
  const restCols = headers.length - 1
  const restWidth = restCols > 0 ? `${60 / restCols}%` : '60%'
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 10 }}>
      <colgroup>
        <col style={{ width: firstColWidth }} />
        {headers.slice(1).map((_, i) => <col key={i} style={{ width: restWidth }} />)}
      </colgroup>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i} style={{
              padding: '9px 10px', textAlign: i === 0 ? 'left' : 'right',
              background: color, color: '#fff', fontWeight: 700,
              fontSize: 8, letterSpacing: '.07em', textTransform: 'uppercase',
              whiteSpace: 'nowrap', overflow: 'hidden',
            }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#f9f9fc' }}>
            {row.map((cell, ci) => (
              <td key={ci} style={{
                padding: '8px 10px', textAlign: ci === 0 ? 'left' : 'right',
                color: ci === 0 ? '#1a1a1a' : '#555',
                fontWeight: ci === 0 ? 600 : 400,
                fontSize: ci === 0 ? 9.5 : 9,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                borderBottom: '1px solid #f0f0f0',
              }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Page: Cover ───────────────────────────────────────────────────
function CoverPage({ color, logo, brandName, accountName, platform, preset }) {
  const plt = { meta_ads: 'Meta Ads', google_ads: 'Google Ads', tiktok_ads: 'TikTok Ads' }[platform] ?? 'Reporte'
  const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
  return (
    <div
      className="pdf-page"
      style={{
        width: 794, height: 1123, background: '#fff', overflow: 'hidden',
        fontFamily: '"Plus Jakarta Sans","Helvetica Neue",Arial,sans-serif',
        boxSizing: 'border-box',
      }}
    >
      {/* Colored hero */}
      <div style={{
        height: 460, background: color,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '56px',
      }}>
        {logo
          ? <img src={logo} alt="" style={{ maxHeight: 80, maxWidth: 200, objectFit: 'contain', marginBottom: 24 }} crossOrigin="anonymous" />
          : (
            <div style={{ width: 64, height: 64, borderRadius: 14, background: 'rgba(255,255,255,.2)', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
          )
        }
        {brandName && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', fontWeight: 600, marginBottom: 10, letterSpacing: '.07em', textTransform: 'uppercase' }}>
            {brandName}
          </div>
        )}
        <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', textAlign: 'center', lineHeight: 1.25, marginBottom: 16, maxWidth: 520 }}>
          {accountName}
        </div>
        <div style={{ background: 'rgba(255,255,255,.22)', borderRadius: 20, padding: '5px 16px', fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '.04em' }}>
          {plt}
        </div>
      </div>

      {/* Info section */}
      <div style={{ padding: '48px 56px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div>
          <div style={{ fontSize: 8.5, color: '#c0c0c0', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8 }}>Período del Reporte</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#111' }}>{PRESET_LABELS[preset] ?? preset}</div>
        </div>
        <div style={{ display: 'flex', gap: 48 }}>
          <div>
            <div style={{ fontSize: 8.5, color: '#c0c0c0', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>Generado</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#666' }}>{today}</div>
          </div>
          <div>
            <div style={{ fontSize: 8.5, color: '#c0c0c0', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>Plataforma</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#666' }}>{plt}</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '0 56px', height: 44,
        borderTop: '1px solid #f0f0f0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 9, color: '#ddd' }}>Reporteador{brandName ? ` · ${brandName}` : ''}</div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
      </div>
    </div>
  )
}

// ── Page: Overview metrics ────────────────────────────────────────
function OverviewPage({ color, accountName, overview }) {
  if (!overview) return null
  const hasVideo = (overview.hookRate ?? 0) > 0
  const hasEng   = (overview.reactions ?? 0) > 0 || (overview.comments ?? 0) > 0
  const freq     = (overview.frequency ?? 0) > 0 ? `${Number(overview.frequency).toFixed(1)}x` : '—'
  return (
    <Page color={color}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 8.5, color: '#bbb', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 3 }}>{accountName}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#111' }}>Resumen de Rendimiento</div>
      </div>

      {/* Main KPIs */}
      <SectionLabel text="Métricas Principales" color={color} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        <KPI label="Gasto Total"         value={fCur(overview.spend)}    note="invertido en el período"  color={color} />
        <KPI label="Resultados"          value={fK(overview.results)}    note="acciones clave"           color={color} />
        <KPI label="Costo / Resultado"   value={fCur(overview.cpr)}      note="por resultado"            color={color} />
        <KPI label="Personas Alcanzadas" value={fK(overview.reach)}      note="únicas"                   color={color} />
      </div>

      {/* Performance */}
      <SectionLabel text="Rendimiento del Anuncio" color={color} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
        <Metric label="CTR"         value={fPct(overview.ctr)} />
        <Metric label="CPM"         value={fCur(overview.cpm)} />
        <Metric label="CPC"         value={fCur(overview.cpc)} />
        <Metric label="Frecuencia"  value={freq} />
        <Metric label="Impresiones" value={fK(overview.impressions)} />
        <Metric label="Clics"       value={fK(overview.clicks)} />
        {hasVideo && <Metric label="Hook Rate" value={fPct(overview.hookRate)} />}
        {hasVideo && <Metric label="Hold Rate" value={fPct(overview.holdRate)} />}
      </div>

      {/* Engagement */}
      {hasEng && (
        <>
          <SectionLabel text="Interacciones" color={color} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Metric label="Reacciones"  value={fK(overview.reactions)} />
            <Metric label="Comentarios" value={fK(overview.comments)} />
            <Metric label="Guardados"   value={fK(overview.saves)} />
            <Metric label="Compartidos" value={fK(overview.shares)} />
          </div>
        </>
      )}
    </Page>
  )
}

// ── Page: Campaigns table ─────────────────────────────────────────
function CampaignsPage({ color, accountName, campaigns, page, total }) {
  return (
    <Page color={color}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 8.5, color: '#bbb', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 3 }}>{accountName}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#111', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Campañas</span>
          {total > 1 && <span style={{ fontSize: 11, fontWeight: 400, color: '#bbb' }}>p. {page} / {total}</span>}
        </div>
        <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>{campaigns.length} campañas · ordenadas por gasto</div>
      </div>
      <DataTable
        color={color}
        headers={['Campaña', 'Gasto', 'Resultados', 'Costo/Res.', 'CTR', 'CPM', 'CPC']}
        rows={campaigns.map(c => [
          (c.name || 'Sin nombre').length > 42 ? (c.name || 'Sin nombre').slice(0, 39) + '…' : (c.name || 'Sin nombre'),
          fCur(c.spend), fNum(c.results), fCur(c.cpr), fPct(c.ctr), fCur(c.cpm), fCur(c.cpc),
        ])}
      />
    </Page>
  )
}

// ── Page: Ads table ───────────────────────────────────────────────
function AdsPage({ color, accountName, ads, page, total }) {
  return (
    <Page color={color}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 8.5, color: '#bbb', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 3 }}>{accountName}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#111', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Anuncios</span>
          {total > 1 && <span style={{ fontSize: 11, fontWeight: 400, color: '#bbb' }}>p. {page} / {total}</span>}
        </div>
        <div style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>{ads.length} anuncios · ordenados por gasto</div>
      </div>
      <DataTable
        color={color}
        headers={['Anuncio', 'Estado', 'Gasto', 'Resultados', 'CTR', 'Costo/Res.']}
        firstColWidth="38%"
        rows={ads.map(a => [
          (a.name || 'Sin nombre').length > 44 ? (a.name || 'Sin nombre').slice(0, 41) + '…' : (a.name || 'Sin nombre'),
          a.status === 'ACTIVE' ? 'Activo' : a.status === 'PAUSED' ? 'Pausado' : a.status || '—',
          fCur(a.spend), fNum(a.results), fPct(a.ctr), fCur(a.cpr),
        ])}
      />
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
      // Pro/Agency tienen exportación ilimitada — solo verificar API para Free/Starter
      if (!isPro) {
        const checkRes = await fetch('/api/pdf/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        })
        const checkData = await checkRes.json()
        if (!checkData.allowed) {
          alert(checkData.error || 'No puedes exportar PDF con tu plan actual.')
          setExporting(false)
          return
        }
      }

      const { default: html2canvas } = await import('html2canvas')
      const { default: jsPDF }       = await import('jspdf')

      const pages = pagesRef.current?.querySelectorAll('.pdf-page')
      if (!pages?.length) { setExporting(false); return }

      // A4 in points: 595.28 × 841.89 pt
      const pdf  = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
      const A4W  = 595.28
      const A4H  = 841.89

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], {
          scale: 2,                  // 2x → 1588×2246px → maps exactly to A4 at high res
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          allowTaint: false,
        })
        const img    = canvas.toDataURL('image/jpeg', 0.95)
        const ratio  = A4W / (canvas.width / 2)   // canvas.width/2 = 794px → ratio ≈ 0.749
        const imgH   = (canvas.height / 2) * ratio // 1123px * 0.749 ≈ 841.9pt = A4H ✓
        if (i > 0) pdf.addPage()
        pdf.addImage(img, 'JPEG', 0, 0, A4W, Math.min(imgH, A4H))
      }

      const safeName = (accountName || 'reporte').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]/g, '').trim().replace(/\s+/g, '-')
      pdf.save(`${safeName}-${preset}-reporte.pdf`)
      onClose()
    } catch (e) {
      console.error('PDF export error:', e)
      alert('Error al generar el PDF. Intenta de nuevo.')
    }
    setExporting(false)
  }

  if (!isOpen) return null

  // Split long lists into A4-sized chunks (max 20 rows fit per page)
  const camChunks = campaigns?.length
    ? chunk([...campaigns].sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0)), 20)
    : []
  const adChunks = ads?.length
    ? chunk([...ads].sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0)), 20)
    : []

  return (
    <>
      {/* ── Modal overlay ── */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={onClose}
      >
        <div
          style={{ background: '#18181e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: '32px', width: 460, maxWidth: '92vw' }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Exportar Reporte PDF</div>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 24 }}>Personaliza la apariencia antes de exportar</div>

          {/* Brand name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 6 }}>Nombre de marca / agencia</label>
            <input
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              placeholder="Tu Agencia o Empresa"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)', color: '#fff', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          {/* Color picker */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 8 }}>Color de marca</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="color"
                value={brandColor}
                onChange={e => setBrandColor(e.target.value)}
                style={{ width: 38, height: 34, borderRadius: 6, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', cursor: 'pointer', padding: 2 }}
              />
              {PRESET_COLORS.map(c => (
                <div
                  key={c}
                  onClick={() => setBrandColor(c)}
                  style={{ width: 24, height: 24, borderRadius: 6, background: c, cursor: 'pointer', border: brandColor === c ? '2px solid #fff' : '2px solid transparent', transition: 'border .1s', flexShrink: 0 }}
                />
              ))}
            </div>
          </div>

          {/* Logo upload */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 11, color: '#888', fontWeight: 600, display: 'block', marginBottom: 6 }}>Logo (opcional)</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', border: '1px dashed rgba(255,255,255,.15)', borderRadius: 8, cursor: 'pointer' }}>
              {logo
                ? (
                  <>
                    <img src={logo} alt="" style={{ height: 30, maxWidth: 80, objectFit: 'contain', borderRadius: 4 }} />
                    <span style={{ fontSize: 11, color: '#6ee7b7' }}>✓ Logo cargado</span>
                    <span
                      style={{ fontSize: 11, color: '#666', marginLeft: 'auto', cursor: 'pointer' }}
                      onClick={e => { e.preventDefault(); setLogo(null) }}
                    >
                      Quitar
                    </span>
                  </>
                )
                : (
                  <>
                    <span style={{ fontSize: 16 }}>🖼</span>
                    <span style={{ fontSize: 11, color: '#555' }}>Haz clic para subir imagen (PNG, SVG, JPG)</span>
                  </>
                )
              }
              <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
            </label>
          </div>

          {/* Sections preview */}
          <div style={{ marginBottom: 24, padding: '12px 14px', background: 'rgba(255,255,255,.04)', borderRadius: 8, fontSize: 11, color: '#555', lineHeight: 1.9 }}>
            <div style={{ color: '#888', fontWeight: 600, marginBottom: 4 }}>Secciones incluidas:</div>
            <div>✓ Portada con datos de la cuenta</div>
            <div>✓ Resumen: métricas principales, rendimiento e interacciones</div>
            {camChunks.length > 0 && <div>✓ Tabla de campañas ({campaigns.length} campañas)</div>}
            {adChunks.length > 0  && <div>✓ Tabla de anuncios ({ads.length} anuncios)</div>}
            <div style={{ marginTop: 4, color: '#444' }}>Total: {2 + camChunks.length + adChunks.length} página(s)</div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onClose}
              disabled={exporting}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: '#888', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: brandColor, color: '#fff', fontSize: 12, fontWeight: 700, cursor: exporting ? 'default' : 'pointer', fontFamily: 'inherit', opacity: exporting ? 0.75 : 1 }}
            >
              {exporting ? 'Generando PDF…' : '↓ Generar PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Hidden PDF pages (off-screen but rendered) ── */}
      <div
        ref={pagesRef}
        style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none' }}
      >
        <CoverPage
          color={brandColor} logo={logo} brandName={brandName}
          accountName={accountName} platform={platform} preset={preset}
        />
        <OverviewPage color={brandColor} accountName={accountName} overview={overview} />
        {camChunks.map((ch, i) => (
          <CampaignsPage key={i} color={brandColor} accountName={accountName} campaigns={ch} page={i + 1} total={camChunks.length} />
        ))}
        {adChunks.map((ch, i) => (
          <AdsPage key={i} color={brandColor} accountName={accountName} ads={ch} page={i + 1} total={adChunks.length} />
        ))}
      </div>
    </>
  )
}
