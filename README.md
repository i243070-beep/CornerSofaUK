# Corner Sofa — Premium UK Handmade Sofa E-Commerce

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15.3-000000?logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Stripe-Payments-635BFF?logo=stripe&logoColor=white" alt="Stripe" />
  <img src="https://img.shields.io/badge/Neon-PostgreSQL-00E5A0?logo=postgresql&logoColor=white" alt="Neon" />
</p>

A production-grade e-commerce platform for a UK-based handmade sofa retailer. Built with Next.js 15 App Router, server-side rendering, and a premium liquid glass design system.

---

## Table of Contents

- [Why This Project Exists](#why-this-project-exists)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [Design System](#design-system)
- [Features](#features)
- [API Reference](#api-reference)
- [Admin Panel](#admin-panel)
- [Deployment](#deployment)
- [Development Workflow](#development-workflow)

---

## Why This Project Exists

The UK handmade sofa market is worth £2.3B annually, yet most retailers rely on generic Shopify templates that fail to communicate craftsmanship, quality, and trust. This project solves that gap:

| Problem | Solution |
|---------|----------|
| Generic templates don't convey premium quality | Custom liquid glass design system with editorial typography |
| No way to experience fabric before buying | Free swatch request system with multi-select and tracking |
| Showroom visits are hard to schedule | Online appointment booking with date/time selection |
| Trust is hard to build online | Verified reviews, 10-year warranty badges, social proof |
| Checkout feels risky for high-ticket items | Stripe + Klarna integration, delivery options, order tracking |
| Admin tools are afterthoughts | Full dark glass admin panel with CRUD, status management, stats |

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 15.3 (App Router) | Server components, streaming, API routes in one package |
| **Language** | TypeScript 5.6 | Type safety catches runtime errors before they reach production |
| **UI** | React 19 | Concurrent rendering, Server Components, improved Suspense |
| **Styling** | Tailwind CSS 3.4 | Utility-first CSS, consistent design tokens, zero runtime overhead |
| **Database** | Neon PostgreSQL | Serverless Postgres with branching, auto-scaling, no cold starts |
| **ORM** | `@neondatabase/serverless` | Direct SQL queries via WebSocket, no ORM overhead |
| **Payments** | Stripe + Klarna | Industry-standard PCI-compliant payments + buy-now-pay-later |
| **Fonts** | Next.js Font (Assistant) | Self-hosted Google Fonts, zero CLS, optimal loading |
| **Testing** | Vitest | Fast unit tests with native ESM support |
| **Analytics** | Google Analytics (gtag) | Event tracking, conversion measurement |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                    Client                        │
│  React 19 · Tailwind CSS · Liquid Glass UI      │
├─────────────────────────────────────────────────┤
│                Next.js App Router                │
│  Server Components · API Routes · Middleware      │
├─────────────────────────────────────────────────┤
│              External Services                   │
│  Stripe (Payments) · Klarna (BNPL) · Neon (DB)  │
└─────────────────────────────────────────────────┘
```

**Data flow:**
1. Browser requests a page → Next.js server-renders React components
2. Server Components fetch data directly from Neon (no client waterfall)
3. Client Components handle interactivity (cart, modals, filters)
4. API Routes handle mutations (checkout, swatch requests, appointments)
5. Stripe handles payment processing (PCI compliant, no card data touches our server)

---

## Project Structure

```
Corner_Sofa/
├── frontend/                    # Next.js application
│   ├── src/
│   │   ├── app/                 # App Router pages & API routes
│   │   │   ├── (pages)/         # Public pages (home, products, etc.)
│   │   │   ├── admin/           # Admin panel (dark glass)
│   │   │   └── api/             # API route handlers
│   │   ├── components/          # Reusable React components
│   │   │   └── ui/              # Design system primitives
│   │   ├── context/             # React Context (CartProvider)
│   │   ├── hooks/               # Custom React hooks
│   │   └── lib/                 # Utilities (db, schema, helpers)
│   ├── styles/
│   │   └── globals.css          # Design tokens + glass system
│   ├── public/                  # Static assets
│   ├── tailwind.config.js       # Theme configuration
│   ├── vitest.config.ts         # Test configuration
│   └── package.json
├── backend/
│   ├── schema.sql               # Database schema
│   ├── seed.sql                 # Seed data (12 products, 27 variants)
│   └── supabase/                # Supabase config
├── reference-designs/           # Design reference images
└── technical-detail.md          # Implementation documentation
```

---

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: 20+)
- npm or yarn
- Neon PostgreSQL database (free tier works)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/Corner_Sofa.git
cd Corner_Sofa

# Install frontend dependencies
cd frontend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Neon database URL and Stripe keys

# Seed the database (run schema + seed in Neon SQL editor)
# 1. Paste backend/schema.sql into Neon SQL Editor → Run
# 2. Paste backend/seed.sql into Neon SQL Editor → Run

# Start development server
npm run dev
```

The site runs at [http://localhost:3000](http://localhost:3000).

### Quick Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

## Environment Variables

Create `frontend/.env`:

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Stripe (Test Keys — get from dashboard.stripe.com)
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Klarna (Optional)
NEXT_PUBLIC_KLARNA_PUBLIC_KEY=...
KLARNA_SECRET_KEY=...

# Site URL (for SEO, sitemap, OG images)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Admin Panel Password (SERVER-ONLY — do NOT prefix with NEXT_PUBLIC_)
ADMIN_PASSWORD=your-secure-admin-password

# Google Analytics (Optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

> **Security:** `ADMIN_PASSWORD` is server-only. Never prefix with `NEXT_PUBLIC_` — that exposes it in client-side JavaScript.

---

## Database Schema

The database uses 5 tables in PostgreSQL:

```sql
products          → Product catalog (12 entries)
product_variants  → Color/size variants per product (27 entries)
swatches          → Available fabric swatches (12 entries)
swatch_requests   → Customer swatch order requests
appointments      → Showroom visit bookings
reviews           → Customer reviews
```

**Key relationships:**
- `product_variants.product_id` → `products.id` (CASCADE DELETE)
- `swatch_requests.swatch_ids` → Array of `swatches.id` (UUID[])
- `reviews.product_id` → `products.id` (CASCADE DELETE)

Run `backend/schema.sql` to create tables, then `backend/seed.sql` to populate with sample data.

---

## Design System

### Liquid Glass Aesthetic

The design system is built on 15+ CSS utility classes in `globals.css`:

| Class | Effect |
|-------|--------|
| `.glass` | Cream-tinted frosted glass |
| `.glass-white` | White frosted glass with inner highlight |
| `.glass-dark` | Dark frosted glass |
| `.glass-card` | Interactive card with hover lift |
| `.glass-btn` | Primary CTA with depth shadow |
| `.glass-btn-outline` | Outlined CTA variant |
| `.glass-input` | Form input with glass background |
| `.glass-divider` | Gradient decorative line |
| `.bg-orb-*` | Floating gradient background orbs |

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#F7F1DE` | Warm cream — main background |
| `secondary` | `#B0BA99` | Muted sage — accent backgrounds |
| `accent` | `#9D6638` | Rich terracotta — CTAs, highlights |
| `dark` | `#4E220F` | Deep espresso — primary text |
| `contrast` | `#1A1A1A` | Near-black — secondary buttons |
| `gold` | `#C5A880` | Muted gold — footer, badges |

### Typography

- **Font:** Assistant (Google Fonts, self-hosted via `next/font`)
- **Headings:** `font-light tracking-[0.15em] uppercase`
- **Body:** `font-light text-sm/relaxed`
- **Labels:** `text-[10px] tracking-[0.2em] uppercase`

---

## Features

### Customer-Facing

| Feature | Description |
|---------|-------------|
| **Product Catalog** | Filterable by category (2-Seater, 3-Seater, Corner, Recliner), fabric type, and price range |
| **Product Detail** | Image gallery, variant selector, stock badges, delivery info, Klarna badge |
| **Shopping Cart** | Persistent cart with MiniCart dropdown, quantity management |
| **Checkout** | Delivery options (Standard/Express/Room of Choice), Stripe + Klarna payment |
| **Swatch Requests** | Multi-select up to 4 fabrics, address form, tracking |
| **Appointment Booking** | Showroom selector, date/time picker, confirmation |
| **Reviews** | Verified review display with star ratings |
| **FAQ** | Expandable accordion with 16 Q&As |
| **Size Guide** | Sofa dimensions, room measurements, tips |
| **Delivery Info** | Options, timeline, FAQs |
| **Blog** | Article listings |
| **SEO** | Dynamic sitemap, robots.txt, JSON-LD structured data (Product, Organization, LocalBusiness, FAQ, BreadcrumbList) |

### Admin Panel

| Feature | Description |
|---------|-------------|
| **Dashboard** | Stats cards (products, orders, swatches, appointments), alert banners, activity feed |
| **Products** | Full CRUD — create form, inline edit, delete with confirmation, category filter |
| **Orders** | Status management (Pending → Processing → Shipped → Delivered) |
| **Swatch Requests** | Status tracking (Pending → Processing → Shipped → Delivered), delete |
| **Appointments** | Status management (Pending → Confirmed → Completed → Cancelled), delete |
| **Auth** | Server-side password validation, HMAC token, 24h expiry |

### Design

| Feature | Description |
|---------|-------------|
| **Liquid Glass** | Frosted glass effect with backdrop-blur, layered shadows |
| **Dark Mode Admin** | Full dark glass theme for admin panel |
| **Mobile Responsive** | Hamburger menu, responsive grids, touch-friendly |
| **Animations** | Fade-in, slide-up, float, shimmer, pulse-soft |
| **Back to Top** | Floating button with glass styling |
| **Scroll Reveal** | IntersectionObserver hook for reveal animations |

---

## API Reference

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/products` | List all products with variants |
| `GET` | `/api/products/[id]` | Get single product |
| `POST` | `/api/products` | Create product |
| `PUT` | `/api/products/[id]` | Update product |
| `DELETE` | `/api/products/[id]` | Delete product + variants |

### Swatches

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/swatches` | List available fabrics |
| `POST` | `/api/swatch-request` | Submit swatch request |
| `GET` | `/api/swatch-request` | List all requests (admin) |
| `PUT` | `/api/swatch-request/[id]` | Update request status |
| `DELETE` | `/api/swatch-request/[id]` | Delete request |

### Appointments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/appointment` | Book appointment |
| `GET` | `/api/appointment` | List all appointments (admin) |
| `PUT` | `/api/appointment/[id]` | Update appointment status |
| `DELETE` | `/api/appointment/[id]` | Delete appointment |

### Checkout

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/checkout` | Create Stripe checkout session |
| `POST` | `/api/klarna` | Create Klarna session |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/auth` | Login (returns HMAC token) |
| `POST` | `/api/admin/verify` | Verify token |
| `GET` | `/api/admin/stats` | Get dashboard stats |

---

## Admin Panel

Access at `/admin`. Password-protected with server-side auth.

**Password:** Set via `ADMIN_PASSWORD` environment variable.

**Features:**
- Real-time stats from database
- Full product CRUD (create, read, update, delete)
- Order status management
- Appointment status management
- Swatch request status management
- Alert banners for pending items
- Activity feed

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# (DATABASE_URL, STRIPE_SECRET_KEY, ADMIN_PASSWORD, etc.)
```

### Manual Deployment

```bash
npm run build
npm run start
```

### Environment Checklist

- [ ] `DATABASE_URL` — Neon PostgreSQL connection string
- [ ] `STRIPE_SECRET_KEY` — Stripe secret key (server-only)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` — Stripe publishable key
- [ ] `ADMIN_PASSWORD` — Secure admin password
- [ ] `NEXT_PUBLIC_BASE_URL` — Production URL
- [ ] Database seeded with `schema.sql` + `seed.sql`

---

## Development Workflow

### Product colours and discounts

In **Admin → Products → Edit**, set the selling price and, for a discount, an optional original price. Savings are calculated from these prices. Clearing the original price removes the discount.

Enter the original sofa photograph once in **Main image URL or path**, then use **Add colour** under **Sofa colours**. New colours default to **Generate from main photo**: choosing a swatch automatically creates a recoloured sofa preview and its image link. Review the preview, set the colour name and stock, and wait for generation to finish before saving. Changing the main photo regenerates automatic previews.

Each colour has three image options:

- **Generate from main photo** creates and saves a preview automatically from the original photograph and chosen swatch.
- **Use main photo** keeps the original photograph, suitable for the sofa's original colour.
- **Use a colour photo** lets you enter a photograph URL or local image path for that specific colour.

A colour can have its own selling price; leave that field blank to use the product price. Selecting a saved colour changes the card, product gallery, and basket image. Only colours saved in admin appear on the storefront; removing a colour removes it from the available options.

Generated images are labelled **Colour preview** because the actual fabric may vary. Use a clear, centred sofa photograph and check the selection before saving. If generation fails or the result is unsuitable, retry with a clearer main photo or choose **Use a colour photo**.

The local catalogue persists these fields in `frontend/.local-data/products.json`. No example discounts or extra colours are added to existing products.

For an existing PostgreSQL/Neon/Supabase database, apply `backend/migrations/20260909_product_colours_and_discounts.sql` before saving these fields. Fresh installations include the columns in `backend/schema.sql` and `backend/supabase/setup.sql`. The migration adds nullable `products.compare_at_price`, `product_variants.color_hex`, and `product_variants.images`; it preserves existing product and variant IDs. Product and colour updates run in one database transaction.

After a production build, run these checks from `frontend`:

```bash
node scripts/verify-product-options.cjs
node scripts/verify-auto-colours.cjs
```

They verify admin edits, generated previews, saved colour selection, discounts, and basket images using isolated local test catalogues. They do not change the shop's real catalogue.

### Automatic preview setup and storage

After installing dependencies, run this command once from `frontend` on the machine that serves the site:

```bash
node scripts/prepare-sofa-previews.mjs
```

This downloads the Apache 2.0-licensed [Xenova/slimsam-77-uniform model](https://huggingface.co/Xenova/slimsam-77-uniform) into `frontend/.cache/sofa-models`. The model selects the sofa on the server; the application then applies the chosen colour while retaining the photo's shading. It is not included in the browser bundle and needs no image-generation API key. The first preview for a new photo takes longer because the sofa selection must be computed; further colours reuse that cached selection.

Preview generation requires the signed admin session cookie issued at sign-in. If admin was already open before this feature was installed, sign out and sign in again once. Saved preview images remain publicly viewable by shoppers.

Generated WebP images and selection masks are stored in `frontend/.local-data/sofa-previews`, or in `<PRODUCT_DATA_DIR>/sofa-previews` when `PRODUCT_DATA_DIR` is configured. Saved products reference these images through `/api/sofa-previews/<hash>.webp`. Preserve this directory across restarts and deployments, including when products are stored in PostgreSQL. The current implementation requires a Node.js server with writable, persistent storage; an ephemeral serverless deployment needs persistent image storage integration before using automatic previews. Keep the model cache available to avoid downloading it again.

### Try in your room

Every customer page includes a **Try in your room** link to `/room-planner/`. The flow is **Your room → Mark wall space → Fit sofa**. After uploading a JPG, PNG or WebP, the customer drags four points around the wall space where the sofa should appear. The lower two points mark where the sofa feet meet the floor. There are no room-size fields, reference measurements, or confirmation checkboxes.

The planner uses the current admin catalogue and saved colour variants. On desktop, sofa and colour choices are on the left, the live room preview stays in the middle, and compact wall-fit controls are on the right. The sofa stays level and front-facing, scales inside the customer's four-point wall area, and keeps the complete cutout visible. A lightweight image-edge check suggests the floor position, and the lower placement points set it when the customer continues. Customers can adjust vertical and horizontal position, wall coverage, side gaps, and where the sofa feet meet the floor. The cutout combines the sofa body and loose cushions so the complete sofa remains visible. This is a visual preview, not a reconstructed 3D view or physical wall measurement.

Room photos remain in the browser and are cleared when leaving or refreshing. Customers can save a PNG preview and add the chosen sofa and colour to their basket. Sofa cutouts reuse the model and persistent storage described under **Automatic preview setup and storage** above.

Validation: `npm test` covers the planner geometry and image analysis. With the site running on port 3100, `node scripts/verify-room-planner.cjs` checks the four-point wall flow, front-view placement, three-column layout, colour changes, wall-fit controls, export, basket action, and mobile layout with isolated browser fixtures (Chrome required). Override `TEST_BASE_URL` for another local port. Fixtures do not modify the shop catalogue.

### Branch Strategy

- `main` — Production-ready code
- `develop` — Integration branch
- `feature/*` — New features
- `fix/*` — Bug fixes

### Code Conventions

- **Components:** Functional components with TypeScript interfaces
- **Styling:** Tailwind utility classes, glass design system
- **State:** React Context for cart, `useState`/`useEffect` for local state
- **Data Fetching:** Server Components for initial data, Client Components for interactivity
- **API Routes:** Next.js App Router route handlers with proper error handling
- **Testing:** Vitest for unit tests (`npm run test`)

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run Vitest tests
```

---

## License

This project is proprietary software. All rights reserved.

---

<p align="center">
  Built with precision for the UK handmade furniture market.
</p>

## Deployment security and storage

Set `ADMIN_PASSWORD` and a random server-only `TOKEN_SECRET` in the deployment environment. Admin login is disabled without a configured password. Admin data and catalogue mutations require a signed HttpOnly session cookie. Keep `.env.local`, `.local-data`, generated artifacts, and caches out of Git.

The connected Vercel project builds from the repository root using `scripts/vercel-build.mjs`, with output in `frontend/.next`.

After editing sofas locally, run `npm run prepare:deploy` from the repository root. This copies the current product catalogue into `frontend/src/data/catalogue.json`, exports referenced local colour previews and uploaded product photos into `frontend/public/images`, and checks every catalogue image exists. Commit that catalogue and its exported photos, including `frontend/public/images/catalogue-rooms`, then push to `cornersofauk main` to trigger Vercel. Local private records and credentials stay outside Git.

Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `TOKEN_SECRET` in Vercel. Orders currently use local filesystem storage; persistent order storage and uploaded-image storage must be configured before accepting live customer orders on Vercel. Local admin edits become part of the bundled storefront only after preparing and deploying them; a database is needed for durable admin edits made on Vercel.
