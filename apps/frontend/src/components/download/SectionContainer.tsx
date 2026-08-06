'use client';

import React from 'react';

export interface SectionContainerProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export const SectionContainer: React.FC<SectionContainerProps> = ({
  children,
  className = '',
  id = 'download',
}) => {
  return (
    <section
      id={id}
      aria-labelledby="download-cta-heading"
      className={`relative w-full py-6 sm:py-8 md:py-10 px-4 sm:px-6 lg:px-8 select-none ${className}`}
    >
      {children}
    </section>
  );
};

export default SectionContainer;
