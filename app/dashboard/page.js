'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { usePlan } from '../lib/usePlan'

const fmtN = v => (+v||0)>=1e6?((+v/1e6).toFixed(1)+'M'):(+v||0)>=1e3?((+v/1e3).toFixed(1)+'K'):String(Math.round(+v||0))
const fmtDate = d => { try { return new Date(d).toLocaleDateString('es-MX',{day:'numeric',month:'short'}) } catch{return ''} }
const truncate = (str,n=85) => str&&str.length>n?str.slice(0,n)+'…':(str||'')

const MetaSVG = ({size=18,color='white'}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
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
  const { isPro } = usePlan()
  const router = useRouter()

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
      await Promise.all(pages.slice(0,3).map(async page => {
        if (!page.access_token || !page.fan_count) return
        try {
          const res = await fetch(`https://graph.facebook.com/v21.0/${page.id}/posts?fields=id,message,created_time,full_picture,likes.limit(1).summary(true),comments.limit(1).summary(true),shares&limit=12&access_token=${page.access_token}`)
          const j = await res.json()
          if (!j.data) return
          for (const post of j.data) {
            const likes = post.likes?.summary?.total_count || 0
            const comments = post.comments?.summary?.total_count || 0
            const shares = post.shares?.count || 0
            const engagement = likes + comments + shares
            const er = page.fan_count > 0 ? (engagement / page.fan_count * 100) : 0
            if (er > 0.3) allPosts.push({ post, page, likes, comments, shares, engagement, er: parseFloat(er.toFixed(2)) })
          }
        } catch(e) {}
      }))
      setBoostRadar(allPosts.sort((a,b)=>b.er-a.er).slice(0,6))
    } catch(e) {}
    setLoadingRadar(false)
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',background:'var(--bg)'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:'32px',height:'32px',borderRadius:'50%',border:'2px solid rgba(99,102,241,.3)',borderTop:'2px solid #6366f1',animation:'spin 1s linear infinite',margin:'0 auto 12px'}}></div>
        <div style={{fontSize:'12px',color:'var(--text4)'}}>Cargando...</div>
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

  return (
    <div style={{padding:'24px 28px',maxWidth:'1160px',fontFamily:'"Plus Jakarta Sans",sans-serif'}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .hov-card{transition:border-color .2s,transform .15s,box-shadow .15s}
        .hov-card:hover{border-color:rgba(99,102,241,.35)!important;transform:translateY(-1px);box-shadow:0 4px 20px rgba(0,0,0,.2)}
        .tab-shortcut:hover{background:rgba(255,255,255,.07)!important;border-color:rgba(255,255,255,.12)!important}
        .tab-shortcut{transition:background .15s,border-color .15s}
        .boost-item:hover{border-color:rgba(250,204,21,.35)!important}
        .boost-item{transition:border-color .2s}
        .plat-cta:hover{opacity:.87}
        .plat-cta{transition:opacity .15s}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'28px',animation:'fadeIn .4s ease'}}>
        <div>
          <h1 style={{fontSize:'22px',fontWeight:'800',color:'var(--text)',margin:'0 0 4px'}}>
            Hola, {user?.email?.split('@')[0]} 👋
          </h1>
          <p style={{fontSize:'13px',color:'var(--text4)',margin:0}}>
            Tu centro de control — orgánico + pagado en un solo lugar
          </p>
        </div>
        <button onClick={()=>router.push('/dashboard/platforms')} className="plat-cta"
          style={{display:'flex',alignItems:'center',gap:'7px',padding:'9px 16px',borderRadius:'9px',background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.25)',color:'#a5b4fc',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>
          <span style={{fontSize:'15px',fontWeight:'400'}}>+</span> Conectar plataforma
        </button>
      </div>

      {/* ── ONBOARDING ── */}
      {!hasAnyAccount && !metaToken && (
        <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'16px',padding:'56px 32px',textAlign:'center',marginBottom:'28px',animation:'fadeIn .5s ease'}}>
          <div style={{fontSize:'52px',marginBottom:'16px'}}>🚀</div>
          <h2 style={{fontSize:'20px',fontWeight:'800',color:'var(--text)',margin:'0 0 10px'}}>Empieza conectando tus plataformas</h2>
          <p style={{fontSize:'13px',color:'var(--text4)',maxWidth:'460px',margin:'0 auto 28px',lineHeight:'1.7'}}>
            Conecta Meta Ads o Google Ads para ver campañas pagadas, y tus páginas de Facebook/Instagram para métricas orgánicas. Todo en un solo dashboard.
          </p>
          <div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}>
            <a href="/api/auth/meta" className="plat-cta" style={{display:'inline-flex',alignItems:'center',gap:'8px',padding:'12px 22px',borderRadius:'10px',background:'#1877f2',color:'#fff',fontSize:'13px',fontWeight:'700',textDecoration:'none'}}>
              <MetaSVG size={15} /> Conectar Meta
            </a>
            <a href="/api/auth/google-ads/login" className="plat-cta" style={{display:'inline-flex',alignItems:'center',gap:'8px',padding:'12px 22px',borderRadius:'10px',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.12)',color:'var(--text)',fontSize:'13px',fontWeight:'700',textDecoration:'none'}}>
              <GoogleSVG size={15} /> Conectar Google Ads
            </a>
          </div>
        </div>
      )}

      {/* ── STATS ROW (Metricool-style big numbers) ── */}
      {(hasAnyAccount || hasFbPages || hasIG) && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px',marginBottom:'28px',animation:'fadeIn .4s ease'}}>
          {[
            {label:'Seguidores orgánicos',value:fmtN(totalOrgFollowers),icon:'👥',sub:'Facebook + Instagram',color:'#6ee7b7'},
            {label:'Plataformas activas',value:String(activePlatformsCount),icon:'🔗',sub:'redes conectadas',color:'#a5b4fc'},
            {label:'Cuentas de ads',value:String(accounts.length),icon:'💰',sub:'campañas pagadas',color:'#fbbf24'},
            {label:'Boost Radar',value:loadingRadar?'…':String(boostCandidates),icon:'🚀',sub:loadingRadar?'Analizando…':'posts con potencial',color:'#f472b6',highlight:true},
          ].map((s,i)=>(
            <div key={i} style={{
              background:'var(--sidebar)',
              border:s.highlight?'1px solid rgba(244,114,182,.25)':'1px solid var(--border)',
              borderRadius:'13px',padding:'18px 20px',
            }}>
              <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'10px'}}>
                <span style={{fontSize:'14px'}}>{s.icon}</span>
                <span style={{fontSize:'9px',color:'var(--text4)',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.07em'}}>{s.label}</span>
              </div>
              <div style={{fontSize:'30px',fontWeight:'800',color:s.color,lineHeight:'1',marginBottom:'4px'}}>{s.value}</div>
              <div style={{fontSize:'10px',color:'var(--text4)'}}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── PLATFORM GRID ── */}
      {(hasAnyAccount || metaToken) && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px',marginBottom:'28px',animation:'fadeIn .45s ease'}}>

          {/* LEFT: Organic */}
          <div>
            <div style={{fontSize:'9px',fontWeight:'700',color:'var(--text4)',letterSpacing:'.09em',textTransform:'uppercase',marginBottom:'10px',paddingLeft:'2px'}}>
              Redes Orgánicas
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>

              {/* Facebook */}
              {metaToken && (
                <div className="hov-card" onClick={()=>router.push('/dashboard/facebook')}
                  style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'13px',padding:'18px',cursor:'pointer'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:hasFbPages?'14px':'0'}}>
                    <div style={{width:'40px',height:'40px',borderRadius:'10px',background:'#1877f2',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <MetaSVG size={20} />
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'14px',fontWeight:'700',color:'var(--text)'}}>Facebook</div>
                      <div style={{fontSize:'10px',color:'var(--text4)'}}>Páginas y publicaciones</div>
                    </div>
                    {loadingOrganic
                      ? <div style={{width:'14px',height:'14px',borderRadius:'50%',border:'2px solid rgba(99,102,241,.3)',borderTop:'2px solid #6366f1',animation:'spin .8s linear infinite',flexShrink:0}}></div>
                      : <span style={{fontSize:'12px',color:'var(--text4)',flexShrink:0}}>Ver →</span>
                    }
                  </div>
                  {hasFbPages && (
                    <div style={{display:'flex',gap:'24px'}}>
                      <div>
                        <div style={{fontSize:'26px',fontWeight:'800',color:'var(--text)',lineHeight:'1'}}>{fmtN(fbPages.reduce((s,p)=>s+(p.fan_count||0),0))}</div>
                        <div style={{fontSize:'10px',color:'var(--text4)',marginTop:'3px'}}>seguidores</div>
                      </div>
                      <div>
                        <div style={{fontSize:'26px',fontWeight:'800',color:'#6ee7b7',lineHeight:'1'}}>{fbPages.length}</div>
                        <div style={{fontSize:'10px',color:'var(--text4)',marginTop:'3px'}}>página{fbPages.length!==1?'s':''}</div>
                      </div>
                    </div>
                  )}
                  {!loadingOrganic && !hasFbPages && (
                    <div style={{fontSize:'11px',color:'var(--text4)',marginTop:'8px'}}>
                      No se encontraron páginas. <a href="/api/auth/meta" style={{color:'#a5b4fc',textDecoration:'none'}}>Reconectar →</a>
                    </div>
                  )}
                </div>
              )}

              {/* Instagram */}
              {metaToken && (
                <div className="hov-card" onClick={()=>router.push('/dashboard/instagram')}
                  style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'13px',padding:'18px',cursor:'pointer'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:hasIG?'14px':'0'}}>
                    <div style={{width:'40px',height:'40px',borderRadius:'10px',background:'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <IGSVG size={20} />
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'14px',fontWeight:'700',color:'var(--text)'}}>Instagram</div>
                      <div style={{fontSize:'10px',color:'var(--text4)'}}>Cuentas de negocio</div>
                    </div>
                    <span style={{fontSize:'12px',color:'var(--text4)',flexShrink:0}}>Ver →</span>
                  </div>
                  {hasIG && (
                    <div style={{display:'flex',gap:'24px'}}>
                      <div>
                        <div style={{fontSize:'26px',fontWeight:'800',color:'var(--text)',lineHeight:'1'}}>{fmtN(igAccounts.reduce((s,a)=>s+(a.followers_count||0),0))}</div>
                        <div style={{fontSize:'10px',color:'var(--text4)',marginTop:'3px'}}>seguidores</div>
                      </div>
                      <div>
                        <div style={{fontSize:'26px',fontWeight:'800',color:'#e1306c',lineHeight:'1'}}>{igAccounts.reduce((s,a)=>s+(a.media_count||0),0)}</div>
                        <div style={{fontSize:'10px',color:'var(--text4)',marginTop:'3px'}}>posts</div>
                      </div>
                    </div>
                  )}
                  {!loadingOrganic && !hasIG && (
                    <div style={{fontSize:'11px',color:'var(--text4)',marginTop:'8px'}}>
                      Conecta una cuenta Instagram Business vinculada a una Página.
                    </div>
                  )}
                </div>
              )}

              {!metaToken && (
                <div style={{background:'rgba(24,119,242,.05)',border:'1px dashed rgba(24,119,242,.25)',borderRadius:'13px',padding:'22px',textAlign:'center'}}>
                  <div style={{fontSize:'12px',color:'#888',marginBottom:'12px'}}>Conecta Meta para ver Facebook e Instagram orgánico</div>
                  <a href="/api/auth/meta" className="plat-cta" style={{display:'inline-flex',alignItems:'center',gap:'7px',padding:'9px 18px',borderRadius:'9px',background:'#1877f2',color:'#fff',fontSize:'12px',fontWeight:'700',textDecoration:'none'}}>
                    <MetaSVG size={13} /> Conectar Meta
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Paid */}
          <div>
            <div style={{fontSize:'9px',fontWeight:'700',color:'var(--text4)',letterSpacing:'.09em',textTransform:'uppercase',marginBottom:'10px',paddingLeft:'2px'}}>
              Campañas Pagadas
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>

              {hasMeta && (
                <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'13px',padding:'18px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px'}}>
                    <div style={{width:'40px',height:'40px',borderRadius:'10px',background:'#1877f2',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <MetaSVG size={20} />
                    </div>
                    <div>
                      <div style={{fontSize:'14px',fontWeight:'700',color:'var(--text)'}}>Meta Ads</div>
                      <div style={{fontSize:'10px',color:'var(--text4)'}}>{metaAccounts.length} cuenta{metaAccounts.length!==1?'s':''} · Facebook & Instagram</div>
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
                        style={{display:'flex',alignItems:'center',gap:'7px',padding:'9px 11px',background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:'8px',cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>
                        <span style={{fontSize:'13px'}}>{t.icon}</span>
                        <span style={{fontSize:'11px',color:'#999',fontWeight:'600'}}>{t.label}</span>
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
                      <GoogleSVG size={22} />
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'14px',fontWeight:'700',color:'var(--text)'}}>Google Ads</div>
                      <div style={{fontSize:'10px',color:'var(--text4)'}}>Search · Display · YouTube</div>
                    </div>
                    <span style={{fontSize:'12px',color:'var(--text4)',flexShrink:0}}>Ver →</span>
                  </div>
                </div>
              )}

              {hasTiktok && (
                <div className="hov-card" onClick={()=>router.push('/dashboard/reportes/'+tiktokAccounts[0].account_id)}
                  style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'13px',padding:'18px',cursor:'pointer'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                    <div style={{width:'40px',height:'40px',borderRadius:'10px',background:'#010101',border:'1px solid rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
                      </svg>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'14px',fontWeight:'700',color:'var(--text)'}}>TikTok Ads</div>
                      <div style={{fontSize:'10px',color:'var(--text4)'}}>Campañas de TikTok</div>
                    </div>
                    <span style={{fontSize:'12px',color:'var(--text4)',flexShrink:0}}>Ver →</span>
                  </div>
                </div>
              )}

              {!hasAnyAccount && (
                <div style={{background:'rgba(99,102,241,.04)',border:'1px dashed rgba(99,102,241,.2)',borderRadius:'13px',padding:'22px',textAlign:'center'}}>
                  <div style={{fontSize:'12px',color:'#888',marginBottom:'12px'}}>Conecta Meta Ads o Google Ads para ver campañas pagadas</div>
                  <div style={{display:'flex',gap:'8px',justifyContent:'center',flexWrap:'wrap'}}>
                    <a href="/api/auth/meta" className="plat-cta" style={{display:'inline-flex',alignItems:'center',gap:'6px',padding:'8px 15px',borderRadius:'8px',background:'#1877f2',color:'#fff',fontSize:'11px',fontWeight:'700',textDecoration:'none'}}>
                      <MetaSVG size={12} /> Meta Ads
                    </a>
                    <a href="/api/auth/google-ads/login" className="plat-cta" style={{display:'inline-flex',alignItems:'center',gap:'6px',padding:'8px 15px',borderRadius:'8px',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.12)',color:'var(--text)',fontSize:'11px',fontWeight:'700',textDecoration:'none'}}>
                      <GoogleSVG size={12} /> Google Ads
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          🚀 BOOST RADAR — DIFERENCIADOR EXCLUSIVO
          ══════════════════════════════════════════════ */}
      {metaToken && (
        <div style={{background:'linear-gradient(135deg,rgba(250,204,21,.07) 0%,rgba(251,146,60,.05) 50%,rgba(244,114,182,.04) 100%)',border:'1px solid rgba(250,204,21,.22)',borderRadius:'16px',padding:'22px 26px',animation:'fadeIn .5s ease'}}>

          {/* Boost Radar Header */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'18px',flexWrap:'wrap',gap:'10px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{width:'38px',height:'38px',borderRadius:'10px',background:'rgba(250,204,21,.18)',border:'1px solid rgba(250,204,21,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',flexShrink:0}}>
                🚀
              </div>
              <div>
                <div style={{fontSize:'15px',fontWeight:'800',color:'var(--text)',marginBottom:'2px'}}>Boost Radar</div>
                <div style={{fontSize:'11px',color:'var(--text4)'}}>
                  Detecta posts orgánicos listos para amplificar con presupuesto pagado
                </div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <span style={{fontSize:'10px',fontWeight:'700',color:'#fbbf24',background:'rgba(250,204,21,.12)',border:'1px solid rgba(250,204,21,.25)',padding:'4px 11px',borderRadius:'20px',letterSpacing:'.05em'}}>
                ✦ SOLO EN KAAN
              </span>
            </div>
          </div>

          {/* Loading state */}
          {loadingRadar && (
            <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'20px',color:'var(--text4)',fontSize:'12px'}}>
              <div style={{width:'16px',height:'16px',borderRadius:'50%',border:'2px solid rgba(250,204,21,.3)',borderTop:'2px solid #fbbf24',animation:'spin .8s linear infinite',flexShrink:0}}></div>
              Analizando tus posts orgánicos para encontrar los mejores candidatos para boosting...
            </div>
          )}

          {/* No pages connected */}
          {!loadingRadar && !hasFbPages && (
            <div style={{padding:'20px',textAlign:'center',color:'var(--text4)',fontSize:'12px',lineHeight:'1.6'}}>
              Conecta una Página de Facebook para activar el Boost Radar. <br/>
              El radar analizará tus posts recientes y detectará cuáles tienen mejor performance.
            </div>
          )}

          {/* No posts with engagement */}
          {!loadingRadar && hasFbPages && boostRadar.length === 0 && (
            <div style={{padding:'20px',textAlign:'center',color:'var(--text4)',fontSize:'12px',lineHeight:'1.6'}}>
              No se encontraron posts recientes con engagement. <br/>
              Asegúrate de tener publicaciones públicas en tus páginas de Facebook.
            </div>
          )}

          {/* BOOST RADAR POSTS GRID */}
          {!loadingRadar && boostRadar.length > 0 && (
            <>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))',gap:'10px',marginBottom:'16px'}}>
                {boostRadar.map((item,i)=>{
                  const isHot = item.er >= 3
                  const isGood = item.er >= 1
                  const badgeColor = isHot ? '#f59e0b' : isGood ? '#6ee7b7' : '#a5b4fc'
                  const badgeBg = isHot ? 'rgba(245,158,11,.18)' : isGood ? 'rgba(110,231,183,.12)' : 'rgba(165,180,252,.12)'
                  const badgeBorder = isHot ? 'rgba(245,158,11,.3)' : isGood ? 'rgba(110,231,183,.25)' : 'rgba(165,180,252,.25)'
                  const badgeLabel = isHot ? '🔥 Hot — Boost ya' : isGood ? '📈 Recomendado' : '💡 Potencial'
                  return (
                    <div key={i} className="boost-item"
                      style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'11px',padding:'14px',display:'flex',gap:'12px',alignItems:'flex-start'}}>
                      {item.post.full_picture && (
                        <img src={item.post.full_picture} alt=""
                          style={{width:'54px',height:'54px',borderRadius:'8px',objectFit:'cover',flexShrink:0,border:'1px solid rgba(255,255,255,.06)'}} />
                      )}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'6px',flexWrap:'wrap'}}>
                          <span style={{fontSize:'10px',fontWeight:'700',color:badgeColor,background:badgeBg,border:`1px solid ${badgeBorder}`,padding:'2px 8px',borderRadius:'20px',whiteSpace:'nowrap'}}>
                            {badgeLabel}
                          </span>
                          <span style={{fontSize:'10px',color:'var(--text4)',fontFamily:'monospace'}}>ER {item.er}%</span>
                        </div>
                        {item.post.message && (
                          <div style={{fontSize:'11px',color:'#bbb',lineHeight:'1.45',marginBottom:'8px',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
                            {truncate(item.post.message, 95)}
                          </div>
                        )}
                        <div style={{display:'flex',gap:'12px',fontSize:'10px',color:'var(--text4)',marginBottom:'4px'}}>
                          <span>👍 {fmtN(item.likes)}</span>
                          <span>💬 {fmtN(item.comments)}</span>
                          <span>↗ {fmtN(item.shares)}</span>
                        </div>
                        <div style={{fontSize:'9px',color:'var(--text4)'}}>
                          {item.page.name} · {fmtDate(item.post.created_time)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Explanation banner */}
              <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:'10px',padding:'14px 16px',fontSize:'11px',color:'var(--text4)',lineHeight:'1.65'}}>
                <strong style={{color:'var(--text)'}}>¿Cómo funciona el Boost Radar?</strong> Analizamos el engagement rate (ER) de tus posts orgánicos recientes. Un ER alto significa que tu audiencia ya respondió positivamente — ese contenido tiene más probabilidades de funcionar bien como anuncio pagado. Metricool y otras herramientas te muestran orgánico y pagado por separado. <strong style={{color:'#fbbf24'}}>Kaan los conecta</strong> para que tomes mejores decisiones de inversión.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
