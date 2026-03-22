'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function FacebookPage() {
  const [token, setToken] = useState(null)
  const [pages, setPages] = useState([])
  const [activePage, setActivePage] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: tokenRow } = await supabase.from('meta_tokens').select('access_token').eq('user_id', user.id).single()
      if (tokenRow) { setToken(tokenRow.access_token) }
    }
    init()
  }, [])

  useEffect(() => { if (token) fetchPages() }, [token])

  async function fetchPages() {
    setLoading(true)
    try {
      const res = await fetch('https://graph.facebook.com/v21.0/me/accounts?fields=id,name,fan_count,followers_count,picture&access_token='+token+'&limit=50')
      const j = await res.json()
      const pagesData = j.data || []
      const withData = await Promise.all(pagesData.map(async p => {
        try {
          const insR = await fetch('https://graph.facebook.com/v21.0/'+p.id+'/insights?metric=page_impressions,page_reach,page_engaged_users,page_post_engagements,page_fan_adds_unique,page_fan_removes_unique&period=day&date_preset=last_28_days&access_token='+token)
          const insJ = await insR.json()
          const ins = {}
          ;(insJ.data||[]).forEach(m=>{ins[m.name]=(m.values||[]).reduce((s,v)=>s+(v.value||0),0)})
          const postsR = await fetch('https://graph.facebook.com/v21.0/'+p.id+'/posts?fields=id,message,created_time,likes.summary(true),comments.summary(true),shares&limit=8&access_token='+token)
          const postsJ = await postsR.json()
          return {...p,insights:ins,posts:postsJ.data||[]}
        } catch(e){return{...p,insights:{},posts:[]}}
      }))
      setPages(withData)
      if (withData.length > 0) setActivePage(withData[0])
    } catch(e){console.error(e)}
    setLoading(false)
  }

  const fmtN = v => (+v||0)>=1e6?((+v/1e6).toFixed(1)+'M'):(+v||0)>=1e3?((+v/1e3).toFixed(1)+'K'):String(Math.round(+v||0))

  return (
    <div style={{padding:'20px',fontFamily:'"Plus Jakarta Sans",sans-serif'}}>
      {loading && <div style={{textAlign:'center',padding:'60px',color:'#333',fontFamily:'monospace',fontSize:'12px'}}>Cargando paginas...</div>}
      {!loading && pages.length===0 && <div style={{textAlign:'center',padding:'60px',color:'#333',fontFamily:'monospace'}}>No se encontraron paginas de Facebook</div>}
      {!loading && pages.length>0 && (
        <div style={{display:'grid',gridTemplateColumns:'200px 1fr',gap:'16px'}}>
          <div>
            <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'8px'}}>Paginas</div>
            {pages.map(p=>(
              <div key={p.id} onClick={()=>setActivePage(p)}
                style={{display:'flex',alignItems:'center',gap:'8px',padding:'9px 10px',borderRadius:'9px',cursor:'pointer',marginBottom:'3px',background:activePage?.id===p.id?'rgba(24,119,242,.1)':'rgba(255,255,255,.03)',border:'1px solid '+(activePage?.id===p.id?'rgba(24,119,242,.3)':'transparent')}}>
                {p.picture?.data?.url?<img src={p.picture.data.url} style={{width:'28px',height:'28px',borderRadius:'50%',flexShrink:0}} alt=""/>
                  :<div style={{width:'28px',height:'28px',borderRadius:'50%',background:'#1877f2',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'12px',fontWeight:'700',flexShrink:0}}>f</div>}
                <div style={{minWidth:0}}>
                  <div style={{fontSize:'11px',fontWeight:'700',color:'#ccc',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                  <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace'}}>{fmtN(p.fan_count||0)} fans</div>
                </div>
              </div>
            ))}
          </div>
          {activePage && (
            <div>
              <div style={{background:'#17171d',border:'1px solid rgba(255,255,255,.07)',borderRadius:'12px',padding:'16px',marginBottom:'14px',display:'flex',alignItems:'center',gap:'12px'}}>
                {activePage.picture?.data?.url?<img src={activePage.picture.data.url} style={{width:'44px',height:'44px',borderRadius:'50%',border:'2px solid #1877f2'}} alt=""/>
                  :<div style={{width:'44px',height:'44px',borderRadius:'50%',background:'#1877f2',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'18px',fontWeight:'700'}}>f</div>}
                <div style={{flex:1}}>
                  <div style={{color:'#fff',fontSize:'15px',fontWeight:'800'}}>{activePage.name}</div>
                  <div style={{color:'#444',fontSize:'10px',fontFamily:'monospace',marginTop:'2px'}}>ultimos 28 dias</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'22px',fontWeight:'800',color:'#fff'}}>{fmtN(activePage.fan_count||0)}</div>
                  <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace'}}>seguidores</div>
                </div>
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
  )
}
