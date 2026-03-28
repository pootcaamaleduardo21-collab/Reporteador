'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function MetaAdsPage() {
  const [loading, setLoading] = useState(true)
  const [hasToken, setHasToken] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [user, setUser] = useState(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const success = searchParams.get('success')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)

      const [tokenRes, accsRes] = await Promise.all([
        supabase.from('meta_tokens').select('access_token').eq('user_id', user.id).single(),
        supabase.from('ad_accounts').select('*').eq('user_id', user.id).eq('platform', 'meta_ads'),
      ])

      const hasT = !!tokenRes.data?.access_token
      const accs = accsRes.data || []

      setHasToken(hasT)
      setAccounts(accs)

      // Si hay cuentas de ads, redirigir al dashboard de reportes
      if (accs.length > 0) {
        router.push('/dashboard/reportes/' + accs[0].account_id)
        return
      }

      setLoading(false)
    }
    init()
  }, [])

  function connectMeta() {
    if (!user) return
    const state = btoa(JSON.stringify({ uid: user.id, ts: Date.now(), returnTo: '/dashboard/meta-ads' }))
    window.location.href = `/api/auth/meta?state=${encodeURIComponent(state)}`
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#555',fontSize:'12px',fontFamily:'monospace'}}>
      Verificando cuentas de Meta Ads...
    </div>
  )

  return (
    <div style={{padding:'32px',fontFamily:'"Plus Jakarta Sans",sans-serif',maxWidth:'620px'}}>

      {success === 'meta_connected' && (
        <div style={{background:'rgba(34,197,94,.08)',border:'1px solid rgba(34,197,94,.2)',borderRadius:'10px',padding:'12px 16px',marginBottom:'24px',display:'flex',alignItems:'center',gap:'10px'}}>
          <span style={{fontSize:'16px'}}>✅</span>
          <span style={{fontSize:'13px',color:'#4ade80'}}>Cuenta de Meta reconectada. Verificando cuentas de Ads...</span>
        </div>
      )}

      <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'8px'}}>
        <div style={{width:'40px',height:'40px',borderRadius:'10px',background:'rgba(24,119,242,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px'}}>
          📊
        </div>
        <div>
          <h1 style={{margin:0,fontSize:'20px',fontWeight:'800',color:'#e0e0e0'}}>Meta Ads</h1>
          <p style={{margin:0,fontSize:'11px',color:'#555',fontFamily:'monospace'}}>Campañas · Conjuntos · Anuncios · Audiencias</p>
        </div>
      </div>

      <div style={{height:'1px',background:'rgba(255,255,255,.06)',marginBottom:'28px'}}></div>

      {hasToken ? (
        /* Conectado orgánicamente pero sin cuentas de Ads */
        <div>
          <div style={{background:'rgba(250,204,21,.06)',border:'1px solid rgba(250,204,21,.2)',borderRadius:'12px',padding:'20px',marginBottom:'20px'}}>
            <div style={{display:'flex',gap:'12px',alignItems:'flex-start'}}>
              <span style={{fontSize:'20px',flexShrink:0}}>⚠️</span>
              <div>
                <div style={{fontSize:'13px',fontWeight:'700',color:'#fbbf24',marginBottom:'6px'}}>Facebook conectado, pero sin cuentas de Ads Manager</div>
                <div style={{fontSize:'12px',color:'#888',lineHeight:'1.6'}}>
                  Tus páginas de Facebook e Instagram orgánicas están conectadas correctamente.
                  Para ver campañas pagadas necesitas tener una cuenta activa en{' '}
                  <strong style={{color:'#a5b4fc'}}>Meta Business Manager</strong> con acceso a{' '}
                  <strong style={{color:'#a5b4fc'}}>Ads Manager</strong>.
                </div>
              </div>
            </div>
          </div>

          <div style={{fontSize:'12px',color:'#666',marginBottom:'20px',lineHeight:'1.8'}}>
            <div style={{fontWeight:'700',color:'#888',marginBottom:'8px',fontFamily:'monospace',fontSize:'11px',textTransform:'uppercase',letterSpacing:'.06em'}}>¿Cómo activar Meta Ads?</div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {[
                ['1', 'Ve a business.facebook.com y crea un Business Manager'],
                ['2', 'Dentro de Business Manager, entra a Administrador de anuncios'],
                ['3', 'Crea o vincula una cuenta publicitaria'],
                ['4', 'Vuelve aquí y haz clic en "Reconectar con Facebook"'],
              ].map(([n,t]) => (
                <div key={n} style={{display:'flex',gap:'10px',alignItems:'flex-start'}}>
                  <div style={{width:'20px',height:'20px',borderRadius:'50%',background:'rgba(99,102,241,.2)',border:'1px solid rgba(99,102,241,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',color:'#a5b4fc',flexShrink:0,fontWeight:'700'}}>{n}</div>
                  <span style={{fontSize:'12px',color:'#777',lineHeight:'1.5',paddingTop:'2px'}}>{t}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
            <button onClick={connectMeta}
              style={{padding:'10px 20px',background:'rgba(24,119,242,.15)',border:'1px solid rgba(24,119,242,.4)',borderRadius:'8px',color:'#60a5fa',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>
              Reconectar con Facebook
            </button>
            <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer"
              style={{padding:'10px 20px',background:'transparent',border:'1px solid rgba(255,255,255,.1)',borderRadius:'8px',color:'#666',fontSize:'12px',fontWeight:'600',cursor:'pointer',textDecoration:'none',display:'inline-flex',alignItems:'center',gap:'6px'}}>
              Abrir Business Manager ↗
            </a>
          </div>
        </div>
      ) : (
        /* Sin token — necesitan conectar Meta */
        <div>
          <div style={{background:'rgba(99,102,241,.06)',border:'1px solid rgba(99,102,241,.2)',borderRadius:'12px',padding:'20px',marginBottom:'20px'}}>
            <div style={{fontSize:'13px',fontWeight:'700',color:'#a5b4fc',marginBottom:'6px'}}>Conecta tu cuenta de Facebook</div>
            <div style={{fontSize:'12px',color:'#777',lineHeight:'1.6'}}>
              Para ver tus campañas de Meta Ads necesitas conectar tu cuenta de Facebook. Asegúrate de tener acceso a Ads Manager antes de conectar.
            </div>
          </div>
          <button onClick={connectMeta}
            style={{padding:'12px 24px',background:'rgba(24,119,242,.9)',border:'none',borderRadius:'8px',color:'#fff',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>
            Conectar con Facebook
          </button>
        </div>
      )}
    </div>
  )
}
