"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [["/vendedor", "Resumo"], ["/vendedor/produtos", "Produtos"], ["/vendedor/encomendas", "Encomendas"], ["/vendedor/avaliacoes", "Avaliações"], ["/vendedor/loja", "Perfil da loja"]];

export function SellerNav() {
  const path = usePathname();
  return (
    <div className="no-scrollbar -mx-3 mb-4 flex gap-2 overflow-x-auto px-3">
      {tabs.map(([h, l]) => (
        <Link key={h} href={h} className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold", path === h ? "brand-gradient text-white" : "glass text-brand-900")}>{l}</Link>
      ))}
    </div>
  );
}
