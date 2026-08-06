'use client';

import React from 'react';

export interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
  error?: string | boolean;
  options: Array<{ value: string; label: string }>;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  label,
  required,
  icon,
  error,
  options,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-2">
      <label htmlFor={selectId} className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-wider block">
        {label} {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-4 text-emerald-400 pointer-events-none flex items-center justify-center" aria-hidden="true">
            {icon}
          </div>
        )}
        <select
          id={selectId}
          {...props}
          className={`w-full bg-[#050b14]/95 border ${
            error ? 'border-rose-500' : 'border-[#14263b] hover:border-emerald-500/50 focus:border-emerald-400'
          } text-white text-xs sm:text-sm rounded-2xl ${
            icon ? 'pl-12' : 'pl-4'
          } pr-10 py-3 sm:py-3.5 outline-none transition-all duration-200 focus:ring-1 focus:ring-emerald-400/40 appearance-none font-normal cursor-pointer ${className}`}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#060c18] text-white py-2">
              {opt.label}
            </option>
          ))}
        </select>
        {/* Chevron Down Arrow */}
        <div className="absolute right-4 text-slate-300 pointer-events-none flex items-center justify-center" aria-hidden="true">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {typeof error === 'string' && <p className="text-[10px] text-rose-400 font-medium">{error}</p>}
    </div>
  );
};

export default FormSelect;
