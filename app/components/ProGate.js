'use client'

export default function ProGate({ feature = 'esta funcion' }) {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'400px',padding:'40px',textAlign:'center',fontFamily:'"Plus Jakarta Sans",system-ui,sans-serif'}}>
      <div style={{background:'rgba(99,102,241,.08)',border:'1px solid rgba(99,102,241,.2)',borderRadius:'20px',padding:'40px',maxWidth:'380px'}}>
        <div style={{fontSize:'36px',marginBottom:'16px'}}>🔒</div>
        <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'800',marginBottom:'8px'}}>Funcion Pro</h2>
        <p style={{color:'#666',fontSize:'13px',lineHeight:'1.6',marginBottom:'24px'}}>
          {feature} esta disponible en el plan Pro. Actualiza para desbloquear reportes completos, diagnostico de creativos, audiencia demografica y mucho mas.
        </p>
        <a href="/planes" style={{display:'block',padding:'12px 24px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',borderRadius:'10px',textDecoration:'none',fontSize:'13px',fontWeight:'700',marginBottom:'12px'}}>
          Ver planes — desde $297 MXN/mes
        </a>
        <a href="/dashboard" style={{fontSize:'12px',color:'#444',textDecoration:'none'}}>Volver al dashboard</a>
      </div>
    </div>
  )
}
