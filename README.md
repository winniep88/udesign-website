# UDESIGN PROJECTS STUDIO

One website with three distinct brand spaces: UDESIGN PROJECTS, UDESIGN MOMENTS, and WINNIE CAKE TOPPER by Udesign.

The three brands share a browser cart. Customers can choose a listed option at its displayed price, note personalisation details, choose delivery or Kuchai Lama pickup, and send an itemised request to the studio through WhatsApp. The subtotal covers items only; the studio confirms design, stock, delivery fee and final total before payment. The cart is saved only in the customer's browser. It does not submit an order to a database, collect payment, or create a customer record. CHIP payment and an admin dashboard are not connected yet.

The first catalog import from the supplied Shopee price export contains 92 products and 876 options. `data/catalog.json` is the published catalog. `scripts/import-catalog.py` converts a normalized export and brand mapping into this file without changing the source spreadsheet. It holds unclear listings and removes Shopee-specific shipping speed promises. The spreadsheet had no product photos, so product cards are text-only and the hero images remain concept imagery. To update the catalog, the owner can supply an updated Shopee export and original product images labelled by Shopee product ID; a later admin dashboard can make updates self-service.

## Run locally

```sh
pnpm install
pnpm dev
```

## Build for Cloudflare Pages

```sh
pnpm build
```

Use `out` as the Cloudflare Pages output directory. The site currently uses Next.js static export so it can run on Cloudflare Pages' free tier. Server features can be added when ordering and payments are built.
