"use client";

import Link from "@/components/ui/native-link";
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
    <nav className="glass pb-safe fixed inset-x-0 bottom-3 z-40 mx-auto w-fit rounded-full p-1.5 md:hidden">
      <ul className="flex items-center gap-1.5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} aria-label={label} title={label} className={cn("relative grid h-12 w-12 place-items-center rounded-full transition active:scale-90", active ? "bg-ink text-white shadow-lg shadow-ink/25" : "bg-ink/[0.05] text-ink/60")}>
                <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.3 : 1.9} />
                {href === "/carrinho" && count > 0 && (
                  <span className="promo-gradient absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full px-1 text-center text-[10px] font-bold leading-[18px] text-white ring-2 ring-white">{count}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
