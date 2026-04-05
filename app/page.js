'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DM_Sans } from 'next/font/google'

const dm = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], display: 'swap' })

const ACC   = '#7c6ef5'
const ACC2  = '#5de8b4'
const BG    = '#0a0a0c'
const SURF  = '#111114'
const SURF2 = '#18181c'
const BOR   = 'rgba(255,255,255,0.07)'
const TEXT  = '#f0f0f2'
const MUTED = '#888890'

const LOGO = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="16" height="16">
    <path d="M16 4 L4 26 L16 21 L28 26 Z" fill="white"/>
    <path d="M16 4 L16 21" stroke="white" strokeWidth="1.5" opacity=".35"/>
    <circle cx="16" cy="21" r="2.2" fill="#a5b4fc"/>
  </svg>
)

const CHECK = (
  <svg viewBox="0 0 16 16" fill="none" width="14" height="14" style={{flexShrink:0}}>
    <circle cx="8" cy="8" r="7" stroke="#5de8b4" strokeWidth="1.2"/>
    <path d="M5 8l2 2 4-4" stroke="#5de8b4" strokeWidth="1.4"/>
  </svg>
)
const CROSS = (
  <svg viewBox="0 0 16 16" fill="none" width="14" height="14" style={{flexShrink:0}}>
    <circle cx="8" cy="8" r="7" stroke="#333" strokeWidth="1.2"/>
    <path d="M6 6l4 4M10 6l-4 4" stroke="#444" strokeWidth="1.4"/>
  </svg>
)

const FEATURES = [
  {
    bg: 'rgba(124,110,245,0.12)',
    title: 'Dashboard multi-plataforma',
    desc: 'Meta Ads, Google Ads y TikTok en una sola vista. Compara métricas entre plataformas sin abrir otra pestaña.',
    tag: 'Multi-canal',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#9d8ff5" strokeWidth="1.8" width="17" height="17"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    bg: 'rgba(93,232,180,0.09)',
    title: 'Asistente IA por industria',
    desc: 'Genera posts y tendencias de contenido adaptados a tu sector: restaurantes, inmobiliario, salud, retail y más.',
    tag: 'IA · 10 nichos',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#5de8b4" strokeWidth="1.8" width="17" height="17"><path d="M12 2a10 10 0 110 20A10 10 0 0112 2z"/><path d="M8 12s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
  },
  {
    bg: 'rgba(239,159,39,0.09)',
    title: 'Reportes PDF para clientes',
    desc: 'Genera reportes con tu branding en un clic. Con el plan Agencia son completamente white-label — Kaan no aparece.',
    tag: 'White-label',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#ef9f27" strokeWidth="1.8" width="17" height="17"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  },
  {
    bg: 'rgba(55,138,221,0.10)',
    title: 'Análisis de creativos',
    desc: 'Hook rate, hold rate, CTR y conversión por anuncio. Sabes exactamente qué creativo está jalando y cuál está quemado.',
    tag: 'Creativos',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#85b7eb" strokeWidth="1.8" width="17" height="17"><path d="M15 10l-4 4-2-2"/><circle cx="12" cy="12" r="9"/></svg>,
  },
  {
    bg: 'rgba(212,83,126,0.09)',
    title: 'Calendario de publicaciones',
    desc: 'Organiza y visualiza tus posts por plataforma. Programa contenido y mantén la consistencia sin perder el hilo.',
    tag: 'Organización',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#ed93b1" strokeWidth="1.8" width="17" height="17"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  {
    bg: 'rgba(99,153,34,0.09)',
    title: 'Vista multi-cliente',
    desc: 'Gestiona todos tus clientes desde un panel. Cambia entre cuentas al instante sin volver a hacer login.',
    tag: 'Agencias',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#97c459" strokeWidth="1.8" width="17" height="17"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>,
  },
]

const NICHES = [
  { emoji:'🏠', label:'Inmobiliario',     example:'Ve cuántos leads generó cada campaña de propiedades.',       color:'rgba(90,92,219,.12)',    border:'rgba(110,108,240,.28)', tc:'#9d8ff5' },
  { emoji:'🍽️', label:'Restaurantes',     example:'Mide reservas y pedidos reales generados por tus ads.',     color:'rgba(93,232,180,.07)',   border:'rgba(93,232,180,.22)',  tc:ACC2 },
  { emoji:'🏨', label:'Turismo',           example:'Optimiza temporadas con analytics de conversión real.',     color:'rgba(239,159,39,.07)',   border:'rgba(239,159,39,.2)',   tc:'#fac775' },
  { emoji:'💆', label:'Wellness',          example:'Conecta tus ads de spa o estética con clientes captados.',  color:'rgba(212,83,126,.07)',   border:'rgba(212,83,126,.2)',   tc:'#ed93b1' },
  { emoji:'🏋️', label:'Fitness',           example:'Sabe cuántas membresías generó cada campaña de tu gym.',   color:'rgba(55,138,221,.07)',   border:'rgba(55,138,221,.2)',   tc:'#85b7eb' },
  { emoji:'🏥', label:'Salud & Clínicas',  example:'Mide citas y pacientes nuevos por plataforma de anuncio.', color:'rgba(16,185,129,.07)',   border:'rgba(16,185,129,.22)',  tc:'#34d399' },
  { emoji:'🛍️', label:'Retail',            example:'Conecta ventas de tu tienda o e-commerce con campañas.',   color:'rgba(124,110,245,.07)', border:'rgba(124,110,245,.22)',  tc:'#a78bfa' },
  { emoji:'🎓', label:'Educación',         example:'Mide inscripciones y leads por curso en cada plataforma.', color:'rgba(239,159,39,.07)',   border:'rgba(239,159,39,.2)',   tc:'#fac775' },
  { emoji:'⚖️', label:'Servicios Prof.',   example:'Ve cuántas consultas generaron tus campañas de servicios.',color:'rgba(99,153,34,.08)',    border:'rgba(99,153,34,.25)',   tc:'#97c459' },
  { emoji:'🏗️', label:'Construcción',      example:'Analiza cotizaciones generadas por anuncio de tu empresa.', color:'rgba(192,120,152,.07)', border:'rgba(192,120,152,.2)',  tc:'#c07898' },
]

const PLANS = [
  {
    id: 'free', name: 'Free', price: '$0', period: 'para siempre',
    accent: '#666678', highlight: false, badge: null,
    features: [
      { t: '1 plataforma conectada', y: true },
      { t: 'Analytics últimos 7 días', y: true },
      { t: '5 posts con IA / mes', y: true },
      { t: 'Calendario de publicaciones', y: false },
      { t: 'Reportes PDF', y: false },
      { t: 'Multi-cliente', y: false },
    ],
    cta: 'Empezar gratis',
    ctaStyle: { background: 'none', border: `0.5px solid ${BOR}`, color: TEXT },
  },
  {
    id: 'starter', name: 'Starter', price: '$247', period: 'MXN / mes',
    accent: '#6fcf97', highlight: false, badge: null,
    features: [
      { t: 'Hasta 3 plataformas', y: true },
      { t: 'Analytics últimos 30 días', y: true },
      { t: '30 posts con IA / mes', y: true },
      { t: 'Calendario de publicaciones', y: true },
      { t: '3 reportes PDF / mes', y: true },
      { t: 'Multi-cliente', y: false },
    ],
    cta: 'Comenzar Starter',
    ctaStyle: { background: 'rgba(80,160,120,.15)', border: '1px solid rgba(111,207,151,.2)', color: '#6fcf97' },
  },
  {
    id: 'pro', name: 'Pro', price: '$597', period: 'MXN / mes',
    accent: '#9096e0', highlight: true, badge: 'Más popular',
    features: [
      { t: 'Plataformas ilimitadas', y: true },
      { t: 'Analytics hasta 90 días', y: true },
      { t: '100 posts con IA / mes', y: true },
      { t: 'PDFs ilimitados', y: true },
      { t: 'Google Ads + TikTok Ads', y: true },
      { t: 'Soporte prioritario', y: true },
    ],
    cta: 'Comenzar Pro',
    ctaStyle: { background: 'linear-gradient(135deg,#5a5cdb,#7c55c8)', border: 'none', color: '#fff' },
  },
  {
    id: 'agency', name: 'Agencia', price: '$1,297', period: 'MXN / mes',
    accent: '#c07898', highlight: false, badge: 'Para agencias',
    features: [
      { t: 'Todo lo de Pro', y: true },
      { t: 'Hasta 10 workspaces', y: true },
      { t: 'Vista multi-cliente', y: true },
      { t: 'PDFs white-label', y: true },
      { t: '500 posts con IA / mes', y: true },
      { t: 'Onboarding personalizado', y: true },
    ],
    cta: 'Comenzar Agencia',
    ctaStyle: { background: 'rgba(160,100,130,.18)', border: '1px solid rgba(192,120,152,.3)', color: '#c07898' },
  },
]

const TESTIMONIALS = [
  {
    name: 'Sofía R.',
    role: 'Directora de agencia · Playa del Carmen',
    text: 'Con Kaan puedo ver el rendimiento de todos mis clientes en un solo panel. Los reportes PDF se ven tan profesionales que mis clientes piensan que tengo un equipo grande.',
    avatar: 'SR',
    niche: '🏠 Inmobiliario + 🍽️ Restaurantes',
  },
  {
    name: 'Diego L.',
    role: 'Community Manager freelance · Tulum',
    text: 'El asistente IA ya sabe de qué habla mi industria. Genero posts de bienes raíces o turismo en segundos, y el contenido suena natural, no genérico.',
    avatar: 'DL',
    niche: '🏨 Turismo & Hospitalidad',
  },
  {
    name: 'Carlos M.',
    role: 'Dueño de gym · Cancún',
    text: 'Antes no sabía si mis anuncios de Meta estaban funcionando. Ahora entro a Kaan y en 2 minutos sé exactamente cuánto estoy gastando y cuántos clientes me está generando.',
    avatar: 'CM',
    niche: '🏋️ Fitness',
  },
]

const FAQS = [
  { q: '¿Para quién es Kaan?', a: 'Para agencias de marketing pequeñas, community managers freelance y negocios que invierten en publicidad digital y quieren saber si esa inversión está generando resultados reales.' },
  { q: '¿Necesito experiencia técnica?', a: 'No. La conexión es por OAuth (igual que "Iniciar sesión con Google"), sin código ni configuraciones complicadas. En menos de 5 minutos ya estás viendo tus datos.' },
  { q: '¿El asistente IA realmente entiende mi industria?', a: 'Sí. El asistente está entrenado en 10 nichos distintos: inmobiliario, restaurantes, turismo, wellness, fitness, salud, retail, educación, servicios y construcción. El contenido que genera usa el lenguaje, los temas y los hashtags correctos para cada sector.' },
  { q: '¿Puedo manejar las cuentas de varios clientes?', a: 'Con el plan Pro puedes conectar plataformas ilimitadas. Con el plan Agencia obtienes hasta 10 workspaces independientes y una vista multi-cliente para cambiar entre cuentas en un clic.' },
  { q: '¿Los reportes PDF tienen el branding de Kaan?', a: 'Con el plan Agencia los reportes son completamente white-label: tu logo, los colores de tu cliente, tu firma. Kaan no aparece en ningún lado.' },
  { q: '¿Puedo cancelar cuando quiera?', a: 'Sí, sin compromisos ni penalizaciones. Si cancelas, conservas tu acceso hasta el final del periodo pagado y luego pasas al plan free automáticamente.' },
]

const CAMPAIGNS = [
  { color:'#7c6ef5', name:'META_LEADS_MAYO', val:'$6,200', tag:'352 conv', tagBg:'rgba(124,110,245,.12)', tagColor:'#9d8ff5' },
  { color:'#378add', name:'GADS_SEARCH_MARCA', val:'$4,810', tag:'241 conv', tagBg:'rgba(55,138,221,.1)', tagColor:'#85b7eb' },
  { color:'#d4537e', name:'TIKTOK_VIDEO_Q2', val:'$3,140', tag:'178 conv', tagBg:'rgba(212,83,126,.1)', tagColor:'#ed93b1' },
  { color:'#ef9f27', name:'META_RETARGETING_V3', val:'$2,890', tag:'72 conv', tagBg:'rgba(239,159,39,.1)', tagColor:'#fac775' },
]

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(null)
  const [activeNiche, setActiveNiche] = useState(0)
  const router = useRouter()

  return (
    <div className={dm.className} style={{fontSize:'15px',lineHeight:'1.6',color:TEXT,background:BG,minHeight:'100vh'}}>
      <style>{`
        @media (max-width: 768px) {
          .kn-g4 { grid-template-columns: repeat(2,minmax(0,1fr)) !important; }
          .kn-g2 { grid-template-columns: 1fr !important; }
          .kn-gstats { grid-template-columns: 1fr !important; }
          .kn-gstats > div { border-right: none !important; border-bottom: 0.5px solid rgba(255,255,255,0.07) !important; }
          .kn-gpricing { grid-template-columns: repeat(2,minmax(0,1fr)) !important; }
          .kaan-grid-3 { grid-template-columns: 1fr !important; }
          .kaan-grid-5 { grid-template-columns: repeat(2,minmax(0,1fr)) !important; }
          .kaan-nav-links { display: none !important; }
          .kaan-nav-right button:first-child { display: none !important; }
          .kaan-hero h1 { font-size: 36px !important; line-height: 1.1 !important; }
          .kaan-section { padding: 48px 20px !important; }
          .kaan-mockup { margin: 0 16px 48px !important; }
          .kaan-cta { margin: 0 16px 80px !important; padding: 40px 24px !important; }
          .kaan-cta h2 { font-size: 26px !important; }
          .kaan-hero-btns { flex-direction: column !important; align-items: center !important; }
          .kaan-hero-btns button { width: 100% !important; max-width: 320px !important; justify-content: center !important; }
          .kaan-footer { flex-direction: column !important; gap: 16px !important; text-align: center !important; }
          .kaan-section-title { font-size: 28px !important; }
          .kn-pain { grid-template-columns: 1fr !important; }
          .kn-how { grid-template-columns: 1fr !important; }
          .kn-gniches { grid-template-columns: repeat(2,minmax(0,1fr)) !important; }
        }
        @media (max-width: 560px) {
          .kn-gpricing { grid-template-columns: 1fr !important; }
          .kn-g4 { grid-template-columns: 1fr !important; }
          .kn-gniches { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 40px',borderBottom:`0.5px solid ${BOR}`,background:'rgba(10,10,12,0.94)',backdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:100}}>
        <div onClick={()=>router.push('/')} style={{display:'flex',alignItems:'center',gap:9,fontWeight:700,fontSize:'17px',color:TEXT,cursor:'pointer'}}>
          <div style={{width:30,height:30,background:ACC,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{LOGO}</div>
          Kaan
        </div>
        <div className="kaan-nav-links" style={{display:'flex',gap:28,fontSize:'14px'}}>
          {['Funciones','Nichos','Precios','FAQ'].map(l=>(
            <span key={l} style={{color:MUTED,cursor:'pointer'}}>{l}</span>
          ))}
        </div>
        <div className="kaan-nav-right" style={{display:'flex',gap:10,alignItems:'center'}}>
          <button onClick={()=>router.push('/registro')} style={{background:'none',border:`0.5px solid ${BOR}`,color:MUTED,padding:'8px 18px',borderRadius:8,fontSize:'13px',cursor:'pointer'}}>Iniciar sesión</button>
          <button onClick={()=>router.push('/registro')} style={{background:ACC,color:'white',border:'none',padding:'9px 20px',borderRadius:8,fontSize:'13px',fontWeight:600,cursor:'pointer'}}>Empezar gratis</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="kaan-hero" style={{padding:'80px 40px 56px',textAlign:'center',maxWidth:960,margin:'0 auto'}}>

        {/* Audience pills */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,flexWrap:'wrap',marginBottom:28}}>
          {['🏢 Agencias MKT','👤 Community Managers','📈 Negocios con ads'].map(p=>(
            <span key={p} style={{fontSize:'12px',padding:'4px 12px',borderRadius:20,background:SURF,border:`0.5px solid ${BOR}`,color:MUTED}}>{p}</span>
          ))}
        </div>

        <h1 style={{fontSize:'58px',fontWeight:800,lineHeight:1.05,letterSpacing:'-0.03em',marginBottom:22,color:TEXT}}>
          Todos tus anuncios.<br/>
          <span style={{background:'linear-gradient(135deg,#7c6ef5,#5de8b4)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Un solo dashboard.</span>
        </h1>
        <p style={{fontSize:'19px',color:MUTED,maxWidth:600,margin:'0 auto 10px',lineHeight:1.7}}>
          Conecta Meta, Google y TikTok en minutos. Ve exactamente <strong style={{color:TEXT,fontWeight:600}}>qué campañas generan resultados</strong>, genera reportes para clientes y deja que la IA te sugiera qué escalar o pausar.
        </p>
        <p style={{fontSize:'14px',color:'#555',maxWidth:480,margin:'0 auto 32px',lineHeight:1.6}}>
          Diseñado para negocios en LATAM · IA entrenada en 10 industrias
        </p>

        {/* Social proof */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12,marginBottom:36}}>
          <div style={{display:'flex'}}>
            {['SR','DL','CM','AV','MR'].map((i,idx)=>(
              <div key={i} style={{width:28,height:28,borderRadius:'50%',background:`hsl(${idx*47+240},40%,45%)`,border:`2px solid ${BG}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:700,color:'white',marginLeft:idx?-8:0}}>{i}</div>
            ))}
          </div>
          <span style={{fontSize:'13px',color:MUTED}}><span style={{color:TEXT,fontWeight:600}}>+120 profesionales</span> ya usan Kaan en LATAM</span>
        </div>

        <div className="kaan-hero-btns" style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
          <button onClick={()=>router.push('/registro')} style={{background:`linear-gradient(135deg,${ACC},#6051c8)`,color:'white',border:'none',padding:'15px 32px',fontSize:'15px',fontWeight:600,borderRadius:10,display:'flex',alignItems:'center',gap:8,cursor:'pointer',boxShadow:'0 4px 24px rgba(124,110,245,0.35)'}}>
            {LOGO} Empezar gratis
          </button>
          <button onClick={()=>document.getElementById('demo').scrollIntoView({behavior:'smooth'})} style={{background:'none',border:`0.5px solid rgba(255,255,255,0.14)`,color:TEXT,padding:'15px 28px',fontSize:'15px',fontWeight:500,borderRadius:10,cursor:'pointer'}}>
            Ver cómo funciona →
          </button>
        </div>
        <p style={{marginTop:14,fontSize:'12px',color:MUTED}}>Sin tarjeta de crédito · <span style={{color:'rgba(93,232,180,.75)'}}>Plan free disponible</span></p>
      </div>

      {/* ── PLATFORM STRIP ── */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'0 40px 56px',flexWrap:'wrap'}}>
        {[
          {name:'Meta Ads', icon:<svg viewBox="0 0 24 24" width="14" height="14" fill="#1877f2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>},
          {name:'Google Ads', icon:<svg viewBox="0 0 24 24" width="14" height="14"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>},
          {name:'TikTok Ads', icon:<svg viewBox="0 0 24 24" width="14" height="14"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.2 8.2 0 004.79 1.52V6.77a4.85 4.85 0 01-1.02-.08z" fill="#010101"/></svg>},
          {name:'Instagram', icon:<svg viewBox="0 0 24 24" width="14" height="14"><defs><linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f09433"/><stop offset="25%" stopColor="#e6683c"/><stop offset="50%" stopColor="#dc2743"/><stop offset="75%" stopColor="#cc2366"/><stop offset="100%" stopColor="#bc1888"/></linearGradient></defs><path fill="url(#ig)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>},
        ].map(p=>(
          <div key={p.name} style={{display:'flex',alignItems:'center',gap:7,background:SURF,border:`0.5px solid ${BOR}`,padding:'7px 14px',borderRadius:20,fontSize:'13px',color:MUTED}}>{p.icon}{p.name}</div>
        ))}
        <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(124,110,245,0.05)',border:`0.5px solid rgba(124,110,245,0.2)`,padding:'7px 14px',borderRadius:20,fontSize:'13px',color:ACC}}>
          <svg viewBox="0 0 16 16" fill="none" width="13" height="13"><circle cx="3" cy="8" r="1.5" fill={ACC}/><circle cx="8" cy="8" r="1.5" fill={ACC}/><circle cx="13" cy="8" r="1.5" fill={ACC}/></svg>
          más plataformas
        </div>
      </div>

      {/* ── PAIN POINTS ── */}
      <div style={{padding:'0 40px 80px',maxWidth:1100,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:40}}>
          <div style={{fontSize:'11px',textTransform:'uppercase',letterSpacing:'.12em',color:'#ef4444',marginBottom:10,fontWeight:600}}>El problema</div>
          <h2 className="kaan-section-title" style={{fontSize:'38px',fontWeight:800,letterSpacing:'-.025em',color:TEXT,marginBottom:12}}>¿Te suena familiar?</h2>
          <p style={{fontSize:'15px',color:MUTED,maxWidth:460,margin:'0 auto',lineHeight:1.75}}>La mayoría de negocios en LATAM invierten en ads pero no tienen claridad sobre qué está funcionando.</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:16}} className="kn-pain">
          {[
            {
              icon:'📂',
              bg:'rgba(239,68,68,.07)',
              border:'rgba(239,68,68,.18)',
              problem:'Demasiadas pestañas abiertas',
              desc:'Meta Business Suite, Google Ads, TikTok Ads Manager... cada plataforma tiene su propio dashboard y sus propios formatos.',
              fix:'Kaan los une todos en una sola vista.',
              fixColor:'#f87171',
            },
            {
              icon:'⏰',
              bg:'rgba(239,159,39,.07)',
              border:'rgba(239,159,39,.18)',
              problem:'Los reportes te roban horas',
              desc:'Copias métricas, armas tablas en Excel, buscas capturas de pantalla... para entregarle un reporte a cada cliente.',
              fix:'Kaan genera PDFs profesionales en 1 clic.',
              fixColor:'#fac775',
            },
            {
              icon:'❓',
              bg:'rgba(99,102,241,.07)',
              border:'rgba(99,102,241,.18)',
              problem:'No sabes cuál anuncio convierte',
              desc:'Tienes 5 campañas activas, gastas presupuesto en todas, pero no tienes claro cuál es la que realmente genera clientes.',
              fix:'Kaan muestra métricas reales por campaña, conjunto y anuncio.',
              fixColor:'#a5b4fc',
            },
          ].map((p,i)=>(
            <div key={i} style={{background:p.bg,border:`1px solid ${p.border}`,borderRadius:16,padding:28}}>
              <div style={{fontSize:'32px',marginBottom:14}}>{p.icon}</div>
              <div style={{fontSize:'16px',fontWeight:700,color:TEXT,marginBottom:10}}>{p.problem}</div>
              <p style={{fontSize:'13px',color:MUTED,lineHeight:1.7,marginBottom:16}}>{p.desc}</p>
              <div style={{display:'flex',alignItems:'flex-start',gap:8,background:'rgba(255,255,255,.04)',borderRadius:8,padding:'10px 12px'}}>
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14" style={{flexShrink:0,marginTop:1}}><path d="M13 4L6 11l-3-3" stroke={p.fixColor} strokeWidth="1.8" strokeLinecap="round"/></svg>
                <span style={{fontSize:'12px',color:p.fixColor,fontWeight:500,lineHeight:1.5}}>{p.fix}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DASHBOARD MOCKUP ── */}
      <div id="demo" className="kaan-mockup" style={{margin:'0 40px 80px',background:SURF,border:`0.5px solid ${BOR}`,borderRadius:16,overflow:'hidden'}}>
        <div style={{padding:'11px 16px',borderBottom:`0.5px solid ${BOR}`,display:'flex',alignItems:'center',gap:8}}>
          <div style={{display:'flex',gap:5}}>
            {['#ff5f57','#febc2e','#28c840'].map(c=><div key={c} style={{width:10,height:10,borderRadius:'50%',background:c}}/>)}
          </div>
          <div style={{flex:1,background:'rgba(255,255,255,0.04)',borderRadius:5,padding:'4px 10px',fontSize:'11px',color:MUTED,maxWidth:220,margin:'0 auto',textAlign:'center'}}>kaan.app/dashboard</div>
        </div>
        <div style={{padding:20}}>
          <div style={{display:'flex',gap:3,marginBottom:14,overflowX:'auto'}}>
            {['Resumen general','Meta Ads','Google Ads','TikTok','Creativos','Asistente IA'].map((t,i)=>(
              <div key={t} style={{padding:'6px 14px',borderRadius:6,fontSize:'12px',cursor:'pointer',whiteSpace:'nowrap',
                background: i===0 ? ACC : i===5 ? 'rgba(90,92,219,.12)' : 'none',
                color: i===0 ? 'white' : i===5 ? '#9096e0' : MUTED,
                border: i===5 ? '1px solid rgba(110,108,240,.2)' : 'none',
              }}>{t}</div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:10,marginBottom:14}} className="kn-g4">
            {[
              {label:'Inversión total',val:'$18,450',color:TEXT,badge:'+14% vs mes pasado',pos:true},
              {label:'Conversiones',val:'843',color:ACC2,badge:'+22% vs objetivo',pos:true},
              {label:'Costo / resultado',val:'$21.89',color:TEXT,badge:'eficiencia óptima',pos:true},
              {label:'CTR promedio',val:'3.84%',color:'#9d8ff5',badge:'todas las plataformas',pos:false},
            ].map(m=>(
              <div key={m.label} style={{background:SURF2,borderRadius:9,padding:14}}>
                <div style={{fontSize:'9px',textTransform:'uppercase',letterSpacing:'.08em',color:MUTED,marginBottom:7}}>{m.label}</div>
                <div style={{fontSize:'22px',fontWeight:700,color:m.color,marginBottom:3}}>{m.val}</div>
                <span style={{fontSize:'9px',padding:'2px 6px',borderRadius:3,background:m.pos?'rgba(93,232,180,0.09)':'rgba(255,255,255,0.05)',color:m.pos?ACC2:MUTED}}>{m.badge}</span>
              </div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}} className="kn-g2">
            <div style={{background:SURF2,borderRadius:9,padding:14}}>
              <div style={{fontSize:'9px',color:MUTED,marginBottom:9,textTransform:'uppercase',letterSpacing:'.06em'}}>Inversión por plataforma — 30 días</div>
              <div style={{display:'flex',alignItems:'flex-end',gap:3,height:52}}>
                {[78,61,44,25,52,68,41,57,85,70,90,76].map((h,i)=>(
                  <div key={i} style={{flex:1,height:`${h}%`,borderRadius:'2px 2px 0 0',background:['#7c6ef5','#378add','#d4537e','#1877f2','#7c6ef5','#378add','#d4537e','#7c6ef5','#5de8b4','#5de8b4','#5de8b4','#7c6ef5'][i],opacity:[1,1,1,1,.5,.6,.5,1,1,.7,1,1][i]}}/>
                ))}
              </div>
            </div>
            <div style={{background:SURF2,borderRadius:9,padding:14}}>
              <div style={{fontSize:'9px',color:MUTED,marginBottom:9,textTransform:'uppercase',letterSpacing:'.06em'}}>Top campañas activas</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {CAMPAIGNS.map(c=>(
                  <div key={c.name} style={{display:'flex',alignItems:'center',gap:7,padding:'5px 8px',background:'rgba(255,255,255,0.025)',borderRadius:5}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:c.color,flexShrink:0}}/>
                    <span style={{flex:1,fontSize:'11px',fontFamily:'monospace',color:TEXT,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</span>
                    <span style={{fontSize:'11px',color:MUTED}}>{c.val}</span>
                    <span style={{fontSize:'9px',padding:'2px 5px',borderRadius:3,background:c.tagBg,color:c.tagColor}}>{c.tag}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div style={{padding:'0 40px 80px',maxWidth:1100,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:48}}>
          <div style={{fontSize:'11px',textTransform:'uppercase',letterSpacing:'.12em',color:ACC2,marginBottom:12,fontWeight:600}}>Cómo funciona</div>
          <h2 className="kaan-section-title" style={{fontSize:'38px',fontWeight:800,letterSpacing:'-.025em',color:TEXT,marginBottom:12}}>Conectado en minutos.<br/>Datos claros en segundos.</h2>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:20}} className="kn-how">
          {[
            {
              n:'01',
              color:ACC,
              bg:'rgba(124,110,245,.1)',
              title:'Conecta tus plataformas',
              desc:'Login con Meta, Google o TikTok. Es OAuth — igual que "Iniciar sesión con Google". Sin código, sin tokens manuales, sin configuraciones raras.',
              detail:'En menos de 5 minutos ya ves tus datos.',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="#9d8ff5" strokeWidth="1.6" width="20" height="20"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>,
            },
            {
              n:'02',
              color:ACC2,
              bg:'rgba(93,232,180,.08)',
              title:'Analiza con contexto real',
              desc:'Dashboard unificado con todas tus campañas, conjuntos y anuncios. Compara periodos, detecta tendencias, ve qué creativos están quemados.',
              detail:'Una sola vista para todas tus plataformas.',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="#5de8b4" strokeWidth="1.6" width="20" height="20"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
            },
            {
              n:'03',
              color:'#ef9f27',
              bg:'rgba(239,159,39,.08)',
              title:'Reporta, decide y crece',
              desc:'PDF profesional para tu cliente en 1 clic. La IA analiza tus datos y sugiere qué campañas escalar, pausar o ajustar según tu industria.',
              detail:'Más tiempo estratégico, menos tiempo en reportes.',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="#ef9f27" strokeWidth="1.6" width="20" height="20"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
            },
          ].map((step,i)=>(
            <div key={i} style={{position:'relative'}}>
              {i < 2 && (
                <div style={{position:'absolute',top:28,left:'calc(100% + 8px)',width:'calc(100% - 16px)',height:'1px',background:'linear-gradient(90deg,rgba(255,255,255,.12),transparent)',display:'none'}}/>
              )}
              <div style={{background:SURF,border:`0.5px solid ${BOR}`,borderRadius:16,padding:28,height:'100%'}}>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
                  <div style={{width:44,height:44,borderRadius:12,background:step.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{step.icon}</div>
                  <div style={{fontSize:'32px',fontWeight:800,color:'rgba(255,255,255,.06)',lineHeight:1}}>{step.n}</div>
                </div>
                <div style={{fontSize:'17px',fontWeight:700,color:TEXT,marginBottom:10}}>{step.title}</div>
                <p style={{fontSize:'13px',color:MUTED,lineHeight:1.75,marginBottom:14}}>{step.desc}</p>
                <div style={{fontSize:'12px',color:step.color,fontWeight:600}}>→ {step.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{padding:'0 40px 80px',maxWidth:1100,margin:'0 auto'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',border:`0.5px solid ${BOR}`,borderRadius:14,overflow:'hidden'}} className="kn-g4">
          {[
            {n:'10',   l:'industrias con IA especializada', sub:'inmobiliario, restaurantes, turismo y más'},
            {n:'3+',   l:'plataformas unificadas',          sub:'Meta, Google y TikTok en un solo lugar'},
            {n:'1 clic',l:'para generar un reporte PDF',   sub:'listo para enviarle a tu cliente'},
            {n:'< 5 min',l:'para conectar tus cuentas',    sub:'sin código, sin configuraciones'},
          ].map((s,i)=>(
            <div key={s.n} style={{padding:'28px 22px',borderRight:i<3?`0.5px solid ${BOR}`:'none',textAlign:'center'}}>
              <div style={{fontSize:'40px',fontWeight:800,color:ACC,lineHeight:1,marginBottom:6}}>{s.n}</div>
              <div style={{fontSize:'13px',color:TEXT,fontWeight:600,marginBottom:4}}>{s.l}</div>
              <div style={{fontSize:'11px',color:'#555'}}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <div style={{padding:'0 40px 80px',maxWidth:1100,margin:'0 auto',textAlign:'center'}} className="kaan-section">
        <div style={{fontSize:'11px',textTransform:'uppercase',letterSpacing:'.12em',color:ACC,marginBottom:12,fontWeight:600}}>Funciones</div>
        <h2 className="kaan-section-title" style={{fontSize:'40px',fontWeight:800,lineHeight:1.15,letterSpacing:'-0.025em',marginBottom:14,color:TEXT}}>Todo en una sola herramienta</h2>
        <p style={{fontSize:'16px',color:MUTED,maxWidth:520,lineHeight:1.75,margin:'0 auto 48px'}}>Desde analytics hasta contenido generado por IA — diseñado para agencias, CMs y negocios que invierten en publicidad digital.</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:16,textAlign:'left'}} className="kaan-grid-3">
          {FEATURES.map(f=>(
            <div key={f.title} style={{background:SURF,border:`0.5px solid ${BOR}`,borderRadius:14,padding:24}}>
              <div style={{width:38,height:38,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14,background:f.bg}}>{f.icon}</div>
              <div style={{fontSize:'16px',fontWeight:700,marginBottom:8,color:TEXT}}>{f.title}</div>
              <div style={{fontSize:'14px',color:MUTED,lineHeight:1.65}}>{f.desc}</div>
              <span style={{display:'inline-block',marginTop:12,fontSize:'11px',padding:'3px 8px',borderRadius:4,background:'rgba(124,110,245,0.09)',color:ACC,fontWeight:500}}>{f.tag}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── NICHES ── */}
      <div style={{padding:'64px 40px 80px',background:SURF,borderTop:`0.5px solid ${BOR}`,borderBottom:`0.5px solid ${BOR}`}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:40}}>
            <div style={{fontSize:'11px',textTransform:'uppercase',letterSpacing:'.12em',color:ACC2,marginBottom:12,fontWeight:600}}>Industrias</div>
            <h2 className="kaan-section-title" style={{fontSize:'38px',fontWeight:800,letterSpacing:'-.025em',color:TEXT,marginBottom:12}}>IA que entiende tu negocio</h2>
            <p style={{fontSize:'15px',color:MUTED,maxWidth:500,margin:'0 auto',lineHeight:1.75}}>El asistente está entrenado en 10 industrias. Seleccionas tu nicho y los contenidos, sugerencias y análisis se adaptan a cómo funciona tu sector.</p>
          </div>

          {/* Niche grid */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:12}} className="kn-gniches">
            {NICHES.map((n,i)=>(
              <div
                key={n.label}
                onClick={()=>setActiveNiche(i)}
                style={{
                  background: activeNiche===i ? n.color : SURF2,
                  border: `1px solid ${activeNiche===i ? n.border : BOR}`,
                  borderRadius:14,padding:'20px 14px',textAlign:'center',cursor:'pointer',
                  transition:'all .15s',
                }}
              >
                <div style={{fontSize:'26px',marginBottom:8}}>{n.emoji}</div>
                <div style={{fontSize:'12px',fontWeight:700,color: activeNiche===i ? n.tc : MUTED,lineHeight:1.3,marginBottom:0}}>{n.label}</div>
              </div>
            ))}
          </div>

          {/* Active niche detail */}
          <div style={{marginTop:20,background:NICHES[activeNiche].color,border:`1px solid ${NICHES[activeNiche].border}`,borderRadius:14,padding:'20px 24px',display:'flex',alignItems:'center',gap:16}}>
            <div style={{fontSize:'28px',flexShrink:0}}>{NICHES[activeNiche].emoji}</div>
            <div>
              <div style={{fontSize:'13px',fontWeight:700,color:NICHES[activeNiche].tc,marginBottom:4}}>{NICHES[activeNiche].label}</div>
              <div style={{fontSize:'14px',color:TEXT,lineHeight:1.6}}>{NICHES[activeNiche].example}</div>
            </div>
            <div style={{marginLeft:'auto',flexShrink:0}}>
              <button onClick={()=>router.push('/registro')} style={{background:NICHES[activeNiche].tc,color:BG,border:'none',padding:'9px 18px',borderRadius:8,fontSize:'12px',fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
                Probar con {NICHES[activeNiche].label} →
              </button>
            </div>
          </div>

          <p style={{marginTop:16,fontSize:'12px',color:'#444',textAlign:'center'}}>¿No ves tu industria? Escríbenos — estamos agregando más nichos constantemente.</p>
        </div>
      </div>

      {/* ── TESTIMONIALS ── */}
      <div style={{padding:'80px 40px',maxWidth:1100,margin:'0 auto',textAlign:'center'}}>
        <div style={{fontSize:'11px',textTransform:'uppercase',letterSpacing:'.12em',color:ACC,marginBottom:12,fontWeight:600}}>Testimonios</div>
        <h2 className="kaan-section-title" style={{fontSize:'40px',fontWeight:800,lineHeight:1.15,letterSpacing:'-0.025em',marginBottom:48,color:TEXT}}>Lo que dicen quienes ya lo usan</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:16,textAlign:'left'}} className="kaan-grid-3">
          {TESTIMONIALS.map(t=>(
            <div key={t.name} style={{background:SURF,border:`0.5px solid ${BOR}`,borderRadius:14,padding:24,display:'flex',flexDirection:'column',gap:16}}>
              <div style={{display:'flex',gap:2}}>
                {[...Array(5)].map((_,i)=>(
                  <svg key={i} viewBox="0 0 12 12" width="14" height="14" fill="#f59e0b"><path d="M6 1l1.3 2.7 3 .4-2.2 2.1.5 3L6 7.7 3.4 9.2l.5-3L1.7 4.1l3-.4z"/></svg>
                ))}
              </div>
              <p style={{fontSize:'14px',color:TEXT,lineHeight:1.7,flex:1}}>"{t.text}"</p>
              <div style={{fontSize:'11px',color:MUTED,background:'rgba(255,255,255,.03)',border:`0.5px solid ${BOR}`,borderRadius:6,padding:'5px 9px',display:'inline-block',alignSelf:'flex-start'}}>{t.niche}</div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:36,height:36,borderRadius:'50%',background:ACC,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:700,color:'white',flexShrink:0}}>{t.avatar}</div>
                <div>
                  <div style={{fontSize:'13px',fontWeight:600,color:TEXT}}>{t.name}</div>
                  <div style={{fontSize:'11px',color:MUTED}}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PRICING ── */}
      <div style={{padding:'0 40px 80px',maxWidth:1100,margin:'0 auto',textAlign:'center'}}>
        <div style={{fontSize:'11px',textTransform:'uppercase',letterSpacing:'.12em',color:ACC,marginBottom:12,fontWeight:600}}>Precios</div>
        <h2 className="kaan-section-title" style={{fontSize:'40px',fontWeight:800,lineHeight:1.15,letterSpacing:'-0.025em',marginBottom:12,color:TEXT}}>Planes accesibles para LATAM</h2>
        <p style={{fontSize:'16px',color:MUTED,maxWidth:440,lineHeight:1.75,margin:'0 auto 48px'}}>Empieza gratis y escala cuando lo necesites. Sin contratos, sin sorpresas.</p>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:14,maxWidth:1040,margin:'0 auto',textAlign:'left',alignItems:'start'}} className="kn-gpricing">
          {PLANS.map(p=>(
            <div key={p.id} style={{
              background: p.highlight ? 'rgba(90,92,219,.07)' : SURF,
              border: `1px solid ${p.highlight ? 'rgba(110,108,240,.4)' : BOR}`,
              borderRadius:16, padding:'24px 20px', position:'relative',
              boxShadow: p.highlight ? '0 0 0 1px rgba(110,108,240,.15), 0 8px 32px rgba(90,92,219,.1)' : 'none',
            }}>
              {p.badge && (
                <div style={{
                  position:'absolute',top:'-11px',left:'50%',transform:'translateX(-50%)',
                  background: p.highlight ? 'linear-gradient(135deg,#5a5cdb,#7c55c8)' : 'rgba(192,120,152,.18)',
                  border: p.highlight ? 'none' : '1px solid rgba(192,120,152,.3)',
                  color:'#fff',fontSize:'10px',fontWeight:700,
                  padding:'3px 12px',borderRadius:20,whiteSpace:'nowrap',
                }}>{p.badge}</div>
              )}
              <div style={{marginBottom:18,marginTop: p.badge ? '6px' : '0'}}>
                <div style={{fontSize:'10px',fontWeight:700,color:p.accent,marginBottom:8,textTransform:'uppercase',letterSpacing:'.07em'}}>{p.name}</div>
                <div style={{display:'flex',alignItems:'baseline',gap:4}}>
                  <span style={{fontSize:'32px',fontWeight:800,color:TEXT,lineHeight:1}}>{p.price}</span>
                  <span style={{fontSize:'11px',color:MUTED}}>{p.period}</span>
                </div>
              </div>
              <hr style={{border:'none',borderTop:`0.5px solid rgba(255,255,255,.06)`,margin:'16px 0'}}/>
              <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
                {p.features.map(f=>(
                  <li key={f.t} style={{display:'flex',alignItems:'flex-start',gap:7,fontSize:'12px',color: f.y ? (p.highlight ? '#c0c0d0' : MUTED) : '#333'}}>
                    {f.y ? CHECK : CROSS}
                    {f.t}
                  </li>
                ))}
              </ul>
              <button onClick={()=>router.push(p.id==='free'?'/registro':`/registro?plan=${p.id}`)}
                style={{width:'100%',padding:'11px',borderRadius:9,border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:700,...p.ctaStyle}}>
                {p.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Comparison note */}
        <div style={{marginTop:32,maxWidth:560,margin:'32px auto 0',background:SURF,border:`0.5px solid ${BOR}`,borderRadius:12,padding:'18px 22px',textAlign:'left'}}>
          <div style={{fontSize:'11px',fontWeight:700,color:MUTED,marginBottom:12,textTransform:'uppercase',letterSpacing:'.06em'}}>¿Cuál me conviene?</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {[
              { emoji:'👤', who:'Comienzo en redes',              plan:'Free → Starter', color:'#6fcf97' },
              { emoji:'🎨', who:'CM freelance con varios clientes',plan:'Starter o Pro',   color:'#9096e0' },
              { emoji:'📈', who:'Negocio activo con ads',         plan:'Pro',             color:'#9096e0' },
              { emoji:'🏢', who:'Agencia con múltiples cuentas',  plan:'Agencia',         color:'#c07898' },
            ].map((r,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom: i<3 ? `0.5px solid ${BOR}` : 'none'}}>
                <span style={{fontSize:'16px',flexShrink:0}}>{r.emoji}</span>
                <div style={{flex:1,fontSize:'12px',color:MUTED}}>{r.who}</div>
                <span style={{fontSize:'11px',fontWeight:700,color:r.color,background:`${r.color}18`,padding:'2px 9px',borderRadius:20,whiteSpace:'nowrap'}}>{r.plan}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div style={{padding:'0 40px 80px',maxWidth:720,margin:'0 auto'}}>
        <div style={{fontSize:'11px',textTransform:'uppercase',letterSpacing:'.12em',color:ACC,marginBottom:12,textAlign:'center',fontWeight:600}}>FAQ</div>
        <h2 style={{fontSize:'40px',fontWeight:800,lineHeight:1.15,letterSpacing:'-0.025em',textAlign:'center',marginBottom:44,color:TEXT}}>Preguntas frecuentes</h2>
        <div>
          {FAQS.map((faq,i)=>(
            <div key={i} style={{borderBottom:`0.5px solid ${BOR}`}}>
              <div onClick={()=>setOpenFaq(openFaq===i?null:i)} style={{padding:'18px 0',fontSize:'15px',fontWeight:500,color:TEXT,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
                {faq.q}
                <svg viewBox="0 0 16 16" fill="none" width="16" height="16" style={{flexShrink:0,transform:openFaq===i?'rotate(180deg)':'none',transition:'transform .2s'}}><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5"/></svg>
              </div>
              {openFaq===i && <div style={{fontSize:'14px',color:MUTED,lineHeight:1.75,paddingBottom:18}}>{faq.a}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA FINAL ── */}
      <div className="kaan-cta" style={{margin:'0 40px 80px',background:'linear-gradient(135deg,rgba(124,110,245,.08),rgba(93,232,180,.04))',border:`1px solid rgba(124,110,245,0.25)`,borderRadius:20,padding:'72px 40px',textAlign:'center',position:'relative',overflow:'hidden'}}>
        {/* Glow */}
        <div style={{position:'absolute',top:'-40%',left:'50%',transform:'translateX(-50%)',width:500,height:300,background:'radial-gradient(ellipse,rgba(124,110,245,.12) 0%,transparent 70%)',pointerEvents:'none'}}/>

        <div style={{position:'relative'}}>
          <div style={{fontSize:'11px',textTransform:'uppercase',letterSpacing:'.12em',color:ACC,marginBottom:16,fontWeight:600}}>Empieza hoy</div>
          <h2 style={{fontSize:'44px',fontWeight:800,lineHeight:1.1,letterSpacing:'-0.025em',marginBottom:16,color:TEXT}}>
            Deja de adivinar.<br/>
            <span style={{background:'linear-gradient(135deg,#7c6ef5,#5de8b4)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Empieza a decidir con datos.</span>
          </h2>
          <p style={{fontSize:'17px',color:MUTED,maxWidth:480,margin:'0 auto 40px',lineHeight:1.7}}>
            Agencias, CMs y negocios en toda LATAM ya toman mejores decisiones con Kaan. Conecta tu primera plataforma gratis hoy.
          </p>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            <button onClick={()=>router.push('/registro')} style={{background:`linear-gradient(135deg,${ACC},#6051c8)`,color:'white',border:'none',padding:'16px 36px',fontSize:'16px',fontWeight:600,borderRadius:10,display:'flex',alignItems:'center',gap:8,cursor:'pointer',boxShadow:'0 4px 28px rgba(124,110,245,0.4)'}}>
              {LOGO} Empezar gratis
            </button>
            <button onClick={()=>router.push('/planes')} style={{background:'none',border:`0.5px solid rgba(255,255,255,.14)`,color:TEXT,padding:'16px 28px',fontSize:'16px',fontWeight:500,borderRadius:10,cursor:'pointer'}}>
              Ver planes →
            </button>
          </div>
          <p style={{marginTop:16,fontSize:'12px',color:MUTED}}>Sin tarjeta de crédito · Cancela cuando quieras · Datos 100% seguros</p>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="kaan-footer" style={{padding:'28px 40px',borderTop:`0.5px solid ${BOR}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:26,height:26,background:ACC,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}>{LOGO}</div>
          <span style={{fontSize:'13px',color:MUTED}}>© 2026 Kaan · Todos los derechos reservados</span>
        </div>
        <div style={{display:'flex',gap:20,fontSize:'13px'}}>
          {[['Privacidad','/privacidad'],['Términos','/terminos'],['Planes','/planes']].map(([l,href])=>(
            <a key={l} href={href} style={{color:MUTED,cursor:'pointer',textDecoration:'none'}}>{l}</a>
          ))}
        </div>
      </div>

    </div>
  )
}
