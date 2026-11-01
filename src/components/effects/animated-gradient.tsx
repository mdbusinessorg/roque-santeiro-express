"use client";

import { cn } from "@/lib/utils";

export function AnimatedGradient({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} style={style} aria-hidden>
      <div className="absolute inset-0 brand-gradient" />
      <div className="absolute -left-1/4 -top-1/3 h-[140%] w-[80%] rounded-full bg-sky/60 blur-3xl" style={{ animation: "rse-blob1 14s ease-in-out infinite alternate" }} />
      <div className="absolute -right-1/4 top-0 h-[120%] w-[70%] rounded-full bg-indigo-500/50 blur-3xl" style={{ animation: "rse-blob2 18s ease-in-out infinite alternate" }} />
      <div className="absolute bottom-[-40%] left-1/4 h-[90%] w-[60%] rounded-full bg-cyan-300/40 blur-3xl" style={{ animation: "rse-blob3 16s ease-in-out infinite alternate" }} />
      <div className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:18px_18px]" />
      <style>{`@keyframes rse-blob1{to{transform:translate(30%,20%) scale(1.2)}}@keyframes rse-blob2{to{transform:translate(-25%,15%) scale(.9)}}@keyframes rse-blob3{to{transform:translate(20%,-30%) scale(1.15)}}`}</style>
    </div>
  );
}
export default AnimatedGradient;
