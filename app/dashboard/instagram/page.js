'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const PRESETS = [
  { label: 'Hoy', value: 'today' },
  { label: 'Ayer', value: 'yesterday' },
  { label: '7 dias', value: 'last_7d' },
  { label: '30 dias', value: 'last_30d' },
  { label: 'Personalizado', value: 'custom' },
]

const REGION_COORDS = {
  'Ciudad de Mexico':{lat:19.4326,lng:-99.1332},'Distrito Federal':{lat:19.4326,lng:-99.1332},'Mexico City':{lat:19.4326,lng:-99.1332},
  'Estado de Mexico':{lat:19.2952,lng:-99.8938},'State of Mexico':{lat:19.2952,lng:-99.8938},
  'Jalisco':{lat:20.6597,lng:-103.3496},'Nuevo Leon':{lat:25.5922,lng:-99.9962},'Nuevo León':{lat:25.5922,lng:-99.9962},
  'Puebla':{lat:19.0414,lng:-98.2063},'Veracruz':{lat:19.1738,lng:-96.1342},
  'Guanajuato':{lat:21.019,lng:-101.2574},'Chihuahua':{lat:28.6353,lng:-106.0889},
  'Quintana Roo':{lat:19.1817,lng:-88.4791},'Yucatan':{lat:20.7099,lng:-89.0943},'Yucatán':{lat:20.7099,lng:-89.0943},
  'Bogota':{lat:4.711,lng:-74.0721},'Buenos Aires':{lat:-34.6037,lng:-58.3816},
  'Santiago':{lat:-33.4489,lng:-70.6693},'Lima':{lat:-12.0464,lng:-77.0428},
  'Madrid':{lat:40.4168,lng:-3.7038},'Miami':{lat:25.7617,lng:-80.1918},
}

const COUNTRY_COORDS = {
  MX:{lat:23.6345,lng:-102.5528,name:'Mexico'},US:{lat:37.0902,lng:-95.7129,name:'EEUU'},
  CO:{lat:4.5709,lng:-74.2973,name:'Colombia'},AR:{lat:-38.4161,lng:-63.6167,name:'Argentina'},
  CL:{lat:-35.6751,lng:-71.543,name:'Chile'},ES:{lat:40.4637,lng:-3.7492,name:'Espana'},
  BR:{lat:-14.235,lng:-51.9253,name:'Brasil'},PE:{lat:-9.19,lng:-75.0152,name:'Peru'},
}

const COLORS = ['#6ee7b7','#3b82f6','#f97316','#a78bfa','#fcd34d','#f87171','#ec4899','#14b8a6']

function getDateRange(preset, customFrom, customTo) {
  const now = new Date()
  const fmt = d => Math.floor(d.getTime()/1000)
  if (preset==='custom') return {since:Math.floor(new Date(customFrom).getTime()/1000),until:Math.floor(new Date(customTo).getTime()/1000)}
  if (preset==='today'){const s=new Date(now);s.setHours(0,0,0,0);return{since:fmt(s),until:fmt(now)}}
  if (preset==='yesterday'){const s=new Date(now);s.setDate(s.getDate()-1);s.setHours(0,0,0,0);const e=new Date(s);e.setHours(23,59,59,0);return{since:fmt(s),until:fmt(e)}}
  if (preset==='last_7d'){const s=new Date(now);s.setDate(s.getDate()-7);return{since:fmt(s),until:fmt(now)}}
  if (preset==='last_30d'){const s=new Date(now);s.setDate(s.getDate()-30);return{since:fmt(s),until:fmt(now)}}
  return{since:fmt(new Date(now.getTime()-28*864e5)),until:fmt(now)}
}

const fmtN = v => (+v||0)>=1e6?((+v/1e6).toFixed(1)+'M'):(+v||0)>=1e3?((+v/1e3).toFixed(1)+'K'):String(Math.round(+v||0))
const fmtP = v => ((+v)||0).toFixed(2)+'%'

const chartOpts = () => ({
  responsive:true,maintainAspectRatio:false,
  plugins:{legend:{labels:{color:'#666',font:{size:10},boxWidth:10}},tooltip:{backgroundColor:'#1a1a1e',titleColor:'#fff',bodyColor:'#888',padding:10,cornerRadius:8}},
  scales:{x:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#444',font:{size:9},maxRotation:30}},y:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#444',font:{size:9}}}}
})

function IgMap({ regionData, countryData }) {
  const mapRef = React.useRef(null)
  const mapInstanceRef = React.useRef(null)
  const RC = REGION_COORDS
  const CC = COUNTRY_COORDS

  React.useEffect(() => {
    if (typeof window==='undefined'||!mapRef.current) return
    if (mapInstanceRef.current){mapInstanceRef.current.remove();mapInstanceRef.current=null}
    const link=document.createElement('link');link.rel='stylesheet';link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(link)
    const script=document.createElement('script');script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload=()=>{
      if (!mapRef.current||mapInstanceRef.current) return
      const L=window.L
      const map=L.map(mapRef.current,{center:[22,-95],zoom:4,zoomControl:true,scrollWheelZoom:true})
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{attribution:'',maxZoom:12}).addTo(map)
      mapInstanceRef.current=map
      const style=document.createElement('style');style.textContent='.dp .leaflet-popup-content-wrapper{background:#18181f;border:1px solid #2a2a35;border-radius:8px;color:#fff}.dp .leaflet-popup-tip{background:#18181f}.leaflet-popup-content{margin:0;padding:0}';document.head.appendChild(style)
      const maxR=+(regionData?.[0]?.value||0)
      let topLat=22,topLng=-95,topZoom=5,has=false
      ;(regionData||[]).forEach((r,i)=>{
        const coords=RC[r.region||r.name];if(!coords)return
        const val=+r.value||0;const size=Math.max(12,Math.min(40,(val/maxR)*40))
        const color=i===0?'#e1306c':i<3?'#f97316':'#a78bfa'
        L.circleMarker([coords.lat,coords.lng],{radius:size,fillColor:color,color:color,weight:2,opacity:.9,fillOpacity:.35}).addTo(map)
          .bindPopup(`<div style="padding:10px;min-width:130px"><div style="font-weight:700;font-size:13px;margin-bottom:5px;color:#fff">${r.region||r.name}</div><div style="color:#e1306c;font-size:12px">${fmtN(val)} personas</div></div>`,{className:'dp'})
        if(i===0){topLat=coords.lat;topLng=coords.lng;topZoom=6;has=true}
      })
      ;(countryData||[]).forEach((c,i)=>{
        const coords=CC[c.country||c.code];if(!coords)return
        const val=+c.value||0;const size=Math.max(8,Math.min(20,(val/(+(countryData[0]?.value||1)))*20))
        L.circleMarker([coords.lat,coords.lng],{radius:size,fillColor:'#fcd34d',color:'#fcd34d',weight:1,opacity:.6,fillOpacity:.2}).addTo(map)
          .bindPopup(`<div style="padding:10px;min-width:130px"><div style="font-weight:700;font-size:13px;margin-bottom:5px;color:#fff">${coords.name}</div><div style="color:#fcd34d;font-size:12px">${fmtN(val)} personas</div></div>`,{className:'dp'})
        if(!has&&i===0){topLat=coords.lat;topLng=coords.lng;topZoom=5}
      })
      setTimeout(()=>map.flyTo([topLat,topLng],topZoom,{duration:1.5}),600)
    }
    document.head.appendChild(script)
    return()=>{if(mapInstanceRef.current){mapInstanceRef.current.remove();mapInstanceRef.current=null}}
  },[regionData,countryData])

  return (
    <div style={{position:'relative'}}>
      <div ref={mapRef} style={{height:'360px',borderRadius:'8px',overflow:'hidden',background:'#0d0d12'}}></div>
      <div style={{position:'absolute',top:'10px',right:'10px',background:'rgba(10,10,14,.9)',border:'1px solid #2a2a35',borderRadius:'8px',padding:'8px 12px',zIndex:1000}}>
        <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'3px'}}><div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#e1306c'}}></div><span style={{fontSize:'10px',color:'#888',fontFamily:'monospace'}}>Estados</span></div>
        <div style={{display:'flex',alignItems:'center',gap:'5px'}}><div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#fcd34d'}}></div><span style={{fontSize:'10px',color:'#888',fontFamily:'monospace'}}>Paises</span></div>
      </div>
    </div>
  )
}

export default function InstagramPage() {
  const [token, setToken] = useState(null)
  const [igAccounts, setIgAccounts] = useState([])
  const [activeIg, setActiveIg] = useState(null)
  const [loading, setLoading] = useState(false)
  const [preset, setPreset] = useState('last_30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [insights, setInsights] = useState(null)
  const [media, setMedia] = useState([])
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

  useEffect(() => { if (token) fetchIgAccounts() }, [token])
  useEffect(() => { if (token && activeIg) fetchInsights() }, [token, activeIg, preset, customFrom, customTo])

  async function fetchIgAccounts() {
    try {
      // CRÍTICO: incluir access_token en fields para obtener el token de página
      const pagesRes = await fetch('https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,name,username,followers_count,media_count,profile_picture_url,biography}&access_token='+token+'&limit=50')
      const pagesJ = await pagesRes.json()
      const igIds = (pagesJ.data||[])
        .filter(p=>p.instagram_business_account)
        .map(p=>({
          ...p.instagram_business_account,
          page_name: p.name,
          page_token: p.access_token  // token de página — requerido para insights
        }))
      const valid = igIds.filter(a=>a.username)
      setIgAccounts(valid)
      if (valid.length>0) setActiveIg(valid[0])
    } catch(e){console.error(e)}
  }

  async function fetchInsights() {
    if (!activeIg) return
    setLoading(true)
    setInsights(null); setMedia([]); setDailyData([]); setGeoData({regions:[],countries:[]})
    try {
      const range = getDateRange(preset, customFrom, customTo)
      if (!range.since||!range.until){setLoading(false);return}
      const ig_id = activeIg.id
      // CRÍTICO: usar el token de la página, no el token de usuario
      // El token de usuario no tiene permiso para ver insights de IG ni métricas de audiencia
      const pageTok = activeIg.page_token || token

      // Separar métricas seguras de las que pueden fallar
      // follower_count y website_clicks en llamadas independientes para que no rompan reach/impressions
      const [insR, mediaR, audienceCountryR, audienceCityR, followerR, websiteR] = await Promise.all([
        fetch(`https://graph.facebook.com/v21.0/${ig_id}/insights?metric=reach,impressions,profile_views&period=day&since=${range.since}&until=${range.until}&access_token=${pageTok}`),
        fetch(`https://graph.facebook.com/v21.0/${ig_id}/media?fields=id,caption,media_type,timestamp,like_count,comments_count,media_url,thumbnail_url,permalink,insights.metric(reach,impressions,saved,video_views,shares)&limit=20&access_token=${pageTok}`),
        fetch(`https://graph.facebook.com/v21.0/${ig_id}/insights?metric=audience_country&period=lifetime&access_token=${pageTok}`),
        fetch(`https://graph.facebook.com/v21.0/${ig_id}/insights?metric=audience_city&period=lifetime&access_token=${pageTok}`),
        fetch(`https://graph.facebook.com/v21.0/${ig_id}/insights?metric=follower_count&period=day&since=${range.since}&until=${range.until}&access_token=${pageTok}`),
        fetch(`https://graph.facebook.com/v21.0/${ig_id}/insights?metric=profile_website_clicks&period=day&since=${range.since}&until=${range.until}&access_token=${pageTok}`),
      ])

      const [insJ, mediaJ, audienceCountryJ, audienceCityJ, followerJ, websiteJ] = await Promise.all([insR.json(),mediaR.json(),audienceCountryR.json(),audienceCityR.json(),followerR.json(),websiteR.json()])

      // Process insights - sum daily values
      const ins = {}
      const dailyReach = []
      ;(insJ.data||[]).forEach(m => {
        const total = (m.values||[]).reduce((s,v)=>s+(+v.value||0),0)
        ins[m.name] = total
        if (m.name==='reach') {
          ;(m.values||[]).forEach(v => dailyReach.push({date:v.end_time?.slice(5,10),value:v.value}))
        }
      })
      // Procesar métricas separadas (follower_count y website_clicks — pueden fallar individualmente)
      // follower_count: tomar último valor - primer valor = cambio neto en el período
      const followerVals = followerJ.data?.[0]?.values || []
      if (followerVals.length >= 2) {
        ins.follower_count = (+followerVals[followerVals.length-1].value||0) - (+followerVals[0].value||0)
      }
      ;(websiteJ.data||[]).forEach(m => {
        ins.website_clicks = (m.values||[]).reduce((s,v)=>s+(+v.value||0),0)
      })
      setInsights(ins)
      setDailyData(dailyReach)

      // Process media
      const processedMedia = (mediaJ.data||[]).map(m => {
        const mIns = {}
        ;(m.insights?.data||[]).forEach(i => { mIns[i.name] = i.values?.[0]?.value || 0 })
        return {
          ...m,
          reach: mIns.reach||0,
          impressions: mIns.impressions||0,
          saved: mIns.saved||0,
          video_views: mIns.video_views||0,
          avg_watch: 0,
          shares: mIns.shares||0,
          totalEngagement: (m.like_count||0)+(m.comments_count||0)+(mIns.saved||0)+(mIns.shares||0),
          engagementRate: mIns.reach>0?(((m.like_count||0)+(m.comments_count||0)+(mIns.saved||0))/mIns.reach*100).toFixed(2):0,
          thumb: m.thumbnail_url || m.media_url || null,
        }
      }).sort((a,b)=>b.totalEngagement-a.totalEngagement)
      setMedia(processedMedia)

      // Geo
      const countryVal = audienceCountryJ.data?.[0]?.values?.[0]?.value || {}
      const cityVal = audienceCityJ.data?.[0]?.values?.[0]?.value || {}
      const countries = Object.entries(countryVal).map(([c,v])=>({country:c,value:v})).sort((a,b)=>b.value-a.value).slice(0,10)
      const regions = Object.entries(cityVal).map(([r,v])=>({region:r.split(',')[0],value:v})).sort((a,b)=>b.value-a.value).slice(0,15)
      setGeoData({regions,countries})
    } catch(e){console.error(e)}
    setLoading(false)
  }

  const bestPost = media[0]
  const avgVideoWatch = media.filter(m=>m.avg_watch>0).reduce((s,m,_,arr)=>s+m.avg_watch/arr.length,0)

  return (
    <div style={{padding:'20px',fontFamily:'"Plus Jakarta Sans",sans-serif'}}>

      {/* Account selector */}
      {igAccounts.length > 0 && (
        <div style={{display:'flex',gap:'6px',marginBottom:'16px',flexWrap:'wrap'}}>
          {igAccounts.map(ig=>(
            <div key={ig.id} onClick={()=>setActiveIg(ig)}
              style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 12px',background:activeIg?.id===ig.id?'rgba(225,48,108,.1)':'rgba(255,255,255,.03)',border:'1px solid '+(activeIg?.id===ig.id?'rgba(225,48,108,.3)':'rgba(255,255,255,.07)'),borderRadius:'9px',cursor:'pointer'}}>
              {ig.profile_picture_url
                ?<img src={ig.profile_picture_url} style={{width:'28px',height:'28px',borderRadius:'50%',border:'2px solid #e1306c',flexShrink:0}} alt=""/>
                :<div style={{width:'28px',height:'28px',borderRadius:'50%',background:'linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'11px',fontWeight:'700',flexShrink:0}}>ig</div>}
              <div>
                <div style={{fontSize:'11px',fontWeight:'700',color:activeIg?.id===ig.id?'#e1306c':'#ccc'}}>@{ig.username}</div>
                <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace'}}>{fmtN(ig.followers_count||0)} seguidores</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Date presets */}
      <div style={{display:'flex',gap:'4px',marginBottom:'8px',flexWrap:'wrap'}}>
        {PRESETS.map(p=>(
          <button key={p.value} onClick={()=>{setPreset(p.value);setShowCustom(p.value==='custom')}}
            style={{padding:'5px 10px',borderRadius:'6px',border:'1px solid',fontSize:'10px',cursor:'pointer',fontFamily:'monospace',borderColor:preset===p.value?'#fff':'#222',background:preset===p.value?'#fff':'transparent',color:preset===p.value?'#0a0a0e':'#555',fontWeight:preset===p.value?'700':'400'}}>
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

      {loading && <div style={{textAlign:'center',padding:'60px',color:'#333',fontFamily:'monospace',fontSize:'12px'}}>Cargando datos de Instagram...</div>}

      {!loading && !activeIg && (
        <div style={{background:'#17171d',border:'1px solid rgba(255,255,255,.07)',borderRadius:'12px',padding:'40px',textAlign:'center',maxWidth:'520px',margin:'20px auto'}}>
          <div style={{width:'56px',height:'56px',borderRadius:'14px',background:'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'24px',margin:'0 auto 16px'}}>◉</div>
          <h2 style={{fontSize:'16px',fontWeight:'800',color:'#fff',marginBottom:'8px'}}>No se encontraron cuentas de Instagram Business</h2>
          <p style={{fontSize:'12px',color:'#666',lineHeight:'1.7',marginBottom:'20px',maxWidth:'380px',margin:'0 auto 20px'}}>
            Para ver métricas orgánicas de Instagram necesitas una <strong style={{color:'#aaa'}}>cuenta de Instagram Business o Creator</strong> vinculada a una Página de Facebook que administres.
          </p>
          <div style={{background:'rgba(225,48,108,.06)',border:'1px solid rgba(225,48,108,.15)',borderRadius:'8px',padding:'12px 16px',marginBottom:'20px',fontSize:'11px',color:'#999',textAlign:'left',lineHeight:'1.7'}}>
            <strong style={{color:'#e1306c'}}>Pasos para conectar:</strong><br/>
            1. Ve a Instagram → Configuración → Cuenta → Cambiar a cuenta profesional<br/>
            2. Vincula tu cuenta a una Página de Facebook<br/>
            3. Reconecta Meta Ads aquí abajo
          </div>
          <a href="/api/auth/meta" style={{display:'inline-flex',alignItems:'center',gap:'8px',padding:'10px 20px',borderRadius:'8px',background:'linear-gradient(135deg,#f09433,#bc1888)',color:'#fff',fontSize:'12px',fontWeight:'700',textDecoration:'none'}}>
            🔗 Reconectar con Meta
          </a>
        </div>
      )}

      {!loading && activeIg && (
        <>
          {/* IG Header */}
          <div style={{background:'#17171d',border:'1px solid rgba(255,255,255,.07)',borderRadius:'12px',padding:'16px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'12px'}}>
            {activeIg.profile_picture_url
              ?<img src={activeIg.profile_picture_url} style={{width:'48px',height:'48px',borderRadius:'50%',border:'2px solid #e1306c'}} alt=""/>
              :<div style={{width:'48px',height:'48px',borderRadius:'50%',background:'linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'20px',fontWeight:'700'}}>ig</div>}
            <div style={{flex:1}}>
              <div style={{color:'#fff',fontSize:'15px',fontWeight:'800'}}>@{activeIg.username}</div>
              <div style={{color:'#444',fontSize:'10px',fontFamily:'monospace',marginTop:'2px'}}>{activeIg.name}</div>
              {activeIg.biography && <div style={{color:'#555',fontSize:'10px',marginTop:'3px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{activeIg.biography}</div>}
            </div>
            <div style={{display:'flex',gap:'20px',flexShrink:0}}>
              <div style={{textAlign:'center'}}><div style={{fontSize:'20px',fontWeight:'800',color:'#fff'}}>{fmtN(activeIg.followers_count||0)}</div><div style={{fontSize:'9px',color:'#444',fontFamily:'monospace'}}>seguidores</div></div>
              <div style={{textAlign:'center'}}><div style={{fontSize:'20px',fontWeight:'800',color:'#fff'}}>{fmtN(activeIg.media_count||0)}</div><div style={{fontSize:'9px',color:'#444',fontFamily:'monospace'}}>posts</div></div>
            </div>
          </div>

          {/* KPI Grid */}
          {insights && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:'8px',marginBottom:'16px'}}>
              {[
                {l:'Alcance',v:fmtN(insights.reach||0),c:'#e1306c',icon:'👁'},
                {l:'Impresiones',v:fmtN(insights.impressions||0),c:'#fb923c',icon:'📡'},
                {l:'Vistas perfil',v:fmtN(insights.profile_views||0),c:'#a78bfa',icon:'🔍'},
                {l:'Nuevos seguidores',v:fmtN(insights.follower_count||0),c:'#6ee7b7',icon:'➕'},
                {l:'Clicks web',v:fmtN(insights.website_clicks||0),c:'#60a5fa',icon:'🔗'},
                {l:'Posts periodo',v:fmtN(media.length),c:'#fff',icon:'📸'},
                {l:'Total engagement',v:fmtN(media.reduce((s,m)=>s+m.totalEngagement,0)),c:'#fb923c',icon:'❤️'},
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
                <Line data={{labels:dailyData.map(d=>d.date),datasets:[{label:'Alcance',data:dailyData.map(d=>d.value),borderColor:'#e1306c',backgroundColor:'rgba(225,48,108,.08)',fill:true,tension:.4,pointRadius:2,borderWidth:2}]}} options={chartOpts()}/>
              </div>
            </div>
          )}

          {/* Best post */}
          {bestPost && (
            <div style={{background:'rgba(225,48,108,.05)',border:'1px solid rgba(225,48,108,.15)',borderRadius:'12px',padding:'16px',marginBottom:'16px'}}>
              <div style={{fontSize:'10px',color:'#e1306c',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'12px'}}>🏆 Post con mayor engagement</div>
              <div style={{display:'flex',gap:'12px',alignItems:'flex-start'}}>
                {bestPost.thumb && (
                  <img src={bestPost.thumb} style={{width:'80px',height:'80px',borderRadius:'8px',objectFit:'cover',flexShrink:0}} alt="" onError={e=>e.target.style.display='none'}/>
                )}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',gap:'6px',marginBottom:'6px'}}>
                    <span style={{fontSize:'9px',color:'#555',background:'#1a1a22',padding:'2px 6px',borderRadius:'4px',fontFamily:'monospace'}}>{bestPost.media_type}</span>
                    <span style={{fontSize:'9px',color:'#333',fontFamily:'monospace'}}>{new Date(bestPost.timestamp).toLocaleDateString('es-MX')}</span>
                  </div>
                  {bestPost.caption && <div style={{fontSize:'12px',color:'#aaa',marginBottom:'8px',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{bestPost.caption}</div>}
                  <div style={{display:'flex',gap:'14px',flexWrap:'wrap'}}>
                    <span style={{fontSize:'12px',fontWeight:'700',color:'#f87171'}}>❤ {fmtN(bestPost.like_count)}</span>
                    <span style={{fontSize:'12px',fontWeight:'700',color:'#60a5fa'}}>💬 {fmtN(bestPost.comments_count)}</span>
                    <span style={{fontSize:'12px',fontWeight:'700',color:'#fb923c'}}>🔖 {fmtN(bestPost.saved)}</span>
                    <span style={{fontSize:'12px',fontWeight:'700',color:'#6ee7b7'}}>👁 {fmtN(bestPost.reach)}</span>
                    <span style={{fontSize:'11px',color:'#6ee7b7',fontFamily:'monospace'}}>{bestPost.engagementRate}% eng.</span>
                    {bestPost.video_views>0 && <span style={{fontSize:'11px',color:'#a78bfa',fontFamily:'monospace'}}>▶ {fmtN(bestPost.video_views)} vistas</span>}
                    {bestPost.avg_watch>0 && <span style={{fontSize:'11px',color:'#a78bfa',fontFamily:'monospace'}}>⏱ {Math.round(bestPost.avg_watch)}s prom.</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Media grid */}
          {media.length > 0 && (
            <div style={{background:'#17171d',border:'1px solid rgba(255,255,255,.07)',borderRadius:'12px',padding:'16px',marginBottom:'16px'}}>
              <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'14px'}}>Publicaciones recientes — ordenadas por engagement</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:'10px'}}>
                {media.map(m=>(
                  <div key={m.id} style={{background:'rgba(255,255,255,.02)',borderRadius:'9px',padding:'12px',border:'1px solid rgba(255,255,255,.04)'}}>
                    <div style={{display:'flex',gap:'10px',marginBottom:'8px'}}>
                      {m.thumb && (
                        <img src={m.thumb} style={{width:'56px',height:'56px',borderRadius:'6px',objectFit:'cover',flexShrink:0}} alt="" onError={e=>e.target.style.display='none'}/>
                      )}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',gap:'5px',marginBottom:'4px',alignItems:'center'}}>
                          <span style={{fontSize:'9px',color:'#555',background:'#1a1a22',padding:'2px 6px',borderRadius:'4px',fontFamily:'monospace'}}>{m.media_type}</span>
                          <span style={{fontSize:'9px',color:'#333',fontFamily:'monospace'}}>{new Date(m.timestamp).toLocaleDateString('es-MX')}</span>
                        </div>
                        {m.caption && <div style={{fontSize:'11px',color:'#666',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.caption.slice(0,60)}</div>}
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'4px',marginBottom:'6px'}}>
                      {[
                        {l:'Likes',v:fmtN(m.like_count||0),c:'#f87171'},
                        {l:'Coments',v:fmtN(m.comments_count||0),c:'#60a5fa'},
                        {l:'Guardados',v:fmtN(m.saved||0),c:'#fb923c'},
                        {l:'Alcance',v:fmtN(m.reach||0),c:'#6ee7b7'},
                      ].map(s=>(
                        <div key={s.l} style={{textAlign:'center',background:'#111116',borderRadius:'5px',padding:'5px 3px'}}>
                          <div style={{fontSize:'11px',fontWeight:'700',color:s.c}}>{s.v}</div>
                          <div style={{fontSize:'8px',color:'#333',fontFamily:'monospace',marginTop:'1px'}}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                    {m.video_views>0 && <div style={{fontSize:'10px',color:'#a78bfa',fontFamily:'monospace'}}>▶ {fmtN(m.video_views)} vistas{m.avg_watch>0?' · '+Math.round(m.avg_watch)+'s prom.':''}</div>}
                    {m.engagementRate>0 && <div style={{fontSize:'10px',color:'#6ee7b7',fontFamily:'monospace',marginTop:'2px'}}>Engagement: {m.engagementRate}%</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Map */}
          {(geoData.regions.length>0||geoData.countries.length>0) && (
            <div style={{background:'#17171d',border:'1px solid rgba(255,255,255,.07)',borderRadius:'12px',padding:'16px',marginBottom:'16px'}}>
              <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'4px'}}>Audiencia por ubicacion</div>
              <div style={{fontSize:'10px',color:'#333',fontFamily:'monospace',marginBottom:'14px'}}>Donde se encuentran tus seguidores</div>
              <IgMap regionData={geoData.regions} countryData={geoData.countries}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginTop:'16px'}}>
                <div>
                  <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'8px'}}>Top ciudades/estados</div>
                  {geoData.regions.slice(0,6).map((r,i)=>{
                    const max=geoData.regions[0]?.value||1;const pct=Math.round(r.value/max*100)
                    return (<div key={i} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px'}}>
                      <div style={{fontSize:'10px',color:'#888',width:'120px',flexShrink:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.region}</div>
                      <div style={{flex:1,height:'5px',background:'#1a1a22',borderRadius:'3px',overflow:'hidden'}}><div style={{width:pct+'%',height:'100%',background:COLORS[i%COLORS.length],borderRadius:'3px'}}></div></div>
                      <div style={{fontSize:'10px',color:'#fff',fontFamily:'monospace',width:'50px',textAlign:'right'}}>{fmtN(r.value)}</div>
                    </div>)
                  })}
                </div>
                <div>
                  <div style={{fontSize:'9px',color:'#333',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'8px'}}>Top paises</div>
                  {geoData.countries.slice(0,6).map((c,i)=>{
                    const max=geoData.countries[0]?.value||1;const pct=Math.round(c.value/max*100)
                    return (<div key={i} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px'}}>
                      <div style={{fontSize:'10px',color:'#888',width:'40px',flexShrink:0,fontFamily:'monospace'}}>{c.country}</div>
                      <div style={{flex:1,height:'5px',background:'#1a1a22',borderRadius:'3px',overflow:'hidden'}}><div style={{width:pct+'%',height:'100%',background:COLORS[i%COLORS.length],borderRadius:'3px'}}></div></div>
                      <div style={{fontSize:'10px',color:'#fff',fontFamily:'monospace',width:'50px',textAlign:'right'}}>{fmtN(c.value)}</div>
                    </div>)
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Recomendaciones automáticas IG */}
          {(insights || media.length > 0) && (() => {
            const recs = []
            const totalEng = media.reduce((s,m)=>s+m.totalEngagement,0)
            const avgEng = media.length > 0 ? totalEng/media.length : 0
            const reels = media.filter(m=>m.media_type==='REELS'||m.media_type==='VIDEO')
            const images = media.filter(m=>m.media_type==='IMAGE'||m.media_type==='CAROUSEL_ALBUM')
            // Comparar por tasa de engagement (ER%) normalizada por alcance, no por conteo bruto
            const avgReelEr = reels.length > 0 ? reels.reduce((s,m)=>s+(+m.engagementRate||0),0)/reels.length : 0
            const avgImgEr = images.length > 0 ? images.reduce((s,m)=>s+(+m.engagementRate||0),0)/images.length : 0

            if (reels.length > 0 && images.length > 0) {
              if (avgReelEr > avgImgEr * 1.2) recs.push({ icon:'🎬', title:'Los Reels te funcionan mejor', desc:`Tus videos/Reels tienen un ER promedio de ${avgReelEr.toFixed(1)}% vs ${avgImgEr.toFixed(1)}% de las fotos. Instagram prioriza el video — publica más Reels.`, color:'#f97316' })
              else if (avgImgEr > avgReelEr * 1.2) recs.push({ icon:'📸', title:'Las fotos tienen mejor engagement', desc:`Tus imágenes/carruseles tienen un ER de ${avgImgEr.toFixed(1)}% vs ${avgReelEr.toFixed(1)}% de los videos. Para propiedades inmobiliarias, las fotos de alta calidad conectan bien.`, color:'#e1306c' })
              else recs.push({ icon:'📊', title:'Balance Reels y fotos', desc:`Tu audiencia responde bien a ambos formatos (Reels ${avgReelEr.toFixed(1)}% ER, fotos ${avgImgEr.toFixed(1)}% ER). Alterna para mantener variedad.`, color:'#a78bfa' })
            } else if (reels.length > 0 && images.length === 0) {
              recs.push({ icon:'🎬', title:'Todo tu contenido es video', desc:`ER promedio de tus videos: ${avgReelEr.toFixed(1)}%. Prueba agregar carruseles de propiedades para diversificar.`, color:'#f97316' })
            } else if (images.length > 0 && reels.length === 0) {
              recs.push({ icon:'📸', title:'Prueba publicar Reels', desc:`Solo tienes fotos. Los Reels tienen mayor alcance orgánico en Instagram — muestra tours de propiedades en video corto.`, color:'#e1306c' })
            }

            if (insights?.profile_views > 0 && insights?.follower_count > 0) {
              const convRate = (insights.follower_count / insights.profile_views * 100).toFixed(1)
              if (+convRate < 5) recs.push({ icon:'👤', title:'Optimiza tu bio de Instagram', desc:`Solo el ${convRate}% de quienes visitan tu perfil te siguen. Mejora tu bio con tu propuesta de valor y una llamada a la acción clara.`, color:'#a78bfa' })
            }
            if (insights?.website_clicks > 0) recs.push({ icon:'🔗', title:`${fmtN(insights.website_clicks)} clicks al link de bio`, desc:'Aprovecha el tráfico al link de tu bio — asegúrate de que el destino sea una página de contacto o catálogo de propiedades.', color:'#6ee7b7' })
            if (media.length > 0) {
              const bestDay = (() => {
                const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
                const counts = {}
                media.forEach(m => { const d = new Date(m.timestamp).getDay(); counts[d] = (counts[d]||0) + m.totalEngagement })
                const best = Object.entries(counts).sort((a,b)=>+b[1]-+a[1])[0]
                return best ? days[+best[0]] : null
              })()
              if (bestDay) recs.push({ icon:'📅', title:`Publica los ${bestDay}`, desc:`Tus posts del ${bestDay} generan más engagement. Programa tu contenido más importante ese día.`, color:'#60a5fa' })
            }
            if (recs.length === 0) recs.push({ icon:'💡', title:'Publica 4-5 veces por semana', desc:'La consistencia es clave. En Instagram, la frecuencia de publicación impacta directamente el alcance orgánico. Combina Reels, carruseles y fotos.', color:'#a5b4fc' })

            return (
              <div style={{background:'#17171d',border:'1px solid rgba(255,255,255,.07)',borderRadius:'12px',padding:'16px',marginBottom:'16px'}}>
                <div style={{fontSize:'10px',color:'#444',fontFamily:'monospace',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'12px'}}>💡 Recomendaciones inteligentes</div>
                <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  {recs.slice(0,4).map((r,i)=>(
                    <div key={i} style={{display:'flex',gap:'10px',padding:'10px 12px',background:'rgba(255,255,255,.03)',borderRadius:'8px',border:'1px solid rgba(255,255,255,.05)'}}>
                      <span style={{fontSize:'16px',flexShrink:0}}>{r.icon}</span>
                      <div>
                        <div style={{fontSize:'11px',fontWeight:'700',color:r.color,marginBottom:'2px'}}>{r.title}</div>
                        <div style={{fontSize:'10px',color:'#555',lineHeight:'1.55'}}>{r.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          {media.length===0 && !loading && (
            <div style={{textAlign:'center',padding:'40px',fontSize:'12px'}}>
              <div style={{color:'var(--text4)',marginBottom:'8px'}}>Esta cuenta no tiene publicaciones recientes.</div>
              <a href="/dashboard/publicar" style={{color:'#e1306c',textDecoration:'none',fontSize:'12px',fontWeight:'600'}}>Crea tu primer post →</a>
            </div>
          )}
        </>
      )}
    </div>
  )
}
