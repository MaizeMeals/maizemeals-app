"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { TrendingUp, Leaf, Dumbbell, Star, Clock, Users } from "lucide-react"
import { MaizeIcon } from "@/components/branding/MaizeIcon"
import { useAnalytics } from "@/hooks/use-analytics"

export function DiningHallCards() {
  const { track } = useAnalytics()

  const handleCardClick = (hallName: string, status: string, capacity: string) => {
    track('dining_hall_card_clicked', {
      hall_name: hallName,
      status: status,
      capacity: capacity,
      section: 'landing_live_status'
    })
  }

  const getHighlightStyle = (type: string) => {
    switch (type) {
      case 'trending':
        return {
          icon: <TrendingUp className="w-3.5 h-3.5" />,
          bgClass: "bg-blue-100 dark:bg-blue-900/40",
          textClass: "text-blue-700 dark:text-blue-300"
        };
      case 'diet':
        return {
          icon: <Leaf className="w-3.5 h-3.5" />,
          bgClass: "bg-green-100 dark:bg-green-900/40",
          textClass: "text-green-700 dark:text-green-300"
        };
      case 'macro':
        return {
          icon: <Dumbbell className="w-3.5 h-3.5" />,
          bgClass: "bg-orange-100 dark:bg-orange-900/40",
          textClass: "text-orange-700 dark:text-orange-300"
        };
      default:
        return {
          icon: <Star className="w-3.5 h-3.5" />,
          bgClass: "bg-slate-100 dark:bg-slate-800",
          textClass: "text-slate-700 dark:text-slate-300"
        };
    }
  };

  const diningHalls = [
    {
      name: "Bursley",
      status: "Open",
      time: "until 8:00 PM",
      capacity: "Moderate",
      image: "/images/dining_halls/mk.jpg", // Placeholder using Markley/EQ image
      highlight: {
        type: "trending",
        label: "Student Favorite",
        item: "Honey BBQ Tenders",
        rating: 4.8
      }
    },
    {
      name: "Mosher-Jordan",
      status: "Open",
      time: "until 8:00 PM",
      capacity: "Busy",
      image: "/images/dining_halls/mj.jpg",
      highlight: {
        type: "diet",
        label: "Vegan Pick",
        item: "Spicy Tofu Stir-fry",
        rating: 4.5
      }
    },
    {
      name: "East Quad",
      status: "Busy",
      time: "until 9:00 PM",
      capacity: "Very Busy",
      image: "/images/dining_halls/eq.jpg",
      highlight: {
        type: "macro",
        label: "High Protein",
        item: "Lemon Pepper Salmon",
        rating: 4.2
      }
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between mb-6 px-2">
            <h3 className="text-sm font-bold text-muted-foreground md:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live Status
            </h3>
            <Link href="/locations" className="text-sm text-umich-blue dark:text-maize md:text-maize hover:underline font-medium">View All Locations →</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {diningHalls.map((hall) => {
            const style = getHighlightStyle(hall.highlight.type);

            return (
                <Card key={hall.name} className="group cursor-pointer hover:border-maize transition-all duration-300 flex flex-col h-full border-border bg-card" onClick={() => handleCardClick(hall.name, hall.status, hall.capacity)}>
                {/* Image Area */}
                <div className="h-32 w-full bg-muted relative overflow-hidden shrink-0">
                    <img
                    src={hall.image}
                    alt={hall.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-umich-blue to-slate-900/50 hidden group-hover:flex items-center justify-center transition-opacity">
                        <MaizeIcon className="text-white/20 w-12 h-12 opacity-50" />
                    </div>

                    {/* Status Badge */}
                    <div className="absolute top-2 right-2">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full shadow-sm ${hall.status === 'Open' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/80 dark:text-orange-100'}`}>
                            {hall.status}
                        </span>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-4 text-left flex flex-col h-full">
                    <h4 className="font-bold text-foreground text-lg mb-1">{hall.name}</h4>
                    <div className="flex flex-col gap-1.5 mt-2 mb-4">
                        <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 mr-1.5" />
                            {hall.time}
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground">
                            <Users className="w-3.5 h-3.5 mr-1.5" />
                            Capacity: <span className={hall.capacity === "Busy" || hall.capacity === "Very Busy" ? "text-orange-500 dark:text-orange-400 ml-1 font-medium" : "text-green-500 dark:text-green-400 ml-1 font-medium"}>{hall.capacity}</span>
                        </div>
                    </div>

                    {/* Integrated Highlight Section */}
                    <div className="pt-3 border-t border-border mt-auto">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`flex items-center justify-center p-1 rounded-md ${style.bgClass} ${style.textClass}`}>
                            {style.icon}
                        </span>
                        <span className={`text-[10px] uppercase font-bold tracking-wider ${style.textClass}`}>
                        {hall.highlight.label}
                        </span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">
                        {hall.highlight.item}
                    </p>
                    {/* Star Ratings */}
                    <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                        <Star
                            key={i}
                            className={`w-3 h-3 ${i < Math.round(hall.highlight.rating) ? "fill-maize text-maize" : "text-muted dark:text-slate-700"}`}
                        />
                        ))}
                        <span className="text-xs text-muted-foreground ml-1 font-medium">{hall.highlight.rating}</span>
                    </div>
                    </div>
                </div>
                </Card>
            );
            })}
        </div>
    </div>
  )
}
