"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingCart, Store, User } from "lucide-react";
import { useCart } from "@/lib/cart/cart";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Início", icon: Home },
  { href: "/categorias", label: "Categorias", icon: LayoutGrid },
  { href: "/lojas", label: "Lojas", icon: Store },
  { href: "/carrinho", label: "Carrinho", icon: ShoppingCart },
  { href: "/conta", label: "Conta", icon: User },
];

export function BottomNav() {
  const path = usePathname();
  const { count } = useCart();
  return (
    <nav className="glass pb-safe fixed inset-x-2 bottom-2 z-40 rounded-[1.75rem] px-1 pt-1.5 md:hidden">
      <ul className="grid grid-cols-5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} className={cn("relative flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10.5px] font-medium transition", active ? "text-brand-600" : "text-ink/55")}>
                <span className={cn("grid h-8 w-12 place-items-center rounded-full transition", active && "bg-brand-100/80")}>
                  <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.4 : 1.9} />
                </span>
                {label}
                {href === "/carrinho" && count > 0 && (
                  <span className="brand-gradient absolute right-3 top-0 min-w-[18px] rounded-full px-1 text-center text-[10px] font-bold leading-[18px] text-white">{count}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
