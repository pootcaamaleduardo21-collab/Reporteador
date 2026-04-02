'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function StatusContent() {
  const searchParams = useSearchParams()
  const code = searchParams?.get('code') || ''

  return (
    <div style={{maxWidth:'600px',margin:'0 auto',padding:'80px 24px',fontFamily:'"Plus Jakarta Sans",system-ui,sans-serif',textAlign:'center'}}>
      <div style={{marginBottom:'32px'}}>
        <a href="/" style={{color:'#6366f1',textDecoration:'none',fontSize:'13px'}}>← Kaan</a>
      </div>

      <div style={{fontSize:'48px',marginBottom:'20px'}}>🗑️</div>
      <h1 style={{color:'#fff',fontSize:'24px',fontWeight:'800',marginBottom:'12px'}}>
        Solicitud de eliminación recibida
      </h1>
      <p style={{color:'#888',fontSize:'14px',lineHeight:'1.7',marginBottom:'32px'}}>
        Hemos recibido tu solicitud de eliminación de datos enviada desde Facebook/Meta.
        Todos tus datos personales y tokens de acceso serán eliminados de nuestros servidores
        en un plazo máximo de <strong style={{color:'#ccc'}}>30 días</strong>.
      </p>

      {code && (
        <div style={{background:'rgba(99,102,241,.08)',border:'1px solid rgba(99,102,241,.2)',borderRadius:'12px',padding:'20px 24px',marginBottom:'28px'}}>
          <div style={{fontSize:'11px',color:'#888',fontWeight:'700',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'8px'}}>
            Código de confirmación
          </div>
          <div style={{fontSize:'13px',color:'#a5b4fc',fontFamily:'monospace',wordBreak:'break-all'}}>
            {code}
          </div>
          <p style={{fontSize:'12px',color:'#555',marginTop:'10px',marginBottom:0}}>
            Guarda este código para hacer seguimiento de tu solicitud.
          </p>
        </div>
      )}

      <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'12px',padding:'20px 24px',textAlign:'left',marginBottom:'28px'}}>
        <div style={{fontSize:'13px',fontWeight:'700',color:'#fff',marginBottom:'12px'}}>¿Qué datos se eliminan?</div>
        {[
          'Token de acceso de Meta / Facebook',
          'IDs de cuentas publicitarias vinculadas',
          'Historial de reportes generados',
          'Datos de preferencias de cuenta',
        ].map((item, i) => (
          <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'7px 0',borderBottom:i<3?'1px solid rgba(255,255,255,.05)':'none'}}>
            <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#10b981',flexShrink:0}}/>
            <span style={{fontSize:'13px',color:'#aaa'}}>{item}</span>
          </div>
        ))}
      </div>

      <p style={{fontSize:'12px',color:'#555',lineHeight:'1.7'}}>
        ¿Tienes preguntas? Escríbenos a{' '}
        <a href="mailto:privacidad@kaan.app" style={{color:'#6366f1',textDecoration:'none'}}>
          privacidad@kaan.app
        </a>
      </p>
    </div>
  )
}

export default function DataDeletionStatusPage() {
  return (
    <div style={{minHeight:'100vh',background:'#0a0a10'}}>
      <Suspense fallback={<div style={{color:'#fff',textAlign:'center',padding:'80px'}}>Cargando...</div>}>
        <StatusContent />
      </Suspense>
    </div>
  )
}
