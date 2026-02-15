import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { DiningHall, Item, OperatingHour, MenuEventWithItem } from "@/types/dining"
import { determineHallStatus } from "@/lib/dining-utils"

export type StationGroup = {
  station: string
  items: Item[]
}

export type MenuData = Record<string, StationGroup[]> // Keyed by Meal (Lunch, Dinner)

export type LocationData = {
  hall: DiningHall | null
  status: { isOpen: boolean; text: string; closesAt: string | null; color: "green" | "red" | "orange"; details: string }
  menu: MenuData
  hours: OperatingHour[]
  availableDates: string[]
}

export function useLocationData(slug: string, dateStr?: string) {
  const [data, setData] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()
      const targetDate = dateStr || new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
      const today = new Date()
      const startRange = new Date(today); startRange.setDate(today.getDate() - 7)
      const endRange = new Date(today); endRange.setDate(today.getDate() + 14)

      const startStr = startRange.toLocaleDateString('en-CA')
      const endStr = endRange.toLocaleDateString('en-CA')

      // 1. Fetch Hall Details
      const { data: hall, error: hallError } = await supabase
        .from('dining_halls')
        .select('*')
        .eq('slug', slug)
        .single()

      if (hallError || !hall) {
        setError("Location not found")
        setLoading(false)
        return
      }

      // 2. Fetch Hours (Parallel)
      const { data: hours } = await supabase
        .from('operating_hours')
        .select('*')
        .eq('dining_hall_id', hall.id)
        .eq('date', targetDate)
        .order('start_time')

      // 2b. Fetch Availability Range
      const { data: availability } = await supabase
        .from('operating_hours')
        .select('date')
        .eq('dining_hall_id', hall.id)
        .gte('date', startStr)
        .lte('date', endStr)

      const availableDates = Array.from(new Set(availability?.map(a => a.date) || []))

      // 3. Fetch Menu (Parallel)
      const { data: events } = await supabase
        .from('menu_events')
        .select('*, items(*)')
        .eq('dining_hall_id', hall.id)
        .eq('date', targetDate)

      // --- Process Status (Using Shared Logic) ---
      const status = determineHallStatus(hours || [], targetDate);

      // --- Process Menu ---
      const menu: MenuData = {}

      if (events) {
          events.forEach((e: any) => {
              const meal = e.meal
              const item = e.items
              if (!menu[meal]) menu[meal] = []

              let stationGroup = menu[meal].find(g => g.station === item.station)
              if (!stationGroup) {
                  stationGroup = { station: item.station || "General", items: [] }
                  menu[meal].push(stationGroup)
              }
              stationGroup.items.push(item)
          })
      }

      // Sort stations alphabetically
      Object.keys(menu).forEach(meal => {
          menu[meal].sort((a, b) => a.station.localeCompare(b.station))
      })

      setData({ hall, status, menu, hours: hours || [], availableDates })
      setLoading(false)
    }

    load()
  }, [slug, dateStr])

  return { data, loading, error }
}