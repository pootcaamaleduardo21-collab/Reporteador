export const metadata = {
  title: 'Política de Privacidad — Kaan',
  description: 'Política de privacidad de Kaan Analytics. Cómo recopilamos, usamos y protegemos tus datos.',
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kaan.app'

const s = { marginBottom:'32px' }
const h2 = { color:'#fff', fontSize:'17px', fontWeight:'700', marginBottom:'10px', paddingBottom:'8px', borderBottom:'1px solid rgba(255,255,255,.07)' }
const p  = { fontSize:'14px', marginBottom:'10px', color:'#aaa', lineHeight:'1.75' }
const li = { marginBottom:'8px', fontSize:'14px', color:'#aaa', lineHeight:'1.6' }
const ul = { paddingLeft:'20px', marginBottom:'12px' }
const tag = { display:'inline-block', background:'rgba(99,102,241,.12)', border:'1px solid rgba(99,102,241,.2)', color:'#a5b4fc', fontSize:'11px', fontWeight:'700', padding:'2px 9px', borderRadius:'20px', marginRight:'6px', marginBottom:'4px' }

export default function PrivacidadPage() {
  return (
    <div style={{minHeight:'100vh',background:'#0a0a10'}}>
      <div style={{maxWidth:'800px',margin:'0 auto',padding:'60px 24px 80px',fontFamily:'"Plus Jakarta Sans",system-ui,sans-serif',color:'#ccc',lineHeight:'1.8'}}>

        <div style={{marginBottom:'36px'}}>
          <a href="/" style={{color:'#6366f1',textDecoration:'none',fontSize:'13px'}}>← Kaan</a>
        </div>

        <h1 style={{color:'#fff',fontSize:'26px',fontWeight:'800',marginBottom:'6px'}}>Política de Privacidad</h1>
        <p style={{color:'#555',fontSize:'13px',marginBottom:'12px'}}>Última actualización: 2 de abril de 2026</p>
        <p style={{color:'#777',fontSize:'13px',marginBottom:'40px'}}>
          Aplicable a: <strong style={{color:'#aaa'}}>Kaan Analytics</strong> («Kaan», «la plataforma», «nosotros»)<br/>
          Dominio: <strong style={{color:'#aaa'}}>kaan.app</strong>
        </p>

        {/* Intro */}
        <div style={{background:'rgba(99,102,241,.07)',border:'1px solid rgba(99,102,241,.18)',borderRadius:'12px',padding:'18px 22px',marginBottom:'36px'}}>
          <p style={{...p, marginBottom:0, color:'#c7d2fe'}}>
            Kaan es una plataforma de analítica de marketing digital que te permite visualizar el rendimiento
            de tus campañas en Meta Ads, Google Ads y otras plataformas desde un solo lugar.
            Esta política describe qué datos recopilamos, cómo los usamos, cómo los protegemos y cuáles son tus derechos.
          </p>
        </div>

        <section style={s}>
          <h2 style={h2}>1. Información que recopilamos</h2>
          <p style={p}><strong style={{color:'#fff'}}>a) Datos de cuenta</strong></p>
          <ul style={ul}>
            <li style={li}>Dirección de correo electrónico (para autenticación)</li>
            <li style={li}>Contraseña (almacenada con hash bcrypt, nunca en texto plano)</li>
            <li style={li}>Nombre de perfil y preferencias de configuración</li>
          </ul>
          <p style={p}><strong style={{color:'#fff'}}>b) Datos de plataformas de publicidad (Meta, Google Ads)</strong></p>
          <ul style={ul}>
            <li style={li}>Tokens de acceso OAuth (cifrados en reposo)</li>
            <li style={li}>IDs de cuentas publicitarias vinculadas</li>
            <li style={li}>Métricas de campañas: gasto, impresiones, clics, conversiones, CTR, CPM, CPC, alcance, frecuencia</li>
            <li style={li}>Datos demográficos agregados de audiencia (edad, género, ubicación, dispositivo)</li>
            <li style={li}>Datos de páginas de Facebook e Instagram Business vinculadas (nombre, métricas de posts)</li>
            <li style={li}>Histórico mensual de rendimiento de campañas</li>
          </ul>
          <p style={p}><strong style={{color:'#fff'}}>c) Datos de uso</strong></p>
          <ul style={ul}>
            <li style={li}>Logs de acceso y navegación dentro de la plataforma</li>
            <li style={li}>Errores técnicos para depuración (sin contenido personal)</li>
          </ul>
        </section>

        <section style={s}>
          <h2 style={h2}>2. Cómo usamos tu información</h2>
          <p style={p}>Usamos tus datos <strong style={{color:'#fff'}}>exclusivamente</strong> para:</p>
          <ul style={ul}>
            <li style={li}>Mostrar reportes y métricas de tus campañas publicitarias dentro de la plataforma</li>
            <li style={li}>Generar diagnósticos automáticos y recomendaciones de optimización</li>
            <li style={li}>Exportar reportes en PDF a solicitud del usuario</li>
            <li style={li}>Procesar pagos de suscripción (a través de Stripe)</li>
            <li style={li}>Enviarte notificaciones transaccionales relacionadas con tu cuenta</li>
          </ul>
          <div style={{background:'rgba(16,185,129,.06)',border:'1px solid rgba(16,185,129,.18)',borderRadius:'9px',padding:'14px 18px',marginTop:'12px'}}>
            <p style={{...p, marginBottom:0, color:'rgba(110,231,183,.85)'}}>
              <strong>No vendemos, rentamos, compartimos ni monetizamos tus datos personales ni los datos de tus campañas con terceros.
              Nunca usamos tus datos para publicidad dirigida a terceros.</strong>
            </p>
          </div>
        </section>

        <section style={s}>
          <h2 style={h2}>3. Permisos de Meta / Facebook que utilizamos</h2>
          <p style={p}>Kaan solicita los siguientes permisos de la API de Meta Marketing. Cada permiso tiene un propósito específico:</p>
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            {[
              { perm:'ads_read',               uso:'Leer datos de campañas, conjuntos de anuncios y anuncios para generar reportes.' },
              { perm:'read_insights',           uso:'Obtener métricas de rendimiento (impresiones, clics, conversiones, gasto) por período.' },
              { perm:'pages_show_list',         uso:'Listar las páginas de Facebook vinculadas a la cuenta.' },
              { perm:'pages_read_engagement',  uso:'Leer métricas de engagement de publicaciones orgánicas de Páginas de Facebook.' },
              { perm:'instagram_basic',         uso:'Acceder al perfil básico de cuentas de Instagram Business vinculadas.' },
              { perm:'instagram_manage_insights', uso:'Obtener métricas de rendimiento de contenido orgánico de Instagram Business.' },
            ].map((item, i) => (
              <div key={i} style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',borderRadius:'8px',padding:'12px 16px'}}>
                <div style={{...tag, marginBottom:'6px', display:'inline-block'}}>{item.perm}</div>
                <p style={{...p, marginBottom:0, fontSize:'13px'}}>{item.uso}</p>
              </div>
            ))}
          </div>
          <p style={{...p, marginTop:'14px', fontSize:'13px', color:'#666'}}>
            Kaan <strong style={{color:'#888'}}>no solicita</strong> permisos para crear, modificar ni eliminar campañas, anuncios o publicaciones.
            Solo leemos datos para mostrarte reportes.
          </p>
        </section>

        <section style={s}>
          <h2 style={h2}>4. Almacenamiento y seguridad</h2>
          <ul style={ul}>
            <li style={li}>Todos los datos se almacenan en <strong style={{color:'#ccc'}}>Supabase</strong> (PostgreSQL) con cifrado en reposo (AES-256) y en tránsito (TLS 1.3)</li>
            <li style={li}>Los tokens de acceso de Meta se almacenan cifrados y solo son accesibles por el usuario autenticado</li>
            <li style={li}>Los pagos se procesan a través de <strong style={{color:'#ccc'}}>Stripe</strong>. Kaan no almacena datos de tarjetas de crédito</li>
            <li style={li}>Los servidores están ubicados en centros de datos de EE. UU. con certificaciones SOC 2 Tipo II</li>
            <li style={li}>El acceso a producción está restringido al equipo técnico con autenticación de dos factores</li>
          </ul>
        </section>

        <section style={s}>
          <h2 style={h2}>5. Retención de datos</h2>
          <ul style={ul}>
            <li style={li}>Tus datos se conservan mientras tu cuenta esté activa</li>
            <li style={li}>Al eliminar tu cuenta, todos tus datos personales y tokens de acceso son eliminados en un plazo máximo de <strong style={{color:'#ccc'}}>30 días</strong></li>
            <li style={li}>Los datos de facturación se conservan por el período requerido por la ley fiscal mexicana (5 años)</li>
            <li style={li}>Los logs técnicos se eliminan automáticamente después de 90 días</li>
          </ul>
        </section>

        <section style={s}>
          <h2 style={h2}>6. Eliminación de datos de Facebook / Meta</h2>
          <p style={p}>
            De acuerdo con los requisitos de la plataforma de Meta, puedes solicitar la eliminación de todos
            tus datos en Kaan directamente desde la configuración de tu cuenta de Facebook:
          </p>
          <ol style={{...ul, listStyleType:'decimal'}}>
            <li style={li}>Ve a Configuración de Facebook → Seguridad → Apps y sitios web</li>
            <li style={li}>Encuentra «Kaan» y haz clic en «Eliminar»</li>
            <li style={li}>Selecciona «Eliminar también toda la actividad»</li>
          </ol>
          <p style={p}>
            Al hacerlo, Meta enviará automáticamente una solicitud a nuestro endpoint de eliminación de datos.
            Recibirás un código de confirmación en:{' '}
            <strong style={{color:'#a5b4fc'}}>kaan.app/data-deletion-status</strong>
          </p>
          <p style={p}>
            También puedes solicitar la eliminación directamente escribiéndonos a{' '}
            <a href="mailto:privacidad@kaan.app" style={{color:'#6366f1'}}>privacidad@kaan.app</a>.
          </p>
        </section>

        <section style={s}>
          <h2 style={h2}>7. Compartición de datos con terceros</h2>
          <p style={p}>Compartimos datos únicamente con los siguientes proveedores de servicios esenciales:</p>
          <div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'12px'}}>
            {[
              { nombre:'Supabase Inc.',   uso:'Base de datos y autenticación',           url:'https://supabase.com/privacy' },
              { nombre:'Stripe Inc.',     uso:'Procesamiento de pagos',                   url:'https://stripe.com/privacy' },
              { nombre:'Vercel Inc.',     uso:'Infraestructura y hosting de la app',      url:'https://vercel.com/legal/privacy-policy' },
              { nombre:'Anthropic PBC',   uso:'Generación de contenido con IA (sin PII)', url:'https://www.anthropic.com/privacy' },
            ].map((t, i) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',borderRadius:'8px',padding:'10px 14px'}}>
                <div>
                  <div style={{fontSize:'13px',fontWeight:'600',color:'#ddd'}}>{t.nombre}</div>
                  <div style={{fontSize:'12px',color:'#666'}}>{t.uso}</div>
                </div>
                <a href={t.url} target="_blank" rel="noopener noreferrer" style={{fontSize:'11px',color:'#6366f1',textDecoration:'none',flexShrink:0,marginLeft:'12px'}}>Ver política →</a>
              </div>
            ))}
          </div>
          <p style={{...p, color:'#666', fontSize:'13px'}}>No compartimos datos con ningún otro tercero.</p>
        </section>

        <section style={s}>
          <h2 style={h2}>8. Cookies y tecnologías de rastreo</h2>
          <ul style={ul}>
            <li style={li}>Kaan usa cookies de sesión estrictamente necesarias para mantener tu sesión autenticada</li>
            <li style={li}>No usamos cookies de rastreo, publicidad ni analytics de terceros</li>
            <li style={li}>Las preferencias de usuario (tema, idioma, nicho) se guardan en <code style={{background:'rgba(255,255,255,.07)',padding:'1px 5px',borderRadius:'3px',fontSize:'12px'}}>localStorage</code> del navegador, no en servidores</li>
          </ul>
        </section>

        <section style={s}>
          <h2 style={h2}>9. Tus derechos</h2>
          <p style={p}>Tienes los siguientes derechos sobre tus datos personales:</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
            {[
              { icon:'👁',  title:'Acceso',       desc:'Solicitar una copia de todos los datos que tenemos sobre ti' },
              { icon:'✏️',  title:'Rectificación', desc:'Corregir datos incorrectos o desactualizados' },
              { icon:'🗑️', title:'Eliminación',   desc:'Solicitar la eliminación de tu cuenta y todos tus datos' },
              { icon:'📦', title:'Portabilidad',  desc:'Recibir tus datos en formato estructurado (JSON/CSV)' },
              { icon:'⛔',  title:'Oposición',    desc:'Oponerte al procesamiento de tus datos para cualquier propósito' },
              { icon:'🔌', title:'Revocación',    desc:'Revocar el acceso de Kaan a tu cuenta de Meta en cualquier momento' },
            ].map((d, i) => (
              <div key={i} style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',borderRadius:'8px',padding:'12px 14px',display:'flex',gap:'10px',alignItems:'flex-start'}}>
                <div style={{fontSize:'18px',flexShrink:0}}>{d.icon}</div>
                <div>
                  <div style={{fontSize:'13px',fontWeight:'700',color:'#ddd',marginBottom:'3px'}}>{d.title}</div>
                  <div style={{fontSize:'12px',color:'#777',lineHeight:'1.5'}}>{d.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <p style={{...p, marginTop:'14px', fontSize:'13px'}}>
            Para ejercer cualquiera de estos derechos, escríbenos a{' '}
            <a href="mailto:privacidad@kaan.app" style={{color:'#6366f1'}}>privacidad@kaan.app</a>.
            Respondemos en un máximo de <strong style={{color:'#ccc'}}>30 días hábiles</strong>.
          </p>
        </section>

        <section style={s}>
          <h2 style={h2}>10. Menores de edad</h2>
          <p style={p}>
            Kaan no está dirigido a menores de 18 años. No recopilamos intencionalmente información de menores.
            Si detectamos que un usuario es menor de edad, eliminaremos su cuenta y datos de inmediato.
          </p>
        </section>

        <section style={s}>
          <h2 style={h2}>11. Cambios a esta política</h2>
          <p style={p}>
            Notificaremos cualquier cambio material a esta política por correo electrónico y mediante un aviso
            visible en la plataforma con al menos 30 días de anticipación.
            El uso continuado de Kaan después del aviso constituye aceptación de los cambios.
          </p>
        </section>

        <section style={s}>
          <h2 style={h2}>12. Contacto y responsable de datos</h2>
          <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',borderRadius:'12px',padding:'20px 24px'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
              <div>
                <div style={{fontSize:'11px',color:'#555',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'4px'}}>Empresa</div>
                <div style={{fontSize:'14px',color:'#ccc'}}>Kaan Analytics</div>
              </div>
              <div>
                <div style={{fontSize:'11px',color:'#555',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'4px'}}>Email de privacidad</div>
                <a href="mailto:privacidad@kaan.app" style={{fontSize:'14px',color:'#6366f1',textDecoration:'none'}}>privacidad@kaan.app</a>
              </div>
              <div>
                <div style={{fontSize:'11px',color:'#555',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'4px'}}>Eliminación de datos (Meta)</div>
                <div style={{fontSize:'13px',color:'#aaa',fontFamily:'monospace'}}>kaan.app/data-deletion-status</div>
              </div>
              <div>
                <div style={{fontSize:'11px',color:'#555',fontWeight:'700',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'4px'}}>Endpoint de callback</div>
                <div style={{fontSize:'13px',color:'#aaa',fontFamily:'monospace'}}>kaan.app/api/auth/data-deletion</div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
