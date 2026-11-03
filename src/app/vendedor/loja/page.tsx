"use client";

import { useEffect, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { supabaseBrowser, uploadMedia } from "@/lib/supabase/client";
import { rpcError } from "@/lib/rpc-error";
import { DELIVERY, PROVINCES } from "@/lib/utils";
import { useMyStore } from "@/components/seller/use-my-store";
import { SellerNav } from "@/components/seller/seller-nav";
import { StoreGate } from "@/components/seller/store-gate";

export default function StoreProfile() {
  const { store, reload } = useMyStore("/vendedor/loja");
  const [f, setF] = useState({ name: "", description: "", phone: "", whatsapp: "", email: "", province: "Luanda", city: "", address: "", website: "" });
  const [methods, setMethods] = useState<string[]>([]);
  const [logo, setLogo] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!store) return;
    setF({ name: store.name, description: store.description ?? "", phone: store.phone ?? "", whatsapp: store.whatsapp ?? "", email: store.email ?? "", province: store.province ?? "Luanda", city: store.city ?? "", address: store.address ?? "", website: (store as { website?: string | null }).website ?? "" });
    setMethods(store.delivery_methods);
  }, [store]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!store) return;
    setBusy(true); setMsg(null);
    try {
      const [logo_url, banner_url] = await Promise.all([logo ? uploadMedia(logo, "lojas") : store.logo_url, banner ? uploadMedia(banner, "lojas") : store.banner_url]);
      const { error } = await supabaseBrowser().from("stores").update({ ...f, website: f.website.trim() || null, logo_url, banner_url, delivery_methods: methods.length ? methods : ["seller"] }).eq("id", store.id);
      if (error) throw error;
      setMsg("Perfil guardado."); reload();
    } catch (err) { setMsg(rpcError(err as { message?: string })); }
    setBusy(false);
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="pt-5">
      <StoreGate store={store}>
        <SellerNav />
        <form onSubmit={save} className="card mx-auto max-w-2xl space-y-3 p-5">
          <h1 className="text-xl font-extrabold">Perfil da loja</h1>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="label">Nome</label><input required value={f.name} onChange={set("name")} className="input" /></div>
            <div><label className="label">Telefone</label><input value={f.phone} onChange={set("phone")} className="input" /></div>
            <div><label className="label">WhatsApp</label><input value={f.whatsapp} onChange={set("whatsapp")} className="input" /></div>
            <div><label className="label">Email</label><input type="email" value={f.email} onChange={set("email")} className="input" /></div>
            <div><label className="label">Província</label><select value={f.province} onChange={set("province")} className="input">{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></div>
            <div><label className="label">Município</label><input value={f.city} onChange={set("city")} className="input" /></div>
            <div><label className="label">Endereço</label><input value={f.address} onChange={set("address")} className="input" /></div>
          </div>
          <div><label className="label">Descrição</label><textarea value={f.description} onChange={set("description")} className="input min-h-24" /></div>
          <div><label className="label">Site oficial (opcional)</label><input type="url" inputMode="url" placeholder="https://www.minhaloja.ao" value={f.website} onChange={set("website")} className="input" /></div>
          <div>
            <label className="label">Métodos de entrega</label>
            {Object.entries(DELIVERY).map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 py-1 text-sm"><input type="checkbox" className="accent-brand-600" checked={methods.includes(k)} onChange={(e) => setMethods(e.target.checked ? [...methods, k] : methods.filter((m) => m !== k))} />{l}</label>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="btn-ghost cursor-pointer"><Upload className="h-4 w-4" />{logo ? logo.name : "Alterar logo"}<input type="file" accept="image/*" className="hidden" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} /></label>
            <label className="btn-ghost cursor-pointer"><Upload className="h-4 w-4" />{banner ? banner.name : "Alterar banner"}<input type="file" accept="image/*" className="hidden" onChange={(e) => setBanner(e.target.files?.[0] ?? null)} /></label>
          </div>
          {msg && <p className="rounded-xl bg-brand-50 p-3 text-sm">{msg}</p>}
          <button disabled={busy} className="btn-primary h-12 w-full">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Guardar</button>
        </form>
      </StoreGate>
    </div>
  );
}
