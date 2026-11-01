"use client";

import { useEffect } from "react";
import { interact, track, type MetaEvent } from "@/lib/tracking";

export function TrackEvent({ name, data, productId, categoryId, kind, query }: { name: MetaEvent; data?: Record<string, unknown>; productId?: string; categoryId?: string | null; kind?: "view" | "search"; query?: string }) {
  const key = JSON.stringify([name, productId, query]);
  useEffect(() => {
    track(name, data ?? {});
    if (kind) interact({ kind, product_id: productId, category_id: categoryId, query });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

export function LeadLink({ href, className, children, label }: { href: string; className?: string; children: React.ReactNode; label: string }) {
  return <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={className} onClick={() => track("Lead", { content_name: label })}>{children}</a>;
}
