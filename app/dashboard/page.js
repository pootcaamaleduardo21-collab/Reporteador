'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { usePlan } from '../lib/usePlan'

const fmtN = v => (+v||0)>=1e6?((+v/1e6).toFixed(1)+'M'):(+v||0)>=1e3?((+v/1e3).toFixed(1)+'K'):String(Math.round(+v||0))

export default function DashboardHome() {
  const [user, setUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [metaToken, setMetaToken] = useState(null)
  const [fbPages, setFbPages] = useState([])
  const [igAccounts, setIgAccounts] = useState([])
  const [loadingOrganic, setLoadingOrganic] = useState(false)
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
        fetchOrganicSummary(tokenRow.access_token)
      }
      setLoading(false)
    }
    init()
  }, [])

  async function fetchOrganicSummary(tok) {
    setLoadingOrganic(true)
    try {
      const [fbRes, igRes] = await Promise.all([
        fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,fan_count,followers_count&access_token=${tok}&limit=10`),
        fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account{id,name,followers_count,media_count}&access_token=${tok}&limit=10`),
      ])
      const fbJ = await fbRes.json()
      const igJ = await igRes.json()

      const pages = fbJ.data || []
      setFbPages(pages)

      const igAccs = (igJ.data || [])
        .filter(p => p.instagram_business_account)
        .map(p => p.instagram_business_account)
      setIgAccounts(igAccs)
    } catch(e) {}
    setLoadingOrganic(false)
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',background:'var(--bg)'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:'32px',height:'32px',borderRadius:'50%',border:'2px solid rgba(99,102,241,.3)',borderTop:'2px solid #6366f1',animation:'spin 1s linear infinite',margin:'0 auto 12px'}}></div>
        <div style={{fontSize:'12px',color:'var(--text4)',fontFamily:'monospace'}}>Cargando...</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  const metaAccounts = accounts.filter(a => a.platform === 'meta_ads')
  const googleAccounts = accounts.filter(a => a.platform === 'google_ads')
  const tiktokAccounts = accounts.filter(a => a.platform === 'tiktok_ads')
  const hasAnyAccount = accounts.length > 0
  const hasMeta = metaAccounts.length > 0
  const hasGoogle = googleAccounts.length > 0
  const hasTiktok = tiktokAccounts.length > 0
  const hasFbPages = fbPages.length > 0
  const hasIG = igAccounts.length > 0

  const totalFollowers = fbPages.reduce((s, p) => s + (p.fan_count || 0), 0)
    + igAccounts.reduce((s, a) => s + (a.followers_count || 0), 0)

  const card = {
    background: 'var(--sidebar)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '18px 20px',
  }

  return (
    <div style={{padding:'24px',maxWidth:'1100px',fontFamily:'"Plus Jakarta Sans",sans-serif'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .hover-card:hover{border-color:rgba(99,102,241,.3)!important;} .platform-btn:hover{opacity:.85}`}</style>

      {/* Header */}
      <div style={{marginBottom:'24px'}}>
        <h1 style={{fontSize:'20px',fontWeight:'800',color:'var(--text)',margin:'0 0 4px'}}>
          Bienvenido{user?.email ? `, ${user.email.split('@')[0]}` : ''} 👋
        </h1>
        <p style={{fontSize:'12px',color:'var(--text4)',margin:0}}>
          Resumen de todas tus plataformas conectadas — orgánico + pagado
        </p>
      </div>

      {/* No accounts onboarding */}
      {!hasAnyAccount && !metaToken && (
        <div style={{...card, textAlign:'center', padding:'48px 32px', marginBottom:'20px'}}>
          <div style={{fontSize:'40px',marginBottom:'16px'}}>🚀</div>
          <h2 style={{fontSize:'18px',fontWeight:'800',color:'var(--text)',marginBottom:'8px'}}>
            Empieza conectando tus plataformas
          </h2>
          <p style={{fontSize:'13px',color:'var(--text4)',maxWidth:'420px',margin:'0 auto 24px',lineHeight:'1.6'}}>
            Conecta tus cuentas de Meta Ads, Google Ads o TikTok para ver métricas de tus campañas pagadas, y tus páginas de Facebook e Instagram para el orgánico.
          </p>
          <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
            <a href="/api/auth/meta" className="platform-btn" style={{display:'inline-flex',alignItems:'center',gap:'8px',padding:'11px 20px',borderRadius:'9px',background:'#1877f2',color:'#fff',fontSize:'13px',fontWeight:'700',textDecoration:'none'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Conectar Meta
            </a>
            <a href="/api/auth/google-ads/login" className="platform-btn" style={{display:'inline-flex',alignItems:'center',gap:'8px',padding:'11px 20px',borderRadius:'9px',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.12)',color:'var(--text)',fontSize:'13px',fontWeight:'700',textDecoration:'none'}}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Conectar Google Ads
            </a>
          </div>
        </div>
      )}

      {/* Organic Summary */}
      {metaToken && (
        <div style={{marginBottom:'24px'}}>
          <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'10px'}}>
            Redes Orgánicas
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:'12px'}}>

            {/* Facebook Organic */}
            <div className="hover-card" onClick={() => router.push('/dashboard/facebook')}
              style={{...card, cursor:'pointer', transition:'border-color .2s'}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px'}}>
                <div style={{width:'32px',height:'32px',borderRadius:'8px',background:'#1877f2',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'16px',fontWeight:'800',flexShrink:0}}>f</div>
                <div>
                  <div style={{fontSize:'13px',fontWeight:'700',color:'var(--text)'}}>Facebook Orgánico</div>
                  <div style={{fontSize:'10px',color:'var(--text4)'}}>Páginas y publicaciones</div>
                </div>
                <div style={{marginLeft:'auto',fontSize:'11px',color:'#a5b4fc'}}>Ver →</div>
              </div>
              {loadingOrganic ? (
                <div style={{fontSize:'11px',color:'var(--text4)',fontFamily:'monospace'}}>Cargando...</div>
              ) : hasFbPages ? (
                <div style={{display:'flex',gap:'16px'}}>
                  <div>
                    <div style={{fontSize:'20px',fontWeight:'800',color:'var(--text)'}}>{fmtN(fbPages.reduce((s,p)=>s+(p.fan_count||0),0))}</div>
                    <div style={{fontSize:'9px',color:'var(--text4)',fontFamily:'monospace'}}>seguidores totales</div>
                  </div>
                  <div>
                    <div style={{fontSize:'20px',fontWeight:'800',color:'#6ee7b7'}}>{fbPages.length}</div>
                    <div style={{fontSize:'9px',color:'var(--text4)',fontFamily:'monospace'}}>página{fbPages.length!==1?'s':''}</div>
                  </div>
                </div>
              ) : (
                <div style={{fontSize:'11px',color:'var(--text4)',lineHeight:'1.5'}}>
                  No se encontraron páginas de Facebook. <a href="/api/auth/meta" style={{color:'#a5b4fc',textDecoration:'none'}}>Reconectar →</a>
                </div>
              )}
            </div>

            {/* Instagram Organic */}
            <div className="hover-card" onClick={() => router.push('/dashboard/instagram')}
              style={{...card, cursor:'pointer', transition:'border-color .2s'}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px'}}>
                <div style={{width:'32px',height:'32px',borderRadius:'8px',background:'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'14px',flexShrink:0}}>◉</div>
                <div>
                  <div style={{fontSize:'13px',fontWeight:'700',color:'var(--text)'}}>Instagram Orgánico</div>
                  <div style={{fontSize:'10px',color:'var(--text4)'}}>Cuentas de negocio</div>
                </div>
                <div style={{marginLeft:'auto',fontSize:'11px',color:'#a5b4fc'}}>Ver →</div>
              </div>
              {loadingOrganic ? (
                <div style={{fontSize:'11px',color:'var(--text4)',fontFamily:'monospace'}}>Cargando...</div>
              ) : hasIG ? (
                <div style={{display:'flex',gap:'16px'}}>
                  <div>
                    <div style={{fontSize:'20px',fontWeight:'800',color:'var(--text)'}}>{fmtN(igAccounts.reduce((s,a)=>s+(a.followers_count||0),0))}</div>
                    <div style={{fontSize:'9px',color:'var(--text4)',fontFamily:'monospace'}}>seguidores totales</div>
                  </div>
                  <div>
                    <div style={{fontSize:'20px',fontWeight:'800',color:'#e1306c'}}>{igAccounts.length}</div>
                    <div style={{fontSize:'9px',color:'var(--text4)',fontFamily:'monospace'}}>cuenta{igAccounts.length!==1?'s':''}</div>
                  </div>
                </div>
              ) : (
                <div style={{fontSize:'11px',color:'var(--text4)',lineHeight:'1.5'}}>
                  Necesitas una cuenta de Instagram Business vinculada a una página de Facebook.
                </div>
              )}
            </div>

            {/* TikTok Organic */}
            <div className="hover-card" onClick={() => router.push('/dashboard/tiktok-organic')}
              style={{...card, cursor:'pointer', transition:'border-color .2s', opacity:0.7}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px'}}>
                <div style={{width:'32px',height:'32px',borderRadius:'8px',background:'#010101',border:'1px solid rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'14px',flexShrink:0}}>∿</div>
                <div>
                  <div style={{fontSize:'13px',fontWeight:'700',color:'var(--text)'}}>TikTok Orgánico</div>
                  <div style={{fontSize:'10px',color:'var(--text4)'}}>Videos y métricas</div>
                </div>
                <span style={{marginLeft:'auto',fontSize:'9px',color:'#fcd34d',background:'rgba(252,211,77,.08)',border:'1px solid rgba(252,211,77,.2)',padding:'2px 7px',borderRadius:'20px',fontFamily:'monospace',flexShrink:0}}>Pronto</span>
              </div>
              <div style={{fontSize:'11px',color:'var(--text4)'}}>Próximamente disponible</div>
            </div>
          </div>
        </div>
      )}

      {/* Paid Campaigns */}
      {hasAnyAccount && (
        <div style={{marginBottom:'24px'}}>
          <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text4)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'10px'}}>
            Campañas Pagadas
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:'12px'}}>

            {hasMeta && (
              <div className="hover-card" onClick={() => router.push('/dashboard/reportes/' + metaAccounts[0].account_id)}
                style={{...card, cursor:'pointer', transition:'border-color .2s'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px'}}>
                  <div style={{width:'32px',height:'32px',borderRadius:'8px',background:'#1877f2',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'11px',fontWeight:'800',flexShrink:0}}>META</div>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:'700',color:'var(--text)'}}>Meta Ads</div>
                    <div style={{fontSize:'10px',color:'var(--text4)'}}>Facebook · Instagram</div>
                  </div>
                  <div style={{marginLeft:'auto',fontSize:'11px',color:'#a5b4fc'}}>Ver →</div>
                </div>
                <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
                  {metaAccounts.slice(0, isPro ? 10 : 1).map(acc => (
                    <div key={acc.id} onClick={e=>{e.stopPropagation();router.push('/dashboard/reportes/'+acc.account_id)}}
                      style={{display:'flex',alignItems:'center',gap:'6px',padding:'5px 9px',background:'rgba(255,255,255,.04)',borderRadius:'6px',border:'1px solid rgba(255,255,255,.07)',cursor:'pointer'}}>
                      <div style={{width:'5px',height:'5px',borderRadius:'50%',background:acc.is_active?'#6ee7b7':'#f87171',flexShrink:0}}></div>
                      <span style={{fontSize:'10px',color:'#ccc',whiteSpace:'nowrap'}}>{acc.account_name||acc.account_id}</span>
                    </div>
                  ))}
                  {!isPro && metaAccounts.length > 1 && (
                    <div style={{fontSize:'10px',color:'#fcd34d',padding:'5px 9px',background:'rgba(252,211,77,.06)',border:'1px solid rgba(252,211,77,.15)',borderRadius:'6px'}}>
                      +{metaAccounts.length-1} en Pro
                    </div>
                  )}
                </div>
              </div>
            )}

            {hasGoogle && (
              <div className="hover-card" onClick={() => router.push('/dashboard/reportes/' + googleAccounts[0].account_id)}
                style={{...card, cursor:'pointer', transition:'border-color .2s'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px'}}>
                  <div style={{width:'32px',height:'32px',borderRadius:'8px',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  </div>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:'700',color:'var(--text)'}}>Google Ads</div>
                    <div style={{fontSize:'10px',color:'var(--text4)'}}>Search · Display · YouTube</div>
                  </div>
                  <div style={{marginLeft:'auto',fontSize:'11px',color:'#a5b4fc'}}>Ver →</div>
                </div>
                <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
                  {googleAccounts.slice(0, isPro ? 10 : 1).map(acc => (
                    <div key={acc.id} style={{display:'flex',alignItems:'center',gap:'6px',padding:'5px 9px',background:'rgba(255,255,255,.04)',borderRadius:'6px',border:'1px solid rgba(255,255,255,.07)'}}>
                      <div style={{width:'5px',height:'5px',borderRadius:'50%',background:acc.is_active?'#6ee7b7':'#f87171',flexShrink:0}}></div>
                      <span style={{fontSize:'10px',color:'#ccc',whiteSpace:'nowrap'}}>{acc.account_name||acc.account_id}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasTiktok && (
              <div className="hover-card" onClick={() => router.push('/dashboard/reportes/' + tiktokAccounts[0].account_id)}
                style={{...card, cursor:'pointer', transition:'border-color .2s'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'14px'}}>
                  <div style={{width:'32px',height:'32px',borderRadius:'8px',background:'#010101',border:'1px solid rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'14px',flexShrink:0}}>⟲</div>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:'700',color:'var(--text)'}}>TikTok Ads</div>
                    <div style={{fontSize:'10px',color:'var(--text4)'}}>Campañas de TikTok</div>
                  </div>
                  <div style={{marginLeft:'auto',fontSize:'11px',color:'#a5b4fc'}}>Ver →</div>
                </div>
              </div>
            )}

            {/* Connect more */}
            <div className="hover-card" onClick={() => router.push('/dashboard/platforms')}
              style={{...card, cursor:'pointer', transition:'border-color .2s', border:'1px dashed rgba(99,102,241,.25)', background:'rgba(99,102,241,.03)'}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px',height:'100%',minHeight:'60px'}}>
                <div style={{width:'32px',height:'32px',borderRadius:'8px',background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.2)',display:'flex',alignItems:'center',justifyContent:'center',color:'#a5b4fc',fontSize:'18px',flexShrink:0}}>+</div>
                <div>
                  <div style={{fontSize:'13px',fontWeight:'700',color:'#a5b4fc'}}>Conectar plataforma</div>
                  <div style={{fontSize:'10px',color:'var(--text4)'}}>Agrega más cuentas</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Tips - shown when has some data */}
      {(hasAnyAccount || metaToken) && (
        <div style={{...card, background:'rgba(99,102,241,.05)', border:'1px solid rgba(99,102,241,.15)'}}>
          <div style={{fontSize:'11px',fontWeight:'700',color:'#a5b4fc',marginBottom:'12px'}}>💡 Guía rápida</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'10px'}}>
            {[
              { icon:'📊', title:'Ver campañas', desc:'Haz clic en una cuenta de campañas pagadas para ver métricas detalladas.', action:hasAnyAccount?()=>router.push('/dashboard/reportes/'+accounts[0].account_id):null },
              { icon:'📱', title:'Orgánico', desc:'En "Redes Orgánicas" del sidebar ves tus páginas, seguidores y posts con mejor desempeño.', action:metaToken?()=>router.push('/dashboard/facebook'):null },
              { icon:'📅', title:'Filtrar fechas', desc:'Usa Hoy, 7 días, 30 días o rango personalizado para comparar períodos.', action:null },
              { icon:'⚙️', title:'Ajustes', desc:'Configura idioma, moneda y tema en Ajustes desde el menú lateral.', action:()=>router.push('/dashboard/settings') },
            ].map((tip, i) => (
              <div key={i} onClick={tip.action||undefined}
                style={{padding:'12px',background:'rgba(255,255,255,.03)',borderRadius:'8px',border:'1px solid rgba(255,255,255,.05)',cursor:tip.action?'pointer':'default'}}>
                <div style={{fontSize:'16px',marginBottom:'5px'}}>{tip.icon}</div>
                <div style={{fontSize:'11px',fontWeight:'700',color:'var(--text)',marginBottom:'3px'}}>{tip.title}</div>
                <div style={{fontSize:'10px',color:'var(--text4)',lineHeight:'1.5'}}>{tip.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
