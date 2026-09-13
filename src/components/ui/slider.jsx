import * as React from "react"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef(({ className, style, value = [0], max = 100, step = 1, onValueChange, ...props }, ref) => {
  const handleChange = (e) => {
    if (onValueChange) {
      onValueChange([parseFloat(e.target.value)]);
    }
  };

  return (
    <div className={cn("relative flex w-full touch-none select-none items-center", className)}>
      <input
        ref={ref}
        type="range"
        min={0}
        max={max}
        step={step}
        value={value[0]}
        onChange={handleChange}
        className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer slider-thumb"
        style={{ ...style, '--slider-fill': `${(value[0] / max) * 100}%` }}
        {...props}
      />
    </div>
  )
})
Slider.displayName = "Slider"

export { Slider }