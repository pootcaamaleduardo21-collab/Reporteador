'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DM_Sans } from 'next/font/google'

const dm = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '700'], display: 'swap' })

const ACC = '#7c6ef5'
const ACC2 = '#5de8b4'
const BG = '#0a0a0c'
const SURF = '#111114'
const SURF2 = '#18181c'
const BOR = 'rgba(255,255,255,0.07)'
const TEXT = '#f0f0f2'
const MUTED = '#888890'

const LOGO = <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="16" height="16"><path d="M16 4 L4 26 L16 21 L28 26 Z" fill="white"/><path d="M16 4 L16 21" stroke="white" strokeWidth="1.5" opacity=".35"/><circle cx="16" cy="21" r="2.2" fill="#a5b4fc"/></svg>

const CHECK = <svg viewBox="0 0 16 16" fill="none" width="14" height="14" style={{flexShrink:0}}><circle cx="8" cy="8" r="7" stroke="#5de8b4" strokeWidth="1.2"/><path d="M5 8l2 2 4-4" stroke="#5de8b4" strokeWidth="1.4"/></svg>
const CROSS = <svg viewBox="0 0 16 16" fill="none" width="14" height="14" style={{flexShrink:0}}><circle cx="8" cy="8" r="7" stroke="#333" strokeWidth="1.2"/><path d="M6 6l4 4M10 6l-4 4" stroke="#444" strokeWidth="1.4"/></svg>

const FEATURES = [
  { bg:'rgba(124,110,245,0.12)', title:'Dashboard multi-plataforma', desc:'Meta, Google y TikTok en una sola vista. Compara métricas entre plataformas sin abrir una pestaña más.', tag:'Multi-canal', icon:<svg viewBox="0 0 24 24" fill="none" stroke="#9d8ff5" strokeWidth="1.8" width="17" height="17"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { bg:'rgba(93,232,180,0.09)', title:'Análisis de creativos', desc:'Hook rate, hold rate, CTR y conversión por anuncio. Sabes exactamente qué creativo está jalando y cuál está quemado.', tag:'Creativos', icon:<svg viewBox="0 0 24 24" fill="none" stroke="#5de8b4" strokeWidth="1.8" width="17" height="17"><path d="M15 10l-4 4-2-2"/><circle cx="12" cy="12" r="9"/></svg> },
  { bg:'rgba(239,159,39,0.09)', title:'Reportes para clientes', desc:'Genera PDFs con tu branding en un clic. Programa envíos automáticos semanales o mensuales directamente a tu cliente.', tag:'White-label', icon:<svg viewBox="0 0 24 24" fill="none" stroke="#ef9f27" strokeWidth="1.8" width="17" height="17"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  { bg:'rgba(55,138,221,0.1)', title:'Segmentación demográfica', desc:'Rendimiento por edad, género y ubicación en todas las plataformas. Sin exportar a Excel, sin armarlo tú a mano.', tag:'Audiencias', icon:<svg viewBox="0 0 24 24" fill="none" stroke="#85b7eb" strokeWidth="1.8" width="17" height="17"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
  { bg:'rgba(212,83,126,0.09)', title:'Alertas inteligentes', desc:'Te avisamos cuando el CPA sube, el presupuesto se agota o el ROAS cae. Actúa antes de que tu cliente te llame.', tag:'Automatización', icon:<svg viewBox="0 0 24 24" fill="none" stroke="#ed93b1" strokeWidth="1.8" width="17" height="17"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg> },
  { bg:'rgba(99,153,34,0.09)', title:'Multi-cuenta', desc:'Gestiona todos tus clientes desde un panel. Cambia entre cuentas al instante sin desconectarte ni volver a hacer login.', tag:'Agencias', icon:<svg viewBox="0 0 24 24" fill="none" stroke="#97c459" strokeWidth="1.8" width="17" height="17"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg> },
]

const TESTIMONIALS = [
  { name:'Carlos M.', role:'Media buyer · CDMX', text:'Antes tardaba 2 horas por cliente haciendo reportes en Excel. Ahora los genero en 5 minutos y se ven más profesionales.', avatar:'CM' },
  { name:'Sofía R.', role:'Directora de agencia · MTY', text:'El hook rate y hold rate por anuncio me cambió la vida. Ahora sé exactamente qué creativos escalar antes de quemar presupuesto.', avatar:'SR' },
  { name:'Diego L.', role:'Freelance trafficker · GDL', text:'Mis clientes me preguntan cómo hago reportes tan buenos. Kaan hace que parezca que tengo un equipo detrás.', avatar:'DL' },
]

const FAQS = [
  { q:'¿Necesito dar acceso completo a mis cuentas de ads?', a:'No. Kaan se conecta a través de los tokens oficiales de cada plataforma (OAuth). Solo tienes acceso de lectura — Kaan nunca puede pausar campañas, cambiar presupuestos ni hacer modificaciones en tu cuenta.' },
  { q:'¿Con qué frecuencia se actualizan los datos?', a:'Los datos se sincronizan cada hora para todas las plataformas activas. Para campañas con alta rotación, también puedes forzar una actualización manual desde el dashboard.' },
  { q:'¿Puedo manejar las cuentas de varios clientes?', a:'Sí. Con el plan Pro puedes conectar cuentas ilimitadas y cambiar entre ellas desde el sidebar. Cada cliente tiene su propio espacio y sus datos no se mezclan.' },
  { q:'¿Los reportes PDF tienen mi branding o el de Kaan?', a:'Con el plan Pro los reportes son completamente white-label. Puedes agregar el logo de tu agencia, los colores de tu cliente y tu propia firma. Kaan no aparece en ningún lado.' },
  { q:'¿Puedo cancelar en cualquier momento?', a:'Sí, sin compromisos ni penalizaciones. Si cancelas, conservas acceso Pro hasta el final del periodo pagado y luego pasas al plan free automáticamente.' },
  { q:'¿Qué pasa con mis datos si cancelo?', a:'Tus datos históricos se conservan 90 días después de cancelar. Puedes exportarlos en cualquier momento. No vendemos ni compartimos tus datos con terceros.' },
]

const CAMPAIGNS = [
  { color:'#7c6ef5', name:'META_LEADS_Q1_2026', val:'$6,200', tag:'352 conv', tagBg:'rgba(124,110,245,.12)', tagColor:'#9d8ff5' },
  { color:'#378add', name:'GADS_SEARCH_MARCA', val:'$4,810', tag:'241 conv', tagBg:'rgba(55,138,221,.1)', tagColor:'#85b7eb' },
  { color:'#d4537e', name:'TIKTOK_VIDEO_FEB', val:'$3,140', tag:'178 conv', tagBg:'rgba(212,83,126,.1)', tagColor:'#ed93b1' },
  { color:'#ef9f27', name:'META_RETARGETING_V2', val:'$2,890', tag:'72 conv', tagBg:'rgba(239,159,39,.1)', tagColor:'#fac775' },
]

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(null)
  const router = useRouter()

  return (
    <div className={dm.className} style={{fontSize:'15px',lineHeight:'1.6',color:TEXT,background:BG,minHeight:'100vh'}}>
      <style>{`
        @media (max-width: 768px) {
          .kaan-nav-links { display: none !important; }
          .kaan-nav-right { gap: 6px !important; }
          .kaan-nav-right button:first-child { display: none !important; }
          .kaan-hero h1 { font-size: 36px !important; }
          .kaan-hero p { font-size: 15px !important; }
          .kaan-grid-3 { grid-template-columns: 1fr !important; }
          .kaan-grid-4 { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
          .kaan-grid-2 { grid-template-columns: 1fr !important; }
          .kaan-grid-5 { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
          .kaan-grid-stats { grid-template-columns: 1fr !important; }
          .kaan-grid-stats > div { border-right: none !important; border-bottom: 0.5px solid rgba(255,255,255,0.07) !important; }
          .kaan-section { padding: 48px 20px !important; }
          .kaan-mockup { margin: 0 16px 48px !important; }
          .kaan-cta { margin: 0 16px 48px !important; padding: 40px 24px !important; }
          .kaan-cta h2 { font-size: 28px !important; }
          .kaan-hero-btns { flex-direction: column !important; align-items: center !important; }
          .kaan-hero-btns button { width: 100% !important; max-width: 320px !important; justify-content: center !important; }
          .kaan-platforms { padding: 0 20px 32px !important; }
          .kaan-pricing { max-width: 100% !important; }
          .kaan-section-title { font-size: 28px !important; }
          .kaan-footer { flex-direction: column !important; gap: 16px !important; text-align: center !important; }
        }
        @media (max-width: 480px) {
          .kaan-grid-4 { grid-template-columns: 1fr !important; }
          .kaan-grid-5 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* NAV */}
      <nav style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 40px',borderBottom:`0.5px solid ${BOR}`,background:'rgba(10,10,12,0.94)',backdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:100}}>
        <div onClick={()=>router.push('/')} style={{display:'flex',alignItems:'center',gap:9,fontWeight:700,fontSize:'17px',color:TEXT,cursor:'pointer'}}>
          <div style={{width:30,height:30,background:ACC,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{LOGO}</div>
          Kaan
        </div>
        <div className='kaan-nav-links' style={{display:'flex',gap:28,fontSize:'14px'}}>
          {['Funciones','Plataformas','Precios','FAQ'].map(l=>(
            <span key={l} style={{color:MUTED,cursor:'pointer'}}>{l}</span>
          ))}
        </div>
        <div className='kaan-nav-right' style={{display:'flex',gap:10,alignItems:'center'}}>
          <button onClick={()=>router.push('/registro')} style={{background:'none',border:`0.5px solid ${BOR}`,color:MUTED,padding:'8px 18px',borderRadius:8,fontSize:'13px',cursor:'pointer'}}>Iniciar sesión</button>
          <button onClick={()=>router.push('/registro')} style={{background:ACC,color:'white',border:'none',padding:'9px 20px',borderRadius:8,fontSize:'13px',fontWeight:500,cursor:'pointer'}}>Empezar gratis</button>
        </div>
      </nav>

      {/* HERO */}
      <div className='kaan-hero' style={{padding:'96px 40px 64px',textAlign:'center',maxWidth:860,margin:'0 auto'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:7,background:'rgba(124,110,245,0.09)',border:`0.5px solid rgba(124,110,245,0.25)`,color:ACC,fontSize:'12px',padding:'5px 14px',borderRadius:20,marginBottom:28,letterSpacing:'.04em',fontWeight:500}}>
          <span style={{width:5,height:5,borderRadius:'50%',background:ACC2,display:'inline-block',flexShrink:0}}/>
          Analytics para traffickers
        </div>
        <h1 style={{fontSize:'56px',fontWeight:700,lineHeight:1.05,letterSpacing:'-0.03em',marginBottom:22,color:TEXT}}>
          Tus campañas,{' '}
          <span style={{color:ACC}}>todas</span>{' '}
          en{' '}
          <span style={{color:ACC2}}>un solo lugar</span>
        </h1>
        <p style={{fontSize:'18px',color:MUTED,maxWidth:540,margin:'0 auto 12px',lineHeight:1.7}}>
          Conecta Meta, Google y TikTok. Ve qué está funcionando, qué no, y entrega reportes profesionales a tus clientes en minutos.
        </p>

        {/* Social proof inline */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12,marginBottom:36,marginTop:16}}>
          <div style={{display:'flex'}}>
            {['CM','SR','DL','AV','MR'].map((i,idx)=>(
              <div key={i} style={{width:28,height:28,borderRadius:'50%',background:`hsl(${idx*47+240},40%,45%)`,border:`2px solid ${BG}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:700,color:'white',marginLeft:idx?-8:0}}>{i}</div>
            ))}
          </div>
          <span style={{fontSize:'13px',color:MUTED}}><span style={{color:TEXT,fontWeight:500}}>+120 traffickers</span> ya usan Kaan</span>
        </div>

        <div className='kaan-hero-btns' style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
          <button onClick={()=>router.push('/registro')} style={{background:ACC,color:'white',border:'none',padding:'14px 28px',fontSize:'15px',fontWeight:600,borderRadius:10,display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
            {LOGO}
            Empezar gratis
          </button>
          <button onClick={()=>document.getElementById('demo').scrollIntoView({behavior:'smooth'})} style={{background:'none',border:`0.5px solid rgba(255,255,255,0.14)`,color:TEXT,padding:'14px 28px',fontSize:'15px',fontWeight:500,borderRadius:10,cursor:'pointer'}}>Ver demo</button>
        </div>
        <p style={{marginTop:14,fontSize:'12px',color:MUTED}}>Sin tarjeta de crédito · <span style={{color:'rgba(93,232,180,.75)'}}>Plan free disponible</span></p>
      </div>

      {/* PLATFORM STRIP */}
      <div className='kaan-platforms' style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'0 40px 40px',flexWrap:'wrap'}}>
        {[
          {name:'Meta Ads',icon:<svg viewBox="0 0 24 24" width="15" height="15" fill="#1877f2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>},
          {name:'Google Ads',icon:<svg viewBox="0 0 24 24" width="15" height="15"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>},
          {name:'TikTok Ads',icon:<svg viewBox="0 0 24 24" width="15" height="15"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.2 8.2 0 004.79 1.52V6.77a4.85 4.85 0 01-1.02-.08z" fill="#010101"/></svg>},
          {name:'LinkedIn Ads',icon:<svg viewBox="0 0 24 24" width="15" height="15" fill="#0a66c2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>},
        ].map(p=>(
          <div key={p.name} style={{display:'flex',alignItems:'center',gap:7,background:SURF,border:`0.5px solid ${BOR}`,padding:'7px 14px',borderRadius:20,fontSize:'13px',color:MUTED}}>{p.icon}{p.name}</div>
        ))}
        <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(124,110,245,0.05)',border:`0.5px solid rgba(124,110,245,0.2)`,padding:'7px 14px',borderRadius:20,fontSize:'13px',color:ACC}}>
          <svg viewBox="0 0 16 16" fill="none" width="13" height="13"><circle cx="3" cy="8" r="1.5" fill={ACC}/><circle cx="8" cy="8" r="1.5" fill={ACC}/><circle cx="13" cy="8" r="1.5" fill={ACC}/></svg>
          más plataformas
        </div>
      </div>

      {/* DASHBOARD MOCKUP */}
      <div id="demo" className="kaan-mockup" style={{margin:'0 40px 80px',background:SURF,border:`0.5px solid ${BOR}`,borderRadius:16,overflow:'hidden'}}>
        <div style={{padding:'11px 16px',borderBottom:`0.5px solid ${BOR}`,display:'flex',alignItems:'center',gap:8}}>
          <div style={{display:'flex',gap:5}}>
            {['#ff5f57','#febc2e','#28c840'].map(c=><div key={c} style={{width:10,height:10,borderRadius:'50%',background:c}}/>)}
          </div>
          <div style={{flex:1,background:'rgba(255,255,255,0.04)',borderRadius:5,padding:'4px 10px',fontSize:'11px',color:MUTED,maxWidth:220,margin:'0 auto',textAlign:'center'}}>kaan.app/dashboard</div>
        </div>
        <div style={{padding:20}}>
          <div style={{display:'flex',gap:3,marginBottom:14,overflowX:'auto'}}>
            {['Resumen general','Meta Ads','Google Ads','TikTok','Creativos','Audiencias'].map((t,i)=>(
              <div key={t} style={{padding:'6px 14px',borderRadius:6,fontSize:'12px',cursor:'pointer',whiteSpace:'nowrap',background:i===0?ACC:'none',color:i===0?'white':MUTED}}>{t}</div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:10,marginBottom:14}}>
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
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div style={{background:SURF2,borderRadius:9,padding:14}}>
              <div style={{fontSize:'9px',color:MUTED,marginBottom:9,textTransform:'uppercase',letterSpacing:'.06em'}}>Inversión por plataforma — 30 días</div>
              <div style={{display:'flex',alignItems:'flex-end',gap:3,height:52}}>
                {[78,61,44,25,52,68,41,57,85,70,90,76].map((h,i)=>(
                  <div key={i} style={{flex:1,height:`${h}%`,borderRadius:'2px 2px 0 0',background:['#7c6ef5','#378add','#d4537e','#0a66c2','#7c6ef5','#378add','#d4537e','#7c6ef5','#5de8b4','#5de8b4','#5de8b4','#7c6ef5'][i],opacity:[1,1,1,1,.5,.6,.5,1,1,.7,1,1][i]}}/>
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

      {/* STATS */}
      <div style={{padding:'0 40px 80px',maxWidth:1100,margin:'0 auto'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',border:`0.5px solid ${BOR}`,borderRadius:14,overflow:'hidden'}}>
          {[{n:'3.2x',l:'más rápido que reportes manuales'},{n:'40%',l:'menos tiempo en análisis semanales'},{n:'∞',l:'cuentas de clientes por workspace'}].map((s,i)=>(
            <div key={s.n} style={{padding:'32px 24px',borderRight:i<2?`0.5px solid ${BOR}`:'none',textAlign:'center'}}>
              <div style={{fontSize:'52px',fontWeight:700,color:ACC,lineHeight:1,marginBottom:8}}>{s.n}</div>
              <div style={{fontSize:'14px',color:MUTED}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <div style={{padding:'0 40px 80px',maxWidth:1100,margin:'0 auto',textAlign:'center'}} className='kaan-section'>
        <div style={{fontSize:'11px',textTransform:'uppercase',letterSpacing:'.12em',color:ACC,marginBottom:12,fontWeight:600}}>Funciones</div>
        <h2 className='kaan-section-title' style={{fontSize:'40px',fontWeight:700,lineHeight:1.15,letterSpacing:'-0.025em',marginBottom:14,color:TEXT}}>Todo lo que necesita<br/>un trafficker profesional</h2>
        <p style={{fontSize:'16px',color:MUTED,maxWidth:520,lineHeight:1.75,margin:'0 auto 48px'}}>Desde análisis de creativos hasta reportes automáticos — diseñado por media buyers, para media buyers.</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:16,textAlign:'left'}} className='kaan-grid-3'>
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

      {/* TESTIMONIALS */}
      <div style={{padding:'0 40px 80px',maxWidth:1100,margin:'0 auto',textAlign:'center'}}>
        <div style={{fontSize:'11px',textTransform:'uppercase',letterSpacing:'.12em',color:ACC,marginBottom:12,fontWeight:600}}>Testimonios</div>
        <h2 className='kaan-section-title' style={{fontSize:'40px',fontWeight:700,lineHeight:1.15,letterSpacing:'-0.025em',marginBottom:48,color:TEXT}}>Lo que dicen los traffickers</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:16,textAlign:'left'}} className='kaan-grid-3'>
          {TESTIMONIALS.map(t=>(
            <div key={t.name} style={{background:SURF,border:`0.5px solid ${BOR}`,borderRadius:14,padding:24,display:'flex',flexDirection:'column',gap:16}}>
              <div style={{display:'flex',gap:2}}>
                {[...Array(5)].map((_,i)=>(
                  <svg key={i} viewBox="0 0 12 12" width="14" height="14" fill="#f59e0b"><path d="M6 1l1.3 2.7 3 .4-2.2 2.1.5 3L6 7.7 3.4 9.2l.5-3L1.7 4.1l3-.4z"/></svg>
                ))}
              </div>
              <p style={{fontSize:'14px',color:TEXT,lineHeight:1.7,flex:1}}>"{t.text}"</p>
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

      {/* PLATFORMS */}
      <div style={{padding:'64px 40px',background:SURF,borderTop:`0.5px solid ${BOR}`,borderBottom:`0.5px solid ${BOR}`}}>
        <div style={{maxWidth:900,margin:'0 auto',textAlign:'center'}}>
          <div style={{fontSize:'11px',textTransform:'uppercase',letterSpacing:'.12em',color:ACC,marginBottom:12,fontWeight:600}}>Integraciones</div>
          <h2 style={{fontSize:'36px',fontWeight:700,letterSpacing:'-.025em',color:TEXT,marginBottom:36}}>Conecta donde ya estás invirtiendo</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:12}}>
            {[
              {name:'Meta Ads',status:'Disponible',icon:<svg viewBox="0 0 24 24" width="28" height="28" fill="#1877f2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>},
              {name:'Google Ads',status:'Disponible',icon:<svg viewBox="0 0 24 24" width="28" height="28"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>},
              {name:'TikTok Ads',status:'Disponible',icon:<svg viewBox="0 0 24 24" width="28" height="28"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.2 8.2 0 004.79 1.52V6.77a4.85 4.85 0 01-1.02-.08z" fill="#010101"/></svg>},
              {name:'LinkedIn Ads',status:'Próximamente',icon:<svg viewBox="0 0 24 24" width="28" height="28" fill="#0a66c2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>},
              {name:'Más plataformas',status:'En camino',dashed:true,icon:<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" width="28" height="28"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>},
            ].map(p=>(
              <div key={p.name} style={{background:SURF2,border:`0.5px ${p.dashed?'dashed':'solid'} ${BOR}`,borderRadius:12,padding:'18px 12px',textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                {p.icon}
                <div style={{fontSize:'12px',color:MUTED}}>{p.name}</div>
                <span style={{fontSize:'10px',padding:'2px 8px',borderRadius:10,background:p.status==='Disponible'?'rgba(93,232,180,0.08)':'rgba(255,255,255,0.05)',color:p.status==='Disponible'?ACC2:MUTED}}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PRICING */}
      <div style={{padding:'80px 40px',maxWidth:1100,margin:'0 auto',textAlign:'center'}}>
        <div style={{fontSize:'11px',textTransform:'uppercase',letterSpacing:'.12em',color:ACC,marginBottom:12,fontWeight:600}}>Precios</div>
        <h2 className='kaan-section-title' style={{fontSize:'40px',fontWeight:700,lineHeight:1.15,letterSpacing:'-0.025em',marginBottom:14,color:TEXT}}>Simple y sin sorpresas</h2>
        <p style={{fontSize:'16px',color:MUTED,maxWidth:440,lineHeight:1.75,margin:'0 auto 48px'}}>Empieza gratis y escala cuando lo necesites.</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,maxWidth:700,margin:'0 auto',textAlign:'left'}}>
          <div style={{background:SURF,border:`0.5px solid ${BOR}`,borderRadius:16,padding:28}}>
            <div style={{fontSize:'13px',color:MUTED,marginBottom:10}}>Free</div>
            <div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:4}}>
              <span style={{fontSize:'40px',fontWeight:700,letterSpacing:'-0.03em',color:TEXT,lineHeight:1}}><sup style={{fontSize:'18px',fontWeight:400}}>$</sup>0</span>
              <span style={{fontSize:'13px',color:MUTED}}>/ mes</span>
            </div>
            <hr style={{border:'none',borderTop:`0.5px solid ${BOR}`,margin:'20px 0'}}/>
            <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:10}}>
              {[{t:'1 cuenta conectada',y:true},{t:'Dashboard multi-métrica',y:true},{t:'Historial 30 días',y:true},{t:'Reportes PDF',y:false},{t:'Alertas',y:false},{t:'Multi-cuenta',y:false}].map(f=>(
                <li key={f.t} style={{display:'flex',alignItems:'center',gap:9,fontSize:'14px',color:f.y?TEXT:MUTED}}>{f.y?CHECK:CROSS}{f.t}</li>
              ))}
            </ul>
            <button onClick={()=>router.push('/registro')} style={{width:'100%',marginTop:22,padding:'12px',borderRadius:9,fontSize:'14px',fontWeight:500,background:'none',border:`0.5px solid ${BOR}`,color:TEXT,cursor:'pointer'}}>Empezar gratis</button>
          </div>
          <div style={{background:SURF,border:`2px solid ${ACC}`,borderRadius:16,padding:28,overflow:'hidden',position:'relative'}}>
            <div style={{position:'absolute',top:18,right:-30,background:ACC,color:'white',fontSize:'9px',padding:'4px 36px',transform:'rotate(35deg)',letterSpacing:'.06em',fontWeight:600}}>Más popular</div>
            <div style={{fontSize:'13px',color:MUTED,marginBottom:10}}>Pro</div>
            <div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:4}}>
              <span style={{fontSize:'40px',fontWeight:700,letterSpacing:'-0.03em',color:TEXT,lineHeight:1}}><sup style={{fontSize:'18px',fontWeight:400}}>$</sup>29</span>
              <span style={{fontSize:'13px',color:MUTED}}>/ mes</span>
            </div>
            <hr style={{border:'none',borderTop:`0.5px solid ${BOR}`,margin:'20px 0'}}/>
            <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:10}}>
              {['Cuentas ilimitadas','Todas las plataformas','Historial 12 meses','Reportes PDF white-label','Alertas inteligentes','Soporte prioritario'].map(f=>(
                <li key={f} style={{display:'flex',alignItems:'center',gap:9,fontSize:'14px',color:TEXT}}>{CHECK}{f}</li>
              ))}
            </ul>
            <button onClick={()=>router.push('/registro')} style={{width:'100%',marginTop:22,padding:'12px',borderRadius:9,fontSize:'14px',fontWeight:600,background:ACC,color:'white',border:'none',cursor:'pointer'}}>Empezar con Pro</button>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{padding:'0 40px 80px',maxWidth:720,margin:'0 auto'}}>
        <div style={{fontSize:'11px',textTransform:'uppercase',letterSpacing:'.12em',color:ACC,marginBottom:12,textAlign:'center',fontWeight:600}}>FAQ</div>
        <h2 style={{fontSize:'40px',fontWeight:700,lineHeight:1.15,letterSpacing:'-0.025em',textAlign:'center',marginBottom:44,color:TEXT}}>Preguntas frecuentes</h2>
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

      {/* CTA FINAL */}
      <div className='kaan-cta' style={{margin:'0 40px 80px',background:SURF,border:`0.5px solid rgba(124,110,245,0.3)`,borderRadius:20,padding:'64px 40px',textAlign:'center'}}>
        <div style={{fontSize:'11px',textTransform:'uppercase',letterSpacing:'.12em',color:ACC,marginBottom:16,fontWeight:600}}>Empieza hoy</div>
        <h2 style={{fontSize:'40px',fontWeight:700,lineHeight:1.15,letterSpacing:'-0.025em',marginBottom:14,color:TEXT}}>¿Listo para dejar de perder tiempo<br/>en reportes manuales?</h2>
        <p style={{fontSize:'16px',color:MUTED,maxWidth:460,margin:'0 auto 36px',lineHeight:1.7}}>Únete a los traffickers que ya toman mejores decisiones con datos en tiempo real.</p>
        <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
          <button onClick={()=>router.push('/registro')} style={{background:ACC,color:'white',border:'none',padding:'14px 32px',fontSize:'15px',fontWeight:600,borderRadius:10,display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
            {LOGO} Empezar gratis
          </button>
        </div>
        <p style={{marginTop:14,fontSize:'12px',color:MUTED}}>Sin tarjeta de crédito · Cancela cuando quieras</p>
      </div>

      {/* FOOTER */}
      <div className='kaan-footer' style={{padding:'28px 40px',borderTop:`0.5px solid ${BOR}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:26,height:26,background:ACC,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}>{LOGO}</div>
          <span style={{fontSize:'13px',color:MUTED}}>© 2026 Kaan · Todos los derechos reservados</span>
        </div>
        <div style={{display:'flex',gap:20,fontSize:'13px'}}>
          {['Privacidad','Términos','Contacto'].map(l=>(
            <span key={l} style={{color:MUTED,cursor:'pointer'}}>{l}</span>
          ))}
        </div>
      </div>

    </div>
  )
}
