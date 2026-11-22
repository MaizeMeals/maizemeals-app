"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarDays, X } from "lucide-react"
import type { ScheduleNotice } from "@/lib/schedule-notice"

const KEY = "mm_dismissed_notice"

/** Break / closure notice under the search. Dismissing hides that message only. */
export function ScheduleNoticeBanner({ notice }: { notice: ScheduleNotice }) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(KEY) === notice.id)
    } catch {
      // storage blocked: always show
    }
  }, [notice.id])

  if (dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(KEY, notice.id)
    } catch {
      // ignore
    }
  }

  return (
    <section aria-label="Schedule notice" className="mx-auto mt-4 max-w-6xl px-4">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
        <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
        <p className="flex-1 text-sm leading-relaxed md:text-base">
          <strong>{notice.title}:</strong> {notice.message}{" "}
          {notice.link ? (
            <Link href={notice.link.href} className="whitespace-nowrap font-bold underline underline-offset-2">
              {notice.link.label}
            </Link>
          ) : null}
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss notice"
          className="-m-1.5 shrink-0 rounded-lg p-1.5 text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-500/20"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </section>
  )
}
