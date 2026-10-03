# UDESIGN PROJECTS STUDIO

One website with three distinct brand spaces: UDESIGN PROJECTS, UDESIGN MOMENTS, and WINNIE CAKE TOPPER by Udesign.

This first release is a storefront introduction and category guide. Product checkout, customer accounts, payment, and admin tools are intentionally not active yet. The images are concept imagery and should be replaced with the studio's product photographs before a final commercial launch.

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
