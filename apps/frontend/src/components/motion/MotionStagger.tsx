'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { staggerContainerVariant, defaultViewport } from '@/lib/motion';

export interface MotionStaggerProps {
  children: React.ReactNode;
  className?: string;
  staggerChildren?: number;
  delayChildren?: number;
}

export const MotionStagger: React.FC<MotionStaggerProps> = ({
  children,
  className = '',
  staggerChildren = 0.1,
  delayChildren = 0,
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={defaultViewport}
      variants={staggerContainerVariant(staggerChildren, delayChildren)}
    >
      {children}
    </motion.div>
  );
};

export default MotionStagger;
