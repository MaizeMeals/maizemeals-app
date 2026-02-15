import { Card } from "@/components/ui/card"

interface FeatureCardProps {
    icon: React.ReactNode
    title: string
    description: string
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 dark:hover:shadow-maize/50 dark:bg-card/50 border-border">
      <div className="mb-4 bg-muted w-14 h-14 rounded-lg flex items-center justify-center">
        {icon}
      </div>
      <h3 className="font-heading text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">
        {description}
      </p>
    </Card>
  )
}
