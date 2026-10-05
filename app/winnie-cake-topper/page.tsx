import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCatalog } from "@/components/ProductCatalog";
import { CustomRequest } from "@/components/CustomRequest";
import { TopperEventPicker } from "@/components/TopperEventPicker";
import { productsForBrand } from "@/lib/catalog";
import { whatsappLink } from "@/lib/contact";

export const metadata: Metadata = {
  title: "WINNIE CAKE TOPPER by Udesign — Celebration pieces",
  description: "Choose an event, then personalise a one, two or three line cake topper with Winnie Cake Topper by UDESIGN.",
};

export default function WinniePage() {
  return (
    <div className="winnie-page">
      <SiteHeader active="winnie" />
      <main>
        <section className="winnie-hero" id="choose-event">
          <div className="shell winnie-hero__inner">
            <div className="winnie-hero__copy">
              <p className="eyebrow">WINNIE CAKE TOPPER BY UDESIGN</p>
              <span className="winnie-hero__brand">WINNIE CAKE TOPPER <small>by Udesign</small></span>
              <h1>What are we<br /><em>celebrating?</em></h1>
              <p>Choose your event first. Then choose a one, two or three line product to make your cake topper yours.</p>
              <TopperEventPicker />
              <a className="winnie-instagram-link" href="https://www.instagram.com/winniecaketopper/" target="_blank" rel="noopener noreferrer">See our real toppers on Instagram ↗</a>
            </div>
            <div className="winnie-hero__image"><Image src="/images/winnie.webp" alt="Concept image of a colourful acrylic cake decoration" fill sizes="(max-width: 750px) 100vw, 50vw" priority /><span className="winnie-spark winnie-spark--one" aria-hidden="true">✳</span><span className="winnie-spark winnie-spark--two" aria-hidden="true">✦</span><span className="image-label">STYLE INSPIRATION / NOT A PRODUCT PHOTO</span></div>
          </div>
        </section>

        <section className="custom-topper-feature shell" aria-labelledby="custom-topper-feature-title">
          <div><p className="eyebrow">YOUR TOPPER, YOUR WAY</p><h2 id="custom-topper-feature-title">One, two or three lines. Three materials.</h2><p>For every event, you can choose cardstock, acrylic or wood, its matching colour or finish, and your topper width.</p></div>
          <a href="#choose-event">Choose your event <span aria-hidden="true">↑</span></a>
        </section>

        <section className="winnie-collections shell" aria-labelledby="winnie-collections-title"><p className="eyebrow">MORE TO EXPLORE</p><h2 id="winnie-collections-title">Little pieces, big celebrations.</h2><p className="collection-note">Browse other listed pieces below, or start above with your event for a custom line topper.</p><div className="winnie-grid"><article><span className="winnie-icon" aria-hidden="true">✳</span><span>01 / THE TOPPING</span><h3>Cake toppers</h3><p>Names, themes and joyful finishing touches for the cake at the centre of it all.</p><a className="collection-browse" href="#products">Browse toppers ↓</a></article><article><span className="winnie-icon" aria-hidden="true">✦</span><span>02 / THE LITTLE EXTRAS</span><h3>Celebration pieces</h3><p>Personal details to make birthdays, parties and special days feel more like yours.</p><a className="collection-browse" href="#products">Browse pieces ↓</a></article></div></section>

        <ProductCatalog brand="winnie" products={productsForBrand("winnie").filter((product) => product.id !== "4911844020" && product.id !== "4306939371")} />
        <CustomRequest brand="cake topper or celebration" />
        <section className="winnie-ending"><div className="shell"><span>MAKE IT A DAY TO REMEMBER</span><h2>Every celebration<br />deserves its own sparkle.</h2><a className="button button--white" href={whatsappLink("Hi UDESIGN, I'd like to discuss a custom cake topper or celebration piece.")} target="_blank" rel="noopener noreferrer">Ask about a custom piece <span aria-hidden="true">↗</span></a></div></section>
        <div className="shell back-worlds"><Link href="/">← Back to all UDESIGN worlds</Link></div>
      </main>
      <SiteFooter />
    </div>
  );
}
