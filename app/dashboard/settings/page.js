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
      // Load saved prefs
      const prefs = JSON.parse(localStorage.getItem('reporteador_prefs')||'{}')
      if (prefs.theme) setTheme(prefs.theme)
      if (prefs.language) setLanguage(prefs.language)
      if (prefs.currency) setCurrency(prefs.currency)
      if (prefs.defaultPeriod) setDefaultPeriod(prefs.defaultPeriod)
    }
    init()
  }, [])

  function savePrefs() {
    localStorage.setItem('reporteador_prefs', JSON.stringify({theme,language,currency,defaultPeriod}))
    setSaved(true)
    setTimeout(()=>setSaved(false), 2000)
  }

  const selectStyle = {background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.2)',color:'#a5b4fc',padding:'6px 10px',borderRadius:'7px',fontSize:'11px',outline:'none',cursor:'pointer',fontFamily:'"Plus Jakarta Sans",sans-serif'}
  const cardStyle = {background:'#17171d',border:'1px solid rgba(255,255,255,.07)',borderRadius:'12px',padding:'20px',marginBottom:'14px'}
  const rowStyle = {display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 0',borderBottom:'1px solid rgba(255,255,255,.05)'}
  const labelStyle = {fontSize:'12px',color:'#888',fontFamily:'"Plus Jakarta Sans",sans-serif'}
  const subStyle = {fontSize:'10px',color:'#333',marginTop:'2px',fontFamily:'"Plus Jakarta Sans",sans-serif'}

  return (
    <div style={{padding:'20px',maxWidth:'720px',fontFamily:'"Plus Jakarta Sans",sans-serif'}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>

        <div style={cardStyle}>
          <div style={{fontSize:'13px',fontWeight:'700',color:'#fff',marginBottom:'14px'}}>🎨 Apariencia</div>
          <div style={rowStyle}>
            <div><div style={labelStyle}>Tema</div><div style={subStyle}>Oscuro o claro</div></div>
            <select style={selectStyle} value={theme} onChange={e=>setTheme(e.target.value)}>
              <option>Oscuro</option><option>Claro</option>
            </select>
          </div>
          <div style={rowStyle}>
            <div><div style={labelStyle}>Idioma</div><div style={subStyle}>Idioma de la interfaz</div></div>
            <select style={selectStyle} value={language} onChange={e=>setLanguage(e.target.value)}>
              <option>Español</option><option>English</option><option>Português</option>
            </select>
          </div>
          <div style={{...rowStyle,borderBottom:'none'}}>
            <div><div style={labelStyle}>Moneda</div><div style={subStyle}>Para mostrar gastos</div></div>
            <select style={selectStyle} value={currency} onChange={e=>setCurrency(e.target.value)}>
              <option>MXN $</option><option>USD $</option><option>COP $</option><option>ARS $</option>
            </select>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{fontSize:'13px',fontWeight:'700',color:'#fff',marginBottom:'14px'}}>🔗 Cuentas conectadas</div>
          {accounts.map(acc=>(
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

        <div style={cardStyle}>
          <div style={{fontSize:'13px',fontWeight:'700',color:'#fff',marginBottom:'14px'}}>📊 Preferencias de datos</div>
          <div style={rowStyle}>
            <div><div style={labelStyle}>Periodo por defecto</div><div style={subStyle}>Al abrir un reporte</div></div>
            <select style={selectStyle} value={defaultPeriod} onChange={e=>setDefaultPeriod(e.target.value)}>
              <option>Este mes</option><option>7 dias</option><option>30 dias</option><option>Hoy</option>
            </select>
          </div>
          <div style={{...rowStyle,borderBottom:'none'}}>
            <div style={labelStyle}>Version</div>
            <span style={{fontSize:'10px',color:'#333',fontFamily:'monospace'}}>v1.0.0</span>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{fontSize:'13px',fontWeight:'700',color:'#fff',marginBottom:'14px'}}>ℹ️ Acerca de</div>
          <div style={rowStyle}>
            <div style={labelStyle}>Reporteador Ads</div>
            <span style={{fontSize:'10px',color:'#333',fontFamily:'monospace'}}>v1.0.0</span>
          </div>
          <div style={{...rowStyle,borderBottom:'none'}}>
            <div><div style={labelStyle}>Soporte</div></div>
            <span style={{fontSize:'10px',color:'#6366f1',fontFamily:'monospace'}}>Pro ✦</span>
          </div>
        </div>
      </div>

      <button onClick={savePrefs}
        style={{marginTop:'4px',padding:'10px 24px',borderRadius:'9px',background:saved?'rgba(110,231,183,.15)':'linear-gradient(135deg,#6366f1,#8b5cf6)',border:saved?'1px solid rgba(110,231,183,.3)':'none',color:saved?'#6ee7b7':'#fff',fontSize:'12px',fontWeight:'700',cursor:'pointer',fontFamily:'inherit',transition:'all .2s'}}>
        {saved ? '✓ Guardado' : 'Guardar cambios'}
      </button>
    </div>
  )
}
