"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";

const RANDOM_CHARS = "_!X$0-+*#";
const rnd = (prev?: string) => {
  let c: string;
  do c = RANDOM_CHARS[Math.floor(Math.random() * RANDOM_CHARS.length)]; while (c === prev);
  return c;
};

export function SpecialText({ children, speed = 20, delay = 0, className = "", inView = false }: {
  children: string; speed?: number; delay?: number; className?: string; inView?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: "-60px" });
  const go = inView ? seen : true;
  const text = children;
  const [display, setDisplay] = useState(text);
  const started = useRef(false);

  useEffect(() => {
    if (!go || started.current) return;
    started.current = true;
    let phase: 1 | 2 = 1;
    let step = 0;
    let id: ReturnType<typeof setInterval> | undefined;
    const t = setTimeout(() => {
      id = setInterval(() => {
        if (phase === 1) {
          const len = Math.min(step + 1, text.length);
          const chars: string[] = [];
          for (let i = 0; i < len; i++) chars.push(rnd(chars[i - 1]));
          for (let i = len; i < text.length; i++) chars.push("\u00A0");
          setDisplay(chars.join(""));
          if (step < text.length * 2 - 1) step++; else { phase = 2; step = 0; }
        } else {
          const revealed = Math.floor(step / 2);
          const chars = text.slice(0, revealed).split("");
          if (revealed < text.length) chars.push(step % 2 === 0 ? "_" : rnd());
          while (chars.length < text.length) chars.push(rnd());
          setDisplay(chars.join(""));
          if (step < text.length * 2 - 1) step++; else { setDisplay(text); clearInterval(id); }
        }
      }, speed);
    }, delay * 1000);
    return () => { clearTimeout(t); if (id) clearInterval(id); };
  }, [go, text, speed, delay]);

  return <span ref={ref} className={`inline-flex font-mono font-medium ${className}`}>{display}</span>;
}
