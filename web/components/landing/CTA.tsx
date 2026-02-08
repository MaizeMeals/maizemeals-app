import { Button } from "@/components/ui/button"
import Link from "next/link"

export function CTA() {
  return (
    <section className="py-24 bg-background border-t border-border">
        <div className="container mx-auto px-4">
          <div className="bg-umich-blue rounded-2xl p-8 md:p-16 text-center shadow-2xl relative overflow-hidden group">
            {/* Background Image Effect for CTA */}
            <div className="absolute inset-0 opacity-10 mix-blend-overlay">
                <img
                    src="/images/dining_halls_hq/eq.jpg"
                    alt="CTA Background"
                    className="w-full h-full object-cover grayscale"
                />
            </div>

             {/* Decorative Circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-maize opacity-10 rounded-full translate-x-1/2 -translate-y-1/2 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-maize opacity-10 rounded-full -translate-x-1/2 translate-y-1/2 blur-2xl" />

            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 relative z-10">
              Ready to eat better?
            </h2>
            <p className="text-slate-300 max-w-2xl mx-auto mb-10 text-lg relative z-10">
              Join thousands of students using MaizeMeals to navigate the dining halls.
              Log in with your <span className="text-maize font-mono">@umich.edu</span> account to start rating.
            </p>
            <div className="relative z-10 flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild size="lg" className="bg-maize text-umich-blue hover:bg-maize/90 font-bold">
                <Link href="/login">Get Started</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10 dark:hover:bg-white/10">
                <Link href="/menus">View Today's Menu</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
  )
}
