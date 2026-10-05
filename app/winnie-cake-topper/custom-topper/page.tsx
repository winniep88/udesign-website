import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CustomTopperForm } from "@/components/CustomTopperForm";

export const metadata: Metadata = {
  title: "Custom 2 or 3 Line Cake Topper — Winnie Cake Topper",
  description: "Create a personalised cake topper with two or three lines. Choose cardstock, acrylic or wood, then pick a finish and size.",
};

export default function CustomTopperPage() {
  return (
    <div className="winnie-page custom-topper-page">
      <SiteHeader active="winnie" sectionPage={false} />
      <main className="shell">
        <nav className="winnie-product__breadcrumbs" aria-label="Breadcrumb"><Link href="/winnie-cake-topper/">Winnie Cake Topper</Link><span aria-hidden="true">/</span><span>Custom topper</span></nav>
        <div className="custom-topper__layout">
          <div className="custom-topper__visual">
            <div className="custom-topper__image"><Image src="/images/winnie.webp" alt="Colourful cake topper style inspiration; this is a concept image, not a product photo" fill sizes="(max-width: 900px) 100vw, 42vw" priority /><span>STYLE INSPIRATION · NOT A PRODUCT PHOTO</span></div>
            <p>See finished work at <a href="https://www.instagram.com/winniecaketopper/" target="_blank" rel="noopener noreferrer">@winniecaketopper ↗</a></p>
          </div>
          <div className="custom-topper__content">
            <p className="eyebrow">WINNIE CAKE TOPPER BY UDESIGN</p>
            <h1>Make it yours, line by line.</h1>
            <p className="custom-topper__lead">Make a wedding, engagement, baby shower, gender reveal, bridal shower, hen&apos;s party or birthday cake feel personal. Choose two or three lines, then select a material, colour and size.</p>
            <p className="custom-topper__price">Price confirmed on WhatsApp</p>
            <CustomTopperForm />
          </div>
        </div>
        <section className="custom-topper__details" aria-labelledby="custom-topper-details-title">
          <div><p className="eyebrow">THE MATERIALS</p><h2 id="custom-topper-details-title">Made for your cake.</h2></div>
          <div className="custom-topper__material-grid">
            <article><h3>Cardstock</h3><p>300 gsm card, approximately 0.8 mm thick, with an acrylic stick. Glitter cardstock has glitter on the front and a white reverse.</p></article>
            <article><h3>Acrylic</h3><p>3 mm acrylic with a matching acrylic stem. Mirror finishes have a reflective front and plain-colour back.</p></article>
            <article><h3>Wood</h3><p>3 mm wood with a matching wooden stem. Ask us about the finish you have in mind.</p></article>
          </div>
        </section>
        <section className="custom-topper__timeline" aria-labelledby="custom-topper-timeline-title"><div><p className="eyebrow">BEFORE WE MAKE IT</p><h2 id="custom-topper-timeline-title">A design you can approve.</h2></div><p>We aim to send a digital mock-up on WhatsApp within 1–2 working days. Once you approve it, production is estimated at one working day, excluding weekends and public holidays. We&apos;ll confirm your ready date for every order. You can choose Kuchai Lama pickup or delivery in your cart; delivery times are estimates after dispatch.</p></section>
        <Link className="winnie-product__back" href="/winnie-cake-topper/">← See all Winnie Cake Topper products</Link>
      </main>
      <SiteFooter />
    </div>
  );
}
