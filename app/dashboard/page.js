'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/'
      else setUser(data.user)
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (!user) return <div style={{minHeight:'100vh',background:'#0a0a0e'}}></div>

  return (
    <main style={{minHeight:'100vh',background:'#0a0a0e',fontFamily:'Inter,sans-serif'}}>
      <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 36px',height:'60px',background:'rgba(10,10,14,.97)',borderBottom:'1px solid #2a2a35'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <span style={{fontSize:'18px'}}>📊</span>
          <span style={{color:'#fff',fontWeight:'800',fontSize:'15px'}}>Reporteador</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
          <span style={{color:'#666',fontSize:'12px',fontFamily:'monospace'}}>{user.email}</span>
          <button onClick={handleLogout}
            style={{background:'transparent',border:'1px solid #2a2a35',color:'#888',padding:'6px 14px',borderRadius:'8px',fontSize:'11px',cursor:'pointer',fontFamily:'monospace'}}>
            Cerrar sesion
          </button>
        </div>
      </header>
      <div style={{padding:'48px 36px',textAlign:'center'}}>
        <div style={{fontSize:'48px',marginBottom:'16px'}}>🚧</div>
        <h1 style={{color:'#fff',fontSize:'24px',fontWeight:'800',marginBottom:'12px'}}>Dashboard en construccion</h1>
        <p style={{color:'#666',fontSize:'14px',fontFamily:'monospace'}}>Bienvenido {user.email}</p>
      </div>
    </main>
  )
}
