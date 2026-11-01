"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  duration?: number;
  pauseOnHover?: boolean;
  direction?: "left" | "right";
  fade?: boolean;
  fadeAmount?: number;
}

export function Marquee({ children, className, duration = 20, pauseOnHover = false, direction = "left", fade = true, fadeAmount = 10, ...props }: MarqueeProps) {
  const [isPaused, setIsPaused] = React.useState(false);
  const items = React.Children.toArray(children);
  const mask = `linear-gradient(to right, transparent 0%, black ${fadeAmount}%, black ${100 - fadeAmount}%, transparent 100%)`;
  return (
    <div
      className={cn("flex w-full overflow-hidden", className)}
      style={fade ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
      {...props}
    >
      <div
        className="flex shrink-0"
        style={{
          animation: `${direction === "left" ? "rse-marquee" : "rse-marquee-rev"} ${duration}s linear infinite`,
          animationPlayState: isPaused ? "paused" : "running",
        }}
      >
        {[0, 1].map((k) => items.map((item, i) => <div key={`${k}-${i}`} className="flex shrink-0">{item}</div>))}
      </div>
      <style>{`@keyframes rse-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}@keyframes rse-marquee-rev{from{transform:translateX(-50%)}to{transform:translateX(0)}}`}</style>
    </div>
  );
}
