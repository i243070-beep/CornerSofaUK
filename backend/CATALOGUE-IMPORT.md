# Sofa catalogue import

The 30 September 2026 import added the 108 entries from `sofa-catalogue-for-codex.json`. All catalogue sofas are now published and available to order; the former review and stock-confirmation gates have been removed. The four existing products and their IDs, prices and colour previews remain in the local catalogue.

| Primary category | Imported | Published | Draft |
| --- | ---: | ---: | ---: |
| Corner | 46 | 30 | 16 |
| Sofa Sets | 31 | 16 | 15 |
| U-Shape | 11 | 7 | 4 |
| 2-Seater | 6 | 6 | 0 |
| 3-Seater | 6 | 6 | 0 |
| Recliner | 4 | 4 | 0 |
| Armchairs | 3 | 3 | 0 |
| Footstools | 1 | 1 | 0 |

Products also appear in their secondary categories: the published collection includes two sofa beds and 18 recliner listings, including sets. Sets are not advertised as individual two- or three-seater sofas. Accessories have separate categories.

All 273 unique photographs were downloaded successfully and optimised into `frontend/public/images/catalogue/`. Product galleries and documented variants use these local images. Gallery photos and the reference fabric catalogue do not create additional purchasable colours.

Product data persists in `frontend/.local-data/products.json`. The pre-import backup is in `frontend/.local-data/backups/`. Detailed validation, unresolved fields, possible duplicates and image results are in `frontend/artifacts/catalogue-import-report.json`; the URL-to-local-image map is alongside it in `catalogue-image-manifest.json`. These local data and report directories are ignored by Git; preserve them when moving this installation.

## Manage products

Open **Admin → Products** to add a sofa or edit its title, category, price, photographs and colour options. Saves publish the sofa immediately. “Add colour option” is at the top of the editor and jumps to the colour controls. Stock quantities and catalogue review flags do not affect availability.

The supplied catalogue has no numeric stock quantities. Sofas are made available to order, with a basket limit of 10 of one colour per order. Supplier stock booleans remain provenance only.

Four source listings have “from” prices and retain their exact configuration prices. Original prices are not applied across different configurations. Source reviews, supplier contact details, delivery policies and warranty claims were not imported as store policies.

## Repeat import and validation

From `frontend`:

```powershell
node scripts/import-sofa-catalogue.mjs        # inspect the import plan
node scripts/import-sofa-catalogue.mjs --apply
node --test scripts/verify-catalogue-import.mjs
node scripts/verify-responsive-catalogue.cjs # running site at localhost:3000
```

The importer identifies products by source site and source product ID. Repeat runs skip existing source identities, preserving subsequent admin edits. Similar product names are kept separate for review. No existing products are deleted. The importer targets local storage and refuses to run if `DATABASE_URL` is configured.

Admin sign-in requires the server-only `ADMIN_USERNAME` and `ADMIN_PASSWORD` values in `frontend/.env.local`. Keep both out of client-prefixed variables such as `NEXT_PUBLIC_*`. Set `TOKEN_SECRET` to an independent random value for signed admin sessions.

For an existing PostgreSQL installation, apply `migrations/20260930_catalogue_visibility.sql` before using the updated admin editor. Fresh schemas include these additive fields. Importing this local catalogue into a hosted database is a separate deployment step.
