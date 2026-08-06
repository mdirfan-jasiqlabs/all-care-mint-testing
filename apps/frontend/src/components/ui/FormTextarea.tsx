'use client';

import React from 'react';

export interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
  error?: string | boolean;
}

export const FormTextarea: React.FC<FormTextareaProps> = ({
  label,
  required,
  icon,
  error,
  className = '',
  id,
  rows = 3,
  ...props
}) => {
  const textareaId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-2">
      <label htmlFor={textareaId} className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-wider block">
        {label} {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-3.5 text-emerald-400 pointer-events-none flex items-center justify-center" aria-hidden="true">
            {icon}
          </div>
        )}
        <textarea
          id={textareaId}
          rows={rows}
          {...props}
          className={`w-full bg-[#050b14]/95 border ${
            error ? 'border-rose-500' : 'border-[#14263b] hover:border-emerald-500/50 focus:border-emerald-400'
          } text-white text-xs sm:text-sm rounded-2xl ${
            icon ? 'pl-12' : 'pl-4'
          } pr-4 py-3 sm:py-3.5 outline-none transition-all duration-200 focus:ring-1 focus:ring-emerald-400/40 placeholder:text-slate-400 font-normal resize-none ${className}`}
        />
      </div>
      {typeof error === 'string' && <p className="text-[10px] text-rose-400 font-medium">{error}</p>}
    </div>
  );
};

export default FormTextarea;
