"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "./input"

interface OTPInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  disabled?: boolean
  className?: string
  onComplete?: (value: string) => void
}

export function OTPInput({
  value,
  onChange,
  length = 4,
  disabled = false,
  className,
  onComplete,
}: OTPInputProps) {
  const inputRefs = React.useRef<HTMLInputElement[]>([])
  const [otp, setOtp] = React.useState<string[]>(value.split("").slice(0, length))

  // Update parent value when OTP changes
  React.useEffect(() => {
    const joined = otp.join("")
    onChange(joined)
    if (joined.length === length && onComplete) {
      onComplete(joined)
    }
  }, [otp, onChange])

  // Update internal state when parent value changes
  React.useEffect(() => {
    setOtp(value.split("").slice(0, length))
  }, [value, length])

  const focusNextInput = (currentIndex: number) => {
    if (currentIndex < length - 1) {
      inputRefs.current[currentIndex + 1]?.focus()
    }
  }

  const focusPrevInput = (currentIndex: number) => {
    if (currentIndex > 0) {
      inputRefs.current[currentIndex - 1]?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!otp[index]) {
        e.preventDefault()
        const newOtp = [...otp]
        newOtp[index - 1] = ""
        setOtp(newOtp)
        focusPrevInput(index)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value
    const newValue = value.replace(/\D/g, "").slice(-1)

    const newOtp = [...otp]
    newOtp[index] = newValue
    setOtp(newOtp)

    if (newValue) {
      focusNextInput(index)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length)
    const newOtp = [...otp]
    
    for (let i = 0; i < pastedData.length; i++) {
      if (i >= length) break
      newOtp[i] = pastedData[i]
    }
    
    setOtp(newOtp)
    inputRefs.current[Math.min(pastedData.length, length - 1)]?.focus()
  }

  return (
    <div className={cn("flex gap-2 items-center justify-center", className)}>
      {Array.from({ length }).map((_, index) => (
        <Input
          key={index}
          ref={(el) => {
            if (el) {
              inputRefs.current[index] = el
            }
          }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={otp[index] || ""}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          disabled={disabled}
          className={cn(
            "w-12 h-12 text-center text-2xl font-semibold rounded-lg border-2",
            "focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50",
            "transition-all duration-200"
          )}
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  )
} 