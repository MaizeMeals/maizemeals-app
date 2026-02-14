"use client"

import { Check, Leaf, AlertCircle, X, Info } from "lucide-react"
import { useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"

/**
 * Explains the criteria required to earn slices
 */
const ScaleBreakdown = () => {
  const levels = [
    {
      label: "Less Nutrient Dense",
      slices: 1,
      color: "text-red-500",
      bgColor: "bg-red-50 dark:bg-red-900/20",
      borderColor: "border-red-100 dark:border-red-800",
      desc: "Meets 0-1 nutritional criteria.",
      details: ["High in Added Sugar (>10%)", "High in Saturated Fat (>10%)", "High Sodium"]
    },
    {
      label: "Good Choice",
      slices: 3,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
      borderColor: "border-yellow-100 dark:border-yellow-800",
      desc: "Meets 2-3 nutritional criteria.",
      details: ["Balanced macronutrients", "Some whole ingredients", "Moderate sodium"]
    },
    {
      label: "Most Nutrient Dense",
      slices: 5,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      borderColor: "border-green-100 dark:border-green-800",
      desc: "Meets 4+ nutritional criteria.",
      details: ["First ingredient is Whole Grain/Fruit/Veg", "High Fiber (>2.5g)", "High Protein (>10%)"]
    }
  ]

  return (
    <div className="space-y-3">
      {levels.map((level, i) => (
        <div key={i} className={`rounded-lg border p-3 ${level.borderColor} ${level.bgColor}`}>
          <div className="flex items-start gap-3">
            {/* Mini Citrus Visual */}
            <div className="relative w-8 h-8 shrink-0 mt-0.5">
               <svg viewBox="0 0 32 32" className="transform -rotate-90">
                 {[0, 1, 2, 3, 4].map((idx) => (
                    <path
                      key={idx}
                      d="M16 16 L32 16 A16 16 0 0 1 20.944 31.216 Z"
                      transform={`rotate(${idx * 72} 16 16)`}
                      className={idx < level.slices ?
                        (level.slices === 1 ? "fill-red-500" : level.slices === 3 ? "fill-yellow-500" : "fill-green-500")
                        : "fill-slate-200 dark:fill-slate-700"}
                      stroke="white"
                      strokeWidth="1"
                    />
                 ))}
               </svg>
            </div>

            <div className="flex-1">
              <h4 className={`text-sm font-bold ${level.color} mb-1`}>{level.label}</h4>
              <p className="text-xs text-muted-foreground mb-2 font-medium">{level.desc}</p>
              <ul className="grid grid-cols-1 gap-1">
                {level.details.map((detail, d) => (
                  <li key={d} className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                    {level.slices > 3 ? <Check className="w-3 h-3 text-green-500" /> : <div className="w-1 h-1 rounded-full bg-muted-foreground" />}
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const NutritionInfoModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          onClick={(e) => e.stopPropagation()}
        />
                <Dialog.Content
                  className="fixed z-[9999] bg-background shadow-lg duration-200 w-full h-full top-0 left-0 md:top-[50%] md:left-[50%] md:w-full md:max-w-lg md:h-auto md:max-h-[90vh] md:translate-x-[-50%] md:translate-y-[-50%] md:rounded-xl md:border border-border data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 grid overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDownOutside={(e) => {             // Optional: Prevent closing if interacting with specific outside elements,
             // but usually strictly modal behavior is desired.
          }}
        >
          <Dialog.Title className="sr-only">MHealthy Nutrition Guidelines</Dialog.Title>
          <Dialog.Description className="sr-only">Explanation of the nutrient density scale.</Dialog.Description>

          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                <Leaf className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-foreground leading-none">
                  MHealthy Guidelines
                </h3>
                <span className="text-xs text-muted-foreground font-medium">University of Michigan</span>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                className="p-1.5 rounded-full hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </Dialog.Close>
          </div>

          <div className="p-5 space-y-6">

            {/* Intro Section */}
            <div className="flex gap-4 items-start">
              <div className="text-md text-muted-foreground leading-relaxed">
                <p className="mb-2">
                  The <strong>Citrus Circle</strong> helps you identify nutrient-dense foods at a glance.
                </p>
                <p className="text-sm bg-muted p-2 rounded border border-border italic">
                  "The more slices filled, the more nutrient dense the food!"
                </p>
              </div>
            </div>

            {/* Breakdown of Levels */}
            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">How it works</h4>
              <ScaleBreakdown />
            </div>

            {/* Core Criteria */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-lg">
                  <h5 className="text-xs font-bold text-green-700 dark:text-green-400 mb-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> More of:
                  </h5>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Fruits, vegetables, healthy fats, whole grains, and fiber.
                  </p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg">
                  <h5 className="text-xs font-bold text-red-700 dark:text-red-400 mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Less of:
                  </h5>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Saturated fats, added sugars, sodium, and artificial sweeteners.
                  </p>
              </div>
            </div>

            {/* Footer Link */}
            <div className="pt-2 border-t border-border">
              <a
                href="https://hr.umich.edu/sites/default/files/nutrition-guidelines-v2_1.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  <Info className="w-4 h-4" />
                  <span>View official PDF documentation</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Opens in new tab</span>
              </a>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

interface MScaleProps {
  score: number | null
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export const MScaleIndicator = ({ score, size = 'md', showLabel = false }: MScaleProps) => {
  const [showModal, setShowModal] = useState(false)

  if (!score) return null

  const activeSlices = Math.min(score, 5);
  const slices = [
    { color: "fill-red-500", rotation: 0 },
    { color: "fill-orange-500", rotation: 72 },
    { color: "fill-yellow-500", rotation: 144 },
    { color: "fill-lime-500", rotation: 216 },
    { color: "fill-green-600", rotation: 288 },
  ];

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12"
  }

  const iconSizes = {
    sm: "w-2 h-2 p-px",
    md: "w-2.5 h-2.5 p-0.5",
    lg: "w-4 h-4 p-0.5"
  }

  const iconPos = {
      sm: "-top-0.5 -right-0.5",
      md: "-top-1 -right-1",
      lg: "-top-1 -right-1"
  }

  return (
    <>
      <div
        className="flex flex-col items-center gap-1.5 z-10 cursor-pointer"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowModal(true);
        }}
      >
        <div
          className={`relative ${sizeClasses[size]} group`}
          title={`M-Scale Score: ${score}/6`}
        >
          <svg viewBox="0 0 32 32" className="transform -rotate-90 drop-shadow-sm transition-transform group-hover:scale-110 duration-200">
            {slices.map((slice, i) => {
              const isActive = i < activeSlices;
              return (
                <path
                  key={i}
                  d="M16 16 L32 16 A16 16 0 0 1 20.944 31.216 Z"
                  transform={`rotate(${slice.rotation} 16 16)`}
                  stroke="white"
                  strokeWidth="1"
                  className={`transition-colors duration-300 dark:stroke-slate-900 ${isActive ? slice.color : "fill-muted"}`}
                />
              );
            })}
          </svg>
          <div className={`absolute ${iconPos[size]} bg-card rounded-full shadow-sm border border-border flex items-center justify-center`}>
            <Info className={`text-muted-foreground ${iconSizes[size]}`} />
          </div>
        </div>

        {showLabel && (
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Level {score}
            </span>
        )}
      </div>

      <NutritionInfoModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
