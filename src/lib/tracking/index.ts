"use client";

import { supabaseBrowser } from "@/lib/supabase/client";

export type MetaEvent = "PageView" | "ViewContent" | "Search" | "AddToCart" | "InitiateCheckout" | "AddPaymentInfo" | "Purchase" | "CompleteRegistration" | "Lead" | "AddToWishlist";
export type Consent = { analytics: boolean; marketing: boolean; version: string; at: string };
type Interaction = { kind: "view" | "click" | "cart" | "wishlist" | "search" | "rec_impression" | "rec_click"; product_id?: string; category_id?: string | null; query?: string; context?: string };
type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };

export const CONSENT_VERSION = "2026-11";
const CONSENT_KEY = "rse_consent";
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function anonId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("rse_anon");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("rse_anon", id); }
  return id;
}

export function getConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try { const c = JSON.parse(localStorage.getItem(CONSENT_KEY) || "null") as Consent | null; return c?.version === CONSENT_VERSION ? c : null; } catch { return null; }
}

export async function saveConsent(analytics: boolean, marketing: boolean) {
  const c: Consent = { analytics, marketing, version: CONSENT_VERSION, at: new Date().toISOString() };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(c));
  window.dispatchEvent(new Event("rse-consent"));
  await supabaseBrowser().rpc("save_consent", { p_anon: anonId(), p_analytics: analytics, p_marketing: marketing, p_version: CONSENT_VERSION, p_ua: navigator.userAgent });
  if (marketing) loadPixel();
}

export function pixelConfigured() { return Boolean(PIXEL_ID); }

export function loadPixel() {
  if (!PIXEL_ID || typeof window === "undefined" || !getConsent()?.marketing) return;
  const w = window as unknown as { fbq?: Fbq; _fbq?: Fbq };
  if (w.fbq) return;
  const f: Fbq = function (...args: unknown[]) { if (f.callMethod) f.callMethod(...args); else f.queue!.push(args); } as Fbq;
  f.push = f; f.loaded = true; f.version = "2.0"; f.queue = [];
  w.fbq = f; w._fbq = f;
  const s = document.createElement("script"); s.async = true; s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  f("init", PIXEL_ID);
}

const sent = new Set<string>();

export function track(name: MetaEvent, data: Record<string, unknown> = {}, eventId?: string) {
  if (typeof window === "undefined") return;
  const id = eventId ?? `${name}_${crypto.randomUUID()}`;
  if (sent.has(id)) return;
  sent.add(id);
  const consent = getConsent();
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  let status: "logged" | "sent" | "skipped" = "skipped";
  if (consent?.marketing && PIXEL_ID && fbq) { fbq("track", name, data, { eventID: id }); status = "sent"; }
  if (!consent?.analytics && !consent?.marketing) return;
  void supabaseBrowser().rpc("log_marketing_event", {
    p_event_id: id, p_name: name, p_source: "browser", p_status: status, p_error: PIXEL_ID ? null : "Pixel ID não configurado",
    p_anon: anonId(), p_value: typeof data.value === "number" ? data.value : null, p_currency: (data.currency as string) ?? null, p_payload: { ...data, path: location.pathname },
  });
}

let queue: Interaction[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
export function interact(e: Interaction) {
  if (typeof window === "undefined") return;
  queue.push(e);
  if (timer) return;
  timer = setTimeout(() => {
    const batch = queue.slice(0, 20); queue = []; timer = null;
    void supabaseBrowser().rpc("log_interactions", { p_anon: anonId(), p_events: batch });
  }, 1200);
}

export async function sendServerPurchase(orderId: string) {
  const { data } = await supabaseBrowser().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return;
  await fetch("/api/meta-capi", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ order_id: orderId, anon_id: anonId() }) }).catch(() => {});
}
