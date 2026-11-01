# REFERENCE_MAP — Roque Santeiro Express

Identidade: azul com gradientes + vidro estilo iOS (`glass`, `brand-gradient` em `src/app/globals.css`). Mobile primeiro (barra inferior, header fixo com pesquisa).

| Referência | Origem | Página | Componente | Interacções | Fonte de dados | Estado | Testes | Diferenças restantes |
|---|---|---|---|---|---|---|---|---|
| Header com pesquisa + barra de categorias | Amazon | todas | `components/layout/header.tsx` | autocomplete, links de categoria | `products` (Supabase) | feito | build | sem selector de idioma |
| Cartões 2×2 por secção | Amazon | `/` | `QuadCards` em `home-blocks.tsx` | links para produto/categoria | `products` | feito | build | — |
| Faixa de ofertas com desconto | AliExpress | `/` | secção "Ofertas relâmpago" | scroll horizontal | `products.compare_at_price` | feito | build | sem contador de tempo |
| Ícones de categorias | AliExpress | `/`, `/categorias` | `CategoryStrip` | scroll | `categories` | feito | build | subcategorias ainda não usadas |
| Página de produto | Amazon | `/produto/[slug]` | galeria, buy box, vendedor | carrinho, favorito, WhatsApp | `products`, `stores`, `reviews` | feito | build | variantes |
| Loja pública | AliExpress store | `/loja/[slug]` | banner, avatar, filtros, QR | contacto, categorias | `stores`, `products` | feito | build | avaliações de loja |
| Carrinho multi-loja | Amazon | `/carrinho` | agrupado por loja | quantidades | localStorage | feito | build | — |
| Checkout multi-vendedor | Amazon | `/checkout` | entrega por loja | RPC `place_order` | Supabase | feito | build | cupões |
| Efeitos (Marquee, LogosCarousel, BlurReveal, SpecialText, HighlightedText, WordsStagger, SlideUpText, Signature, FlowButton, AnimatedGradient, QRCode) | spell-ui (enviado) | home, lojas, vender, encomenda, footer | `components/effects/*` | animação | — | feito | build | — |
