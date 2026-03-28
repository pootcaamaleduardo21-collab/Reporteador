'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function MetaAdsPage() {
  const [loading, setLoading] = useState(true)
  const [hasToken, setHasToken] = useState(false)
  const [metaToken, setMetaToken] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [user, setUser] = useState(null)
  // Manual account ID entry
  const [manualId, setManualId] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState(null) // {ok, name, id, status}
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const success = searchParams.get('success')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)

      const [tokenRes, accsRes] = await Promise.all([
        supabase.from('meta_tokens').select('access_token').eq('user_id', user.id).single(),
        supabase.from('ad_accounts').select('*').eq('user_id', user.id).eq('platform', 'meta_ads'),
      ])

      const tok = tokenRes.data?.access_token || null
      const accs = accsRes.data || []

      setHasToken(!!tok)
      setMetaToken(tok)
      setAccounts(accs)

      // Si ya hay cuentas guardadas → ir directo al dashboard de reportes
      if (accs.length > 0) {
        router.push('/dashboard/reportes/' + accs[0].account_id)
        return
      }

      setLoading(false)
    }
    init()
  }, [])

  function connectMeta() {
    if (!user) return
    const state = btoa(JSON.stringify({ uid: user.id, ts: Date.now(), returnTo: '/dashboard/meta-ads' }))
    window.location.href = `/api/auth/meta?state=${encodeURIComponent(state)}`
  }

  async function verifyAccount() {
    if (!manualId.trim() || !metaToken) return
    setVerifying(true)
    setVerifyResult(null)
    try {
      const rawId = manualId.trim().replace(/^act_/i, '')
      const actId = `act_${rawId}`
      const res = await fetch(`https://graph.facebook.com/v21.0/${actId}?fields=id,name,account_status,currency&access_token=${metaToken}`)
      const j = await res.json()
      if (j.error) {
        setVerifyResult({ ok: false, error: j.error.message || 'No se pudo verificar la cuenta' })
      } else {
        setVerifyResult({ ok: true, id: actId, name: j.name || actId, status: j.account_status, currency: j.currency })
      }
    } catch (e) {
      setVerifyResult({ ok: false, error: 'Error de red al verificar' })
    }
    setVerifying(false)
  }

  async function saveAccount() {
    if (!verifyResult?.ok || !user) return
    setSaving(true)
    try {
      await supabase.from('ad_accounts').upsert(
        {
          user_id: user.id,
          account_id: verifyResult.id,
          account_name: verifyResult.name,
          platform: 'meta_ads',
          is_active: verifyResult.status === 1,
        },
        { onConflict: 'user_id,account_id' }
      )
      router.push('/dashboard/reportes/' + verifyResult.id)
    } catch (e) {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#555',fontSize:'12px',fontFamily:'monospace'}}>
      Verificando cuentas de Meta Ads...
    </div>
  )

  return (
    <div style={{padding:'32px',fontFamily:'"Plus Jakarta Sans",sans-serif',maxWidth:'640px'}}>

      {success === 'meta_connected' && (
        <div style={{background:'rgba(34,197,94,.08)',border:'1px solid rgba(34,197,94,.2)',borderRadius:'10px',padding:'12px 16px',marginBottom:'24px',display:'flex',alignItems:'center',gap:'10px'}}>
          <span style={{fontSize:'16px'}}>✅</span>
          <span style={{fontSize:'13px',color:'#4ade80'}}>Cuenta de Meta reconectada. No se detectaron cuentas de Ads automáticamente — usa el conector manual de abajo.</span>
        </div>
      )}

      <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'8px'}}>
        <div style={{width:'40px',height:'40px',borderRadius:'10px',background:'rgba(24,119,242,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px'}}>
          📊
        </div>
        <div>
          <h1 style={{margin:0,fontSize:'20px',fontWeight:'800',color:'#e0e0e0'}}>Meta Ads</h1>
          <p style={{margin:0,fontSize:'11px',color:'#555',fontFamily:'monospace'}}>Campañas · Conjuntos · Anuncios · Audiencias</p>
        </div>
      </div>

      <div style={{height:'1px',background:'rgba(255,255,255,.06)',marginBottom:'24px'}}></div>

      {hasToken && metaToken ? (
        <div>
          {/* Manual account connector — primary action */}
          <div style={{background:'rgba(99,102,241,.07)',border:'1px solid rgba(99,102,241,.25)',borderRadius:'12px',padding:'20px',marginBottom:'20px'}}>
            <div style={{fontSize:'13px',fontWeight:'700',color:'#a5b4fc',marginBottom:'4px'}}>Conectar cuenta de Ads Manager manualmente</div>
            <div style={{fontSize:'11px',color:'#666',marginBottom:'14px',lineHeight:'1.5'}}>
              Ingresa tu ID de cuenta publicitaria. Lo encuentras en Meta Ads Manager → menú superior izquierdo → tu nombre de cuenta (ej: <span style={{fontFamily:'monospace',color:'#888'}}>act_123456789</span>).
            </div>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'flex-start'}}>
              <input
                value={manualId}
                onChange={e=>setManualId(e.target.value)}
                placeholder="act_123456789"
                onKeyDown={e=>e.key==='Enter'&&verifyAccount()}
                style={{flex:1,minWidth:'180px',padding:'9px 12px',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.12)',borderRadius:'7px',color:'#e0e0e0',fontSize:'12px',fontFamily:'monospace',outline:'none'}}
              />
              <button onClick={verifyAccount} disabled={verifying||!manualId.trim()}
                style={{padding:'9px 16px',background:'rgba(99,102,241,.25)',border:'1px solid rgba(99,102,241,.4)',borderRadius:'7px',color:'#a5b4fc',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit',flexShrink:0,opacity:verifying||!manualId.trim()?0.5:1}}>
                {verifying ? 'Verificando…' : 'Verificar'}
              </button>
            </div>

            {verifyResult && (
              <div style={{marginTop:'12px',padding:'12px',background:verifyResult.ok?'rgba(110,231,183,.07)':'rgba(248,113,113,.07)',border:'1px solid '+(verifyResult.ok?'rgba(110,231,183,.2)':'rgba(248,113,113,.2)'),borderRadius:'8px'}}>
                {verifyResult.ok ? (
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',flexWrap:'wrap'}}>
                    <div>
                      <div style={{fontSize:'12px',fontWeight:'700',color:'#6ee7b7',marginBottom:'2px'}}>✓ Cuenta verificada</div>
                      <div style={{fontSize:'11px',color:'#888'}}>{verifyResult.name} · {verifyResult.id} · {verifyResult.currency}</div>
                      <div style={{fontSize:'10px',color:verifyResult.status===1?'#6ee7b7':'#f87171',marginTop:'2px'}}>
                        {verifyResult.status===1?'Cuenta activa':'Cuenta inactiva (status '+verifyResult.status+')'}
                      </div>
                    </div>
                    <button onClick={saveAccount} disabled={saving}
                      style={{padding:'8px 18px',background:'rgba(110,231,183,.2)',border:'1px solid rgba(110,231,183,.35)',borderRadius:'7px',color:'#6ee7b7',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit',flexShrink:0,opacity:saving?0.6:1}}>
                      {saving ? 'Conectando…' : 'Conectar y ver reportes →'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{fontSize:'12px',fontWeight:'700',color:'#f87171',marginBottom:'2px'}}>✗ No se pudo acceder a esta cuenta</div>
                    <div style={{fontSize:'11px',color:'#888',lineHeight:'1.5'}}>{verifyResult.error}</div>
                    <div style={{fontSize:'11px',color:'#666',marginTop:'6px'}}>Verifica que el ID sea correcto y que tu cuenta de Facebook tenga acceso a esa cuenta de Ads Manager.</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Secondary: reconnect via OAuth */}
          <div style={{background:'rgba(250,204,21,.04)',border:'1px solid rgba(250,204,21,.12)',borderRadius:'12px',padding:'16px',marginBottom:'16px'}}>
            <div style={{fontSize:'11px',fontWeight:'700',color:'#fbbf24',marginBottom:'6px'}}>¿Por qué no se detectaron las cuentas automáticamente?</div>
            <div style={{fontSize:'11px',color:'#666',lineHeight:'1.6',marginBottom:'12px'}}>
              La detección automática puede fallar si tu cuenta de Ads Manager está bajo un Business Manager de otra persona, si eres miembro del equipo (no administrador), o si la app está en modo desarrollo. Usa el conector manual de arriba como alternativa.
            </div>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
              <button onClick={connectMeta}
                style={{padding:'8px 16px',background:'rgba(24,119,242,.12)',border:'1px solid rgba(24,119,242,.3)',borderRadius:'7px',color:'#60a5fa',fontSize:'11px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>
                Reconectar con Facebook
              </button>
              <a href="https://adsmanager.facebook.com" target="_blank" rel="noopener noreferrer"
                style={{padding:'8px 16px',background:'transparent',border:'1px solid rgba(255,255,255,.08)',borderRadius:'7px',color:'#555',fontSize:'11px',fontWeight:'600',cursor:'pointer',textDecoration:'none',display:'inline-flex',alignItems:'center',gap:'4px'}}>
                Abrir Ads Manager ↗
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* Sin token — necesitan conectar Meta primero */
        <div>
          <div style={{background:'rgba(99,102,241,.06)',border:'1px solid rgba(99,102,241,.2)',borderRadius:'12px',padding:'20px',marginBottom:'20px'}}>
            <div style={{fontSize:'13px',fontWeight:'700',color:'#a5b4fc',marginBottom:'6px'}}>Conecta tu cuenta de Facebook primero</div>
            <div style={{fontSize:'12px',color:'#777',lineHeight:'1.6'}}>
              Para conectar Meta Ads necesitas primero autorizar el acceso a tu cuenta de Facebook.
            </div>
          </div>
          <button onClick={connectMeta}
            style={{padding:'12px 24px',background:'rgba(24,119,242,.9)',border:'none',borderRadius:'8px',color:'#fff',fontSize:'13px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit'}}>
            Conectar con Facebook
          </button>
        </div>
      )}
    </div>
  )
}
