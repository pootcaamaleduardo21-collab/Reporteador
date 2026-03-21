'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [metaConnected, setMetaConnected] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { window.location.href = '/'; return }
      setUser(data.user)
      const { data: accs } = await supabase.from('ad_accounts').select('*')
      if (accs && accs.length > 0) {
        setAccounts(accs)
        setMetaConnected(true)
      }
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

      <div style={{padding:'48px 36px',maxWidth:'900px',margin:'0 auto'}}>
        {!metaConnected ? (
          <div style={{textAlign:'center',padding:'80px 0'}}>
            <div style={{fontSize:'48px',marginBottom:'24px'}}>📊</div>
            <h1 style={{color:'#fff',fontSize:'24px',fontWeight:'800',marginBottom:'12px'}}>Conecta tu cuenta de Meta Ads</h1>
            <p style={{color:'#666',fontSize:'14px',marginBottom:'40px',fontFamily:'monospace'}}>
              Conecta tus cuentas publicitarias para ver tus metricas en tiempo real
            </p>
            <a href="/api/auth/meta"
              style={{display:'inline-flex',alignItems:'center',gap:'10px',background:'#1877f2',color:'#fff',padding:'14px 32px',borderRadius:'10px',fontSize:'14px',fontWeight:'700',textDecoration:'none'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Conectar con Facebook
            </a>
          </div>
        ) : (
          <div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'32px'}}>
              <h1 style={{color:'#fff',fontSize:'22px',fontWeight:'800'}}>Tus cuentas</h1>
              <a href="/api/auth/meta"
                style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'rgba(24,119,242,.15)',color:'#5ba3f5',padding:'8px 16px',borderRadius:'8px',fontSize:'12px',fontWeight:'600',textDecoration:'none',border:'1px solid rgba(24,119,242,.3)'}}>
                Reconectar Meta
              </a>
            </div>
            <div style={{display:'grid',gap:'12px'}}>
              {accounts.map(acc => (
                <div key={acc.id} style={{background:'#111116',border:'1px solid #2a2a35',borderRadius:'12px',padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div>
                    <div style={{color:'#fff',fontSize:'15px',fontWeight:'700',marginBottom:'4px'}}>{acc.account_name}</div>
                    <div style={{color:'#666',fontSize:'11px',fontFamily:'monospace'}}>{acc.account_id}</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                    <span style={{fontSize:'10px',fontFamily:'monospace',color:acc.is_active?'#6ee7b7':'#f87171',background:acc.is_active?'rgba(110,231,183,.08)':'rgba(248,113,113,.08)',padding:'4px 10px',borderRadius:'20px',border:`1px solid ${acc.is_active?'rgba(110,231,183,.2)':'rgba(248,113,113,.2)'}`}}>
                      {acc.is_active?'ACTIVA':'PAUSADA'}
                    </span>
                    <button onClick={()=>window.location.href='/dashboard/reportes/'+acc.account_id}
                      style={{background:'#fff',color:'#0a0a0e',border:'none',padding:'8px 16px',borderRadius:'8px',fontSize:'11px',fontWeight:'700',cursor:'pointer',fontFamily:'monospace'}}>
                      Ver reportes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
