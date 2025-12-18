import React from "react";

const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";

const variants = {
  default: "bg-primary text-white shadow hover:bg-primary/90",
  destructive: "bg-red-500 text-white shadow-sm hover:bg-red-600",
  outline: "border border-gray-300 bg-transparent shadow-sm hover:bg-gray-100",
  secondary: "bg-gray-200 text-gray-900 shadow-sm hover:bg-gray-300",
  ghost: "hover:bg-gray-100",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizes = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-10 rounded-md px-8",
  icon: "h-9 w-9",
};

export const buttonVariants = ({ variant = "default", size = "default", className = "" }) => {
  const variantClass = variants[variant] || variants.default;
  const sizeClass = sizes[size] || sizes.default;
  return `${baseStyles} ${variantClass} ${sizeClass} ${className}`;
};

export const Button = React.forwardRef(({ 
  className = "", 
  variant = "default", 
  size = "default", 
  disabled = false,
  children,
  ...props 
}, ref) => {
  return (
    <button
      ref={ref}
      className={buttonVariants({ variant, size, className })}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";