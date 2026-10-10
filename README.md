# UDESIGN PROJECTS STUDIO

One website with three distinct brand spaces: UDESIGN PROJECTS, UDESIGN MOMENTS, and WINNIE CAKE TOPPER by Udesign.

The three brands share a browser cart. Customers can choose a listed option at its displayed price, note personalisation details, choose delivery or Kuchai Lama pickup, and send an itemised request to the studio through WhatsApp. The cart is saved in the customer's browser. A Cloudflare Worker handles reference images and has a guarded CHIP checkout, but public CHIP payments remain disabled until the merchant's payment methods are approved and the live integration is verified. There is no customer-facing admin dashboard yet.

The first catalog import from the supplied Shopee price export contains 92 products and 876 options. `data/catalog.json` is the published catalog. `scripts/import-catalog.py` converts a normalized export and brand mapping into this file without changing the source spreadsheet. It holds unclear listings and removes Shopee-specific shipping speed promises. The spreadsheet had no product photos, so product cards are text-only and the hero images remain concept imagery. To update the catalog, the owner can supply an updated Shopee export and original product images labelled by Shopee product ID; a later admin dashboard can make updates self-service.

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
