import { Utensils, Coffee, ShoppingBasket, MapPin, LucideIcon } from "lucide-react";

export const getLocationIcon = (type: string): LucideIcon => {
  switch (type) {
    case 'CAFES': return Coffee;
    case 'MARKETS': return ShoppingBasket;
    case 'DINING_HALLS':
    case 'DINING_HALL': return Utensils;
    default: return MapPin;
  }
};
