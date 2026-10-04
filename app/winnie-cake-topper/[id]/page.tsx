import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { WinnieProductForm } from "@/components/WinnieProductForm";
import { findProduct, formatRinggit, productPriceRange, productsForBrand } from "@/lib/catalog";

type ProductPageProps = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return productsForBrand("winnie").map((product) => ({ id: product.id }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = findProduct(id);
  return {
    title: product?.brand === "winnie" ? `${product.name} — Winnie Cake Topper` : "Winnie Cake Topper",
    description: product?.brand === "winnie" ? `Choose a priced option for ${product.name} by Winnie Cake Topper, part of UDESIGN PROJECTS STUDIO.` : undefined,
  };
}

export default async function WinnieProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = findProduct(id);
  if (!product || product.brand !== "winnie") notFound();
  const { min, max } = productPriceRange(product);
  const material = /cardstock/i.test(product.name) ? "Cardstock" : /acrylic/i.test(product.name) ? "Acrylic" : null;

  return (
    <div className="winnie-page winnie-product-page">
      <SiteHeader active="winnie" sectionPage={false} />
      <main className="shell">
        <nav className="winnie-product__breadcrumbs" aria-label="Breadcrumb"><Link href="/winnie-cake-topper/">Winnie Cake Topper</Link><span aria-hidden="true">/</span><Link href="/winnie-cake-topper/#products">Cake toppers</Link></nav>
        <div className="winnie-product__layout">
          <div className="winnie-product__visual">
            <div className="winnie-product__image"><Image src="/images/winnie.webp" alt="Celebration cake topper style inspiration; the finished product is personalised for each order" fill sizes="(max-width: 800px) 100vw, 46vw" priority /><span className="winnie-product__image-label">STYLE INSPIRATION · NOT A PRODUCT PHOTO</span></div>
            <p><strong>Style inspiration</strong> · Your finished topper will be made to your chosen option. We&apos;ll confirm the design with you. <a href="https://www.instagram.com/winniecaketopper/" target="_blank" rel="noopener noreferrer">See real toppers on Instagram ↗</a></p>
          </div>
          <div className="winnie-product__content">
            <p className="eyebrow">WINNIE CAKE TOPPER BY UDESIGN</p>
            <h1>{product.name}</h1>
            <p className="winnie-product__price">{min === max ? formatRinggit(min) : `From ${formatRinggit(min)}`}</p>
            <p className="winnie-product__lead">Choose a listed option and tell us how to make it yours. Your exact item price appears before you add it to your cart.</p>
            <a className="winnie-product__jump" href="#customise">Choose options &amp; add to cart <span aria-hidden="true">↓</span></a>
            {(id === "15839023675" || id === "14939532339") && <p className="winnie-product__style-note">We have two wedding topper listings with different size choices. Please send us a reference photo on WhatsApp so we can confirm the exact design.</p>}
            <div className="winnie-product__facts">
              {material && <p><span>Material</span><strong>{material}</strong></p>}
              <p><span>Options</span><strong>{product.variants.filter((variant) => variant.available).length} available</strong></p>
              <p><span>Ready date</span><strong>Confirmed by WhatsApp</strong></p>
            </div>
            <WinnieProductForm product={product} />
          </div>
        </div>
        <aside className="winnie-product__how"><h2>What happens next?</h2><ol><li>Choose your option and add your details.</li><li>Pick delivery or Kuchai Lama pickup in your cart.</li><li>Send the prepared request in WhatsApp. We&apos;ll confirm the design, ready date and final total before payment.</li></ol></aside>
        <Link className="winnie-product__back" href="/winnie-cake-topper/#products">← See all cake toppers</Link>
      </main>
      <SiteFooter />
    </div>
  );
}
