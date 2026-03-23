'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'para siempre',
    priceId: 'price_1TDuoa4fet1Idptsalw6lB8a',
    color: '#888',
    features: [
      '1 cuenta de Meta Ads',
      'Reportes basicos (Overview)',
      'Ultimos 7 dias de datos',
      'Sin exportacion PDF',
    ],
    cta: 'Empezar gratis',
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$297',
    period: 'MXN / mes',
    priceId: 'price_1TDup14fet1Idptsbk8lap80',
    color: '#6366f1',
    features: [
      'Cuentas ilimitadas de Meta Ads',
      'Reportes completos — todas las pestanas',
      'Hook Rate, Hold Rate, Score de creativos',
      'Diagnostico automatico por anuncio',
      'Datos demograficos + mapa de alcance',
      'Comparacion de periodos',
      'Exportacion PDF',
      'Facebook e Instagram organico',
      'Datos historicos hasta 12 meses',
      'Soporte prioritario',
    ],
    cta: 'Comenzar Pro',
    highlight: true,
  },
]

export default function PlanesPage() {
  const [user, setUser] = useState(null)
  const [plan, setPlan] = useState('free')
  const [loading, setLoading] = useState(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
        if (profile?.plan) setPlan(profile.plan)
      }
    }
    init()
  }, [])

  async function handleSubscribe(priceId, planId) {
    if (planId === 'free') { window.location.href = '/registro'; return }
    if (!user) { window.location.href = '/registro?plan=pro'; return }
    setLoading(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId: user.id, email: user.email }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch(e) { console.error(e) }
    setLoading(null)
  }

  return (
    <div style={{minHeight:'100vh',background:'#0c0c10',fontFamily:'"Plus Jakarta Sans",system-ui,sans-serif',display:'flex',flexDirection:'column',alignItems:'center',padding:'60px 20px'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap')`}</style>

      {/* Header */}
      <div style={{textAlign:'center',marginBottom:'48px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',marginBottom:'24px'}}>
          <div style={{width:'36px',height:'36px',borderRadius:'9px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px'}}>⚡</div>
          <span style={{color:'#fff',fontWeight:'800',fontSize:'18px'}}>Kaan</span>
        </div>
        <h1 style={{fontSize:'36px',fontWeight:'800',color:'#fff',marginBottom:'12px',letterSpacing:'-.5px'}}>
          Elige tu plan
        </h1>
        <p style={{color:'#555',fontSize:'14px',maxWidth:'400px',lineHeight:'1.6'}}>
          La herramienta que los traffickers de LATAM necesitan para reportar Meta Ads como profesionales
        </p>
      </div>

      {/* Plans grid */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',maxWidth:'720px',width:'100%'}}>
        {PLANS.map(p => (
          <div key={p.id} style={{
            background: p.highlight ? 'rgba(99,102,241,.06)' : '#111116',
            border: `1px solid ${p.highlight ? 'rgba(99,102,241,.4)' : 'rgba(255,255,255,.07)'}`,
            borderRadius:'16px',
            padding:'28px',
            position:'relative',
          }}>
            {p.highlight && (
              <div style={{position:'absolute',top:'-12px',left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',fontSize:'11px',fontWeight:'700',padding:'4px 14px',borderRadius:'20px',whiteSpace:'nowrap'}}>
                MAS POPULAR
              </div>
            )}

            <div style={{marginBottom:'20px'}}>
              <div style={{fontSize:'13px',fontWeight:'700',color:p.color,marginBottom:'8px',textTransform:'uppercase',letterSpacing:'.06em'}}>{p.name}</div>
              <div style={{display:'flex',alignItems:'baseline',gap:'6px'}}>
                <span style={{fontSize:'36px',fontWeight:'800',color:'#fff'}}>{p.price}</span>
                <span style={{fontSize:'12px',color:'#555'}}>{p.period}</span>
              </div>
            </div>

            <div style={{marginBottom:'24px',display:'flex',flexDirection:'column',gap:'8px'}}>
              {p.features.map((f,i) => (
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'8px'}}>
                  <span style={{color:p.highlight?'#6ee7b7':'#555',fontSize:'13px',flexShrink:0,marginTop:'1px'}}>✓</span>
                  <span style={{fontSize:'12px',color:p.highlight?'#bbb':'#666',lineHeight:'1.5'}}>{f}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleSubscribe(p.priceId, p.id)}
              disabled={loading === p.id || (plan === p.id && user)}
              style={{
                width:'100%',
                padding:'12px',
                borderRadius:'10px',
                border:'none',
                cursor: (plan === p.id && user) ? 'default' : 'pointer',
                fontFamily:'inherit',
                fontSize:'13px',
                fontWeight:'700',
                background: plan === p.id && user
                  ? 'rgba(110,231,183,.1)'
                  : p.highlight
                  ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                  : 'rgba(255,255,255,.06)',
                color: plan === p.id && user ? '#6ee7b7' : '#fff',
                transition:'opacity .15s',
                opacity: loading === p.id ? .7 : 1,
              }}>
              {loading === p.id ? 'Redirigiendo...' : plan === p.id && user ? '✓ Plan actual' : p.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Footer links */}
      <div style={{marginTop:'32px',display:'flex',gap:'24px',fontSize:'12px',color:'#444'}}>
        <a href="/dashboard" style={{color:'#555',textDecoration:'none'}}>← Volver al dashboard</a>
        <span>·</span>
        <span>Pagos seguros con Stripe</span>
        <span>·</span>
        <span>Cancela cuando quieras</span>
      </div>
    </div>
  )
}
