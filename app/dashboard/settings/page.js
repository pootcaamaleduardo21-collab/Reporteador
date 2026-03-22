'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function SettingsPage() {
  const [accounts, setAccounts] = useState([])
  const [theme, setTheme] = useState('Oscuro')
  const [language, setLanguage] = useState('Español')
  const [currency, setCurrency] = useState('MXN $')
  const [defaultPeriod, setDefaultPeriod] = useState('Este mes')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: accs } = await supabase.from('ad_accounts').select('*').eq('user_id', user.id)
      if (accs) setAccounts(accs)
      const prefs = JSON.parse(localStorage.getItem('reporteador_prefs') || '{}')
      if (prefs.theme) { setTheme(prefs.theme); applyTheme(prefs.theme) }
      if (prefs.language) setLanguage(prefs.language)
      if (prefs.currency) setCurrency(prefs.currency)
      if (prefs.defaultPeriod) setDefaultPeriod(prefs.defaultPeriod)
    }
    init()
  }, [])

  function applyTheme(t) {
    if (t === 'Claro') {
      document.documentElement.style.setProperty('--bg-override', '#f0f0f5')
      document.body.style.background = '#f0f0f5'
      document.body.style.color = '#0c0c10'
    } else {
      document.documentElement.style.removeProperty('--bg-override')
      document.body.style.background = '#0c0c10'
      document.body.style.color = '#fff'
    }
  }

  function handleThemeChange(val) {
    setTheme(val)
    applyTheme(val)
  }

  function savePrefs() {
    const prefs = { theme, language, currency, defaultPeriod }
    localStorage.setItem('reporteador_prefs', JSON.stringify(prefs))
    applyTheme(theme)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const sel = {
    background:'rgba(99,102,241,.1)',
    border:'1px solid rgba(99,102,241,.25)',
    color:'#a5b4fc',
    padding:'6px 10px',
    borderRadius:'7px',
    fontSize:'11px',
    outline:'none',
    cursor:'pointer',
    fontFamily:'"Plus Jakarta Sans",sans-serif',
    minWidth:'110px',
  }
  const card = {
    background:'#17171d',
    border:'1px solid rgba(255,255,255,.07)',
    borderRadius:'12px',
    padding:'20px',
    marginBottom:'14px',
  }
  const row = {
    display:'flex',alignItems:'center',justifyContent:'space-between',
    padding:'11px 0',borderBottom:'1px solid rgba(255,255,255,.05)',
  }
  const lbl = { fontSize:'12px', color:'#888', fontFamily:'"Plus Jakarta Sans",sans-serif' }
  const sub = { fontSize:'10px', color:'#333', marginTop:'2px' }

  return (
    <div style={{padding:'20px',maxWidth:'720px',fontFamily:'"Plus Jakarta Sans",sans-serif'}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>

        {/* Apariencia */}
        <div style={card}>
          <div style={{fontSize:'13px',fontWeight:'700',color:'#fff',marginBottom:'14px'}}>🎨 Apariencia</div>
          <div style={row}>
            <div><div style={lbl}>Tema</div><div style={sub}>Oscuro o claro</div></div>
            <select style={sel} value={theme} onChange={e=>handleThemeChange(e.target.value)}>
              <option>Oscuro</option>
              <option>Claro</option>
            </select>
          </div>
          <div style={row}>
            <div><div style={lbl}>Idioma</div><div style={sub}>Idioma de la interfaz</div></div>
            <select style={sel} value={language} onChange={e=>setLanguage(e.target.value)}>
              <option>Español</option>
              <option>English</option>
              <option>Português</option>
            </select>
          </div>
          <div style={{...row,borderBottom:'none'}}>
            <div><div style={lbl}>Moneda</div><div style={sub}>Para mostrar gastos</div></div>
            <select style={sel} value={currency} onChange={e=>setCurrency(e.target.value)}>
              <option>MXN $</option>
              <option>USD $</option>
              <option>COP $</option>
              <option>ARS $</option>
            </select>
          </div>
        </div>

        {/* Cuentas */}
        <div style={card}>
          <div style={{fontSize:'13px',fontWeight:'700',color:'#fff',marginBottom:'14px'}}>🔗 Cuentas conectadas</div>
          {accounts.map(acc => (
            <div key={acc.id} style={{display:'flex',alignItems:'center',gap:'8px',padding:'9px 10px',background:'rgba(255,255,255,.03)',borderRadius:'7px',border:'1px solid rgba(255,255,255,.05)',marginBottom:'5px'}}>
              <div style={{width:'6px',height:'6px',borderRadius:'50%',background:acc.is_active?'#6ee7b7':'#f87171',flexShrink:0}}></div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'11px',fontWeight:'600',color:'#ccc',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{acc.account_name||acc.account_id}</div>
                <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace'}}>{acc.account_id}</div>
              </div>
              <span style={{fontSize:'9px',color:acc.is_active?'#6ee7b7':'#f87171',background:acc.is_active?'rgba(110,231,183,.08)':'rgba(248,113,113,.08)',padding:'2px 7px',borderRadius:'20px',border:'1px solid '+(acc.is_active?'rgba(110,231,183,.2)':'rgba(248,113,113,.2)'),fontFamily:'monospace'}}>
                {acc.is_active?'ACTIVA':'PAUSADA'}
              </span>
            </div>
          ))}
          <a href="/api/auth/meta" style={{display:'block',textAlign:'center',marginTop:'10px',padding:'9px',borderRadius:'8px',background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.2)',color:'#a5b4fc',fontSize:'11px',fontWeight:'600',textDecoration:'none'}}>
            🔗 Reconectar Meta
          </a>
        </div>

        {/* Preferencias */}
        <div style={card}>
          <div style={{fontSize:'13px',fontWeight:'700',color:'#fff',marginBottom:'14px'}}>📊 Preferencias</div>
          <div style={row}>
            <div><div style={lbl}>Periodo por defecto</div><div style={sub}>Al abrir un reporte</div></div>
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
            <div style={lbl}>Reporteador Ads</div>
            <span style={{fontSize:'10px',color:'#333',fontFamily:'monospace'}}>v1.0.0</span>
          </div>
          <div style={{...row,borderBottom:'none'}}>
            <div style={lbl}>Plan</div>
            <span style={{fontSize:'10px',color:'#6366f1',fontWeight:'700'}}>Pro ✦</span>
          </div>
        </div>
      </div>

      {/* Save button */}
      <button onClick={savePrefs} style={{
        marginTop:'4px',padding:'11px 28px',borderRadius:'9px',
        background: saved ? 'rgba(110,231,183,.15)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        border: saved ? '1px solid rgba(110,231,183,.3)' : 'none',
        color: saved ? '#6ee7b7' : '#fff',
        fontSize:'12px',fontWeight:'700',cursor:'pointer',
        fontFamily:'"Plus Jakarta Sans",sans-serif',
        transition:'all .2s',
      }}>
        {saved ? '✓ Cambios guardados' : 'Guardar cambios'}
      </button>

      {saved && (
        <div style={{marginTop:'10px',fontSize:'11px',color:'#444',fontFamily:'monospace'}}>
          Recarga la pagina para ver todos los cambios aplicados
        </div>
      )}
    </div>
  )
}
