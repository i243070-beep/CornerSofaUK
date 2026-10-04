# Corner Sofa Website Guide

This file is a human-readable map for the Corner Sofa website. It contains no application code. Use it when you ask another tool or developer to change the website, so they can find the right files quickly.

## Project Structure

- `frontend/` is the Next.js website that runs on Vercel.
- `frontend/src/app/` contains the website pages and API routes.
- `frontend/src/components/` contains shared website sections such as the header, footer, product cards, basket, social links and HELPER chat.
- `frontend/src/lib/` contains business logic for products, checkout, orders, delivery, sofa builder, swatches and HELPER.
- `frontend/src/data/catalogue.json` is the public product catalogue seed used when no database is connected.
- `frontend/public/images/` contains website images, catalogue photos and social QR codes.
- `backend/` contains database schema, Supabase setup SQL and catalogue import notes.

## Common Change Areas

- Home page design: `frontend/src/app/page.tsx`, `frontend/src/components/HomeHero.tsx`, `frontend/src/components/HomeProductSections.tsx`, `frontend/styles/home-refresh.css`, `frontend/styles/globals.css`
- Main header/navigation: `frontend/src/components/SiteHeader.tsx`, `frontend/src/components/MobileMenu.tsx`, `frontend/styles/globals.css`
- Footer, phone number and social QR area: `frontend/src/components/SiteFooter.tsx`, `frontend/src/components/SiteFooter.module.css`
- Contact page: `frontend/src/app/contact/page.tsx`, `frontend/src/app/contact/contact.module.css`, `frontend/src/app/contact/ContactForm.tsx`
- Product listing and cards: `frontend/src/app/products/page.tsx`, `frontend/src/app/products/ProductsClient.tsx`, `frontend/src/components/ui/ProductCard.tsx`, `frontend/src/components/ui/ProductCard.module.css`
- Product detail page: `frontend/src/app/product/[id]/page.tsx`
- Basket and checkout: `frontend/src/app/cart/page.tsx`, `frontend/src/app/checkout/page.tsx`, `frontend/src/context/CartContext.tsx`
- Plan room: `frontend/src/app/room-planner/RoomPlanner.tsx`, `frontend/src/app/room-planner/planner.module.css`
- Build sofa: `frontend/src/app/build/`, `frontend/src/components/sofa-builder/`, `frontend/src/lib/sofa-builder/`
- Swatches: `frontend/src/app/swatches/page.tsx`, `frontend/src/lib/fabric-store.ts`
- HELPER assistant: `frontend/src/components/AlashiChat.tsx`, `frontend/src/components/alashi.module.css`, `frontend/src/lib/alashi-engine.ts`, `frontend/src/lib/alashi-rules.ts`
- Admin pages: `frontend/src/app/admin/`

## Images And QR Codes

- Instagram QR code: `frontend/public/images/instagram-qr.png`
- TikTok QR code: `frontend/public/images/tiktok-qr.jpg`
- Product images: `frontend/public/images/catalogue/`
- Product room images: `frontend/public/images/catalogue-rooms/`

## Running Locally

Open a terminal in `frontend/`, then run:

- Install dependencies: `npm install`
- Start development website: `npm run dev`
- Build production website: `npm run build`
- Start production build: `npm run start`

## Vercel Notes

The Vercel project should use `frontend` as the root directory.

Important environment variables:

- `DATABASE_URL` for persistent products, orders, builder records and admin data.
- `ADMIN_USERNAME` and `ADMIN_PASSWORD` for admin login.
- `TOKEN_SECRET` for signed checkout and HELPER tokens.
- `NEXT_PUBLIC_INSTAGRAM_URL` if the Instagram URL changes.
- `NEXT_PUBLIC_TIKTOK_URL` if the TikTok URL changes.

If `DATABASE_URL` is not set, the website still builds and displays the bundled catalogue from `frontend/src/data/catalogue.json`, but orders/admin edits are not durable on Vercel.
