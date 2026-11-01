"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function WordsStagger({ children, className, stagger = 0.06, delay = 0 }: { children: string; className?: string; stagger?: number; delay?: number }) {
  const words = children.split(/\s+/);
  return (
    <motion.p
      className={cn("flex flex-wrap gap-x-[0.28em]", className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ visible: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
    >
      {words.map((w, i) => (
        <motion.span
          key={i}
          className="inline-block"
          variants={{ hidden: { opacity: 0.12, y: 6, filter: "blur(4px)" }, visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.45 } } }}
        >
          {w}
        </motion.span>
      ))}
    </motion.p>
  );
}
