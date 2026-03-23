'use client'

const FAKE_CAMPAIGNS = [
  { name: 'Campana_Prospecting_2026', spend: 1842.50, results: 67, ctr: 3.8, score: 82 },
  { name: 'Retargeting_Leads_Q1', spend: 654.20, results: 31, ctr: 5.2, score: 74 },
  { name: 'Awareness_Brand_MX', spend: 289.80, results: 8, ctr: 1.1, score: 48 },
]

const FAKE_ADS = [
  { name: 'VIDEO_HOOK_V3_MARZO', status: 'ACTIVE', spend: 1240.30, results: 48, hookRate: 31.2, score: 87 },
  { name: 'VIDEO_TESTIMONIAL_V1', status: 'ACTIVE', spend: 602.20, results: 19, hookRate: 22.4, score: 71 },
  { name: 'IMAGEN_OFERTA_DIRECTA', status: 'PAUSED', spend: 154.00, results: 3, hookRate: 0, score: 38 },
]

function FakeRow({ name, spend, results, score }) {
  const color = score >= 75 ? '#6ee7b7' : score >= 50 ? '#fcd34d' : '#f87171'
  return (
    <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 16px',background:'#111116',border:'1px solid rgba(255,255,255,.07)',borderRadius:'9px',marginBottom:'7px'}}>
      <div style={{width:'7px',height:'7px',borderRadius:'50%',background:color,flexShrink:0}}></div>
      <div style={{flex:1,fontSize:'12px',fontWeight:'600',color:'#ccc',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</div>
      <div style={{fontSize:'12px',color:'#fff',fontWeight:'700',marginRight:'8px'}}>${spend.toLocaleString('es-MX',{minimumFractionDigits:2})}</div>
      <div style={{fontSize:'10px',fontWeight:'700',color,padding:'3px 8px',borderRadius:'6px',border:`1px solid ${color}33`,background:`${color}11`}}>{score}/100</div>
      <div style={{fontSize:'11px',color:'#6ee7b7',fontFamily:'monospace'}}>{results} res.</div>
    </div>
  )
}

export default function ProGate({ feature = 'esta funcion', type = 'default' }) {
  const fakeContent = type === 'campanas' || type === 'conjuntos' ? (
    <div style={{padding:'20px 24px'}}>
      {FAKE_CAMPAIGNS.map((c,i) => <FakeRow key={i} {...c}/>)}
    </div>
  ) : type === 'anuncios' ? (
    <div style={{padding:'20px 24px'}}>
      <div style={{background:'rgba(99,102,241,.05)',border:'1px solid rgba(99,102,241,.1)',borderRadius:'7px',padding:'8px 12px',marginBottom:'12px',fontSize:'10px',color:'#6366f1',fontFamily:'monospace'}}>
        Score de creativos — ordenados de mejor a peor
      </div>
      {FAKE_ADS.map((a,i) => {
        const color = a.score>=75?'#6ee7b7':a.score>=50?'#fcd34d':'#f87171'
        return (
          <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 16px',background:'#111116',border:`1px solid ${color}22`,borderRadius:'9px',marginBottom:'7px'}}>
            <div style={{width:'7px',height:'7px',borderRadius:'50%',background:a.status==='ACTIVE'?'#6ee7b7':'#f87171',flexShrink:0}}></div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:'12px',fontWeight:'700',color:'#ccc',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.name}</div>
              <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace',marginTop:'2px'}}>Hook: {a.hookRate>0?a.hookRate+'%':'—'}</div>
            </div>
            <div style={{fontSize:'14px',fontWeight:'800',color:'#fff'}}>${a.spend.toLocaleString('es-MX',{minimumFractionDigits:2})}</div>
            <div style={{fontSize:'10px',fontWeight:'700',color,padding:'3px 8px',borderRadius:'6px',background:`${color}11`}}>{a.score}/100</div>
          </div>
        )
      })}
    </div>
  ) : type === 'audiencia' ? (
    <div style={{padding:'20px 24px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
      {['Gasto por edad','CTR por grupo de edad','Distribucion por genero','Plataforma y dispositivo'].map((t,i) => (
        <div key={i} style={{background:'#111116',border:'1px solid rgba(255,255,255,.07)',borderRadius:'10px',padding:'16px',height:'180px',display:'flex',flexDirection:'column'}}>
          <div style={{fontSize:'9px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'10px'}}>{t}</div>
          <div style={{flex:1,display:'flex',alignItems:'flex-end',gap:'4px'}}>
            {[40,65,55,80,30,70].map((h,j) => (
              <div key={j} style={{flex:1,height:h+'%',background:`rgba(99,102,241,${0.3+j*0.08})`,borderRadius:'3px 3px 0 0'}}></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  ) : <div style={{height:'300px'}}></div>

  return (
    <div style={{position:'relative',fontFamily:'"Plus Jakarta Sans",system-ui,sans-serif',minHeight:'300px'}}>
      {/* Blurred content - MUST render before overlay */}
      <div style={{
        filter:'blur(6px)',
        pointerEvents:'none',
        userSelect:'none',
        WebkitFilter:'blur(6px)',
      }}>
        {fakeContent}
      </div>

      {/* Overlay - absolute on top */}
      <div style={{
        position:'absolute',
        top:0,left:0,right:0,bottom:0,
        display:'flex',
        flexDirection:'column',
        alignItems:'center',
        justifyContent:'center',
        background:'rgba(10,10,14,.5)',
        zIndex:10,
        borderRadius:'8px',
      }}>
        <div style={{
          background:'#17171d',
          border:'1px solid rgba(99,102,241,.35)',
          borderRadius:'16px',
          padding:'28px 32px',
          textAlign:'center',
          maxWidth:'300px',
          boxShadow:'0 8px 32px rgba(0,0,0,.6)',
        }}>
          <div style={{fontSize:'28px',marginBottom:'10px'}}>🔒</div>
          <div style={{color:'#fff',fontSize:'14px',fontWeight:'800',marginBottom:'6px',fontFamily:'"Plus Jakarta Sans",sans-serif'}}>
            Desbloquea con Pro
          </div>
          <div style={{color:'#555',fontSize:'12px',lineHeight:'1.6',marginBottom:'18px',fontFamily:'"Plus Jakarta Sans",sans-serif'}}>
            Actualiza para ver {feature} con tus datos reales.
          </div>
          <a href="/planes" style={{
            display:'block',padding:'10px 20px',
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color:'#fff',borderRadius:'9px',textDecoration:'none',
            fontSize:'12px',fontWeight:'700',marginBottom:'8px',
          }}>
            Ver planes — desde $297 MXN/mes
          </a>
          <a href="/dashboard" style={{fontSize:'11px',color:'#444',textDecoration:'none'}}>
            Volver al overview
          </a>
        </div>
      </div>
    </div>
  )
}
