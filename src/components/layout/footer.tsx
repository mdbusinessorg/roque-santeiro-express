import Link from "@/components/ui/native-link";
import { Signature } from "@/components/effects/signature";

const cols = [
  { t: "Comprar", l: [["Todas as categorias", "/categorias"], ["Ofertas relâmpago", "/pesquisa?ofertas=1"], ["Lojas", "/lojas"], ["Novidades", "/pesquisa?ordem=novos"]] },
  { t: "Vender", l: [["Tornar-se vendedor", "/vender"], ["Painel do vendedor", "/vendedor"], ["Comissões", "/vender#comissoes"]] },
  { t: "A minha conta", l: [["Entrar", "/entrar"], ["Encomendas", "/conta/encomendas"], ["Favoritos", "/conta/favoritos"], ["Carrinho", "/carrinho"]] },
];

export function Footer() {
  return (
    <footer className="mt-10 bg-ink pb-28 text-white md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xl font-extrabold tracking-tight">Roque Santeiro <span className="text-[#ff7a7e]">Express</span></p>
          <p className="mt-2 text-sm text-white/75">O grande mercado digital de Angola. Milhares de produtos, centenas de lojas, uma só compra.</p>
          <Signature text="Roque Santeiro" color="#ffffff" fontSize={26} className="mt-3 opacity-90" />
        </div>
        {cols.map((c) => (
          <div key={c.t}>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">{c.t}</p>
            <ul className="space-y-2 text-sm text-white/80">
              {c.l.map(([label, href]) => <li key={href}><Link href={href} className="hover:text-white">{label}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/15 py-4 text-center text-xs text-white/60">© {new Date().getFullYear()} Roque Santeiro Express · Luanda, Angola</div>
    </footer>
  );
}
