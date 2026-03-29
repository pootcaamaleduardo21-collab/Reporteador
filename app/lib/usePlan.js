'use client'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function usePlan() {
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single()
      setPlan(profile?.plan || 'free')
      setLoading(false)
    }
    init()
  }, [])

  const isFree    = plan === 'free' || plan === null
  const isStarter = ['starter', 'pro', 'agency'].includes(plan)
  const isPro     = ['pro', 'agency'].includes(plan)
  const isAgency  = plan === 'agency'
  const planLevel = { agency: 3, pro: 2, starter: 1, free: 0 }[plan] ?? 0

  return { plan, isFree, isStarter, isPro, isAgency, planLevel, loading }
}
