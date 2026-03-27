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
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#333',fontFamily:'monospace',fontSize:'12px'}}>
      Cargando...
    </div>
  )

  return (
    <div style={{padding:'40px'}}>
      <div style={{maxWidth:'900px',margin:'0 auto'}}>
        <h1 style={{fontSize:'24px',fontWeight:'800',marginBottom:'8px',color:'var(--text)'}}>
          TikTok Orgánico
        </h1>
        <p style={{fontSize:'13px',color:'var(--text4)',marginBottom:'32px'}}>
          Análisis de tu contenido orgánico en TikTok
        </p>

        <div style={{
          background:'var(--sidebar)',
          border:'1px solid var(--border)',
          borderRadius:'12px',
          padding:'40px',
          textAlign:'center'
        }}>
          <div style={{fontSize:'48px',marginBottom:'16px',fontWeight:'bold'}}>∿</div>
          <h2 style={{fontSize:'18px',fontWeight:'700',color:'var(--text)',marginBottom:'8px'}}>
            Próximamente
          </h2>
          <p style={{fontSize:'13px',color:'var(--text4)',marginBottom:'24px'}}>
            Los analytics de TikTok orgánico estarán disponibles pronto
          </p>
          <div style={{
            background:'rgba(99,102,241,.08)',
            border:'1px solid rgba(99,102,241,.2)',
            borderRadius:'8px',
            padding:'16px',
            fontSize:'12px',
            color:'#a5b4fc'
          }}>
            Conecta tu cuenta de TikTok para acceder a métricas de alcance, visualizaciones, likes y comentarios en tus videos
          </div>
        </div>
      </div>
    </div>
  )
}
