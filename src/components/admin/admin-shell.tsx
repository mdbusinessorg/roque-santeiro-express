"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, isStaff } from "@/lib/auth";
import { cn } from "@/lib/utils";

const tabs = [["/admin", "Vendedores"], ["/admin/pagamentos", "Pagamentos e encomendas"], ["/admin/avaliacoes", "Avaliações"], ["/admin/tracking", "Tracking"], ["/admin/config", "Configuração"]];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => { if (!loading && !user) router.replace(`/entrar?next=${path}`); }, [loading, user, router, path]);
  if (loading || !user) return <div className="skeleton mt-6 h-60" />;
  if (!isStaff(profile?.role)) return <div className="card mx-auto mt-8 max-w-md p-8 text-center text-sm">Sem permissão. Esta área é só para a equipa do Roque Santeiro Express.</div>;
  return (
    <div className="pt-5">
      <h1 className="mb-3 px-1 text-2xl font-extrabold tracking-tight">Administração</h1>
      <div className="no-scrollbar -mx-3 mb-4 flex gap-2 overflow-x-auto px-3">
        {tabs.map(([h, l]) => <Link key={h} href={h} className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold", path === h ? "brand-gradient text-white" : "glass text-brand-900")}>{l}</Link>)}
      </div>
      {children}
    </div>
  );
}
