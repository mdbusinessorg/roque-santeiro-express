"use client";

import { usePathname } from "next/navigation";
import { BarChart3, ExternalLink, LayoutGrid, LogOut, MessageSquare, Package, Settings, ShoppingBag, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const SIDE: [string, typeof LayoutGrid, string][][] = [
  [["/vendedor", LayoutGrid, "Resumo"], ["/vendedor/produtos", Package, "Produtos"], ["/vendedor/encomendas", ShoppingBag, "Encomendas"], ["/vendedor/carteira", Wallet, "Carteira"]],
  [["/vendedor/avaliacoes", MessageSquare, "Avaliações"], ["/vendedor#estatisticas", BarChart3, "Estatísticas"]],
];
const TOP: [string, string][] = [["/vendedor", "Dashboard"], ["/vendedor/produtos", "Produtos"], ["/vendedor/encomendas", "Encomendas"], ["/vendedor/carteira", "Carteira"], ["/vendedor/avaliacoes", "Avaliações"], ["/vendedor/loja", "Perfil da loja"]];

export function DashShell({ children, storeSlug }: { children: React.ReactNode; storeSlug?: string }) {
  const path = usePathname();
  const { signOut } = useAuth();
  return (
    <div className="-mx-3 rounded-none bg-[#f2f2f3] px-3 pb-6 pt-3 sm:mx-0 sm:mt-3 sm:rounded-[32px] sm:p-5">
      <div className="mb-4 flex items-center gap-2 rounded-full bg-white p-1.5 shadow-[0_1px_0_rgba(17,17,19,0.04)]">
        <nav className="no-scrollbar flex flex-1 gap-1 overflow-x-auto rounded-full bg-[#f2f2f3] p-1">
          {TOP.map(([h, l]) => (
            <a key={h} href={h} className={cn("shrink-0 rounded-full px-3.5 py-2 text-[13px] font-medium transition", path === h ? "bg-white font-semibold text-ink shadow-sm" : "text-ink/60 hover:text-ink")}>{l}</a>
          ))}
        </nav>
        {storeSlug && <a href={`/loja/${storeSlug}`} aria-label="Ver loja" className="hidden h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f2f2f3] text-ink/70 sm:grid"><ExternalLink className="h-4 w-4" /></a>}
      </div>
      <div className="flex gap-4">
        <aside className="hidden w-14 shrink-0 flex-col gap-3 lg:flex">
          {SIDE.map((group, gi) => (
            <div key={gi} className="flex flex-col items-center gap-2 rounded-full bg-white p-1.5">
              {group.map(([h, I, l]) => {
                const on = path === h;
                return <a key={h} href={h} title={l} aria-label={l} className={cn("grid h-11 w-11 place-items-center rounded-full transition", on ? "bg-ink text-gold" : "text-ink/55 hover:bg-[#f2f2f3]")}><I className="h-[18px] w-[18px]" /></a>;
              })}
            </div>
          ))}
          <div className="mt-auto flex flex-col items-center gap-2 rounded-full bg-white p-1.5">
            <a href="/vendedor/loja" title="Perfil da loja" className="grid h-11 w-11 place-items-center rounded-full text-ink/55 hover:bg-[#f2f2f3]"><Settings className="h-[18px] w-[18px]" /></a>
            <button onClick={() => signOut().then(() => { location.href = "/"; })} title="Sair" className="grid h-11 w-11 place-items-center rounded-full text-ink/55 hover:bg-[#f2f2f3]"><LogOut className="h-[18px] w-[18px]" /></button>
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

export function Panel({ title, subtitle, action, children, className }: { title?: React.ReactNode; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[28px] bg-white p-4 sm:p-5", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-start justify-between gap-2">
          <div><p className="text-[15px] font-semibold text-ink">{title}</p>{subtitle && <p className="text-xs text-ink/50">{subtitle}</p>}</div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function CornerLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} aria-label={label} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f2f2f3] text-ink/70 transition hover:bg-ink hover:text-white">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M8 7h9v9" /></svg>
    </a>
  );
}
