'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function DashboardHome() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: accs } = await supabase.from('ad_accounts').select('*').eq('user_id', user.id)
      if (accs && accs.length > 0) {
        setAccounts(accs)
        // Auto-redirect to first active account
        const active = accs.find(a=>a.is_active) || accs[0]
        router.replace('/dashboard/reportes/' + active.account_id)
      }
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#333',fontFamily:'monospace',fontSize:'12px'}}>
      Cargando...
    </div>
  )

  if (accounts.length === 0) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',padding:'40px'}}>
      <div style={{fontSize:'48px',marginBottom:'20px'}}>📊</div>
      <h2 style={{color:'#fff',fontSize:'20px',fontWeight:'800',marginBottom:'10px',fontFamily:'"Plus Jakarta Sans",sans-serif'}}>Conecta tu primera cuenta</h2>
      <p style={{color:'#444',fontSize:'12px',marginBottom:'32px',fontFamily:'monospace',textAlign:'center'}}>Conecta tus cuentas de Meta Ads para empezar a ver tus metricas</p>
      <a href="/api/auth/meta" style={{display:'inline-flex',alignItems:'center',gap:'10px',background:'#1877f2',color:'#fff',padding:'12px 24px',borderRadius:'9px',fontSize:'13px',fontWeight:'700',textDecoration:'none',fontFamily:'"Plus Jakarta Sans",sans-serif'}}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        Conectar con Facebook
      </a>
    </div>
  )

  return null
}
