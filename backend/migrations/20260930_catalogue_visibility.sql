-- Additive support for reviewed catalogue imports. Existing products remain published.
ALTER TABLE products ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_flags text[] NOT NULL DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_confirmation_required boolean NOT NULL DEFAULT false;
