import * as React from "react"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef(({ className, value = [0], max = 100, step = 1, onValueChange, ...props }, ref) => {
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
        {...props}
      />
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          border: 1px solid rgba(168, 85, 247, 0.5);
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          border: 1px solid rgba(168, 85, 247, 0.5);
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }

        input[type="range"]::-webkit-slider-runnable-track {
          background: linear-gradient(to right, rgb(168, 85, 247) 0%, rgb(168, 85, 247) ${(value[0] / max) * 100}%, rgba(255, 255, 255, 0.2) ${(value[0] / max) * 100}%, rgba(255, 255, 255, 0.2) 100%);
          height: 6px;
          border-radius: 3px;
        }

        input[type="range"]::-moz-range-track {
          background: rgba(255, 255, 255, 0.2);
          height: 6px;
          border-radius: 3px;
        }

        input[type="range"]::-moz-range-progress {
          background: rgb(168, 85, 247);
          height: 6px;
          border-radius: 3px;
        }

        input[type="range"]:focus {
          outline: none;
        }

        input[type="range"]:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.5);
        }
      `}</style>
    </div>
  )
})
Slider.displayName = "Slider"

export { Slider }