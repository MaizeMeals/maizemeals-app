"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/layout/Footer";

/** Map-first `/locations` route uses full viewport; hide global footer there. */
export function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname === "/locations") return null;
  if (pathname === "/login" || pathname === "/signup") return null;
  return <Footer />;
}
