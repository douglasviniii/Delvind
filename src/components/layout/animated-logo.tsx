
'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const icon = {
  hidden: {
    pathLength: 0,
    fill: 'rgba(109, 40, 217, 0)',
  },
  visible: {
    pathLength: 1,
    fill: 'rgba(109, 40, 217, 1)',
  },
};

export const AnimatedLogo = ({ className }: { className?: string }) => (
  <motion.svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    className={cn("w-12 h-12", className)}
  >
    <motion.path
      d="M20,80 L20,20 L80,20 L80,80 L20,80 M20,50 L80,50"
      stroke="hsl(var(--primary))"
      strokeWidth="5"
      fill="none"
      variants={icon}
      initial="hidden"
      animate="visible"
      transition={{
        default: { duration: 2, ease: 'easeInOut' },
        fill: { duration: 1, ease: [1, 0, 0.8, 1], delay: 1.5 },
      }}
    />
    <motion.path
      d="M50,20 L50,80"
      stroke="hsl(var(--primary))"
      strokeWidth="5"
      fill="none"
      variants={icon}
      initial="hidden"
      animate="visible"
      transition={{
        default: { duration: 2, ease: 'easeInOut' },
        fill: { duration: 1, ease: [1, 0, 0.8, 1], delay: 1.5 },
      }}
    />
  </motion.svg>
);
