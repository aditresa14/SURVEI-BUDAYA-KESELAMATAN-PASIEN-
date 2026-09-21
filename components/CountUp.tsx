'use client';
import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';

export default function CountUp({ value, duration = 1, className = '' }: { value: number, duration?: number, className?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => `${Math.round(latest)}%`);

  useEffect(() => {
    const animation = animate(count, value, { duration, ease: "easeOut" });
    return animation.stop;
  }, [value, duration, count]);

  return <motion.span className={className}>{rounded}</motion.span>;
}

