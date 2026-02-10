create table if not exists public.articles (
  id text primary key,
  type text not null,
  slug text not null unique,
  title text not null,
  summary text not null,
  body text not null,
  images jsonb not null default '[]'::jsonb,
  source_url text not null unique,
  affiliate_url text,
  embed_html text,
  related_works jsonb not null default '[]'::jsonb,
  related_actresses jsonb not null default '[]'::jsonb,
  published_at timestamptz not null,
  fetched_at timestamptz not null
);

create index if not exists idx_articles_type_published on public.articles (type, published_at desc);
create index if not exists idx_articles_published on public.articles (published_at desc);
