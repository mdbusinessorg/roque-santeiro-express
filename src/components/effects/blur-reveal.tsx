"use client";

import { motion } from "motion/react";

export function BlurReveal({ children, className, delay = 0, speedReveal = 1.5, speedSegment = 0.5, inView = false, once = true }: {
  children: string; className?: string; delay?: number; speedReveal?: number; speedSegment?: number; inView?: boolean; once?: boolean;
}) {
  const stagger = 0.03 / speedReveal;
  const duration = 0.3 / speedSegment;
  const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: stagger, delayChildren: delay } } };
  const item = { hidden: { opacity: 0, filter: "blur(12px)", y: 10 }, visible: { opacity: 1, filter: "blur(0px)", y: 0, transition: { duration } } };
  const words = children.split(" ");
  return (
    <motion.span
      className={className}
      initial="hidden"
      whileInView={inView ? "visible" : undefined}
      animate={inView ? undefined : "visible"}
      viewport={{ once }}
      variants={container}
    >
      <span className="sr-only">{children}</span>
      {words.map((word, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap" aria-hidden="true">
          {word.split("").map((c, ci) => (
            <motion.span key={ci} variants={item} className="inline-block">{c}</motion.span>
          ))}
          {wi < words.length - 1 && <motion.span variants={item} className="inline-block">&nbsp;</motion.span>}
        </span>
      ))}
    </motion.span>
  );
}
