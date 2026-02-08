import { Search, MapPin, Flame, Camera, Star, Smartphone } from "lucide-react"
import { FeatureCard } from "./FeatureCard"

export function Features() {
  return (
    <section className="py-24 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">Built for Wolverines</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              We scraped the data so you don't have to guess what's for dinner.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Search className="h-8 w-8 text-umich-blue dark:text-maize" />}
              title="Accurate Menus"
              description="Bypassing the clutter. Get straight to the daily menu for Breakfast, Brunch, Lunch, and Dinner across all 7 dining halls."
            />
            <FeatureCard
              icon={<MapPin className="h-8 w-8 text-umich-blue dark:text-maize" />}
              title="Location Specific"
              description="We track items by location. Rate the pizza at Markley differently than the pizza at East Quad. We know the difference."
            />
            <FeatureCard
              icon={<Flame className="h-8 w-8 text-umich-blue dark:text-maize" />}
              title="Dietary Intelligence"
              description="Filter by Vegan, Halal, Gluten-Free and more. View nutrition scores (1-6) instantly to make smarter choices."
            />
            <FeatureCard
              icon={<Camera className="h-8 w-8 text-umich-blue dark:text-maize" />}
              title="Visual Menus"
              description="Upload photos of your meal. Help others see what the 'Chef's Special' actually looks like before they walk across campus."
            />
            <FeatureCard
              icon={<Star className="h-8 w-8 text-umich-blue dark:text-maize" />}
              title="Student Ratings"
              description="Trust your peers, not the menu description. Rate items out of 5 stars and see what's trending on campus."
            />
            <FeatureCard
              icon={<Smartphone className="h-8 w-8 text-umich-blue dark:text-maize" />}
              title="Mobile Optimized"
              description="A Progressive Web App experience designed for on-the-go checking while walking to class."
            />
          </div>
        </div>
      </section>
  )
}
