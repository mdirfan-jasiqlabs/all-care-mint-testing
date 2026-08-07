'use client';

import React from 'react';
import { motion, useReducedMotion, Variants } from 'framer-motion';
import { fadeUpVariant, defaultViewport } from '@/lib/motion';

export interface MotionSectionProps {
  children: React.ReactNode;
  className?: string;
  variants?: Variants;
  delay?: number;
  id?: string;
}

export const MotionSection: React.FC<MotionSectionProps> = ({
  children,
  className = '',
  variants = fadeUpVariant,
  delay = 0,
  id,
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <section id={id} className={className}>
        {children}
      </section>
    );
  }

  return (
    <motion.section
      id={id}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={defaultViewport}
      variants={variants}
      transition={{ delay }}
    >
      {children}
    </motion.section>
  );
};

export default MotionSection;
