import { Variants } from 'framer-motion';

// Premium All Care Mint Easing Curve
export const transitionEase = [0.21, 0.47, 0.32, 0.98] as const;

export const defaultTransition = {
  duration: 0.5,
  ease: transitionEase,
};

// Section Fade Up Variant
export const fadeUpVariant: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: defaultTransition,
  },
};

// Fade In Variant
export const fadeInVariant: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

// Subtle Scale In Variant
export const scaleInSubtleVariant: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: defaultTransition,
  },
};

// Stagger Container Variant
export const staggerContainerVariant = (staggerChildren = 0.1, delayChildren = 0): Variants => ({
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

// Stagger Item Variant
export const staggerItemVariant: Variants = {
  hidden: {
    opacity: 0,
    y: 16,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: defaultTransition,
  },
};

// Default Viewport Config
export const defaultViewport = {
  once: true,
  amount: 0.15,
};
