"use client";

import React, { useEffect, useState, useRef } from "react";

interface CountUpProps {
  value: number;
  duration?: number; // in milliseconds
  formatter?: (val: number) => string;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function CountUp({
  value,
  duration = 1000,
  formatter,
  prefix = "",
  suffix = "",
  className = "",
}: CountUpProps) {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const prevValueRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Respect prefers-reduced-motion
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    const startVal = prevValueRef.current;
    const endVal = value;
    const diff = endVal - startVal;

    if (diff === 0) {
      setDisplayValue(endVal);
      return;
    }

    startTimeRef.current = null;

    const step = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);

      // Ease out cubic: 1 - pow(1 - progress, 3)
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + diff * ease);

      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        setDisplayValue(endVal);
        prevValueRef.current = endVal;
      }
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [value, duration]);

  const formatted = formatter
    ? formatter(displayValue)
    : `${prefix}${displayValue.toLocaleString()}${suffix}`;

  return <span className={className}>{formatted}</span>;
}
