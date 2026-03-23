import { Metadata } from 'next'

export const metadata = {
  title: 'Términos de Uso — Kaan',
}

export default function TerminosPage() {
  return (
    <div style={{maxWidth:'800px',margin:'0 auto',padding:'60px 24px',fontFamily:'"Plus Jakarta Sans",system-ui,sans-serif',color:'#ccc',lineHeight:'1.8'}}>
      <div style={{marginBottom:'40px'}}>
        <a href="/" style={{color:'#6366f1',textDecoration:'none',fontSize:'13px'}}>← Kaan</a>
      </div>
      <h1 style={{color:'#fff',fontSize:'28px',fontWeight:'800',marginBottom:'8px'}}>Términos de Uso</h1>
      <p style={{color:'#555',fontSize:'13px',marginBottom:'40px'}}>Última actualización: 23 de marzo de 2026</p>

      <section style={{marginBottom:'32px'}}>
        <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'700',marginBottom:'12px'}}>1. Aceptación de términos</h2>
        <p style={{fontSize:'14px'}}>Al usar Kaan, aceptas estos términos de uso. Si no estás de acuerdo, no uses el servicio.</p>
      </section>

      <section style={{marginBottom:'32px'}}>
        <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'700',marginBottom:'12px'}}>2. Descripción del servicio</h2>
        <p style={{fontSize:'14px'}}>Kaan es una plataforma de análisis y reporte de campañas de Meta Ads (Facebook e Instagram). Permite a usuarios conectar sus cuentas publicitarias y visualizar métricas de rendimiento.</p>
      </section>

      <section style={{marginBottom:'32px'}}>
        <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'700',marginBottom:'12px'}}>3. Uso aceptable</h2>
        <p style={{fontSize:'14px',marginBottom:'12px'}}>Te comprometes a:</p>
        <ul style={{paddingLeft:'20px',fontSize:'14px'}}>
          <li style={{marginBottom:'8px'}}>Usar el servicio solo para fines legales</li>
          <li style={{marginBottom:'8px'}}>No intentar acceder a cuentas de otros usuarios</li>
          <li style={{marginBottom:'8px'}}>No usar el servicio para actividades fraudulentas</li>
          <li style={{marginBottom:'8px'}}>Cumplir con las políticas de uso de Meta Platforms</li>
        </ul>
      </section>

      <section style={{marginBottom:'32px'}}>
        <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'700',marginBottom:'12px'}}>4. Suscripción y pagos</h2>
        <p style={{fontSize:'14px',marginBottom:'12px'}}>El plan Pro se cobra mensualmente. Puedes cancelar en cualquier momento desde la sección de ajustes. No se realizan reembolsos por períodos parciales.</p>
      </section>

      <section style={{marginBottom:'32px'}}>
        <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'700',marginBottom:'12px'}}>5. Limitación de responsabilidad</h2>
        <p style={{fontSize:'14px'}}>Kaan no se hace responsable por decisiones de negocio tomadas basadas en los datos mostrados. Los datos provienen directamente de la API de Meta y pueden tener discrepancias con el Administrador de Anuncios oficial.</p>
      </section>

      <section style={{marginBottom:'32px'}}>
        <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'700',marginBottom:'12px'}}>6. Modificaciones</h2>
        <p style={{fontSize:'14px'}}>Nos reservamos el derecho de modificar estos términos. Notificaremos cambios importantes por correo electrónico.</p>
      </section>

      <section style={{marginBottom:'32px'}}>
        <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'700',marginBottom:'12px'}}>7. Contacto</h2>
        <p style={{fontSize:'14px'}}>Para dudas sobre estos términos: <a href="mailto:legal@kaan.app" style={{color:'#6366f1'}}>legal@kaan.app</a></p>
      </section>
    </div>
  )
}
