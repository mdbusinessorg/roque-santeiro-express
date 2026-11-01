"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type From = "left" | "right" | "top" | "bottom";
const fromVariants = {
  left: { hidden: { x: "-100%" }, visible: { x: "0%" } },
  right: { hidden: { x: "100%" }, visible: { x: "0%" } },
  top: { hidden: { y: "-100%" }, visible: { y: "0%" } },
  bottom: { hidden: { y: "100%" }, visible: { y: "0%" } },
};

export function HighlightedText({ children, className, from = "bottom", delay = 0, inView = false, once = true, barClassName }: {
  children: React.ReactNode; className?: string; from?: From; delay?: number; inView?: boolean; once?: boolean; barClassName?: string;
}) {
  return (
    <motion.span
      className={cn("relative inline-flex overflow-hidden align-baseline", className)}
      initial="hidden"
      whileInView={inView ? "visible" : undefined}
      animate={inView ? undefined : "visible"}
      viewport={{ once }}
    >
      <motion.span
        className={cn("absolute inset-0 -left-[0.15em] -right-[0.18em] z-0 promo-gradient", barClassName)}
        variants={fromVariants[from]}
        transition={{ type: "spring", damping: 30, stiffness: 300, delay }}
      />
      <span className="relative z-10 pl-[0.15em] pr-[0.18em] text-white">{children}</span>
    </motion.span>
  );
}
