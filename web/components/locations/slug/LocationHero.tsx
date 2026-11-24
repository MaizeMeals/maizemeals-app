"use client"

import Link from "next/link"
import { MapPin, Clock, Heart, Share2, Navigation, ChevronLeft } from "lucide-react"
import { useUserLocation } from "@/hooks/use-user-location"
import { calculateDistance, formatDistance } from "@/lib/distance"
import { getTypeForDisplay, cleanLocationName, STATUS_COLORS } from "@/lib/dining"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/lib/toast"

interface LocationHeroProps {
  name: string
  type: string
  imageUrl: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  status: {
    isOpen: boolean
    text: string
    closesAt: string | null
    color: "green" | "red" | "orange" | "gray"
    details: string
  }
  /** Saved places (favorite_location_ids), shared with the map's side panel. */
  isFavorite?: boolean
  onToggleFavorite?: () => void
}

export function LocationHero({ name, type, imageUrl, address, latitude, longitude, status, isFavorite = false, onToggleFavorite }: LocationHeroProps) {
  const { coords } = useUserLocation()

  // Calculate distance if coords are available
  let distanceString: string | null = null

  if (coords && latitude && longitude) {
    const dist = calculateDistance(coords.latitude, coords.longitude, latitude, longitude)
    distanceString = dist < 0.1 ? "Nearby" : `${formatDistance(dist)} away`
  }

  // Fallback address logic: Use beginning of address or default
  const locationText = distanceString
    ? distanceString
    : (address ? address.split(',')[0] : "North Campus");

  // Share the page without the ?item= / ?review= state.
  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}`
    if (navigator.share) {
      try {
        await navigator.share({ title: `${name} menu`, text: `${name} menu on MaizeMeals`, url })
      } catch {
        // dismissed
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied")
    } catch {
      toast.error("Couldn't copy the link", { description: url })
    }
  }

  const directionsHref =
    latitude != null && longitude != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
      : address
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${address}, Ann Arbor, MI`)}`
        : null

  const locationName = cleanLocationName(name, type);

  return (
    <header className="relative h-[40vh] min-h-[300px] w-full group overflow-hidden">
      {/* Immersive Image */}
      <div className="absolute inset-0">
        <img
          src={imageUrl ? `/images/dining_halls/${imageUrl}` : '/images/dining_halls/default.jpg'}
          alt={name}
          className="w-full h-full object-cover opacity-90"
          onError={(e) => {
             e.currentTarget.src = '/images/dining_halls/default.jpg';
          }}
        />
        {/* Gradient Fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(240_0%_5%)] via-[hsl(240_0%_5%)]/20 to-transparent" />
      </div>

      {/* Content over bottom gradient (dark area for readable type) */}
      <div className="absolute bottom-0 left-0 w-full z-10">
        <div className="container mx-auto flex justify-between items-end p-4 md:px-4 md:py-6">
          <div className="min-w-0 pr-2">
            <Link
              href="/locations"
              className="inline-flex items-center gap-0.5 mb-3 text-sm font-semibold text-white drop-shadow-md transition-colors hover:text-maize focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
              See all locations
            </Link>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={STATUS_COLORS[status.color] ?? "muted"} shape="pill" className="font-bold">
                {status.text}
              </Badge>
              <span className="text-white/80 text-xs font-medium tracking-wide uppercase">
                {getTypeForDisplay(type)}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-heading font-bold text-white mb-2 leading-tight shadow-sm drop-shadow-md">
              {locationName}
            </h1>
            <div className="flex items-center gap-4 text-white/90 text-sm font-medium">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-maize" />
                <span>{locationText}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-maize" />
                <span>{status.details}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons (Vertical on Mobile, Horizontal on Desktop) */}
          <div className="absolute right-4 bottom-20 flex flex-col gap-3 md:static md:flex-row md:gap-3">
             <button
               type="button"
               onClick={handleShare}
               className="p-2 md:p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 active:scale-95 transition-all shadow-lg"
               aria-label={`Share ${name}`}
             >
                <Share2 className="w-5 h-5" />
             </button>
             {onToggleFavorite ? (
               <button
                 type="button"
                 onClick={onToggleFavorite}
                 aria-pressed={isFavorite}
                 aria-label={isFavorite ? `Remove ${name} from saved places` : `Save ${name}`}
                 className="p-2 md:p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 active:scale-95 transition-all shadow-lg"
               >
                  <Heart className={isFavorite ? "w-5 h-5 fill-maize text-maize" : "w-5 h-5"} />
               </button>
             ) : null}
             {directionsHref ? (
               <a
                 href={directionsHref}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="p-2 md:p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 active:scale-95 transition-all shadow-lg"
                 aria-label={`Directions to ${name}`}
               >
                  <Navigation className="w-5 h-5" />
               </a>
             ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
