"use client";

import * as React from "react";
import QRCodeLib from "qrcode";
import { cn } from "@/lib/utils";

const inFinder = (r: number, c: number, s: number) => (r < 7 && c < 7) || (r < 7 && c >= s - 7) || (r >= s - 7 && c < 7);

export function QRCode({ value, size = 200, fgColor = "#0b2f8f", bgColor = "#ffffff", className }: {
  value: string; size?: number; fgColor?: string; bgColor?: string; className?: string;
}) {
  const qr = React.useMemo(() => { try { return QRCodeLib.create(value, { errorCorrectionLevel: "M" }); } catch { return null; } }, [value]);
  if (!qr) return null;
  const n = qr.modules.size;
  const m = size / n;
  const circles: { cx: number; cy: number }[] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.modules.get(r, c) && !inFinder(r, c, n)) circles.push({ cx: (c + 0.5) * m, cy: (r + 0.5) * m });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={cn("block", className)} aria-label={`QR code ${value}`}>
      <rect width={size} height={size} fill={bgColor} rx="12" />
      {[[0, 0], [0, n - 7], [n - 7, 0]].map(([r, c]) => (
        <g key={`${r}-${c}`}>
          <rect x={c * m} y={r * m} width={7 * m} height={7 * m} fill={fgColor} rx="10" />
          <rect x={c * m + m} y={r * m + m} width={5 * m} height={5 * m} fill={bgColor} rx="7" />
          <rect x={c * m + 2 * m} y={r * m + 2 * m} width={3 * m} height={3 * m} fill={fgColor} rx="3" />
        </g>
      ))}
      {circles.map((p, i) => <circle key={i} cx={p.cx} cy={p.cy} r={m / 3} fill={fgColor} />)}
    </svg>
  );
}
