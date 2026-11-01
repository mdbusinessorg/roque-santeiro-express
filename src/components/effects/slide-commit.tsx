"use client";

import { useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { Check, ChevronsRight, Loader2, X } from "lucide-react";

type Phase = "idle" | "busy" | "done" | "error";

export function SlideCommit({
  label,
  doneLabel = "Feito",
  errorLabel = "Falhou",
  onConfirm,
  disabled,
  className = "",
}: {
  label: string;
  doneLabel?: string;
  errorLabel?: string;
  onConfirm: () => Promise<boolean | void> | boolean | void;
  disabled?: boolean;
  className?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const x = useMotionValue(0);
  const H = 56;
  const max = () => (track.current?.offsetWidth ?? 280) - H;
  const fill = useTransform(x, (v) => v + H);
  const textOpacity = useTransform(x, (v) => 1 - Math.min(v / Math.max(max(), 1), 1) * 1.4);

  async function commit() {
    setPhase("busy");
    animate(x, max(), { type: "spring", stiffness: 500, damping: 40 });
    try {
      const ok = await onConfirm();
      if (ok === false) throw new Error("fail");
      setPhase("done");
      navigator.vibrate?.(18);
    } catch {
      setPhase("error");
      setTimeout(() => {
        setPhase("idle");
        animate(x, 0, { type: "spring", stiffness: 380, damping: 18 });
      }, 1500);
    }
  }

  function onDragEnd() {
    if (phase !== "idle") return;
    if (x.get() > max() * 0.82) commit();
    else animate(x, 0, { type: "spring", stiffness: 420, damping: 16 });
  }

  const color = phase === "done" ? "bg-emerald-500" : phase === "error" ? "bg-red-500" : "promo-gradient";

  return (
    <div
      ref={track}
      className={`relative h-14 w-full select-none overflow-hidden rounded-full bg-raised ring-1 ring-white/10 ${disabled ? "opacity-50" : ""} ${className}`}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-disabled={disabled}
      onKeyDown={(e) => {
        if (!disabled && phase === "idle" && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          commit();
        }
      }}
    >
      <motion.div className={`absolute inset-y-0 left-0 rounded-full ${color}`} style={{ width: fill }} />
      <motion.span style={{ opacity: phase === "idle" ? textOpacity : 1 }} className="pointer-events-none absolute inset-0 grid place-items-center pl-10 text-[15px] font-semibold text-white">
        {phase === "done" ? doneLabel : phase === "error" ? errorLabel : phase === "busy" ? "A processar…" : label}
      </motion.span>
      <motion.div
        drag={disabled || phase !== "idle" ? false : "x"}
        dragConstraints={track}
        dragElastic={0.02}
        dragMomentum={false}
        onDragEnd={onDragEnd}
        style={{ x }}
        whileTap={{ scale: 0.94 }}
        className="absolute left-1 top-1 grid h-12 w-12 cursor-grab touch-none place-items-center rounded-full bg-white text-zinc-900 shadow-lg active:cursor-grabbing"
      >
        {phase === "busy" ? <Loader2 className="h-5 w-5 animate-spin" /> : phase === "done" ? <Check className="h-5 w-5 text-emerald-600" /> : phase === "error" ? <X className="h-5 w-5 text-red-600" /> : <ChevronsRight className="h-5 w-5" />}
      </motion.div>
    </div>
  );
}
