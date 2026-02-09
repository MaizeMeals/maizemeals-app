"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useAnalytics } from "@/hooks/use-analytics"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  forceWhite?: boolean
}

export function ThemeToggle({ forceWhite }: ThemeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme()
  const { track } = useAnalytics()

  const toggleTheme = () => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    track('theme_toggled', {
      from_theme: resolvedTheme,
      to_theme: newTheme
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn(
        forceWhite ? "text-white hover:text-white hover:bg-white/20" : ""
      )}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
