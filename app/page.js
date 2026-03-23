'use client'
import { useState } from 'react'
import { supabase } from './lib/supabase'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    window.location.href = '/dashboard'
  }

  return (
    <div style={{minHeight:'100vh',background:'#0c0c10',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'"Plus Jakarta Sans",system-ui,sans-serif',padding:'20px'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');input::placeholder{color:#333}`}</style>

      <div style={{width:'100%',maxWidth:'380px'}}>

        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:'36px'}}>
          <div style={{width:'52px',height:'52px',borderRadius:'13px',background:'#6366f1',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>
            <svg width="30" height="30" viewBox="0 0 26 26" fill="none">
              <path d="M13 3 L3 21 L13 17 L23 21 Z" fill="white"/>
              <path d="M13 3 L13 17" stroke="white" strokeWidth="1.2" opacity=".35"/>
              <circle cx="13" cy="17" r="1.8" fill="#a5b4fc"/>
            </svg>
          </div>
          <div style={{fontSize:'24px',fontWeight:'800',color:'#fff',letterSpacing:'-.4px',marginBottom:'6px'}}>Kaan</div>
          <div style={{fontSize:'13px',color:'#444'}}>Analytics para traffickers</div>
        </div>

        {/* Form */}
        <div style={{background:'#111116',border:'1px solid rgba(255,255,255,.07)',borderRadius:'16px',padding:'28px'}}>
          <form onSubmit={handleLogin}>
            <div style={{marginBottom:'14px'}}>
              <label style={{display:'block',fontSize:'11px',color:'#555',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'6px'}}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                style={{width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'9px',padding:'11px 14px',color:'#fff',fontSize:'13px',outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
            </div>
            <div style={{marginBottom:'20px'}}>
              <label style={{display:'block',fontSize:'11px',color:'#555',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'6px'}}>Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required
                style={{width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'9px',padding:'11px 14px',color:'#fff',fontSize:'13px',outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
            </div>

            {error && (
              <div style={{background:'rgba(248,113,113,.1)',border:'1px solid rgba(248,113,113,.2)',borderRadius:'8px',padding:'10px 12px',marginBottom:'14px',fontSize:'12px',color:'#f87171'}}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{width:'100%',padding:'12px',borderRadius:'10px',border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:'13px',fontWeight:'700',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',opacity:loading?.7:1,transition:'opacity .15s'}}>
              {loading ? 'Iniciando...' : 'Iniciar sesion'}
            </button>
          </form>

          <div style={{textAlign:'center',marginTop:'18px',fontSize:'12px',color:'#333'}}>
            No tienes cuenta?{' '}
            <a href="/registro" style={{color:'#a5b4fc',textDecoration:'none',fontWeight:'600'}}>Registrate</a>
          </div>
        </div>

        <div style={{textAlign:'center',marginTop:'20px'}}>
          <a href="/planes" style={{fontSize:'12px',color:'#2a2a35',textDecoration:'none'}}>Ver planes →</a>
        </div>

        <div style={{textAlign:'center',marginTop:'12px',fontSize:'11px',color:'#1a1a22',fontStyle:'italic'}}>
          Toma decisiones con datos reales, no con intuición.
        </div>
      </div>
    </div>
  )
}
