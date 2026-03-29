'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const PRICE_IDS = {
  starter: 'price_1TGNdD4fet1IdptsRfTo1rjv',
  pro:     'price_1TGNdY4fet1IdptsK2bixrv3',
  agency:  'price_1TGNdr4fet1IdptsPZUSFC16',
}

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'para siempre',
    priceId: null,
    accent: '#666678',
    highlight: false,
    badge: null,
    features: [
      '1 plataforma conectada',
      'Analytics últimos 7 días',
      '5 posts con IA / mes',
      '1 nicho de industria',
      'Sin exportación PDF',
      'Sin calendario',
    ],
    cta: 'Empezar gratis',
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$247',
    period: 'MXN / mes',
    priceId: PRICE_IDS.starter,
    accent: '#6fcf97',
    highlight: false,
    badge: null,
    features: [
      'Hasta 3 plataformas conectadas',
      'Analytics últimos 30 días',
      '30 posts con IA / mes',
      'Todos los nichos de industria',
      'Calendario de publicaciones',
      '3 reportes PDF / mes',
      'Soporte por email',
    ],
    cta: 'Comenzar Starter',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$597',
    period: 'MXN / mes',
    priceId: PRICE_IDS.pro,
    accent: '#9096e0',
    highlight: true,
    badge: 'Más popular',
    features: [
      'Plataformas ilimitadas',
      'Analytics hasta 90 días',
      '100 posts con IA / mes',
      'PDFs ilimitados',
      'Todos los nichos de industria',
      'Google Ads + TikTok Ads',
      'Boost Radar + herramientas',
      'Soporte prioritario',
    ],
    cta: 'Comenzar Pro',
  },
  {
    id: 'agency',
    name: 'Agencia',
    price: '$1,297',
    period: 'MXN / mes',
    priceId: PRICE_IDS.agency,
    accent: '#c07898',
    highlight: false,
    badge: 'Para agencias',
    features: [
      'Todo lo de Pro incluido',
      'Hasta 10 workspaces de clientes',
      'Vista multi-cliente',
      'White-label en reportes PDF',
      '500 posts con IA / mes',
      'Onboarding personalizado',
      'Soporte dedicado',
    ],
    cta: 'Comenzar Agencia',
  },
]

export default function PlanesPage() {
  const [user, setUser]       = useState(null)
  const [plan, setPlan]       = useState('free')
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
    if (!user) { window.location.href = `/registro?plan=${planId}`; return }
    if (plan === planId) return
    setLoading(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId: user.id, email: user.email, plan: planId }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch(e) { console.error(e) }
    setLoading(null)
  }

  return (
    <div style={{minHeight:'100vh',background:'#0d0d12',fontFamily:'"Plus Jakarta Sans",system-ui,sans-serif',display:'flex',flexDirection:'column',alignItems:'center',padding:'60px 20px'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .plan-card{transition:transform .15s,box-shadow .15s}
        .plan-card:hover{transform:translateY(-3px);box-shadow:0 12px 40px rgba(0,0,0,.4)}
        .plan-btn:hover{opacity:.85}
        .plan-btn{transition:opacity .15s}
      `}</style>

      {/* Logo */}
      <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'40px'}}>
        <div style={{width:'34px',height:'34px',borderRadius:'8px',background:'linear-gradient(135deg,#5a5cdb,#7c55c8)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="16" height="16">
            <path d="M16 4 L4 26 L16 21 L28 26 Z" fill="white"/>
            <path d="M16 4 L16 21" stroke="white" strokeWidth="1.5" opacity=".35"/>
            <circle cx="16" cy="21" r="2.2" fill="#c4caff"/>
          </svg>
        </div>
        <span style={{color:'#eeeef2',fontWeight:'800',fontSize:'17px'}}>Kaan</span>
      </div>

      {/* Header */}
      <div style={{textAlign:'center',marginBottom:'52px'}}>
        <h1 style={{fontSize:'38px',fontWeight:'800',color:'#eeeef2',margin:'0 0 14px',letterSpacing:'-.5px'}}>
          Elige tu plan
        </h1>
        <p style={{color:'#666678',fontSize:'15px',maxWidth:'480px',lineHeight:'1.7',margin:'0 auto'}}>
          Inteligencia de marketing para agencias, community managers y negocios que quieren saber si su inversión está funcionando.
        </p>
      </div>

      {/* Plans grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px',maxWidth:'1040px',width:'100%',alignItems:'start'}}>
        {PLANS.map(p => {
          const isCurrent = plan === p.id && user
          const isHighlight = p.highlight

          return (
            <div key={p.id} className="plan-card" style={{
              background: isHighlight ? 'rgba(90,92,219,.08)' : '#13131a',
              border: `1px solid ${isHighlight ? 'rgba(110,108,240,.45)' : 'rgba(255,255,255,.07)'}`,
              borderRadius: '16px',
              padding: '26px 22px',
              position: 'relative',
              boxShadow: isHighlight ? '0 0 0 1px rgba(110,108,240,.2), 0 8px 32px rgba(90,92,219,.12)' : 'none',
            }}>

              {/* Badge */}
              {p.badge && (
                <div style={{
                  position:'absolute',top:'-12px',left:'50%',transform:'translateX(-50%)',
                  background: isHighlight ? 'linear-gradient(135deg,#5a5cdb,#7c55c8)' : 'rgba(180,120,150,.2)',
                  border: isHighlight ? 'none' : '1px solid rgba(192,120,152,.35)',
                  color:'#fff',fontSize:'11px',fontWeight:'700',
                  padding:'4px 14px',borderRadius:'20px',whiteSpace:'nowrap',
                }}>
                  {p.badge}
                </div>
              )}

              {/* Plan name + price */}
              <div style={{marginBottom:'22px',marginTop: p.badge ? '6px' : '0'}}>
                <div style={{fontSize:'11px',fontWeight:'700',color:p.accent,marginBottom:'10px',textTransform:'uppercase',letterSpacing:'.07em'}}>{p.name}</div>
                <div style={{display:'flex',alignItems:'baseline',gap:'5px'}}>
                  <span style={{fontSize:'34px',fontWeight:'800',color:'#eeeef2',lineHeight:'1'}}>{p.price}</span>
                  <span style={{fontSize:'12px',color:'#555566'}}>{p.period}</span>
                </div>
              </div>

              {/* Divider */}
              <div style={{height:'1px',background:'rgba(255,255,255,.06)',marginBottom:'20px'}}></div>

              {/* Features */}
              <div style={{marginBottom:'24px',display:'flex',flexDirection:'column',gap:'9px'}}>
                {p.features.map((f,i) => (
                  <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'8px'}}>
                    <span style={{color:p.accent,fontSize:'13px',flexShrink:0,marginTop:'1px'}}>✓</span>
                    <span style={{fontSize:'12px',color: isHighlight ? '#c0c0d0' : '#666678',lineHeight:'1.5'}}>{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA button */}
              <button className="plan-btn"
                onClick={() => handleSubscribe(p.priceId, p.id)}
                disabled={loading === p.id || isCurrent}
                style={{
                  width:'100%',padding:'12px',borderRadius:'10px',border:'none',
                  cursor: isCurrent ? 'default' : 'pointer',
                  fontFamily:'inherit',fontSize:'13px',fontWeight:'700',
                  background: isCurrent
                    ? 'rgba(110,231,183,.1)'
                    : isHighlight
                    ? 'linear-gradient(135deg,#5a5cdb,#7c55c8)'
                    : `rgba(${p.id==='free'?'255,255,255,.06':p.id==='starter'?'80,160,120,.15':p.id==='agency'?'160,100,130,.15':'255,255,255,.06'})`,
                  color: isCurrent ? '#6fcf97' : '#eeeef2',
                  opacity: loading === p.id ? .7 : 1,
                  boxShadow: isHighlight && !isCurrent ? '0 2px 14px rgba(90,92,219,.3)' : 'none',
                }}>
                {loading === p.id ? 'Redirigiendo...' : isCurrent ? '✓ Plan actual' : p.cta}
              </button>
            </div>
          )
        })}
      </div>

      {/* Comparación rápida */}
      <div style={{marginTop:'48px',maxWidth:'600px',width:'100%',background:'#13131a',border:'1px solid rgba(255,255,255,.06)',borderRadius:'14px',padding:'24px 28px'}}>
        <div style={{fontSize:'13px',fontWeight:'700',color:'#9a9aaa',marginBottom:'16px',textTransform:'uppercase',letterSpacing:'.06em'}}>¿Cuál me conviene?</div>
        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {[
            { emoji:'👤', who:'Comienzo en redes',            plan:'Free → Starter',     color:'#6fcf97' },
            { emoji:'🎨', who:'CM freelance con 3-8 clientes',plan:'Starter o Pro',       color:'#9096e0' },
            { emoji:'📈', who:'Negocio activo con ads',       plan:'Pro',                 color:'#9096e0' },
            { emoji:'🏢', who:'Agencia con múltiples cuentas',plan:'Agencia',             color:'#c07898' },
          ].map((r,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 0',borderBottom: i<3 ? '1px solid rgba(255,255,255,.05)' : 'none'}}>
              <span style={{fontSize:'18px',flexShrink:0}}>{r.emoji}</span>
              <div style={{flex:1,fontSize:'13px',color:'#9a9aaa'}}>{r.who}</div>
              <span style={{fontSize:'12px',fontWeight:'700',color:r.color,background:`${r.color}18`,padding:'3px 10px',borderRadius:'20px',whiteSpace:'nowrap'}}>{r.plan}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{marginTop:'32px',display:'flex',gap:'20px',fontSize:'12px',color:'#555566',flexWrap:'wrap',justifyContent:'center'}}>
        <a href="/dashboard" style={{color:'#666678',textDecoration:'none'}}>← Volver al dashboard</a>
        <span>·</span>
        <span>🔒 Pagos seguros con Stripe</span>
        <span>·</span>
        <span>Cancela cuando quieras</span>
        <span>·</span>
        <a href="/privacidad" style={{color:'#666678',textDecoration:'none'}}>Privacidad</a>
      </div>
    </div>
  )
}
