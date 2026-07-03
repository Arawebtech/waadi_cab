"use client"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/hooks/use-language"

export function LanguageToggle() {
  const { language, changeLanguage } = useLanguage()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => changeLanguage(language === "en" ? "hi" : "en")}
      className="text-xs px-2 py-1 h-8"
    >
      {language === "en" ? "हिं" : "EN"}
    </Button>
  )
}
