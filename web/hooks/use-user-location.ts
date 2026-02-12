import { useState, useEffect } from "react"

type Coords = {
  latitude: number
  longitude: number
}

export function useUserLocation() {
  const [coords, setCoords] = useState<Coords | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported")
      return
    }

    // Success handler
    const handleSuccess = (position: GeolocationPosition) => {
      setCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      })
    }

    // Error handler
    const handleError = (error: GeolocationPositionError) => {
      setError(error.message)
    }

    // Request location
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true, // Better for walking directions
      timeout: 5000,
      maximumAge: 0,
    })
  }, [])

  return { coords, error }
}
