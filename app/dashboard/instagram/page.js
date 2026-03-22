'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function InstagramPage() {
  const [token, setToken] = useState(null)
  const [igAccounts, setIgAccounts] = useState([])
  const [activeIg, setActiveIg] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: tokenRow } = await supabase.from('meta_tokens').select('access_token').eq('user_id', user.id).single()
      if (tokenRow) setToken(tokenRow.access_token)
    }
    init()
  }, [])

  useEffect(() => { if (token) fetchIg() }, [token])

  async function fetchIg() {
    setLoading(true)
    try {
      const pagesRes = await fetch('https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account&access_token='+token+'&limit=50')
      const pagesJ = await pagesRes.json()
      const igIds = (pagesJ.data||[]).filter(p=>p.instagram_business_account).map(p=>({ig_id:p.instagram_business_account.id,page_name:p.name}))
      const withData = await Promise.all(igIds.map(async ({ig_id,page_name})=>{
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
      const valid = withData.filter(a=>a.username)
      setIgAccounts(valid)
      if (valid.length>0) setActiveIg(valid[0])
    } catch(e){console.error(e)}
    setLoading(false)
  }

  const fmtN = v => (+v||0)>=1e6?((+v/1e6).toFixed(1)+'M'):(+v||0)>=1e3?((+v/1e3).toFixed(1)+'K'):String(Math.round(+v||0))

  return (
    <div style={{padding:'20px',fontFamily:'"Plus Jakarta Sans",sans-serif'}}>
      {loading && <div style={{textAlign:'center',padding:'60px',color:'#333',fontFamily:'monospace',fontSize:'12px'}}>Cargando Instagram...</div>}
      {!loading && igAccounts.length===0 && <div style={{textAlign:'center',padding:'60px',color:'#333',fontFamily:'monospace'}}>No se encontraron cuentas de Instagram Business</div>}
      {!loading && igAccounts.length>0 && (
        <div style={{display:'grid',gridTemplateColumns:'200px 1fr',gap:'16px'}}>
          <div>
            <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'8px'}}>Cuentas</div>
            {igAccounts.map(ig=>(
              <div key={ig.id} onClick={()=>setActiveIg(ig)}
                style={{display:'flex',alignItems:'center',gap:'8px',padding:'9px 10px',borderRadius:'9px',cursor:'pointer',marginBottom:'3px',background:activeIg?.id===ig.id?'rgba(225,48,108,.1)':'rgba(255,255,255,.03)',border:'1px solid '+(activeIg?.id===ig.id?'rgba(225,48,108,.3)':'transparent')}}>
                {ig.profile_picture_url?<img src={ig.profile_picture_url} style={{width:'28px',height:'28px',borderRadius:'50%',border:'2px solid #e1306c',flexShrink:0}} alt=""/>
                  :<div style={{width:'28px',height:'28px',borderRadius:'50%',background:'linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'11px',fontWeight:'700',flexShrink:0}}>ig</div>}
                <div style={{minWidth:0}}>
                  <div style={{fontSize:'11px',fontWeight:'700',color:'#ccc',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>@{ig.username}</div>
                  <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace'}}>{fmtN(ig.followers_count||0)} seg</div>
                </div>
              </div>
            ))}
          </div>
          {activeIg && (
            <div>
              <div style={{background:'#17171d',border:'1px solid rgba(255,255,255,.07)',borderRadius:'12px',padding:'16px',marginBottom:'14px',display:'flex',alignItems:'center',gap:'12px'}}>
                {activeIg.profile_picture_url?<img src={activeIg.profile_picture_url} style={{width:'44px',height:'44px',borderRadius:'50%',border:'2px solid #e1306c'}} alt=""/>
                  :<div style={{width:'44px',height:'44px',borderRadius:'50%',background:'linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'18px',fontWeight:'700'}}>ig</div>}
                <div style={{flex:1}}>
                  <div style={{color:'#fff',fontSize:'15px',fontWeight:'800'}}>@{activeIg.username}</div>
                  <div style={{color:'#444',fontSize:'10px',fontFamily:'monospace',marginTop:'2px'}}>{activeIg.name} · ultimos 28 dias</div>
                </div>
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
                  {l:'Nuevos seg.',v:fmtN(activeIg.insights.follower_count||0),c:'#6ee7b7',icon:'➕'},
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
                        <div style={{display:'flex',gap:'7px',marginBottom:'7px'}}>
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
  )
}
