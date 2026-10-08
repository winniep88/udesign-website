import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TopperEventPicker } from "@/components/TopperEventPicker";

export const metadata: Metadata = {
  title: "Choose Your Event — Winnie Cake Topper",
  description: "Start your custom Winnie Cake Topper by choosing an event.",
};

export default function CustomTopperPage() {
  return (
    <div className="winnie-page custom-topper-page">
      <SiteHeader active="winnie" />
      <main className="shell">
        <nav className="winnie-product__breadcrumbs" aria-label="Breadcrumb"><Link href="/winnie-cake-topper/">Winnie Cake Topper</Link><span aria-hidden="true">/</span><span>Choose your event</span></nav>
        <section className="topper-event-hero__grid topper-event-hero__grid--legacy">
          <div><p className="eyebrow">STEP 1 / CHOOSE YOUR EVENT</p><h1>What are we celebrating?</h1><p>Start with your event, then personalise your custom cake topper.</p><TopperEventPicker /></div>
          <div className="topper-event-hero__image"><Image src="/images/winnie.webp" alt="Colourful cake topper style inspiration; concept image rather than a product photo" fill sizes="(max-width: 800px) 100vw, 42vw" priority /><span>STYLE INSPIRATION · NOT A PRODUCT PHOTO</span></div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
