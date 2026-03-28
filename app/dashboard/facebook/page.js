'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { Bar, Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const PRESETS = [
  { label: 'Hoy', value: 'today', days: 1 },
  { label: 'Ayer', value: 'yesterday', days: 1 },
  { label: '7 dias', value: 'last_7d', days: 7 },
  { label: '30 dias', value: 'last_30d', days: 30 },
  { label: 'Personalizado', value: 'custom', days: 0 },
]

const REGION_COORDS = {
  'Ciudad de Mexico':{lat:19.4326,lng:-99.1332},'Distrito Federal':{lat:19.4326,lng:-99.1332},'Mexico City':{lat:19.4326,lng:-99.1332},
  'Estado de Mexico':{lat:19.2952,lng:-99.8938},'State of Mexico':{lat:19.2952,lng:-99.8938},
  'Jalisco':{lat:20.6597,lng:-103.3496},'Nuevo Leon':{lat:25.5922,lng:-99.9962},'Nuevo León':{lat:25.5922,lng:-99.9962},
  'Puebla':{lat:19.0414,lng:-98.2063},'Veracruz':{lat:19.1738,lng:-96.1342},
  'Guanajuato':{lat:21.019,lng:-101.2574},'Chihuahua':{lat:28.6353,lng:-106.0889},
  'Baja California':{lat:30.8406,lng:-115.2838},'Sonora':{lat:29.2972,lng:-110.3309},
  'Tamaulipas':{lat:24.2669,lng:-98.8363},'Sinaloa':{lat:25.1721,lng:-107.4795},
  'Coahuila':{lat:27.0587,lng:-101.7068},'Oaxaca':{lat:17.0732,lng:-96.7266},
  'Chiapas':{lat:16.7569,lng:-93.1292},'Michoacan':{lat:19.5665,lng:-101.7068},'Michoacán':{lat:19.5665,lng:-101.7068},
  'Guerrero':{lat:17.4392,lng:-99.5451},'Hidalgo':{lat:20.0911,lng:-98.7624},
  'Morelos':{lat:18.6813,lng:-99.1013},'Tabasco':{lat:17.8409,lng:-92.6189},
  'Yucatan':{lat:20.7099,lng:-89.0943},'Yucatán':{lat:20.7099,lng:-89.0943},
  'Queretaro':{lat:20.5888,lng:-100.3899},'Querétaro':{lat:20.5888,lng:-100.3899},
  'San Luis Potosi':{lat:22.1565,lng:-100.9855},'Quintana Roo':{lat:19.1817,lng:-88.4791},
  'Bogota':{lat:4.711,lng:-74.0721},'Antioquia':{lat:6.2442,lng:-75.5812},
  'Buenos Aires':{lat:-34.6037,lng:-58.3816},'Santiago':{lat:-33.4489,lng:-70.6693},
  'Lima':{lat:-12.0464,lng:-77.0428},'Sao Paulo':{lat:-23.5505,lng:-46.6333},
  'Madrid':{lat:40.4168,lng:-3.7038},'Miami':{lat:25.7617,lng:-80.1918},
}

const COUNTRY_COORDS = {
  MX:{lat:23.6345,lng:-102.5528,name:'Mexico'},US:{lat:37.0902,lng:-95.7129,name:'EEUU'},
  CO:{lat:4.5709,lng:-74.2973,name:'Colombia'},AR:{lat:-38.4161,lng:-63.6167,name:'Argentina'},
  CL:{lat:-35.6751,lng:-71.543,name:'Chile'},PE:{lat:-9.19,lng:-75.0152,name:'Peru'},
  ES:{lat:40.4637,lng:-3.7492,name:'Espana'},BR:{lat:-14.235,lng:-51.9253,name:'Brasil'},
  GT:{lat:15.7835,lng:-90.2308,name:'Guatemala'},EC:{lat:-1.8312,lng:-78.1834,name:'Ecuador'},
}

function getDateRange(preset, customFrom, customTo) {
  const now = new Date()
  const fmt = d => Math.floor(d.getTime()/1000)
  if (preset === 'custom') return { since: Math.floor(new Date(customFrom).getTime()/1000), until: Math.floor(new Date(customTo).getTime()/1000) }
  if (preset === 'today') { const s = new Date(now); s.setHours(0,0,0,0); return { since: fmt(s), until: fmt(now) } }
  if (preset === 'yesterday') { const s = new Date(now); s.setDate(s.getDate()-1); s.setHours(0,0,0,0); const e = new Date(s); e.setHours(23,59,59,0); return { since: fmt(s), until: fmt(e) } }
  if (preset === 'last_7d') { const s = new Date(now); s.setDate(s.getDate()-7); return { since: fmt(s), until: fmt(now) } }
  if (preset === 'last_30d') { const s = new Date(now); s.setDate(s.getDate()-30); return { since: fmt(s), until: fmt(now) } }
  return { since: fmt(new Date(now.getTime()-28*864e5)), until: fmt(now) }
}

const fmtN = v => (+v||0)>=1e6?((+v/1e6).toFixed(1)+'M'):(+v||0)>=1e3?((+v/1e3).toFixed(1)+'K'):String(Math.round(+v||0))
const fmtP = v => ((+v)||0).toFixed(2)+'%'

const chartOpts = () => ({
  responsive:true,maintainAspectRatio:false,
  plugins:{legend:{labels:{color:'#666',font:{size:10},boxWidth:10}},tooltip:{backgroundColor:'#1a1a1e',titleColor:'#fff',bodyColor:'#888',padding:10,cornerRadius:8}},
  scales:{x:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#444',font:{size:9},maxRotation:30}},y:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#444',font:{size:9}}}}
})

function OrgMap({ regionData, countryData, mapId }) {
  const mapRef = React.useRef(null)
  const mapInstanceRef = React.useRef(null)
  const RC = REGION_COORDS
  const CC = COUNTRY_COORDS

  React.useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null }
    const link = document.createElement('link')
    link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => {
      if (!mapRef.current || mapInstanceRef.current) return
      const L = window.L
      const map = L.map(mapRef.current, { center:[22,-95], zoom:4, zoomControl:true, scrollWheelZoom:true })
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution:'', maxZoom:12 }).addTo(map)
      mapInstanceRef.current = map
      const style = document.createElement('style')
      style.textContent = '.dp .leaflet-popup-content-wrapper{background:#18181f;border:1px solid #2a2a35;border-radius:8px;color:#fff}.dp .leaflet-popup-tip{background:#18181f}.leaflet-popup-content{margin:0;padding:0}'
      document.head.appendChild(style)
      const totalR = (regionData||[]).reduce((s,r)=>s+(+r.value||0),0)
      const maxR = +(regionData?.[0]?.value||0)
      let topLat=22,topLng=-95,topZoom=5,has=false
      ;(regionData||[]).forEach((r,i)=>{
        const coords = RC[r.region||r.name]
        if (!coords) return
        const val = +r.value||0
        const size = Math.max(12,Math.min(40,(val/maxR)*40))
        const color = i===0?'#6ee7b7':i<3?'#3b82f6':i<6?'#f97316':'#a78bfa'
        L.circleMarker([coords.lat,coords.lng],{radius:size,fillColor:color,color:color,weight:2,opacity:.9,fillOpacity:.35}).addTo(map)
          .bindPopup(`<div style="padding:10px;min-width:130px"><div style="font-weight:700;font-size:13px;margin-bottom:5px;color:#fff">${r.region||r.name}</div><div style="color:#6ee7b7;font-size:12px">${fmtN(val)} personas</div></div>`,{className:'dp'})
        if (i===0){topLat=coords.lat;topLng=coords.lng;topZoom=6;has=true}
      })
      ;(countryData||[]).forEach((c,i)=>{
        const coords = CC[c.country||c.code]
        if (!coords) return
        const val = +c.value||0
        const size = Math.max(8,Math.min(20,(val/(+(countryData[0]?.value||1)))*20))
        L.circleMarker([coords.lat,coords.lng],{radius:size,fillColor:'#fcd34d',color:'#fcd34d',weight:1,opacity:.6,fillOpacity:.2}).addTo(map)
          .bindPopup(`<div style="padding:10px;min-width:130px"><div style="font-weight:700;font-size:13px;margin-bottom:5px;color:#fff">${coords.name}</div><div style="color:#fcd34d;font-size:12px">${fmtN(val)} personas</div></div>`,{className:'dp'})
        if (!has&&i===0){topLat=coords.lat;topLng=coords.lng;topZoom=5}
      })
      setTimeout(()=>map.flyTo([topLat,topLng],topZoom,{duration:1.5}),600)
    }
    document.head.appendChild(script)
    return ()=>{if(mapInstanceRef.current){mapInstanceRef.current.remove();mapInstanceRef.current=null}}
  },[regionData,countryData])

  return (
    <div style={{position:'relative'}}>
      <div ref={mapRef} style={{height:'360px',borderRadius:'8px',overflow:'hidden',background:'#0d0d12'}}></div>
      <div style={{position:'absolute',top:'10px',right:'10px',background:'rgba(10,10,14,.9)',border:'1px solid #2a2a35',borderRadius:'8px',padding:'8px 12px',zIndex:1000}}>
        <div style={{fontSize:'9px',color:'#444',fontFamily:'monospace',marginBottom:'5px'}}>CAPAS</div>
        <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'3px'}}><div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#6ee7b7'}}></div><span style={{fontSize:'10px',color:'#888',fontFamily:'monospace'}}>Estados</span></div>
        <div style={{display:'flex',alignItems:'center',gap:'5px'}}><div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#fcd34d'}}></div><span style={{fontSize:'10px',color:'#888',fontFamily:'monospace'}}>Paises</span></div>
      </div>
    </div>
  )
}

import React from 'react'

export default function FacebookPage() {
  const [token, setToken] = useState(null)
  const [pages, setPages] = useState([])
  const [activePage, setActivePage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [preset, setPreset] = useState('last_30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [insights, setInsights] = useState(null)
  const [posts, setPosts] = useState([])
  const [dailyData, setDailyData] = useState([])
  const [geoData, setGeoData] = useState({ regions: [], countries: [] })
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: tokenRow } = await supabase.from('meta_tokens').select('access_token').eq('user_id', user.id).single()
      if (tokenRow) setToken(tokenRow.access_token)
    }
    init()
  }, [])

  useEffect(() => { if (token) fetchPages() }, [token])

  useEffect(() => {
    if (token && activePage) fetchInsights()
  }, [token, activePage, preset, customFrom, customTo])

  async function fetchPages() {
    try {
      // access_token field necesario para usar el token de página en los insights
      const res = await fetch('https://graph.facebook.com/v21.0/me/accounts?fields=id,name,fan_count,followers_count,picture,access_token&access_token='+token+'&limit=50')
      const j = await res.json()
      const pagesData = j.data || []
      setPages(pagesData)
      if (pagesData.length > 0) setActivePage(pagesData[0])
    } catch(e) { console.error(e) }
  }

  async function fetchInsights() {
    if (!activePage) return
    setLoading(true)
    setInsights(null); setPosts([]); setDailyData([]); setGeoData({ regions: [], countries: [] })
    try {
      const range = getDateRange(preset, customFrom, customTo)
      if (!range.since || !range.until) { setLoading(false); return }
      // CRÍTICO: usar el token de la página, no el token de usuario
      // El token de usuario no tiene permiso para ver insights de posts ni métricas de página
      const tok = activePage.access_token || token
      const pid = activePage.id

      // Posts y page insights en paralelo — sin insights.metric en posts porque falla para posts no-video
      const [insR, postsR, dailyR, geoCountryR, geoRegionR] = await Promise.all([
        fetch(`https://graph.facebook.com/v21.0/${pid}/insights?metric=page_impressions,page_reach,page_engaged_users,page_post_engagements,page_fan_adds_unique,page_fan_removes_unique,page_views_total&period=total_over_range&since=${range.since}&until=${range.until}&access_token=${tok}`),
        // Posts sin filtro de fecha y sin insights.metric (que falla para posts no-video/no con permisos)
        fetch(`https://graph.facebook.com/v21.0/${pid}/posts?fields=id,message,story,created_time,full_picture,attachments{media_type,media},likes.summary(true),comments.summary(true),shares&limit=20&access_token=${tok}`),
        fetch(`https://graph.facebook.com/v21.0/${pid}/insights?metric=page_impressions&period=day&since=${range.since}&until=${range.until}&access_token=${tok}`),
        fetch(`https://graph.facebook.com/v21.0/${pid}/insights?metric=page_impressions_by_country_unique&period=total_over_range&since=${range.since}&until=${range.until}&access_token=${tok}`),
        fetch(`https://graph.facebook.com/v21.0/${pid}/insights?metric=page_impressions_by_city_unique&period=total_over_range&since=${range.since}&until=${range.until}&access_token=${tok}`),
      ])

      const [insJ, postsJ, dailyJ, geoCountryJ, geoRegionJ] = await Promise.all([insR.json(), postsR.json(), dailyR.json(), geoCountryR.json(), geoRegionR.json()])

      const ins = {}
      ;(insJ.data||[]).forEach(m => { ins[m.name] = m.values?.[0]?.value || 0 })
      setInsights(ins)

      // Process posts — ER calculado sobre fan_count ya que no tenemos reach por post
      const fanCount = activePage.fan_count || activePage.followers_count || 1
      const processedPosts = (postsJ.data||[]).map(p => {
        const likes = p.likes?.summary?.total_count || 0
        const comments = p.comments?.summary?.total_count || 0
        const shares = p.shares?.count || 0
        const engagementRate = ((likes+comments+shares)/fanCount*100).toFixed(2)
        const mediaType = p.attachments?.data?.[0]?.media_type || 'STATUS'
        const thumb = p.full_picture || null
        return { ...p, likes, comments, shares, reach: 0, engagementRate, mediaType, thumb, avgWatch: 0, totalEngagement: likes+comments+shares }
      }).sort((a,b) => b.totalEngagement - a.totalEngagement)
      setPosts(processedPosts)

      // Daily data
      const daily = (dailyJ.data?.[0]?.values || []).map(v => ({ date: v.end_time?.slice(5,10), value: v.value }))
      setDailyData(daily)

      // Geo data
      const countryValues = geoCountryJ.data?.[0]?.values?.[0]?.value || {}
      const regionValues = geoRegionJ.data?.[0]?.values?.[0]?.value || {}

      const countries = Object.entries(countryValues).map(([code,value]) => ({ country: code, value })).sort((a,b) => b.value-a.value).slice(0,10)
      const regions = Object.entries(regionValues).map(([region,value]) => ({ region, value })).sort((a,b) => b.value-a.value).slice(0,15)

      setGeoData({ regions, countries })
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const bestPost = posts[0]
  const totalEngagement = posts.reduce((s,p) => s + p.totalEngagement, 0)
  const avgVideoWatch = posts.filter(p=>p.avgWatch>0).reduce((s,p,_,arr) => s + p.avgWatch/arr.length, 0)

  const COLORS = ['#6ee7b7','#3b82f6','#f97316','#a78bfa','#fcd34d','#f87171','#ec4899','#14b8a6']

  return (
    <div style={{padding:'20px',fontFamily:'"Plus Jakarta Sans",sans-serif'}}>

      {/* Page selector */}
      {pages.length > 0 && (
        <div style={{display:'flex',gap:'6px',marginBottom:'16px',flexWrap:'wrap'}}>
          {pages.map(page => (
            <div key={page.id} onClick={()=>setActivePage(page)}
              style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px',background:activePage?.id===page.id?'rgba(24,119,242,.12)':'rgba(255,255,255,.03)',border:'1px solid '+(activePage?.id===page.id?'rgba(24,119,242,.3)':'rgba(255,255,255,.07)'),borderRadius:'9px',cursor:'pointer'}}>
              {page.picture?.data?.url
                ? <img src={page.picture.data.url} style={{width:'28px',height:'28px',borderRadius:'50%',flexShrink:0}} alt=""/>
                : <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'#1877f2',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'13px',fontWeight:'700',flexShrink:0}}>f</div>}
              <div>
                <div style={{fontSize:'11px',fontWeight:'700',color:activePage?.id===page.id?'#60a5fa':'#ccc'}}>{page.name}</div>
                <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace'}}>{fmtN(page.fan_count||0)} fans</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Date presets */}
      <div style={{display:'flex',gap:'4px',marginBottom:'8px',flexWrap:'wrap',alignItems:'center'}}>
        {PRESETS.map(p => (
          <button key={p.value} onClick={()=>{setPreset(p.value);setShowCustom(p.value==='custom')}}
            style={{padding:'5px 10px',borderRadius:'6px',border:'1px solid',fontSize:'10px',cursor:'pointer',fontFamily:'monospace',
              borderColor:preset===p.value?'#fff':'#222',background:preset===p.value?'#fff':'transparent',
              color:preset===p.value?'#0a0a0e':'#555',fontWeight:preset===p.value?'700':'400'}}>
            {p.label}
          </button>
        ))}
      </div>
      {showCustom && (
        <div style={{display:'flex',gap:'8px',marginBottom:'8px',alignItems:'center'}}>
          <span style={{fontSize:'11px',color:'#444',fontFamily:'monospace'}}>Desde</span>
          <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} style={{background:'#18181f',border:'1px solid #2a2a35',color:'#fff',padding:'4px 8px',borderRadius:'6px',fontSize:'11px',outline:'none'}}/>
          <span style={{fontSize:'11px',color:'#444',fontFamily:'monospace'}}>Hasta</span>
          <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} style={{background:'#18181f',border:'1px solid #2a2a35',color:'#fff',padding:'4px 8px',borderRadius:'6px',fontSize:'11px',outline:'none'}}/>
        </div>
      )}

      {loading && <div style={{textAlign:'center',padding:'60px',color:'#333',fontFamily:'monospace',fontSize:'12px'}}>Cargando datos de Facebook...</div>}

      {!loading && !activePage && (
        <div style={{background:'#17171d',border:'1px solid rgba(255,255,255,.07)',borderRadius:'12px',padding:'40px',textAlign:'center',maxWidth:'520px',margin:'20px auto'}}>
          <div style={{width:'56px',height:'56px',borderRadius:'14px',background:'#1877f2',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'26px',fontWeight:'800',margin:'0 auto 16px'}}>f</div>
          <h2 style={{fontSize:'16px',fontWeight:'800',color:'#fff',marginBottom:'8px'}}>No se encontraron páginas de Facebook</h2>
          <p style={{fontSize:'12px',color:'#666',lineHeight:'1.7',marginBottom:'20px',maxWidth:'360px',margin:'0 auto 20px'}}>
            Para ver métricas orgánicas necesitas tener una <strong style={{color:'#aaa'}}>Página de Facebook</strong> y conectarla con permisos de administrador. Si ya tienes una, reconecta tu cuenta para darle acceso.
          </p>
          <div style={{display:'flex',flexDirection:'column',gap:'8px',alignItems:'center'}}>
            <a href="/api/auth/meta" style={{display:'inline-flex',alignItems:'center',gap:'8px',padding:'10px 20px',borderRadius:'8px',background:'#1877f2',color:'#fff',fontSize:'12px',fontWeight:'700',textDecoration:'none'}}>
              🔗 Reconectar con Facebook
            </a>
            <div style={{fontSize:'10px',color:'#333',marginTop:'4px'}}>
              Asegúrate de ser administrador de al menos una Página de Facebook
            </div>
          </div>
        </div>
      )}

      {!loading && activePage && (
        <>
          {/* Page header */}
          <div style={{background:'#17171d',border:'1px solid rgba(255,255,255,.07)',borderRadius:'12px',padding:'16px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'12px'}}>
            {activePage.picture?.data?.url
              ? <img src={activePage.picture.data.url} style={{width:'48px',height:'48px',borderRadius:'50%',border:'2px solid #1877f2'}} alt=""/>
              : <div style={{width:'48px',height:'48px',borderRadius:'50%',background:'#1877f2',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'20px',fontWeight:'700'}}>f</div>}
            <div style={{flex:1}}>
              <div style={{color:'#fff',fontSize:'15px',fontWeight:'800'}}>{activePage.name}</div>
              <div style={{color:'#444',fontSize:'10px',fontFamily:'monospace',marginTop:'2px'}}>Periodo seleccionado</div>
            </div>
            <div style={{display:'flex',gap:'20px'}}>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:'22px',fontWeight:'800',color:'#fff'}}>{fmtN(activePage.fan_count||0)}</div>
                <div style={{fontSize:'9px',color:'#444',fontFamily:'monospace'}}>fans totales</div>
              </div>
              {insights && (
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'22px',fontWeight:'800',color:'#6ee7b7'}}>+{fmtN(insights.page_fan_adds_unique||0)}</div>
                  <div style={{fontSize:'9px',color:'#444',fontFamily:'monospace'}}>nuevos fans</div>
                </div>
              )}
            </div>
          </div>

          {/* KPI Grid */}
          {insights && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:'8px',marginBottom:'16px'}}>
              {[
                {l:'Alcance',v:fmtN(insights.page_reach||0),c:'#6ee7b7',icon:'👁'},
                {l:'Impresiones',v:fmtN(insights.page_impressions||0),c:'#60a5fa',icon:'📡'},
                {l:'Engagement',v:fmtN(insights.page_post_engagements||0),c:'#fb923c',icon:'❤️'},
                {l:'Usuarios activos',v:fmtN(insights.page_engaged_users||0),c:'#a78bfa',icon:'👥'},
                {l:'Vistas de pagina',v:fmtN(insights.page_views_total||0),c:'#60a5fa',icon:'🔍'},
                {l:'Nuevos fans',v:'+'+fmtN(insights.page_fan_adds_unique||0),c:'#6ee7b7',icon:'➕'},
                {l:'Fans perdidos',v:'-'+fmtN(insights.page_fan_removes_unique||0),c:'#f87171',icon:'➖'},
                {l:'Posts',v:fmtN(posts.length),c:'#fff',icon:'📝'},
                {l:'Tasa engagement',v:insights.page_reach>0?fmtP((insights.page_post_engagements||0)/insights.page_reach*100):'—',c:'#6ee7b7',icon:'📊'},
                ...(avgVideoWatch>0?[{l:'Prom. video visto',v:Math.round(avgVideoWatch)+'s',c:'#a78bfa',icon:'▶️'}]:[]),
              ].map(m=>(
                <div key={m.l} style={{background:'#17171d',border:'1px solid rgba(255,255,255,.07)',borderRadius:'10px',padding:'13px'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'7px'}}>
                    <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.06em'}}>{m.l}</div>
                    <span style={{fontSize:'13px'}}>{m.icon}</span>
                  </div>
                  <div style={{fontSize:'20px',fontWeight:'800',color:m.c}}>{m.v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Daily reach chart */}
          {dailyData.length > 1 && (
            <div style={{background:'#17171d',border:'1px solid rgba(255,255,255,.07)',borderRadius:'12px',padding:'16px',marginBottom:'16px'}}>
              <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'14px'}}>Alcance por dia</div>
              <div style={{height:'180px'}}>
                <Line data={{labels:dailyData.map(d=>d.date),datasets:[{label:'Alcance',data:dailyData.map(d=>d.value),borderColor:'#1877f2',backgroundColor:'rgba(24,119,242,.08)',fill:true,tension:.4,pointRadius:2,borderWidth:2}]}} options={chartOpts()}/>
              </div>
            </div>
          )}

          {/* Best post highlight */}
          {bestPost && (
            <div style={{background:'rgba(110,231,183,.05)',border:'1px solid rgba(110,231,183,.15)',borderRadius:'12px',padding:'16px',marginBottom:'16px'}}>
              <div style={{fontSize:'10px',color:'#6ee7b7',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'12px'}}>🏆 Post con mayor engagement</div>
              <div style={{display:'flex',gap:'12px',alignItems:'flex-start'}}>
                {bestPost.thumb && (
                  <img src={bestPost.thumb} style={{width:'80px',height:'80px',borderRadius:'8px',objectFit:'cover',flexShrink:0}} alt="" onError={e=>e.target.style.display='none'}/>
                )}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'12px',color:'#aaa',marginBottom:'8px',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{bestPost.message||bestPost.story||'(Sin texto)'}</div>
                  <div style={{display:'flex',gap:'16px',flexWrap:'wrap'}}>
                    <span style={{fontSize:'12px',fontWeight:'700',color:'#f87171'}}>❤ {fmtN(bestPost.likes)}</span>
                    <span style={{fontSize:'12px',fontWeight:'700',color:'#60a5fa'}}>💬 {fmtN(bestPost.comments)}</span>
                    <span style={{fontSize:'12px',fontWeight:'700',color:'#6ee7b7'}}>↗ {fmtN(bestPost.shares)}</span>
                    <span style={{fontSize:'12px',fontWeight:'700',color:'#a78bfa'}}>👁 {fmtN(bestPost.reach)}</span>
                    <span style={{fontSize:'11px',color:'#6ee7b7',fontFamily:'monospace'}}>{bestPost.engagementRate}% eng.</span>
                    {bestPost.avgWatch > 0 && <span style={{fontSize:'11px',color:'#a78bfa',fontFamily:'monospace'}}>▶ {Math.round(bestPost.avgWatch)}s visto</span>}
                  </div>
                </div>
                <div style={{fontSize:'10px',color:'#333',fontFamily:'monospace',flexShrink:0}}>{new Date(bestPost.created_time).toLocaleDateString('es-MX')}</div>
              </div>
            </div>
          )}

          {/* Posts grid */}
          {posts.length > 0 && (
            <div style={{background:'#17171d',border:'1px solid rgba(255,255,255,.07)',borderRadius:'12px',padding:'16px',marginBottom:'16px'}}>
              <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'14px'}}>Publicaciones del periodo</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'10px'}}>
                {posts.map(p => (
                  <div key={p.id} style={{background:'rgba(255,255,255,.02)',borderRadius:'9px',padding:'12px',border:'1px solid rgba(255,255,255,.05)'}}>
                    <div style={{display:'flex',gap:'10px',marginBottom:'8px'}}>
                      {p.thumb && (
                        <img src={p.thumb} style={{width:'56px',height:'56px',borderRadius:'6px',objectFit:'cover',flexShrink:0}} alt="" onError={e=>e.target.style.display='none'}/>
                      )}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',gap:'6px',marginBottom:'4px',alignItems:'center'}}>
                          <span style={{fontSize:'9px',color:'#555',background:'#1a1a22',padding:'2px 6px',borderRadius:'4px',fontFamily:'monospace'}}>{p.mediaType}</span>
                          <span style={{fontSize:'9px',color:'#333',fontFamily:'monospace'}}>{new Date(p.created_time).toLocaleDateString('es-MX')}</span>
                        </div>
                        <div style={{fontSize:'11px',color:'#777',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.message||p.story||'(Sin texto)'}</div>
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'4px'}}>
                      {[
                        {l:'Likes',v:fmtN(p.likes),c:'#f87171'},
                        {l:'Coments',v:fmtN(p.comments),c:'#60a5fa'},
                        {l:'Shares',v:fmtN(p.shares),c:'#6ee7b7'},
                        {l:'Alcance',v:fmtN(p.reach),c:'#a78bfa'},
                      ].map(s=>(
                        <div key={s.l} style={{textAlign:'center',background:'#111116',borderRadius:'5px',padding:'5px 3px'}}>
                          <div style={{fontSize:'11px',fontWeight:'700',color:s.c}}>{s.v}</div>
                          <div style={{fontSize:'8px',color:'#333',fontFamily:'monospace',marginTop:'1px'}}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                    {p.avgWatch > 0 && (
                      <div style={{marginTop:'6px',fontSize:'10px',color:'#a78bfa',fontFamily:'monospace'}}>▶ Prom. visto: {Math.round(p.avgWatch)}s</div>
                    )}
                    {p.engagementRate > 0 && (
                      <div style={{marginTop:'3px',fontSize:'10px',color:'#6ee7b7',fontFamily:'monospace'}}>Engagement: {p.engagementRate}%</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Map */}
          {(geoData.regions.length > 0 || geoData.countries.length > 0) && (
            <div style={{background:'#17171d',border:'1px solid rgba(255,255,255,.07)',borderRadius:'12px',padding:'16px',marginBottom:'16px'}}>
              <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'4px'}}>Alcance por estado y pais</div>
              <div style={{fontSize:'10px',color:'#333',fontFamily:'monospace',marginBottom:'14px'}}>Personas que vieron tu contenido organico</div>
              <OrgMap regionData={geoData.regions} countryData={geoData.countries} mapId="fb-map"/>
              {/* Top regions list */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginTop:'16px'}}>
                <div>
                  <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'8px'}}>Top estados</div>
                  {geoData.regions.slice(0,6).map((r,i)=>{
                    const max = geoData.regions[0]?.value||1
                    const pct = Math.round(r.value/max*100)
                    return (
                      <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px'}}>
                        <div style={{fontSize:'10px',color:'#888',width:'120px',flexShrink:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.region}</div>
                        <div style={{flex:1,height:'5px',background:'#1a1a22',borderRadius:'3px',overflow:'hidden'}}><div style={{width:pct+'%',height:'100%',background:COLORS[i%COLORS.length],borderRadius:'3px'}}></div></div>
                        <div style={{fontSize:'10px',color:'#fff',fontFamily:'monospace',width:'50px',textAlign:'right'}}>{fmtN(r.value)}</div>
                      </div>
                    )
                  })}
                </div>
                <div>
                  <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'8px'}}>Top paises</div>
                  {geoData.countries.slice(0,6).map((c,i)=>{
                    const max = geoData.countries[0]?.value||1
                    const pct = Math.round(c.value/max*100)
                    return (
                      <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px'}}>
                        <div style={{fontSize:'10px',color:'#888',width:'40px',flexShrink:0,fontFamily:'monospace'}}>{c.country}</div>
                        <div style={{flex:1,height:'5px',background:'#1a1a22',borderRadius:'3px',overflow:'hidden'}}><div style={{width:pct+'%',height:'100%',background:COLORS[i%COLORS.length],borderRadius:'3px'}}></div></div>
                        <div style={{fontSize:'10px',color:'#fff',fontFamily:'monospace',width:'50px',textAlign:'right'}}>{fmtN(c.value)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Recomendaciones automáticas */}
          {(insights || posts.length > 0) && (() => {
            const recs = []
            const er = insights?.page_reach > 0 ? ((insights.page_post_engagements||0)/insights.page_reach*100) : 0
            const bestDay = posts.length > 0 ? (() => {
              const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
              const counts = {}
              posts.forEach(p => { const d = new Date(p.created_time).getDay(); counts[d] = (counts[d]||0) + p.totalEngagement })
              const best = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]
              return best ? days[+best[0]] : null
            })() : null

            if (er >= 3) recs.push({ icon:'🔥', title:'Excelente engagement rate', desc:`Tu tasa de engagement es ${er.toFixed(1)}%, muy por encima del promedio del sector (1-2%). Tu contenido está resonando con tu audiencia.`, color:'#10b981' })
            else if (er > 0 && er < 1) recs.push({ icon:'⚠️', title:'Engagement rate bajo', desc:`Tu tasa es ${er.toFixed(1)}%. El promedio inmobiliario es 1-3%. Prueba publicar con más frecuencia y usa imágenes de propiedades de alta calidad.`, color:'#fbbf24' })
            if (insights?.page_fan_removes_unique > insights?.page_fan_adds_unique) recs.push({ icon:'📉', title:'Estás perdiendo seguidores', desc:`Perdiste más seguidores de los que ganaste este período. Aumenta la frecuencia de publicación y mejora la calidad del contenido.`, color:'#f87171' })
            if (insights?.page_impressions > 0 && insights?.page_reach > 0) {
              const freq = ((insights.page_impressions||0)/(insights.page_reach||1)).toFixed(1)
              if (+freq > 3) recs.push({ icon:'🔄', title:'Alta frecuencia de exposición', desc:`Tu audiencia ve tu contenido en promedio ${freq} veces. Considera variar el tipo de contenido para evitar saturación.`, color:'#a78bfa' })
            }
            if (bestDay) recs.push({ icon:'📅', title:`Publica los ${bestDay}`, desc:`Tus posts del ${bestDay} generan más engagement. Programa tu contenido más importante para ese día.`, color:'#6ee7b7' })
            if (posts.length > 0) {
              const videoCount = posts.filter(p=>p.mediaType==='video').length
              const imgCount = posts.filter(p=>p.mediaType==='photo'||p.mediaType==='album').length
              if (videoCount > 0 && imgCount > 0) {
                const avgVideoEng = posts.filter(p=>p.mediaType==='video').reduce((s,p)=>s+p.totalEngagement,0)/videoCount
                const avgImgEng = posts.filter(p=>p.mediaType==='photo'||p.mediaType==='album').reduce((s,p)=>s+p.totalEngagement,0)/imgCount
                if (avgVideoEng > avgImgEng * 1.3) recs.push({ icon:'🎥', title:'Los videos te funcionan mejor', desc:`Tus videos generan ${Math.round(avgVideoEng)} interacciones en promedio vs ${Math.round(avgImgEng)} de las fotos. Aumenta la producción de video.`, color:'#f97316' })
                else if (avgImgEng > avgVideoEng * 1.3) recs.push({ icon:'📸', title:'Las fotos generan más engagement', desc:`Para esta página, las imágenes funcionan mejor que los videos. Enfócate en fotos de alta calidad de las propiedades.`, color:'#60a5fa' })
              }
            }
            if (recs.length === 0 && insights) recs.push({ icon:'💡', title:'Sigue publicando consistentemente', desc:'La consistencia es clave en redes sociales. Publica al menos 3-4 veces por semana para mantener el alcance orgánico activo.', color:'#a5b4fc' })

            return recs.length > 0 ? (
              <div style={{background:'var(--sidebar)',border:'1px solid var(--border)',borderRadius:'12px',padding:'16px',marginBottom:'16px'}}>
                <div style={{fontSize:'10px',color:'var(--text4)',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'12px'}}>💡 Recomendaciones inteligentes</div>
                <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  {recs.slice(0,4).map((r,i)=>(
                    <div key={i} style={{display:'flex',gap:'10px',padding:'10px 12px',background:'rgba(255,255,255,.03)',borderRadius:'8px',border:'1px solid rgba(255,255,255,.06)'}}>
                      <span style={{fontSize:'16px',flexShrink:0}}>{r.icon}</span>
                      <div>
                        <div style={{fontSize:'11px',fontWeight:'700',color:r.color,marginBottom:'2px'}}>{r.title}</div>
                        <div style={{fontSize:'10px',color:'var(--text4)',lineHeight:'1.55'}}>{r.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          })()}

          {posts.length === 0 && !loading && (
            <div style={{textAlign:'center',padding:'40px',color:'var(--text4)',fontSize:'12px'}}>
              Esta página no tiene publicaciones recientes. Comienza a publicar desde <a href="/dashboard/publicar" style={{color:'#a5b4fc',textDecoration:'none'}}>Crear Post →</a>
            </div>
          )}
        </>
      )}
    </div>
  )
}
