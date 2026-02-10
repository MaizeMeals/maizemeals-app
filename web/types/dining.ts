export type DiningHall = {
  id: string
  name: string
  image_url: string | null
  slug: string
}

export type CapacityData = {
  name: string
  current_capacity: number
  total_capacity: number
  is_error: boolean
}

export type OperatingHour = {
  id: string
  dining_hall_id: string
  date: string
  start_time: string
  end_time: string
  event_name: string | null
  created_at?: string | null
}
