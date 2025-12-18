import * as React from "react"

const buttonVariants = (props) => {
  const { variant = "default", size = "default", className = "" } = props
  const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50"
  
  const variants = {
    default: "bg-purple-600 text-white hover:bg-purple-700",
    destructive: "bg-red-500 text-white hover:bg-red-600",
    outline: "border border-gray-300 bg-transparent hover:bg-gray-100 text-white hover:text-gray-900",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
    ghost: "hover:bg-gray-100 text-white hover:text-gray-900",
    link: "text-purple-400 underline-offset-4 hover:underline"
  }
  
  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 px-3 text-xs",
    lg: "h-10 px-8",
    icon: "h-9 w-9"
  }
  
  return [base, variants[variant], sizes[size], className].filter(Boolean).join(" ")
}

const Button = React.forwardRef((props, ref) => {
  const { className, variant, size, type = "button", ...rest } = props
  return React.createElement(
    "button",
    {
      type,
      className: buttonVariants({ variant, size, className }),
      ref,
      ...rest
    }
  )
})

Button.displayName = "Button"

export { Button, buttonVariants }