'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { staggerItemVariant } from '@/lib/motion';

export interface MotionCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const MotionCard: React.FC<MotionCardProps> = ({
  children,
  className = '',
  onClick,
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <div className={className} onClick={onClick}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      variants={staggerItemVariant}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};

export default MotionCard;
