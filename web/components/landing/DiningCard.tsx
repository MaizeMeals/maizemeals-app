import { Card } from "@/components/ui/card"
import { Clock, Users } from "lucide-react"
import Link from "next/link"
import { ProcessedHall } from "@/hooks/use-dining-status"
import { Skeleton } from "@/components/ui/skeleton"
import { STATUS_COLORS, CAPACITY_COLORS } from "@/lib/dining-utils"

interface DiningCardProps {
  hall: ProcessedHall
  onClick: () => void
  href: string
}

export function DiningCard({ hall, onClick, href }: DiningCardProps) {
  // Fallback to gray if logic returns an unknown color
  const statusClass = STATUS_COLORS[hall.status.color] || STATUS_COLORS['gray']
  const capClass = CAPACITY_COLORS[hall.capacity.color] || CAPACITY_COLORS['slate']

  return (
    <Link href={href} onClick={onClick} className="block h-full">
      <Card className="group cursor-pointer hover:border-maize transition-all duration-300 flex flex-col h-full border-border bg-card overflow-hidden">
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
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              {hall.status.details}
            </div>

            <div className="flex items-center text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Capacity:
              <span className={`${capClass} ml-1 font-medium`}>
                 {hall.capacity.label} ({hall.capacity.percentage}%)
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-border mt-auto">
               <span className="text-xs text-umich-blue hover:underline">
                  View Full Menu →
               </span>
          </div>
        </div>
      </Card>
    </Link>
  )
}

export function DiningCardSkeleton() {
  return (
    <Card className="flex flex-col h-full border-border bg-card overflow-hidden">
      {/* Image Area Skeleton */}
      <div className="h-32 w-full bg-muted/50 relative">
        <Skeleton className="absolute top-2 right-2 h-6 w-16 rounded-full" />
      </div>

      {/* Content Area Skeleton */}
      <div className="p-4 flex flex-col h-full">
        {/* Title */}
        <Skeleton className="h-6 w-3/4 mb-4" />

        <div className="flex flex-col gap-2 mb-4">
          {/* Hours */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5 rounded-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          {/* Capacity */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5 rounded-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border mt-auto">
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    </Card>
  )
}
