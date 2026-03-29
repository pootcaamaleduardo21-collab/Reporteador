'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function RegistroPage() {
  const [mode, setMode] = useState('registro') // 'registro' | 'login' | 'recovery'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) window.location.href = '/dashboard'
    })
    const params = new URLSearchParams(window.location.search)
    if (params.get('mode') === 'login') setMode('login')
    if (params.get('mode') === 'recovery') setMode('recovery')
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (mode === 'registro') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.user) {
          await supabase.from('profiles').upsert({ id: data.user.id, email, plan: 'free' })
        }
        setSuccess('Cuenta creada. Revisa tu email para confirmar.')
        setTimeout(() => window.location.href = '/dashboard', 2000)
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        window.location.href = '/dashboard'
      } else if (mode === 'recovery') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) throw error
        setSuccess('Te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada (y spam).')
      }
    } catch(e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const inputStyle = {
    width:'100%',
    background:'rgba(255,255,255,.05)',
    border:'1px solid rgba(255,255,255,.1)',
    borderRadius:'9px',
    padding:'12px 14px',
    color:'#fff',
    fontSize:'13px',
    outline:'none',
    fontFamily:'inherit',
    marginBottom:'10px',
  }

  return (
    <div style={{minHeight:'100vh',background:'#0c0c10',fontFamily:'"Plus Jakarta Sans",system-ui,sans-serif',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');input::placeholder{color:#444}`}</style>

      <div style={{width:'100%',maxWidth:'380px'}}>
        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <div style={{width:'44px',height:'44px',borderRadius:'12px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="16" height="16"><path d="M16 4 L4 26 L16 21 L28 26 Z" fill="white"/><path d="M16 4 L16 21" stroke="white" strokeWidth="1.5" opacity=".35"/><circle cx="16" cy="21" r="2.2" fill="#a5b4fc"/></svg></div>
          <h1 style={{color:'#fff',fontSize:'22px',fontWeight:'800',marginBottom:'6px'}}>Kaan</h1>
          <p style={{color:'#555',fontSize:'13px'}}>
            {mode==='registro' ? 'Crea tu cuenta gratis' : mode==='login' ? 'Bienvenido de vuelta' : 'Recupera tu contraseña'}
          </p>
        </div>

        {/* Toggle registro / login — oculto en recovery */}
        {mode !== 'recovery' && (
          <div style={{display:'flex',background:'rgba(255,255,255,.04)',borderRadius:'10px',padding:'3px',marginBottom:'24px'}}>
            <button onClick={()=>{setMode('registro');setError('');setSuccess('')}}
              style={{flex:1,padding:'8px',borderRadius:'8px',border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:'600',background:mode==='registro'?'#fff':'transparent',color:mode==='registro'?'#0c0c10':'#555',transition:'all .15s'}}>
              Registro
            </button>
            <button onClick={()=>{setMode('login');setError('');setSuccess('')}}
              style={{flex:1,padding:'8px',borderRadius:'8px',border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:'600',background:mode==='login'?'#fff':'transparent',color:mode==='login'?'#0c0c10':'#555',transition:'all .15s'}}>
              Iniciar sesión
            </button>
          </div>
        )}

        {/* Recovery: volver atrás */}
        {mode === 'recovery' && (
          <button onClick={()=>{setMode('login');setError('');setSuccess('')}}
            style={{display:'flex',alignItems:'center',gap:'6px',background:'transparent',border:'none',color:'#555',fontSize:'12px',cursor:'pointer',fontFamily:'inherit',marginBottom:'20px',padding:0}}>
            ← Volver al inicio de sesión
          </button>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            required
            style={inputStyle}
          />

          {mode !== 'recovery' && (
            <input
              type="password"
              placeholder="Contraseña (mín. 6 caracteres)"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              required
              minLength={6}
              style={inputStyle}
            />
          )}

          {/* Link ¿Olvidaste tu contraseña? — solo en login */}
          {mode === 'login' && (
            <div style={{textAlign:'right',marginBottom:'14px',marginTop:'-4px'}}>
              <button type="button" onClick={()=>{setMode('recovery');setError('');setSuccess('')}}
                style={{background:'transparent',border:'none',color:'#6366f1',fontSize:'12px',cursor:'pointer',fontFamily:'inherit',padding:0}}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          {error && (
            <div style={{background:'rgba(248,113,113,.1)',border:'1px solid rgba(248,113,113,.2)',borderRadius:'8px',padding:'10px 12px',marginBottom:'12px',fontSize:'12px',color:'#f87171'}}>
              {error}
            </div>
          )}
          {success && (
            <div style={{background:'rgba(110,231,183,.1)',border:'1px solid rgba(110,231,183,.2)',borderRadius:'8px',padding:'10px 12px',marginBottom:'12px',fontSize:'12px',color:'#6ee7b7'}}>
              {success}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width:'100%',padding:'13px',borderRadius:'10px',border:'none',cursor:'pointer',
            fontFamily:'inherit',fontSize:'13px',fontWeight:'700',
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color:'#fff',opacity:loading?0.7:1,transition:'opacity .15s',marginBottom:'16px',
          }}>
            {loading ? 'Cargando...'
              : mode==='registro' ? 'Crear cuenta gratis'
              : mode==='login' ? 'Iniciar sesión'
              : 'Enviar enlace de recuperación'}
          </button>
        </form>

        {mode==='registro' && (
          <div style={{textAlign:'center',fontSize:'11px',color:'#444',lineHeight:'1.6'}}>
            Al registrarte aceptas nuestros{' '}
            <a href="/terminos" style={{color:'#6366f1'}}>Términos de uso</a>
            {' '}y{' '}
            <a href="/privacidad" style={{color:'#6366f1'}}>Política de privacidad</a>
          </div>
        )}

        <div style={{textAlign:'center',marginTop:'20px'}}>
          <a href="/planes" style={{fontSize:'12px',color:'#555',textDecoration:'none'}}>Ver planes y precios →</a>
        </div>
      </div>
    </div>
  )
}
