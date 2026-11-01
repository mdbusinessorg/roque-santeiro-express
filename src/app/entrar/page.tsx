"use client";

import { track } from "@/lib/tracking";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth";
import { BlurReveal } from "@/components/effects/blur-reveal";

function AuthForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/conta";
  const { refresh } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const sb = supabaseBrowser();
    const email = form.email.trim().toLowerCase();
    const res = mode === "login"
      ? await sb.auth.signInWithPassword({ email, password: form.password })
      : await sb.auth.signUp({ email, password: form.password, options: { data: { full_name: form.name.trim(), phone: form.phone.trim() } } });
    setBusy(false);
    if (res.error) {
      setMsg(res.error.message.includes("Invalid login") ? "Email ou palavra-passe errados." : res.error.message.includes("already registered") ? "Este email já tem conta. Entre." : res.error.message);
      return;
    }
    if (!res.data.session) { setMsg("Conta criada. Verifique o seu email para confirmar."); return; }
    if (mode !== "login") track("CompleteRegistration", { status: true });
    await refresh();
    router.replace(next);
  }

  return (
    <div className="mx-auto max-w-md pt-8">
      <div className="card p-6">
        <h1 className="text-2xl font-extrabold tracking-tight"><BlurReveal key={mode}>{mode === "login" ? "Entrar na sua conta" : "Criar conta grátis"}</BlurReveal></h1>
        <p className="mt-1 text-sm text-ink/60">Compre de todas as lojas do Roque Santeiro Express.</p>
        <div className="glass mt-5 grid grid-cols-2 rounded-full p-1 text-sm font-semibold">
          {(["login", "signup"] as const).map((m) => (
            <button key={m} type="button" onClick={() => { setMode(m); setMsg(null); }} className={`rounded-full py-2 transition ${mode === m ? "brand-gradient text-white shadow" : "text-brand-900"}`}>{m === "login" ? "Entrar" : "Registar"}</button>
          ))}
        </div>
        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === "signup" && (
            <>
              <div><label className="label">Nome completo</label><input required value={form.name} onChange={set("name")} className="input" autoComplete="name" /></div>
              <div><label className="label">Telefone</label><input required value={form.phone} onChange={set("phone")} className="input" inputMode="tel" placeholder="9XX XXX XXX" autoComplete="tel" /></div>
            </>
          )}
          <div><label className="label">Email</label><input required type="email" value={form.email} onChange={set("email")} className="input" autoComplete="email" /></div>
          <div><label className="label">Palavra-passe</label><input required type="password" minLength={6} value={form.password} onChange={set("password")} className="input" autoComplete={mode === "login" ? "current-password" : "new-password"} /></div>
          {msg && <p className="rounded-2xl bg-brand-50 p-3 text-sm text-brand-900">{msg}</p>}
          <button disabled={busy} className="btn-primary h-12 w-full">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{mode === "login" ? "Entrar" : "Criar conta"}</button>
        </form>
        <p className="mt-4 text-center text-xs text-ink/50">Ao continuar aceita os termos e a política de privacidade. <Link href="/vender" className="font-semibold text-brand-600">Quer vender?</Link></p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><AuthForm /></Suspense>;
}
