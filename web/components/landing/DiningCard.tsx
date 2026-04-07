import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronRight, Clock, Users } from "lucide-react"
import Link from "next/link"
import { CampusLocation } from "@/types/location"
import { Skeleton } from "@/components/ui/skeleton"
import { STATUS_COLORS, CAPACITY_COLORS } from "@/lib/dining-utils"
import { cn } from "@/lib/utils"
import { landingSurfaceOutlineButtonClassName } from "@/lib/button-styles"

interface DiningCardProps {
  hall: CampusLocation // Accepts both DiningHall and Retail types
  onClick: () => void
  href: string
}

export function DiningCard({ hall, onClick, href }: DiningCardProps) {
  const statusClass = STATUS_COLORS[hall.status.color] || STATUS_COLORS['gray']

  // Safe Capacity Logic: Only calculate if it exists
  const isDiningHall = hall.type === 'DINING_HALLS';
  const capColor = isDiningHall ? hall.capacity.color : 'slate';
  const capClass = CAPACITY_COLORS[capColor] || CAPACITY_COLORS['slate']

  return (
    <Link href={href} onClick={onClick} className="block h-full">
      <Card className="group cursor-pointer border-border bg-card transition-all duration-300 hover:border-muted-foreground/50 hover:shadow-lg flex flex-col h-full overflow-hidden">
        {/* Image Area */}
        <div className="h-32 w-full bg-muted relative overflow-hidden shrink-0">
          <img
            src={hall.image_url ? `/images/dining_halls/${hall.image_url}` : '/images/dining_halls/default.jpg'}
            onError={(e) => { (e.target as HTMLImageElement).src = '/images/dining_halls/default.jpg' }}
            alt={hall.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Status Badge */}
          <div className="absolute top-2 right-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm border ${statusClass}`}>
              {hall.status.label}
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 text-left flex flex-col h-full">
          <h4 className="font-bold text-foreground text-lg mb-1">{hall.name.replace(' Dining Hall', '')}</h4>

          <div className="flex flex-col gap-1.5 mt-2 mb-4">
            {/* Status Line */}
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              {hall.status.details}
            </div>

            {/* Capacity Line - CONDITIONAL RENDER */}
            {isDiningHall && hall.status.isOpen && hall.capacity && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5 mr-1.5" />
                Capacity:
                <span className={`${capClass} ml-1 font-medium`}>
                   {hall.capacity.label} ({hall.capacity.percentage}%)
                </span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-border mt-auto">
            <Button
              asChild
              variant="outline"
              size="sm"
              className={cn(
                "w-full pointer-events-none",
                landingSurfaceOutlineButtonClassName,
              )}
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                View Full Menu
                <ChevronRight className="h-3.5 w-3.5 opacity-80" aria-hidden />
              </span>
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  )
}

// Skeleton remains mostly the same, it's visual only
export function DiningCardSkeleton() {
  return (
    <Card className="flex flex-col h-full border-border bg-card overflow-hidden">
      <div className="h-32 w-full bg-muted/50 relative">
        <Skeleton className="absolute top-2 right-2 h-6 w-16 rounded-full" />
      </div>
      <div className="p-4 flex flex-col h-full">
        <Skeleton className="h-6 w-3/4 mb-4" />
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5 rounded-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5 rounded-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
        <div className="pt-3 border-t border-border mt-auto">
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    </Card>
  )
}
