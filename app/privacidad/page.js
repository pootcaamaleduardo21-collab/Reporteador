import { Metadata } from 'next'

export const metadata = {
  title: 'Política de Privacidad — Reporteador',
}

export default function PrivacidadPage() {
  return (
    <div style={{maxWidth:'800px',margin:'0 auto',padding:'60px 24px',fontFamily:'"Plus Jakarta Sans",system-ui,sans-serif',color:'#ccc',lineHeight:'1.8'}}>
      <div style={{marginBottom:'40px'}}>
        <a href="/" style={{color:'#6366f1',textDecoration:'none',fontSize:'13px'}}>← Reporteador</a>
      </div>
      <h1 style={{color:'#fff',fontSize:'28px',fontWeight:'800',marginBottom:'8px'}}>Política de Privacidad</h1>
      <p style={{color:'#555',fontSize:'13px',marginBottom:'40px'}}>Última actualización: 23 de marzo de 2026</p>

      <section style={{marginBottom:'32px'}}>
        <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'700',marginBottom:'12px'}}>1. Información que recopilamos</h2>
        <p style={{fontSize:'14px',marginBottom:'12px'}}>Reporteador recopila la siguiente información cuando conectas tu cuenta de Meta Ads:</p>
        <ul style={{paddingLeft:'20px',fontSize:'14px'}}>
          <li style={{marginBottom:'8px'}}>Tokens de acceso de Meta Ads (cifrados y almacenados de forma segura)</li>
          <li style={{marginBottom:'8px'}}>IDs de cuentas publicitarias</li>
          <li style={{marginBottom:'8px'}}>Datos de rendimiento de campañas (gasto, impresiones, clics, conversiones)</li>
          <li style={{marginBottom:'8px'}}>Datos demográficos agregados de audiencias</li>
          <li style={{marginBottom:'8px'}}>Dirección de correo electrónico del usuario</li>
        </ul>
      </section>

      <section style={{marginBottom:'32px'}}>
        <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'700',marginBottom:'12px'}}>2. Cómo usamos tu información</h2>
        <p style={{fontSize:'14px',marginBottom:'12px'}}>Usamos tu información exclusivamente para:</p>
        <ul style={{paddingLeft:'20px',fontSize:'14px'}}>
          <li style={{marginBottom:'8px'}}>Mostrar reportes y métricas de tus campañas de Meta Ads</li>
          <li style={{marginBottom:'8px'}}>Generar diagnósticos y recomendaciones de optimización</li>
          <li style={{marginBottom:'8px'}}>Procesar pagos de suscripción</li>
          <li style={{marginBottom:'8px'}}>Enviarte notificaciones relacionadas con tu cuenta</li>
        </ul>
        <p style={{fontSize:'14px',marginTop:'12px'}}>No vendemos, compartimos ni utilizamos tus datos para publicidad de terceros.</p>
      </section>

      <section style={{marginBottom:'32px'}}>
        <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'700',marginBottom:'12px'}}>3. Datos de Meta / Facebook</h2>
        <p style={{fontSize:'14px',marginBottom:'12px'}}>Accedemos a tu información de Meta Ads a través de la API oficial de Meta Marketing. Los datos que obtenemos incluyen:</p>
        <ul style={{paddingLeft:'20px',fontSize:'14px'}}>
          <li style={{marginBottom:'8px'}}>Métricas de campañas, conjuntos de anuncios y anuncios</li>
          <li style={{marginBottom:'8px'}}>Datos de audiencia demográfica (edad, género, ubicación)</li>
          <li style={{marginBottom:'8px'}}>Insights de páginas de Facebook e Instagram Business</li>
        </ul>
        <p style={{fontSize:'14px',marginTop:'12px'}}>Estos datos se usan únicamente para mostrarte reportes dentro de la plataforma. No los compartimos con terceros.</p>
      </section>

      <section style={{marginBottom:'32px'}}>
        <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'700',marginBottom:'12px'}}>4. Almacenamiento y seguridad</h2>
        <p style={{fontSize:'14px'}}>Tus datos se almacenan en servidores seguros usando Supabase (PostgreSQL) con cifrado en reposo y en tránsito. Los tokens de acceso de Meta se almacenan cifrados y solo son accesibles por tu cuenta.</p>
      </section>

      <section style={{marginBottom:'32px'}}>
        <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'700',marginBottom:'12px'}}>5. Retención de datos</h2>
        <p style={{fontSize:'14px'}}>Conservamos tus datos mientras tu cuenta esté activa. Puedes solicitar la eliminación de tu cuenta y todos tus datos en cualquier momento escribiendo a soporte.</p>
      </section>

      <section style={{marginBottom:'32px'}}>
        <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'700',marginBottom:'12px'}}>6. Tus derechos</h2>
        <p style={{fontSize:'14px',marginBottom:'12px'}}>Tienes derecho a:</p>
        <ul style={{paddingLeft:'20px',fontSize:'14px'}}>
          <li style={{marginBottom:'8px'}}>Acceder a todos los datos que tenemos sobre ti</li>
          <li style={{marginBottom:'8px'}}>Solicitar la corrección de datos incorrectos</li>
          <li style={{marginBottom:'8px'}}>Solicitar la eliminación de tu cuenta y datos</li>
          <li style={{marginBottom:'8px'}}>Revocar el acceso a tu cuenta de Meta en cualquier momento</li>
        </ul>
      </section>

      <section style={{marginBottom:'32px'}}>
        <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'700',marginBottom:'12px'}}>7. Contacto</h2>
        <p style={{fontSize:'14px'}}>Para cualquier pregunta sobre esta política de privacidad, contáctanos en: <a href="mailto:privacidad@reporteador.app" style={{color:'#6366f1'}}>privacidad@reporteador.app</a></p>
      </section>
    </div>
  )
}
