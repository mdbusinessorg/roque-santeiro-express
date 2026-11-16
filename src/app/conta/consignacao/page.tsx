"use client";

import { useEffect, useState } from "react";
import Link from "@/components/ui/native-link";
import { useRouter } from "next/navigation";
import { HandCoins, ImagePlus, Loader2, PackageCheck, X } from "lucide-react";
import { supabaseBrowser, uploadMedia } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth";
import { rpcError } from "@/lib/rpc-error";

type Item = { id: string; name: string; price: number; status: string; photos: string[]; created_at: string };

export default function ConsignacaoPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [f, setF] = useState({ name: "", description: "", price: "" });
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabaseBrowser().from("consignment_items").select("id,name,price,status,photos,created_at").order("created_at", { ascending: false }).limit(30)
      .then(({ data }) => setItems((data as Item[]) ?? []));
  }, [user]);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setUp(true); setErr(null);
    try {
      const urls = await Promise.all(Array.from(files).slice(0, 6).map((file) => uploadMedia(file, "consignacao")));
      setPhotos((x) => [...x, ...urls].slice(0, 6));
    } catch (e) { setErr(rpcError(e as { message?: string })); }
    setUp(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return router.push("/entrar?next=/conta/consignacao");
    if (!photos.length) { setErr("Adicione pelo menos uma fotografia do produto."); return; }
    setBusy(true); setErr(null); setOk(null);
    try {
      const { error } = await supabaseBrowser().from("consignment_items").insert({
        user_id: user.id, name: f.name.trim(), description: f.description.trim() || null, price: Number(f.price), photos,
      });
      if (error) throw error;
      setOk("Produto enviado! A equipe Roque Santeiro vai analisar e, se for aceite, passa a vender por si na secção AMARROS.");
      setF({ name: "", description: "", price: "" }); setPhotos([]);
      const { data } = await supabaseBrowser().from("consignment_items").select("id,name,price,status,photos,created_at").order("created_at", { ascending: false }).limit(30);
      setItems((data as Item[]) ?? []);
    } catch (e2) { setErr(rpcError(e2 as { message?: string })); }
    setBusy(false);
  }

  if (loading) return <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>;
  if (!user) return <div className="card mx-auto max-w-xl p-6 text-center"><h1 className="text-xl font-extrabold">AMARROS</h1><p className="mt-2 text-sm text-ink/65">Entregue o seu produto à Roque Santeiro sem criar loja. <Link href="/entrar?next=/conta/consignacao" className="font-semibold text-promo">Entrar</Link> para começar.</p></div>;

  const statusLabel: Record<string, string> = { pending: "Em análise", approved: "A vender em AMARROS", rejected: "Não aceite" };
  return (
    <div className="mx-auto max-w-2xl space-y-4 pt-5">
      <div className="card p-5">
        <h1 className="flex items-center gap-2 text-xl font-extrabold"><HandCoins className="h-6 w-6 text-promo" />Vender sem loja — AMARROS</h1>
        <p className="mt-2 text-sm text-ink/65">Tem um produto para vender mas não quer abrir loja? Entregue-o à Roque Santeiro: nós tratamos das fotos, da venda e da entrega. A equipe analisa cada pedido antes de publicar.</p>
      </div>

      <form onSubmit={submit} className="card space-y-3 p-5">
        <h2 className="font-bold">Anunciar o meu produto</h2>
        <div><label className="label">Nome do produto</label><input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="input" placeholder="Ex.: iPhone 12 128GB" /></div>
        <div><label className="label">Descrição</label><textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="input min-h-20" placeholder="Estado, cor, acessórios, motivo da venda…" /></div>
        <div><label className="label">Preço pretendido (Kz)</label><input required inputMode="numeric" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className="input" /></div>
        <div>
          <label className="label">Fotografias (até 6)</label>
          <div className="flex flex-wrap gap-2">
            {photos.map((src) => (
              <div key={src} className="relative h-20 w-20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full rounded-xl bg-mist object-contain" />
                <button type="button" onClick={() => setPhotos(photos.filter((x) => x !== src))} className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-neutral-950 text-white"><X className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            {photos.length < 6 && (
              <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-brand-200 text-brand-600">
                {up ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
              </label>
            )}
          </div>
        </div>
        {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        {ok && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{ok}</p>}
        <button disabled={busy || up} className="btn-primary h-12 w-full">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Entregar à Roque Santeiro</button>
      </form>

      {items.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-3 font-bold">Os meus anúncios</h2>
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.id} className="flex items-center gap-3 rounded-xl border border-brand-100 p-3 text-sm">
                {it.photos[0] && <img src={it.photos[0]} alt="" className="h-12 w-12 rounded-lg bg-mist object-contain" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{it.name}</p>
                  <p className="text-xs text-ink/55">{new Date(it.created_at).toLocaleDateString("pt-PT")}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${it.status === "approved" ? "bg-emerald-100 text-emerald-800" : it.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>{statusLabel[it.status] ?? it.status}</span>
                {it.status === "approved" && <PackageCheck className="h-4 w-4 text-emerald-600" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
