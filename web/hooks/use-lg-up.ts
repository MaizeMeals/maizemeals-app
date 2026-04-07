"use client"

import { useEffect, useState } from "react"

const LG_MIN = "(min-width: 1024px)"

/** True at `lg` breakpoint and above (Tailwind: 1024px). First paint assumes mobile until mounted. */
export function useLgUp() {
  const [lgUp, setLgUp] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(LG_MIN)
    setLgUp(mq.matches)
    const fn = () => setLgUp(mq.matches)
    mq.addEventListener("change", fn)
    return () => mq.removeEventListener("change", fn)
  }, [])

  return lgUp
}
