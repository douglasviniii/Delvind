
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
    className={cn("w-16 h-16", className)}
  >
    {/* Left bracket */}
    <motion.path
      d="M44 20 L15 50 L44 80"
      stroke="hsl(var(--primary))"
      strokeWidth="12"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      variants={icon}
      initial="hidden"
      animate="visible"
      transition={{
        default: { duration: 1.5, ease: 'easeInOut' },
        fill: { duration: 1, ease: [1, 0, 0.8, 1], delay: 1 },
      }}
    />
    {/* Slash */}
    <motion.path
      d="M48 80 L62 20"
      stroke="hsl(var(--primary))"
      strokeWidth="12"
      strokeLinecap="round"
      fill="none"
      variants={icon}
      initial="hidden"
      animate="visible"
      transition={{
        default: { duration: 1.5, ease: 'easeInOut', delay: 0.2 },
        fill: { duration: 1, ease: [1, 0, 0.8, 1], delay: 1.2 },
      }}
    />
    {/* Right bracket */}
    <motion.path
      d="M66 20 L95 50 L66 80"
      stroke="hsl(var(--primary))"
      strokeWidth="12"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      variants={icon}
      initial="hidden"
      animate="visible"
      transition={{
        default: { duration: 1.5, ease: 'easeInOut', delay: 0.4 },
        fill: { duration: 1, ease: [1, 0, 0.8, 1], delay: 1.4 },
      }}
    />
  </motion.svg>
);
