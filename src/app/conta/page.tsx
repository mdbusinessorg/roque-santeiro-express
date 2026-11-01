"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Heart, LayoutDashboard, LogOut, Package, Shield, Store } from "lucide-react";
import { useAuth, isStaff } from "@/lib/auth";

export default function AccountPage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && !user) router.replace("/entrar?next=/conta"); }, [loading, user, router]);
  if (loading || !user) return <div className="skeleton mt-6 h-60" />;
  const links = [
    { href: "/conta/encomendas", icon: Package, l: "As minhas encomendas" },
    { href: "/conta/favoritos", icon: Heart, l: "Favoritos" },
    { href: "/vendedor", icon: LayoutDashboard, l: "Painel do vendedor" },
    { href: "/vender", icon: Store, l: "Abrir uma loja" },
    ...(isStaff(profile?.role) ? [{ href: "/admin", icon: Shield, l: "Administração" }] : []),
  ];
  return (
    <div className="mx-auto max-w-lg pt-5">
      <div className="brand-gradient rounded-[2rem] p-5 text-white">
        <p className="text-sm text-white/70">Olá,</p>
        <p className="text-2xl font-extrabold">{profile?.full_name || user.email}</p>
        <p className="mt-1 text-sm text-white/80">{user.email}{profile?.phone ? ` · ${profile.phone}` : ""}</p>
      </div>
      <div className="card mt-4 divide-y divide-brand-100">
        {links.map(({ href, icon: I, l }) => (
          <Link key={href} href={href} className="flex items-center gap-3 p-4 text-[15px] font-medium active:bg-brand-50">
            <I className="h-5 w-5 text-brand-600" /><span className="flex-1">{l}</span><ChevronRight className="h-4 w-4 text-ink/30" />
          </Link>
        ))}
        <button onClick={async () => { await signOut(); router.replace("/"); }} className="flex w-full items-center gap-3 p-4 text-[15px] font-medium text-red-600"><LogOut className="h-5 w-5" />Terminar sessão</button>
      </div>
    </div>
  );
}
