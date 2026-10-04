-- Products Table
create table products (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  title text not null,
  description text,
  base_price decimal(10,2) not null,
  compare_at_price decimal(10,2),
  images text[] not null default '{}',
  category text,
  status text not null default 'published' check (status in ('published', 'draft')),
  categories text[] not null default '{}',
  review_flags text[] not null default '{}',
  stock_confirmation_required boolean not null default false,
  created_at timestamp with time zone default now()
);

-- Product Variants Table (Configurations like 3+2 Seater, Corner, etc.)
create table product_variants (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id) on delete cascade,
  range_type text not null, -- e.g., '3+2 Seater', 'Corner', 'Recliner'
  sku text unique not null,
  price decimal(10,2) not null,
  stock integer default 10,
  color text,
  color_hex varchar(7),
  images text[] not null default '{}',
  material text
);

-- Fabric Swatches Table
create table swatches (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  hex_color text,
  image_url text not null,
  material text not null, -- e.g., Velvet, Bouclé, Linen
  product_id uuid references products(id) on delete cascade
);

-- Swatch Requests Table
create table swatch_requests (
  id uuid default gen_random_uuid() primary key,
  customer_name text not null,
  email text not null,
  shipping_address jsonb not null,
  swatch_ids uuid[] not null default '{}',
  created_at timestamp with time zone default now()
);

-- Enable realtime for swatch_requests (optional)
alter publication supabase_realtime add table swatch_requests;
