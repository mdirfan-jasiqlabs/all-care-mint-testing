'use client';

import React from 'react';

export interface GradientHeadingProps {
  titlePrefix?: string;
  titleHighlight?: string;
  className?: string;
}

export const GradientHeading: React.FC<GradientHeadingProps> = ({
  titlePrefix = 'Book a Service — Download the',
  titleHighlight = 'Customer App',
  className = '',
}) => {
  return (
    <h2
      id="download-cta-heading"
      className={`text-xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-[1.2] max-w-3xl mx-auto ${className}`}
    >
      {titlePrefix} <span className="text-emerald-400 font-extrabold">{titleHighlight}</span>
    </h2>
  );
};

export default GradientHeading;
