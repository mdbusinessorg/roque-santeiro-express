"use client";

import { motion } from "motion/react";

export function Signature({ text, className, color = "#263445", fontSize = 28 }: { text: string; className?: string; color?: string; fontSize?: number }) {
  return (
    <svg className={className} viewBox={`0 0 ${text.length * fontSize * 0.55 + 20} ${fontSize * 1.6}`} height={fontSize * 1.6}>
      <motion.text
        x="10" y={fontSize * 1.15} fill="transparent" stroke={color} strokeWidth={0.8}
        style={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive", fontSize }}
        initial={{ strokeDasharray: 600, strokeDashoffset: 600 }}
        whileInView={{ strokeDashoffset: 0, fill: color }}
        viewport={{ once: true }}
        transition={{ duration: 2.4, ease: "easeInOut" }}
      >
        {text}
      </motion.text>
    </svg>
  );
}
