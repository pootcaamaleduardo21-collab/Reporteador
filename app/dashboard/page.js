'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const SIDEBAR_WIDTH = 260

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [token, setToken] = useState(null)
  const [pages, setPages] = useState([])
  const [igAccounts, setIgAccounts] = useState([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingOrganic, setLoadingOrganic] = useState(false)
  const [activeSection, setActiveSection] = useState('ads')
  const [activePage, setActivePage] = useState(null)
  const [activeIg, setActiveIg] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }
      setUser(user)
      const { data: accs } = await supabase.from('ad_accounts').select('*').eq('user_id', user.id)
      if (accs) setAccounts(accs)
      const { data: tokenRow } = await supabase.from('meta_tokens').select('access_token').eq('user_id', user.id).single()
      if (tokenRow) setToken(tokenRow.access_token)
      setLoadingAccounts(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (token && (activeSection === 'facebook' || activeSection === 'instagram')) fetchOrganic()
  }, [token, activeSection])

  async function fetchOrganic() {
    if (pages.length > 0) return
    setLoadingOrganic(true)
    try {
      const pagesRes = await fetch('https://graph.facebook.com/v21.0/me/accounts?fields=id,name,fan_count,followers_count,picture&access_token=' + token + '&limit=50')
      const pagesJ = await pagesRes.json()
      const pagesData = pagesJ.data || []

      const pagesWithInsights = await Promise.all(pagesData.map(async (page) => {
        try {
          const insRes = await fetch('https://graph.facebook.com/v21.0/' + page.id + '/insights?metric=page_impressions,page_reach,page_engaged_users,page_post_engagements,page_fan_adds_unique,page_fan_removes_unique&period=day&date_preset=last_28_days&access_token=' + token)
          const insJ = await insRes.json()
          const ins = {}
          ;(insJ.data || []).forEach(m => {
            const total = (m.values || []).reduce((s, v) => s + (v.value || 0), 0)
            ins[m.name] = total
          })
          const postsRes = await fetch('https://graph.facebook.com/v21.0/' + page.id + '/posts?fields=id,message,created_time,likes.summary(true),comments.summary(true),shares&limit=8&access_token=' + token)
          const postsJ = await postsRes.json()
          const igRes = await fetch('https://graph.facebook.com/v21.0/' + page.id + '?fields=instagram_business_account&access_token=' + token)
          const igJ = await igRes.json()
          return { ...page, insights: ins, posts: postsJ.data || [], ig_id: igJ.instagram_business_account?.id || null }
        } catch(e) { return { ...page, insights: {}, posts: [] } }
      }))
      setPages(pagesWithInsights)
      if (pagesWithInsights.length > 0) setActivePage(pagesWithInsights[0])

      const igIds = pagesWithInsights.filter(p => p.ig_id).map(p => ({ ig_id: p.ig_id, page_name: p.name }))
      const igWithData = await Promise.all(igIds.map(async ({ ig_id, page_name }) => {
        try {
          const igRes = await fetch('https://graph.facebook.com/v21.0/' + ig_id + '?fields=id,name,username,followers_count,media_count,profile_picture_url&access_token=' + token)
          const igJ = await igRes.json()
          const insRes = await fetch('https://graph.facebook.com/v21.0/' + ig_id + '/insights?metric=reach,impressions,profile_views,follower_count&period=day&since=' + Math.floor((Date.now()-28*864e5)/1000) + '&until=' + Math.floor(Date.now()/1000) + '&access_token=' + token)
          const insJ = await insRes.json()
          const ins = {}
          ;(insJ.data || []).forEach(m => { ins[m.name] = (m.values||[]).reduce((s,v)=>s+(v.value||0),0) })
          const mediaRes = await fetch('https://graph.facebook.com/v21.0/' + ig_id + '/media?fields=id,caption,media_type,timestamp,like_count,comments_count,reach,impressions,saved,thumbnail_url,media_url&limit=9&access_token=' + token)
          const mediaJ = await mediaRes.json()
          return { ...igJ, insights: ins, media: mediaJ.data || [], page_name }
        } catch(e) { return { ig_id, page_name, insights: {}, media: [] } }
      }))
      const validIg = igWithData.filter(a => a.username)
      setIgAccounts(validIg)
      if (validIg.length > 0) setActiveIg(validIg[0])
    } catch(e) { console.error(e) }
    setLoadingOrganic(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const fmtN = v => (+v||0)>=1e6?((+v/1e6).toFixed(1)+'M'):(+v||0)>=1e3?((+v/1e3).toFixed(1)+'K'):String(Math.round(+v||0))

  const navItems = [
    { id: 'ads', icon: '📊', label: 'Meta Ads', sub: accounts.length > 0 ? accounts.length + ' cuentas' : null },
    { id: 'facebook', icon: '📘', label: 'Facebook', sub: 'Organico' },
    { id: 'instagram', icon: '📸', label: 'Instagram', sub: 'Organico' },
  ]

  if (!user) return <div style={{minHeight:'100vh',background:'#0d0d10'}}></div>

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#0d0d10',fontFamily:'"DM Sans",system-ui,sans-serif'}}>

      {/* SIDEBAR */}
      <aside style={{
        width: sidebarOpen ? SIDEBAR_WIDTH+'px' : '64px',
        minHeight:'100vh',
        background:'#111115',
        borderRight:'1px solid rgba(255,255,255,.06)',
        display:'flex',flexDirection:'column',
        transition:'width .2s ease',
        flexShrink:0,
        position:'sticky',top:0,height:'100vh',overflow:'hidden',
        zIndex:50
      }}>
        {/* Logo */}
        <div style={{padding:'20px 16px',borderBottom:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',gap:'10px',minHeight:'64px'}}>
          <div style={{width:'32px',height:'32px',borderRadius:'8px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <span style={{color:'#fff',fontSize:'16px'}}>⚡</span>
          </div>
          {sidebarOpen && <span style={{color:'#fff',fontWeight:'800',fontSize:'15px',letterSpacing:'-.3px',whiteSpace:'nowrap'}}>Reporteador</span>}
        </div>

        {/* Nav */}
        <nav style={{flex:1,padding:'12px 8px',display:'flex',flexDirection:'column',gap:'2px'}}>
          {navItems.map(item => (
            <button key={item.id} onClick={()=>setActiveSection(item.id)}
              style={{
                display:'flex',alignItems:'center',gap:'10px',padding:'10px 10px',borderRadius:'10px',
                border:'none',cursor:'pointer',textAlign:'left',width:'100%',
                background:activeSection===item.id?'rgba(99,102,241,.15)':'transparent',
                transition:'background .15s'
              }}>
              <span style={{fontSize:'18px',flexShrink:0,width:'24px',textAlign:'center'}}>{item.icon}</span>
              {sidebarOpen && (
                <div style={{minWidth:0}}>
                  <div style={{color:activeSection===item.id?'#a5b4fc':'#888',fontSize:'13px',fontWeight:activeSection===item.id?'700':'500',whiteSpace:'nowrap'}}>{item.label}</div>
                  {item.sub && <div style={{color:'#444',fontSize:'10px',fontFamily:'monospace',marginTop:'1px'}}>{item.sub}</div>}
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* User */}
        <div style={{padding:'12px 8px',borderTop:'1px solid rgba(255,255,255,.05)'}}>
          {sidebarOpen && (
            <div style={{padding:'10px',borderRadius:'10px',background:'rgba(255,255,255,.03)',marginBottom:'8px'}}>
              <div style={{color:'#666',fontSize:'10px',fontFamily:'monospace',marginBottom:'2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.email}</div>
            </div>
          )}
          <button onClick={handleLogout} style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 10px',borderRadius:'8px',border:'none',cursor:'pointer',background:'transparent',width:'100%'}}>
            <span style={{fontSize:'16px',flexShrink:0}}>🚪</span>
            {sidebarOpen && <span style={{color:'#555',fontSize:'12px'}}>Cerrar sesion</span>}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>

        {/* Top bar */}
        <header style={{height:'64px',background:'#111115',borderBottom:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',padding:'0 28px',gap:'16px',position:'sticky',top:0,zIndex:40}}>
          <button onClick={()=>setSidebarOpen(!sidebarOpen)}
            style={{background:'transparent',border:'none',color:'#555',cursor:'pointer',fontSize:'18px',padding:'4px',borderRadius:'6px'}}>
            ☰
          </button>
          <div style={{flex:1}}>
            <h1 style={{color:'#fff',fontSize:'16px',fontWeight:'700',margin:0}}>
              {activeSection==='ads'?'Meta Ads':activeSection==='facebook'?'Facebook Organico':'Instagram Organico'}
            </h1>
          </div>
          <a href="/api/auth/meta" style={{display:'inline-flex',alignItems:'center',gap:'6px',background:'rgba(99,102,241,.15)',color:'#a5b4fc',padding:'7px 14px',borderRadius:'8px',fontSize:'12px',fontWeight:'600',textDecoration:'none',border:'1px solid rgba(99,102,241,.25)'}}>
            <span>🔗</span> Reconectar Meta
          </a>
        </header>

        {/* Content */}
        <main style={{flex:1,padding:'28px',overflow:'auto'}}>

          {/* ADS SECTION */}
          {activeSection==='ads' && (
            loadingAccounts ? (
              <div style={{textAlign:'center',padding:'80px 0',color:'#444',fontFamily:'monospace'}}>Cargando cuentas...</div>
            ) : accounts.length === 0 ? (
              <div style={{textAlign:'center',padding:'80px 0'}}>
                <div style={{fontSize:'56px',marginBottom:'24px'}}>📊</div>
                <h2 style={{color:'#fff',fontSize:'22px',fontWeight:'800',marginBottom:'10px'}}>Conecta tu cuenta de Meta Ads</h2>
                <p style={{color:'#555',fontSize:'13px',marginBottom:'36px'}}>Conecta tus cuentas publicitarias para ver tus metricas</p>
                <a href="/api/auth/meta" style={{display:'inline-flex',alignItems:'center',gap:'10px',background:'#1877f2',color:'#fff',padding:'13px 28px',borderRadius:'10px',fontSize:'13px',fontWeight:'700',textDecoration:'none'}}>
                  Conectar con Facebook
                </a>
              </div>
            ) : (
              <div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'14px'}}>
                  {accounts.map(acc => (
                    <div key={acc.id} style={{background:'#17171c',border:'1px solid rgba(255,255,255,.07)',borderRadius:'14px',padding:'20px',cursor:'pointer',transition:'border-color .15s'}}
                      onClick={()=>window.location.href='/dashboard/reportes/'+acc.account_id}>
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'16px'}}>
                        <div style={{width:'42px',height:'42px',borderRadius:'10px',background:'linear-gradient(135deg,#1877f2,#0e5fc0)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <span style={{color:'#fff',fontSize:'20px'}}>📣</span>
                        </div>
                        <span style={{fontSize:'10px',fontFamily:'monospace',color:acc.is_active?'#6ee7b7':'#f87171',background:acc.is_active?'rgba(110,231,183,.08)':'rgba(248,113,113,.08)',padding:'4px 10px',borderRadius:'20px',border:'1px solid '+(acc.is_active?'rgba(110,231,183,.2)':'rgba(248,113,113,.2)')}}>
                          {acc.is_active?'ACTIVA':'PAUSADA'}
                        </span>
                      </div>
                      <div style={{color:'#fff',fontSize:'15px',fontWeight:'700',marginBottom:'4px'}}>{acc.account_name||'Sin nombre'}</div>
                      <div style={{color:'#444',fontSize:'11px',fontFamily:'monospace',marginBottom:'18px'}}>{acc.account_id}</div>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <span style={{color:'#6366f1',fontSize:'12px',fontWeight:'600'}}>Ver reportes →</span>
                        <div style={{width:'28px',height:'28px',borderRadius:'8px',background:'rgba(99,102,241,.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <span style={{color:'#a5b4fc',fontSize:'14px'}}>→</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {/* FACEBOOK SECTION */}
          {activeSection==='facebook' && (
            <div>
              {loadingOrganic && <div style={{textAlign:'center',padding:'80px 0',color:'#444',fontFamily:'monospace'}}>Cargando datos de Facebook...</div>}
              {!loadingOrganic && pages.length === 0 && (
                <div style={{textAlign:'center',padding:'60px 0',color:'#444',fontFamily:'monospace'}}>No se encontraron paginas de Facebook</div>
              )}
              {!loadingOrganic && pages.length > 0 && (
                <div style={{display:'grid',gridTemplateColumns:'220px 1fr',gap:'20px'}}>
                  {/* Pages list */}
                  <div>
                    <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'10px'}}>Paginas</div>
                    {pages.map(page => (
                      <div key={page.id} onClick={()=>setActivePage(page)}
                        style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',borderRadius:'10px',cursor:'pointer',marginBottom:'4px',background:activePage?.id===page.id?'rgba(24,119,242,.12)':'transparent',border:'1px solid '+(activePage?.id===page.id?'rgba(24,119,242,.3)':'transparent')}}>
                        {page.picture?.data?.url
                          ? <img src={page.picture.data.url} style={{width:'32px',height:'32px',borderRadius:'50%',flexShrink:0}} alt=""/>
                          : <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'#1877f2',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><span style={{color:'#fff',fontSize:'14px'}}>f</span></div>
                        }
                        <div style={{minWidth:0}}>
                          <div style={{color:'#ddd',fontSize:'12px',fontWeight:'600',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{page.name}</div>
                          <div style={{color:'#444',fontSize:'10px',fontFamily:'monospace'}}>{fmtN(page.fan_count||0)} fans</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Page detail */}
                  {activePage && (
                    <div>
                      {/* Page header */}
                      <div style={{background:'#17171c',borderRadius:'14px',padding:'20px',marginBottom:'16px',border:'1px solid rgba(255,255,255,.07)',display:'flex',alignItems:'center',gap:'16px'}}>
                        {activePage.picture?.data?.url
                          ? <img src={activePage.picture.data.url} style={{width:'52px',height:'52px',borderRadius:'50%',border:'3px solid #1877f2'}} alt=""/>
                          : <div style={{width:'52px',height:'52px',borderRadius:'50%',background:'#1877f2',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#fff',fontSize:'22px'}}>f</span></div>
                        }
                        <div style={{flex:1}}>
                          <div style={{color:'#fff',fontSize:'17px',fontWeight:'800'}}>{activePage.name}</div>
                          <div style={{color:'#555',fontSize:'11px',fontFamily:'monospace',marginTop:'2px'}}>ultimos 28 dias</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:'26px',fontWeight:'800',color:'#fff'}}>{fmtN(activePage.fan_count||activePage.followers_count||0)}</div>
                          <div style={{fontSize:'11px',color:'#555',fontFamily:'monospace'}}>seguidores</div>
                        </div>
                      </div>

                      {/* Metrics grid */}
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'12px',marginBottom:'20px'}}>
                        {[
                          {l:'Alcance',v:fmtN(activePage.insights.page_reach||0),color:'#6ee7b7',icon:'👁'},
                          {l:'Impresiones',v:fmtN(activePage.insights.page_impressions||0),color:'#3b82f6',icon:'📡'},
                          {l:'Engagement',v:fmtN(activePage.insights.page_post_engagements||0),color:'#f97316',icon:'❤️'},
                          {l:'Usuarios activos',v:fmtN(activePage.insights.page_engaged_users||0),color:'#a78bfa',icon:'👥'},
                          {l:'Nuevos fans',v:'+'+fmtN(activePage.insights.page_fan_adds_unique||0),color:'#6ee7b7',icon:'➕'},
                          {l:'Fans perdidos',v:'-'+fmtN(activePage.insights.page_fan_removes_unique||0),color:'#f87171',icon:'➖'},
                        ].map(m=>(
                          <div key={m.l} style={{background:'#17171c',borderRadius:'12px',padding:'16px',border:'1px solid rgba(255,255,255,.07)'}}>
                            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                              <div style={{fontSize:'10px',color:'#555',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.06em'}}>{m.l}</div>
                              <span style={{fontSize:'16px'}}>{m.icon}</span>
                            </div>
                            <div style={{fontSize:'24px',fontWeight:'800',color:m.color}}>{m.v}</div>
                          </div>
                        ))}
                      </div>

                      {/* Posts */}
                      {activePage.posts.length > 0 && (
                        <div style={{background:'#17171c',borderRadius:'14px',padding:'20px',border:'1px solid rgba(255,255,255,.07)'}}>
                          <div style={{fontSize:'13px',color:'#fff',fontWeight:'700',marginBottom:'16px'}}>Publicaciones recientes</div>
                          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                            {activePage.posts.map(post => (
                              <div key={post.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px',borderRadius:'10px',background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)'}}>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{color:'#aaa',fontSize:'12px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                    {post.message?post.message.slice(0,90)+'...':'(Sin texto)'}
                                  </div>
                                  <div style={{color:'#444',fontSize:'10px',fontFamily:'monospace',marginTop:'3px'}}>{new Date(post.created_time).toLocaleDateString('es-MX')}</div>
                                </div>
                                <div style={{display:'flex',gap:'16px',flexShrink:0}}>
                                  <div style={{textAlign:'center'}}>
                                    <div style={{fontSize:'13px',fontWeight:'700',color:'#f87171'}}>❤ {fmtN(post.likes?.summary?.total_count||0)}</div>
                                  </div>
                                  <div style={{textAlign:'center'}}>
                                    <div style={{fontSize:'13px',fontWeight:'700',color:'#60a5fa'}}>💬 {fmtN(post.comments?.summary?.total_count||0)}</div>
                                  </div>
                                  <div style={{textAlign:'center'}}>
                                    <div style={{fontSize:'13px',fontWeight:'700',color:'#34d399'}}>↗ {fmtN(post.shares?.count||0)}</div>
                                  </div>
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

          {/* INSTAGRAM SECTION */}
          {activeSection==='instagram' && (
            <div>
              {loadingOrganic && <div style={{textAlign:'center',padding:'80px 0',color:'#444',fontFamily:'monospace'}}>Cargando datos de Instagram...</div>}
              {!loadingOrganic && igAccounts.length === 0 && (
                <div style={{textAlign:'center',padding:'60px 0',color:'#444',fontFamily:'monospace'}}>No se encontraron cuentas de Instagram Business</div>
              )}
              {!loadingOrganic && igAccounts.length > 0 && (
                <div style={{display:'grid',gridTemplateColumns:'220px 1fr',gap:'20px'}}>
                  {/* IG accounts list */}
                  <div>
                    <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'10px'}}>Cuentas</div>
                    {igAccounts.map(ig => (
                      <div key={ig.id} onClick={()=>setActiveIg(ig)}
                        style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',borderRadius:'10px',cursor:'pointer',marginBottom:'4px',background:activeIg?.id===ig.id?'rgba(225,48,108,.1)':'transparent',border:'1px solid '+(activeIg?.id===ig.id?'rgba(225,48,108,.3)':'transparent')}}>
                        {ig.profile_picture_url
                          ? <img src={ig.profile_picture_url} style={{width:'32px',height:'32px',borderRadius:'50%',flexShrink:0,border:'2px solid #e1306c'}} alt=""/>
                          : <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><span style={{color:'#fff',fontSize:'14px'}}>ig</span></div>
                        }
                        <div style={{minWidth:0}}>
                          <div style={{color:'#ddd',fontSize:'12px',fontWeight:'600',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>@{ig.username}</div>
                          <div style={{color:'#444',fontSize:'10px',fontFamily:'monospace'}}>{fmtN(ig.followers_count||0)} seguidores</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* IG detail */}
                  {activeIg && (
                    <div>
                      {/* IG Header */}
                      <div style={{background:'#17171c',borderRadius:'14px',padding:'20px',marginBottom:'16px',border:'1px solid rgba(255,255,255,.07)',display:'flex',alignItems:'center',gap:'16px'}}>
                        {activeIg.profile_picture_url
                          ? <img src={activeIg.profile_picture_url} style={{width:'52px',height:'52px',borderRadius:'50%',border:'3px solid #e1306c'}} alt=""/>
                          : <div style={{width:'52px',height:'52px',borderRadius:'50%',background:'linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#fff',fontSize:'22px'}}>📸</span></div>
                        }
                        <div style={{flex:1}}>
                          <div style={{color:'#fff',fontSize:'17px',fontWeight:'800'}}>@{activeIg.username}</div>
                          <div style={{color:'#555',fontSize:'11px',fontFamily:'monospace',marginTop:'2px'}}>{activeIg.name} · ultimos 28 dias</div>
                        </div>
                        <div style={{display:'flex',gap:'24px'}}>
                          <div style={{textAlign:'center'}}>
                            <div style={{fontSize:'22px',fontWeight:'800',color:'#fff'}}>{fmtN(activeIg.followers_count||0)}</div>
                            <div style={{fontSize:'10px',color:'#555',fontFamily:'monospace'}}>seguidores</div>
                          </div>
                          <div style={{textAlign:'center'}}>
                            <div style={{fontSize:'22px',fontWeight:'800',color:'#fff'}}>{fmtN(activeIg.media_count||0)}</div>
                            <div style={{fontSize:'10px',color:'#555',fontFamily:'monospace'}}>posts</div>
                          </div>
                        </div>
                      </div>

                      {/* IG Metrics */}
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'12px',marginBottom:'20px'}}>
                        {[
                          {l:'Alcance',v:fmtN(activeIg.insights.reach||0),color:'#e1306c',icon:'👁'},
                          {l:'Impresiones',v:fmtN(activeIg.insights.impressions||0),color:'#f97316',icon:'📡'},
                          {l:'Vistas perfil',v:fmtN(activeIg.insights.profile_views||0),color:'#a78bfa',icon:'🔍'},
                          {l:'Nuevos seguidores',v:fmtN(activeIg.insights.follower_count||0),color:'#6ee7b7',icon:'➕'},
                        ].map(m=>(
                          <div key={m.l} style={{background:'#17171c',borderRadius:'12px',padding:'16px',border:'1px solid rgba(255,255,255,.07)'}}>
                            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                              <div style={{fontSize:'10px',color:'#555',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.06em'}}>{m.l}</div>
                              <span style={{fontSize:'16px'}}>{m.icon}</span>
                            </div>
                            <div style={{fontSize:'24px',fontWeight:'800',color:m.color}}>{m.v}</div>
                          </div>
                        ))}
                      </div>

                      {/* Media grid */}
                      {activeIg.media && activeIg.media.length > 0 && (
                        <div style={{background:'#17171c',borderRadius:'14px',padding:'20px',border:'1px solid rgba(255,255,255,.07)'}}>
                          <div style={{fontSize:'13px',color:'#fff',fontWeight:'700',marginBottom:'16px'}}>Publicaciones recientes</div>
                          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:'10px'}}>
                            {activeIg.media.map(m => (
                              <div key={m.id} style={{background:'rgba(255,255,255,.03)',borderRadius:'10px',padding:'14px',border:'1px solid rgba(255,255,255,.05)'}}>
                                <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
                                  <span style={{fontSize:'10px',color:'#666',background:'#1a1a22',padding:'2px 8px',borderRadius:'4px',fontFamily:'monospace'}}>{m.media_type}</span>
                                  <span style={{fontSize:'10px',color:'#444',fontFamily:'monospace'}}>{new Date(m.timestamp).toLocaleDateString('es-MX')}</span>
                                </div>
                                {m.caption && <div style={{color:'#777',fontSize:'11px',marginBottom:'12px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.caption.slice(0,70)}</div>}
                                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'6px'}}>
                                  {[
                                    {l:'Likes',v:fmtN(m.like_count||0),c:'#e1306c'},
                                    {l:'Coments',v:fmtN(m.comments_count||0),c:'#3b82f6'},
                                    {l:'Alcance',v:fmtN(m.reach||0),c:'#6ee7b7'},
                                    {l:'Guardados',v:fmtN(m.saved||0),c:'#f97316'},
                                  ].map(s=>(
                                    <div key={s.l} style={{textAlign:'center',background:'#111115',borderRadius:'6px',padding:'8px 4px'}}>
                                      <div style={{fontSize:'13px',fontWeight:'700',color:s.c}}>{s.v}</div>
                                      <div style={{fontSize:'9px',color:'#444',fontFamily:'monospace',marginTop:'2px'}}>{s.l}</div>
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

        </main>
      </div>
    </div>
  )
}
