import Link from "next/link"
import Logo from "@/components/Logo" // Assuming you have this from earlier

export default function Home() {
  return (
    // bg-background and text-foreground connect to your globals.css theme
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-8 pb-20 sm:p-20">

      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full max-w-2xl">

        {/* Intro Section */}
        <div className="flex flex-col gap-4 items-start text-left">
          <Logo /> {/* Or just use text if you prefer */}

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl text-balance">
             Your University of Michigan <span className="text-maize">Dining</span> <span className="text-blue">Companion</span>
          </h1>

          <p className="text-lg text-muted-foreground text-balance max-w-md">
            Real-time menus, crowd-sourced ratings, and nutrition data for every dining hall on campus.
          </p>
        </div>

        {/* Buttons / CTAs */}
        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <Link
            href="/login"
            className="rounded-full bg-foreground text-background px-6 py-3 text-sm font-medium transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] flex items-center gap-2"
          >
            Get Started
          </Link>

          <Link
            href="/menus"
            className="rounded-full border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            View Menus
          </Link>
        </div>

      </main>
    </div>
  );
}
