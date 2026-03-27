'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function PlatformsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  const platforms = [
    {
      id: 'meta_ads',
      name: 'Meta Ads',
      icon: 'f',
      description: 'Facebook e Instagram Ads',
      color: '#1877f2',
      connectUrl: '/api/auth/meta'
    },
    {
      id: 'google_ads',
      name: 'Google Ads',
      icon: 'G',
      description: 'Google Search, Display y Shopping',
      color: '#4285f4',
      connectUrl: '/api/auth/google-ads/login'
    },
    {
      id: 'tiktok_ads',
      name: 'TikTok Ads',
      icon: '⟲',
      description: 'TikTok For Business',
      color: '#000000',
      connectUrl: '/api/auth/tiktok-ads/login'
    }
  ]

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)

      const { data: accs } = await supabase
        .from('ad_accounts')
        .select('*')
        .eq('user_id', user.id)

      if (accs) setAccounts(accs)
      setLoading(false)
    }
    init()
  }, [])

  const getAccountsByPlatform = (platform) => {
    return accounts.filter(a => a.platform === platform)
  }

  const handleConnect = (platform) => {
    const connectUrl = platforms.find(p => p.id === platform)?.connectUrl
    if (connectUrl) window.location.href = connectUrl
  }

  const handleDisconnect = async (accountId) => {
    if (!confirm('¿Estás seguro de que quieres desconectar esta cuenta?')) return

    setDisconnecting(true)
    try {
      const { error } = await supabase
        .from('ad_accounts')
        .delete()
        .eq('account_id', accountId)

      if (error) throw error

      setAccounts(accounts.filter(a => a.account_id !== accountId))
    } catch (err) {
      console.error('Error al desconectar:', err)
      alert('Error al desconectar la cuenta')
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#888', fontFamily: 'monospace', fontSize: '12px' }}>
        Cargando plataformas...
      </div>
    )
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px', color: 'var(--text)' }}>
          Conectar Plataformas
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text4)', marginBottom: '24px' }}>
          Conecta tus cuentas de publicidad para ver análisis consolidados
        </p>
      </div>

      {/* Grid de plataformas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        {platforms.map(platform => {
          const connectedAccounts = getAccountsByPlatform(platform.id)
          const isConnected = connectedAccounts.length > 0

          return (
            <div
              key={platform.id}
              style={{
                background: 'var(--card-bg, #111116)',
                border: `2px solid ${isConnected ? platform.color + '40' : '#2a2a35'}`,
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all .3s ease'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: platform.color + '20',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    fontWeight: 'bold',
                    color: platform.color
                  }}
                >
                  {platform.icon}
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)' }}>
                    {platform.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text4)' }}>
                    {platform.description}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div
                style={{
                  background: isConnected ? 'rgba(110,231,183,.08)' : 'rgba(248,113,113,.08)',
                  border: `1px solid ${isConnected ? 'rgba(110,231,183,.2)' : 'rgba(248,113,113,.2)'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  fontSize: '12px',
                  color: isConnected ? '#6ee7b7' : '#f87171'
                }}
              >
                {isConnected ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>✓</span>
                    <span>{connectedAccounts.length} cuenta{connectedAccounts.length !== 1 ? 's' : ''} conectada{connectedAccounts.length !== 1 ? 's' : ''}</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>○</span>
                    <span>No conectada</span>
                  </div>
                )}
              </div>

              {/* Cuentas conectadas */}
              {isConnected && (
                <div style={{ marginBottom: '16px', flex: 1 }}>
                  <div style={{ fontSize: '10px', color: '#555', fontFamily: 'monospace', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Cuentas:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {connectedAccounts.map(acc => (
                      <div
                        key={acc.account_id}
                        style={{
                          background: '#18181f',
                          border: '1px solid #2a2a35',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          fontSize: '11px',
                          color: '#aaa',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {acc.account_name || acc.account_id}
                        </span>
                        <button
                          onClick={() => handleDisconnect(acc.account_id)}
                          disabled={disconnecting}
                          style={{
                            background: 'transparent',
                            border: '1px solid #555',
                            color: '#888',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '9px',
                            flexShrink: 0
                          }}
                        >
                          {disconnecting ? '...' : '✕'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botones */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleConnect(platform.id)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: platform.color + (isConnected ? '20' : ''),
                    border: `1px solid ${platform.color}`,
                    color: platform.color,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    transition: 'all .2s'
                  }}
                >
                  {isConnected ? 'Agregar otra' : 'Conectar'}
                </button>
                {isConnected && (
                  <button
                    onClick={() => router.push('/dashboard/reportes/' + connectedAccounts[0].account_id)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: 'rgba(99,102,241,.12)',
                      border: '1px solid rgba(99,102,241,.25)',
                      color: '#a5b4fc',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}
                  >
                    Ver reportes
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Info */}
      {accounts.length > 0 && (
        <div
          style={{
            background: 'rgba(99,102,241,.05)',
            border: '1px solid rgba(99,102,241,.15)',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '12px',
            color: '#888'
          }}
        >
          <div style={{ marginBottom: '8px', fontWeight: '600', color: 'var(--text)' }}>
            💡 Próximos pasos:
          </div>
          <ul style={{ margin: '0 0 0 20px', lineHeight: '1.6' }}>
            <li>Selecciona una cuenta en el dashboard para ver sus reportes</li>
            <li>Conecta múltiples cuentas de una misma plataforma si lo necesitas</li>
            <li>Los reportes se actualizan automáticamente cada hora</li>
          </ul>
        </div>
      )}
    </div>
  )
}
