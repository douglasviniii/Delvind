'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type TypingEffectProps = {
  text: string;
  speed?: number;
};

export const TypingEffect = ({ text, speed = 50 }: TypingEffectProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    setDisplayedText(''); // Reset on text change
    let i = 0;
    const intervalId = setInterval(() => {
      setDisplayedText((prev) => text.substring(0, prev.length + 1));
      i++;
      if (i >= text.length) {
        clearInterval(intervalId);
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [text, speed, isClient]);

  if (!isClient) {
    // Render the full text on the server to avoid hydration mismatch
    return <span>{text}</span>;
  }

  const isComplete = displayedText.length === text.length;

  return (
    <span>
      {displayedText}
      <AnimatePresence>
        {!isComplete && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }}
            className="inline-block w-1 h-5 bg-muted-foreground ml-1 -mb-1"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
    </span>
  );
};
