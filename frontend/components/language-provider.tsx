'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { translations, type Language, type TranslationKey } from '@/lib/translations'

interface LanguageContextType {
  language: Language
  changeLanguage: (language: Language) => void
  t: (key: TranslationKey) => string
  isReady: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

function readStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'en'
  const saved = localStorage.getItem('language')
  return saved === 'hi' ? 'hi' : 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    setLanguage(readStoredLanguage())
    setIsReady(true)
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const changeLanguage = useCallback((newLanguage: Language) => {
    setLanguage(newLanguage)
    localStorage.setItem('language', newLanguage)
  }, [])

  const t = useCallback(
    (key: TranslationKey): string =>
      translations[language][key] || translations.en[key] || key,
    [language]
  )

  const value = useMemo(
    () => ({ language, changeLanguage, t, isReady }),
    [language, changeLanguage, t, isReady]
  )

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
