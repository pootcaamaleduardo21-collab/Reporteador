'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function PlatformsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(null)

  const platforms = [
    {
      id: 'meta_ads',
      name: 'Meta Ads',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#1877f2">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      description: 'Facebook e Instagram Ads',
      accentColor: '#1877f2',
      bgGradient: 'linear-gradient(135deg,rgba(24,119,242,.12),rgba(24,119,242,.04))',
      connectUrl: '/api/auth/meta',
      connectLabel: 'Conectar con Facebook',
    },
    {
      id: 'google_ads',
      name: 'Google Ads',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      ),
      description: 'Search, Display y Shopping',
      accentColor: '#4285f4',
      bgGradient: 'linear-gradient(135deg,rgba(66,133,244,.12),rgba(66,133,244,.04))',
      connectUrl: '/api/auth/google-ads/login',
      connectLabel: 'Conectar con Google',
    },
    {
      id: 'tiktok_ads',
      name: 'TikTok Ads',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
        </svg>
      ),
      description: 'TikTok For Business',
      accentColor: '#ff0050',
      bgGradient: 'linear-gradient(135deg,rgba(255,0,80,.1),rgba(0,0,0,.04))',
      connectUrl: null, // coming soon
      connectLabel: 'Próximamente',
    },
  ]

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      const { data: accs } = await supabase.from('ad_accounts').select('*').eq('user_id', user.id)
      if (accs) setAccounts(accs)
      setLoading(false)
    }
    init()
  }, [])

  const getAccountsByPlatform = (pid) => accounts.filter(a => a.platform === pid)

  const handleConnect = (platform) => {
    if (!platform.connectUrl) return
    window.location.href = platform.connectUrl
  }

  const handleDisconnect = async (accountId) => {
    if (!confirm('¿Estás seguro de que quieres desconectar esta cuenta?')) return
    setDisconnecting(accountId)
    try {
      const { error } = await supabase.from('ad_accounts').delete().eq('account_id', accountId)
      if (error) throw error
      setAccounts(accounts.filter(a => a.account_id !== accountId))
    } catch (err) {
      alert('Error al desconectar la cuenta')
    }
    setDisconnecting(null)
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',gap:'10px',fontFamily:'"Plus Jakarta Sans",sans-serif'}}>
      <div style={{width:'20px',height:'20px',borderRadius:'50%',border:'2px solid rgba(99,102,241,.3)',borderTop:'2px solid #6366f1',animation:'spin 1s linear infinite'}}></div>
      <span style={{fontSize:'12px',color:'var(--text4)'}}>Cargando...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{padding:'24px',maxWidth:'960px',fontFamily:'"Plus Jakarta Sans",sans-serif'}}>
      <style>{`.plat-card:hover{border-color:rgba(255,255,255,.1)!important} .connect-btn:hover{opacity:.85} .disco-btn:hover{background:rgba(248,113,113,.1)!important;border-color:rgba(248,113,113,.3)!important;color:#f87171!important}`}</style>

      <div style={{marginBottom:'24px'}}>
        <h1 style={{fontSize:'20px',fontWeight:'800',color:'var(--text)',margin:'0 0 4px'}}>Plataformas</h1>
        <p style={{fontSize:'12px',color:'var(--text4)',margin:0}}>Conecta y administra tus cuentas de publicidad</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'16px',marginBottom:'32px'}}>
        {platforms.map(platform => {
          const connected = getAccountsByPlatform(platform.id)
          const isConnected = connected.length > 0
          const isSoon = !platform.connectUrl

          return (
            <div key={platform.id} className="plat-card"
              style={{background:'var(--sidebar)',border:`1px solid ${isConnected?platform.accentColor+'35':'var(--border)'}`,borderRadius:'14px',padding:'20px',display:'flex',flexDirection:'column',gap:'16px',transition:'border-color .2s'}}>

              {/* Header */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <div style={{width:'40px',height:'40px',borderRadius:'10px',background:platform.bgGradient,border:`1px solid ${platform.accentColor}25`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    {platform.icon}
                  </div>
                  <div>
                    <div style={{fontSize:'14px',fontWeight:'700',color:'var(--text)'}}>{platform.name}</div>
                    <div style={{fontSize:'10px',color:'var(--text4)'}}>{platform.description}</div>
                  </div>
                </div>
                {isSoon
                  ? <span style={{fontSize:'9px',color:'#fcd34d',background:'rgba(252,211,77,.08)',border:'1px solid rgba(252,211,77,.2)',padding:'3px 8px',borderRadius:'20px',fontWeight:'700',letterSpacing:'.05em'}}>PRONTO</span>
                  : isConnected
                    ? <span style={{fontSize:'9px',color:'#6ee7b7',background:'rgba(110,231,183,.08)',border:'1px solid rgba(110,231,183,.2)',padding:'3px 8px',borderRadius:'20px',fontWeight:'700',letterSpacing:'.05em'}}>CONECTADO</span>
                    : <span style={{fontSize:'9px',color:'#f87171',background:'rgba(248,113,113,.08)',border:'1px solid rgba(248,113,113,.2)',padding:'3px 8px',borderRadius:'20px',fontWeight:'700',letterSpacing:'.05em'}}>NO CONECTADO</span>
                }
              </div>

              {/* Cuentas conectadas */}
              {isConnected && (
                <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                  {connected.map(acc => (
                    <div key={acc.account_id}
                      style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px',background:'rgba(255,255,255,.03)',borderRadius:'8px',border:'1px solid rgba(255,255,255,.06)'}}>
                      <div style={{width:'6px',height:'6px',borderRadius:'50%',background:acc.is_active?'#6ee7b7':'#f87171',flexShrink:0}}></div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:'11px',fontWeight:'600',color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{acc.account_name||acc.account_id}</div>
                        <div style={{fontSize:'9px',color:'var(--text4)',fontFamily:'monospace'}}>{acc.account_id}</div>
                      </div>
                      <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                        <button
                          onClick={() => router.push('/dashboard/reportes/'+acc.account_id)}
                          style={{padding:'4px 9px',borderRadius:'5px',background:`rgba(${platform.accentColor.replace(/[^0-9,]/g,'')},.1)`,border:`1px solid ${platform.accentColor}30`,color:platform.accentColor==='#ff0050'?'#ff6090':platform.accentColor,fontSize:'10px',cursor:'pointer',fontFamily:'inherit',fontWeight:'600'}}>
                          Ver
                        </button>
                        <button className="disco-btn"
                          onClick={() => handleDisconnect(acc.account_id)}
                          disabled={disconnecting===acc.account_id}
                          style={{padding:'4px 8px',borderRadius:'5px',background:'transparent',border:'1px solid rgba(255,255,255,.08)',color:'var(--text4)',fontSize:'10px',cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
                          {disconnecting===acc.account_id?'...':'✕'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Botón conectar */}
              <button
                onClick={() => handleConnect(platform)}
                disabled={isSoon}
                className={isSoon?'':'connect-btn'}
                style={{
                  width:'100%',padding:'11px',borderRadius:'8px',
                  background: isSoon ? 'rgba(255,255,255,.03)' : isConnected ? 'rgba(255,255,255,.05)' : platform.accentColor,
                  border: isSoon ? '1px solid rgba(255,255,255,.08)' : isConnected ? `1px solid ${platform.accentColor}40` : 'none',
                  color: isSoon ? 'var(--text4)' : isConnected ? platform.accentColor==='#ff0050'?'#ff6090':platform.accentColor : '#fff',
                  fontSize:'12px',fontWeight:'700',cursor:isSoon?'not-allowed':'pointer',
                  fontFamily:'inherit',transition:'opacity .15s',
                }}>
                {isSoon ? 'Próximamente disponible' : isConnected ? `+ Agregar otra cuenta` : platform.connectLabel}
              </button>
            </div>
          )
        })}
      </div>

      {/* Info si hay cuentas */}
      {accounts.length > 0 && (
        <div style={{background:'rgba(99,102,241,.05)',border:'1px solid rgba(99,102,241,.15)',borderRadius:'10px',padding:'16px 20px',display:'flex',gap:'16px',alignItems:'flex-start'}}>
          <span style={{fontSize:'20px',flexShrink:0}}>💡</span>
          <div>
            <div style={{fontSize:'12px',fontWeight:'700',color:'var(--text)',marginBottom:'6px'}}>¿Qué sigue?</div>
            <ul style={{margin:0,paddingLeft:'16px',fontSize:'12px',color:'var(--text4)',lineHeight:'1.8'}}>
              <li>Haz clic en <strong style={{color:'var(--text)'}}>Ver</strong> junto a una cuenta para ver sus reportes completos</li>
              <li>Desde el <strong style={{color:'var(--text)'}}>Resumen</strong> puedes ver todas tus plataformas de un vistazo</li>
              <li>Puedes conectar múltiples cuentas de la misma plataforma</li>
            </ul>
          </div>
        </div>
      )}

      {accounts.length === 0 && (
        <div style={{background:'rgba(252,211,77,.05)',border:'1px solid rgba(252,211,77,.15)',borderRadius:'10px',padding:'16px 20px',display:'flex',gap:'16px',alignItems:'flex-start'}}>
          <span style={{fontSize:'20px',flexShrink:0}}>👆</span>
          <div>
            <div style={{fontSize:'12px',fontWeight:'700',color:'#fcd34d',marginBottom:'4px'}}>Empieza conectando Meta</div>
            <div style={{fontSize:'12px',color:'var(--text4)',lineHeight:'1.6'}}>
              Conecta tu cuenta de Facebook Ads para empezar a ver tus campañas, alcance, gastos y audiencia en un solo lugar.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
