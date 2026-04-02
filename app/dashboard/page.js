'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { usePlan } from '../lib/usePlan'
import { NICHES, DEFAULT_NICHE, NICHE_TOOLS, NICHE_TIPS } from '../lib/niches'

const fmtN = v => (+v||0)>=1e6?((+v/1e6).toFixed(1)+'M'):(+v||0)>=1e3?((+v/1e3).toFixed(1)+'K'):String(Math.round(+v||0))
const fmtDate = d => { try { return new Date(d).toLocaleDateString('es-MX',{day:'numeric',month:'short'}) } catch{return ''} }
const truncate = (str,n=85) => str&&str.length>n?str.slice(0,n)+'…':(str||'')
const fmtMXN = v => '$'+Number(v||0).toLocaleString('es-MX',{minimumFractionDigits:0,maximumFractionDigits:0})
const fmtCurrency = (v,dec=0) => '$'+Number(v||0).toLocaleString('es-MX',{minimumFractionDigits:dec,maximumFractionDigits:dec})

const MetaSVG = ({size=18}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)
const IGSVG = ({size=18}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)
const GoogleSVG = ({size=18}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

export default function DashboardHome() {
  const [user, setUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [metaToken, setMetaToken] = useState(null)
  const [fbPages, setFbPages] = useState([])
  const [igAccounts, setIgAccounts] = useState([])
  const [boostRadar, setBoostRadar] = useState([])
  const [loadingOrganic, setLoadingOrganic] = useState(false)
  const [loadingRadar, setLoadingRadar] = useState(false)
  const [loading, setLoading] = useState(true)
  // Pipeline de comisiones
  const [pipLeads, setPipLeads] = useState('')
  const [pipPrecio, setPipPrecio] = useState('')
  const [pipComision, setPipComision] = useState('3')
  const [pipCierre, setPipCierre] = useState('10')
  const [pipMeta, setPipMeta] = useState('')
  const { isPro, isAgency } = usePlan()
  const router = useRouter()

  // ── Onboarding de nicho (solo primera vez) ──
  const [showNicheModal, setShowNicheModal] = useState(false)
  const [selectedNiche, setSelectedNiche] = useState(DEFAULT_NICHE)
  const [activeNiche, setActiveNiche] = useState(DEFAULT_NICHE)
  // ── Tips carousel ──
  const [tipIdx, setTipIdx] = useState(0)
  const [agencyLinkRaw, setAgencyLinkRaw] = useState('')
  const agencyLink = agencyLinkRaw || 'https://www.junmkt.com/'

  const nicheTool = NICHE_TOOLS[activeNiche] || NICHE_TOOLS[DEFAULT_NICHE]
  const nicheObj = NICHES.find(n => n.id === activeNiche) || NICHES[0]

  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('kaan_prefs') || '{}')
      if (!prefs.niche) {
        setShowNicheModal(true)
      } else {
        setSelectedNiche(prefs.niche)
        setActiveNiche(prefs.niche)
      }
      if (prefs.agencyLink) setAgencyLinkRaw(prefs.agencyLink)
    } catch(e) {}
  }, [])

  function saveNiche() {
    try {
      const prefs = JSON.parse(localStorage.getItem('kaan_prefs') || '{}')
      prefs.niche = selectedNiche
      localStorage.setItem('kaan_prefs', JSON.stringify(prefs))
    } catch(e) {}
    setActiveNiche(selectedNiche)
    setShowNicheModal(false)
  }

  // ── Auto-advance tips carousel ──
  useEffect(() => {
    const tips = NICHE_TIPS[activeNiche] || NICHE_TIPS['real_estate']
    const timer = setInterval(() => setTipIdx(i => (i + 1) % tips.length), 6000)
    return () => clearInterval(timer)
  }, [activeNiche])

  function connectMeta() {
    if (!user) return
    const state = btoa(JSON.stringify({ uid: user.id, ts: Date.now() }))
    window.location.href = `/api/auth/meta?state=${encodeURIComponent(state)}`
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      const [{ data: accs }, { data: tokenRow }] = await Promise.all([
        supabase.from('ad_accounts').select('*').eq('user_id', user.id),
        supabase.from('meta_tokens').select('access_token').eq('user_id', user.id).single(),
      ])
      if (accs) setAccounts(accs)
      if (tokenRow?.access_token) {
        setMetaToken(tokenRow.access_token)
        fetchOrganicData(tokenRow.access_token)
      }
      setLoading(false)
    }
    init()
  }, [])

  async function fetchOrganicData(tok) {
    setLoadingOrganic(true)
    try {
      const [fbRes, igRes] = await Promise.all([
        fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,fan_count,followers_count,access_token&access_token=${tok}&limit=10`),
        fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account{id,name,followers_count,media_count}&access_token=${tok}&limit=10`),
      ])
      const fbJ = await fbRes.json()
      const igJ = await igRes.json()
      const pages = fbJ.data || []
      setFbPages(pages)
      const igAccs = (igJ.data||[]).filter(p=>p.instagram_business_account).map(p=>p.instagram_business_account)
      setIgAccounts(igAccs)
      if (pages.length > 0) fetchBoostRadar(pages)
    } catch(e) {}
    setLoadingOrganic(false)
  }

  async function fetchBoostRadar(pages) {
    setLoadingRadar(true)
    try {
      const allPosts = []
      const now = Date.now()
      // Fetch ALL pages with access_token (no limit — el usuario puede tener muchas)
      await Promise.all(pages.filter(p=>p.access_token).map(async page => {
        try {
          const res = await fetch(`https://graph.facebook.com/v21.0/${page.id}/posts?fields=id,message,created_time,full_picture,likes.limit(1).summary(true),comments.limit(1).summary(true),shares&limit=20&access_token=${page.access_token}`)
          const j = await res.json()
          if (!j.data) return
          const fanCount = Math.max(page.fan_count || 0, 1)
          for (const post of j.data) {
            const likes = post.likes?.summary?.total_count || 0
            const comments = post.comments?.summary?.total_count || 0
            const shares = post.shares?.count || 0
            const engagement = likes + comments + shares
            if (engagement < 2) continue // ignorar posts sin interacción mínima
            const er = (engagement / fanCount * 100)
            // Bonus de recencia: posts recientes son mejores candidatos para boost
            const ageMs = now - new Date(post.created_time).getTime()
            const ageDays = ageMs / 864e5
            const recencyBonus = ageDays < 7 ? 1.4 : ageDays < 30 ? 1.15 : ageDays < 90 ? 0.9 : 0.65
            const score = er * recencyBonus
            allPosts.push({ post, page, likes, comments, shares, engagement, er: parseFloat(er.toFixed(2)), score, ageDays: Math.round(ageDays) })
          }
        } catch(e) {}
      }))
      // Ordenar por score (er × recencia), mostrar top 6
      setBoostRadar(allPosts.sort((a,b)=>b.score-a.score).slice(0,6))
    } catch(e) {}
    setLoadingRadar(false)
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',background:'var(--bg)'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:'32px',height:'32px',borderRadius:'50%',border:'2px solid rgba(99,102,241,.3)',borderTop:'2px solid #6366f1',animation:'spin 1s linear infinite',margin:'0 auto 12px'}}></div>
        <div style={{fontSize:'12px',color:'var(--text4)'}}>Cargando tu dashboard...</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  const metaAccounts = accounts.filter(a=>a.platform==='meta_ads')
  const googleAccounts = accounts.filter(a=>a.platform==='google_ads')
  const tiktokAccounts = accounts.filter(a=>a.platform==='tiktok_ads')
  const hasAnyAccount = accounts.length > 0
  const hasMeta = metaAccounts.length > 0
  const hasGoogle = googleAccounts.length > 0
  const hasTiktok = tiktokAccounts.length > 0
  const hasFbPages = fbPages.length > 0
  const hasIG = igAccounts.length > 0
  const totalOrgFollowers = fbPages.reduce((s,p)=>s+(p.fan_count||0),0) + igAccounts.reduce((s,a)=>s+(a.followers_count||0),0)
  const activePlatformsCount = [hasMeta,hasGoogle,hasTiktok,hasFbPages,hasIG].filter(Boolean).length
  const boostCandidates = boostRadar.filter(p=>p.er>=1).length


  const activeNicheData = NICHES.find(n => n.id === activeNiche) || NICHES[0]

  return (
    <div style={{padding:'24px 28px',maxWidth:'1160px',fontFamily:'"Plus Jakarta Sans",sans-serif'}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes modalIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
        .hov-card{transition:border-color .2s,transform .15s,box-shadow .15s}
        .hov-card:hover{border-color:rgba(99,102,241,.38)!important;transform:translateY(-2px);box-shadow:0 6px 24px rgba(0,0,0,.25)}
        .tab-shortcut:hover{background:rgba(255,255,255,.08)!important;border-color:rgba(255,255,255,.14)!important}
        .tab-shortcut{transition:background .15s,border-color .15s}
        .boost-item:hover{border-color:rgba(250,204,21,.38)!important}
        .niche-opt{transition:all .15s;cursor:pointer}
        .niche-opt:hover{border-color:rgba(110,108,240,.4)!important;background:rgba(90,92,219,.08)!important}
        .boost-item{transition:border-color .2s}
        .plat-cta:hover{opacity:.85}
        .plat-cta{transition:opacity .15s}
        .tool-input{width:100%;padding:8px 12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:var(--text);font-family:inherit;font-size:12px;outline:none;box-sizing:border-box}
        .tool-input:focus{border-color:rgba(99,102,241,.5);background:rgba(99,102,241,.06)}
        .tool-input::placeholder{color:var(--text4)}
        .funnel-step{transition:opacity .2s}
        .funnel-step:hover{opacity:.85}
      `}</style>

      {/* ══ MODAL DE ONBOARDING: selector de nicho ══ */}
      {showNicheModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',backdropFilter:'blur(4px)'}}>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'20px',padding:'36px 32px',maxWidth:'600px',width:'100%',animation:'modalIn .25s ease',boxShadow:'0 20px 60px rgba(0,0,0,.5)'}}>

            {/* Encabezado */}
            <div style={{textAlign:'center',marginBottom:'28px'}}>
              <div style={{fontSize:'44px',marginBottom:'14px'}}>✦</div>
              <div style={{fontSize:'22px',fontWeight:'800',color:'var(--text)',marginBottom:'8px'}}>¿En qué industria trabajas?</div>
              <div style={{fontSize:'14px',color:'var(--text3)',lineHeight:'1.6',maxWidth:'380px',margin:'0 auto'}}>
                El Asistente IA, las tendencias del día y el contenido sugerido se adaptarán automáticamente a tu sector.
              </div>
            </div>

            {/* Grid de nichos */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'8px',marginBottom:'24px'}}>
              {NICHES.map(n => (
                <div key={n.id} className="niche-opt" onClick={() => setSelectedNiche(n.id)}
                  style={{padding:'14px 16px',borderRadius:'12px',
                    border:`1px solid ${selectedNiche===n.id?'rgba(110,108,240,.55)':'rgba(255,255,255,.07)'}`,
                    background:selectedNiche===n.id?'rgba(90,92,219,.13)':'rgba(255,255,255,.02)',
                    boxShadow:selectedNiche===n.id?'0 2px 14px rgba(90,92,219,.18)':'none'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <span style={{fontSize:'22px',flexShrink:0}}>{n.emoji}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'13px',fontWeight:'700',color:selectedNiche===n.id?'#9096e0':'var(--text)'}}>{n.label}</div>
                      <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'1px'}}>{n.desc}</div>
                    </div>
                    {selectedNiche===n.id && <span style={{fontSize:'14px',color:'#9096e0',flexShrink:0}}>✓</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button onClick={saveNiche}
              style={{width:'100%',padding:'14px',background:'linear-gradient(135deg,#5a5cdb,#7c55c8)',border:'none',borderRadius:'11px',color:'#fff',fontSize:'15px',fontWeight:'800',cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 18px rgba(90,92,219,.35)',transition:'opacity .15s'}}>
              Comenzar con {NICHES.find(n=>n.id===selectedNiche)?.label} {NICHES.find(n=>n.id===selectedNiche)?.emoji}
            </button>
            <div style={{textAlign:'center',marginTop:'10px',fontSize:'11px',color:'var(--text4)'}}>
              Puedes cambiarlo en cualquier momento desde Ajustes
            </div>
          </div>
        </div>
      )}

      {/* ══ HERO HEADER con gradiente ══ */}
      <div style={{
        background:'linear-gradient(135deg,rgba(99,102,241,.12) 0%,rgba(139,92,246,.08) 50%,rgba(16,185,129,.06) 100%)',
        border:'1px solid rgba(99,102,241,.2)',borderRadius:'16px',padding:'24px 28px',marginBottom:'24px',
        display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'16px',
        animation:'fadeIn .4s ease',
      }}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
            <span style={{fontSize:'24px'}}>👋</span>
            <h1 style={{fontSize:'22px',fontWeight:'800',color:'var(--text)',margin:0}}>
              Hola, {user?.email?.split('@')[0]}
            </h1>
          </div>
          <p style={{fontSize:'14px',color:'var(--text3)',margin:'0 0 16px',lineHeight:'1.6'}}>
            {activeNicheData.emoji} Tu centro de control de marketing · {activeNicheData.label} — orgánico + pagado en un solo lugar
          </p>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
            {(hasMeta||hasFbPages) && <span style={{fontSize:'12px',fontWeight:'600',padding:'4px 12px',borderRadius:'20px',background:'rgba(24,119,242,.1)',border:'1px solid rgba(24,119,242,.2)',color:'#7faee8'}}>✓ Meta conectado</span>}
            {hasGoogle && <span style={{fontSize:'12px',fontWeight:'600',padding:'4px 12px',borderRadius:'20px',background:'rgba(66,133,244,.08)',border:'1px solid rgba(66,133,244,.18)',color:'#8ab0e0'}}>✓ Google Ads</span>}
            {!hasAnyAccount && !metaToken && <span style={{fontSize:'10px',color:'var(--text4)'}}>Sin plataformas conectadas aún</span>}
          </div>
        </div>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
          <button onClick={()=>router.push('/dashboard/platforms')} className="plat-cta"
            style={{display:'flex',alignItems:'center',gap:'7px',padding:'10px 18px',borderRadius:'10px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',color:'#fff',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>
            + Conectar plataforma
          </button>
        </div>
      </div>

      {/* ══ ONBOARDING ══ */}
      {!hasAnyAccount && !metaToken && (
        <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'16px',padding:'52px 32px',textAlign:'center',marginBottom:'24px',animation:'fadeIn .5s ease'}}>
          <div style={{fontSize:'52px',marginBottom:'14px'}}>🏠</div>
          <h2 style={{fontSize:'20px',fontWeight:'800',color:'var(--text)',margin:'0 0 10px'}}>Conecta tus plataformas de marketing</h2>
          <p style={{fontSize:'13px',color:'var(--text4)',maxWidth:'460px',margin:'0 auto 24px',lineHeight:'1.7'}}>
            Vincula Meta Ads y Google Ads para ver el rendimiento de tus campañas inmobiliarias, y Facebook/Instagram para ver tu alcance orgánico.
          </p>
          <div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}>
            <button onClick={connectMeta} className="plat-cta" style={{display:'inline-flex',alignItems:'center',gap:'8px',padding:'12px 22px',borderRadius:'10px',background:'#1877f2',color:'#fff',fontSize:'13px',fontWeight:'700',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
              <MetaSVG size={15}/> Conectar Meta
            </button>
            <a href="/api/auth/google-ads/login" className="plat-cta" style={{display:'inline-flex',alignItems:'center',gap:'8px',padding:'12px 22px',borderRadius:'10px',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.12)',color:'var(--text)',fontSize:'13px',fontWeight:'700',textDecoration:'none'}}>
              <GoogleSVG size={15}/> Conectar Google Ads
            </a>
          </div>
        </div>
      )}

      {/* ══ STATS ROW (números grandes tipo Metricool) ══ */}
      {(hasAnyAccount || hasFbPages || hasIG) && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'24px',animation:'fadeIn .4s ease'}}>
          {[
            {label:'Seguidores orgánicos',value:fmtN(totalOrgFollowers),icon:'👥',sub:'Facebook + Instagram',gradient:'linear-gradient(135deg,rgba(52,211,153,.1),rgba(6,78,59,.06))',accent:'#6fcf97'},
            {label:'Plataformas activas',value:String(activePlatformsCount),icon:'🔗',sub:'redes conectadas',gradient:'linear-gradient(135deg,rgba(99,102,241,.1),rgba(67,56,202,.06))',accent:'#a5b4fc'},
            {label:'Cuentas de ads',value:String(accounts.length),icon:'💰',sub:'campañas pagadas',gradient:'linear-gradient(135deg,rgba(212,168,83,.12),rgba(150,100,20,.07))',accent:'#c49a45'},
            {label:'Boost Radar',value:loadingRadar?'…':String(boostCandidates),icon:'🚀',sub:loadingRadar?'Analizando…':'posts con potencial',gradient:'linear-gradient(135deg,rgba(192,120,160,.1),rgba(120,40,80,.06))',accent:'#c07898'},
          ].map((s,i)=>(
            <div key={i} style={{background:s.gradient,border:'1px solid rgba(255,255,255,.08)',borderRadius:'14px',padding:'18px 20px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'10px'}}>
                <span style={{fontSize:'15px'}}>{s.icon}</span>
                <span style={{fontSize:'11px',color:'var(--text3)',fontWeight:'600',textTransform:'uppercase',letterSpacing:'.05em'}}>{s.label}</span>
              </div>
              <div style={{fontSize:'34px',fontWeight:'800',color:s.accent,lineHeight:'1',marginBottom:'6px'}}>{s.value}</div>
              <div style={{fontSize:'12px',color:'var(--text3)'}}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ══ GRID: Orgánico + Pagado ══ */}
      {(hasAnyAccount || metaToken) && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'18px',marginBottom:'24px',animation:'fadeIn .45s ease'}}>

          {/* IZQUIERDA: Orgánico */}
          <div>
            <div style={{fontSize:'11px',fontWeight:'600',color:'var(--text3)',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:'12px',paddingLeft:'2px'}}>Redes Orgánicas</div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>

              {metaToken && (
                <div className="hov-card" onClick={()=>router.push('/dashboard/facebook')}
                  style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'13px',padding:'18px',cursor:'pointer'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:hasFbPages?'14px':'0'}}>
                    <div style={{width:'40px',height:'40px',borderRadius:'10px',background:'linear-gradient(135deg,#1877f2,#0a4fb5)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <MetaSVG size={20}/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'14px',fontWeight:'700',color:'var(--text)'}}>Facebook</div>
                      <div style={{fontSize:'12px',color:'var(--text3)'}}>Páginas y publicaciones</div>
                    </div>
                    {loadingOrganic
                      ? <div style={{width:'14px',height:'14px',borderRadius:'50%',border:'2px solid rgba(99,102,241,.3)',borderTop:'2px solid #6366f1',animation:'spin .8s linear infinite',flexShrink:0}}></div>
                      : <span style={{fontSize:'12px',color:'var(--text2)',fontWeight:'600',flexShrink:0}}>Ver →</span>
                    }
                  </div>
                  {hasFbPages && (
                    <div style={{display:'flex',gap:'24px'}}>
                      <div><div style={{fontSize:'26px',fontWeight:'800',color:'var(--text)',lineHeight:'1'}}>{fmtN(fbPages.reduce((s,p)=>s+(p.fan_count||0),0))}</div><div style={{fontSize:'12px',color:'var(--text3)',marginTop:'4px'}}>seguidores</div></div>
                      <div><div style={{fontSize:'26px',fontWeight:'800',color:'#60a5fa',lineHeight:'1'}}>{fbPages.length}</div><div style={{fontSize:'12px',color:'var(--text3)',marginTop:'4px'}}>página{fbPages.length!==1?'s':''}</div></div>
                    </div>
                  )}
                  {!loadingOrganic && !hasFbPages && <div style={{fontSize:'11px',color:'var(--text4)',marginTop:'8px'}}>No se encontraron páginas. <a href="/api/auth/meta" style={{color:'#a5b4fc',textDecoration:'none'}}>Reconectar →</a></div>}
                </div>
              )}

              {metaToken && (
                <div className="hov-card" onClick={()=>router.push('/dashboard/instagram')}
                  style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'13px',padding:'18px',cursor:'pointer'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:hasIG?'14px':'0'}}>
                    <div style={{width:'40px',height:'40px',borderRadius:'10px',background:'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <IGSVG size={20}/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'14px',fontWeight:'700',color:'var(--text)'}}>Instagram</div>
                      <div style={{fontSize:'12px',color:'var(--text3)'}}>Cuentas de negocio</div>
                    </div>
                    <span style={{fontSize:'12px',color:'var(--text2)',fontWeight:'600',flexShrink:0}}>Ver →</span>
                  </div>
                  {hasIG && (
                    <div style={{display:'flex',gap:'24px'}}>
                      <div><div style={{fontSize:'26px',fontWeight:'800',color:'var(--text)',lineHeight:'1'}}>{fmtN(igAccounts.reduce((s,a)=>s+(a.followers_count||0),0))}</div><div style={{fontSize:'12px',color:'var(--text3)',marginTop:'4px'}}>seguidores</div></div>
                      <div><div style={{fontSize:'26px',fontWeight:'800',color:'#e1306c',lineHeight:'1'}}>{igAccounts.reduce((s,a)=>s+(a.media_count||0),0)}</div><div style={{fontSize:'12px',color:'var(--text3)',marginTop:'4px'}}>posts</div></div>
                    </div>
                  )}
                  {!loadingOrganic && !hasIG && <div style={{fontSize:'11px',color:'var(--text4)',marginTop:'8px'}}>Conecta una cuenta Instagram Business vinculada a una Página.</div>}
                </div>
              )}

              {!metaToken && (
                <div style={{background:'rgba(24,119,242,.05)',border:'1px dashed rgba(24,119,242,.25)',borderRadius:'13px',padding:'22px',textAlign:'center'}}>
                  <div style={{fontSize:'13px',color:'#888',marginBottom:'12px'}}>Conecta Meta para ver Facebook e Instagram</div>
                  <button onClick={connectMeta} className="plat-cta" style={{display:'inline-flex',alignItems:'center',gap:'7px',padding:'9px 18px',borderRadius:'9px',background:'#1877f2',color:'#fff',fontSize:'12px',fontWeight:'700',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                    <MetaSVG size={13}/> Conectar Meta
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* DERECHA: Pagado */}
          <div>
            <div style={{fontSize:'11px',fontWeight:'600',color:'var(--text3)',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:'12px',paddingLeft:'2px'}}>Campañas Pagadas</div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>

              {hasMeta && (
                <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'13px',padding:'18px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px'}}>
                    <div style={{width:'40px',height:'40px',borderRadius:'10px',background:'linear-gradient(135deg,#1877f2,#0a4fb5)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <MetaSVG size={20}/>
                    </div>
                    <div>
                      <div style={{fontSize:'14px',fontWeight:'700',color:'var(--text)'}}>Meta Ads</div>
                      <div style={{fontSize:'12px',color:'var(--text3)'}}>{metaAccounts.length} cuenta{metaAccounts.length!==1?'s':''} · Facebook & Instagram</div>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
                    {[
                      {icon:'📊',label:'Resumen',tab:'overview'},
                      {icon:'🎯',label:'Campañas',tab:'campanas'},
                      {icon:'👥',label:'Conjuntos',tab:'conjuntos'},
                      {icon:'🖼',label:'Anuncios',tab:'anuncios'},
                      {icon:'🗺',label:'Audiencia',tab:'audiencia'},
                    ].map(t=>(
                      <button key={t.tab} className="tab-shortcut"
                        onClick={()=>router.push('/dashboard/reportes/'+metaAccounts[0].account_id+'?tab='+t.tab)}
                        style={{display:'flex',alignItems:'center',gap:'7px',padding:'9px 11px',background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',borderRadius:'8px',cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>
                        <span style={{fontSize:'13px'}}>{t.icon}</span>
                        <span style={{fontSize:'13px',color:'var(--text2)',fontWeight:'600'}}>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {hasGoogle && (
                <div className="hov-card" onClick={()=>router.push('/dashboard/reportes/'+googleAccounts[0].account_id)}
                  style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'13px',padding:'18px',cursor:'pointer'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                    <div style={{width:'40px',height:'40px',borderRadius:'10px',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <GoogleSVG size={22}/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'14px',fontWeight:'700',color:'var(--text)'}}>Google Ads</div>
                      <div style={{fontSize:'12px',color:'var(--text3)'}}>Search · Display · YouTube</div>
                    </div>
                    <span style={{fontSize:'12px',color:'var(--text2)',fontWeight:'600',flexShrink:0}}>Ver →</span>
                  </div>
                </div>
              )}

              {hasTiktok && (
                <div className="hov-card" onClick={()=>router.push('/dashboard/reportes/'+tiktokAccounts[0].account_id)}
                  style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'13px',padding:'18px',cursor:'pointer'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                    <div style={{width:'40px',height:'40px',borderRadius:'10px',background:'#010101',border:'1px solid rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/></svg>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'14px',fontWeight:'700',color:'var(--text)'}}>TikTok Ads</div>
                      <div style={{fontSize:'12px',color:'var(--text3)'}}>Campañas de TikTok</div>
                    </div>
                    <span style={{fontSize:'12px',color:'var(--text2)',fontWeight:'600',flexShrink:0}}>Ver →</span>
                  </div>
                </div>
              )}

              {!hasAnyAccount && (
                <div style={{background:'rgba(99,102,241,.04)',border:'1px dashed rgba(99,102,241,.2)',borderRadius:'13px',padding:'22px',textAlign:'center'}}>
                  <div style={{fontSize:'13px',color:'#888',marginBottom:'12px'}}>Conecta Meta Ads o Google Ads para ver campañas</div>
                  <div style={{display:'flex',gap:'8px',justifyContent:'center',flexWrap:'wrap'}}>
                    <button onClick={connectMeta} className="plat-cta" style={{display:'inline-flex',alignItems:'center',gap:'6px',padding:'8px 15px',borderRadius:'8px',background:'#1877f2',color:'#fff',fontSize:'11px',fontWeight:'700',border:'none',cursor:'pointer',fontFamily:'inherit'}}>
                      <MetaSVG size={12}/> Meta Ads
                    </button>
                    <a href="/api/auth/google-ads/login" className="plat-cta" style={{display:'inline-flex',alignItems:'center',gap:'6px',padding:'8px 15px',borderRadius:'8px',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.12)',color:'var(--text)',fontSize:'11px',fontWeight:'700',textDecoration:'none'}}>
                      <GoogleSVG size={12}/> Google Ads
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          HERRAMIENTAS POR NICHO (auto-detectado)
          ══════════════════════════════════════════════════ */}
      <div style={{marginBottom:'24px',animation:'fadeIn .5s ease'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'16px'}}>
          <span style={{fontSize:'11px',fontWeight:'600',padding:'5px 14px',borderRadius:'20px',background:'rgba(52,160,120,.08)',border:'1px solid rgba(52,160,120,.2)',color:'#5fad8c',letterSpacing:'.04em',whiteSpace:'nowrap'}}>
            {nicheObj.emoji} {nicheTool.label}
          </span>
          <div style={{flex:1,height:'1px',background:'var(--border)'}}></div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'14px'}}>

          {/* ─── 1. CALCULADORA DE NEGOCIO (por nicho) ─── */}
          {(() => {
            const c = nicheTool.calc
            const v1 = +pipLeads||0
            const v2 = +pipPrecio||0
            const v3 = +pipComision||(+c.f3D||0)
            const v4 = +pipCierre||(+c.f4D||0)
            const goal = +pipMeta||0
            const result = c.compute(v1,v2,v3,v4)
            const goalPct = goal > 0 ? Math.min((result/goal)*100, 100) : 0
            const hasData = v1 > 0 && v2 > 0
            return (
              <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'14px',padding:'20px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
                  <div style={{width:'34px',height:'34px',borderRadius:'9px',background:'linear-gradient(135deg,rgba(99,102,241,.2),rgba(67,56,202,.15))',border:'1px solid rgba(99,102,241,.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>{c.icon}</div>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:'700',color:'var(--text)'}}>{c.title}</div>
                    <div style={{fontSize:'10px',color:'var(--text4)'}}>¿Cuánto valen tus leads actuales?</div>
                  </div>
                </div>
                <div style={{fontSize:'10px',color:'var(--text4)',marginBottom:'12px',lineHeight:'1.5',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
                  {c.desc}
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:'7px',marginBottom:'12px'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'7px'}}>
                    <div>
                      <div style={{fontSize:'9px',color:'var(--text4)',fontWeight:'700',marginBottom:'3px',textTransform:'uppercase',letterSpacing:'.05em'}}>{c.f1Label}</div>
                      <input className="tool-input" type="number" placeholder={c.f1P} value={pipLeads} onChange={e=>setPipLeads(e.target.value)}/>
                    </div>
                    <div>
                      <div style={{fontSize:'9px',color:'var(--text4)',fontWeight:'700',marginBottom:'3px',textTransform:'uppercase',letterSpacing:'.05em'}}>{c.f2Label}</div>
                      <input className="tool-input" type="number" placeholder={c.f2P} value={pipPrecio} onChange={e=>setPipPrecio(e.target.value)}/>
                    </div>
                    <div>
                      <div style={{fontSize:'9px',color:'var(--text4)',fontWeight:'700',marginBottom:'3px',textTransform:'uppercase',letterSpacing:'.05em'}}>{c.f3Label}</div>
                      <input className="tool-input" type="number" placeholder={c.f3P} value={pipComision} onChange={e=>setPipComision(e.target.value)}/>
                    </div>
                    <div>
                      <div style={{fontSize:'9px',color:'var(--text4)',fontWeight:'700',marginBottom:'3px',textTransform:'uppercase',letterSpacing:'.05em'}}>{c.f4Label}</div>
                      <input className="tool-input" type="number" placeholder={c.f4P} value={pipCierre} onChange={e=>setPipCierre(e.target.value)}/>
                    </div>
                  </div>
                  {c.hasGoal && (
                    <div>
                      <div style={{fontSize:'9px',color:'var(--text4)',fontWeight:'700',marginBottom:'3px',textTransform:'uppercase',letterSpacing:'.05em'}}>{c.goalLabel}</div>
                      <input className="tool-input" type="number" placeholder={c.goalP} value={pipMeta} onChange={e=>setPipMeta(e.target.value)}/>
                    </div>
                  )}
                </div>
                {hasData ? (
                  <div style={{background:'linear-gradient(135deg,rgba(99,102,241,.12),rgba(139,92,246,.08))',border:'1px solid rgba(99,102,241,.25)',borderRadius:'10px',padding:'14px'}}>
                    <div style={{fontSize:'10px',color:'#a5b4fc',fontWeight:'700',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.06em'}}>{c.resultTitle}</div>
                    <div style={{fontSize:'28px',fontWeight:'800',color:'#a5b4fc',lineHeight:'1',marginBottom:'2px'}}>{fmtCurrency(result)}</div>
                    <div style={{fontSize:'10px',color:'var(--text4)',marginBottom:'10px'}}>{c.resultUnit} · {c.sub(v1,v2,v3,v4)}</div>
                    {goal > 0 && (
                      <>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:'9px',color:'var(--text4)',marginBottom:'4px'}}>
                          <span>Progreso hacia tu meta</span>
                          <span style={{color:goalPct>=100?'#10b981':'#a5b4fc'}}>{goalPct.toFixed(0)}%</span>
                        </div>
                        <div style={{height:'6px',background:'rgba(255,255,255,.07)',borderRadius:'3px',overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${goalPct}%`,background:goalPct>=100?'#10b981':'linear-gradient(90deg,#6366f1,#a5b4fc)',borderRadius:'3px',transition:'width .5s ease'}}></div>
                        </div>
                        {goalPct >= 100 && <div style={{fontSize:'10px',color:'#10b981',marginTop:'6px',fontWeight:'700'}}>🎉 ¡Ya alcanzaste tu meta mensual!</div>}
                      </>
                    )}
                  </div>
                ) : (
                  <div style={{fontSize:'11px',color:'var(--text4)',textAlign:'center',padding:'14px',background:'rgba(255,255,255,.02)',borderRadius:'8px',border:'1px dashed rgba(255,255,255,.08)'}}>
                    Ingresa tus datos para ver el valor real de tu pipeline
                  </div>
                )}
              </div>
            )
          })()}

          {/* ─── 2. DIAGNÓSTICO DE MARKETING ─── */}
          {(() => {
            const checks = [
              { label:'Meta conectado (orgánico)', ok: !!metaToken, tip:'Conecta Meta para ver Facebook e Instagram orgánico', action: connectMeta },
              { label:'Meta Ads conectado', ok: accounts.some(a=>a.platform==='meta_ads'), tip:'Conecta Meta Ads para ver campañas pagadas', action: connectMeta },
              { label:'Google Ads conectado', ok: accounts.some(a=>a.platform==='google_ads'), tip:'Conecta Google Ads para Search y Display', action: null },
              { label:'Instagram Business activo', ok: hasIG, tip:'Vincula tu IG a una Página de Facebook', action: null },
              { label:'Boost Radar activo', ok: hasFbPages, tip:'Necesitas páginas de Facebook conectadas', action: null },
            ]
            const score = Math.round((checks.filter(c=>c.ok).length / checks.length) * 100)
            const scoreColor = score>=80?'#10b981':score>=60?'#6ee7b7':score>=40?'#fbbf24':'#f87171'
            const scoreLabel = score>=80?'Excelente':score>=60?'Bueno':score>=40?'Regular':'Incompleto'
            return (
              <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'14px',padding:'20px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
                  <div style={{width:'34px',height:'34px',borderRadius:'9px',background:'linear-gradient(135deg,rgba(16,185,129,.2),rgba(5,150,105,.15))',border:'1px solid rgba(16,185,129,.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>🩺</div>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:'700',color:'var(--text)'}}>Diagnóstico de Marketing</div>
                    <div style={{fontSize:'10px',color:'var(--text4)'}}>Salud de tu setup digital</div>
                  </div>
                </div>
                <div style={{fontSize:'10px',color:'var(--text4)',marginBottom:'12px',lineHeight:'1.5',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
                  {nicheTool.diagDesc}
                </div>
                {/* Score gauge */}
                <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'14px',padding:'12px',background:'rgba(255,255,255,.03)',borderRadius:'10px',border:'1px solid rgba(255,255,255,.06)'}}>
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:'34px',fontWeight:'800',color:scoreColor,lineHeight:'1'}}>{score}</div>
                    <div style={{fontSize:'9px',color:'var(--text4)',marginTop:'2px'}}>/ 100</div>
                  </div>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:'700',color:scoreColor,marginBottom:'3px'}}>{scoreLabel}</div>
                    <div style={{height:'5px',width:'100px',background:'rgba(255,255,255,.07)',borderRadius:'3px',overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${score}%`,background:scoreColor,borderRadius:'3px'}}></div>
                    </div>
                    <div style={{fontSize:'9px',color:'var(--text4)',marginTop:'4px'}}>{checks.filter(c=>c.ok).length}/{checks.length} elementos activos</div>
                  </div>
                </div>
                {/* Checklist */}
                <div style={{display:'flex',flexDirection:'column',gap:'7px'}}>
                  {checks.map((c,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'8px'}}>
                      <div style={{width:'18px',height:'18px',borderRadius:'50%',background:c.ok?'rgba(16,185,129,.15)':'rgba(255,255,255,.05)',border:`1px solid ${c.ok?'rgba(16,185,129,.4)':'rgba(255,255,255,.1)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',flexShrink:0,marginTop:'1px'}}>
                        {c.ok?'✓':'·'}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:'11px',fontWeight:'600',color:c.ok?'var(--text)':'#555'}}>{c.label}</div>
                        {!c.ok && (
                          <div style={{fontSize:'10px',color:'var(--text4)',marginTop:'1px'}}>
                            {c.tip}
                            {c.action && <span onClick={c.action} style={{color:'#a5b4fc',cursor:'pointer',marginLeft:'4px'}}>Conectar →</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* ─── 3. ESTACIONALIDAD (por nicho) ─── */}
          {(() => {
            const now = new Date()
            const currentMonth = now.getMonth()
            const months = nicheTool.seasonality
            const levelColor = l => l===3?'#10b981':l===2?'#fbbf24':'#f87171'
            const levelLabel = l => l===3?'Alto':l===2?'Medio':'Bajo'
            const budgetColor = b => b==='Escala'?'#10b981':b==='Normal'?'#a5b4fc':b==='Reduce'?'#fbbf24':'#f87171'
            const cur = months[currentMonth]
            return (
              <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'14px',padding:'20px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
                  <div style={{width:'34px',height:'34px',borderRadius:'9px',background:'linear-gradient(135deg,rgba(251,191,36,.2),rgba(180,83,9,.15))',border:'1px solid rgba(251,191,36,.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>📅</div>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:'700',color:'var(--text)'}}>{nicheTool.seasonLabel}</div>
                    <div style={{fontSize:'10px',color:'var(--text4)'}}>{nicheTool.seasonSubtitle}</div>
                  </div>
                </div>
                <div style={{fontSize:'10px',color:'var(--text4)',marginBottom:'12px',lineHeight:'1.5',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
                  {nicheTool.seasonDesc}
                </div>
                {/* Current month highlight */}
                <div style={{background:`rgba(${cur.level===3?'16,185,129':cur.level===2?'251,191,36':'248,113,113'},.1)`,border:`1px solid rgba(${cur.level===3?'16,185,129':cur.level===2?'251,191,36':'248,113,113'},.25)`,borderRadius:'10px',padding:'12px',marginBottom:'12px'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'6px'}}>
                    <div style={{fontSize:'12px',fontWeight:'700',color:'var(--text)'}}>Ahora: {cur.m} {now.getFullYear()}</div>
                    <div style={{display:'flex',gap:'6px'}}>
                      <span style={{fontSize:'9px',fontWeight:'700',padding:'2px 8px',borderRadius:'20px',background:`rgba(${cur.level===3?'16,185,129':cur.level===2?'251,191,36':'248,113,113'},.15)`,color:levelColor(cur.level)}}>{levelLabel(cur.level)} demanda</span>
                      <span style={{fontSize:'9px',fontWeight:'700',padding:'2px 8px',borderRadius:'20px',background:`rgba(${cur.budget==='Escala'?'16,185,129':cur.budget==='Normal'?'165,180,252':cur.budget==='Reduce'?'251,191,36':'248,113,113'},.12)`,color:budgetColor(cur.budget)}}>{cur.budget} presupuesto</span>
                    </div>
                  </div>
                  <div style={{fontSize:'11px',color:'var(--text4)',lineHeight:'1.55'}}>{cur.tip}</div>
                </div>
                {/* 12-month visual */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'4px'}}>
                  {months.map((mo,i)=>(
                    <div key={i} style={{textAlign:'center',cursor:'default'}}>
                      <div style={{height:'28px',borderRadius:'5px',background:`rgba(${mo.level===3?'16,185,129':mo.level===2?'251,191,36':'248,113,113'},.${i===currentMonth?'25':'1'})`,border:`1px solid rgba(${mo.level===3?'16,185,129':mo.level===2?'251,191,36':'248,113,113'},.${i===currentMonth?'5':'2'})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'8px',fontWeight:i===currentMonth?'800':'600',color:i===currentMonth?levelColor(mo.level):'var(--text4)',outline:i===currentMonth?`2px solid ${levelColor(mo.level)}`:'none',outlineOffset:'1px'}}>
                        {mo.m}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:'10px',marginTop:'8px',justifyContent:'center'}}>
                  {[{c:'#10b981',l:'Alta'},{c:'#fbbf24',l:'Media'},{c:'#f87171',l:'Baja'}].map(x=>(
                    <div key={x.l} style={{display:'flex',alignItems:'center',gap:'4px'}}>
                      <div style={{width:'8px',height:'8px',borderRadius:'2px',background:x.c}}></div>
                      <span style={{fontSize:'9px',color:'var(--text4)'}}>{x.l}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* ══ MARKETING TIPS CAROUSEL ══ */}
      {(()=>{
        const tips = NICHE_TIPS[activeNiche] || NICHE_TIPS['real_estate']
        const tip = tips[tipIdx] || tips[0]
        const tagColor = {
          'Contenido':'#6ee7b7','Audiencias Meta':'#60a5fa','Audiencias LinkedIn':'#818cf8',
          'Presupuesto':'#fbbf24','Copywriting':'#f9a8d4','Meta Ads':'#60a5fa',
          'Google Ads':'#34d399','Optimización':'#a78bfa','Estrategia':'#fb923c',
        }[tip.tag] || '#a5b4fc'
        return (
          <div style={{background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.07)',borderRadius:'16px',padding:'22px 24px',animation:'fadeIn .45s ease',marginBottom:'0'}}>
            {/* Header */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px',flexWrap:'wrap',gap:'10px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'rgba(165,180,252,.1)',border:'1px solid rgba(165,180,252,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'17px',flexShrink:0}}>💡</div>
                <div>
                  <div style={{fontSize:'14px',fontWeight:'800',color:'var(--text)',marginBottom:'1px'}}>Tips de Marketing</div>
                  <div style={{fontSize:'11px',color:'var(--text4)'}}>Estrategias adaptadas a tu industria · {nicheObj.emoji} {nicheTool.label}</div>
                </div>
              </div>
              {/* Prev / Next */}
              <div style={{display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
                <button onClick={()=>setTipIdx(i=>(i-1+tips.length)%tips.length)}
                  style={{width:'28px',height:'28px',borderRadius:'7px',border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.04)',color:'#888',cursor:'pointer',fontSize:'13px',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>‹</button>
                <span style={{fontSize:'11px',color:'var(--text4)',minWidth:'32px',textAlign:'center'}}>{tipIdx+1}/{tips.length}</span>
                <button onClick={()=>setTipIdx(i=>(i+1)%tips.length)}
                  style={{width:'28px',height:'28px',borderRadius:'7px',border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.04)',color:'#888',cursor:'pointer',fontSize:'13px',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>›</button>
              </div>
            </div>

            {/* Tip card */}
            <div key={tipIdx} style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:'12px',padding:'18px 20px',animation:'fadeIn .3s ease'}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:'14px'}}>
                <div style={{fontSize:'28px',flexShrink:0,lineHeight:1,marginTop:'2px'}}>{tip.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px',flexWrap:'wrap'}}>
                    <span style={{fontSize:'10px',fontWeight:'700',color:tagColor,background:'rgba(255,255,255,.05)',border:`1px solid ${tagColor}33`,padding:'2px 8px',borderRadius:'20px',whiteSpace:'nowrap'}}>
                      {tip.tag}
                    </span>
                  </div>
                  <div style={{fontSize:'14px',fontWeight:'800',color:'var(--text)',marginBottom:'6px',lineHeight:'1.35'}}>{tip.title}</div>
                  <div style={{fontSize:'12px',color:'var(--text3)',lineHeight:'1.65'}}>{tip.tip}</div>
                  {tip.link && (
                    <a href={tip.link} target="_blank" rel="noopener noreferrer"
                      style={{display:'inline-flex',alignItems:'center',gap:'5px',marginTop:'10px',fontSize:'11px',fontWeight:'700',color:'#a5b4fc',textDecoration:'none',background:'rgba(99,102,241,.08)',border:'1px solid rgba(99,102,241,.2)',padding:'5px 12px',borderRadius:'7px',transition:'opacity .15s'}}
                      onMouseEnter={e=>e.currentTarget.style.opacity='.75'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                      Crear anuncio →
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Dots */}
            <div style={{display:'flex',justifyContent:'center',gap:'5px',marginTop:'14px'}}>
              {tips.map((_,i)=>(
                <button key={i} onClick={()=>setTipIdx(i)}
                  style={{width:i===tipIdx?'18px':'6px',height:'6px',borderRadius:'3px',border:'none',cursor:'pointer',padding:0,
                    background:i===tipIdx?'#a5b4fc':'rgba(255,255,255,.12)',transition:'all .25s ease'}}>
                </button>
              ))}
            </div>

            {/* CTA — Contrata un profesional */}
            <div style={{marginTop:'16px',padding:'14px 16px',borderRadius:'11px',background:'linear-gradient(135deg,rgba(99,102,241,.08) 0%,rgba(139,92,246,.06) 100%)',border:'1px solid rgba(99,102,241,.18)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',flexWrap:'wrap'}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <span style={{fontSize:'20px'}}>🤝</span>
                <div>
                  <div style={{fontSize:'12px',fontWeight:'800',color:'var(--text)',marginBottom:'2px'}}>¿Prefieres que lo haga alguien experto?</div>
                  <div style={{fontSize:'11px',color:'var(--text4)'}}>Delega tus campañas a una agencia especializada en tu industria.</div>
                </div>
              </div>
              <a href={agencyLink} target="_blank" rel="noopener noreferrer"
                style={{display:'inline-flex',alignItems:'center',gap:'6px',padding:'9px 18px',borderRadius:'9px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',textDecoration:'none',fontSize:'12px',fontWeight:'700',whiteSpace:'nowrap',flexShrink:0,boxShadow:'0 4px 14px rgba(99,102,241,.25)',transition:'opacity .15s'}}
                onMouseEnter={e=>e.currentTarget.style.opacity='.85'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                Contrata un profesional ↗
              </a>
            </div>
          </div>
        )
      })()}

      {/* ══ BOOST RADAR ══ */}
      {metaToken && (
        <div style={{background:'linear-gradient(135deg,rgba(250,204,21,.07) 0%,rgba(251,146,60,.05) 50%,rgba(244,114,182,.04) 100%)',border:'1px solid rgba(250,204,21,.22)',borderRadius:'16px',padding:'22px 26px',animation:'fadeIn .55s ease'}}>

          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'18px',flexWrap:'wrap',gap:'10px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{width:'38px',height:'38px',borderRadius:'10px',background:'rgba(250,204,21,.18)',border:'1px solid rgba(250,204,21,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',flexShrink:0}}>🚀</div>
              <div>
                <div style={{fontSize:'15px',fontWeight:'800',color:'var(--text)',marginBottom:'2px'}}>Boost Radar</div>
                <div style={{fontSize:'11px',color:'var(--text4)'}}>Posts orgánicos listos para amplificar con presupuesto pagado</div>
              </div>
            </div>
            <span style={{fontSize:'10px',fontWeight:'700',color:'#fbbf24',background:'rgba(250,204,21,.12)',border:'1px solid rgba(250,204,21,.2)',padding:'4px 11px',borderRadius:'20px',letterSpacing:'.05em',flexShrink:0}}>
              ✦ SOLO EN KAAN
            </span>
          </div>

          {loadingRadar && (
            <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'20px',color:'var(--text4)',fontSize:'12px'}}>
              <div style={{width:'16px',height:'16px',borderRadius:'50%',border:'2px solid rgba(250,204,21,.3)',borderTop:'2px solid #fbbf24',animation:'spin .8s linear infinite',flexShrink:0}}></div>
              Analizando posts orgánicos para encontrar los mejores candidatos...
            </div>
          )}
          {!loadingRadar && !hasFbPages && (
            <div style={{padding:'20px',textAlign:'center',color:'var(--text4)',fontSize:'12px',lineHeight:'1.6'}}>
              Conecta una Página de Facebook para activar el Boost Radar.
            </div>
          )}
          {!loadingRadar && hasFbPages && boostRadar.length === 0 && (
            <div style={{padding:'20px',textAlign:'center',color:'var(--text4)',fontSize:'12px'}}>
              No se encontraron posts recientes con engagement suficiente.
            </div>
          )}

          {!loadingRadar && boostRadar.length > 0 && (
            <>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))',gap:'10px',marginBottom:'16px'}}>
                {boostRadar.map((item,i)=>{
                  // Lógica inteligente: el top 1 por score es "Hot", el resto es "Recomendado"
                  // Score = ER × recencyBonus — considera tanto engagement como frescura del post
                  const isHot = i === 0 && item.er >= 1
                  const isGood = item.er >= 0.5
                  const badgeColor = isHot?'#f59e0b':isGood?'#6ee7b7':'#a5b4fc'
                  const badgeBg = isHot?'rgba(245,158,11,.18)':isGood?'rgba(110,231,183,.12)':'rgba(165,180,252,.12)'
                  const ageTxt = item.ageDays < 1 ? 'hoy' : item.ageDays === 1 ? 'ayer' : `hace ${item.ageDays}d`
                  return (
                    <div key={i} className="boost-item"
                      style={{background:'rgba(255,255,255,.04)',border:'1px solid '+(isHot?'rgba(245,158,11,.22)':'rgba(255,255,255,.08)'),borderRadius:'11px',padding:'14px',display:'flex',gap:'12px',alignItems:'flex-start'}}>
                      {item.post.full_picture && <img src={item.post.full_picture} alt="" style={{width:'54px',height:'54px',borderRadius:'8px',objectFit:'cover',flexShrink:0}}/>}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'6px',flexWrap:'wrap'}}>
                          <span style={{fontSize:'10px',fontWeight:'700',color:badgeColor,background:badgeBg,padding:'2px 8px',borderRadius:'20px',whiteSpace:'nowrap'}}>
                            {isHot?'🔥 Hot — Boost ya':isGood?'📈 Recomendado':'💡 Potencial'}
                          </span>
                          <span style={{fontSize:'10px',color:'var(--text4)',fontFamily:'monospace'}}>ER {item.er}%</span>
                        </div>
                        {item.post.message && <div style={{fontSize:'11px',color:'#bbb',lineHeight:'1.45',marginBottom:'8px',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{truncate(item.post.message,95)}</div>}
                        <div style={{display:'flex',gap:'12px',fontSize:'10px',color:'var(--text4)',marginBottom:'4px'}}>
                          <span>👍 {fmtN(item.likes)}</span><span>💬 {fmtN(item.comments)}</span><span>↗ {fmtN(item.shares)}</span>
                        </div>
                        <div style={{fontSize:'9px',color:'var(--text4)'}}>{item.page.name} · {ageTxt}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:'10px',padding:'14px 16px',fontSize:'11px',color:'var(--text4)',lineHeight:'1.65'}}>
                <strong style={{color:'var(--text)'}}>¿Qué es el Boost Radar?</strong> Analiza tus posts orgánicos y detecta los que conectaron mejor con tu audiencia. Un ER alto = contenido probado = mejor candidato para ponerle presupuesto pagado. <strong style={{color:'#fbbf24'}}>Solo Kaan</strong> cruza datos orgánicos y pagados para darte esta recomendación automáticamente.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
