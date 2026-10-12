import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CustomTopperForm } from "@/components/CustomTopperForm";
import { TopperStartingPrice } from "@/components/TopperStartingPrice";
import { TopperHeroImage } from "@/components/TopperHeroImage";
import { topperEvent, topperEvents, topperProductName } from "@/lib/topper";

type Props = { params: Promise<{ event: string; lines: string }> };

export function generateStaticParams() {
  return topperEvents.map((event) => ({ event: event.slug, lines: "custom-cake-topper" }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const route = await params;
  const chosen = topperEvent(route.event);
  return { title: chosen && route.lines === "custom-cake-topper" ? `${topperProductName()} — Winnie Cake Topper` : "Custom Cake Topper" };
}

export default async function TopperProductPage({ params }: Props) {
  const route = await params;
  const chosen = topperEvent(route.event);
  if (!chosen || route.lines !== "custom-cake-topper") notFound();

  return (
    <div className="winnie-page custom-topper-page">
      <SiteHeader active="winnie" sectionPage={false} />
      <main className="shell">
        <nav className="winnie-product__breadcrumbs" aria-label="Breadcrumb"><Link href="/winnie-cake-topper/">Winnie Cake Topper</Link><span aria-hidden="true">/</span><Link href={`/winnie-cake-topper/event/${chosen.slug}/`}>{chosen.name}</Link><span aria-hidden="true">/</span><span>Custom Cake Topper</span></nav>
        <div className="custom-topper__layout">
          <div className="custom-topper__visual">
            <TopperHeroImage eventSlug={chosen.slug} />
            <p>See finished work at <a href="https://www.instagram.com/winniecaketopper/" target="_blank" rel="noopener noreferrer">@winniecaketopper ↗</a></p>
          </div>
          <div className="custom-topper__content">
            <p className="eyebrow">WINNIE CAKE TOPPER BY UDESIGN / {chosen.name.toUpperCase()}</p>
            <h1>{topperProductName()}</h1>
            <p className="custom-topper__lead">A perfect addition to your {chosen.name.toLowerCase()} celebration. Personalise one cardstock, acrylic or wooden cake topper with your wording, font, colour and size.</p>
            <p className="custom-topper__price"><TopperStartingPrice /></p>
            <CustomTopperForm key={chosen.slug} initialEventSlug={chosen.slug} />
          </div>
        </div>
        <section className="custom-topper__details" aria-labelledby="custom-topper-details-title">
          <div><p className="eyebrow">THE MATERIALS</p><h2 id="custom-topper-details-title">Type of materials</h2></div>
          <div className="custom-topper__material-grid">
            <article><h3>Cardstock</h3><p>250 gsm cardstock with a transparent acrylic stick. Glitter cardstock has glitter on the front and a white reverse.</p></article>
            <article><h3>Acrylic</h3><p>Premium 2–3 mm acrylic with a matching acrylic stem. Mirror finishes have a reflective front and a plain-colour reverse.</p></article>
            <article><h3>Wood</h3><p>Premium 3 mm wood with a matching wooden stem. Choose natural or brown wood.</p></article>
          </div>
        </section>
        <section className="custom-topper__timeline" aria-labelledby="custom-topper-timeline-title"><div><p className="eyebrow">BEFORE WE MAKE IT</p><h2 id="custom-topper-timeline-title">Lead time</h2></div><p>We&apos;ll confirm your wording and design on WhatsApp. If a digital mock-up is needed, please allow 1–2 working days to receive it. Cake toppers for pickup in Kuchai Lama are usually ready about 3 hours after design approval during collection hours; we&apos;ll confirm your exact time before you travel. Courier transit after dispatch is estimated at 3 business days to West Malaysia, 8–10 business days to East Malaysia, and 4 business days to Singapore.</p></section>
        <Link className="winnie-product__back" href={`/winnie-cake-topper/event/${chosen.slug}/`}>← Back to {chosen.name.toLowerCase()} toppers</Link>
      </main>
      <SiteFooter />
    </div>
  );
}
