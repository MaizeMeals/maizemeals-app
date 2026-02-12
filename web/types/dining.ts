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
}

// API Response Types
export type CapacityData = {
  name: string
  current_capacity: number
  total_capacity: number
  is_error: boolean
}
