import { Database } from './supabase'

// Database Types
export type DiningHall = Database['public']['Tables']['dining_halls']['Row']
export type Item = Database['public']['Tables']['items']['Row']
export type MenuEvent = Database['public']['Tables']['menu_events']['Row']
export type OperatingHour = Database['public']['Tables']['operating_hours']['Row']
export type CapacityLog = Database['public']['Tables']['capacity_logs']['Row']
export type Photo = Database['public']['Tables']['photos']['Row']
export type UserRating = Database['public']['Tables']['user_ratings']['Row']

// Composite Types
export type MenuEventWithItem = MenuEvent & {
  items: Item
}

export type ItemWithPhotos = Item & {
  photos?: { storage_path: string }[]
  /** From menu metadata (user_ratings count) when available. */
  review_count?: number
}

// API Response Types
export type CapacityData = {
  name: string
  current_capacity: number
  total_capacity: number
  is_error: boolean
}

// Location detail / menu data (useLocationData)
export type StationGroup = {
  station: string
  items: Item[]
}

export type MenuData = Record<string, StationGroup[]>

export type ItemMetadata = {
  photos: string[]
  avgRating: number
  reviewCount: number
}

export type LocationData = {
  hall: DiningHall | null
  status: {
    isOpen: boolean
    text: string
    closesAt: string | null
    color: "green" | "red" | "orange" | "gray"
    details: string
    label?: string
  }
  menu: MenuData
  itemMetadata: Record<string, ItemMetadata>
  hours: OperatingHour[]
  weeklyHours: Record<string, OperatingHour[]>
  availableDates: string[]
  /** Average rating across all item ratings at this dining hall (0 if no ratings). */
  rating: number
  /** Total number of user ratings for items at this dining hall. */
  reviewCount: number
}
