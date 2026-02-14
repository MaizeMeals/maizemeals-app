import { TrendingUp, Camera } from "lucide-react"

export function SocialProof() {
  return (
    <section className="bg-muted/50 py-8 border-t border-border">
      <div className="container mx-auto px-4">
         <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-foreground">Live Activity</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <TrendingUp className="w-3 h-3 text-green-500" />
                3 students rated lunch recently
              </p>
            </div>
            <button className="text-sm font-medium text-primary">View All</button>
         </div>

         {/* Horizontal Photo Scroll */}
         <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
            {/* Add Photo Button in List */}
            <button className="flex-shrink-0 w-32 h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground gap-2 hover:bg-accent transition-colors">
               <Camera className="w-6 h-6" />
               <span className="text-xs font-medium">Add Photo</span>
            </button>
         </div>
      </div>
    </section>
  )
}
