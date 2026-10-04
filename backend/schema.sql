-- Products Table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR UNIQUE NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  base_price DECIMAL(10, 2) NOT NULL,
  compare_at_price DECIMAL(10, 2),
  images TEXT[] NOT NULL,
  category VARCHAR,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft')),
  categories TEXT[] NOT NULL DEFAULT '{}',
  review_flags TEXT[] NOT NULL DEFAULT '{}',
  stock_confirmation_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Variants Table
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  range_type VARCHAR NOT NULL,
  sku VARCHAR UNIQUE NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  color VARCHAR,
  color_hex VARCHAR(7),
  images TEXT[] NOT NULL DEFAULT '{}',
  stock INT DEFAULT 10
);

-- Fabric Swatches Table
CREATE TABLE swatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  hex_color VARCHAR,
  image_url VARCHAR,
  material VARCHAR NOT NULL
);

-- Swatch Requests Table
CREATE TABLE swatch_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  shipping_address JSONB NOT NULL,
  swatch_ids UUID[] NOT NULL,
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointments Table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  phone VARCHAR,
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews Table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  customer_name VARCHAR NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
