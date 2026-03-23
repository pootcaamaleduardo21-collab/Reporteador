'use client'

export default function ProGate({ feature = 'esta funcion', children }) {
  if (!children) {
    return (
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'400px',padding:'40px',textAlign:'center',fontFamily:'"Plus Jakarta Sans",system-ui,sans-serif'}}>
        <div style={{background:'rgba(99,102,241,.08)',border:'1px solid rgba(99,102,241,.2)',borderRadius:'20px',padding:'40px',maxWidth:'380px'}}>
          <div style={{fontSize:'36px',marginBottom:'16px'}}>🔒</div>
          <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'800',marginBottom:'8px'}}>Funcion Pro</h2>
          <p style={{color:'#666',fontSize:'13px',lineHeight:'1.6',marginBottom:'24px'}}>
            {feature} esta disponible en el plan Pro.
          </p>
          <a href="/planes" style={{display:'block',padding:'12px 24px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',borderRadius:'10px',textDecoration:'none',fontSize:'13px',fontWeight:'700',marginBottom:'12px'}}>
            Ver planes — desde $297 MXN/mes
          </a>
          <a href="/dashboard" style={{fontSize:'12px',color:'#444',textDecoration:'none'}}>Volver al dashboard</a>
        </div>
      </div>
    )
  }

  return (
    <div style={{position:'relative',fontFamily:'"Plus Jakarta Sans",system-ui,sans-serif'}}>
      {/* Blurred content */}
      <div style={{filter:'blur(4px)',pointerEvents:'none',userSelect:'none',opacity:.7}}>
        {children}
      </div>

      {/* Overlay */}
      <div style={{
        position:'absolute',inset:0,
        display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
        background:'rgba(10,10,14,.6)',
        backdropFilter:'blur(2px)',
        borderRadius:'12px',
        zIndex:10,
      }}>
        <div style={{
          background:'rgba(17,17,22,.95)',
          border:'1px solid rgba(99,102,241,.3)',
          borderRadius:'16px',
          padding:'28px 32px',
          textAlign:'center',
          maxWidth:'320px',
          boxShadow:'0 8px 32px rgba(0,0,0,.4)',
        }}>
          <div style={{fontSize:'28px',marginBottom:'12px'}}>🔒</div>
          <div style={{color:'#fff',fontSize:'15px',fontWeight:'800',marginBottom:'6px'}}>Desbloquea con Pro</div>
          <div style={{color:'#555',fontSize:'12px',lineHeight:'1.6',marginBottom:'20px'}}>
            Estos son tus datos reales. Actualiza a Pro para ver {feature} completo.
          </div>
          <a href="/planes" style={{
            display:'block',padding:'10px 20px',
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color:'#fff',borderRadius:'9px',textDecoration:'none',
            fontSize:'12px',fontWeight:'700',marginBottom:'10px',
          }}>
            Ver planes — desde $297 MXN/mes
          </a>
          <a href="/dashboard" style={{fontSize:'11px',color:'#333',textDecoration:'none'}}>
            Volver al overview
          </a>
        </div>
      </div>
    </div>
  )
}
