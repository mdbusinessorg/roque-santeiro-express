"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

const KEY = "rse_ref";
const DAYS = 30;

function visitorId() {
  let v = localStorage.getItem("rse_vid");
  if (!v) { v = crypto.randomUUID().replace(/-/g, ""); localStorage.setItem("rse_vid", v); }
  return v;
}

export function getRef(): string | null {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) || "null") as { code: string; ts: number } | null;
    return r && Date.now() - r.ts < DAYS * 864e5 ? r.code : null;
  } catch { return null; }
}

export async function attributeOrder(orderId: string) {
  const code = getRef();
  if (!code) return;
  await supabaseBrowser().rpc("attribute_order", { p_order: orderId, p_code: code });
}

export function RefCapture() {
  useEffect(() => {
    const code = new URLSearchParams(location.search).get("ref")?.trim().toUpperCase();
    if (!code || !/^[A-Z0-9]{4,16}$/.test(code)) return;
    supabaseBrowser().rpc("track_ref", { p_code: code, p_visitor: visitorId(), p_path: location.pathname }).then(({ data }) => {
      if (data === true && !getRef()) localStorage.setItem(KEY, JSON.stringify({ code, ts: Date.now() }));
    });
  }, []);
  return null;
}
