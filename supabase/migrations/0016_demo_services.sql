-- Lojas de demonstração para os tipos de serviço (comida, farmácia, supermercado).
-- Ficam marcadas com is_demo para o cliente ver que são demonstração; sem avaliações nem vendas inventadas.
alter table public.stores add column if not exists is_demo boolean not null default false;

insert into public.categories (slug, name, image_url, sort) values
  ('comida', 'Comida', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&h=400&q=70', 10),
  ('supermercado', 'Supermercado', 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=400&h=400&q=70', 11),
  ('farmacia', 'Farmácia', 'https://images.unsplash.com/photo-1584634731339-252c581abfc5?auto=format&fit=crop&w=400&h=400&q=70', 12)
on conflict (slug) do nothing;

insert into public.stores (slug, name, description, banner_url, province, city, status, is_official, delivery_methods, store_type, is_demo) values
  ('sabores-da-ilha', 'Sabores da Ilha', 'Grelhados e pratos de peixe e marisco, feitos na hora. Loja de demonstração.', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1400&h=600&q=70', 'Luanda', 'Ilha de Luanda', 'approved', false, '{rse,pickup}', 'comida', true),
  ('burger-kandengue', 'Burger Kandengue', 'Hambúrgueres, frango frito e batidos. Loja de demonstração.', 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1400&h=600&q=70', 'Luanda', 'Talatona', 'approved', false, '{rse,pickup}', 'comida', true),
  ('pizzaria-marginal', 'Pizzaria Marginal', 'Pizzas, saladas e sobremesas. Loja de demonstração.', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1400&h=600&q=70', 'Luanda', 'Ingombota', 'approved', false, '{rse,pickup}', 'comida', true),
  ('mercado-da-banda', 'Mercado da Banda', 'Mercearia, fruta e legumes para a semana. Loja de demonstração.', 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&h=600&q=70', 'Luanda', 'Maianga', 'approved', false, '{rse,pickup}', 'supermercado', true),
  ('farmacia-bem-estar', 'Farmácia Bem-Estar', 'Higiene, protecção e suplementos. Loja de demonstração.', 'https://images.unsplash.com/photo-1584634731339-252c581abfc5?auto=format&fit=crop&w=1400&h=600&q=70', 'Luanda', 'Kilamba', 'approved', false, '{rse,pickup}', 'farmacia', true)
on conflict (slug) do nothing;

insert into public.products (store_id, category_id, slug, name, description, price, compare_at_price, stock, images, status, featured)
select s.id, c.id, v.slug, v.name, v.descr, v.price, v.cmp, 40,
       array['https://images.unsplash.com/photo-' || v.img || '?auto=format&fit=crop&w=900&h=900&q=75'], 'active', v.feat
from (values
  ('sabores-da-ilha','comida','demo-grelhada-mista','Grelhada mista','Espetadas de carne e frango na brasa, com batata e legumes grelhados. Serve duas pessoas.',9500,null,'1555939594-58d7cb561ad1',true),
  ('sabores-da-ilha','comida','demo-frango-assado','Frango assado inteiro','Frango inteiro assado no forno com ervas.',6500,null,'1598103442097-8b74394b95c6',false),
  ('sabores-da-ilha','comida','demo-entrecosto-grelhado','Entrecosto grelhado','Entrecosto na brasa com molho da casa e tomate fresco.',8000,9000,'1544025162-d76694265947',true),
  ('sabores-da-ilha','comida','demo-bife-batata-frita','Bife com batata frita','Bife grelhado fatiado com batata frita caseira.',7500,null,'1600891964092-4316c288032e',false),
  ('sabores-da-ilha','comida','demo-caldeirada-camarao','Caldeirada de camarão','Camarão em molho apurado, servido com arroz branco.',9000,null,'1559847844-5315695dadae',false),
  ('burger-kandengue','comida','demo-hamburguer-duplo','Hambúrguer duplo com queijo','Dois hambúrgueres de vaca, queijo, alface, tomate e molho da casa.',4500,null,'1568901346375-23c9450c58cd',true),
  ('burger-kandengue','comida','demo-hamburguer-classico','Hambúrguer clássico','Hambúrguer de vaca com queijo, alface e tomate em pão com sésamo.',3500,4000,'1571091718767-18b5b1457add',false),
  ('burger-kandengue','comida','demo-frango-frito','Frango frito crocante (4 un.)','Quatro peças de frango panado e frito.',4000,null,'1626082927389-6cd097cdc6ec',true),
  ('burger-kandengue','comida','demo-tiras-frango','Tiras de frango panadas','Tiras de peito de frango panadas com molho à parte.',3800,null,'1562967914-608f82629710',false),
  ('burger-kandengue','comida','demo-batido-chocolate','Batido de chocolate e bolacha','Batido cremoso de chocolate com bolacha.',2500,null,'1572490122747-3968b75cc699',true),
  ('pizzaria-marginal','comida','demo-pizza-frango','Pizza de frango','Pizza média com frango, cebola e coentros.',6000,null,'1565299624946-b28f40a0ae38',true),
  ('pizzaria-marginal','comida','demo-pizza-margherita','Pizza margherita','Pizza média com molho de tomate e queijo.',5500,6200,'1513104890138-7c749659a591',false),
  ('pizzaria-marginal','comida','demo-salada-completa','Salada completa','Taça com legumes frescos, ovo, milho e tofu grelhado.',3500,null,'1546069901-ba9599a7e63c',true),
  ('pizzaria-marginal','comida','demo-bolo-framboesa','Fatia de bolo de framboesa','Fatia de bolo em camadas com creme e framboesas.',2200,null,'1565958011703-44f9829ba187',false),
  ('pizzaria-marginal','comida','demo-donuts','Donuts (3 un.)','Três donuts com cobertura.',2400,null,'1551024601-bec78aea704b',false),
  ('mercado-da-banda','supermercado','demo-arroz-5kg','Arroz agulha 5 kg','Saco de arroz agulha de 5 kg.',6500,null,'1586201375761-83865001e31c',false),
  ('mercado-da-banda','supermercado','demo-azeite-750','Azeite 750 ml','Garrafa de azeite de 750 ml.',5500,null,'1474979266404-7eaacbcd87c5',false),
  ('mercado-da-banda','supermercado','demo-cabaz-fruta','Cabaz de fruta','Cabaz com fruta variada da época.',7000,null,'1610832958506-aa56368176cf',false),
  ('mercado-da-banda','supermercado','demo-pao-sementes','Pão de sementes','Pão rústico com sementes.',1500,null,'1509440159596-0249088772ff',false),
  ('mercado-da-banda','supermercado','demo-cabaz-legumes','Cabaz de legumes','Cabaz com legumes frescos variados.',6000,null,'1542838132-92c53300491e',false),
  ('farmacia-bem-estar','farmacia','demo-mascaras-50','Máscaras cirúrgicas (caixa 50)','Caixa com 50 máscaras descartáveis de três camadas.',3500,null,'1584634731339-252c581abfc5',false),
  ('farmacia-bem-estar','farmacia','demo-gel-500','Gel desinfectante 500 ml','Gel desinfectante para as mãos, frasco de 500 ml com doseador.',2000,null,'1584744982491-665216d95f8b',false),
  ('farmacia-bem-estar','farmacia','demo-vitamina-c','Vitamina C (30 cápsulas)','Suplemento alimentar de vitamina C, 30 cápsulas.',4500,null,'1587854692152-cbe660dbde88',false),
  ('farmacia-bem-estar','farmacia','demo-multivitaminico','Multivitamínico (60 comprimidos)','Suplemento alimentar multivitamínico, 60 comprimidos.',6500,null,'1584017911766-d451b3d0e843',false)
) as v(store, cat, slug, name, descr, price, cmp, img, feat)
join public.stores s on s.slug = v.store
join public.categories c on c.slug = v.cat
where not exists (select 1 from public.products p where p.slug = v.slug);
