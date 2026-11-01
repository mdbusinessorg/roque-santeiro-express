"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function Gallery({ images, name }: { images: string[]; name: string }) {
  const [i, setI] = useState(0);
  return (
    <div>
      <div className="well aspect-square overflow-hidden rounded-[1.1rem] border border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[i]} alt={name} className="h-full w-full object-contain mix-blend-multiply p-6" />
      </div>
      {images.length > 1 && (
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
          {images.map((src, k) => (
            <button key={k} onClick={() => setI(k)} className={cn("card h-16 w-16 shrink-0 overflow-hidden p-1", k === i && "ring-2 ring-brand-500")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
