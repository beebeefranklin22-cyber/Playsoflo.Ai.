import React from "react";

const Button = React.forwardRef(({ 
  className = "", 
  variant = "default", 
  size = "default", 
  disabled = false,
  children,
  ...props 
}, ref) => {
  const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";
  
  const variantStyles = {
    default: "bg-purple-600 text-white shadow hover:bg-purple-700",
    destructive: "bg-red-500 text-white shadow-sm hover:bg-red-600",
    outline: "border border-gray-300 bg-transparent shadow-sm hover:bg-gray-100 text-white hover:text-gray-900",
    secondary: "bg-gray-200 text-gray-900 shadow-sm hover:bg-gray-300",
    ghost: "hover:bg-gray-100 text-white hover:text-gray-900",
    link: "text-purple-400 underline-offset-4 hover:underline",
  };
  
  const sizeStyles = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-10 rounded-md px-8",
    icon: "h-9 w-9",
  };
  
  const variantClass = variantStyles[variant] || variantStyles.default;
  const sizeClass = sizeStyles[size] || sizeStyles.default;
  
  return (
    <button
      ref={ref}
      className={`${baseStyles} ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";

export function buttonVariants({ variant = "default", size = "default", className = "" }) {
  const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";
  
  const variantStyles = {
    default: "bg-purple-600 text-white shadow hover:bg-purple-700",
    destructive: "bg-red-500 text-white shadow-sm hover:bg-red-600",
    outline: "border border-gray-300 bg-transparent shadow-sm hover:bg-gray-100 text-white hover:text-gray-900",
    secondary: "bg-gray-200 text-gray-900 shadow-sm hover:bg-gray-300",
    ghost: "hover:bg-gray-100 text-white hover:text-gray-900",
    link: "text-purple-400 underline-offset-4 hover:underline",
  };
  
  const sizeStyles = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-10 rounded-md px-8",
    icon: "h-9 w-9",
  };
  
  const variantClass = variantStyles[variant] || variantStyles.default;
  const sizeClass = sizeStyles[size] || sizeStyles.default;
  
  return `${baseStyles} ${variantClass} ${sizeClass} ${className}`;
}

export { Button };
export default Button;