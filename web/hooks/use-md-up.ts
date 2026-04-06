"use client";

import { useEffect, useState } from "react";

const MD_MIN = "(min-width: 768px)";

/** True at `md` breakpoint and above (Tailwind: 768px). First paint assumes mobile until mounted. */
export function useMdUp() {
  const [mdUp, setMdUp] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MD_MIN);
    setMdUp(mq.matches);
    const fn = () => setMdUp(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  return mdUp;
}
