# UDESIGN PROJECTS STUDIO

One website with three distinct brand spaces: UDESIGN PROJECTS, UDESIGN MOMENTS, and WINNIE CAKE TOPPER by Udesign.

The three brands share a browser cart. Customers can choose a listed option at its displayed price, note personalisation details, choose delivery or Kuchai Lama pickup, and pay through CHIP when live checkout is enabled. The cart is saved in the customer's browser. A Cloudflare Worker handles product and reference images, verified checkout prices, and owner-only catalog changes.

The first catalog import from the supplied Shopee price export is bundled in `data/catalog.json`. The owner can now open `/admin/products/` to add listings, change names, prices and options, upload photos, or hide products. The editor stores overrides in Supabase; the bundled catalog remains the fallback for unedited listings. `/admin/topper-prices/` edits the custom cake topper base prices by material and size. The Worker reads the same current prices at checkout, so browser prices do not control payment totals. Uploaded product photos are stored in R2. Past orders keep their original item snapshots when a listing changes.

## Run locally

```sh
pnpm install
pnpm dev
```

## Build for the hosted Worker

```sh
pnpm build
node scripts/build-worker.mjs
node scripts/smoke-worker.mjs
```

The Next.js static export is embedded into the Worker with the catalog. See [CHIP integration notes](docs/chip-integration.md) for the separate test and live checkout gates. Keep all keys in hosting secrets, never in source files.
