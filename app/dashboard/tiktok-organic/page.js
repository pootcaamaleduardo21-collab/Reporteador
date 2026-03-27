'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function TikTokOrganicPage() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',background:'var(--bg)'}}>
      <div style={{width:'24px',height:'24px',borderRadius:'50%',border:'2px solid rgba(99,102,241,.3)',borderTop:'2px solid #6366f1',animation:'spin 1s linear infinite'}}></div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{padding:'24px',fontFamily:'"Plus Jakarta Sans",sans-serif'}}>
      <div style={{maxWidth:'600px',margin:'0 auto'}}>

        {/* Header */}
        <div style={{marginBottom:'24px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'8px'}}>
            <div style={{width:'40px',height:'40px',borderRadius:'10px',background:'#010101',border:'1px solid rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'20px'}}>∿</div>
            <div>
              <h1 style={{fontSize:'18px',fontWeight:'800',color:'var(--text)',margin:0}}>TikTok Orgánico</h1>
              <p style={{fontSize:'12px',color:'var(--text4)',margin:0}}>Métricas de videos y perfil</p>
            </div>
          </div>
        </div>

        {/* Coming soon card */}
        <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'14px',padding:'40px 32px',textAlign:'center',marginBottom:'20px'}}>
          <div style={{display:'inline-flex',padding:'12px',borderRadius:'50%',background:'rgba(99,102,241,.08)',marginBottom:'20px'}}>
            <div style={{fontSize:'32px'}}>🚀</div>
          </div>
          <h2 style={{fontSize:'16px',fontWeight:'800',color:'var(--text)',marginBottom:'8px'}}>Próximamente disponible</h2>
          <p style={{fontSize:'12px',color:'var(--text4)',lineHeight:'1.7',maxWidth:'380px',margin:'0 auto 24px'}}>
            La integración con TikTok Orgánico está en desarrollo. Podrás ver métricas de tus videos, alcance, reproducciones, comentarios y crecimiento de seguidores directamente aquí.
          </p>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',maxWidth:'340px',margin:'0 auto 28px',textAlign:'left'}}>
            {[
              {icon:'👁', label:'Visualizaciones'},
              {icon:'❤️', label:'Likes y comentarios'},
              {icon:'📈', label:'Crecimiento de seguidores'},
              {icon:'🎬', label:'Análisis de videos'},
              {icon:'🗺', label:'Audiencia por región'},
              {icon:'⏱', label:'Tiempo promedio de vista'},
            ].map((f,i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',padding:'10px 12px',background:'rgba(255,255,255,.03)',borderRadius:'8px',border:'1px solid rgba(255,255,255,.06)'}}>
                <span style={{fontSize:'14px'}}>{f.icon}</span>
                <span style={{fontSize:'11px',color:'var(--text4)'}}>{f.label}</span>
              </div>
            ))}
          </div>

          <div style={{background:'rgba(99,102,241,.07)',border:'1px solid rgba(99,102,241,.18)',borderRadius:'9px',padding:'12px 16px',fontSize:'11px',color:'#a5b4fc',lineHeight:'1.6'}}>
            Mientras tanto, puedes ver tus campañas de <strong>TikTok Ads</strong> en la sección de Campañas Pagadas del sidebar.
          </div>
        </div>

        {/* Go back */}
        <div style={{textAlign:'center'}}>
          <button onClick={() => router.push('/dashboard')}
            style={{padding:'9px 20px',borderRadius:'8px',background:'transparent',border:'1px solid var(--border)',color:'var(--text4)',fontSize:'12px',cursor:'pointer',fontFamily:'inherit'}}>
            ← Volver al Resumen
          </button>
        </div>
      </div>
    </div>
  )
}
