"use client"

import { useState, useEffect } from "react"
import Link from 'next/link'
import Logo from './Logo'
import { ThemeToggle } from './theme-toggle'
import { UserNav } from './UserNav'
import { User } from "@supabase/supabase-js"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"

interface HeaderContentProps {
  user: User | null
  signOut: () => Promise<void>
}

export function HeaderContent({ user, signOut }: HeaderContentProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()
  const isLandingPage = pathname === "/"

  useEffect(() => {
    const handleScroll = () => {
      const heroHeight = window.innerHeight - 80; 
      setIsScrolled(window.scrollY > heroHeight)
    }

    window.addEventListener("scroll", handleScroll)
    handleScroll() 
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navLinks = [
    { name: 'Menus', href: '/menus' },
    { name: 'Locations', href: '/locations' },
    { name: 'Nutrition', href: '/nutrition' },
  ]

  // Header is transparent ONLY on landing page when at the top
  const isTransparent = isLandingPage && !isScrolled

  return (
    <header className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300 border-b",
        !isTransparent 
            ? "bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-border" 
            : "bg-black/20 backdrop-blur-md border-white/10"
    )}>
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6">
            <Logo forceWhite={isTransparent} />
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                {navLinks.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                            "transition-colors",
                            !isTransparent 
                                ? "hover:text-maize text-foreground/80" 
                                : "hover:text-maize text-white/90"
                        )}
                    >
                        {link.name}
                    </Link>
                ))}
            </nav>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <UserNav user={user} signOut={signOut} forceWhite={isTransparent} />
        </div>
      </div>
    </header>
  )
}
