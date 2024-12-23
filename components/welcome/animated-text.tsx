"use client";

import * as React from "react";
import { motion, useAnimate } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  onComplete?: () => void;
}

export function AnimatedText({
  text,
  className,
  delay = 0,
  duration = 0.5,
  onComplete,
}: AnimatedTextProps) {
  const [scope, animate] = useAnimate();
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setIsVisible(true);
      animate(
        scope.current,
        { opacity: 1, y: 0 },
        { duration, onComplete }
      );
    }, delay);

    return () => clearTimeout(timeout);
  }, [animate, delay, duration, onComplete, scope]);

  return (
    <motion.div
      ref={scope}
      initial={{ opacity: 0, y: 10 }}
      className={cn("", className)}
      style={{ opacity: isVisible ? undefined : 0 }}
    >
      {text}
    </motion.div>
  );
}
