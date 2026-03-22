'use client'
import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({})

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark')
  const [language, setLanguage] = useState('es')
  const [currency, setCurrency] = useState('MXN')

  useEffect(() => {
    const prefs = JSON.parse(localStorage.getItem('reporteador_prefs') || '{}')
    if (prefs.theme) applyTheme(prefs.theme)
    if (prefs.language) setLanguage(prefs.language)
    if (prefs.currency) setCurrency(prefs.currency)
  }, [])

  function applyTheme(t) {
    setTheme(t)
    const root = document.documentElement
    if (t === 'Claro') {
      root.setAttribute('data-theme', 'light')
      document.body.style.cssText = 'background:#f0f2f5!important;color:#0c0c10!important'
    } else {
      root.setAttribute('data-theme', 'dark')
      document.body.style.cssText = 'background:#0c0c10!important;color:#fff!important'
    }
  }

  function savePrefs(newTheme, newLang, newCurrency, newPeriod) {
    const prefs = { theme: newTheme, language: newLang, currency: newCurrency, defaultPeriod: newPeriod }
    localStorage.setItem('reporteador_prefs', JSON.stringify(prefs))
    applyTheme(newTheme)
    setLanguage(newLang)
    setCurrency(newCurrency)
  }

  return (
    <ThemeContext.Provider value={{ theme, language, currency, applyTheme, savePrefs }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
