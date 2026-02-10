import { Hero } from "@/components/landing/Hero";
import { DiningHallGrid } from "@/components/landing/DiningHallGrid";
import { Features } from "@/components/landing/Features";
import { CTA } from "@/components/landing/CTA";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Hero />
      <section className="relative z-20 px-4 py-8 md:py-0 md:mt-0 lg:[@media(min-height:900px)]:-mt-90 2xl:mt-0 2xl:py-12">
        <DiningHallGrid />
      </section>
      <Features />
      <CTA />
    </div>
  );
}
