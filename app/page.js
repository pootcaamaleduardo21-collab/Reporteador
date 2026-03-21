'use client'
import { useState } from 'react'
import { supabase } from './lib/supabase'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setError('Cuenta creada. Ya puedes iniciar sesion.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else window.location.href = '/dashboard'
    }
    setLoading(false)
  }

  return (
    <main style={{minHeight:'100vh',background:'#0a0a0e',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#111116',border:'1px solid #2a2a35',borderRadius:'16px',padding:'48px',width:'100%',maxWidth:'400px'}}>
        <div style={{marginBottom:'32px',textAlign:'center'}}>
          <div style={{fontSize:'28px',marginBottom:'8px'}}>📊</div>
          <h1 style={{color:'#fff',fontSize:'20px',fontWeight:'800',margin:'0 0 6px'}}>Reporteador</h1>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:'16px'}}>
            <label style={{display:'block',color:'#888',fontSize:'11px',marginBottom:'8px'}}>EMAIL</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
              style={{width:'100%',background:'#18181f',border:'1px solid #2a2a35',color:'#fff',padding:'10px 14px',borderRadius:'8px',fontSize:'14px',outline:'none',boxSizing:'border-box'}}
              placeholder="tu@email.com"/>
          </div>
          <div style={{marginBottom:'24px'}}>
            <label style={{display:'block',color:'#888',fontSize:'11px',marginBottom:'8px'}}>PASSWORD</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required
              style={{width:'100%',background:'#18181f',border:'1px solid #2a2a35',color:'#fff',padding:'10px 14px',borderRadius:'8px',fontSize:'14px',outline:'none',boxSizing:'border-box'}}/>
          </div>
          {error && <div style={{marginBottom:'16px',padding:'10px 14px',borderRadius:'8px',background:'rgba(248,113,113,.08)',border:'1px solid rgba(248,113,113,.25)',color:'#f87171',fontSize:'12px'}}>{error}</div>}
          <button type="submit" disabled={loading}
            style={{width:'100%',background:'#fff',color:'#0a0a0e',border:'none',padding:'12px',borderRadius:'8px',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
            {loading ? 'Cargando...' : mode === 'login' ? 'Iniciar sesion' : 'Crear cuenta'}
          </button>
        </form>
        <p style={{textAlign:'center',marginTop:'24px',color:'#666',fontSize:'12px'}}>
          {mode === 'login' ? 'No tienes cuenta? ' : 'Ya tienes cuenta? '}
          <span onClick={()=>{setMode(mode==='login'?'register':'login');setError('')}} style={{color:'#fff',cursor:'pointer',textDecoration:'underline'}}>
            {mode === 'login' ? 'Registrate' : 'Inicia sesion'}
          </span>
        </p>
      </div>
    </main>
  )
}
