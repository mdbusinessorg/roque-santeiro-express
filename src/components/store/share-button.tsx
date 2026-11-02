"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { shareLink } from "@/lib/native";

export function ShareButton({ title, url, className }: { title: string; url: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" onClick={async () => { const r = await shareLink(title, url); if (r === "copied") { setDone(true); setTimeout(() => setDone(false), 1800); } }} className={className ?? "btn-ghost"}>
      {done ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}{done ? "Link copiado" : "Partilhar"}
    </button>
  );
}
