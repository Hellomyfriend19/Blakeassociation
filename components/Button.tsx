import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "px-4 py-2 text-sm font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed font-mono uppercase tracking-wider border";
  
  const variants = {
    primary: "bg-blake-200 text-blake-950 border-blake-200 hover:bg-white hover:border-white",
    secondary: "bg-transparent text-blake-300 border-blake-700 hover:border-blake-400 hover:text-blake-100",
    danger: "bg-red-900/20 text-red-400 border-red-900/50 hover:bg-red-900/40 hover:border-red-500",
    ghost: "bg-transparent border-transparent text-blake-400 hover:text-blake-200"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className} ${isLoading ? 'opacity-80' : ''}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
          Processing
        </span>
      ) : children}
    </button>
  );
};