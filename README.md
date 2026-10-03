# UDESIGN PROJECTS STUDIO

One website with three distinct brand spaces: UDESIGN PROJECTS, UDESIGN MOMENTS, and WINNIE CAKE TOPPER by Udesign.

The site now has a shared browser cart for UDESIGN MOMENTS and WINNIE CAKE TOPPER. Customers can note custom details, choose delivery or Kuchai Lama pickup, and copy an order request to send to the studio. Prices and delivery fees are confirmed by the studio before payment. The cart is saved only in the customer's browser; it does not submit an order, collect payment, or create a customer record yet. UDESIGN PROJECTS remains an enquiry-only section. The images are concept imagery and should be replaced with the studio's product photographs before a final commercial launch.

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
