'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { usePlan } from '../../lib/usePlan'
import { NICHES, DEFAULT_NICHE } from '../../lib/niches'

export default function SettingsPage() {
  const [accounts, setAccounts] = useState([])
  const [theme, setTheme] = useState('Oscuro')
  const [language, setLanguage] = useState('Español')
  const [currency, setCurrency] = useState('MXN $')
  const [defaultPeriod, setDefaultPeriod] = useState('Este mes')
  const [niche, setNiche] = useState(DEFAULT_NICHE)
  const [saved, setSaved] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const { plan, isPro } = usePlan()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: accs } = await supabase.from('ad_accounts').select('*').eq('user_id', user.id)
      if (accs) setAccounts(accs)
    }
    init()
    // Load saved prefs
    try {
      const prefs = JSON.parse(localStorage.getItem('kaan_prefs') || '{}')
      if (prefs.theme) setTheme(prefs.theme)
      if (prefs.language) setLanguage(prefs.language)
      if (prefs.currency) setCurrency(prefs.currency)
      if (prefs.defaultPeriod) setDefaultPeriod(prefs.defaultPeriod)
      if (prefs.niche) setNiche(prefs.niche)
    } catch(e) {}
  }, [])

  function handleThemeChange(val) {
    setTheme(val)
    if (val === 'Claro') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem('kaan_prefs', JSON.stringify({ theme, language, currency, defaultPeriod, niche }))
    } catch(e) {}
    if (theme === 'Claro') { document.documentElement.setAttribute('data-theme', 'light') } else { document.documentElement.removeAttribute('data-theme') }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleCancelSubscription() {
    setCancelLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const j = await res.json()
      if (j.url) { window.location.href = j.url }
      else { alert('No se pudo abrir el portal. Verifica que tengas una suscripción activa.') }
    } catch(e) { alert('Error al abrir el portal. Intenta de nuevo.') }
    setCancelLoading(false)
  }

  const sel = {
    background:'rgba(99,102,241,.12)',
    border:'1px solid rgba(99,102,241,.25)',
    color:'#a5b4fc',
    padding:'7px 12px',
    borderRadius:'7px',
    fontSize:'12px',
    outline:'none',
    cursor:'pointer',
    fontFamily:'"Plus Jakarta Sans",sans-serif',
    minWidth:'120px',
  }
  const card = { background:'#17171d', border:'1px solid rgba(255,255,255,.07)', borderRadius:'12px', padding:'20px', marginBottom:'14px' }
  const row = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 0', borderBottom:'1px solid rgba(255,255,255,.05)' }
  const lbl = { fontSize:'12px', color:'#888', fontFamily:'"Plus Jakarta Sans",sans-serif' }
  const sub = { fontSize:'10px', color:'#444', marginTop:'2px' }

  return (
    <div style={{padding:'20px',maxWidth:'740px',fontFamily:'"Plus Jakarta Sans",sans-serif'}}>

      <div style={{marginBottom:'20px'}}>
        <h1 style={{fontSize:'18px',fontWeight:'800',color:'var(--text)',margin:'0 0 4px'}}>Ajustes</h1>
        <p style={{fontSize:'12px',color:'var(--text4)',margin:0}}>Personaliza tu experiencia en Kaan</p>
      </div>

      {/* Live preview banner */}
      <div style={{background:'rgba(90,92,219,.08)',border:'1px solid rgba(110,108,240,.2)',borderRadius:'9px',padding:'10px 14px',marginBottom:'16px',fontSize:'12px',color:'#9096e0',display:'flex',alignItems:'center',gap:'8px'}}>
        <span>💡</span>
        El tema y el nicho se aplican de inmediato · Presiona <strong>Guardar cambios</strong> para que persistan
      </div>

      {/* ── Nicho (full width) ── */}
      <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:'14px',padding:'22px',marginBottom:'14px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
          <span style={{fontSize:'20px'}}>🏷️</span>
          <div>
            <div style={{fontSize:'14px',fontWeight:'800',color:'var(--text)'}}>Industria / Nicho</div>
            <div style={{fontSize:'12px',color:'var(--text3)',marginTop:'2px'}}>El Asistente IA y las tendencias se adaptan automáticamente a tu sector</div>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'8px',marginTop:'16px'}}>
          {NICHES.map(n => (
            <div key={n.id} onClick={() => setNiche(n.id)}
              style={{padding:'12px 8px',borderRadius:'10px',cursor:'pointer',textAlign:'center',transition:'all .15s',
                border:`1px solid ${niche===n.id?'rgba(110,108,240,.5)':'rgba(255,255,255,.07)'}`,
                background:niche===n.id?'rgba(90,92,219,.12)':'rgba(255,255,255,.02)',
                boxShadow:niche===n.id?'0 2px 10px rgba(90,92,219,.15)':'none'}}>
              <div style={{fontSize:'24px',marginBottom:'6px'}}>{n.emoji}</div>
              <div style={{fontSize:'11px',fontWeight:'700',color:niche===n.id?'#9096e0':'var(--text2)',lineHeight:'1.3'}}>{n.label}</div>
              <div style={{fontSize:'10px',color:'var(--text4)',marginTop:'3px',lineHeight:'1.3'}}>{n.desc}</div>
            </div>
          ))}
        </div>

        {/* Indicador del nicho activo */}
        <div style={{marginTop:'14px',padding:'10px 14px',borderRadius:'8px',background:'rgba(90,92,219,.06)',border:'1px solid rgba(110,108,240,.15)',display:'flex',alignItems:'center',gap:'8px'}}>
          <span style={{fontSize:'16px'}}>{NICHES.find(n=>n.id===niche)?.emoji}</span>
          <div>
            <span style={{fontSize:'12px',color:'var(--text3)'}}>Nicho activo: </span>
            <span style={{fontSize:'12px',fontWeight:'700',color:'#9096e0'}}>{NICHES.find(n=>n.id===niche)?.label}</span>
            <span style={{fontSize:'11px',color:'var(--text4)'}}> — {NICHES.find(n=>n.id===niche)?.desc}</span>
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>

        {/* Apariencia */}
        <div style={card}>
          <div style={{fontSize:'13px',fontWeight:'700',color:'#fff',marginBottom:'14px'}}>🎨 Apariencia</div>

          <div style={row}>
            <div>
              <div style={lbl}>Tema</div>
              <div style={sub}>Cambia entre oscuro y claro</div>
            </div>
            <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
              <button onClick={()=>handleThemeChange('Oscuro')}
                style={{padding:'6px 12px',borderRadius:'7px',border:'1px solid',fontSize:'11px',cursor:'pointer',fontFamily:'inherit',
                  borderColor:theme==='Oscuro'?'rgba(99,102,241,.5)':'rgba(255,255,255,.1)',
                  background:theme==='Oscuro'?'rgba(99,102,241,.15)':'transparent',
                  color:theme==='Oscuro'?'#a5b4fc':'#555',fontWeight:theme==='Oscuro'?'700':'400'}}>
                🌙 Oscuro
              </button>
              <button onClick={()=>handleThemeChange('Claro')}
                style={{padding:'6px 12px',borderRadius:'7px',border:'1px solid',fontSize:'11px',cursor:'pointer',fontFamily:'inherit',
                  borderColor:theme==='Claro'?'rgba(99,102,241,.5)':'rgba(255,255,255,.1)',
                  background:theme==='Claro'?'rgba(99,102,241,.15)':'transparent',
                  color:theme==='Claro'?'#a5b4fc':'#555',fontWeight:theme==='Claro'?'700':'400'}}>
                ☀️ Claro
              </button>
            </div>
          </div>

          <div style={row}>
            <div>
              <div style={lbl}>Idioma</div>
              <div style={sub}>Idioma de la interfaz</div>
            </div>
            <select style={sel} value={language} onChange={e=>setLanguage(e.target.value)}>
              <option>Español</option>
              <option>English</option>
              <option>Português</option>
            </select>
          </div>

          <div style={{...row,borderBottom:'none'}}>
            <div>
              <div style={lbl}>Moneda</div>
              <div style={sub}>Para mostrar los gastos</div>
            </div>
            <select style={sel} value={currency} onChange={e=>setCurrency(e.target.value)}>
              <option>MXN $</option>
              <option>USD $</option>
              <option>COP $</option>
              <option>ARS $</option>
            </select>
          </div>
        </div>

        {/* Cuentas conectadas */}
        <div style={card}>
          <div style={{fontSize:'13px',fontWeight:'700',color:'#fff',marginBottom:'14px'}}>🔗 Cuentas conectadas</div>
          <div style={{display:'flex',flexDirection:'column',gap:'5px',marginBottom:'12px'}}>
            {accounts.map(acc=>(
              <div key={acc.id} style={{display:'flex',alignItems:'center',gap:'8px',padding:'9px 10px',background:'rgba(255,255,255,.03)',borderRadius:'7px',border:'1px solid rgba(255,255,255,.05)'}}>
                <div style={{width:'6px',height:'6px',borderRadius:'50%',background:acc.is_active?'#6ee7b7':'#f87171',flexShrink:0}}></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'11px',fontWeight:'600',color:'#ccc',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{acc.account_name||acc.account_id}</div>
                  <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace'}}>{acc.account_id}</div>
                </div>
                <span style={{fontSize:'9px',color:acc.is_active?'#6ee7b7':'#f87171',background:acc.is_active?'rgba(110,231,183,.08)':'rgba(248,113,113,.08)',padding:'2px 7px',borderRadius:'20px',border:'1px solid '+(acc.is_active?'rgba(110,231,183,.2)':'rgba(248,113,113,.2)'),fontFamily:'monospace',flexShrink:0}}>
                  {acc.is_active?'ACTIVA':'PAUSADA'}
                </span>
              </div>
            ))}
          </div>
          <a href="/api/auth/meta" style={{display:'block',textAlign:'center',padding:'9px',borderRadius:'8px',background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.2)',color:'#a5b4fc',fontSize:'11px',fontWeight:'600',textDecoration:'none'}}>
            🔗 Reconectar Meta
          </a>
        </div>

        {/* Preferencias */}
        <div style={card}>
          <div style={{fontSize:'13px',fontWeight:'700',color:'#fff',marginBottom:'14px'}}>📊 Preferencias</div>
          <div style={row}>
            <div>
              <div style={lbl}>Periodo por defecto</div>
              <div style={sub}>Al abrir un reporte</div>
            </div>
            <select style={sel} value={defaultPeriod} onChange={e=>setDefaultPeriod(e.target.value)}>
              <option>Este mes</option>
              <option>7 dias</option>
              <option>30 dias</option>
              <option>Hoy</option>
            </select>
          </div>
          <div style={{...row,borderBottom:'none'}}>
            <div style={lbl}>Version</div>
            <span style={{fontSize:'10px',color:'#333',fontFamily:'monospace'}}>v1.0.0</span>
          </div>
        </div>

        {/* Acerca de */}
        <div style={card}>
          <div style={{fontSize:'13px',fontWeight:'700',color:'#fff',marginBottom:'14px'}}>ℹ️ Acerca de</div>
          <div style={row}>
            <div style={lbl}>Kaan</div>
            <span style={{fontSize:'10px',color:'#333',fontFamily:'monospace'}}>v1.0.0</span>
          </div>
          <div style={{...row,borderBottom:'none'}}>
            <div style={lbl}>Plan activo</div>
            <span style={{fontSize:'11px',color:isPro?'#6366f1':'#888',fontWeight:'700'}}>{isPro?'Pro ✦':'Free'}</span>
          </div>
          {!isPro && (
            <div style={{borderTop:'1px solid rgba(255,255,255,.05)',marginTop:'10px',paddingTop:'10px'}}>
              <a href="/planes" style={{display:'block',textAlign:'center',padding:'9px',borderRadius:'8px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',fontSize:'11px',fontWeight:'700',textDecoration:'none',marginBottom:'10px'}}>
                Actualizar a Pro →
              </a>
            </div>
          )}
          {isPro && (
            <div style={{borderTop:'1px solid rgba(255,255,255,.05)',marginTop:'10px',paddingTop:'10px'}}>
              <button onClick={handleCancelSubscription} disabled={cancelLoading}
                style={{display:'block',width:'100%',textAlign:'center',padding:'9px',borderRadius:'8px',background:'transparent',border:'1px solid rgba(248,113,113,.25)',color:'#f87171',fontSize:'11px',fontWeight:'600',cursor:'pointer',fontFamily:'inherit',opacity:cancelLoading?0.6:1}}>
                {cancelLoading ? 'Redirigiendo...' : '⚠ Cancelar suscripción'}
              </button>
              <div style={{fontSize:'10px',color:'#333',textAlign:'center',marginTop:'6px'}}>
                Se abrirá el portal de facturación de Stripe
              </div>
            </div>
          )}
          <div style={{borderTop:'1px solid rgba(255,255,255,.05)',marginTop:'10px',paddingTop:'10px',display:'flex',gap:'16px'}}>
            <a href="/privacidad" target="_blank" style={{fontSize:'11px',color:'#444',textDecoration:'none'}}>Política de privacidad</a>
            <a href="/terminos" target="_blank" style={{fontSize:'11px',color:'#444',textDecoration:'none'}}>Términos de uso</a>
          </div>
        </div>
      </div>

      <button onClick={savePrefs} style={{
        marginTop:'8px',padding:'11px 28px',borderRadius:'9px',
        background:saved?'rgba(110,231,183,.15)':'linear-gradient(135deg,#6366f1,#8b5cf6)',
        border:saved?'1px solid rgba(110,231,183,.3)':'none',
        color:saved?'#6ee7b7':'#fff',
        fontSize:'12px',fontWeight:'700',cursor:'pointer',
        fontFamily:'"Plus Jakarta Sans",sans-serif',
        transition:'all .2s',
      }}>
        {saved?'✓ Guardado':'Guardar cambios'}
      </button>
    </div>
  )
}
