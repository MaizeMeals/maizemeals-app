import { DiningStatusColor } from "@/lib/dining";

export interface LocationSummary {
  id: string;
  name: string;
  slug: string;
  type: 'DINING_HALLS' | 'CAFES' | 'MARKETS';
  image_url: string | null;

  // Geo
  lat: number;
  lng: number;
  distance: number | null;

  // Status
  isOpen: boolean;
  statusLabel: string;
  statusColor: DiningStatusColor;
  statusDetails?: string;

  // Capacity (Optional - Only for Dining Halls)
  capacity?: {
    percentage: number;
    label: string;
    color: string;
  };

  // Contact (Optional - From DB: dining_halls.address, dining_halls.phone, dining_halls.website)
  contact?: {
    address?: string | null;
    phone?: string | null;
    website?: string | null;
  };

  // Hierarchy
  children: LocationSummary[];

  /** Average of user_ratings for items at this venue (null if none). */
  average_rating?: number | null;
  /** Number of user ratings for items at this venue (null if none). */
  review_count?: number | null;

  // Future Slots
  matchScore?: number | null;
  heroItem?: { name: string; rating: number } | null;
}
