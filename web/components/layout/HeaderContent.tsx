"use client"

import { useState, useEffect } from "react"
import Link from 'next/link'
import { Menu, X } from "lucide-react"
import { usePathname } from "next/navigation"

import { User } from "@supabase/supabase-js"
import { cn } from "@/lib/utils"

import { useAnalytics } from "@/hooks/use-analytics"

import Logo from '@/components/branding/Logo'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { UserNav } from '@/components/layout/UserNav'
import { Button } from "@/components/ui/button"

interface HeaderContentProps {
  user: User | null
  signOut: () => Promise<void>
}

export function HeaderContent({ user, signOut }: HeaderContentProps) {
  const { track } = useAnalytics()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const isLandingPage = pathname === "/"

  const handleMobileMenuToggle = () => {
    const newState = !isMobileMenuOpen
    setIsMobileMenuOpen(newState)
    if (newState) {
      track('mobile_menu_opened', {
        current_page: pathname
      })
    }
  }

  const handleNavLinkClick = (linkName: string, linkHref: string, isMobile: boolean) => {
    track('nav_link_clicked', {
      link_name: linkName,
      link_href: linkHref,
      is_mobile: isMobile,
      current_page: pathname
    })
  }

  useEffect(() => {
    const handleScroll = () => {
      const heroHeight = window.innerHeight - 80;
      setIsScrolled(window.scrollY > heroHeight)
    }

    window.addEventListener("scroll", handleScroll)
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  const navLinks = [
    { name: 'Menus', href: '/menus' },
    { name: 'Locations', href: '/locations' },
    { name: 'Nutrition', href: '/nutrition' },
  ]

  // Header is transparent ONLY on landing page when at the top AND mobile menu is closed
  const isTransparent = isLandingPage && !isScrolled && !isMobileMenuOpen

  return (
    <header className={cn(
      "fixed top-0 z-50 w-full transition-all duration-300 border-b transform-gpu",
      "isolate z-50",
      "will-change-[backdrop-filter]",
      "[backface-visibility:hidden]",
        isMobileMenuOpen
          ? "bg-background border-border"
          : !isTransparent
            ? "bg-background/80 backdrop-blur backdrop-saturate-150 supports-[backdrop-filter]:bg-background/60 border-border"
            : "bg-black/30 backdrop-blur-xl backdrop-saturate-150 border-white/10"
    )}>
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6">
            <Logo forceWhite={isTransparent} />
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                {navLinks.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => handleNavLinkClick(link.name, link.href, false)}
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
          <ThemeToggle forceWhite={isTransparent} />
          <UserNav user={user} signOut={signOut} forceWhite={isTransparent} />

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "md:hidden",
              isTransparent ? "text-white hover:bg-white/20" : ""
            )}
            onClick={handleMobileMenuToggle}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-4 shadow-lg animate-in slide-in-from-top-2">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => handleNavLinkClick(link.name, link.href, true)}
                className="text-base font-medium text-foreground/80 hover:text-maize transition-colors py-2"
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
