"use client";

import NextLink from "next/link";
import { forwardRef, type AnchorHTMLAttributes } from "react";

type Href = string | { pathname?: string; query?: Record<string, string | number | undefined> };
type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: Href; prefetch?: boolean | null; replace?: boolean; scroll?: boolean };

function toUrl(h: Href): string {
  if (typeof h === "string") return h;
  const q = Object.entries(h.query ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
  return (h.pathname ?? "") + (q ? `?${q}` : "");
}

function isExternal(url: string) {
  return /^(https?:)?\/\//i.test(url) || /^(mailto|tel|whatsapp|sms):/i.test(url);
}

/** Links internos usam navegação client-side (SPA): a página não recarrega por
 *  completo, por isso a música de fundo continua e o site responde mais rápido.
 *  Links externos continuam a abrir no browser/app como antes. */
const Link = forwardRef<HTMLAnchorElement, Props>(function Link({ href, prefetch: _p, replace: _r, scroll: _s, ...rest }, ref) {
  void _p; void _r; void _s;
  const url = toUrl(href);
  if (isExternal(url)) return <a ref={ref} href={url} {...rest} />;
  return <NextLink ref={ref} href={url} prefetch={false} {...rest} />;
});

export default Link;
