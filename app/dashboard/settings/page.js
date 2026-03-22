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
    }
    init()
    // Load saved prefs
    try {
      const prefs = JSON.parse(localStorage.getItem('reporteador_prefs') || '{}')
      if (prefs.theme) setTheme(prefs.theme)
      if (prefs.language) setLanguage(prefs.language)
      if (prefs.currency) setCurrency(prefs.currency)
      if (prefs.defaultPeriod) setDefaultPeriod(prefs.defaultPeriod)
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
      localStorage.setItem('reporteador_prefs', JSON.stringify({ theme, language, currency, defaultPeriod }))
    } catch(e) {}
    if (theme === 'Claro') { document.documentElement.setAttribute('data-theme', 'light') } else { document.documentElement.removeAttribute('data-theme') }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
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

      {/* Live preview banner */}
      <div style={{background:'rgba(99,102,241,.08)',border:'1px solid rgba(99,102,241,.2)',borderRadius:'9px',padding:'10px 14px',marginBottom:'16px',fontSize:'11px',color:'#a5b4fc',fontFamily:'monospace',display:'flex',alignItems:'center',gap:'8px'}}>
        <span>💡</span>
        Los cambios de tema se aplican en tiempo real — guarda para que persistan al recargar
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
            <div style={lbl}>Reporteador Ads</div>
            <span style={{fontSize:'10px',color:'#333',fontFamily:'monospace'}}>v1.0.0</span>
          </div>
          <div style={{...row,borderBottom:'none'}}>
            <div style={lbl}>Plan activo</div>
            <span style={{fontSize:'11px',color:'#6366f1',fontWeight:'700'}}>Pro ✦</span>
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
