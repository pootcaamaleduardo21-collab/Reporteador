'use client'
import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

function ConnectContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('loading')
  const [accounts, setAccounts] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    const data = searchParams.get('data')
    const errorParam = searchParams.get('error')

    if (errorParam === 'no_accounts') {
      setStatus('no_accounts')
      return
    }

    if (data) {
      try {
        const parsed = JSON.parse(decodeURIComponent(data))
        saveData(parsed)
      } catch(e) {
        setStatus('error')
        setError('Error al procesar datos')
      }
    } else {
      setStatus('error')
      setError('No se recibieron datos de Google')
    }
  }, [searchParams])

  async function saveData({ token, refreshToken, expiresAt, accounts }) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }

      // Los tokens y cuentas ya fueron guardados en el callback
      // Solo confirmamos el estado
      setAccounts(accounts)
      setStatus('success')
    } catch(err) {
      console.log('error:', err)
      setStatus('error')
      setError(err.message)
    }
  }

  return (
    <div style={{background:'#111116',border:'1px solid #2a2a35',borderRadius:'16px',padding:'48px',maxWidth:'600px',width:'100%',textAlign:'center',margin:'0 auto'}}>
      {status === 'loading' && (
        <>
          <div style={{fontSize:'32px',marginBottom:'16px',fontWeight:'bold'}}>⏳</div>
          <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'800',marginBottom:'8px'}}>Conectando con Google Ads...</h2>
          <p style={{color:'#666',fontSize:'13px',fontFamily:'monospace'}}>Buscando tus cuentas de forma segura</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div style={{fontSize:'32px',marginBottom:'16px',fontWeight:'bold'}}>✓</div>
          <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'800',marginBottom:'8px'}}>Google Ads Conectado</h2>
          <p style={{color:'#666',fontSize:'13px',marginBottom:'24px'}}>{accounts.length} cuenta(s) encontrada(s)</p>
          <div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'24px'}}>
            {accounts.map((acc, i) => (
              <div key={i} style={{background:'#18181f',border:'1px solid #2a2a35',borderRadius:'8px',padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{color:'#fff',fontSize:'13px',fontWeight:'600'}}>{acc.displayName}</span>
                <span style={{fontSize:'10px',fontFamily:'monospace',color:'#6ee7b7'}}>
                  {acc.isManager ? 'MANAGER' : 'ACTIVA'}
                </span>
              </div>
            ))}
          </div>
          <button onClick={()=>window.location.href='/dashboard'}
            style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',padding:'12px 32px',borderRadius:'8px',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
            Ir al Dashboard
          </button>
        </>
      )}
      {status === 'no_accounts' && (
        <>
          <div style={{fontSize:'32px',marginBottom:'16px',fontWeight:'bold'}}>⚠</div>
          <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'800',marginBottom:'8px'}}>Sin cuentas encontradas</h2>
          <p style={{color:'#666',fontSize:'13px',marginBottom:'24px'}}>
            No se encontraron cuentas de Google Ads. Asegúrate de tener acceso a Google Ads y que el Developer Token esté configurado.
          </p>
          <button onClick={()=>window.location.href='/dashboard/google-ads'}
            style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',padding:'12px 32px',borderRadius:'8px',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
            Volver a intentar
          </button>
        </>
      )}
      {status === 'error' && (
        <>
          <div style={{fontSize:'32px',marginBottom:'16px',fontWeight:'bold'}}>✕</div>
          <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'800',marginBottom:'8px'}}>Error al conectar</h2>
          <p style={{color:'#f87171',fontSize:'13px',marginBottom:'24px'}}>{error || 'Ocurrió un error durante la conexión'}</p>
          <button onClick={()=>window.location.href='/dashboard'}
            style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',padding:'12px 32px',borderRadius:'8px',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
            Volver al Dashboard
          </button>
        </>
      )}
    </div>
  )
}

export default function GoogleAdsConnect() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',padding:'20px'}}>
      <Suspense fallback={<div>Cargando...</div>}>
        <ConnectContent />
      </Suspense>
    </div>
  )
}
