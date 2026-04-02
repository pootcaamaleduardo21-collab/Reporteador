'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Traduce errores de Supabase al español
function traducirError(msg = '') {
  if (msg.includes('Invalid login credentials'))    return 'Email o contraseña incorrectos.'
  if (msg.includes('Email not confirmed'))          return 'Primero confirma tu email. Revisa tu bandeja de entrada.'
  if (msg.includes('User already registered'))      return 'Ya existe una cuenta con ese email. Inicia sesión.'
  if (msg.includes('Password should be at least'))  return 'La contraseña debe tener al menos 6 caracteres.'
  if (msg.includes('Unable to validate email'))     return 'El formato del email no es válido.'
  if (msg.includes('rate limit'))                   return 'Demasiados intentos. Espera unos minutos.'
  if (msg.includes('Email rate limit'))             return 'Límite de emails alcanzado. Intenta en unos minutos.'
  if (msg.includes('signup is disabled'))           return 'El registro está temporalmente desactivado.'
  if (msg.includes('network'))                      return 'Error de conexión. Verifica tu internet.'
  return msg
}

const EyeIcon = ({ open }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open
      ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
      : <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
    }
  </svg>
)

export default function RegistroPage() {
  const [mode, setMode] = useState('login') // 'login' | 'registro' | 'recovery'
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [showPass, setShowPass]     = useState(false)
  const [showConf, setShowConf]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) window.location.href = '/dashboard'
      else setCheckingAuth(false)
    })
    const params = new URLSearchParams(window.location.search)
    if (params.get('mode') === 'registro')  setMode('registro')
    if (params.get('mode') === 'recovery')  setMode('recovery')
    if (params.get('registered') === '1') {
      setMode('login')
      setSuccess('Cuenta creada. Confirma tu email y luego inicia sesión aquí.')
    }
  }, [])

  function switchMode(m) {
    setMode(m)
    setError('')
    setSuccess('')
    setPassword('')
    setConfirm('')
    setShowPass(false)
    setShowConf(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (mode === 'registro') {
        if (password !== confirm) throw new Error('Las contraseñas no coinciden.')
        if (password.length < 6)  throw new Error('La contraseña debe tener al menos 6 caracteres.')

        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.user) {
          await supabase.from('profiles').upsert({ id: data.user.id, email, plan: 'free' })
        }
        // Redirigir al login con mensaje de éxito
        window.location.href = '/registro?registered=1'

      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        window.location.href = '/dashboard'

      } else if (mode === 'recovery') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) throw error
        setSuccess('Listo. Revisa tu bandeja de entrada (y spam) — te enviamos el enlace para restablecer tu contraseña.')
      }
    } catch(e) {
      setError(traducirError(e.message))
    }
    setLoading(false)
  }

  if (checkingAuth) return (
    <div style={{minHeight:'100vh',background:'#0c0c10',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:'28px',height:'28px',borderRadius:'50%',border:'3px solid rgba(99,102,241,.2)',borderTop:'3px solid #6366f1',animation:'spin 1s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const isRecovery = mode === 'recovery'
  const isRegistro = mode === 'registro'

  return (
    <div style={{minHeight:'100vh',background:'#0c0c10',fontFamily:'"Plus Jakarta Sans",system-ui,sans-serif',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .auth-input{
          width:100%;box-sizing:border-box;
          background:rgba(255,255,255,.05);
          border:1.5px solid rgba(255,255,255,.1);
          border-radius:10px;padding:12px 14px;
          color:#fff;font-size:13px;outline:none;
          font-family:inherit;transition:border-color .15s;
        }
        .auth-input:focus{border-color:rgba(99,102,241,.6);}
        .auth-input::placeholder{color:#444;}
        .auth-input:disabled{opacity:.5;cursor:not-allowed;}
        .auth-btn-primary{
          width:100%;padding:13px;border-radius:10px;border:none;cursor:pointer;
          font-family:inherit;font-size:13px;font-weight:700;
          background:linear-gradient(135deg,#6366f1,#8b5cf6);
          color:#fff;transition:opacity .15s;
        }
        .auth-btn-primary:hover:not(:disabled){opacity:.88;}
        .auth-btn-primary:disabled{opacity:.55;cursor:not-allowed;}
        .tab-auth{flex:1;padding:8px;border-radius:8px;border:none;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;transition:all .15s;}
        .show-pass-btn{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:transparent;border:none;color:#555;cursor:pointer;padding:0;display:flex;align-items:center;transition:color .15s;}
        .show-pass-btn:hover{color:#888;}
        .auth-link{background:transparent;border:none;color:#6366f1;font-size:12px;cursor:pointer;font-family:inherit;padding:0;text-decoration:none;}
        .auth-link:hover{text-decoration:underline;}
      `}</style>

      <div style={{width:'100%',maxWidth:'390px',animation:'fadeIn .35s ease'}}>

        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <a href="/" style={{textDecoration:'none'}}>
            <div style={{width:'46px',height:'46px',borderRadius:'13px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',boxShadow:'0 8px 24px rgba(99,102,241,.3)'}}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="18" height="18">
                <path d="M16 4 L4 26 L16 21 L28 26 Z" fill="white"/>
                <path d="M16 4 L16 21" stroke="white" strokeWidth="1.5" opacity=".35"/>
                <circle cx="16" cy="21" r="2.2" fill="#a5b4fc"/>
              </svg>
            </div>
            <div style={{color:'#fff',fontSize:'22px',fontWeight:'800',letterSpacing:'-.3px'}}>Kaan</div>
          </a>
          <p style={{color:'#555',fontSize:'13px',marginTop:'6px'}}>
            {isRecovery ? 'Recupera tu acceso' : isRegistro ? 'Crea tu cuenta gratis' : 'Bienvenido de vuelta'}
          </p>
        </div>

        {/* Tabs login / registro */}
        {!isRecovery && (
          <div style={{display:'flex',background:'rgba(255,255,255,.04)',borderRadius:'10px',padding:'3px',marginBottom:'24px',gap:'2px'}}>
            <button className="tab-auth" onClick={()=>switchMode('login')}
              style={{background:mode==='login'?'rgba(99,102,241,.2)':'transparent',color:mode==='login'?'#a5b4fc':'#555',border:mode==='login'?'1px solid rgba(99,102,241,.3)':'1px solid transparent'}}>
              Iniciar sesión
            </button>
            <button className="tab-auth" onClick={()=>switchMode('registro')}
              style={{background:mode==='registro'?'rgba(99,102,241,.2)':'transparent',color:mode==='registro'?'#a5b4fc':'#555',border:mode==='registro'?'1px solid rgba(99,102,241,.3)':'1px solid transparent'}}>
              Crear cuenta
            </button>
          </div>
        )}

        {/* Back button en recovery */}
        {isRecovery && (
          <button onClick={()=>switchMode('login')} className="auth-link"
            style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'20px',fontSize:'12px',color:'#555'}}>
            ← Volver al inicio de sesión
          </button>
        )}

        {/* Card contenedor */}
        <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'16px',padding:'28px 28px 24px'}}>

          {/* Mensajes */}
          {error && (
            <div style={{background:'rgba(248,113,113,.08)',border:'1px solid rgba(248,113,113,.2)',borderRadius:'9px',padding:'11px 14px',marginBottom:'16px',fontSize:'12px',color:'#f87171',lineHeight:'1.5',display:'flex',gap:'8px',alignItems:'flex-start'}}>
              <span style={{flexShrink:0,marginTop:'1px'}}>⚠️</span><span>{error}</span>
            </div>
          )}
          {success && (
            <div style={{background:'rgba(110,231,183,.08)',border:'1px solid rgba(110,231,183,.2)',borderRadius:'9px',padding:'11px 14px',marginBottom:'16px',fontSize:'12px',color:'#6ee7b7',lineHeight:'1.5',display:'flex',gap:'8px',alignItems:'flex-start'}}>
              <span style={{flexShrink:0,marginTop:'1px'}}>✅</span><span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:'10px'}}>

            {/* Email */}
            <div>
              <label style={{fontSize:'11px',fontWeight:'700',color:'#555',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:'6px'}}>Email</label>
              <input
                className="auth-input"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={e=>setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>

            {/* Contraseña */}
            {!isRecovery && (
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                  <label style={{fontSize:'11px',fontWeight:'700',color:'#555',textTransform:'uppercase',letterSpacing:'.06em'}}>Contraseña</label>
                  {mode==='login' && (
                    <button type="button" className="auth-link" onClick={()=>switchMode('recovery')} style={{fontSize:'11px'}}>
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div style={{position:'relative'}}>
                  <input
                    className="auth-input"
                    type={showPass?'text':'password'}
                    placeholder={isRegistro?'Mínimo 6 caracteres':'Tu contraseña'}
                    value={password}
                    onChange={e=>setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                    autoComplete={isRegistro?'new-password':'current-password'}
                    style={{paddingRight:'40px'}}
                  />
                  <button type="button" className="show-pass-btn" onClick={()=>setShowPass(!showPass)}>
                    <EyeIcon open={showPass}/>
                  </button>
                </div>
              </div>
            )}

            {/* Confirmar contraseña (solo registro) */}
            {isRegistro && (
              <div>
                <label style={{fontSize:'11px',fontWeight:'700',color:'#555',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:'6px'}}>Confirmar contraseña</label>
                <div style={{position:'relative'}}>
                  <input
                    className="auth-input"
                    type={showConf?'text':'password'}
                    placeholder="Repite tu contraseña"
                    value={confirm}
                    onChange={e=>setConfirm(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="new-password"
                    style={{paddingRight:'40px',borderColor:confirm&&confirm!==password?'rgba(248,113,113,.5)':undefined}}
                  />
                  <button type="button" className="show-pass-btn" onClick={()=>setShowConf(!showConf)}>
                    <EyeIcon open={showConf}/>
                  </button>
                </div>
                {confirm && confirm !== password && (
                  <div style={{fontSize:'11px',color:'#f87171',marginTop:'5px'}}>Las contraseñas no coinciden</div>
                )}
              </div>
            )}

            {/* Botón submit */}
            <button className="auth-btn-primary" type="submit" disabled={loading || (isRegistro && confirm !== password && confirm !== '')} style={{marginTop:'6px'}}>
              {loading
                ? <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
                    <span style={{width:'14px',height:'14px',borderRadius:'50%',border:'2px solid rgba(255,255,255,.3)',borderTop:'2px solid #fff',animation:'spin 1s linear infinite',display:'inline-block'}}/>
                    {isRegistro ? 'Creando cuenta...' : isRecovery ? 'Enviando...' : 'Iniciando sesión...'}
                  </span>
                : isRegistro ? 'Crear cuenta gratis'
                : isRecovery ? 'Enviar enlace de recuperación'
                : 'Iniciar sesión'}
            </button>
          </form>
        </div>

        {/* Footer del card */}
        {isRegistro && (
          <div style={{textAlign:'center',fontSize:'11px',color:'#444',lineHeight:'1.7',marginTop:'16px'}}>
            Al registrarte aceptas nuestros{' '}
            <a href="/terminos" style={{color:'#6366f1',textDecoration:'none'}}>Términos de uso</a>
            {' '}y{' '}
            <a href="/privacidad" style={{color:'#6366f1',textDecoration:'none'}}>Política de privacidad</a>
          </div>
        )}

        {!isRecovery && (
          <div style={{textAlign:'center',marginTop:'20px'}}>
            <a href="/planes" style={{fontSize:'12px',color:'#555',textDecoration:'none'}}>Ver planes y precios →</a>
          </div>
        )}
      </div>
    </div>
  )
}
