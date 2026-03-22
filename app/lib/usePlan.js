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

  const isPro = plan === 'pro'
  const isFree = plan === 'free' || plan === null

  return { plan, isPro, isFree, loading }
}
