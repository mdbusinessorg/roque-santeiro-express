"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, X, Camera } from "lucide-react";
import { supabaseBrowser, uploadMedia } from "@/lib/supabase/client";
import { isNative, takePhoto } from "@/lib/native";
import { rpcError } from "@/lib/rpc-error";
import { slugify } from "@/lib/utils";
import type { Category } from "@/lib/types";
import { useMyStore } from "@/components/seller/use-my-store";
import { StoreGate } from "@/components/seller/store-gate";

export default function ProductForm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = id === "novo";
  const router = useRouter();
  const { store } = useMyStore("/vendedor/produtos");
  const [cats, setCats] = useState<Category[]>([]);
  const [f, setF] = useState({ name: "", brand: "", sku: "", price: "", compare_at_price: "", stock: "1", category_id: "", description: "", status: "active", specs: "", shipping_fee: "", delivery_time: "", video_url: "", sponsored: false, featured: false });
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const sb = supabaseBrowser();
    sb.from("categories").select("*").order("sort").then(({ data }) => setCats((data as Category[]) ?? []));
    if (!isNew) sb.from("products").select("*").eq("id", id).maybeSingle().then(({ data: p }) => {
      if (!p) return;
      setF({ name: p.name, brand: p.brand ?? "", sku: p.sku ?? "", price: String(p.price), compare_at_price: p.compare_at_price ? String(p.compare_at_price) : "", stock: String(p.stock),
        category_id: p.category_id ?? "", description: p.description ?? "", status: p.status, specs: Object.entries(p.specs ?? {}).map(([k, v]) => `${k}: ${v}`).join("\n"),
        shipping_fee: p.shipping_fee != null ? String(p.shipping_fee) : "", delivery_time: p.delivery_time ?? "", video_url: p.video_url ?? "", sponsored: !!p.sponsored, featured: !!p.featured });
      setImages(p.images ?? []);
    });
  }, [id, isNew]);

  async function addImages(files: FileList | null) {
    if (!files?.length) return;
    setUp(true); setErr(null);
    try { const urls = await Promise.all(Array.from(files).slice(0, 8).map((file) => uploadMedia(file, "produtos"))); setImages((x) => [...x, ...urls].slice(0, 8)); }
    catch (e) { setErr(rpcError(e as { message?: string })); }
    setUp(false);
  }

  async function addPhoto() {
    try { const f = await takePhoto(); if (!f) return; setUp(true); const url = await uploadMedia(f, "produtos"); setImages((x) => [...x, url].slice(0, 8)); }
    catch (e) { const m = (e as { message?: string }).message ?? ""; if (!/cancel/i.test(m)) setErr(rpcError(e as { message?: string })); }
    setUp(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!store) return;
    if (!images.length) { setErr("Adicione pelo menos uma fotografia."); return; }
    setBusy(true); setErr(null);
    const specs = Object.fromEntries(f.specs.split("\n").map((l) => l.split(":")).filter((x) => x.length >= 2 && x[0].trim()).map(([k, ...v]) => [k.trim(), v.join(":").trim()]));
    const row = {
      name: f.name.trim(), brand: f.brand.trim() || null, sku: f.sku.trim() || null, price: Number(f.price), stock: Math.max(0, Number(f.stock) || 0),
      compare_at_price: f.compare_at_price ? Number(f.compare_at_price) : null, category_id: f.category_id || null, description: f.description.trim(), status: f.status, specs, images,
      shipping_fee: f.shipping_fee ? Number(f.shipping_fee) : null, delivery_time: f.delivery_time.trim() || null, video_url: f.video_url.trim() || null, sponsored: f.sponsored, featured: f.featured,
    };
    const sb = supabaseBrowser();
    const { error } = isNew
      ? await sb.from("products").insert({ ...row, store_id: store.id, slug: `${slugify(f.name)}-${Math.random().toString(36).slice(2, 7)}` })
      : await sb.from("products").update(row).eq("id", id);
    setBusy(false);
    if (error) setErr(rpcError(error)); else router.push("/vendedor/produtos");
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="mx-auto max-w-2xl pt-5">
      <StoreGate store={store}>
        <form onSubmit={save} className="card space-y-3 p-5">
          <h1 className="text-xl font-extrabold">{isNew ? "Novo produto" : "Editar produto"}</h1>
          <div>
            <label className="label">Fotografias</label>
            <div className="flex flex-wrap gap-2">
              {images.map((src) => (
                <div key={src} className="relative h-20 w-20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full rounded-xl bg-mist object-contain" />
                  <button type="button" onClick={() => setImages(images.filter((x) => x !== src))} className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-neutral-950 text-white"><X className="h-3 w-3" /></button>
                </div>
              ))}
              <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-brand-200 text-brand-600">
                {up ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addImages(e.target.files)} />
              </label>
              {isNative() && images.length < 8 && (
                <button type="button" onClick={addPhoto} aria-label="Tirar fotografia" className="grid h-20 w-20 place-items-center rounded-xl border-2 border-dashed border-brand-200 text-brand-600"><Camera className="h-5 w-5" /></button>
              )}
            </div>
          </div>
          <div><label className="label">Nome</label><input required value={f.name} onChange={set("name")} className="input" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Preço (Kz)</label><input required inputMode="numeric" value={f.price} onChange={set("price")} className="input" /></div>
            <div><label className="label">Preço antes (opcional)</label><input inputMode="numeric" value={f.compare_at_price} onChange={set("compare_at_price")} className="input" /></div>
            <div><label className="label">Stock</label><input required inputMode="numeric" value={f.stock} onChange={set("stock")} className="input" /></div>
            <div><label className="label">Categoria</label><select required value={f.category_id} onChange={set("category_id")} className="input"><option value="">Escolher…</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="label">Marca</label><input value={f.brand} onChange={set("brand")} className="input" /></div>
            <div><label className="label">SKU</label><input value={f.sku} onChange={set("sku")} className="input" /></div>
          </div>
          <div><label className="label">Descrição</label><textarea value={f.description} onChange={set("description")} className="input min-h-24" /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="label">Frete (Kz, 0 = grátis)</label><input inputMode="numeric" placeholder="Ex.: 1000" value={f.shipping_fee} onChange={set("shipping_fee")} className="input" /></div><div><label className="label">Prazo de entrega</label><input placeholder="Ex.: 2 a 5 dias úteis" value={f.delivery_time} onChange={set("delivery_time")} className="input" /></div></div>
          <div><label className="label">Vídeo do produto (URL opcional)</label><input type="url" inputMode="url" placeholder="https://… (YouTube ou MP4)" value={f.video_url} onChange={set("video_url")} className="input" /></div>
          <div className="grid gap-2 sm:grid-cols-2"><label className="flex items-center gap-2 rounded-xl border border-brand-100 p-3 text-sm"><input type="checkbox" className="accent-brand-600" checked={f.sponsored} onChange={(e) => setF({ ...f, sponsored: e.target.checked })} />Promover este produto (aparece como Patrocinado)</label><label className="flex items-center gap-2 rounded-xl border border-brand-100 p-3 text-sm"><input type="checkbox" className="accent-brand-600" checked={f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} />Destacar na página inicial</label></div>
          <div><label className="label">Especificações (uma por linha, ex.: Cor: Azul)</label><textarea value={f.specs} onChange={set("specs")} className="input min-h-20" /></div>
          <div><label className="label">Estado</label><select value={f.status} onChange={set("status")} className="input"><option value="active">Activo (visível)</option><option value="inactive">Inactivo</option><option value="draft">Rascunho</option></select></div>
          {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
          <button disabled={busy || up} className="btn-primary h-12 w-full">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Guardar</button>
        </form>
      </StoreGate>
    </div>
  );
}
