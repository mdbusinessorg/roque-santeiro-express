"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Cookie } from "lucide-react";
import { getConsent, loadPixel, saveConsent, track } from "@/lib/tracking";

export function Tracker() {
  const path = usePathname();
  const [ask, setAsk] = useState(false);
  const [more, setMore] = useState(false);
  const [mk, setMk] = useState(true);
  const [an, setAn] = useState(true);

  useEffect(() => { if (!getConsent()) setAsk(true); else loadPixel(); }, []);
  useEffect(() => { const t = setTimeout(() => track("PageView", {}, `PageView_${path}_${Date.now()}`), 300); return () => clearTimeout(t); }, [path]);

  async function choose(a: boolean, m: boolean) { setAsk(false); await saveConsent(a, m); track("PageView"); }

  return (
    <AnimatePresence>
      {ask && (
        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", damping: 26, stiffness: 260 }}
          className="glass fixed inset-x-3 bottom-24 z-50 mx-auto max-w-lg rounded-3xl p-4 md:bottom-5" role="dialog" aria-label="Privacidade e cookies">
          <p className="flex items-center gap-2 text-sm font-bold"><Cookie className="h-4 w-4 text-brand-600" />Privacidade e cookies</p>
          <p className="mt-1 text-[13px] text-ink/70">Usamos cookies essenciais para o carrinho e a sessão. Com a sua autorização, usamos também medição (estatísticas e recomendações) e marketing (Meta Pixel) para melhorar a loja e as campanhas.</p>
          {more && (
            <div className="mt-3 space-y-2 text-[13px]">
              <label className="flex items-center justify-between gap-3"><span>Medição e recomendações</span><input type="checkbox" checked={an} onChange={(e) => setAn(e.target.checked)} className="h-4 w-4 accent-[#e60023]" /></label>
              <label className="flex items-center justify-between gap-3"><span>Marketing (Meta Pixel)</span><input type="checkbox" checked={mk} onChange={(e) => setMk(e.target.checked)} className="h-4 w-4 accent-[#e60023]" /></label>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => choose(true, true)} className="btn-primary flex-1 py-2.5">Aceitar</button>
            <button onClick={() => choose(false, false)} className="btn flex-1 border border-line bg-white py-2.5 text-ink">Só essenciais</button>
            {more ? <button onClick={() => choose(an, mk)} className="btn w-full py-2 text-brand-600">Guardar escolha</button>
              : <button onClick={() => setMore(true)} className="btn w-full py-2 text-ink/60">Personalizar</button>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
