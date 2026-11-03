alter table public.stores add column if not exists website text check (website is null or website ~* '^https?://');
insert into public.categories(slug, name) values ('tabacaria', 'Tabacaria & Shishas') on conflict (slug) do nothing;
