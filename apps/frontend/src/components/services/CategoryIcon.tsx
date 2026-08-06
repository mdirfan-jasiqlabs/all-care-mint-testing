'use client';

import React from 'react';

export interface CategoryIconProps {
  name: string;
  iconUrl?: string | null;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, iconUrl, className = 'w-7 h-7 text-emerald-400' }) => {
  if (iconUrl) {
    return <img src={iconUrl} alt="" className={className} aria-hidden="true" />;
  }

  const lowerName = name.toLowerCase();

  // 1. Cleaning / Sanitization
  if (lowerName.includes('clean') || lowerName.includes('sanit') || lowerName.includes('wash')) {
    return (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21l8-8m0 0l-3-3m3 3l3 3m-3-3L18.5 5.5a2.121 2.121 0 013 3L11 18.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l4 4" />
      </svg>
    );
  }

  // 2. AC Repair / HVAC / Cooling
  if (lowerName.includes('ac') || lowerName.includes('air') || lowerName.includes('cool') || lowerName.includes('hvac')) {
    return (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="6" width="18" height="9" rx="2" strokeWidth="1.8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 11h10M7 18t1.5-2 1.5 2M12 18t1.5-2 1.5 2M17 18t1.5-2 1.5 2" />
      </svg>
    );
  }

  // 3. Plumbing / Water / Tap / Pipe
  if (lowerName.includes('plumb') || lowerName.includes('pipe') || lowerName.includes('tap') || lowerName.includes('drain') || lowerName.includes('leak')) {
    return (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v4m0 0H8a2 2 0 00-2 2v2h12v-2a2 2 0 00-2-2h-4zm-4 8v3a2 2 0 002 2h4a2 2 0 002-2v-3" />
        <circle cx="12" cy="18" r="1.2" fill="currentColor" />
      </svg>
    );
  }

  // 4. Painting / Wall / Decor
  if (lowerName.includes('paint') || lowerName.includes('wall') || lowerName.includes('decor')) {
    return (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h14a2 2 0 012 2v3a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm14 7v3a2 2 0 01-2 2h-5v5h-2v-5H4" />
        <circle cx="14" cy="8" r="1" fill="currentColor" />
      </svg>
    );
  }

  // 5. Electrical / Wiring / Switch
  if (lowerName.includes('electric') || lowerName.includes('wire') || lowerName.includes('switch') || lowerName.includes('fan') || lowerName.includes('power')) {
    return (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    );
  }

  // 6. Carpentry / Woodwork / Furniture
  if (lowerName.includes('carpent') || lowerName.includes('wood') || lowerName.includes('furnit') || lowerName.includes('table')) {
    return (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    );
  }

  // 7. Pest Control / Extermination
  if (lowerName.includes('pest') || lowerName.includes('bug') || lowerName.includes('insect') || lowerName.includes('termite')) {
    return (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    );
  }

  // 8. Appliance Repair / Refrigerator / Washing Machine
  if (lowerName.includes('appliance') || lowerName.includes('refriger') || lowerName.includes('fridge') || lowerName.includes('geyser') || lowerName.includes('repair')) {
    return (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <circle cx="12" cy="12" r="3" strokeWidth="1.8" />
      </svg>
    );
  }

  // 9. Salon / Beauty / Spa
  if (lowerName.includes('salon') || lowerName.includes('beauty') || lowerName.includes('hair') || lowerName.includes('spa')) {
    return (
      <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m11-16l2.5 2.5M19 3l-2.5 2.5M14 10l-4 4m0-4l4 4M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }

  // 10. Fallback Generic Service Grid Icon
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
};

export default CategoryIcon;
