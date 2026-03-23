'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { usePlan } from '../lib/usePlan'

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [stripOpen, setStripOpen] = useState(false)
  const [reportsOpen, setReportsOpen] = useState(true)
  const router = useRouter()
  const { isPro } = usePlan()
  const pathname = usePathname()

  useEffect(() => {
    // Apply saved theme on load
    const prefs = JSON.parse(localStorage.getItem('reporteador_prefs') || '{}')
    if (prefs.theme === 'Claro') {
      document.body.style.background = '#f0f0f5'
      document.body.style.color = '#0c0c10'
    }
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      const { data: accs } = await supabase.from('ad_accounts').select('*').eq('user_id', user.id)
      if (accs && accs.length > 0) {
        setAccounts(accs)
        // detect selected account from URL
        const match = pathname?.match(/reportes\/(act_[^/]+)/)
        const found = match ? accs.find(a => a.account_id === match[1]) : null
        setSelectedAccount(found || accs[0])
      }
    }
    init()
  }, [])

  // sync selected account when URL changes
  useEffect(() => {
    if (accounts.length === 0) return
    const match = pathname?.match(/reportes\/(act_[^/]+)/)
    if (match) {
      const found = accounts.find(a => a.account_id === match[1])
      if (found) setSelectedAccount(found)
    }
  }, [pathname, accounts])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function navigate(path) {
    setStripOpen(false)
    router.push(path)
  }

  function selectAccount(acc) {
    setSelectedAccount(acc)
    setStripOpen(false)
    router.push('/dashboard/reportes/' + acc.account_id)
  }

  const isReportePage = pathname?.includes('/reportes/')
  const isSettingsPage = pathname === '/dashboard/settings'
  const isFacebookPage = pathname === '/dashboard/facebook'
  const isInstagramPage = pathname === '/dashboard/instagram'
  const isOverviewPage = pathname === '/dashboard' || pathname === '/dashboard/'

  const activeSection = isReportePage ? 'reportes' : isSettingsPage ? 'settings' : isFacebookPage ? 'facebook' : isInstagramPage ? 'instagram' : 'overview'

  const topbarTitle = isReportePage
    ? (selectedAccount?.account_name || selectedAccount?.account_id || 'Reportes')
    : activeSection === 'settings' ? 'Ajustes'
    : activeSection === 'facebook' ? 'Facebook Organico'
    : activeSection === 'instagram' ? 'Instagram Organico'
    : 'Dashboard'

  if (!user) return <div style={{minHeight:'100vh',background:'var(--bg)'}}></div>

  return (
    <div style={{display:'flex',height:'100vh',background:'var(--bg)',fontFamily:'"Plus Jakarta Sans",system-ui,sans-serif',overflow:'hidden'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      {/* SIDEBAR */}
      <aside style={{
        width:sidebarOpen?'210px':'52px',minWidth:sidebarOpen?'210px':'52px',
        background:'var(--sidebar)',borderRight:'1px solid var(--border)',
        display:'flex',flexDirection:'column',height:'100vh',
        overflow:'hidden',flexShrink:0,transition:'width .2s ease,min-width .2s ease',
      }}>
        {/* Logo */}
        <div style={{padding:'12px 10px',display:'flex',alignItems:'center',gap:'10px',borderBottom:'1px solid var(--border)',minHeight:'50px',flexShrink:0}}>
          <div style={{width:'28px',height:'28px',borderRadius:'7px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',flexShrink:0,cursor:'pointer'}} onClick={()=>navigate('/dashboard')}>⚡</div>
          {sidebarOpen && <span style={{fontWeight:'800',fontSize:'13px',color:'var(--text)',whiteSpace:'nowrap',cursor:'pointer'}} onClick={()=>navigate('/dashboard')}>Reporteador</span>}
        </div>

        {/* Nav */}
        <nav style={{padding:'6px 5px',flex:1,overflowY:'auto',overflowX:'hidden'}}>
          {sidebarOpen && <div style={{fontSize:'9px',color:'var(--text4)',fontWeight:'600',letterSpacing:'.08em',textTransform:'uppercase',padding:'8px 8px 3px'}}>Principal</div>}

          {[
            {id:'overview',icon:'🏠',label:'Resumen',path:'/dashboard',sub:'Pagado + organico',sub:'Pagado + organico'},
            {id:'facebook',icon:'📘',label:'Facebook',sub:'Organico',path:'/dashboard/facebook'},
            {id:'instagram',icon:'📸',label:'Instagram',sub:'Organico',path:'/dashboard/instagram'},
          ].map(s=>(
            <div key={s.id} className="nav-hover" onClick={()=>navigate(s.path)}
              style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 8px',borderRadius:'7px',cursor:'pointer',marginBottom:'1px',background:activeSection===s.id?'rgba(99,102,241,.14)':'transparent'}}>
              <span style={{fontSize:'14px',width:'20px',textAlign:'center',flexShrink:0}}>{s.icon}</span>
              {sidebarOpen && <div style={{flex:1,overflow:'hidden'}}>
                <div style={{fontSize:'11px',fontWeight:'600',color:activeSection===s.id?'#a5b4fc':'#888',whiteSpace:'nowrap'}}>{s.label}</div>
                {s.sub && <div style={{fontSize:'9px',color:'var(--text4)',marginTop:'1px'}}>{s.sub}</div>}
              </div>}
            </div>
          ))}

          {sidebarOpen && <div style={{fontSize:'9px',color:'var(--text4)',fontWeight:'600',letterSpacing:'.08em',textTransform:'uppercase',padding:'10px 8px 3px'}}>Reportes Ads</div>}

          <div className="nav-hover" onClick={()=>setReportsOpen(!reportsOpen)}
            style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 8px',borderRadius:'7px',cursor:'pointer',background:'transparent',border:'none',width:'100%'}}>
            <span style={{fontSize:'14px',width:'20px',textAlign:'center',flexShrink:0}}>📈</span>
            {sidebarOpen && <>
              <div style={{flex:1}}><div style={{fontSize:'11px',fontWeight:'600',color:'#666',textAlign:'left'}}>Desglose</div></div>
              <span style={{fontSize:'10px',color:'var(--text4)',transition:'transform .2s',transform:reportsOpen?'rotate(180deg)':'rotate(0deg)'}}>▾</span>
            </>}
          </div>

          <div style={{overflow:'hidden',maxHeight:reportsOpen&&sidebarOpen?'300px':'0',transition:'max-height .25s ease'}}>
            {[
              {id:'campanas',icon:'💹',label:'Campanas',tab:'campanas'},
              {id:'conjuntos',icon:'🎯',label:'Conjuntos',tab:'conjuntos'},
              {id:'anuncios',icon:'🎨',label:'Anuncios',tab:'anuncios'},
              {id:'audiencia',icon:'👥',label:'Audiencia',tab:'audiencia'},
            ].map(r=>(
              <div key={r.id} className="nav-hover"
                onClick={()=>{ if(selectedAccount) navigate('/dashboard/reportes/'+selectedAccount.account_id+'?tab='+r.tab); else alert('Selecciona una cuenta primero') }}
                style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 8px 6px 20px',borderRadius:'7px',cursor:'pointer',marginBottom:'1px'}}>
                <span style={{fontSize:'13px',width:'20px',textAlign:'center',flexShrink:0}}>{r.icon}</span>
                <div style={{fontSize:'11px',fontWeight:'600',color:'#555',whiteSpace:'nowrap'}}>{r.label}</div>
              </div>
            ))}
          </div>

          {sidebarOpen && <div style={{fontSize:'9px',color:'var(--text4)',fontWeight:'600',letterSpacing:'.08em',textTransform:'uppercase',padding:'10px 8px 3px'}}>Config</div>}
          <div className="nav-hover" onClick={()=>navigate('/dashboard/settings')}
            style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 8px',borderRadius:'7px',cursor:'pointer',background:activeSection==='settings'?'rgba(99,102,241,.14)':'transparent'}}>
            <span style={{fontSize:'14px',width:'20px',textAlign:'center',flexShrink:0}}>⚙️</span>
            {sidebarOpen && <div style={{fontSize:'11px',fontWeight:'600',color:activeSection==='settings'?'#a5b4fc':'#888'}}>Ajustes</div>}
          </div>
        </nav>

        {/* User */}
        <div style={{padding:'6px 5px',borderTop:'1px solid var(--border)',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 8px',borderRadius:'7px'}}>
            <div style={{width:'24px',height:'24px',borderRadius:'50%',background:'rgba(99,102,241,.15)',border:'1px solid rgba(99,102,241,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',color:'#a5b4fc',fontWeight:'700',flexShrink:0}}>
              {user.email?.[0]?.toUpperCase()}
            </div>
            {sidebarOpen && <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:'10px',color:'var(--text3)',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.email}</div>
              <div style={{fontSize:'9px',color:'#6366f1',fontWeight:'700',marginTop:'1px'}}>Pro ✦</div>
            </div>}
          </div>
          <div className="nav-hover" onClick={handleLogout}
            style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 8px',borderRadius:'7px',cursor:'pointer',border:'none',background:'transparent',width:'100%'}}>
            <span style={{fontSize:'13px',width:'20px',textAlign:'center',flexShrink:0}}>🚪</span>
            {sidebarOpen && <span style={{fontSize:'11px',color:'var(--text3)',whiteSpace:'nowrap'}}>Cerrar sesion</span>}
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>

        {/* TOPBAR */}
        <header style={{height:'50px',background:'var(--sidebar)',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',padding:'0 14px',gap:'10px',flexShrink:0,zIndex:10}}>
          <button className="btn-hover" onClick={()=>setSidebarOpen(!sidebarOpen)}
            style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:'16px',padding:'3px 5px',borderRadius:'5px'}}>☰</button>

          {/* Breadcrumb */}
          <div style={{flex:1,display:'flex',alignItems:'center',gap:'6px',minWidth:0}}>
            <span style={{fontSize:'13px',fontWeight:'700',color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{topbarTitle}</span>
            {isReportePage && selectedAccount && (
              <span style={{fontSize:'10px',color:'var(--text4)',fontFamily:'monospace',flexShrink:0}}>{selectedAccount.account_id}</span>
            )}
          </div>



          {/* Accounts strip toggle */}
          {accounts.length > 0 && (
            <button className="btn-hover" onClick={()=>setStripOpen(!stripOpen)}
              style={{display:'flex',alignItems:'center',gap:'5px',padding:'4px 9px',borderRadius:'6px',border:'1px solid var(--border)',background:stripOpen?'rgba(255,255,255,.05)':'transparent',cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>
              <span style={{fontSize:'10px',color:'#777',whiteSpace:'nowrap'}}>{accounts.length} cuentas</span>
              <span style={{fontSize:'10px',color:'var(--text3)',transition:'transform .2s',transform:stripOpen?'rotate(180deg)':'rotate(0)'}}>▾</span>
            </button>
          )}
        </header>

        {/* ACCOUNTS STRIP */}
        <div style={{background:'var(--sidebar)',borderBottom:stripOpen?'1px solid rgba(255,255,255,.06)':'none',overflow:'hidden',maxHeight:stripOpen?'68px':'0',transition:'max-height .25s ease',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 14px',overflowX:'auto',scrollbarWidth:'none'}}>
            {(isPro ? accounts : accounts.slice(0,1)).map(acc=>(

              <div key={acc.id} className="pill-hover" onClick={()=>selectAccount(acc)}
                style={{display:'flex',alignItems:'center',gap:'7px',padding:'6px 11px',background:selectedAccount?.id===acc.id?'rgba(99,102,241,.14)':'rgba(255,255,255,.04)',border:'1px solid '+(selectedAccount?.id===acc.id?'rgba(99,102,241,.3)':'rgba(255,255,255,.07)'),borderRadius:'8px',cursor:'pointer',flexShrink:0}}>
                <div style={{width:'6px',height:'6px',borderRadius:'50%',background:acc.is_active?'#6ee7b7':'#f87171',flexShrink:0}}></div>
                <div>
                  <div style={{fontSize:'11px',fontWeight:'700',color:selectedAccount?.id===acc.id?'#a5b4fc':'#ddd',whiteSpace:'nowrap'}}>{acc.account_name||acc.account_id}</div>
                  <div style={{fontSize:'9px',color:'var(--text4)',fontFamily:'monospace',marginTop:'1px'}}>{acc.account_id}</div>
                </div>
              </div>
            ))}
            <a href="/api/auth/meta" style={{display:'flex',alignItems:'center',gap:'5px',padding:'6px 10px',background:'rgba(99,102,241,.08)',border:'1px solid rgba(99,102,241,.2)',borderRadius:'8px',textDecoration:'none',flexShrink:0}}>
              <span style={{fontSize:'10px',color:'#a5b4fc',fontWeight:'600',whiteSpace:'nowrap'}}>🔗 Reconectar</span>
            </a>
            {!isPro && accounts.length > 1 && (
              <a href="/planes" style={{display:'flex',alignItems:'center',gap:'5px',padding:'6px 10px',background:'rgba(252,211,77,.06)',border:'1px solid rgba(252,211,77,.15)',borderRadius:'8px',textDecoration:'none',flexShrink:0}}>
                <span style={{fontSize:'10px',color:'#fcd34d',fontWeight:'600',whiteSpace:'nowrap'}}>🔒 +{accounts.length-1} cuentas en Pro</span>
              </a>
            )}
          </div>
        </div>

        {/* FREE PLAN BANNER */}
        {isPro === false && (
          <div style={{background:'rgba(99,102,241,.08)',borderBottom:'1px solid rgba(99,102,241,.15)',padding:'8px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <span style={{fontSize:'11px',color:'#a5b4fc',fontFamily:'monospace'}}>
              Plan Free — acceso limitado a Overview · ultimos 30 dias
            </span>
            <a href="/planes" style={{fontSize:'11px',color:'#fff',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',padding:'4px 12px',borderRadius:'6px',textDecoration:'none',fontWeight:'700',flexShrink:0}}>
              Actualizar a Pro →
            </a>
          </div>
        )}
        {/* PAGE CONTENT */}
        <div style={{flex:1,overflowY:'auto'}}>
          {children}
        </div>
      </div>
    </div>
  )
}
