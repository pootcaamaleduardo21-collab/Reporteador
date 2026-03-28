'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const FB_MAX = 63206
const IG_MAX = 2200

// Colores por tipo de tendencia
const TIPO_COLORS = {
  educativo: { bg: 'rgba(99,102,241,.12)', border: 'rgba(99,102,241,.3)', text: '#a5b4fc' },
  lifestyle: { bg: 'rgba(236,72,153,.1)', border: 'rgba(236,72,153,.3)', text: '#f472b6' },
  mercado: { bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.3)', text: '#fbbf24' },
  inversion: { bg: 'rgba(110,231,183,.1)', border: 'rgba(110,231,183,.25)', text: '#6ee7b7' },
  proceso: { bg: 'rgba(96,165,250,.1)', border: 'rgba(96,165,250,.25)', text: '#60a5fa' },
}

function fmt(n) {
  if (n == null) return '—'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

function fmtDate(str) {
  if (!str) return ''
  try {
    return new Date(str).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return str }
}

export default function PublicarPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [pages, setPages] = useState([])
  const [loadingPages, setLoadingPages] = useState(true)

  const [selectedPage, setSelectedPage] = useState(null)
  const [platform, setPlatform] = useState('facebook')
  const [caption, setCaption] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [link, setLink] = useState('')

  const [posting, setPosting] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)

  const [recentPosts, setRecentPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(false)

  // ── IA Copywriter ──
  const [mainTab, setMainTab] = useState('compositor') // 'compositor' | 'ia'
  const [trends, setTrends] = useState([])
  const [loadingTrends, setLoadingTrends] = useState(false)
  const [selectedTrend, setSelectedTrend] = useState(null)
  const [generatedPosts, setGeneratedPosts] = useState([])
  const [generatingPosts, setGeneratingPosts] = useState(false)
  const [aiStyle, setAiStyle] = useState('equilibrado')
  const [customPrompt, setCustomPrompt] = useState('')
  const [aiError, setAiError] = useState(null)
  const [aiMode, setAiMode] = useState('tendencia') // 'tendencia' | 'libre'

  const charLimit = platform === 'instagram' ? IG_MAX : FB_MAX
  const charCount = caption.length
  const charOver = charCount > charLimit

  // Load user + meta token + pages
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)

      const { data: tokenRow } = await supabase
        .from('meta_tokens')
        .select('access_token')
        .eq('user_id', user.id)
        .single()

      if (!tokenRow?.access_token) {
        setLoadingPages(false)
        return
      }

      const tok = tokenRow.access_token
      setToken(tok)

      try {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,fan_count,picture,instagram_business_account{id,name}&access_token=${tok}&limit=25`
        )
        const data = await res.json()
        if (data.data && data.data.length > 0) {
          setPages(data.data)
          setSelectedPage(data.data[0])
        }
      } catch (e) {
        console.error('Error fetching pages', e)
      }
      setLoadingPages(false)
    }
    init()
  }, [])

  // Load recent posts when page/platform changes
  useEffect(() => {
    if (!selectedPage) return
    loadRecentPosts()
  }, [selectedPage, platform])

  async function loadRecentPosts() {
    if (!selectedPage) return
    setLoadingPosts(true)
    setRecentPosts([])
    try {
      let url
      if (platform === 'instagram' && selectedPage.instagram_business_account?.id) {
        const igId = selectedPage.instagram_business_account.id
        url = `https://graph.facebook.com/v21.0/${igId}/media?fields=id,caption,timestamp,like_count,comments_count,media_type&limit=5&access_token=${selectedPage.access_token}`
      } else {
        url = `https://graph.facebook.com/v21.0/${selectedPage.id}/feed?fields=id,message,created_time,likes.summary(true),comments.summary(true)&limit=5&access_token=${selectedPage.access_token}`
      }
      const res = await fetch(url)
      const data = await res.json()
      if (data.data) setRecentPosts(data.data)
    } catch (e) {
      console.error('Error fetching recent posts', e)
    }
    setLoadingPosts(false)
  }

  // ── IA: Cargar tendencias del día ──
  async function loadTrends() {
    setLoadingTrends(true)
    setAiError(null)
    try {
      const res = await fetch('/api/ai/trends')
      const j = await res.json()
      if (j.error) throw new Error(j.error)
      setTrends(j.trends || [])
    } catch (e) {
      setAiError('No se pudieron cargar las tendencias. Verifica tu conexión o la API key.')
    }
    setLoadingTrends(false)
  }

  // ── IA: Generar variaciones de post ──
  async function generatePosts() {
    setGeneratingPosts(true)
    setAiError(null)
    setGeneratedPosts([])
    try {
      const body = {
        topic: aiMode === 'tendencia' && selectedTrend ? selectedTrend.titulo : null,
        platform,
        accountName: selectedPage?.name || 'Agente Inmobiliario',
        followers: selectedPage?.fan_count || 0,
        style: aiStyle,
        customPrompt: aiMode === 'libre' ? customPrompt : null,
      }
      const res = await fetch('/api/ai/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await res.json()
      if (j.error) throw new Error(j.error)
      setGeneratedPosts(j.posts || [])
    } catch (e) {
      setAiError(e.message || 'Error al generar el post. Verifica la API key de Anthropic.')
    }
    setGeneratingPosts(false)
  }

  // ── IA: Usar un post generado en el compositor ──
  function useGeneratedPost(texto) {
    setCaption(texto)
    setMainTab('compositor')
    setSuccess(null)
    setError(null)
  }

  async function handlePost() {
    if (!selectedPage || !caption.trim()) return
    if (charOver) return
    setPosting(true)
    setError(null)
    setSuccess(null)

    try {
      const pageTok = selectedPage.access_token

      if (platform === 'facebook') {
        let endpoint, body
        if (imageUrl.trim()) {
          endpoint = `https://graph.facebook.com/v21.0/${selectedPage.id}/photos`
          body = new URLSearchParams({ caption: caption, url: imageUrl.trim(), access_token: pageTok })
        } else {
          endpoint = `https://graph.facebook.com/v21.0/${selectedPage.id}/feed`
          body = new URLSearchParams({ message: caption, access_token: pageTok })
          if (link.trim()) body.append('link', link.trim())
        }
        const res = await fetch(endpoint, { method: 'POST', body })
        const data = await res.json()
        if (data.error) throw new Error(data.error.message)
        setSuccess('Post publicado en Facebook exitosamente.')
        setCaption('')
        setImageUrl('')
        setLink('')
        loadRecentPosts()
      } else {
        // Instagram: two-step
        const igId = selectedPage.instagram_business_account?.id
        if (!igId) throw new Error('Esta página no tiene una cuenta de Instagram Business vinculada.')

        // Step 1: create media container
        const mediaBody = new URLSearchParams({ caption, access_token: pageTok })
        if (imageUrl.trim()) {
          mediaBody.append('image_url', imageUrl.trim())
        } else {
          throw new Error('Instagram requiere una URL de imagen para publicar.')
        }
        const mediaRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media`, { method: 'POST', body: mediaBody })
        const mediaData = await mediaRes.json()
        if (mediaData.error) throw new Error(mediaData.error.message)
        const creationId = mediaData.id
        if (!creationId) throw new Error('No se pudo crear el contenedor de media en Instagram.')

        // Step 2: publish
        const pubBody = new URLSearchParams({ creation_id: creationId, access_token: pageTok })
        const pubRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media_publish`, { method: 'POST', body: pubBody })
        const pubData = await pubRes.json()
        if (pubData.error) throw new Error(pubData.error.message)

        setSuccess('Post publicado en Instagram exitosamente.')
        setCaption('')
        setImageUrl('')
        loadRecentPosts()
      }
    } catch (e) {
      setError(e.message || 'Error desconocido al publicar.')
    }
    setPosting(false)
  }

  const igAccount = selectedPage?.instagram_business_account

  // Styles
  const cardStyle = {
    background: 'var(--sidebar)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '20px',
  }

  if (loadingPages) {
    return (
      <div style={{ padding: '32px', color: 'var(--text4)', fontFamily: '"Plus Jakarta Sans",system-ui,sans-serif', fontSize: '13px' }}>
        Cargando...
      </div>
    )
  }

  if (!token) {
    return (
      <div style={{ padding: '32px', fontFamily: '"Plus Jakarta Sans",system-ui,sans-serif' }}>
        <div style={{ ...cardStyle, maxWidth: '480px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📡</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>Conecta Meta para publicar</div>
          <div style={{ fontSize: '12px', color: 'var(--text4)', marginBottom: '20px' }}>
            Necesitas conectar tu cuenta de Meta para publicar en Facebook e Instagram desde aquí.
          </div>
          <button
            onClick={() => router.push('/dashboard/platforms')}
            style={{ padding: '9px 20px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', fontWeight: '600' }}>
            Ir a Plataformas →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 24px', fontFamily: '"Plus Jakarta Sans",system-ui,sans-serif', color: 'var(--text)', overflowY: 'auto', height: '100%' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .pub-btn:hover { opacity:.85; }
        .pub-tab-active { background: rgba(99,102,241,.14); color: #a5b4fc !important; }
        .pub-tab { transition: background .15s; border-radius: 7px; padding: 6px 14px; cursor: pointer; font-size: 12px; font-weight: 600; color: var(--text4); border: none; background: transparent; font-family: inherit; }
        .pub-tab:hover { background: rgba(255,255,255,.05); }
        .pub-page-opt:hover { background: rgba(255,255,255,.06) !important; }
        textarea:focus, input:focus { outline: none; border-color: rgba(99,102,241,.5) !important; }
      `}</style>

      {/* Header + tab switcher */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', marginBottom: '4px' }}>Crear Post</div>
          <div style={{ fontSize: '12px', color: 'var(--text4)' }}>Publica contenido orgánico en Facebook e Instagram</div>
        </div>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,.04)', padding: '3px', borderRadius: '9px', border: '1px solid var(--border)' }}>
          {[
            { id: 'compositor', label: '✏️ Compositor' },
            { id: 'ia', label: '🤖 Asistente IA' },
          ].map(t => (
            <button key={t.id} onClick={() => setMainTab(t.id)}
              style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit', transition: 'all .15s',
                background: mainTab === t.id ? (t.id === 'ia' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,.1)') : 'transparent',
                color: mainTab === t.id ? '#fff' : 'var(--text4)' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ IA COPYWRITER TAB ═══ */}
      {mainTab === 'ia' && (
        <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* LEFT: Tendencias + generador */}
          <div style={{ flex: '1 1 340px', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Tendencias del día */}
            <div style={{ ...cardStyle, background: 'linear-gradient(135deg,rgba(99,102,241,.08),rgba(139,92,246,.05))' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', marginBottom: '2px' }}>🔥 Tendencias del día</div>
                  <div style={{ fontSize: '10px', color: 'var(--text4)' }}>Temas relevantes para el mercado inmobiliario hoy</div>
                </div>
                <button onClick={loadTrends} disabled={loadingTrends}
                  style={{ padding: '6px 12px', background: 'rgba(99,102,241,.2)', border: '1px solid rgba(99,102,241,.3)', borderRadius: '6px', color: '#a5b4fc', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', opacity: loadingTrends ? 0.6 : 1 }}>
                  {loadingTrends ? '⏳ Cargando...' : trends.length > 0 ? '↻ Actualizar' : '✦ Generar tendencias'}
                </button>
              </div>

              {trends.length === 0 && !loadingTrends && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text4)', fontSize: '12px', lineHeight: '1.6' }}>
                  Haz clic en <strong style={{ color: '#a5b4fc' }}>✦ Generar tendencias</strong> para que la IA analice qué temas son relevantes hoy en el mercado inmobiliario.
                </div>
              )}

              {loadingTrends && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', color: 'var(--text4)', fontSize: '12px' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(99,102,241,.3)', borderTop: '2px solid #6366f1', animation: 'spin .8s linear infinite', flexShrink: 0 }}></div>
                  Analizando tendencias inmobiliarias...
                </div>
              )}

              {trends.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {trends.map(t => {
                    const colors = TIPO_COLORS[t.tipo] || TIPO_COLORS.educativo
                    const isSelected = selectedTrend?.id === t.id
                    return (
                      <div key={t.id} onClick={() => { setSelectedTrend(t); setAiMode('tendencia') }}
                        style={{ padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', transition: 'all .15s',
                          background: isSelected ? colors.bg : 'rgba(255,255,255,.03)',
                          border: `1px solid ${isSelected ? colors.border : 'rgba(255,255,255,.06)'}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                          <span style={{ fontSize: '14px', flexShrink: 0 }}>{t.emoji}</span>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: isSelected ? colors.text : 'var(--text)', flex: 1 }}>{t.titulo}</span>
                          {isSelected && <span style={{ fontSize: '10px', color: colors.text, flexShrink: 0 }}>✓</span>}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text4)', lineHeight: '1.4', marginLeft: '22px' }}>{t.descripcion}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Generador */}
            <div style={cardStyle}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', marginBottom: '12px' }}>✨ Generar ideas de post</div>

              {/* Modo */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', background: 'rgba(255,255,255,.04)', padding: '3px', borderRadius: '7px', border: '1px solid var(--border)' }}>
                {[{ id: 'tendencia', label: '📊 Por tendencia' }, { id: 'libre', label: '💬 Prompt libre' }].map(m => (
                  <button key={m.id} onClick={() => setAiMode(m.id)}
                    style={{ flex: 1, padding: '5px 8px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '600', fontFamily: 'inherit', transition: 'all .15s',
                      background: aiMode === m.id ? 'rgba(255,255,255,.1)' : 'transparent',
                      color: aiMode === m.id ? 'var(--text)' : 'var(--text4)' }}>
                    {m.label}
                  </button>
                ))}
              </div>

              {aiMode === 'tendencia' && (
                <div style={{ fontSize: '11px', color: 'var(--text4)', marginBottom: '10px', padding: '8px 10px', background: 'rgba(255,255,255,.03)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  {selectedTrend
                    ? <span>Tema: <strong style={{ color: '#a5b4fc' }}>{selectedTrend.emoji} {selectedTrend.titulo}</strong></span>
                    : 'Selecciona una tendencia arriba para generar el post'}
                </div>
              )}

              {aiMode === 'libre' && (
                <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
                  placeholder="Ej: Crea un post sobre por qué marzo es buen momento para comprar departamento en Playa del Carmen..."
                  style={{ width: '100%', minHeight: '80px', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text)', fontSize: '12px', padding: '8px 10px', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5', boxSizing: 'border-box', marginBottom: '10px' }}
                />
              )}

              {/* Estilo */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px' }}>Tono del copy</div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {[{ id: 'equilibrado', label: '⚖️ Equilibrado' }, { id: 'profesional', label: '👔 Profesional' }, { id: 'casual', label: '😊 Cercano' }].map(s => (
                    <button key={s.id} onClick={() => setAiStyle(s.id)}
                      style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid', cursor: 'pointer', fontSize: '11px', fontWeight: '600', fontFamily: 'inherit', transition: 'all .15s',
                        borderColor: aiStyle === s.id ? '#a5b4fc' : 'rgba(255,255,255,.08)',
                        background: aiStyle === s.id ? 'rgba(99,102,241,.15)' : 'transparent',
                        color: aiStyle === s.id ? '#a5b4fc' : 'var(--text4)' }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plataforma target */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px' }}>Generar para</div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  {[{ id: 'facebook', label: '📘 Facebook' }, { id: 'instagram', label: '📸 Instagram' }].map(p => (
                    <button key={p.id} onClick={() => setPlatform(p.id)}
                      style={{ padding: '4px 12px', borderRadius: '5px', border: '1px solid', cursor: 'pointer', fontSize: '11px', fontWeight: '600', fontFamily: 'inherit', transition: 'all .15s',
                        borderColor: platform === p.id ? '#60a5fa' : 'rgba(255,255,255,.08)',
                        background: platform === p.id ? 'rgba(96,165,250,.12)' : 'transparent',
                        color: platform === p.id ? '#60a5fa' : 'var(--text4)' }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {aiError && (
                <div style={{ marginBottom: '10px', padding: '8px 10px', background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)', borderRadius: '6px', fontSize: '11px', color: '#f87171' }}>
                  ✗ {aiError}
                </div>
              )}

              <button onClick={generatePosts}
                disabled={generatingPosts || (aiMode === 'tendencia' && !selectedTrend) || (aiMode === 'libre' && !customPrompt.trim())}
                style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', opacity: (generatingPosts || (aiMode === 'tendencia' && !selectedTrend) || (aiMode === 'libre' && !customPrompt.trim())) ? 0.5 : 1, transition: 'opacity .15s' }}>
                {generatingPosts ? '⏳ Generando 3 variaciones...' : '✨ Generar ideas de post'}
              </button>
            </div>
          </div>

          {/* RIGHT: Posts generados */}
          <div style={{ flex: '1 1 340px', minWidth: '300px' }}>
            {generatingPosts && (
              <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '32px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid rgba(99,102,241,.3)', borderTop: '2px solid #6366f1', animation: 'spin .8s linear infinite' }}></div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>La IA está escribiendo...</div>
                <div style={{ fontSize: '11px', color: 'var(--text4)', textAlign: 'center' }}>Generando 3 variaciones de copy para {platform === 'instagram' ? 'Instagram' : 'Facebook'}...</div>
              </div>
            )}

            {generatedPosts.length > 0 && !generatingPosts && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text4)', fontFamily: 'monospace' }}>3 variaciones generadas — elige la que más te guste:</div>
                {generatedPosts.map((p, i) => (
                  <div key={i} style={{ ...cardStyle, border: '1px solid rgba(99,102,241,.2)', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>{p.emoji_principal || '✍️'}</span>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#a5b4fc' }}>{p.variacion}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text4)', fontFamily: 'monospace' }}>{p.caracteres || p.texto?.length || 0} chars</div>
                        </div>
                      </div>
                      <button onClick={() => useGeneratedPost(p.texto)}
                        style={{ padding: '6px 14px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: '7px', color: '#fff', fontSize: '11px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                        Usar este →
                      </button>
                    </div>
                    {p.hook && (
                      <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '600', marginBottom: '6px', padding: '5px 8px', background: 'rgba(251,191,36,.08)', borderRadius: '5px', borderLeft: '2px solid #fbbf24' }}>
                        🪝 {p.hook}
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: 'var(--text)', lineHeight: '1.55', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '180px', overflowY: 'auto', padding: '8px', background: 'rgba(255,255,255,.03)', borderRadius: '6px', marginBottom: '8px' }}>
                      {p.texto}
                    </div>
                    {p.hashtags?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {p.hashtags.slice(0,8).map((h, hi) => (
                          <span key={hi} style={{ fontSize: '10px', color: '#60a5fa', background: 'rgba(96,165,250,.1)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>{h}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {generatedPosts.length === 0 && !generatingPosts && (
              <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 20px', color: 'var(--text4)' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>🤖</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>Asistente IA Copywriter</div>
                <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                  Selecciona una tendencia del día o escribe tu propio prompt, elige el tono y genera 3 variaciones de post listas para publicar.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ COMPOSITOR TAB ═══ */}
      {mainTab === 'compositor' && (
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* LEFT: Composer */}
        <div style={{ flex: '1 1 380px', minWidth: '320px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Page selector */}
          <div style={cardStyle}>
            <div style={{ fontSize: '11px', color: 'var(--text4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '10px' }}>Página</div>
            {pages.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text4)' }}>No se encontraron páginas de Facebook conectadas a este token.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {pages.map(p => (
                  <div
                    key={p.id}
                    className="pub-page-opt"
                    onClick={() => setSelectedPage(p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                      background: selectedPage?.id === p.id ? 'rgba(99,102,241,.14)' : 'transparent',
                      border: selectedPage?.id === p.id ? '1px solid rgba(99,102,241,.3)' : '1px solid transparent',
                    }}>
                    {p.picture?.data?.url
                      ? <img src={p.picture.data.url} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1877f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#fff', flexShrink: 0 }}>f</div>
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: selectedPage?.id === p.id ? '#a5b4fc' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text4)' }}>
                        {fmt(p.fan_count)} seguidores
                        {p.instagram_business_account && <span style={{ marginLeft: '6px', color: '#dc2743' }}>· IG: {p.instagram_business_account.name || p.instagram_business_account.id}</span>}
                      </div>
                    </div>
                    {selectedPage?.id === p.id && <span style={{ fontSize: '10px', color: '#a5b4fc', flexShrink: 0 }}>✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Platform tabs */}
          <div style={{ ...cardStyle, padding: '12px 16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '10px' }}>Plataforma</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className={`pub-tab${platform === 'facebook' ? ' pub-tab-active' : ''}`} onClick={() => setPlatform('facebook')}>
                📘 Facebook
              </button>
              <button
                className={`pub-tab${platform === 'instagram' ? ' pub-tab-active' : ''}`}
                onClick={() => setPlatform('instagram')}
                disabled={!igAccount}
                style={{ opacity: igAccount ? 1 : 0.4, cursor: igAccount ? 'pointer' : 'not-allowed' }}
                title={!igAccount ? 'Esta página no tiene Instagram Business vinculado' : ''}>
                📸 Instagram
              </button>
            </div>
            {platform === 'instagram' && !igAccount && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#f87171' }}>
                Esta página no tiene una cuenta de Instagram Business vinculada.
              </div>
            )}
          </div>

          {/* Composer */}
          <div style={cardStyle}>
            <div style={{ fontSize: '11px', color: 'var(--text4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '10px' }}>Mensaje / Caption</div>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder={platform === 'instagram' ? 'Escribe tu caption de Instagram...' : 'Escribe tu mensaje de Facebook...'}
              style={{
                width: '100%', minHeight: '120px', background: 'rgba(255,255,255,.04)', border: `1px solid ${charOver ? '#f87171' : 'var(--border)'}`,
                borderRadius: '8px', color: 'var(--text)', fontSize: '13px', padding: '10px 12px', resize: 'vertical',
                fontFamily: '"Plus Jakarta Sans",system-ui,sans-serif', lineHeight: '1.5', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <span style={{ fontSize: '10px', color: charOver ? '#f87171' : 'var(--text4)', fontWeight: charOver ? '700' : '400' }}>
                {charCount.toLocaleString()} / {charLimit.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Image URL */}
          <div style={cardStyle}>
            <div style={{ fontSize: '11px', color: 'var(--text4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '10px' }}>
              URL de Imagen <span style={{ color: platform === 'instagram' ? '#f87171' : 'var(--text4)', fontWeight: platform === 'instagram' ? '700' : '400' }}>{platform === 'instagram' ? '(requerida)' : '(opcional)'}</span>
            </div>
            <input
              type="url"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://ejemplo.com/imagen.jpg"
              style={{
                width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)',
                borderRadius: '8px', color: 'var(--text)', fontSize: '12px', padding: '8px 12px',
                fontFamily: '"Plus Jakarta Sans",system-ui,sans-serif', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Link (Facebook only) */}
          {platform === 'facebook' && (
            <div style={cardStyle}>
              <div style={{ fontSize: '11px', color: 'var(--text4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '10px' }}>URL / Link (opcional)</div>
              <input
                type="url"
                value={link}
                onChange={e => setLink(e.target.value)}
                placeholder="https://ejemplo.com/articulo"
                style={{
                  width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)',
                  borderRadius: '8px', color: 'var(--text)', fontSize: '12px', padding: '8px 12px',
                  fontFamily: '"Plus Jakarta Sans",system-ui,sans-serif', boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* Feedback */}
          {success && (
            <div style={{ background: 'rgba(110,231,183,.1)', border: '1px solid rgba(110,231,183,.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✓</span> {success}
            </div>
          )}
          {error && (
            <div style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✗</span> {error}
            </div>
          )}

          {/* Post button */}
          <button
            className="pub-btn"
            onClick={handlePost}
            disabled={posting || !caption.trim() || charOver || !selectedPage || (platform === 'instagram' && !igAccount)}
            style={{
              padding: '11px 20px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
              border: 'none', borderRadius: '9px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px',
              fontWeight: '700', width: '100%', opacity: (posting || !caption.trim() || charOver || !selectedPage || (platform === 'instagram' && !igAccount)) ? 0.5 : 1,
              transition: 'opacity .15s',
            }}>
            {posting ? 'Publicando...' : platform === 'instagram' ? '📸 Publicar en Instagram' : '📘 Publicar en Facebook'}
          </button>
        </div>

        {/* RIGHT: Preview + Recent posts */}
        <div style={{ flex: '1 1 300px', minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Preview */}
          <div style={cardStyle}>
            <div style={{ fontSize: '11px', color: 'var(--text4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '12px' }}>Vista Previa</div>
            <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: '10px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              {/* Post header */}
              <div style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '9px' }}>
                {selectedPage?.picture?.data?.url
                  ? <img src={selectedPage.picture.data.url} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: platform === 'instagram' ? 'linear-gradient(135deg,#f09433,#dc2743,#bc1888)' : '#1877f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#fff', flexShrink: 0 }}>{platform === 'instagram' ? '📷' : 'f'}</div>
                }
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)' }}>
                    {platform === 'instagram' ? (igAccount?.name || selectedPage?.name || 'Tu cuenta') : (selectedPage?.name || 'Tu Página')}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text4)', marginTop: '1px' }}>Ahora · {platform === 'instagram' ? '📸 Instagram' : '🌐 Público'}</div>
                </div>
              </div>
              {/* Caption */}
              {caption && (
                <div style={{ padding: '0 12px 12px', fontSize: '12px', color: 'var(--text)', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {caption}
                </div>
              )}
              {/* Image preview */}
              {imageUrl.trim() && (
                <div style={{ width: '100%', maxHeight: '200px', overflow: 'hidden', background: 'rgba(0,0,0,.2)' }}>
                  <img
                    src={imageUrl}
                    alt="preview"
                    style={{ width: '100%', objectFit: 'cover', display: 'block' }}
                    onError={e => { e.target.style.display = 'none' }}
                  />
                </div>
              )}
              {/* Link preview (FB) */}
              {platform === 'facebook' && link.trim() && !imageUrl.trim() && (
                <div style={{ margin: '0 12px 12px', padding: '8px 10px', background: 'rgba(255,255,255,.04)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text4)', wordBreak: 'break-all' }}>{link}</div>
                </div>
              )}
              {!caption && !imageUrl && (
                <div style={{ padding: '0 12px 16px', fontSize: '12px', color: 'var(--text4)', fontStyle: 'italic' }}>
                  Escribe algo para ver la vista previa...
                </div>
              )}
              {/* Fake engagement bar */}
              <div style={{ borderTop: '1px solid var(--border)', padding: '8px 12px', display: 'flex', gap: '14px' }}>
                {['👍 Me gusta', '💬 Comentar', '↗ Compartir'].map(a => (
                  <span key={a} style={{ fontSize: '10px', color: 'var(--text4)' }}>{a}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Recent posts */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '.07em' }}>Publicaciones Recientes</div>
              <button
                onClick={loadRecentPosts}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text4)', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontFamily: 'inherit' }}>
                ↻ Actualizar
              </button>
            </div>

            {loadingPosts ? (
              <div style={{ fontSize: '12px', color: 'var(--text4)', padding: '8px 0' }}>Cargando...</div>
            ) : recentPosts.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text4)', padding: '8px 0' }}>No hay publicaciones recientes.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentPosts.map(post => {
                  const msg = post.message || post.caption || ''
                  const truncated = msg.length > 80 ? msg.slice(0, 80) + '...' : msg
                  const likes = post.likes?.summary?.total_count ?? post.like_count ?? 0
                  const comments = post.comments?.summary?.total_count ?? post.comments_count ?? 0
                  const date = post.created_time || post.timestamp
                  return (
                    <div key={post.id} style={{ padding: '9px 10px', background: 'rgba(255,255,255,.03)', borderRadius: '7px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text)', lineHeight: '1.4', marginBottom: '5px', wordBreak: 'break-word' }}>
                        {truncated || <span style={{ color: 'var(--text4)', fontStyle: 'italic' }}>[Sin texto]</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text4)' }}>{fmtDate(date)}</span>
                        <span style={{ fontSize: '9px', color: 'var(--text4)' }}>👍 {fmt(likes)}</span>
                        <span style={{ fontSize: '9px', color: 'var(--text4)' }}>💬 {fmt(comments)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
