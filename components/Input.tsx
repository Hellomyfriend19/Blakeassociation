import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full">
      <label className="block text-xs uppercase tracking-widest text-blake-500 mb-1 font-mono">
        {label}
      </label>
      <input
        className={`w-full bg-blake-900 border ${error ? 'border-red-500' : 'border-blake-700'} text-blake-100 px-3 py-2 text-sm focus:outline-none focus:border-blake-400 transition-colors placeholder-blake-700 ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-500 font-mono">{error}</p>
      )}
    </div>
  );
};