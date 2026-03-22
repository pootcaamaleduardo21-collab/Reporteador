'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [token, setToken] = useState(null)
  const [pages, setPages] = useState([])
  const [igAccounts, setIgAccounts] = useState([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingOrganic, setLoadingOrganic] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')
  const [activePage, setActivePage] = useState(null)
  const [activeIg, setActiveIg] = useState(null)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [stripOpen, setStripOpen] = useState(false)
  const [reportsOpen, setReportsOpen] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      setUser(user)
      const { data: accs } = await supabase.from('ad_accounts').select('*').eq('user_id', user.id)
      if (accs) { setAccounts(accs); if (accs.length > 0) setSelectedAccount(accs[0]) }
      const { data: tokenRow } = await supabase.from('meta_tokens').select('access_token').eq('user_id', user.id).single()
      if (tokenRow) setToken(tokenRow.access_token)
      setLoadingAccounts(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (token && (activeSection === 'facebook' || activeSection === 'instagram') && pages.length === 0) fetchOrganic()
  }, [token, activeSection])

  async function fetchOrganic() {
    setLoadingOrganic(true)
    try {
      const pagesRes = await fetch('https://graph.facebook.com/v21.0/me/accounts?fields=id,name,fan_count,followers_count,picture&access_token=' + token + '&limit=50')
      const pagesJ = await pagesRes.json()
      const pagesData = pagesJ.data || []
      const pagesWithData = await Promise.all(pagesData.map(async (page) => {
        try {
          const insRes = await fetch('https://graph.facebook.com/v21.0/' + page.id + '/insights?metric=page_impressions,page_reach,page_engaged_users,page_post_engagements,page_fan_adds_unique,page_fan_removes_unique&period=day&date_preset=last_28_days&access_token=' + token)
          const insJ = await insRes.json()
          const ins = {}
          ;(insJ.data || []).forEach(m => { ins[m.name] = (m.values||[]).reduce((s,v)=>s+(v.value||0),0) })
          const postsRes = await fetch('https://graph.facebook.com/v21.0/' + page.id + '/posts?fields=id,message,created_time,likes.summary(true),comments.summary(true),shares&limit=8&access_token=' + token)
          const postsJ = await postsRes.json()
          const igRes = await fetch('https://graph.facebook.com/v21.0/' + page.id + '?fields=instagram_business_account&access_token=' + token)
          const igJ = await igRes.json()
          return { ...page, insights: ins, posts: postsJ.data||[], ig_id: igJ.instagram_business_account?.id||null }
        } catch(e) { return { ...page, insights:{}, posts:[] } }
      }))
      setPages(pagesWithData)
      if (pagesWithData.length > 0) setActivePage(pagesWithData[0])
      const igIds = pagesWithData.filter(p=>p.ig_id).map(p=>({ig_id:p.ig_id,page_name:p.name}))
      const igWithData = await Promise.all(igIds.map(async ({ig_id,page_name}) => {
        try {
          const igR = await fetch('https://graph.facebook.com/v21.0/'+ig_id+'?fields=id,name,username,followers_count,media_count,profile_picture_url&access_token='+token)
          const igJ = await igR.json()
          const insR = await fetch('https://graph.facebook.com/v21.0/'+ig_id+'/insights?metric=reach,impressions,profile_views,follower_count&period=day&since='+Math.floor((Date.now()-28*864e5)/1000)+'&until='+Math.floor(Date.now()/1000)+'&access_token='+token)
          const insJ = await insR.json()
          const ins = {}
          ;(insJ.data||[]).forEach(m=>{ins[m.name]=(m.values||[]).reduce((s,v)=>s+(v.value||0),0)})
          const mediaR = await fetch('https://graph.facebook.com/v21.0/'+ig_id+'/media?fields=id,caption,media_type,timestamp,like_count,comments_count,reach,impressions,saved&limit=9&access_token='+token)
          const mediaJ = await mediaR.json()
          return {...igJ,insights:ins,media:mediaJ.data||[],page_name}
        } catch(e){return{ig_id,page_name,insights:{},media:[]}}
      }))
      const valid = igWithData.filter(a=>a.username)
      setIgAccounts(valid)
      if (valid.length > 0) setActiveIg(valid[0])
    } catch(e){console.error(e)}
    setLoadingOrganic(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const fmtN = v => (+v||0)>=1e6?((+v/1e6).toFixed(1)+'M'):(+v||0)>=1e3?((+v/1e3).toFixed(1)+'K'):String(Math.round(+v||0))

  const navSections = [
    { id:'overview', icon:'📊', label:'Overview' },
    { id:'facebook', icon:'📘', label:'Facebook', sub:'Organico' },
    { id:'instagram', icon:'📸', label:'Instagram', sub:'Organico' },
  ]

  const sectionTitles = {
    overview: selectedAccount?.account_name || 'Dashboard',
    facebook: 'Facebook Organico',
    instagram: 'Instagram Organico',
    settings: 'Ajustes',
  }

  if (!user) return <div style={{minHeight:'100vh',background:'#0c0c10'}}></div>

  return (
    <div style={{display:'flex',height:'100vh',background:'#0c0c10',fontFamily:'"Plus Jakarta Sans",system-ui,sans-serif',overflow:'hidden'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:4px}
        .nav-item-hover:hover{background:rgba(255,255,255,.05)!important}
        .acc-pill-hover:hover{border-color:rgba(255,255,255,.15)!important}
        .card-hover:hover{border-color:rgba(99,102,241,.3)!important;transform:translateY(-1px)}
        .btn-hover:hover{background:rgba(255,255,255,.06)!important}
        * { transition: background .12s, border-color .12s, color .12s }
      `}</style>

      {/* SIDEBAR */}
      <aside style={{
        width: sidebarOpen ? '210px' : '52px',
        minWidth: sidebarOpen ? '210px' : '52px',
        background:'#111116',
        borderRight:'1px solid rgba(255,255,255,.06)',
        display:'flex',flexDirection:'column',
        height:'100vh',
        overflow:'hidden',
        flexShrink:0,
        transition:'width .2s ease, min-width .2s ease',
      }}>
        {/* Logo */}
        <div style={{padding:'12px 10px',display:'flex',alignItems:'center',gap:'10px',borderBottom:'1px solid rgba(255,255,255,.06)',minHeight:'50px',flexShrink:0}}>
          <div style={{width:'28px',height:'28px',borderRadius:'7px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',flexShrink:0}}>⚡</div>
          {sidebarOpen && <span style={{fontWeight:'800',fontSize:'13px',color:'#fff',whiteSpace:'nowrap',overflow:'hidden'}}>Reporteador</span>}
        </div>

        {/* Nav */}
        <nav style={{padding:'6px 5px',flex:1,overflowY:'auto',overflowX:'hidden'}}>
          <div style={{fontSize:'9px',color:'#333',fontWeight:'600',letterSpacing:'.08em',textTransform:'uppercase',padding:'8px 8px 3px',whiteSpace:'nowrap',opacity:sidebarOpen?1:0}}>Principal</div>

          {navSections.map(s => (
            <div key={s.id} className="nav-item-hover" onClick={()=>setActiveSection(s.id)}
              style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 8px',borderRadius:'7px',cursor:'pointer',marginBottom:'1px',background:activeSection===s.id?'rgba(99,102,241,.14)':'transparent'}}>
              <span style={{fontSize:'14px',width:'20px',textAlign:'center',flexShrink:0}}>{s.icon}</span>
              {sidebarOpen && (
                <div style={{flex:1,overflow:'hidden'}}>
                  <div style={{fontSize:'11px',fontWeight:'600',color:activeSection===s.id?'#a5b4fc':'#888',whiteSpace:'nowrap'}}>{s.label}</div>
                  {s.sub && <div style={{fontSize:'9px',color:'#333',marginTop:'1px'}}>{s.sub}</div>}
                </div>
              )}
            </div>
          ))}

          {sidebarOpen && <div style={{fontSize:'9px',color:'#333',fontWeight:'600',letterSpacing:'.08em',textTransform:'uppercase',padding:'10px 8px 3px'}}>Reportes Ads</div>}

          <div className="nav-item-hover" onClick={()=>setReportsOpen(!reportsOpen)}
            style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 8px',borderRadius:'7px',cursor:'pointer',marginBottom:'1px',border:'none',background:'transparent',width:'100%',color:'inherit',fontFamily:'inherit'}}>
            <span style={{fontSize:'14px',width:'20px',textAlign:'center',flexShrink:0}}>📈</span>
            {sidebarOpen && (
              <>
                <div style={{flex:1}}><div style={{fontSize:'11px',fontWeight:'600',color:'#888',textAlign:'left'}}>Desglose</div></div>
                <span style={{fontSize:'10px',color:'#333',transition:'transform .2s',transform:reportsOpen?'rotate(180deg)':'rotate(0deg)'}}>▾</span>
              </>
            )}
          </div>

          <div style={{overflow:'hidden',maxHeight:reportsOpen&&sidebarOpen?'300px':'0',transition:'max-height .25s ease'}}>
            {[{id:'campanas',icon:'💹',label:'Campanas'},{id:'conjuntos',icon:'🎯',label:'Conjuntos'},{id:'creativos',icon:'🎨',label:'Creativos'},{id:'audiencia',icon:'👥',label:'Audiencia'}].map(r=>(
              <div key={r.id} className="nav-item-hover"
                onClick={()=>{ if(selectedAccount) window.location.href='/dashboard/reportes/'+selectedAccount.account_id }}
                style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 8px 6px 20px',borderRadius:'7px',cursor:'pointer',marginBottom:'1px'}}>
                <span style={{fontSize:'13px',width:'20px',textAlign:'center',flexShrink:0}}>{r.icon}</span>
                <div style={{fontSize:'11px',fontWeight:'600',color:'#666',whiteSpace:'nowrap'}}>{r.label}</div>
              </div>
            ))}
          </div>

          {sidebarOpen && <div style={{fontSize:'9px',color:'#333',fontWeight:'600',letterSpacing:'.08em',textTransform:'uppercase',padding:'10px 8px 3px'}}>Config</div>}
          <div className="nav-item-hover" onClick={()=>setActiveSection('settings')}
            style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 8px',borderRadius:'7px',cursor:'pointer',marginBottom:'1px',background:activeSection==='settings'?'rgba(99,102,241,.14)':'transparent'}}>
            <span style={{fontSize:'14px',width:'20px',textAlign:'center',flexShrink:0}}>⚙️</span>
            {sidebarOpen && <div style={{fontSize:'11px',fontWeight:'600',color:activeSection==='settings'?'#a5b4fc':'#888'}}>Ajustes</div>}
          </div>
        </nav>

        {/* User */}
        <div style={{padding:'6px 5px',borderTop:'1px solid rgba(255,255,255,.06)',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 8px',borderRadius:'7px'}}>
            <div style={{width:'24px',height:'24px',borderRadius:'50%',background:'rgba(99,102,241,.15)',border:'1px solid rgba(99,102,241,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',color:'#a5b4fc',fontWeight:'700',flexShrink:0}}>
              {user.email?.[0]?.toUpperCase()}
            </div>
            {sidebarOpen && (
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.email}</div>
                <div style={{fontSize:'9px',color:'#6366f1',fontWeight:'700',marginTop:'1px'}}>Pro ✦</div>
              </div>
            )}
          </div>
          <div className="nav-item-hover" onClick={handleLogout}
            style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 8px',borderRadius:'7px',cursor:'pointer',border:'none',background:'transparent',width:'100%'}}>
            <span style={{fontSize:'13px',width:'20px',textAlign:'center',flexShrink:0}}>🚪</span>
            {sidebarOpen && <span style={{fontSize:'11px',color:'#444',whiteSpace:'nowrap'}}>Cerrar sesion</span>}
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>

        {/* TOPBAR */}
        <header style={{height:'50px',background:'#111116',borderBottom:'1px solid rgba(255,255,255,.06)',display:'flex',alignItems:'center',padding:'0 14px',gap:'10px',flexShrink:0}}>
          <button className="btn-hover" onClick={()=>setSidebarOpen(!sidebarOpen)}
            style={{background:'transparent',border:'none',cursor:'pointer',color:'#444',fontSize:'16px',padding:'3px 5px',borderRadius:'5px'}}>
            ☰
          </button>
          <span style={{fontSize:'13px',fontWeight:'700',color:'#fff',flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
            {sectionTitles[activeSection]}
          </span>
          {activeSection==='overview' && (
            <div style={{display:'flex',gap:'2px'}}>
              {['Hoy','7d','Mes','30d'].map((d,i)=>(
                <button key={d} style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid',fontSize:'10px',cursor:'pointer',fontFamily:'inherit',borderColor:i===2?'rgba(99,102,241,.3)':'rgba(255,255,255,.07)',background:i===2?'rgba(99,102,241,.14)':'transparent',color:i===2?'#a5b4fc':'#444',fontWeight:i===2?'600':'400'}}>
                  {d}
                </button>
              ))}
            </div>
          )}
          {/* Accounts strip toggle */}
          {accounts.length > 0 && (
            <button className="btn-hover" onClick={()=>setStripOpen(!stripOpen)}
              style={{display:'flex',alignItems:'center',gap:'5px',padding:'4px 9px',borderRadius:'6px',border:'1px solid rgba(255,255,255,.07)',background:'transparent',cursor:'pointer',fontFamily:'inherit'}}>
              <span style={{fontSize:'10px',color:'#666',whiteSpace:'nowrap'}}>{accounts.length} cuentas</span>
              <span style={{fontSize:'10px',color:'#444',transition:'transform .2s',transform:stripOpen?'rotate(180deg)':'rotate(0)'}}>▾</span>
            </button>
          )}
        </header>

        {/* ACCOUNTS STRIP */}
        <div style={{
          background:'#111116',
          borderBottom: stripOpen ? '1px solid rgba(255,255,255,.06)' : 'none',
          overflow:'hidden',
          maxHeight: stripOpen ? '70px' : '0',
          transition:'max-height .25s ease, border-bottom .25s',
          flexShrink:0,
        }}>
          <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 14px',overflowX:'auto',scrollbarWidth:'none'}}>
            {accounts.map(acc => (
              <div key={acc.id} className="acc-pill-hover" onClick={()=>{setSelectedAccount(acc);setStripOpen(false);setActiveSection('overview')}}
                style={{
                  display:'flex',alignItems:'center',gap:'7px',
                  padding:'6px 11px',
                  background:selectedAccount?.id===acc.id?'rgba(99,102,241,.14)':'rgba(255,255,255,.04)',
                  border:'1px solid '+(selectedAccount?.id===acc.id?'rgba(99,102,241,.3)':'rgba(255,255,255,.07)'),
                  borderRadius:'8px',cursor:'pointer',flexShrink:0,whiteSpace:'nowrap',
                }}>
                <div style={{width:'6px',height:'6px',borderRadius:'50%',background:acc.is_active?'#6ee7b7':'#f87171',flexShrink:0}}></div>
                <div>
                  <div style={{fontSize:'11px',fontWeight:'700',color:selectedAccount?.id===acc.id?'#a5b4fc':'#ddd'}}>{acc.account_name||acc.account_id}</div>
                  <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace',marginTop:'1px'}}>{acc.account_id}</div>
                </div>
              </div>
            ))}
            <a href="/api/auth/meta" style={{display:'flex',alignItems:'center',gap:'5px',padding:'6px 10px',background:'rgba(99,102,241,.08)',border:'1px solid rgba(99,102,241,.2)',borderRadius:'8px',textDecoration:'none',flexShrink:0}}>
              <span style={{fontSize:'10px',color:'#a5b4fc',fontWeight:'600'}}>🔗 Reconectar</span>
            </a>
          </div>
        </div>

        {/* CONTENT */}
        <main style={{flex:1,overflowY:'auto',padding:'20px'}}>

          {/* OVERVIEW */}
          {activeSection==='overview' && (
            loadingAccounts ? (
              <div style={{textAlign:'center',padding:'80px 0',color:'#333',fontFamily:'monospace',fontSize:'12px'}}>Cargando...</div>
            ) : accounts.length === 0 ? (
              <div style={{textAlign:'center',padding:'80px 0'}}>
                <div style={{fontSize:'48px',marginBottom:'20px'}}>📊</div>
                <h2 style={{color:'#fff',fontSize:'20px',fontWeight:'800',marginBottom:'10px'}}>Conecta tu cuenta de Meta Ads</h2>
                <p style={{color:'#444',fontSize:'12px',marginBottom:'32px'}}>Conecta tus cuentas para ver metricas en tiempo real</p>
                <a href="/api/auth/meta" style={{display:'inline-flex',alignItems:'center',gap:'10px',background:'#1877f2',color:'#fff',padding:'12px 24px',borderRadius:'9px',fontSize:'13px',fontWeight:'700',textDecoration:'none'}}>
                  Conectar con Facebook
                </a>
              </div>
            ) : selectedAccount ? (
              <div>
                <div style={{marginBottom:'4px',display:'flex',alignItems:'center',gap:'10px'}}>
                  <div style={{width:'8px',height:'8px',borderRadius:'50%',background:selectedAccount.is_active?'#6ee7b7':'#f87171'}}></div>
                  <h2 style={{fontSize:'16px',fontWeight:'800',color:'#fff'}}>{selectedAccount.account_name||selectedAccount.account_id}</h2>
                  <span style={{fontSize:'10px',color:selectedAccount.is_active?'#6ee7b7':'#f87171',fontFamily:'monospace',background:selectedAccount.is_active?'rgba(110,231,183,.08)':'rgba(248,113,113,.08)',padding:'2px 8px',borderRadius:'20px',border:'1px solid '+(selectedAccount.is_active?'rgba(110,231,183,.2)':'rgba(248,113,113,.2)')}}>
                    {selectedAccount.is_active?'ACTIVA':'PAUSADA'}
                  </span>
                </div>
                <div style={{fontSize:'10px',color:'#333',fontFamily:'monospace',marginBottom:'20px'}}>{selectedAccount.account_id}</div>

                <div style={{display:'flex',justifyContent:'center',marginTop:'60px',flexDirection:'column',alignItems:'center',gap:'16px'}}>
                  <div style={{fontSize:'40px'}}>📊</div>
                  <p style={{color:'#444',fontSize:'12px',fontFamily:'monospace',textAlign:'center'}}>Selecciona una cuenta y haz clic en Ver reportes para ver tus metricas completas</p>
                  <button onClick={()=>window.location.href='/dashboard/reportes/'+selectedAccount.account_id}
                    style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',padding:'12px 28px',borderRadius:'10px',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>
                    Ver reportes de {selectedAccount.account_name||selectedAccount.account_id} →
                  </button>
                </div>
              </div>
            ) : null
          )}

          {/* FACEBOOK */}
          {activeSection==='facebook' && (
            <div>
              {loadingOrganic && <div style={{textAlign:'center',padding:'80px 0',color:'#333',fontFamily:'monospace',fontSize:'12px'}}>Cargando Facebook...</div>}
              {!loadingOrganic && pages.length===0 && <div style={{textAlign:'center',padding:'60px 0',color:'#333',fontFamily:'monospace'}}>No se encontraron paginas</div>}
              {!loadingOrganic && pages.length>0 && (
                <div style={{display:'grid',gridTemplateColumns:'200px 1fr',gap:'16px'}}>
                  <div>
                    <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'8px'}}>Paginas</div>
                    {pages.map(page=>(
                      <div key={page.id} onClick={()=>setActivePage(page)}
                        style={{display:'flex',alignItems:'center',gap:'8px',padding:'9px 10px',borderRadius:'9px',cursor:'pointer',marginBottom:'3px',background:activePage?.id===page.id?'rgba(24,119,242,.1)':'rgba(255,255,255,.03)',border:'1px solid '+(activePage?.id===page.id?'rgba(24,119,242,.3)':'transparent')}}>
                        {page.picture?.data?.url?<img src={page.picture.data.url} style={{width:'28px',height:'28px',borderRadius:'50%',flexShrink:0}} alt=""/>
                          :<div style={{width:'28px',height:'28px',borderRadius:'50%',background:'#1877f2',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'#fff',fontSize:'12px',fontWeight:'700'}}>f</div>}
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:'11px',fontWeight:'700',color:'#ccc',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{page.name}</div>
                          <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace'}}>{fmtN(page.fan_count||0)} fans</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {activePage && (
                    <div>
                      <div style={{background:'#17171d',border:'1px solid rgba(255,255,255,.07)',borderRadius:'12px',padding:'16px',marginBottom:'14px',display:'flex',alignItems:'center',gap:'12px'}}>
                        {activePage.picture?.data?.url?<img src={activePage.picture.data.url} style={{width:'44px',height:'44px',borderRadius:'50%',border:'2px solid #1877f2'}} alt=""/>
                          :<div style={{width:'44px',height:'44px',borderRadius:'50%',background:'#1877f2',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'18px',fontWeight:'700'}}>f</div>}
                        <div style={{flex:1}}><div style={{color:'#fff',fontSize:'15px',fontWeight:'800'}}>{activePage.name}</div><div style={{color:'#444',fontSize:'10px',fontFamily:'monospace',marginTop:'2px'}}>ultimos 28 dias</div></div>
                        <div style={{textAlign:'right'}}><div style={{fontSize:'22px',fontWeight:'800',color:'#fff'}}>{fmtN(activePage.fan_count||0)}</div><div style={{fontSize:'10px',color:'#444',fontFamily:'monospace'}}>seguidores</div></div>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:'8px',marginBottom:'14px'}}>
                        {[
                          {l:'Alcance',v:fmtN(activePage.insights.page_reach||0),c:'#6ee7b7',icon:'👁'},
                          {l:'Impresiones',v:fmtN(activePage.insights.page_impressions||0),c:'#60a5fa',icon:'📡'},
                          {l:'Engagement',v:fmtN(activePage.insights.page_post_engagements||0),c:'#fb923c',icon:'❤️'},
                          {l:'Usuarios activos',v:fmtN(activePage.insights.page_engaged_users||0),c:'#a78bfa',icon:'👥'},
                          {l:'Nuevos fans',v:'+'+fmtN(activePage.insights.page_fan_adds_unique||0),c:'#6ee7b7',icon:'➕'},
                          {l:'Fans perdidos',v:'-'+fmtN(activePage.insights.page_fan_removes_unique||0),c:'#f87171',icon:'➖'},
                        ].map(m=>(
                          <div key={m.l} style={{background:'#17171d',border:'1px solid rgba(255,255,255,.07)',borderRadius:'10px',padding:'13px'}}>
                            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
                              <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.06em'}}>{m.l}</div>
                              <span style={{fontSize:'13px'}}>{m.icon}</span>
                            </div>
                            <div style={{fontSize:'20px',fontWeight:'800',color:m.c}}>{m.v}</div>
                          </div>
                        ))}
                      </div>
                      {activePage.posts.length>0 && (
                        <div style={{background:'#17171d',border:'1px solid rgba(255,255,255,.07)',borderRadius:'12px',padding:'16px'}}>
                          <div style={{fontSize:'12px',fontWeight:'700',color:'#fff',marginBottom:'12px'}}>Publicaciones recientes</div>
                          {activePage.posts.map(post=>(
                            <div key={post.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',borderRadius:'8px',background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.04)',marginBottom:'6px'}}>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{color:'#888',fontSize:'11px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{post.message?post.message.slice(0,80):'(Sin texto)'}</div>
                                <div style={{color:'#333',fontSize:'9px',fontFamily:'monospace',marginTop:'2px'}}>{new Date(post.created_time).toLocaleDateString('es-MX')}</div>
                              </div>
                              <div style={{display:'flex',gap:'14px',flexShrink:0}}>
                                <span style={{fontSize:'12px',fontWeight:'700',color:'#f87171'}}>❤ {fmtN(post.likes?.summary?.total_count||0)}</span>
                                <span style={{fontSize:'12px',fontWeight:'700',color:'#60a5fa'}}>💬 {fmtN(post.comments?.summary?.total_count||0)}</span>
                                <span style={{fontSize:'12px',fontWeight:'700',color:'#6ee7b7'}}>↗ {fmtN(post.shares?.count||0)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* INSTAGRAM */}
          {activeSection==='instagram' && (
            <div>
              {loadingOrganic && <div style={{textAlign:'center',padding:'80px 0',color:'#333',fontFamily:'monospace',fontSize:'12px'}}>Cargando Instagram...</div>}
              {!loadingOrganic && igAccounts.length===0 && <div style={{textAlign:'center',padding:'60px 0',color:'#333',fontFamily:'monospace'}}>No se encontraron cuentas de Instagram Business</div>}
              {!loadingOrganic && igAccounts.length>0 && (
                <div style={{display:'grid',gridTemplateColumns:'200px 1fr',gap:'16px'}}>
                  <div>
                    <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'8px'}}>Cuentas</div>
                    {igAccounts.map(ig=>(
                      <div key={ig.id} onClick={()=>setActiveIg(ig)}
                        style={{display:'flex',alignItems:'center',gap:'8px',padding:'9px 10px',borderRadius:'9px',cursor:'pointer',marginBottom:'3px',background:activeIg?.id===ig.id?'rgba(225,48,108,.1)':'rgba(255,255,255,.03)',border:'1px solid '+(activeIg?.id===ig.id?'rgba(225,48,108,.3)':'transparent')}}>
                        {ig.profile_picture_url?<img src={ig.profile_picture_url} style={{width:'28px',height:'28px',borderRadius:'50%',border:'2px solid #e1306c',flexShrink:0}} alt=""/>
                          :<div style={{width:'28px',height:'28px',borderRadius:'50%',background:'linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'#fff',fontSize:'11px',fontWeight:'700'}}>ig</div>}
                        <div style={{minWidth:0}}>
                          <div style={{fontSize:'11px',fontWeight:'700',color:'#ccc',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>@{ig.username}</div>
                          <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace'}}>{fmtN(ig.followers_count||0)} seguidores</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {activeIg && (
                    <div>
                      <div style={{background:'#17171d',border:'1px solid rgba(255,255,255,.07)',borderRadius:'12px',padding:'16px',marginBottom:'14px',display:'flex',alignItems:'center',gap:'12px'}}>
                        {activeIg.profile_picture_url?<img src={activeIg.profile_picture_url} style={{width:'44px',height:'44px',borderRadius:'50%',border:'2px solid #e1306c'}} alt=""/>
                          :<div style={{width:'44px',height:'44px',borderRadius:'50%',background:'linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'18px',fontWeight:'700'}}>ig</div>}
                        <div style={{flex:1}}><div style={{color:'#fff',fontSize:'15px',fontWeight:'800'}}>@{activeIg.username}</div><div style={{color:'#444',fontSize:'10px',fontFamily:'monospace',marginTop:'2px'}}>{activeIg.name} · ultimos 28 dias</div></div>
                        <div style={{display:'flex',gap:'20px'}}>
                          <div style={{textAlign:'center'}}><div style={{fontSize:'20px',fontWeight:'800',color:'#fff'}}>{fmtN(activeIg.followers_count||0)}</div><div style={{fontSize:'10px',color:'#444',fontFamily:'monospace'}}>seguidores</div></div>
                          <div style={{textAlign:'center'}}><div style={{fontSize:'20px',fontWeight:'800',color:'#fff'}}>{fmtN(activeIg.media_count||0)}</div><div style={{fontSize:'10px',color:'#444',fontFamily:'monospace'}}>posts</div></div>
                        </div>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:'8px',marginBottom:'14px'}}>
                        {[
                          {l:'Alcance',v:fmtN(activeIg.insights.reach||0),c:'#e1306c',icon:'👁'},
                          {l:'Impresiones',v:fmtN(activeIg.insights.impressions||0),c:'#fb923c',icon:'📡'},
                          {l:'Vistas perfil',v:fmtN(activeIg.insights.profile_views||0),c:'#a78bfa',icon:'🔍'},
                          {l:'Nuevos seguidores',v:fmtN(activeIg.insights.follower_count||0),c:'#6ee7b7',icon:'➕'},
                        ].map(m=>(
                          <div key={m.l} style={{background:'#17171d',border:'1px solid rgba(255,255,255,.07)',borderRadius:'10px',padding:'13px'}}>
                            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
                              <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.06em'}}>{m.l}</div>
                              <span style={{fontSize:'13px'}}>{m.icon}</span>
                            </div>
                            <div style={{fontSize:'20px',fontWeight:'800',color:m.c}}>{m.v}</div>
                          </div>
                        ))}
                      </div>
                      {activeIg.media?.length>0 && (
                        <div style={{background:'#17171d',border:'1px solid rgba(255,255,255,.07)',borderRadius:'12px',padding:'16px'}}>
                          <div style={{fontSize:'12px',fontWeight:'700',color:'#fff',marginBottom:'12px'}}>Publicaciones recientes</div>
                          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:'8px'}}>
                            {activeIg.media.map(m=>(
                              <div key={m.id} style={{background:'rgba(255,255,255,.02)',borderRadius:'9px',padding:'12px',border:'1px solid rgba(255,255,255,.04)'}}>
                                <div style={{display:'flex',alignItems:'center',gap:'7px',marginBottom:'7px'}}>
                                  <span style={{fontSize:'9px',color:'#555',background:'#1a1a22',padding:'2px 7px',borderRadius:'4px',fontFamily:'monospace'}}>{m.media_type}</span>
                                  <span style={{fontSize:'9px',color:'#333',fontFamily:'monospace'}}>{new Date(m.timestamp).toLocaleDateString('es-MX')}</span>
                                </div>
                                {m.caption && <div style={{color:'#666',fontSize:'10px',marginBottom:'10px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.caption.slice(0,70)}</div>}
                                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'5px'}}>
                                  {[{l:'Likes',v:fmtN(m.like_count||0),c:'#e1306c'},{l:'Coments',v:fmtN(m.comments_count||0),c:'#60a5fa'},{l:'Alcance',v:fmtN(m.reach||0),c:'#6ee7b7'},{l:'Guardados',v:fmtN(m.saved||0),c:'#fb923c'}].map(s=>(
                                    <div key={s.l} style={{textAlign:'center',background:'#111116',borderRadius:'6px',padding:'7px 4px'}}>
                                      <div style={{fontSize:'12px',fontWeight:'700',color:s.c}}>{s.v}</div>
                                      <div style={{fontSize:'8px',color:'#333',fontFamily:'monospace',marginTop:'2px'}}>{s.l}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SETTINGS */}
          {activeSection==='settings' && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',maxWidth:'800px'}}>
              <div style={{background:'#17171d',border:'1px solid rgba(255,255,255,.07)',borderRadius:'12px',padding:'18px'}}>
                <div style={{fontSize:'13px',fontWeight:'700',color:'#fff',marginBottom:'14px'}}>🎨 Apariencia</div>
                {[
                  {label:'Tema',sub:'Oscuro o claro',control:<select style={{background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.2)',color:'#a5b4fc',padding:'5px 10px',borderRadius:'6px',fontSize:'11px',outline:'none'}}><option>Oscuro</option><option>Claro</option></select>},
                  {label:'Idioma',sub:'Idioma de la interfaz',control:<select style={{background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.2)',color:'#a5b4fc',padding:'5px 10px',borderRadius:'6px',fontSize:'11px',outline:'none'}}><option>Español</option><option>English</option><option>Português</option></select>},
                  {label:'Moneda',sub:'Para mostrar gastos',control:<select style={{background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.2)',color:'#a5b4fc',padding:'5px 10px',borderRadius:'6px',fontSize:'11px',outline:'none'}}><option>MXN $</option><option>USD $</option><option>COP $</option></select>},
                ].map(item=>(
                  <div key={item.label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
                    <div><div style={{fontSize:'12px',color:'#888'}}>{item.label}</div><div style={{fontSize:'10px',color:'#333',marginTop:'2px'}}>{item.sub}</div></div>
                    {item.control}
                  </div>
                ))}
              </div>
              <div style={{background:'#17171d',border:'1px solid rgba(255,255,255,.07)',borderRadius:'12px',padding:'18px'}}>
                <div style={{fontSize:'13px',fontWeight:'700',color:'#fff',marginBottom:'14px'}}>🔗 Cuentas conectadas</div>
                {accounts.map(acc=>(
                  <div key={acc.id} style={{display:'flex',alignItems:'center',gap:'8px',padding:'9px 10px',background:'rgba(255,255,255,.03)',borderRadius:'7px',border:'1px solid rgba(255,255,255,.05)',marginBottom:'5px'}}>
                    <div style={{width:'6px',height:'6px',borderRadius:'50%',background:acc.is_active?'#6ee7b7':'#f87171',flexShrink:0}}></div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'11px',fontWeight:'600',color:'#ccc',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{acc.account_name||acc.account_id}</div>
                      <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace'}}>{acc.account_id}</div>
                    </div>
                    <span style={{fontSize:'9px',fontFamily:'monospace',color:acc.is_active?'#6ee7b7':'#f87171',background:acc.is_active?'rgba(110,231,183,.08)':'rgba(248,113,113,.08)',padding:'2px 7px',borderRadius:'20px',border:'1px solid '+(acc.is_active?'rgba(110,231,183,.2)':'rgba(248,113,113,.2)')}}>
                      {acc.is_active?'ACTIVA':'PAUSADA'}
                    </span>
                  </div>
                ))}
                <a href="/api/auth/meta" style={{display:'block',textAlign:'center',marginTop:'10px',padding:'9px',borderRadius:'8px',background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.2)',color:'#a5b4fc',fontSize:'11px',fontWeight:'600',textDecoration:'none'}}>
                  🔗 Reconectar Meta
                </a>
              </div>
              <div style={{background:'#17171d',border:'1px solid rgba(255,255,255,.07)',borderRadius:'12px',padding:'18px'}}>
                <div style={{fontSize:'13px',fontWeight:'700',color:'#fff',marginBottom:'14px'}}>📊 Preferencias</div>
                {[
                  {label:'Periodo por defecto',control:<select style={{background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.2)',color:'#a5b4fc',padding:'5px 10px',borderRadius:'6px',fontSize:'11px',outline:'none'}}><option>Este mes</option><option>7 dias</option><option>30 dias</option></select>},
                ].map(item=>(
                  <div key={item.label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
                    <div style={{fontSize:'12px',color:'#888'}}>{item.label}</div>
                    {item.control}
                  </div>
                ))}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0'}}>
                  <div style={{fontSize:'12px',color:'#888'}}>Version</div>
                  <span style={{fontSize:'10px',color:'#333',fontFamily:'monospace'}}>v1.0.0</span>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
