"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function LogosCarousel({ children, stagger = 0.14, count, className, duration = 600, interval = 2600, initialDelay = 500 }: {
  children: React.ReactNode; stagger?: number; count?: number; className?: string; duration?: number; interval?: number; initialDelay?: number;
}) {
  const [index, setIndex] = React.useState(0);
  const [animate, setAnimate] = React.useState(false);
  const [nextIndex, setNextIndex] = React.useState(1);
  const arr = React.Children.toArray(children);
  const per = count || arr.length;
  const groups: React.ReactNode[][] = [];
  for (let i = 0; i < arr.length; i += per) groups.push(arr.slice(i, i + per));
  const n = groups.length;

  React.useEffect(() => { const id = setTimeout(() => setAnimate(true), initialDelay); return () => clearTimeout(id); }, [initialDelay]);
  React.useEffect(() => {
    if (!animate || n < 2) return;
    const id = setInterval(() => setIndex((p) => { const ni = (p + 1) % n; setNextIndex((ni + 1) % n); return ni; }), interval);
    return () => clearInterval(id);
  }, [animate, interval, n]);
  if (!n) return null;

  return (
    <div className="grid w-full place-items-center">
      <style>{`@keyframes logos-enter{0%{transform:translateY(40px);filter:blur(4px);opacity:0}100%{transform:none;filter:blur(0);opacity:1}}@keyframes logos-exit{0%{transform:none;filter:blur(0);opacity:1}100%{transform:translateY(-40px);filter:blur(4px);opacity:0}}`}</style>
      {groups.map((group, gi) => {
        const cur = gi === index;
        const next = gi === nextIndex && animate && n > 1;
        const vis = cur || next;
        return (
          <div key={gi} className={cn("flex w-full justify-center gap-6", className)} style={{ gridArea: "1 / 1", pointerEvents: cur ? "auto" : "none" }}>
            {group.map((logo, li) => {
              const style: React.CSSProperties = { animationDelay: `${li * stagger}s`, animationDuration: `${duration}ms`, animationFillMode: "both" };
              if (!animate || n < 2 || !vis) return <div key={li} className={cur ? "opacity-100" : "opacity-0"} style={style}>{logo}</div>;
              return <div key={li} style={{ ...style, animationName: cur ? "logos-exit" : "logos-enter", animationTimingFunction: "ease" }}>{logo}</div>;
            })}
          </div>
        );
      })}
    </div>
  );
}
