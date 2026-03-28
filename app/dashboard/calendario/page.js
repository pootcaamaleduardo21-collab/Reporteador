'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function postStyle(platform, status) {
  if (status === 'scheduled' || status === 'pending')
    return { bg: '#f59e0b', label: '⏰', name: 'Programado' }
  if (status === 'failed')
    return { bg: '#ef4444', label: '✗', name: 'Fallido' }
  if (platform === 'instagram')
    return { bg: 'linear-gradient(135deg,#f09433 0%,#dc2743 50%,#bc1888 100%)', label: '📸', name: 'Instagram' }
  if (platform === 'tiktok')
    return { bg: '#010101', label: '🎵', name: 'TikTok' }
  return { bg: '#1877f2', label: '📘', name: 'Facebook' }
}

function fmtTime(str) {
  if (!str) return ''
  try { return new Date(str).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) }
  catch { return str }
}

export default function CalendarioPage() {
  const router = useRouter()
  const [user, setUser]           = useState(null)
  const [token, setToken]         = useState(null)
  const [pages, setPages]         = useState([])
  const [selectedPage, setSelectedPage] = useState(null)
  const [year, setYear]           = useState(new Date().getFullYear())
  const [month, setMonth]         = useState(new Date().getMonth())
  const [posts, setPosts]         = useState([])
  const [selectedDay, setSelectedDay]   = useState(null)
  const [loading, setLoading]     = useState(false)
  const [loadingInit, setLoadingInit]   = useState(true)

  // ── Init: user + token + pages ──
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)

      const { data: tokenRow } = await supabase
        .from('meta_tokens').select('access_token').eq('user_id', user.id).single()
      if (!tokenRow?.access_token) { setLoadingInit(false); return }
      const tok = tokenRow.access_token
      setToken(tok)

      try {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,fan_count,picture,instagram_business_account{id,name}&access_token=${tok}&limit=25`
        )
        const d = await res.json()
        if (d.data?.length > 0) { setPages(d.data); setSelectedPage(d.data[0]) }
      } catch {}
      setLoadingInit(false)
    }
    init()
  }, [])

  // ── Load posts when page/month/year changes ──
  useEffect(() => {
    if (selectedPage && user) loadPosts()
  }, [selectedPage, year, month, user])

  async function loadPosts() {
    if (!selectedPage) return
    setLoading(true)
    const all = []
    const pageTok = selectedPage.access_token
    const monthStart = new Date(year, month, 1)
    const monthEnd   = new Date(year, month + 1, 0, 23, 59, 59)
    const since = Math.floor(monthStart.getTime() / 1000)
    const until = Math.floor(monthEnd.getTime() / 1000)

    // 1. Facebook published
    try {
      const r = await fetch(
        `https://graph.facebook.com/v21.0/${selectedPage.id}/feed?fields=id,message,created_time,full_picture,permalink_url&since=${since}&until=${until}&limit=80&access_token=${pageTok}`
      )
      const d = await r.json()
      for (const p of d.data || []) {
        const date = p.created_time?.split('T')[0]
        if (!date) continue
        all.push({ id: p.id, date, platform: 'facebook', status: 'published',
          text: p.message || '[Sin texto]', image: p.full_picture, url: p.permalink_url,
          time: p.created_time })
      }
    } catch {}

    // 2. Facebook scheduled (Meta nativo)
    try {
      const r = await fetch(
        `https://graph.facebook.com/v21.0/${selectedPage.id}/scheduled_posts?fields=id,message,scheduled_publish_time,full_picture&access_token=${pageTok}&limit=80`
      )
      const d = await r.json()
      for (const p of d.data || []) {
        if (!p.scheduled_publish_time) continue
        const dt = new Date(p.scheduled_publish_time * 1000)
        if (dt.getFullYear() !== year || dt.getMonth() !== month) continue
        const date = dt.toISOString().split('T')[0]
        all.push({ id: p.id, date, platform: 'facebook', status: 'scheduled',
          text: p.message || '[Sin texto]', image: p.full_picture,
          scheduledFor: dt.toISOString(), time: dt.toISOString() })
      }
    } catch {}

    // 3. Instagram published
    const igId = selectedPage.instagram_business_account?.id
    if (igId) {
      try {
        const r = await fetch(
          `https://graph.facebook.com/v21.0/${igId}/media?fields=id,caption,timestamp,media_type,media_url,permalink&since=${since}&until=${until}&limit=80&access_token=${pageTok}`
        )
        const d = await r.json()
        for (const p of d.data || []) {
          const date = p.timestamp?.split('T')[0]
          if (!date) continue
          all.push({ id: p.id, date, platform: 'instagram', status: 'published',
            text: p.caption || '[Sin caption]', image: p.media_url, url: p.permalink,
            mediaType: p.media_type, time: p.timestamp })
        }
      } catch {}
    }

    // 4. Programados locales (Supabase)
    if (user) {
      const { data: dbPosts } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('user_id', user.id)
        .eq('page_id', selectedPage.id)
        .gte('scheduled_for', monthStart.toISOString())
        .lte('scheduled_for', monthEnd.toISOString())
        .order('scheduled_for', { ascending: true })

      for (const p of dbPosts || []) {
        const date = p.scheduled_for?.split('T')[0]
        if (!date) continue
        all.push({ id: `db_${p.id}`, dbId: p.id, date, platform: p.platform,
          status: p.status || 'pending', text: p.caption || '[Sin texto]',
          image: p.image_url, scheduledFor: p.scheduled_for, time: p.scheduled_for })
      }
    }

    // Sort by time within each day
    all.sort((a, b) => new Date(a.time) - new Date(b.time))
    setPosts(all)
    setLoading(false)
  }

  // ── Calendar math ──
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay    = new Date(year, month, 1).getDay() // 0=Sun
  const todayStr    = new Date().toISOString().split('T')[0]

  function prevMonth() {
    setSelectedDay(null)
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    setSelectedDay(null)
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // Group posts by date
  const byDate = {}
  for (const p of posts) {
    if (!byDate[p.date]) byDate[p.date] = []
    byDate[p.date].push(p)
  }

  const dayPosts = selectedDay ? (byDate[selectedDay] || []) : []

  // Stats
  const publishedFb = posts.filter(p => p.platform === 'facebook' && p.status === 'published').length
  const publishedIg = posts.filter(p => p.platform === 'instagram' && p.status === 'published').length
  const scheduled   = posts.filter(p => p.status === 'scheduled' || p.status === 'pending').length

  if (loadingInit) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#555',fontSize:'12px',fontFamily:'monospace'}}>
      Cargando calendario...
    </div>
  )

  if (!token) return (
    <div style={{padding:'32px',fontFamily:'"Plus Jakarta Sans",system-ui,sans-serif'}}>
      <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'12px',padding:'24px',maxWidth:'480px',textAlign:'center'}}>
        <div style={{fontSize:'32px',marginBottom:'12px'}}>📅</div>
        <div style={{fontSize:'15px',fontWeight:'700',color:'var(--text)',marginBottom:'8px'}}>Conecta Meta para ver el calendario</div>
        <div style={{fontSize:'12px',color:'var(--text4)',marginBottom:'20px'}}>
          Necesitas conectar tu cuenta de Facebook para ver y programar publicaciones.
        </div>
        <button onClick={() => router.push('/dashboard/platforms')}
          style={{padding:'9px 20px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',borderRadius:'8px',cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:'600'}}>
          Ir a Plataformas →
        </button>
      </div>
    </div>
  )

  return (
    <div style={{padding:'20px 24px',fontFamily:'"Plus Jakarta Sans",system-ui,sans-serif',color:'var(--text)',height:'100%',overflowY:'auto'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .cal-day:hover { background: rgba(255,255,255,.05) !important; }
        .cal-day-selected { background: rgba(99,102,241,.12) !important; border-color: rgba(99,102,241,.4) !important; }
        .page-opt:hover { background: rgba(255,255,255,.06) !important; }
      `}</style>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'12px',marginBottom:'20px'}}>
        <div>
          <div style={{fontSize:'18px',fontWeight:'800',color:'var(--text)',marginBottom:'4px'}}>Calendario de Contenido</div>
          <div style={{fontSize:'12px',color:'var(--text4)'}}>Publicaciones y programaciones de Facebook e Instagram</div>
        </div>
        <button onClick={() => router.push('/dashboard/publicar')}
          style={{padding:'8px 16px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',borderRadius:'8px',color:'#fff',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>
          ✏️ Crear / Programar post
        </button>
      </div>

      {/* Page selector */}
      {pages.length > 1 && (
        <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'16px'}}>
          {pages.map(p => (
            <div key={p.id} className="page-opt" onClick={() => { setSelectedPage(p); setSelectedDay(null) }}
              style={{display:'flex',alignItems:'center',gap:'7px',padding:'6px 10px',borderRadius:'8px',cursor:'pointer',transition:'background .15s',
                background:selectedPage?.id===p.id?'rgba(99,102,241,.14)':'rgba(255,255,255,.03)',
                border:`1px solid ${selectedPage?.id===p.id?'rgba(99,102,241,.35)':'var(--border)'}`}}>
              {p.picture?.data?.url
                ? <img src={p.picture.data.url} alt="" style={{width:'18px',height:'18px',borderRadius:'50%',objectFit:'cover'}} />
                : <div style={{width:'18px',height:'18px',borderRadius:'50%',background:'#1877f2',fontSize:'9px',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>f</div>}
              <span style={{fontSize:'11px',fontWeight:'600',color:selectedPage?.id===p.id?'#a5b4fc':'var(--text)'}}>{p.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats bar */}
      <div style={{display:'flex',gap:'10px',flexWrap:'wrap',marginBottom:'16px'}}>
        {[
          { label:'Facebook publicados', value: publishedFb, color:'#1877f2', bg:'rgba(24,119,242,.1)' },
          { label:'Instagram publicados', value: publishedIg, color:'#dc2743', bg:'rgba(220,39,67,.1)' },
          { label:'Programados', value: scheduled, color:'#f59e0b', bg:'rgba(245,158,11,.1)' },
          { label:'Total del mes', value: posts.length, color:'#a5b4fc', bg:'rgba(99,102,241,.1)' },
        ].map(s => (
          <div key={s.label} style={{padding:'8px 14px',background:s.bg,border:`1px solid ${s.color}30`,borderRadius:'8px',display:'flex',gap:'8px',alignItems:'center'}}>
            <span style={{fontSize:'16px',fontWeight:'800',color:s.color}}>{s.value}</span>
            <span style={{fontSize:'10px',color:'var(--text4)',fontWeight:'600'}}>{s.label}</span>
          </div>
        ))}
        {loading && <div style={{fontSize:'11px',color:'var(--text4)',display:'flex',alignItems:'center',gap:'6px'}}>
          <div style={{width:'10px',height:'10px',borderRadius:'50%',border:'2px solid rgba(99,102,241,.3)',borderTop:'2px solid #6366f1',animation:'spin .8s linear infinite'}}></div>
          Cargando...
        </div>}
      </div>

      <div style={{display:'flex',gap:'16px',alignItems:'flex-start',flexWrap:'wrap'}}>

        {/* Calendar */}
        <div style={{flex:'1 1 420px',minWidth:'340px',background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'12px',overflow:'hidden'}}>
          {/* Month nav */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',borderBottom:'1px solid var(--border)'}}>
            <button onClick={prevMonth}
              style={{padding:'5px 10px',background:'rgba(255,255,255,.05)',border:'1px solid var(--border)',borderRadius:'6px',color:'var(--text4)',fontSize:'13px',cursor:'pointer',fontFamily:'inherit',lineHeight:1}}>
              ‹
            </button>
            <div style={{fontSize:'14px',fontWeight:'800',color:'var(--text)'}}>
              {MONTHS_ES[month]} {year}
            </div>
            <button onClick={nextMonth}
              style={{padding:'5px 10px',background:'rgba(255,255,255,.05)',border:'1px solid var(--border)',borderRadius:'6px',color:'var(--text4)',fontSize:'13px',cursor:'pointer',fontFamily:'inherit',lineHeight:1}}>
              ›
            </button>
          </div>

          {/* Day headers */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:'1px solid var(--border)'}}>
            {DAYS_ES.map(d => (
              <div key={d} style={{textAlign:'center',padding:'8px 4px',fontSize:'10px',fontWeight:'700',color:'var(--text4)',letterSpacing:'.05em',textTransform:'uppercase'}}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
            {/* Empty cells before first day */}
            {Array.from({length: firstDay}).map((_,i) => (
              <div key={`e${i}`} style={{minHeight:'72px',borderRight:'1px solid var(--border)',borderBottom:'1px solid var(--border)',background:'rgba(0,0,0,.08)'}} />
            ))}

            {/* Day cells */}
            {Array.from({length: daysInMonth}).map((_, i) => {
              const dayNum = i + 1
              const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`
              const dayPostList = byDate[dateStr] || []
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDay
              const col = (firstDay + i) % 7
              const isBorderRight = col < 6
              const fbCount  = dayPostList.filter(p => p.platform==='facebook'  && p.status==='published').length
              const igCount  = dayPostList.filter(p => p.platform==='instagram' && p.status==='published').length
              const schCount = dayPostList.filter(p => p.status==='scheduled' || p.status==='pending').length

              return (
                <div key={dayNum} className={`cal-day${isSelected?' cal-day-selected':''}`}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  style={{minHeight:'72px',padding:'6px',cursor:'pointer',transition:'background .12s',
                    borderRight:isBorderRight?'1px solid var(--border)':'none',
                    borderBottom:'1px solid var(--border)',
                    background:isToday?'rgba(99,102,241,.07)':'transparent',
                    border:isSelected?'1px solid rgba(99,102,241,.4)':''}}>

                  <div style={{fontSize:'11px',fontWeight:isToday?'800':'600',
                    color:isToday?'#a5b4fc':'var(--text4)',marginBottom:'4px',
                    background:isToday?'rgba(99,102,241,.2)':'transparent',
                    borderRadius:'50%',width:'20px',height:'20px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {dayNum}
                  </div>

                  <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
                    {fbCount > 0 && (
                      <div style={{height:'4px',borderRadius:'2px',background:'#1877f2',fontSize:'0'}} title={`${fbCount} Facebook`} />
                    )}
                    {igCount > 0 && (
                      <div style={{height:'4px',borderRadius:'2px',background:'linear-gradient(90deg,#f09433,#dc2743)',fontSize:'0'}} title={`${igCount} Instagram`} />
                    )}
                    {schCount > 0 && (
                      <div style={{height:'4px',borderRadius:'2px',background:'#f59e0b',fontSize:'0'}} title={`${schCount} Programados`} />
                    )}
                  </div>

                  {dayPostList.length > 0 && (
                    <div style={{fontSize:'9px',color:'var(--text4)',marginTop:'3px',fontWeight:'600'}}>
                      {dayPostList.length} post{dayPostList.length>1?'s':''}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{padding:'10px 14px',borderTop:'1px solid var(--border)',display:'flex',gap:'14px',flexWrap:'wrap'}}>
            {[
              { color:'#1877f2', label:'Facebook publicado' },
              { color:'#dc2743', label:'Instagram publicado' },
              { color:'#f59e0b', label:'Programado' },
            ].map(l => (
              <div key={l.label} style={{display:'flex',alignItems:'center',gap:'5px'}}>
                <div style={{width:'10px',height:'4px',borderRadius:'2px',background:l.color}} />
                <span style={{fontSize:'9px',color:'var(--text4)'}}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Day detail panel */}
        <div style={{flex:'0 1 300px',minWidth:'260px',display:'flex',flexDirection:'column',gap:'12px'}}>
          {!selectedDay ? (
            <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'12px',padding:'32px 20px',textAlign:'center'}}>
              <div style={{fontSize:'32px',marginBottom:'10px'}}>📅</div>
              <div style={{fontSize:'13px',fontWeight:'600',color:'var(--text)',marginBottom:'6px'}}>Selecciona un día</div>
              <div style={{fontSize:'11px',color:'var(--text4)',lineHeight:'1.6'}}>
                Haz clic en cualquier día del calendario para ver los posts publicados y programados.
              </div>
            </div>
          ) : (
            <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'12px',overflow:'hidden'}}>
              <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontSize:'13px',fontWeight:'800',color:'var(--text)'}}>
                    {new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'})}
                  </div>
                  <div style={{fontSize:'10px',color:'var(--text4)',marginTop:'1px'}}>{dayPosts.length} publicaciones</div>
                </div>
                <button onClick={() => setSelectedDay(null)}
                  style={{background:'transparent',border:'none',color:'var(--text4)',cursor:'pointer',fontSize:'16px',padding:'2px 6px'}}>×</button>
              </div>

              {dayPosts.length === 0 ? (
                <div style={{padding:'24px',textAlign:'center',fontSize:'12px',color:'var(--text4)'}}>
                  Sin publicaciones este día.
                  <br />
                  <button onClick={() => router.push('/dashboard/publicar')}
                    style={{marginTop:'10px',padding:'6px 12px',background:'rgba(99,102,241,.15)',border:'1px solid rgba(99,102,241,.3)',borderRadius:'6px',color:'#a5b4fc',fontSize:'11px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>
                    + Crear post
                  </button>
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:'0'}}>
                  {dayPosts.map((p, i) => {
                    const s = postStyle(p.platform, p.status)
                    return (
                      <div key={p.id} style={{padding:'12px 14px',borderBottom:i<dayPosts.length-1?'1px solid var(--border)':'none'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'7px',marginBottom:'6px'}}>
                          <div style={{width:'6px',height:'6px',borderRadius:'50%',background:s.bg.includes('gradient')?'#dc2743':s.bg,flexShrink:0}} />
                          <span style={{fontSize:'10px',fontWeight:'700',color:'var(--text4)',textTransform:'uppercase',letterSpacing:'.05em'}}>{s.name}</span>
                          {p.mediaType && <span style={{fontSize:'9px',color:'var(--text4)',background:'rgba(255,255,255,.06)',padding:'1px 5px',borderRadius:'3px'}}>{p.mediaType}</span>}
                        </div>

                        {p.image && (
                          <img src={p.image} alt="" style={{width:'100%',height:'80px',objectFit:'cover',borderRadius:'6px',marginBottom:'6px',display:'block'}}
                            onError={e => e.target.style.display='none'} />
                        )}

                        <div style={{fontSize:'12px',color:'var(--text)',lineHeight:'1.45',whiteSpace:'pre-wrap',wordBreak:'break-word',
                          maxHeight:'80px',overflowY:'auto',marginBottom:'5px'}}>
                          {p.text.length > 140 ? p.text.slice(0,140)+'…' : p.text}
                        </div>

                        <div style={{fontSize:'10px',color:'var(--text4)'}}>
                          {(p.status==='scheduled'||p.status==='pending')
                            ? `⏰ Programado: ${fmtTime(p.scheduledFor)}`
                            : `✓ ${fmtTime(p.time)}`}
                        </div>

                        {p.url && (
                          <a href={p.url} target="_blank" rel="noopener noreferrer"
                            style={{display:'inline-block',marginTop:'6px',fontSize:'10px',color:'#60a5fa',textDecoration:'none',fontWeight:'600'}}>
                            Ver post ↗
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TikTok coming soon */}
          <div style={{background:'rgba(1,1,1,.4)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'12px',padding:'14px 16px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px'}}>
              <span style={{fontSize:'16px'}}>🎵</span>
              <div style={{fontSize:'12px',fontWeight:'700',color:'#e0e0e0'}}>TikTok</div>
              <span style={{fontSize:'9px',padding:'2px 6px',background:'rgba(255,255,255,.08)',borderRadius:'4px',color:'#555',fontWeight:'600'}}>Próximamente</span>
            </div>
            <div style={{fontSize:'11px',color:'#555',lineHeight:'1.5'}}>
              La integración de TikTok requiere aprobación de su API de publicación oficial. Estamos en proceso de habilitarla.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
