'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function traducirError(msg = '') {
  if (msg.includes('Token has expired') || msg.includes('token expired')) return 'El enlace expiró. Solicita uno nuevo desde la página de login.'
  if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.'
  if (msg.includes('same password'))               return 'La nueva contraseña no puede ser igual a la actual.'
  if (msg.includes('network'))                     return 'Error de conexión. Verifica tu internet.'
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

export default function ResetPasswordPage() {
  const [status, setStatus]       = useState('loading') // loading | ready | success | invalid
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [showConf, setShowConf]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    // Supabase envía el usuario de vuelta con tokens en el hash o en la sesión.
    // Al detectar el evento PASSWORD_RECOVERY queda listo para actualizar.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setStatus('ready')
      } else if (event === 'SIGNED_IN' && session) {
        // Supabase v2 puede mandar SIGNED_IN en vez de PASSWORD_RECOVERY
        setStatus('ready')
      }
    })

    // Fallback: si ya hay sesión activa al cargar (token ya procesado)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setStatus('ready')
      else {
        // Si después de 3s no hay sesión, el enlace es inválido o ya fue usado
        setTimeout(() => {
          setStatus(prev => prev === 'loading' ? 'invalid' : prev)
        }, 3000)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }
    if (password.length < 6)  { setError('La contraseña debe tener al menos 6 caracteres.'); return }

    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setStatus('success')
      setTimeout(() => window.location.href = '/registro?mode=login', 3000)
    } catch(e) {
      setError(traducirError(e.message))
    }
    setLoading(false)
  }

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
        .auth-btn{width:100%;padding:13px;border-radius:10px;border:none;cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;transition:opacity .15s;}
        .auth-btn:hover:not(:disabled){opacity:.88;}
        .auth-btn:disabled{opacity:.55;cursor:not-allowed;}
        .show-pass-btn{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:transparent;border:none;color:#555;cursor:pointer;padding:0;display:flex;align-items:center;}
        .show-pass-btn:hover{color:#888;}
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
        </div>

        {/* Estado: loading */}
        {status === 'loading' && (
          <div style={{textAlign:'center',padding:'40px 0'}}>
            <div style={{width:'28px',height:'28px',borderRadius:'50%',border:'3px solid rgba(99,102,241,.2)',borderTop:'3px solid #6366f1',animation:'spin 1s linear infinite',margin:'0 auto 16px'}}/>
            <div style={{fontSize:'13px',color:'#555'}}>Verificando enlace...</div>
          </div>
        )}

        {/* Estado: inválido */}
        {status === 'invalid' && (
          <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'16px',padding:'32px 28px',textAlign:'center'}}>
            <div style={{fontSize:'40px',marginBottom:'16px'}}>🔗</div>
            <div style={{fontSize:'16px',fontWeight:'800',color:'#fff',marginBottom:'8px'}}>Enlace inválido o expirado</div>
            <div style={{fontSize:'13px',color:'#555',lineHeight:'1.6',marginBottom:'24px'}}>
              Este enlace de recuperación ya fue usado o expiró. Solicita uno nuevo desde la página de inicio de sesión.
            </div>
            <a href="/registro?mode=recovery"
              style={{display:'inline-block',padding:'12px 24px',borderRadius:'10px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',textDecoration:'none',fontSize:'13px',fontWeight:'700'}}>
              Solicitar nuevo enlace
            </a>
          </div>
        )}

        {/* Estado: listo para cambiar contraseña */}
        {status === 'ready' && (
          <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.08)',borderRadius:'16px',padding:'28px 28px 24px'}}>
            <div style={{marginBottom:'22px'}}>
              <div style={{fontSize:'16px',fontWeight:'800',color:'#fff',marginBottom:'6px'}}>Nueva contraseña</div>
              <div style={{fontSize:'12px',color:'#555'}}>Elige una contraseña segura. Mínimo 6 caracteres.</div>
            </div>

            {error && (
              <div style={{background:'rgba(248,113,113,.08)',border:'1px solid rgba(248,113,113,.2)',borderRadius:'9px',padding:'11px 14px',marginBottom:'16px',fontSize:'12px',color:'#f87171',display:'flex',gap:'8px',alignItems:'flex-start'}}>
                <span>⚠️</span><span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              <div>
                <label style={{fontSize:'11px',fontWeight:'700',color:'#555',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:'6px'}}>Nueva contraseña</label>
                <div style={{position:'relative'}}>
                  <input
                    className="auth-input"
                    type={showPass?'text':'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={e=>setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                    autoComplete="new-password"
                    style={{paddingRight:'40px'}}
                  />
                  <button type="button" className="show-pass-btn" onClick={()=>setShowPass(!showPass)}>
                    <EyeIcon open={showPass}/>
                  </button>
                </div>
              </div>

              <div>
                <label style={{fontSize:'11px',fontWeight:'700',color:'#555',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:'6px'}}>Confirmar contraseña</label>
                <div style={{position:'relative'}}>
                  <input
                    className="auth-input"
                    type={showConf?'text':'password'}
                    placeholder="Repite la nueva contraseña"
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

              {/* Indicador de fortaleza */}
              {password.length > 0 && (
                <div>
                  <div style={{display:'flex',gap:'4px',marginBottom:'4px'}}>
                    {[1,2,3,4].map(i=>{
                      const strength = Math.min(Math.floor(password.length/3),4)
                      const color = strength>=4?'#6ee7b7':strength>=3?'#a78bfa':strength>=2?'#fcd34d':'#f87171'
                      return <div key={i} style={{flex:1,height:'3px',borderRadius:'2px',background:i<=strength?color:'rgba(255,255,255,.08)',transition:'background .2s'}}/>
                    })}
                  </div>
                  <div style={{fontSize:'10px',color:'#444'}}>
                    {password.length<6?'Muy corta':password.length<9?'Regular':password.length<12?'Buena':'Muy segura'}
                  </div>
                </div>
              )}

              <button className="auth-btn" type="submit" disabled={loading||(confirm!==''&&confirm!==password)} style={{marginTop:'4px'}}>
                {loading
                  ? <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
                      <span style={{width:'14px',height:'14px',borderRadius:'50%',border:'2px solid rgba(255,255,255,.3)',borderTop:'2px solid #fff',animation:'spin 1s linear infinite',display:'inline-block'}}/>
                      Guardando...
                    </span>
                  : 'Cambiar contraseña'}
              </button>
            </form>
          </div>
        )}

        {/* Estado: éxito */}
        {status === 'success' && (
          <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(110,231,183,.2)',borderRadius:'16px',padding:'32px 28px',textAlign:'center'}}>
            <div style={{fontSize:'44px',marginBottom:'16px'}}>🎉</div>
            <div style={{fontSize:'16px',fontWeight:'800',color:'#6ee7b7',marginBottom:'8px'}}>¡Contraseña actualizada!</div>
            <div style={{fontSize:'13px',color:'#555',lineHeight:'1.6',marginBottom:'24px'}}>
              Tu contraseña se cambió correctamente. Te redirigimos al login en unos segundos...
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
              <div style={{width:'16px',height:'16px',borderRadius:'50%',border:'2px solid rgba(110,231,183,.3)',borderTop:'2px solid #6ee7b7',animation:'spin 1s linear infinite'}}/>
              <span style={{fontSize:'12px',color:'#555'}}>Redirigiendo...</span>
            </div>
          </div>
        )}

        <div style={{textAlign:'center',marginTop:'24px'}}>
          <a href="/registro?mode=login" style={{fontSize:'12px',color:'#444',textDecoration:'none'}}>← Volver al inicio de sesión</a>
        </div>
      </div>
    </div>
  )
}
