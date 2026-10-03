import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCatalog } from "@/components/ProductCatalog";
import { CustomRequest } from "@/components/CustomRequest";
import { productsForBrand } from "@/lib/catalog";
import { whatsappLink } from "@/lib/contact";

export const metadata: Metadata = {
  title: "WINNIE CAKE TOPPER by Udesign — Celebration pieces",
  description: "Personalised cake toppers and celebration pieces by WINNIE CAKE TOPPER, part of UDESIGN PROJECTS STUDIO.",
};

export default function WinniePage() {
  return (
    <div className="winnie-page">
      <SiteHeader active="winnie" />
      <main>
        <section className="winnie-hero"><div className="shell winnie-hero__inner"><div className="winnie-hero__copy"><p className="eyebrow">03 / THE JOYFUL ONE</p><span className="winnie-hero__brand">WINNIE CAKE TOPPER <small>by Udesign</small></span><h1>Top it off<br />with <em>joy.</em></h1><p>Little pieces that make the celebration feel like it was made just for you. Because it was.</p><a className="button button--pink" href="#products">Shop products &amp; prices <span aria-hidden="true">↓</span></a></div><div className="winnie-hero__image"><Image src="/images/winnie.webp" alt="Concept image of a colourful acrylic cake decoration" fill sizes="(max-width: 750px) 100vw, 50vw" priority /><span className="winnie-spark winnie-spark--one" aria-hidden="true">✳</span><span className="winnie-spark winnie-spark--two" aria-hidden="true">✦</span><span className="image-label">DESIGN CONCEPT / CELEBRATION</span></div></div></section>

        <section className="winnie-collections shell" aria-labelledby="winnie-collections-title"><p className="eyebrow">MADE FOR YOUR MOMENT</p><h2 id="winnie-collections-title">Let&apos;s celebrate something.</h2><p className="collection-note">Browse the products below to choose an option and see its price.</p><div className="winnie-grid"><article><span className="winnie-icon" aria-hidden="true">✳</span><span>01 / THE TOPPING</span><h3>Cake toppers</h3><p>Names, themes and joyful finishing touches for the cake at the centre of it all.</p><a className="collection-browse" href="#products">Browse toppers ↓</a></article><article><span className="winnie-icon" aria-hidden="true">✦</span><span>02 / THE LITTLE EXTRAS</span><h3>Celebration pieces</h3><p>Personal details to make birthdays, parties and special days feel more like yours.</p><a className="collection-browse" href="#products">Browse pieces ↓</a></article></div></section>

        <ProductCatalog brand="winnie" products={productsForBrand("winnie")} />
        <CustomRequest brand="cake topper or celebration" />
        <section className="winnie-ending"><div className="shell"><span>MAKE IT A DAY TO REMEMBER</span><h2>Every celebration<br />deserves its own sparkle.</h2><a className="button button--white" href={whatsappLink("Hi UDESIGN, I'd like to discuss a custom cake topper or celebration piece.")} target="_blank" rel="noopener noreferrer">Ask about a custom piece <span aria-hidden="true">↗</span></a></div></section>
        <div className="shell back-worlds"><Link href="/">← Back to all UDESIGN worlds</Link></div>
      </main>
      <SiteFooter />
    </div>
  );
}
