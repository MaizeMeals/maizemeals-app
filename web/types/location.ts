interface BaseLocation {
  id: string;
  official_id: string | null;
  name: string;
  slug: string;
  image_url: string | null;
  lat: number;
  lng: number;

  contact?: {
    address?: string | null;
    phone?: string | null;
    website?: string | null;
  };

  status: {
    isOpen: boolean;
    label: string;
    color: "green" | "red" | "orange" | "gray";
    details: string;
  };

  /** Average of user_ratings for items at this location (null if none). */
  average_rating?: number | null;
  review_count?: number | null;
}

// Update types to match DB Enums (Plural)
export interface DiningHallLocation extends BaseLocation {
  type: 'DINING_HALLS';
  capacity: {
    percentage: number;
    label: string;
    color: string;
  };
}

export interface RetailLocation extends BaseLocation {
  type: 'CAFES' | 'MARKETS';
}

export type CampusLocation = DiningHallLocation | RetailLocation;
