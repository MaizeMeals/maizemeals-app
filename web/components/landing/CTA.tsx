'use client'

import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { useAnalytics } from "@/hooks/use-analytics"
import { AuthEntryLink } from "@/components/auth/AuthEntryLink"
import { landingPrimaryButtonClassName } from "@/lib/button-styles"

export function CTA() {
  const { track } = useAnalytics()

  const handleGetStartedClick = () => {
    track('cta_get_started_clicked', {
      section: 'landing_cta',
      destination: '/login'
    })
  }

  const handleViewMenuClick = () => {
    track('cta_view_menu_clicked', {
      section: 'landing_cta',
      destination: '/menus'
    })
  }

  return (
    <section className="py-24 bg-background border-t border-border">
        <div className="container mx-auto px-4">
          <div className="bg-umich-blue rounded-xl p-8 md:p-16 text-center shadow-2xl relative overflow-hidden group">
            {/* Background Image Effect for CTA */}
            <div className="absolute inset-0 opacity-10 mix-blend-overlay">
                <Image
                    src="/images/dining_halls_hq/eq.webp"
                    alt="CTA Background"
                    fill
                    sizes="(min-width: 1400px) 1336px, calc(100vw - 4rem)"
                    className="object-cover grayscale"
                />
            </div>

             {/* Decorative Circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-maize opacity-10 rounded-full translate-x-1/2 -translate-y-1/2 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-maize opacity-10 rounded-full -translate-x-1/2 translate-y-1/2 blur-2xl" />

            <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-6 relative z-10">
              Ready to eat better?
            </h2>
            <p className="text-white/80 max-w-2xl mx-auto mb-10 text-lg relative z-10">
              Join thousands of students using MaizeMeals to navigate the dining halls.
              Log in with your <span className="text-maize font-mono">@umich.edu</span> account to start rating.
            </p>
            <div className="relative z-10 flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild size="lg" className={landingPrimaryButtonClassName}>
                <AuthEntryLink entry="/login" onClick={handleGetStartedClick}>Get Started</AuthEntryLink>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10 dark:hover:bg-white/10">
                <Link href="/menus" onClick={handleViewMenuClick}>View Today's Menu</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
  )
}
