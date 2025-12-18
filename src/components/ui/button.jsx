import React from "react";

const Button = React.forwardRef((props, ref) => {
  const { className = "", variant = "default", size = "default", children, ...rest } = props;

  const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";
  
  const variantStyles = {
    default: "bg-purple-600 text-white hover:bg-purple-700",
    destructive: "bg-red-500 text-white hover:bg-red-600",
    outline: "border border-gray-300 bg-transparent hover:bg-gray-100 text-white hover:text-gray-900",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
    ghost: "hover:bg-gray-100 text-white hover:text-gray-900",
    link: "text-purple-400 underline-offset-4 hover:underline"
  };
  
  const sizeStyles = {
    default: "h-9 px-4 py-2",
    sm: "h-8 px-3 text-xs",
    lg: "h-10 px-8",
    icon: "h-9 w-9"
  };
  
  return (
    <button
      ref={ref}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";

const buttonVariants = ({ variant = "default", size = "default", className = "" }) => {
  const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";
  
  const variantStyles = {
    default: "bg-purple-600 text-white hover:bg-purple-700",
    destructive: "bg-red-500 text-white hover:bg-red-600",
    outline: "border border-gray-300 bg-transparent hover:bg-gray-100 text-white hover:text-gray-900",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
    ghost: "hover:bg-gray-100 text-white hover:text-gray-900",
    link: "text-purple-400 underline-offset-4 hover:underline"
  };
  
  const sizeStyles = {
    default: "h-9 px-4 py-2",
    sm: "h-8 px-3 text-xs",
    lg: "h-10 px-8",
    icon: "h-9 w-9"
  };
  
  return `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;
};

export { Button, buttonVariants };
export default Button;