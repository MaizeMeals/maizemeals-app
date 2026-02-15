"use client"

import { MapPin, Clock, ChevronLeft, Heart, Share2, Info } from "lucide-react"
import { useRouter } from "next/navigation"
import { useUserLocation } from "@/hooks/use-user-location"
import { calculateDistance, formatDistance } from "@/lib/distance"

import { STATUS_COLORS } from "@/lib/dining-utils"

interface LocationHeroProps {
  name: string
  imageUrl: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  status: {
    isOpen: boolean
    text: string
    closesAt: string | null
    color: "green" | "red" | "orange"
    details: string
  }
}

const Badge = ({ children, color = "gray" }: { children: React.ReactNode; color?: string }) => {
  const colorClass = STATUS_COLORS[color] || STATUS_COLORS["gray"];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${colorClass}`}>
      {children}
    </span>
  );
};

export function LocationHero({ name, imageUrl, address, latitude, longitude, status }: LocationHeroProps) {
  const router = useRouter()
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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: name,
          text: `Check out ${name} menu!`,
          url: window.location.href,
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    }
  }

  const handleInfo = () => {
      alert(`${name}\n${address || 'Address not available'}\n${status.text}`);
  }

  return (
    <header className="relative h-[40vh] min-h-[300px] w-full group">
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

      {/* Content Bottom-Left */}
      <div className="absolute bottom-0 left-0 w-full p-4 md:p-6 z-10">
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge color={status.color}>
                {status.text}
              </Badge>
              <span className="text-slate-300 text-xs font-medium tracking-wide uppercase">
                Dining Hall
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-heading font-bold text-white mb-2 leading-tight shadow-sm drop-shadow-md">
              {name.replace(' Dining Hall', '')}
            </h1>
            <div className="flex items-center gap-4 text-slate-200 text-sm font-medium">
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
               onClick={handleShare}
               className="md:hidden p-2 md:p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 active:scale-95 transition-all shadow-lg"
               aria-label="Share"
             >
                <Share2 className="w-5 h-5" />
             </button>
             <button
               className="p-2 md:p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 active:scale-95 transition-all shadow-lg"
               aria-label="Favorite"
             >
                <Heart className="w-5 h-5" />
             </button>
             <button
               onClick={handleInfo}
               className="p-2 md:p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 active:scale-95 transition-all shadow-lg"
               aria-label="Info"
             >
                <Info className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>
    </header>
  )
}
