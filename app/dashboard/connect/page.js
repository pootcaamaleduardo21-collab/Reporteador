'use client'
import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

function ConnectContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('loading')
  const [accounts, setAccounts] = useState([])

  useEffect(() => {
    const data = searchParams.get('data')
    if (data) {
      try {
        const parsed = JSON.parse(decodeURIComponent(data))
        saveData(parsed)
      } catch(e) {
        setStatus('error')
      }
    } else {
      setStatus('error')
    }
  }, [])

  async function saveData({ token, expires, accounts }) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }

      const { error: tokenError } = await supabase.from('meta_tokens').upsert({
        user_id: user.id,
        access_token: token,
        token_expires_at: expires,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

      console.log('token save error:', tokenError)

      for (const acc of accounts) {
        const { error: accError } = await supabase.from('ad_accounts').upsert({
          user_id: user.id,
          account_id: acc.id,
          account_name: acc.name,
          platform: 'meta',
          is_active: acc.status === 1
        }, { onConflict: 'user_id,account_id' })
        console.log('acc save error:', accError)
      }

      setAccounts(accounts)
      setStatus('success')
    } catch(err) {
      console.log('error:', err)
      setStatus('error')
    }
  }

  return (
    <div style={{background:'#111116',border:'1px solid #2a2a35',borderRadius:'16px',padding:'48px',maxWidth:'480px',width:'100%',textAlign:'center'}}>
      {status === 'loading' && (
        <>
          <div style={{fontSize:'32px',marginBottom:'16px'}}>⏳</div>
          <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'800',marginBottom:'8px'}}>Conectando con Meta...</h2>
          <p style={{color:'#666',fontSize:'13px',fontFamily:'monospace'}}>Guardando tus cuentas de forma segura</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div style={{fontSize:'32px',marginBottom:'16px'}}>✅</div>
          <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'800',marginBottom:'8px'}}>Meta conectado</h2>
          <p style={{color:'#666',fontSize:'13px',marginBottom:'24px'}}>{accounts.length} cuentas encontradas</p>
          <div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'24px'}}>
            {accounts.map(acc => (
              <div key={acc.id} style={{background:'#18181f',border:'1px solid #2a2a35',borderRadius:'8px',padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{color:'#fff',fontSize:'13px',fontWeight:'600'}}>{acc.name}</span>
                <span style={{fontSize:'10px',fontFamily:'monospace',color:acc.status===1?'#6ee7b7':'#f87171'}}>
                  {acc.status===1?'ACTIVA':'PAUSADA'}
                </span>
              </div>
            ))}
          </div>
          <button onClick={()=>window.location.href='/dashboard'}
            style={{background:'#fff',color:'#0a0a0e',border:'none',padding:'12px 32px',borderRadius:'8px',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
            Ir al dashboard
          </button>
        </>
      )}
      {status === 'error' && (
        <>
          <div style={{fontSize:'32px',marginBottom:'16px'}}>❌</div>
          <h2 style={{color:'#fff',fontSize:'18px',fontWeight:'800',marginBottom:'8px'}}>Error al conectar</h2>
          <button onClick={()=>window.location.href='/dashboard'}
            style={{background:'#fff',color:'#0a0a0e',border:'none',padding:'12px 32px',borderRadius:'8px',fontSize:'13px',fontWeight:'700',cursor:'pointer'}}>
            Volver
          </button>
        </>
      )}
    </div>
  )
}

export default function Connect() {
  return (
    <main style={{minHeight:'100vh',background:'#0a0a0e',fontFamily:'Inter,sans-serif',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <Suspense fallback={<div style={{color:'#666'}}>Cargando...</div>}>
        <ConnectContent />
      </Suspense>
    </main>
  )
}
