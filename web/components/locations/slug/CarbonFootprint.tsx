export const CarbonFootprint = ({ level }: { level: 'low' | 'medium' | 'high' }) => {
  const segments = { low: 1, medium: 2, high: 3 }
  const colors = { low: 'bg-green-500', medium: 'bg-yellow-500', high: 'bg-red-500' }
  const activeCount = segments[level] || 1
  const color = colors[level] || colors.low

  return (
    <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded border border-border bg-muted/50" title={`Carbon Footprint: ${level}`}>
       <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">CO2</span>
       <div className="flex gap-0.5">
         {[1, 2, 3].map(i => (
           <div
             key={i}
             className={`h-2 w-1.5 rounded-sm transition-colors ${i <= activeCount ? color : 'bg-muted'}`}
           />
         ))}
       </div>
    </div>
  )
}
