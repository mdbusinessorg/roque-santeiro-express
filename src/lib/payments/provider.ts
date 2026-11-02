import { createHmac, timingSafeEqual } from "node:crypto";

export type Capabilities = { hostedCheckout: boolean; webhooks: boolean; refunds: boolean; splitPayments: boolean; payouts: boolean };
export type CheckoutOrder = { id: string; number: number; total: number; method: string };
export type CheckoutResult = { kind: "instructions"; reference: string } | { kind: "redirect"; url: string; providerRef: string };
export type WebhookEvent = { orderId: string; amount: number; providerRef: string; status: "succeeded" | "failed" | "pending" };

export interface PaymentProvider {
  id: string;
  capabilities: Capabilities;
  createCheckout(order: CheckoutOrder, idempotencyKey: string): Promise<CheckoutResult>;
  verifyWebhook(rawBody: string, headers: Headers): boolean;
  parseWebhook(rawBody: string): WebhookEvent;
}

export async function fetchWithTimeout(url: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 15000);
  try { return await fetch(url, { ...init, signal: ctrl.signal }); } finally { clearTimeout(t); }
}

export function verifyHmac(rawBody: string, headers: Headers, secret: string, toleranceSec = 300) {
  const sig = headers.get("x-rse-signature") ?? "";
  const ts = Number(headers.get("x-rse-timestamp") ?? 0);
  if (!secret || !sig || !ts || Math.abs(Date.now() / 1000 - ts) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(sig.replace(/^sha256=/, ""));
  return a.length === b.length && timingSafeEqual(a, b);
}

const manual: PaymentProvider = {
  id: "manual",
  capabilities: { hostedCheckout: false, webhooks: false, refunds: false, splitPayments: false, payouts: false },
  async createCheckout(order) { return { kind: "instructions", reference: `RSE${order.number}` }; },
  verifyWebhook() { return false; },
  parseWebhook() { throw new Error("O pagamento manual é confirmado pelo admin"); },
};

function hmacGateway(): PaymentProvider | null {
  const id = process.env.PAYMENT_GATEWAY_ID, secret = process.env.PAYMENT_WEBHOOK_SECRET, api = process.env.PAYMENT_GATEWAY_API_URL;
  if (!id || !secret || !api) return null;
  return {
    id,
    capabilities: {
      hostedCheckout: true, webhooks: true, refunds: process.env.PAYMENT_GATEWAY_REFUNDS === "1",
      splitPayments: process.env.PAYMENT_GATEWAY_SPLIT === "1", payouts: process.env.PAYMENT_GATEWAY_PAYOUTS === "1",
    },
    async createCheckout(order, idempotencyKey) {
      const res = await fetchWithTimeout(`${api}/checkout`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${process.env.PAYMENT_GATEWAY_API_KEY ?? ""}`, "idempotency-key": idempotencyKey },
        body: JSON.stringify({ reference: order.id, amount: order.total, currency: "AOA", description: `Encomenda RSE${order.number}` }),
      });
      if (!res.ok) throw new Error(`Gateway respondeu ${res.status}`);
      const j = await res.json();
      return { kind: "redirect", url: String(j.url), providerRef: String(j.id) };
    },
    verifyWebhook: (raw, h) => verifyHmac(raw, h, secret),
    parseWebhook(raw) {
      const j = JSON.parse(raw);
      return { orderId: String(j.reference), amount: Number(j.amount), providerRef: String(j.id), status: j.status === "succeeded" ? "succeeded" : j.status === "failed" ? "failed" : "pending" };
    },
  };
}

export function getProvider(id?: string): PaymentProvider {
  const gw = hmacGateway();
  if (gw && (!id || id === gw.id)) return gw;
  return manual;
}
