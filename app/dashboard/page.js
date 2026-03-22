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
  const [activeTab, setActiveTab] = useState('ads')

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
    if (token && activeTab === 'organico') fetchOrganic()
  }, [token, activeTab])

  async function fetchOrganic() {
    setLoadingOrganic(true)
    try {
      // Fetch Facebook Pages
      const pagesRes = await fetch('https://graph.facebook.com/v21.0/me/accounts?fields=id,name,fan_count,followers_count,picture&access_token=' + token + '&limit=50')
      const pagesJ = await pagesRes.json()
      const pagesData = pagesJ.data || []

      // For each page get basic insights
      const pagesWithInsights = await Promise.all(pagesData.map(async (page) => {
        try {
          const insRes = await fetch('https://graph.facebook.com/v21.0/' + page.id + '/insights?metric=page_impressions,page_reach,page_engaged_users,page_post_engagements,page_fan_adds_unique,page_fan_removes_unique&period=day&date_preset=last_28_days&access_token=' + token)
          const insJ = await insRes.json()
          const ins = {}
          ;(insJ.data || []).forEach(m => {
            const total = (m.values || []).reduce((s, v) => s + (v.value || 0), 0)
            ins[m.name] = total
          })

          // Get recent posts
          const postsRes = await fetch('https://graph.facebook.com/v21.0/' + page.id + '/posts?fields=id,message,created_time,likes.summary(true),comments.summary(true),shares&limit=5&access_token=' + token)
          const postsJ = await postsRes.json()

          // Get Instagram account linked to page
          const igRes = await fetch('https://graph.facebook.com/v21.0/' + page.id + '?fields=instagram_business_account&access_token=' + token)
          const igJ = await igRes.json()

          return {
            ...page,
            insights: ins,
            posts: postsJ.data || [],
            ig_id: igJ.instagram_business_account?.id || null
          }
        } catch(e) {
          return { ...page, insights: {}, posts: [] }
        }
      }))

      setPages(pagesWithInsights)

      // Fetch Instagram accounts
      const igIds = pagesWithInsights.filter(p => p.ig_id).map(p => ({ ig_id: p.ig_id, page_name: p.name }))
      const igWithData = await Promise.all(igIds.map(async ({ ig_id, page_name }) => {
        try {
          const igRes = await fetch('https://graph.facebook.com/v21.0/' + ig_id + '?fields=id,name,username,followers_count,media_count,profile_picture_url,biography&access_token=' + token)
          const igJ = await igRes.json()

          const insRes = await fetch('https://graph.facebook.com/v21.0/' + ig_id + '/insights?metric=reach,impressions,profile_views,follower_count&period=day&since=' + getDateBefore(28) + '&until=' + getToday() + '&access_token=' + token)
          const insJ = await insRes.json()
          const ins = {}
          ;(insJ.data || []).forEach(m => {
            const total = (m.values || []).reduce((s, v) => s + (v.value || 0), 0)
            ins[m.name] = total
          })

          // Get recent media
          const mediaRes = await fetch('https://graph.facebook.com/v21.0/' + ig_id + '/media?fields=id,caption,media_type,timestamp,like_count,comments_count,reach,impressions,saved&limit=6&access_token=' + token)
          const mediaJ = await mediaRes.json()

          return { ...igJ, insights: ins, media: mediaJ.data || [], page_name }
        } catch(e) {
          return { ig_id, page_name, insights: {}, media: [] }
        }
      }))

      setIgAccounts(igWithData.filter(a => a.username))
    } catch(e) { console.error(e) }
    setLoadingOrganic(false)
  }

  function getToday() {
    return Math.floor(Date.now()/1000)
  }
  function getDateBefore(days) {
    return Math.floor((Date.now() - days*24*60*60*1000)/1000)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const fmtN = v => (+v||0)>=1e6?((+v/1e6).toFixed(1)+'M'):(+v||0)>=1e3?((+v/1e3).toFixed(1)+'K'):String(Math.round(+v||0))

  if (!user) return <div style={{minHeight:'100vh',background:'#0a0a0e'}}></div>

  return (
    <main style={{minHeight:'100vh',background:'#0a0a0e',fontFamily:'Inter,sans-serif'}}>
      <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 36px',height:'60px',background:'rgba(10,10,14,.97)',borderBottom:'1px solid #2a2a35'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <span style={{fontSize:'18px'}}>📊</span>
          <span style={{color:'#fff',fontWeight:'800',fontSize:'15px'}}>Reporteador</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
          <span style={{color:'#666',fontSize:'12px',fontFamily:'monospace'}}>{user.email}</span>
          <button onClick={handleLogout} style={{background:'transparent',border:'1px solid #2a2a35',color:'#888',padding:'6px 14px',borderRadius:'8px',fontSize:'11px',cursor:'pointer',fontFamily:'monospace'}}>
            Cerrar sesion
          </button>
        </div>
      </header>

      <div style={{padding:'32px 36px',maxWidth:'1100px',margin:'0 auto'}}>
        {/* Tabs */}
        <div style={{display:'flex',gap:'0',borderBottom:'1px solid #1a1a22',marginBottom:'32px'}}>
          {[
            {id:'ads',label:'📊 Meta Ads'},
            {id:'organico',label:'🌿 Organico'},
          ].map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)}
              style={{padding:'10px 24px',fontSize:'13px',fontWeight:activeTab===t.id?'700':'400',cursor:'pointer',color:activeTab===t.id?'#fff':'#555',borderBottom:activeTab===t.id?'2px solid #fff':'2px solid transparent',background:'transparent',border:'none',fontFamily:'Inter,sans-serif'}}>
              {t.label}
            </button>
          ))}
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center'}}>
            <a href="/api/auth/meta" style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'rgba(24,119,242,.15)',color:'#5ba3f5',padding:'6px 14px',borderRadius:'8px',fontSize:'11px',fontWeight:'600',textDecoration:'none',border:'1px solid rgba(24,119,242,.3)'}}>
              Reconectar Meta
            </a>
          </div>
        </div>

        {/* ADS TAB */}
        {activeTab==='ads' && (
          loadingAccounts ? (
            <div style={{textAlign:'center',padding:'80px 0',color:'#666',fontFamily:'monospace'}}>Cargando cuentas...</div>
          ) : accounts.length === 0 ? (
            <div style={{textAlign:'center',padding:'80px 0'}}>
              <div style={{fontSize:'48px',marginBottom:'24px'}}>📊</div>
              <h1 style={{color:'#fff',fontSize:'24px',fontWeight:'800',marginBottom:'12px'}}>Conecta tu cuenta de Meta Ads</h1>
              <p style={{color:'#666',fontSize:'14px',marginBottom:'40px',fontFamily:'monospace'}}>Conecta tus cuentas publicitarias para ver tus metricas en tiempo real</p>
              <a href="/api/auth/meta" style={{display:'inline-flex',alignItems:'center',gap:'10px',background:'#1877f2',color:'#fff',padding:'14px 32px',borderRadius:'10px',fontSize:'14px',fontWeight:'700',textDecoration:'none'}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Conectar con Facebook
              </a>
            </div>
          ) : (
            <div>
              <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'800',marginBottom:'20px'}}>Cuentas publicitarias</h2>
              <div style={{display:'grid',gap:'10px'}}>
                {accounts.map(acc => (
                  <div key={acc.id} style={{background:'#111116',border:'1px solid #2a2a35',borderRadius:'12px',padding:'18px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div>
                      <div style={{color:'#fff',fontSize:'14px',fontWeight:'700',marginBottom:'3px'}}>{acc.account_name||acc.account_id}</div>
                      <div style={{color:'#444',fontSize:'11px',fontFamily:'monospace'}}>{acc.account_id}</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                      <span style={{fontSize:'10px',fontFamily:'monospace',color:acc.is_active?'#6ee7b7':'#f87171',background:acc.is_active?'rgba(110,231,183,.08)':'rgba(248,113,113,.08)',padding:'3px 10px',borderRadius:'20px',border:'1px solid '+(acc.is_active?'rgba(110,231,183,.2)':'rgba(248,113,113,.2)')}}>
                        {acc.is_active?'ACTIVA':'PAUSADA'}
                      </span>
                      <button onClick={()=>window.location.href='/dashboard/reportes/'+acc.account_id}
                        style={{background:'#fff',color:'#0a0a0e',border:'none',padding:'7px 16px',borderRadius:'8px',fontSize:'11px',fontWeight:'700',cursor:'pointer',fontFamily:'monospace'}}>
                        Ver reportes
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* ORGANICO TAB */}
        {activeTab==='organico' && (
          <div>
            {loadingOrganic && (
              <div style={{textAlign:'center',padding:'80px 0',color:'#444',fontFamily:'monospace',fontSize:'12px'}}>Cargando datos organicos...</div>
            )}

            {!loadingOrganic && pages.length === 0 && (
              <div style={{textAlign:'center',padding:'60px 0',color:'#444',fontFamily:'monospace'}}>No se encontraron paginas de Facebook conectadas</div>
            )}

            {!loadingOrganic && pages.length > 0 && (
              <>
                {/* FACEBOOK PAGES */}
                <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'800',marginBottom:'20px',display:'flex',alignItems:'center',gap:'8px'}}>
                  <span style={{fontSize:'20px'}}>📘</span> Facebook Pages
                  <span style={{fontSize:'10px',color:'#444',fontFamily:'monospace',fontWeight:'400',marginLeft:'4px'}}>ultimos 28 dias</span>
                </h2>

                {pages.map((page, i) => (
                  <div key={page.id} style={{background:'#111116',border:'1px solid #1a1a22',borderRadius:'12px',padding:'20px 24px',marginBottom:'16px'}}>
                    {/* Page Header */}
                    <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px'}}>
                      {page.picture?.data?.url && (
                        <img src={page.picture.data.url} style={{width:'44px',height:'44px',borderRadius:'50%',border:'2px solid #1877f2'}} alt=""/>
                      )}
                      <div>
                        <div style={{color:'#fff',fontSize:'15px',fontWeight:'800'}}>{page.name}</div>
                        <div style={{color:'#555',fontSize:'11px',fontFamily:'monospace'}}>ID: {page.id}</div>
                      </div>
                      <div style={{marginLeft:'auto',textAlign:'right'}}>
                        <div style={{fontSize:'22px',fontWeight:'800',color:'#fff'}}>{fmtN(page.fan_count||page.followers_count||0)}</div>
                        <div style={{fontSize:'10px',color:'#555',fontFamily:'monospace'}}>seguidores</div>
                      </div>
                    </div>

                    {/* Page Metrics */}
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:'10px',marginBottom:'20px'}}>
                      {[
                        {l:'Alcance',v:fmtN(page.insights.page_reach||0),color:'#6ee7b7'},
                        {l:'Impresiones',v:fmtN(page.insights.page_impressions||0),color:'#3b82f6'},
                        {l:'Engagement',v:fmtN(page.insights.page_post_engagements||0),color:'#f97316'},
                        {l:'Usuarios activos',v:fmtN(page.insights.page_engaged_users||0),color:'#a78bfa'},
                        {l:'Nuevos fans',v:fmtN(page.insights.page_fan_adds_unique||0),color:'#6ee7b7'},
                        {l:'Fans perdidos',v:fmtN(page.insights.page_fan_removes_unique||0),color:'#f87171'},
                      ].map(m=>(
                        <div key={m.l} style={{background:'#0d0d12',borderRadius:'8px',padding:'12px',border:'1px solid #1a1a22'}}>
                          <div style={{fontSize:'9px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'6px'}}>{m.l}</div>
                          <div style={{fontSize:'20px',fontWeight:'800',color:m.color}}>{m.v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Recent Posts */}
                    {page.posts.length > 0 && (
                      <div>
                        <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'12px'}}>Ultimas publicaciones</div>
                        <div style={{display:'grid',gap:'8px'}}>
                          {page.posts.map(post => (
                            <div key={post.id} style={{background:'#0d0d12',borderRadius:'8px',padding:'12px 16px',border:'1px solid #1a1a22',display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{color:'#888',fontSize:'11px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                  {post.message ? post.message.slice(0,80)+(post.message.length>80?'...':'') : '(Sin texto)'}
                                </div>
                                <div style={{color:'#333',fontSize:'10px',fontFamily:'monospace',marginTop:'3px'}}>{new Date(post.created_time).toLocaleDateString('es-MX')}</div>
                              </div>
                              <div style={{display:'flex',gap:'16px',flexShrink:0}}>
                                <div style={{textAlign:'center'}}>
                                  <div style={{fontSize:'14px',fontWeight:'700',color:'#6ee7b7'}}>❤ {fmtN(post.likes?.summary?.total_count||0)}</div>
                                </div>
                                <div style={{textAlign:'center'}}>
                                  <div style={{fontSize:'14px',fontWeight:'700',color:'#3b82f6'}}>💬 {fmtN(post.comments?.summary?.total_count||0)}</div>
                                </div>
                                <div style={{textAlign:'center'}}>
                                  <div style={{fontSize:'14px',fontWeight:'700',color:'#f97316'}}>↗ {fmtN(post.shares?.count||0)}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* INSTAGRAM */}
                {igAccounts.length > 0 && (
                  <>
                    <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'800',marginBottom:'20px',marginTop:'32px',display:'flex',alignItems:'center',gap:'8px'}}>
                      <span style={{fontSize:'20px'}}>📸</span> Instagram Business
                      <span style={{fontSize:'10px',color:'#444',fontFamily:'monospace',fontWeight:'400',marginLeft:'4px'}}>ultimos 28 dias</span>
                    </h2>

                    {igAccounts.map((ig, i) => (
                      <div key={ig.id||i} style={{background:'#111116',border:'1px solid #1a1a22',borderRadius:'12px',padding:'20px 24px',marginBottom:'16px'}}>
                        {/* IG Header */}
                        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px'}}>
                          {ig.profile_picture_url && (
                            <img src={ig.profile_picture_url} style={{width:'44px',height:'44px',borderRadius:'50%',border:'2px solid #e1306c'}} alt=""/>
                          )}
                          <div>
                            <div style={{color:'#fff',fontSize:'15px',fontWeight:'800'}}>@{ig.username}</div>
                            <div style={{color:'#555',fontSize:'11px',fontFamily:'monospace'}}>{ig.name}</div>
                          </div>
                          <div style={{marginLeft:'auto',display:'flex',gap:'24px'}}>
                            <div style={{textAlign:'center'}}>
                              <div style={{fontSize:'20px',fontWeight:'800',color:'#fff'}}>{fmtN(ig.followers_count||0)}</div>
                              <div style={{fontSize:'10px',color:'#555',fontFamily:'monospace'}}>seguidores</div>
                            </div>
                            <div style={{textAlign:'center'}}>
                              <div style={{fontSize:'20px',fontWeight:'800',color:'#fff'}}>{fmtN(ig.media_count||0)}</div>
                              <div style={{fontSize:'10px',color:'#555',fontFamily:'monospace'}}>publicaciones</div>
                            </div>
                          </div>
                        </div>

                        {/* IG Metrics */}
                        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:'10px',marginBottom:'20px'}}>
                          {[
                            {l:'Alcance',v:fmtN(ig.insights.reach||0),color:'#e1306c'},
                            {l:'Impresiones',v:fmtN(ig.insights.impressions||0),color:'#f97316'},
                            {l:'Vistas perfil',v:fmtN(ig.insights.profile_views||0),color:'#a78bfa'},
                            {l:'Nuevos seguidores',v:fmtN(ig.insights.follower_count||0),color:'#6ee7b7'},
                          ].map(m=>(
                            <div key={m.l} style={{background:'#0d0d12',borderRadius:'8px',padding:'12px',border:'1px solid #1a1a22'}}>
                              <div style={{fontSize:'9px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'6px'}}>{m.l}</div>
                              <div style={{fontSize:'20px',fontWeight:'800',color:m.color}}>{m.v}</div>
                            </div>
                          ))}
                        </div>

                        {/* Recent Media */}
                        {ig.media && ig.media.length > 0 && (
                          <div>
                            <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'12px'}}>Ultimas publicaciones</div>
                            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'8px'}}>
                              {ig.media.map(m => (
                                <div key={m.id} style={{background:'#0d0d12',borderRadius:'8px',padding:'12px 16px',border:'1px solid #1a1a22'}}>
                                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
                                    <span style={{fontSize:'10px',color:'#555',fontFamily:'monospace',background:'#18181f',padding:'2px 8px',borderRadius:'4px'}}>{m.media_type}</span>
                                    <span style={{fontSize:'10px',color:'#333',fontFamily:'monospace'}}>{new Date(m.timestamp).toLocaleDateString('es-MX')}</span>
                                  </div>
                                  {m.caption && <div style={{color:'#777',fontSize:'11px',marginBottom:'10px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.caption.slice(0,70)}</div>}
                                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'6px'}}>
                                    {[
                                      {l:'Likes',v:fmtN(m.like_count||0),c:'#e1306c'},
                                      {l:'Comentarios',v:fmtN(m.comments_count||0),c:'#3b82f6'},
                                      {l:'Alcance',v:fmtN(m.reach||0),c:'#6ee7b7'},
                                      {l:'Guardados',v:fmtN(m.saved||0),c:'#f97316'},
                                    ].map(s=>(
                                      <div key={s.l} style={{textAlign:'center',background:'#111116',borderRadius:'6px',padding:'6px 4px'}}>
                                        <div style={{fontSize:'12px',fontWeight:'700',color:s.c}}>{s.v}</div>
                                        <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace'}}>{s.l}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
