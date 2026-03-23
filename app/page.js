import Head from 'next/head'

export const metadata = {
  title: 'Kaan — Analytics para traffickers',
  description: 'Toma decisiones con datos reales, no con intuición. Reportes completos de Meta Ads con diagnóstico automático, score de creativos y datos demográficos.',
  keywords: 'meta ads analytics, reportes facebook ads, dashboard campañas, traffickers latam, hook rate, hold rate, score creativos',
  openGraph: {
    title: 'Kaan — Analytics para traffickers',
    description: 'Toma decisiones con datos reales, no con intuición.',
    type: 'website',
    url: 'https://kaan.app',
  },
}

export default function LandingPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=DM+Serif+Display:ital@0;1&display=swap');

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

        :root {
          --bg: #080809;
          --surface: #0f0f12;
          --surface2: #16161a;
          --border: rgba(255,255,255,.07);
          --border2: rgba(255,255,255,.12);
          --text: #ffffff;
          --text2: #888;
          --text3: #444;
          --accent: #6366f1;
          --accent2: #8b5cf6;
          --accent-light: #a5b4fc;
          --green: #6ee7b7;
          --red: #f87171;
          --orange: #fb923c;
        }

        html { scroll-behavior: smooth; }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 15px;
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }

        .serif { font-family: 'DM Serif Display', serif; }

        /* NAV */
        nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          padding: 0 40px;
          height: 64px;
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(8,8,9,.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
        }
        .nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .nav-logo-text { font-size: 17px; font-weight: 800; color: var(--text); letter-spacing: -.3px; }
        .nav-links { display: flex; align-items: center; gap: 32px; }
        .nav-links a { font-size: 13px; color: var(--text2); text-decoration: none; transition: color .15s; }
        .nav-links a:hover { color: var(--text); }
        .nav-cta { display: flex; align-items: center; gap: 10px; }
        .btn-ghost { font-size: 13px; color: var(--text2); text-decoration: none; padding: 8px 16px; border-radius: 8px; transition: all .15s; border: 1px solid transparent; font-family: inherit; background: transparent; cursor: pointer; }
        .btn-ghost:hover { color: var(--text); border-color: var(--border2); }
        .btn-primary { font-size: 13px; font-weight: 700; color: #fff; background: var(--accent); padding: 9px 20px; border-radius: 8px; text-decoration: none; transition: opacity .15s; border: none; font-family: inherit; cursor: pointer; }
        .btn-primary:hover { opacity: .85; }

        /* HERO */
        .hero {
          min-height: 100vh;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center;
          padding: 120px 24px 80px;
          position: relative;
          overflow: hidden;
        }
        .hero::before {
          content: '';
          position: absolute; top: -200px; left: 50%; transform: translateX(-50%);
          width: 800px; height: 800px;
          background: radial-gradient(circle, rgba(99,102,241,.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 7px;
          background: rgba(99,102,241,.1); border: 1px solid rgba(99,102,241,.25);
          color: var(--accent-light); font-size: 12px; font-weight: 600;
          padding: 5px 14px; border-radius: 20px; margin-bottom: 32px;
          letter-spacing: .01em;
        }
        .hero-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent-light); }
        .hero h1 {
          font-size: clamp(40px, 7vw, 76px);
          font-weight: 800;
          line-height: 1.08;
          letter-spacing: -2px;
          max-width: 820px;
          margin-bottom: 24px;
        }
        .hero h1 em {
          font-style: italic;
          font-family: 'DM Serif Display', serif;
          font-weight: 400;
          color: var(--accent-light);
        }
        .hero-sub {
          font-size: clamp(15px, 2vw, 18px);
          color: var(--text2);
          max-width: 520px;
          margin: 0 auto 40px;
          line-height: 1.7;
        }
        .hero-actions { display: flex; align-items: center; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .btn-hero {
          font-size: 14px; font-weight: 700; color: #fff;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          padding: 13px 28px; border-radius: 10px; text-decoration: none;
          transition: opacity .15s; border: none; font-family: inherit; cursor: pointer;
          display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-hero:hover { opacity: .85; }
        .btn-hero-ghost {
          font-size: 14px; font-weight: 600; color: var(--text2);
          background: transparent; border: 1px solid var(--border2);
          padding: 12px 24px; border-radius: 10px; text-decoration: none;
          transition: all .15s; font-family: inherit; cursor: pointer;
        }
        .btn-hero-ghost:hover { color: var(--text); border-color: rgba(255,255,255,.25); }
        .hero-note { margin-top: 16px; font-size: 12px; color: var(--text3); }

        /* DASHBOARD PREVIEW */
        .preview-wrap {
          max-width: 1100px; margin: 0 auto;
          padding: 0 24px 100px;
          position: relative;
        }
        .preview-frame {
          background: var(--surface);
          border: 1px solid var(--border2);
          border-radius: 16px;
          overflow: hidden;
          position: relative;
        }
        .preview-frame::after {
          content: '';
          position: absolute; bottom: 0; left: 0; right: 0; height: 120px;
          background: linear-gradient(to top, var(--bg), transparent);
          pointer-events: none;
        }
        .preview-bar {
          background: var(--surface2);
          border-bottom: 1px solid var(--border);
          padding: 12px 16px;
          display: flex; align-items: center; gap: 8px;
        }
        .dot { width: 10px; height: 10px; border-radius: 50%; }
        .preview-content { padding: 24px; display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
        .metric-card {
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 10px; padding: 16px;
        }
        .metric-label { font-size: 9px; color: var(--text3); font-family: monospace; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
        .metric-val { font-size: 22px; font-weight: 800; }
        .metric-sub { font-size: 10px; color: var(--text3); margin-top: 4px; }

        /* LOGOS */
        .logos-section { padding: 40px 24px; text-align: center; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .logos-label { font-size: 12px; color: var(--text3); font-family: monospace; text-transform: uppercase; letter-spacing: .1em; margin-bottom: 24px; }
        .logos-row { display: flex; align-items: center; justify-content: center; gap: 48px; flex-wrap: wrap; }
        .logo-item { font-size: 13px; color: var(--text3); font-weight: 600; letter-spacing: .02em; }

        /* FEATURES */
        .section { padding: 100px 24px; max-width: 1100px; margin: 0 auto; }
        .section-label { font-size: 11px; color: var(--accent-light); font-weight: 700; text-transform: uppercase; letter-spacing: .1em; margin-bottom: 16px; }
        .section-title { font-size: clamp(28px, 4vw, 44px); font-weight: 800; letter-spacing: -1px; line-height: 1.1; margin-bottom: 16px; }
        .section-title em { font-style: italic; font-family: 'DM Serif Display', serif; font-weight: 400; color: var(--accent-light); }
        .section-sub { font-size: 16px; color: var(--text2); max-width: 480px; line-height: 1.7; margin-bottom: 60px; }

        .features-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
        .feature-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 14px; padding: 28px;
          transition: border-color .2s;
        }
        .feature-card:hover { border-color: var(--border2); }
        .feature-icon {
          width: 40px; height: 40px; border-radius: 10px;
          background: rgba(99,102,241,.1); border: 1px solid rgba(99,102,241,.2);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 18px;
        }
        .feature-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
        .feature-desc { font-size: 13px; color: var(--text2); line-height: 1.7; }
        .feature-tag { display: inline-block; font-size: 10px; font-family: monospace; color: var(--accent-light); background: rgba(99,102,241,.1); padding: 2px 8px; border-radius: 4px; margin-top: 12px; }

        /* METRICS HIGHLIGHT */
        .metrics-section { padding: 100px 24px; background: var(--surface); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .metrics-inner { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: center; }
        .metrics-list { display: flex; flex-direction: column; gap: 20px; }
        .metric-row {
          display: flex; align-items: flex-start; gap: 16px;
          padding: 20px; background: var(--surface2); border: 1px solid var(--border);
          border-radius: 12px;
          transition: border-color .15s;
        }
        .metric-row:hover { border-color: var(--border2); }
        .metric-row-icon { width: 36px; height: 36px; border-radius: 8px; background: rgba(99,102,241,.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .metric-row-title { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
        .metric-row-desc { font-size: 12px; color: var(--text2); line-height: 1.6; }
        .metric-row-val { font-size: 11px; font-family: monospace; color: var(--green); margin-top: 4px; }

        /* SOCIAL PROOF */
        .testimonials { padding: 100px 24px; max-width: 1100px; margin: 0 auto; }
        .testimonials-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
        .testimonial {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 14px; padding: 24px;
        }
        .testimonial-text { font-size: 14px; color: var(--text2); line-height: 1.7; margin-bottom: 20px; font-style: italic; }
        .testimonial-author { display: flex; align-items: center; gap: 10px; }
        .testimonial-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #fff; flex-shrink: 0; }
        .testimonial-name { font-size: 13px; font-weight: 700; }
        .testimonial-role { font-size: 11px; color: var(--text3); }

        /* PRICING */
        .pricing { padding: 100px 24px; max-width: 800px; margin: 0 auto; text-align: center; }
        .pricing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 48px; text-align: left; }
        .plan {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 16px; padding: 32px;
          position: relative;
        }
        .plan.featured { border-color: rgba(99,102,241,.4); background: rgba(99,102,241,.05); }
        .plan-badge {
          position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
          background: var(--accent); color: #fff; font-size: 11px; font-weight: 700;
          padding: 3px 14px; border-radius: 20px; white-space: nowrap;
        }
        .plan-name { font-size: 13px; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 12px; }
        .plan-price { font-size: 40px; font-weight: 800; letter-spacing: -1px; margin-bottom: 4px; }
        .plan-period { font-size: 13px; color: var(--text3); margin-bottom: 24px; }
        .plan-features { display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }
        .plan-feature { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: var(--text2); }
        .check { width: 16px; height: 16px; border-radius: 50%; background: rgba(110,231,183,.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }

        /* FAQ */
        .faq { padding: 100px 24px; max-width: 700px; margin: 0 auto; }
        .faq-item { border-bottom: 1px solid var(--border); padding: 24px 0; }
        .faq-q { font-size: 15px; font-weight: 700; margin-bottom: 10px; cursor: pointer; }
        .faq-a { font-size: 14px; color: var(--text2); line-height: 1.7; }

        /* CTA */
        .cta-section {
          padding: 120px 24px; text-align: center;
          background: var(--surface); border-top: 1px solid var(--border);
        }
        .cta-inner { max-width: 600px; margin: 0 auto; }

        /* FOOTER */
        footer {
          padding: 48px 40px; border-top: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;
        }
        .footer-links { display: flex; gap: 24px; }
        .footer-links a { font-size: 12px; color: var(--text3); text-decoration: none; transition: color .15s; }
        .footer-links a:hover { color: var(--text2); }

        /* STATS BAR */
        .stats-bar { display: grid; grid-template-columns: repeat(4,1fr); gap: 1px; background: var(--border); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .stat-item { background: var(--bg); padding: 32px 24px; text-align: center; }
        .stat-val { font-size: 36px; font-weight: 800; letter-spacing: -1px; color: var(--text); }
        .stat-label { font-size: 12px; color: var(--text3); margin-top: 4px; }

        @media (max-width: 768px) {
          nav { padding: 0 20px; }
          .nav-links { display: none; }
          .features-grid { grid-template-columns: 1fr; }
          .metrics-inner { grid-template-columns: 1fr; gap: 40px; }
          .testimonials-grid { grid-template-columns: 1fr; }
          .pricing-grid { grid-template-columns: 1fr; }
          .stats-bar { grid-template-columns: repeat(2,1fr); }
          footer { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      {/* NAV */}
      <nav>
        <a href="/" className="nav-logo">
          <div style={{width:'32px',height:'32px',borderRadius:'8px',background:'#6366f1',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="18" height="18" viewBox="0 0 26 26" fill="none">
              <path d="M13 3 L3 21 L13 17 L23 21 Z" fill="white"/>
              <path d="M13 3 L13 17" stroke="white" strokeWidth="1.2" opacity=".35"/>
              <circle cx="13" cy="17" r="1.8" fill="#a5b4fc"/>
            </svg>
          </div>
          <span className="nav-logo-text">Kaan</span>
        </a>
        <div className="nav-links">
          <a href="#features">Funciones</a>
          <a href="#metricas">Metricas</a>
          <a href="#precios">Precios</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="nav-cta">
          <a href="/registro" className="btn-ghost">Iniciar sesion</a>
          <a href="/registro" className="btn-primary">Empezar gratis</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-badge">
          <div className="hero-badge-dot"></div>
          Ahora disponible — Analytics para traffickers
        </div>
        <h1>
          Toma decisiones con <em>datos reales</em>,<br/>no con intuicion
        </h1>
        <p className="hero-sub">
          Kaan conecta tus cuentas de Meta Ads y te da reportes completos con diagnostico automatico, score de creativos y datos demograficos. Todo en un solo lugar.
        </p>
        <div className="hero-actions">
          <a href="/registro" className="btn-hero">
            <svg width="14" height="14" viewBox="0 0 26 26" fill="none"><path d="M13 3 L3 21 L13 17 L23 21 Z" fill="white"/></svg>
            Empezar gratis
          </a>
          <a href="#features" className="btn-hero-ghost">Ver como funciona</a>
        </div>
        <p className="hero-note">Sin tarjeta de credito · Plan free disponible</p>
      </section>

      {/* DASHBOARD PREVIEW */}
      <div className="preview-wrap">
        <div className="preview-frame">
          <div className="preview-bar">
            <div className="dot" style={{background:'#f87171'}}></div>
            <div className="dot" style={{background:'#fcd34d'}}></div>
            <div className="dot" style={{background:'#6ee7b7'}}></div>
            <span style={{marginLeft:'8px',fontSize:'11px',color:'#333',fontFamily:'monospace'}}>kaan.app/dashboard</span>
          </div>
          <div className="preview-content">
            {[
              {l:'Importe gastado',v:'$2,647',c:'#fff',s:'total ejecutado'},
              {l:'Resultados',v:'116',c:'#6ee7b7',s:'conversiones'},
              {l:'Costo/resultado',v:'$22.82',c:'#fff',s:'eficiencia'},
              {l:'CTR',v:'4.56%',c:'#6ee7b7',s:'excelente'},
              {l:'Hook Rate',v:'31.2%',c:'#a5b4fc',s:'solido'},
              {l:'Hold Rate',v:'44.8%',c:'#6ee7b7',s:'bueno'},
              {l:'CPM',v:'$98.75',c:'#fff',s:'por mil imp'},
              {l:'Frecuencia',v:'1.84',c:'#6ee7b7',s:'optima'},
            ].map((m,i)=>(
              <div key={i} className="metric-card">
                <div className="metric-label">{m.l}</div>
                <div className="metric-val" style={{color:m.c}}>{m.v}</div>
                <div className="metric-sub">{m.s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="stats-bar">
        {[
          {v:'5+',l:'Plataformas proximas'},
          {v:'15+',l:'Metricas por reporte'},
          {v:'100%',l:'Datos en tiempo real'},
          {v:'LATAM',l:'Hecho para la region'},
        ].map((s,i)=>(
          <div key={i} className="stat-item">
            <div className="stat-val">{s.v}</div>
            <div className="stat-label">{s.l}</div>
          </div>
        ))}
      </div>

      {/* FEATURES */}
      <section id="features" className="section">
        <div className="section-label">Funciones</div>
        <h2 className="section-title">Todo lo que un trafficker<br/><em>realmente necesita</em></h2>
        <p className="section-sub">No mas exportar CSVs ni armar reportes en Excel. Kaan lo hace automaticamente.</p>
        <div className="features-grid">
          {[
            {
              title:'Score de creativos',
              desc:'Cada anuncio recibe un score de 0 a 100 basado en Hook Rate, Hold Rate, CTR y CPM. Sabe de un vistazo cuales escalar y cuales pausar.',
              tag:'hook_rate · hold_rate',
              icon:(
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
              ),
            },
            {
              title:'Diagnostico automatico',
              desc:'Kaan analiza tus campanas y genera recomendaciones accionables: fatiga publicitaria, CTR bajo, CPM alto, presupuesto mal distribuido.',
              tag:'diagnostico · alertas',
              icon:(
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              ),
            },
            {
              title:'Audiencia demografica',
              desc:'Ve exactamente quien ve tus anuncios: edad, genero, dispositivo, plataforma. Con mapa interactivo por estado y pais.',
              tag:'mapa · demografia',
              icon:(
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
                </svg>
              ),
            },
            {
              title:'Comparacion de periodos',
              desc:'Compara cualquier periodo contra el anterior con deltas porcentuales. Detecta tendencias y cambios de rendimiento al instante.',
              tag:'periodo · delta %',
              icon:(
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              ),
            },
            {
              title:'Exportacion PDF',
              desc:'Genera reportes profesionales en PDF con un clic. Listos para entregar a tus clientes con tu branding.',
              tag:'pdf · reportes',
              icon:(
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
              ),
            },
            {
              title:'Multi-cuenta',
              desc:'Gestiona todas tus cuentas de clientes desde un solo lugar. Cambia entre cuentas en un clic sin cerrar sesion.',
              tag:'agencias · multi-cuenta',
              icon:(
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
              ),
            },
          ].map((f,i)=>(
            <div key={i} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
              <div className="feature-tag">{f.tag}</div>
            </div>
          ))}
        </div>
      </section>

      {/* METRICS HIGHLIGHT */}
      <section id="metricas" className="metrics-section">
        <div className="metrics-inner">
          <div>
            <div className="section-label">Metricas que importan</div>
            <h2 className="section-title" style={{marginBottom:'16px'}}>Las metricas que los<br/><em>traffickers usan</em></h2>
            <p style={{fontSize:'15px',color:'var(--text2)',lineHeight:'1.7'}}>
              Kaan va mas alla de impresiones y clics. Te da las metricas reales que determinan si un creativo escala o se pausa.
            </p>
          </div>
          <div className="metrics-list">
            {[
              {title:'Hook Rate',desc:'Porcentaje de personas que vieron al menos 3 segundos de tu video. Por debajo de 25% es una senal de alarma.',val:'Benchmark: 25%+ bueno · 35%+ excelente'},
              {title:'Hold Rate',desc:'De los que vieron 3 segundos, cuantos vieron el video completo. Mide la calidad del contenido.',val:'Benchmark: 40%+ bueno'},
              {title:'Score creativo',desc:'Puntuacion de 0 a 100 por anuncio combinando todas las metricas clave en un solo numero.',val:'0-49 pausar · 50-74 optimizar · 75+ escalar'},
              {title:'Frecuencia',desc:'Cuantas veces ve tu anuncio la misma persona. Alta frecuencia = fatiga publicitaria.',val:'Alerta automatica si supera 3.5'},
            ].map((m,i)=>(
              <div key={i} className="metric-row">
                <div className="metric-row-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                </div>
                <div>
                  <div className="metric-row-title">{m.title}</div>
                  <div className="metric-row-desc">{m.desc}</div>
                  <div className="metric-row-val">{m.val}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials">
        <div style={{textAlign:'center',marginBottom:'48px'}}>
          <div className="section-label">Testimonios</div>
          <h2 className="section-title">Lo que dicen los<br/><em>traffickers que lo usan</em></h2>
        </div>
        <div className="testimonials-grid">
          {[
            {text:'"Antes tardaba 2 horas en armar un reporte para cada cliente. Con Kaan lo tengo en 5 minutos y se ve mucho mas profesional."',name:'Carlos M.',role:'Media Buyer · CDMX',init:'CM'},
            {text:'"El score de creativos me cambio la vida. Ya no tengo que adivinar cual anuncio escalar, el numero me lo dice directo."',name:'Andrea R.',role:'Performance Manager · Bogota',init:'AR'},
            {text:'"Por fin una herramienta hecha para LATAM. Entiende MXN, tiene los benchmarks correctos y el soporte responde rapido."',name:'Luis T.',role:'Trafficker Freelance · MTY',init:'LT'},
          ].map((t,i)=>(
            <div key={i} className="testimonial">
              <p className="testimonial-text">{t.text}</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">{t.init}</div>
                <div>
                  <div className="testimonial-name">{t.name}</div>
                  <div className="testimonial-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="precios" className="pricing">
        <div className="section-label" style={{textAlign:'center'}}>Precios</div>
        <h2 className="section-title">Simple y sin sorpresas</h2>
        <p style={{color:'var(--text2)',marginTop:'12px'}}>Empieza gratis, actualiza cuando estes listo.</p>
        <div className="pricing-grid">
          <div className="plan">
            <div className="plan-name">Free</div>
            <div className="plan-price">$0</div>
            <div className="plan-period">para siempre</div>
            <div className="plan-features">
              {['1 cuenta de Meta Ads','Overview de metricas principales','Ultimos 30 dias de datos','Acceso a la plataforma'].map((f,i)=>(
                <div key={i} className="plan-feature">
                  <div className="check">
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#6ee7b7" strokeWidth="2" strokeLinecap="round"><polyline points="2 6 5 9 10 3"/></svg>
                  </div>
                  {f}
                </div>
              ))}
            </div>
            <a href="/registro" className="btn-hero-ghost" style={{display:'block',textAlign:'center',padding:'12px',borderRadius:'10px',textDecoration:'none'}}>Empezar gratis</a>
          </div>
          <div className="plan featured">
            <div className="plan-badge">MAS POPULAR</div>
            <div className="plan-name" style={{color:'#a5b4fc'}}>Pro</div>
            <div className="plan-price">$297</div>
            <div className="plan-period">MXN / mes · cancela cuando quieras</div>
            <div className="plan-features">
              {[
                'Cuentas ilimitadas de Meta Ads',
                'Score de creativos + diagnostico',
                'Datos demograficos y mapa',
                'Comparacion de periodos',
                'Exportacion PDF profesional',
                'Facebook e Instagram organico',
                'Datos historicos hasta 12 meses',
                'Soporte prioritario',
              ].map((f,i)=>(
                <div key={i} className="plan-feature">
                  <div className="check">
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#6ee7b7" strokeWidth="2" strokeLinecap="round"><polyline points="2 6 5 9 10 3"/></svg>
                  </div>
                  {f}
                </div>
              ))}
            </div>
            <a href="/registro?plan=pro" className="btn-hero" style={{display:'block',textAlign:'center',padding:'13px',borderRadius:'10px',textDecoration:'none'}}>Comenzar Pro</a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="faq">
        <div style={{textAlign:'center',marginBottom:'48px'}}>
          <div className="section-label">FAQ</div>
          <h2 className="section-title">Preguntas frecuentes</h2>
        </div>
        {[
          {q:'¿Necesito dar acceso a mi cuenta de Meta Ads?',a:'Si, Kaan se conecta via OAuth oficial de Meta. En ningun momento manejamos tus credenciales — el acceso se autentica directamente con Meta y tu puedes revocarlo en cualquier momento.'},
          {q:'¿Los datos son en tiempo real?',a:'Si. Cada vez que abres un reporte, Kaan consulta directamente la API de Meta y te muestra los datos mas recientes disponibles.'},
          {q:'¿Funciona para agencias con multiples clientes?',a:'Absolutamente. El plan Pro permite cuentas ilimitadas. Puedes conectar todas las cuentas de tus clientes y cambiar entre ellas con un clic.'},
          {q:'¿Que pasa si cancelo mi suscripcion?',a:'Puedes cancelar en cualquier momento desde Ajustes. Tu cuenta pasa automaticamente al plan Free y conservas acceso a tus datos historicos.'},
          {q:'¿Esta disponible para Google Ads o TikTok?',a:'Por ahora solo Meta Ads (Facebook e Instagram). Google Ads, TikTok, YouTube y X Ads estan en el roadmap para proximas versiones.'},
          {q:'¿En que moneda se cobra?',a:'En MXN para usuarios de Mexico. Si necesitas factura o pago en USD, contactanos por soporte.'},
        ].map((f,i)=>(
          <div key={i} className="faq-item">
            <div className="faq-q">{f.q}</div>
            <div className="faq-a">{f.a}</div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-inner">
          <div className="section-label" style={{textAlign:'center'}}>Empieza hoy</div>
          <h2 className="section-title" style={{fontSize:'clamp(28px,5vw,52px)',marginBottom:'20px'}}>
            Deja de adivinar.<br/><em>Empieza a escalar.</em>
          </h2>
          <p style={{color:'var(--text2)',fontSize:'16px',marginBottom:'36px',lineHeight:'1.7'}}>
            Conecta tu cuenta de Meta Ads en menos de 2 minutos y ve exactamente que esta funcionando y que no.
          </p>
          <a href="/registro" className="btn-hero" style={{fontSize:'15px',padding:'14px 32px'}}>
            <svg width="14" height="14" viewBox="0 0 26 26" fill="none"><path d="M13 3 L3 21 L13 17 L23 21 Z" fill="white"/></svg>
            Crear cuenta gratis
          </a>
          <p style={{marginTop:'14px',fontSize:'12px',color:'var(--text3)'}}>Sin tarjeta de credito · Plan free para siempre</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <a href="/" className="nav-logo" style={{textDecoration:'none'}}>
          <div style={{width:'28px',height:'28px',borderRadius:'7px',background:'#6366f1',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="16" height="16" viewBox="0 0 26 26" fill="none">
              <path d="M13 3 L3 21 L13 17 L23 21 Z" fill="white"/>
            </svg>
          </div>
          <span style={{fontSize:'14px',fontWeight:'700',color:'#fff',letterSpacing:'-.2px'}}>Kaan</span>
        </a>
        <div className="footer-links">
          <a href="#features">Funciones</a>
          <a href="#precios">Precios</a>
          <a href="/privacidad">Privacidad</a>
          <a href="/terminos">Terminos</a>
          <a href="/registro">Registro</a>
        </div>
        <div style={{fontSize:'12px',color:'var(--text3)'}}>© 2026 Kaan · Analytics para traffickers</div>
      </footer>
    </>
  )
}
