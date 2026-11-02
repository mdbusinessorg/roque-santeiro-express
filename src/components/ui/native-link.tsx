import { forwardRef, type AnchorHTMLAttributes } from "react";

type Href = string | { pathname?: string; query?: Record<string, string | number | undefined> };
type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: Href; prefetch?: boolean | null; replace?: boolean; scroll?: boolean };

function toUrl(h: Href): string {
  if (typeof h === "string") return h;
  const q = Object.entries(h.query ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
  return (h.pathname ?? "") + (q ? `?${q}` : "");
}

/** Navegação real do browser (spinner nativo na aba), em vez de transições client-side. */
const Link = forwardRef<HTMLAnchorElement, Props>(function Link({ href, prefetch: _p, replace: _r, scroll: _s, ...rest }, ref) {
  void _p; void _r; void _s;
  return <a ref={ref} href={toUrl(href)} {...rest} />;
});

export default Link;
