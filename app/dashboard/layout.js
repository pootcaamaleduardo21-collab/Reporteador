'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { usePlan } from '../lib/usePlan'

const FbLogoSVG = ({size=14}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877f2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)
const IGLogoSVG = ({size=14}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <defs><linearGradient id="igg" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f09433"/><stop offset="50%" stopColor="#dc2743"/><stop offset="100%" stopColor="#bc1888"/></linearGradient></defs>
    <path fill="url(#igg)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)
const TTLogoSVG = ({size=14}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
  </svg>
)
const GoogleLogoSVG = ({size=14}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [stripOpen, setStripOpen] = useState(false)
  const [reportsOpen, setReportsOpen] = useState(true)
  const [googleAdsOpen, setGoogleAdsOpen] = useState(false)
  const [tiktokAdsOpen, setTiktokAdsOpen] = useState(false)
  const router = useRouter()
  const { isPro } = usePlan()
  const pathname = usePathname()

  useEffect(() => {
    // Apply saved theme on load
    const prefs = JSON.parse(localStorage.getItem('kaan_prefs') || '{}')
    if (prefs.theme === 'Claro') {
      document.body.style.background = '#f0f0f5'
      document.body.style.color = '#0c0c10'
    }
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      const { data: accs } = await supabase.from('ad_accounts').select('*').eq('user_id', user.id)
      if (accs && accs.length > 0) {
        setAccounts(accs)
        // detect selected account from URL - arreglado para detectar act_, gads_, tt_, etc.
        const match = pathname?.match(/reportes\/([a-z]+_[^/?]+)/)
        const found = match ? accs.find(a => a.account_id === match[1]) : null
        setSelectedAccount(found || accs[0])
      }
    }
    init()
  }, [])

  // sync selected account when URL changes
  useEffect(() => {
    if (accounts.length === 0) return
    const match = pathname?.match(/reportes\/([a-z]+_[^/?]+)/)
    if (match) {
      const found = accounts.find(a => a.account_id === match[1])
      if (found) setSelectedAccount(found)
    }
  }, [pathname, accounts])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function navigate(path) {
    setStripOpen(false)
    router.push(path)
  }

  function connectMeta() {
    if (!user) return
    const state = btoa(JSON.stringify({ uid: user.id, ts: Date.now() }))
    window.location.href = `/api/auth/meta?state=${encodeURIComponent(state)}`
  }

  function selectAccount(acc) {
    setSelectedAccount(acc)
    setStripOpen(false)
    router.push('/dashboard/reportes/' + acc.account_id)
  }

  const isReportePage = pathname?.includes('/reportes/')
  const isSettingsPage = pathname === '/dashboard/settings'
  const isFacebookPage = pathname === '/dashboard/facebook'
  const isInstagramPage = pathname === '/dashboard/instagram'
  const isTikTokOrganicPage = pathname === '/dashboard/tiktok-organic'
  const isGoogleAdsPage = pathname === '/dashboard/google-ads'
  const isTikTokAdsPage = pathname === '/dashboard/tiktok-ads'
  const isOverviewPage = pathname === '/dashboard' || pathname === '/dashboard/'
  const isPublicarPage = pathname === '/dashboard/publicar'
  const isMetaAdsPage = pathname === '/dashboard/meta-ads'

  const activeSection = isReportePage ? 'reportes' : isSettingsPage ? 'settings' : isFacebookPage ? 'facebook' : isInstagramPage ? 'instagram' : isTikTokOrganicPage ? 'tiktok-organic' : isGoogleAdsPage ? 'google-ads' : isTikTokAdsPage ? 'tiktok-ads' : isPublicarPage ? 'publicar' : isMetaAdsPage ? 'meta-ads' : 'overview'

  const topbarTitle = isReportePage
    ? (selectedAccount?.account_name || selectedAccount?.account_id || 'Reportes')
    : activeSection === 'settings' ? 'Ajustes'
    : activeSection === 'facebook' ? 'Facebook Orgánico'
    : activeSection === 'instagram' ? 'Instagram Orgánico'
    : activeSection === 'tiktok-organic' ? 'TikTok Orgánico'
    : activeSection === 'google-ads' ? 'Google Ads'
    : activeSection === 'tiktok-ads' ? 'TikTok Ads'
    : activeSection === 'publicar' ? 'Crear Post'
    : 'Dashboard'

  if (!user) return <div style={{minHeight:'100vh',background:'var(--bg)'}}></div>

  return (
    <div style={{display:'flex',height:'100vh',background:'var(--bg)',fontFamily:'"Plus Jakarta Sans",system-ui,sans-serif',overflow:'hidden'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      {/* SIDEBAR */}
      <aside style={{
        width:sidebarOpen?'210px':'52px',minWidth:sidebarOpen?'210px':'52px',
        background:'var(--sidebar)',borderRight:'1px solid var(--border)',
        display:'flex',flexDirection:'column',height:'100vh',
        overflow:'hidden',flexShrink:0,transition:'width .2s ease,min-width .2s ease',
      }}>
        {/* Logo */}
        <div style={{padding:'12px 10px',display:'flex',alignItems:'center',gap:'10px',borderBottom:'1px solid var(--border)',minHeight:'50px',flexShrink:0}}>
          <div style={{width:'28px',height:'28px',borderRadius:'7px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',flexShrink:0,cursor:'pointer'}} onClick={()=>navigate('/dashboard')}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="16" height="16"><path d="M16 4 L4 26 L16 21 L28 26 Z" fill="white"/><path d="M16 4 L16 21" stroke="white" strokeWidth="1.5" opacity=".35"/><circle cx="16" cy="21" r="2.2" fill="#a5b4fc"/></svg></div>
          {sidebarOpen && <span style={{fontWeight:'800',fontSize:'13px',color:'var(--text)',whiteSpace:'nowrap',cursor:'pointer'}} onClick={()=>navigate('/dashboard')}>Kaan</span>}
        </div>

        {/* Nav */}
        <nav style={{padding:'6px 5px',flex:1,overflowY:'auto',overflowX:'hidden'}}>
          {sidebarOpen && <div style={{fontSize:'9px',color:'var(--text4)',fontWeight:'600',letterSpacing:'.08em',textTransform:'uppercase',padding:'8px 8px 3px'}}>Panel</div>}

          {[
            {id:'overview',icon:'▣',label:'Resumen',path:'/dashboard',sub:'Pagado + orgánico'},
          ].map(s=>(
            <div key={s.id} className="nav-hover" onClick={()=>navigate(s.path)}
              style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 8px',borderRadius:'7px',cursor:'pointer',marginBottom:'1px',background:activeSection===s.id?'rgba(99,102,241,.14)':'transparent'}}>
              <span style={{fontSize:'14px',width:'20px',textAlign:'center',flexShrink:0,fontWeight:'bold'}}>{s.icon}</span>
              {sidebarOpen && <div style={{flex:1,overflow:'hidden'}}>
                <div style={{fontSize:'11px',fontWeight:'600',color:activeSection===s.id?'#a5b4fc':'#888',whiteSpace:'nowrap'}}>{s.label}</div>
                {s.sub && <div style={{fontSize:'9px',color:'var(--text4)',marginTop:'1px'}}>{s.sub}</div>}
              </div>}
            </div>
          ))}

          {sidebarOpen && <div style={{fontSize:'9px',color:'var(--text4)',fontWeight:'600',letterSpacing:'.08em',textTransform:'uppercase',padding:'10px 8px 3px'}}>Publicar</div>}

          {[
            {id:'publicar',icon:'✏️',label:'Crear Post',sub:'Facebook e Instagram',path:'/dashboard/publicar'},
          ].map(s=>(
            <div key={s.id} className="nav-hover" onClick={()=>navigate(s.path)}
              style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 8px',borderRadius:'7px',cursor:'pointer',marginBottom:'1px',background:activeSection===s.id?'rgba(99,102,241,.14)':'transparent'}}>
              <span style={{fontSize:'14px',width:'20px',textAlign:'center',flexShrink:0,fontWeight:'bold'}}>{s.icon}</span>
              {sidebarOpen && <div style={{flex:1,overflow:'hidden'}}>
                <div style={{fontSize:'11px',fontWeight:'600',color:activeSection===s.id?'#a5b4fc':'#888',whiteSpace:'nowrap'}}>{s.label}</div>
                {s.sub && <div style={{fontSize:'9px',color:'var(--text4)',marginTop:'1px'}}>{s.sub}</div>}
              </div>}
            </div>
          ))}

          {sidebarOpen && <div style={{fontSize:'9px',color:'var(--text4)',fontWeight:'600',letterSpacing:'.08em',textTransform:'uppercase',padding:'10px 8px 3px'}}>Redes Orgánicas</div>}

          {[
            {id:'facebook',label:'Facebook',sub:'Orgánico',path:'/dashboard/facebook',iconBg:'#1877f2',Icon:()=><FbLogoSVG size={13}/>},
            {id:'instagram',label:'Instagram',sub:'Orgánico',path:'/dashboard/instagram',iconBg:'linear-gradient(135deg,#f09433,#dc2743,#bc1888)',Icon:()=><IGLogoSVG size={13}/>},
            {id:'tiktok-organic',label:'TikTok',sub:'Orgánico',path:'/dashboard/tiktok-organic',iconBg:'#010101',Icon:()=><TTLogoSVG size={12}/>},
          ].map(s=>(
            <div key={s.id} className="nav-hover" onClick={()=>navigate(s.path)}
              style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 8px',borderRadius:'7px',cursor:'pointer',marginBottom:'1px',background:activeSection===s.id?'rgba(99,102,241,.14)':'transparent'}}>
              <div style={{width:'20px',height:'20px',borderRadius:'5px',background:s.iconBg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><s.Icon/></div>
              {sidebarOpen && <div style={{flex:1,overflow:'hidden'}}>
                <div style={{fontSize:'11px',fontWeight:'600',color:activeSection===s.id?'#a5b4fc':'#888',whiteSpace:'nowrap'}}>{s.label}</div>
                {s.sub && <div style={{fontSize:'9px',color:'var(--text4)',marginTop:'1px'}}>{s.sub}</div>}
              </div>}
            </div>
          ))}

          {sidebarOpen && <div style={{fontSize:'9px',color:'var(--text4)',fontWeight:'600',letterSpacing:'.08em',textTransform:'uppercase',padding:'10px 8px 3px'}}>Campañas Pagadas</div>}

          {/* META ADS - siempre visible si hay cuentas meta */}
          {accounts.some(a=>a.platform==='meta_ads') && (() => {
            const metaAccs = accounts.filter(a=>a.platform==='meta_ads')
            const firstMeta = metaAccs[0]
            const isActiveMeta = isReportePage && selectedAccount?.platform==='meta_ads'
            return (
              <>
                <div className="nav-hover" onClick={()=>setReportsOpen(!reportsOpen)}
                  style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 8px',borderRadius:'7px',cursor:'pointer',background:isActiveMeta?'rgba(99,102,241,.14)':'transparent',border:'none',width:'100%'}}>
                  <div style={{width:'20px',height:'20px',borderRadius:'5px',background:'#1877f2',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><FbLogoSVG size={12}/></div>
                  {sidebarOpen && <>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'11px',fontWeight:'600',color:isActiveMeta?'#a5b4fc':'#888',textAlign:'left'}}>Meta Ads</div>
                      <div style={{fontSize:'9px',color:'var(--text4)',marginTop:'1px'}}>{metaAccs.length} cuenta{metaAccs.length!==1?'s':''}</div>
                    </div>
                    <span style={{fontSize:'10px',color:'var(--text4)',transition:'transform .2s',transform:reportsOpen?'rotate(180deg)':'rotate(0deg)',flexShrink:0}}>▾</span>
                  </>}
                </div>
                <div style={{overflow:'hidden',maxHeight:reportsOpen&&sidebarOpen?'300px':'0',transition:'max-height .3s ease'}}>
                  {/* Pestañas de la cuenta seleccionada (o primera meta) */}
                  {[
                    {label:'Resumen',tab:'overview',icon:'📊'},
                    {label:'Campañas',tab:'campanas',icon:'🎯'},
                    {label:'Conjuntos',tab:'conjuntos',icon:'👥'},
                    {label:'Anuncios',tab:'anuncios',icon:'🖼'},
                    {label:'Audiencia',tab:'audiencia',icon:'🗺'},
                  ].map(r=>{
                    const targetAcc = (isActiveMeta && selectedAccount) ? selectedAccount : firstMeta
                    return (
                      <div key={r.tab} className="nav-hover"
                        onClick={()=>navigate('/dashboard/reportes/'+targetAcc.account_id+'?tab='+r.tab)}
                        style={{display:'flex',alignItems:'center',gap:'7px',padding:'5px 8px 5px 28px',borderRadius:'6px',cursor:'pointer',marginBottom:'1px'}}>
                        <span style={{fontSize:'11px'}}>{r.icon}</span>
                        <div style={{fontSize:'10px',color:'#666',fontWeight:'500',whiteSpace:'nowrap'}}>{r.label}</div>
                      </div>
                    )
                  })}
                  {/* Si hay más de una cuenta meta, mostrar selector */}
                  {metaAccs.length > 1 && sidebarOpen && (
                    <div style={{padding:'4px 8px 4px 28px'}}>
                      <div style={{fontSize:'9px',color:'var(--text4)',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'.06em'}}>Cambiar cuenta:</div>
                      {metaAccs.map(acc=>(
                        <div key={acc.id} className="nav-hover"
                          onClick={()=>navigate('/dashboard/reportes/'+acc.account_id)}
                          style={{display:'flex',alignItems:'center',gap:'5px',padding:'4px 6px',borderRadius:'5px',cursor:'pointer',marginBottom:'2px',background:selectedAccount?.id===acc.id?'rgba(99,102,241,.08)':'transparent'}}>
                          <div style={{width:'5px',height:'5px',borderRadius:'50%',background:acc.is_active?'#6ee7b7':'#555',flexShrink:0}}></div>
                          <div style={{fontSize:'9px',color:selectedAccount?.id===acc.id?'#a5b4fc':'#555',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{acc.account_name||acc.account_id}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )
          })()}

          {/* GOOGLE ADS - siempre visible si hay cuentas google */}
          {accounts.some(a=>a.platform==='google_ads') && (() => {
            const gAccs = accounts.filter(a=>a.platform==='google_ads')
            const firstG = gAccs[0]
            const isActiveGoogle = isReportePage && selectedAccount?.platform==='google_ads'
            return (
              <>
                <div className="nav-hover" onClick={()=>setGoogleAdsOpen(!googleAdsOpen)}
                  style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 8px',borderRadius:'7px',cursor:'pointer',background:isActiveGoogle?'rgba(99,102,241,.14)':'transparent',border:'none',width:'100%'}}>
                  <div style={{width:'20px',height:'20px',borderRadius:'5px',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><GoogleLogoSVG size={13}/></div>
                  {sidebarOpen && <>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'11px',fontWeight:'600',color:isActiveGoogle?'#a5b4fc':'#888',textAlign:'left'}}>Google Ads</div>
                      <div style={{fontSize:'9px',color:'var(--text4)',marginTop:'1px'}}>{gAccs.length} cuenta{gAccs.length!==1?'s':''}</div>
                    </div>
                    <span style={{fontSize:'10px',color:'var(--text4)',transition:'transform .2s',transform:googleAdsOpen?'rotate(180deg)':'rotate(0deg)',flexShrink:0}}>▾</span>
                  </>}
                </div>
                <div style={{overflow:'hidden',maxHeight:googleAdsOpen&&sidebarOpen?'200px':'0',transition:'max-height .3s ease'}}>
                  {[
                    {label:'Resumen',tab:'overview',icon:'📊'},
                    {label:'Campañas',tab:'google-ads',icon:'🎯'},
                  ].map(r=>{
                    const targetAcc = (isActiveGoogle && selectedAccount) ? selectedAccount : firstG
                    return (
                      <div key={r.tab} className="nav-hover"
                        onClick={()=>navigate('/dashboard/reportes/'+targetAcc.account_id+'?tab='+r.tab)}
                        style={{display:'flex',alignItems:'center',gap:'7px',padding:'5px 8px 5px 28px',borderRadius:'6px',cursor:'pointer',marginBottom:'1px'}}>
                        <span style={{fontSize:'11px'}}>{r.icon}</span>
                        <div style={{fontSize:'10px',color:'#666',fontWeight:'500',whiteSpace:'nowrap'}}>{r.label}</div>
                      </div>
                    )
                  })}
                  {gAccs.length > 1 && sidebarOpen && (
                    <div style={{padding:'4px 8px 4px 28px'}}>
                      {gAccs.map(acc=>(
                        <div key={acc.id} className="nav-hover"
                          onClick={()=>navigate('/dashboard/reportes/'+acc.account_id)}
                          style={{display:'flex',alignItems:'center',gap:'5px',padding:'4px 6px',borderRadius:'5px',cursor:'pointer',marginBottom:'2px'}}>
                          <div style={{width:'5px',height:'5px',borderRadius:'50%',background:acc.is_active?'#6ee7b7':'#555',flexShrink:0}}></div>
                          <div style={{fontSize:'9px',color:'#555',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{acc.account_name||acc.account_id}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )
          })()}

          {/* TIKTOK ADS */}
          {accounts.some(a=>a.platform==='tiktok_ads') && (() => {
            const ttAccs = accounts.filter(a=>a.platform==='tiktok_ads')
            const firstTT = ttAccs[0]
            const isActiveTT = isReportePage && selectedAccount?.platform==='tiktok_ads'
            return (
              <>
                <div className="nav-hover" onClick={()=>setTiktokAdsOpen(!tiktokAdsOpen)}
                  style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 8px',borderRadius:'7px',cursor:'pointer',background:isActiveTT?'rgba(99,102,241,.14)':'transparent',border:'none',width:'100%'}}>
                  <div style={{width:'20px',height:'20px',borderRadius:'5px',background:'#010101',border:'1px solid rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><TTLogoSVG size={11}/></div>
                  {sidebarOpen && <>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'11px',fontWeight:'600',color:isActiveTT?'#a5b4fc':'#888',textAlign:'left'}}>TikTok Ads</div>
                      <div style={{fontSize:'9px',color:'var(--text4)',marginTop:'1px'}}>{ttAccs.length} cuenta{ttAccs.length!==1?'s':''}</div>
                    </div>
                    <span style={{fontSize:'10px',color:'var(--text4)',transition:'transform .2s',transform:tiktokAdsOpen?'rotate(180deg)':'rotate(0deg)',flexShrink:0}}>▾</span>
                  </>}
                </div>
                <div style={{overflow:'hidden',maxHeight:tiktokAdsOpen&&sidebarOpen?'120px':'0',transition:'max-height .3s ease'}}>
                  <div className="nav-hover"
                    onClick={()=>navigate('/dashboard/reportes/'+firstTT.account_id+'?tab=overview')}
                    style={{display:'flex',alignItems:'center',gap:'7px',padding:'5px 8px 5px 28px',borderRadius:'6px',cursor:'pointer'}}>
                    <span style={{fontSize:'11px'}}>📊</span>
                    <div style={{fontSize:'10px',color:'#666',fontWeight:'500'}}>Resumen</div>
                  </div>
                </div>
              </>
            )
          })()}

          {/* Plataformas no conectadas — siempre visibles como invitación a conectar */}
          {!accounts.some(a=>a.platform==='meta_ads') && (
            <div onClick={()=>navigate('/dashboard/meta-ads')} className="nav-hover" title="Ver estado de Meta Ads"
              style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 8px',borderRadius:'7px',cursor:'pointer',opacity:.75,background:activeSection==='meta-ads'?'rgba(24,119,242,.1)':'transparent'}}>
              <div style={{width:'20px',height:'20px',borderRadius:'5px',background:'rgba(24,119,242,.2)',border:'1px dashed rgba(24,119,242,.4)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <FbLogoSVG size={11}/>
              </div>
              {sidebarOpen && <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'11px',fontWeight:'600',color:activeSection==='meta-ads'?'#60a5fa':'#555'}}>Meta Ads</div>
                <div style={{fontSize:'9px',color:'#a5b4fc',marginTop:'1px'}}>Sin cuentas de ads →</div>
              </div>}
            </div>
          )}
          {!accounts.some(a=>a.platform==='google_ads') && (
            <a href="/api/auth/google-ads/login"
              style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 8px',borderRadius:'7px',cursor:'pointer',textDecoration:'none',opacity:.7}}>
              <div style={{width:'20px',height:'20px',borderRadius:'5px',background:'rgba(255,255,255,.06)',border:'1px dashed rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <GoogleLogoSVG size={12}/>
              </div>
              {sidebarOpen && <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'11px',fontWeight:'600',color:'#555'}}>Google Ads</div>
                <div style={{fontSize:'9px',color:'#a5b4fc',marginTop:'1px'}}>Conectar →</div>
              </div>}
            </a>
          )}
          {!accounts.some(a=>a.platform==='tiktok_ads') && (
            <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 8px',borderRadius:'7px',opacity:.4,cursor:'default'}}>
              <div style={{width:'20px',height:'20px',borderRadius:'5px',background:'rgba(255,255,255,.04)',border:'1px dashed rgba(255,255,255,.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <TTLogoSVG size={10}/>
              </div>
              {sidebarOpen && <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'11px',fontWeight:'600',color:'#444'}}>TikTok Ads</div>
                <div style={{fontSize:'9px',color:'#555',marginTop:'1px'}}>Próximamente</div>
              </div>}
            </div>
          )}

          {sidebarOpen && <div style={{fontSize:'9px',color:'var(--text4)',fontWeight:'600',letterSpacing:'.08em',textTransform:'uppercase',padding:'10px 8px 3px'}}>Sistema</div>}
          <div className="nav-hover" onClick={()=>navigate('/dashboard/settings')}
            style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 8px',borderRadius:'7px',cursor:'pointer',background:activeSection==='settings'?'rgba(99,102,241,.14)':'transparent'}}>
            <span style={{fontSize:'14px',width:'20px',textAlign:'center',flexShrink:0,fontWeight:'bold'}}>⚙</span>
            {sidebarOpen && <div style={{fontSize:'11px',fontWeight:'600',color:activeSection==='settings'?'#a5b4fc':'#888'}}>Ajustes</div>}
          </div>
        </nav>

        {/* User */}
        <div style={{padding:'6px 5px',borderTop:'1px solid var(--border)',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 8px',borderRadius:'7px'}}>
            <div style={{width:'24px',height:'24px',borderRadius:'50%',background:'rgba(99,102,241,.15)',border:'1px solid rgba(99,102,241,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',color:'#a5b4fc',fontWeight:'700',flexShrink:0}}>
              {user.email?.[0]?.toUpperCase()}
            </div>
            {sidebarOpen && <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:'10px',color:'var(--text3)',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.email}</div>
              <div style={{fontSize:'9px',color:isPro?'#6366f1':'#555',fontWeight:'700',marginTop:'1px'}}>{isPro===null?'':isPro?'Pro ✦':'Free'}</div>
            </div>}
          </div>
          <div className="nav-hover" onClick={handleLogout}
            style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 8px',borderRadius:'7px',cursor:'pointer',border:'none',background:'transparent',width:'100%'}}>
            <span style={{fontSize:'13px',width:'20px',textAlign:'center',flexShrink:0,fontWeight:'bold'}}>⊗</span>
            {sidebarOpen && <span style={{fontSize:'11px',color:'var(--text3)',whiteSpace:'nowrap'}}>Cerrar sesión</span>}
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>

        {/* TOPBAR */}
        <header style={{height:'50px',background:'var(--sidebar)',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',padding:'0 14px',gap:'10px',flexShrink:0,zIndex:10}}>
          <button className="btn-hover" onClick={()=>setSidebarOpen(!sidebarOpen)}
            style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:'16px',padding:'3px 5px',borderRadius:'5px',fontWeight:'bold'}}>≡</button>

          {/* Breadcrumb */}
          <div style={{flex:1,display:'flex',alignItems:'center',gap:'6px',minWidth:0}}>
            <span style={{fontSize:'13px',fontWeight:'700',color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{topbarTitle}</span>
            {isReportePage && selectedAccount && (
              <span style={{fontSize:'10px',color:'var(--text4)',background:'rgba(255,255,255,.05)',padding:'2px 7px',borderRadius:'4px',fontFamily:'monospace',flexShrink:0}}>{selectedAccount.platform==='meta_ads'?'Meta':selectedAccount.platform==='google_ads'?'Google':selectedAccount.platform==='tiktok_ads'?'TikTok':'Ads'}</span>
            )}
          </div>

          {/* Active account pill (only on reports pages) */}
          {isReportePage && accounts.length > 1 && (
            <button className="btn-hover" onClick={()=>setStripOpen(!stripOpen)}
              style={{display:'flex',alignItems:'center',gap:'6px',padding:'5px 10px',borderRadius:'7px',border:'1px solid var(--border)',background:stripOpen?'rgba(255,255,255,.06)':'transparent',cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>
              <div style={{width:'6px',height:'6px',borderRadius:'50%',background:selectedAccount?.is_active?'#6ee7b7':'#f87171',flexShrink:0}}></div>
              <span style={{fontSize:'11px',color:'var(--text3)',whiteSpace:'nowrap',maxWidth:'140px',overflow:'hidden',textOverflow:'ellipsis'}}>{selectedAccount?.account_name||selectedAccount?.account_id||'Cuenta'}</span>
              <span style={{fontSize:'9px',color:'var(--text4)',transition:'transform .2s',transform:stripOpen?'rotate(180deg)':'rotate(0)'}}>▾</span>
            </button>
          )}

          {/* Platforms button */}
          <button className="btn-hover" onClick={()=>navigate('/dashboard/platforms')}
            style={{display:'flex',alignItems:'center',gap:'5px',padding:'5px 10px',borderRadius:'7px',border:'1px solid rgba(99,102,241,.3)',background:'rgba(99,102,241,.08)',cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>
            <span style={{fontSize:'13px',fontWeight:'bold',color:'#a5b4fc',lineHeight:1}}>+</span>
            <span style={{fontSize:'11px',color:'#a5b4fc',whiteSpace:'nowrap'}}>Plataformas</span>
          </button>
        </header>

        {/* ACCOUNTS STRIP - account switcher for reports pages */}
        <div style={{background:'var(--sidebar)',borderBottom:stripOpen?'1px solid rgba(255,255,255,.06)':'none',overflow:'hidden',maxHeight:stripOpen?'72px':'0',transition:'max-height .25s ease',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 14px',overflowX:'auto',scrollbarWidth:'none'}}>
            <span style={{fontSize:'9px',color:'var(--text4)',fontFamily:'monospace',whiteSpace:'nowrap',flexShrink:0}}>CAMBIAR CUENTA:</span>
            {(isPro ? accounts : accounts.slice(0,1)).map(acc=>(
              <div key={acc.id} className="pill-hover" onClick={()=>selectAccount(acc)}
                style={{display:'flex',alignItems:'center',gap:'7px',padding:'6px 11px',background:selectedAccount?.id===acc.id?'rgba(99,102,241,.14)':'rgba(255,255,255,.04)',border:'1px solid '+(selectedAccount?.id===acc.id?'rgba(99,102,241,.3)':'rgba(255,255,255,.07)'),borderRadius:'8px',cursor:'pointer',flexShrink:0,transition:'all .15s'}}>
                <div style={{width:'6px',height:'6px',borderRadius:'50%',background:acc.is_active?'#6ee7b7':'#f87171',flexShrink:0}}></div>
                <div>
                  <div style={{fontSize:'11px',fontWeight:'700',color:selectedAccount?.id===acc.id?'#a5b4fc':'#ddd',whiteSpace:'nowrap'}}>{acc.account_name||acc.account_id}</div>
                  <div style={{fontSize:'9px',color:'var(--text4)',marginTop:'1px'}}>{acc.platform==='meta_ads'?'Meta Ads':acc.platform==='google_ads'?'Google Ads':acc.platform==='tiktok_ads'?'TikTok Ads':acc.platform}</div>
                </div>
              </div>
            ))}
            {!isPro && accounts.length > 1 && (
              <a href="/planes" style={{display:'flex',alignItems:'center',gap:'5px',padding:'6px 10px',background:'rgba(252,211,77,.06)',border:'1px solid rgba(252,211,77,.15)',borderRadius:'8px',textDecoration:'none',flexShrink:0}}>
                <span style={{fontSize:'10px',color:'#fcd34d',fontWeight:'600',whiteSpace:'nowrap'}}>🔒 +{accounts.length-1} en Pro</span>
              </a>
            )}
          </div>
        </div>

        {/* FREE PLAN BANNER */}
        {isPro === false && (
          <div style={{background:'rgba(99,102,241,.08)',borderBottom:'1px solid rgba(99,102,241,.15)',padding:'8px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <span style={{fontSize:'11px',color:'#a5b4fc',fontFamily:'monospace'}}>
              Plan Free — acceso limitado a Overview · ultimos 30 dias
            </span>
            <a href="/planes" style={{fontSize:'11px',color:'#fff',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',padding:'4px 12px',borderRadius:'6px',textDecoration:'none',fontWeight:'700',flexShrink:0}}>
              Actualizar a Pro →
            </a>
          </div>
        )}
        {/* PAGE CONTENT */}
        <div style={{flex:1,overflowY:'auto'}}>
          {children}
        </div>
      </div>
    </div>
  )
}
