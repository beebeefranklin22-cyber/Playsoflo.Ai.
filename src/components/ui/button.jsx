import React from "react";

export function Button({ children, className = "", variant = "default", size = "default", type = "button", disabled, onClick, ...props }) {
  let variantClass = "bg-purple-600 text-white hover:bg-purple-700";
  if (variant === "destructive") variantClass = "bg-red-500 text-white hover:bg-red-600";
  if (variant === "outline") variantClass = "border border-gray-300 bg-transparent hover:bg-gray-100 text-white hover:text-gray-900";
  if (variant === "secondary") variantClass = "bg-gray-200 text-gray-900 hover:bg-gray-300";
  if (variant === "ghost") variantClass = "hover:bg-gray-100 text-white hover:text-gray-900";
  if (variant === "link") variantClass = "text-purple-400 underline-offset-4 hover:underline";

  let sizeClass = "h-9 px-4 py-2";
  if (size === "sm") sizeClass = "h-8 px-3 text-xs";
  if (size === "lg") sizeClass = "h-10 px-8";
  if (size === "icon") sizeClass = "h-9 w-9";

  const buttonClass = `inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${variantClass} ${sizeClass} ${className}`;

  return (
    <button type={type} className={buttonClass} disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  );
}

export function buttonVariants(options = {}) {
  const { variant = "default", size = "default", className = "" } = options;
  
  let variantClass = "bg-purple-600 text-white hover:bg-purple-700";
  if (variant === "destructive") variantClass = "bg-red-500 text-white hover:bg-red-600";
  if (variant === "outline") variantClass = "border border-gray-300 bg-transparent hover:bg-gray-100 text-white hover:text-gray-900";
  if (variant === "secondary") variantClass = "bg-gray-200 text-gray-900 hover:bg-gray-300";
  if (variant === "ghost") variantClass = "hover:bg-gray-100 text-white hover:text-gray-900";
  if (variant === "link") variantClass = "text-purple-400 underline-offset-4 hover:underline";

  let sizeClass = "h-9 px-4 py-2";
  if (size === "sm") sizeClass = "h-8 px-3 text-xs";
  if (size === "lg") sizeClass = "h-10 px-8";
  if (size === "icon") sizeClass = "h-9 w-9";

  return `inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${variantClass} ${sizeClass} ${className}`;
}

export default Button;