import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { topperEvent, topperEvents, topperLineCounts, topperLineLabel, topperProductHref } from "@/lib/topper";

type Props = { params: Promise<{ event: string }> };

export function generateStaticParams() {
  return topperEvents.map((event) => ({ event: event.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const chosen = topperEvent((await params).event);
  return { title: chosen ? `${chosen.name} Cake Toppers — Winnie Cake Topper` : "Cake Toppers" };
}

export default async function TopperEventPage({ params }: Props) {
  const chosen = topperEvent((await params).event);
  if (!chosen) notFound();

  return (
    <div className="winnie-page topper-event-page">
      <SiteHeader active="winnie" />
      <main>
        <section className="topper-event-hero shell">
          <nav className="winnie-product__breadcrumbs" aria-label="Breadcrumb"><Link href="/winnie-cake-topper/">Winnie Cake Topper</Link><span aria-hidden="true">/</span><span>{chosen.name}</span></nav>
          <div className="topper-event-hero__grid">
            <div><p className="eyebrow">CHOOSE YOUR EVENT / {chosen.name.toUpperCase()}</p><h1>{chosen.name} cake toppers</h1><p>{chosen.description} Now choose how many lines of wording you need.</p><Link className="topper-event-hero__change" href="/winnie-cake-topper/#choose-event">← Choose another event</Link></div>
            <div className="topper-event-hero__image"><Image src="/images/winnie.webp" alt="Cake topper style inspiration; concept image rather than a product photo" fill sizes="(max-width: 800px) 100vw, 42vw" priority /><span>STYLE INSPIRATION · NOT A PRODUCT PHOTO</span></div>
          </div>
        </section>
        <section className="topper-line-products shell" aria-labelledby="topper-line-products-title">
          <p className="eyebrow">STEP 2 / CHOOSE A PRODUCT</p>
          <h2 id="topper-line-products-title">How many lines?</h2>
          <p>Each product lets you choose cardstock, acrylic or wood, then its colour and topper width.</p>
          <div className="topper-line-products__grid">
            {topperLineCounts.map((lines) => <article key={lines}>
              <span className="topper-line-products__number">0{lines}</span>
              <h3>{topperLineLabel(lines)}</h3>
              <p>{lines === 1 ? "One name or short phrase." : lines === 2 ? "Two lines for a name and message." : "Three lines for a fuller message."}</p>
              <small>{lines === 3 ? "13–20 cm / 5–8 inch" : "10–20 cm / 4–8 inch"}</small>
              <Link href={topperProductHref(chosen.slug, lines)}>Personalise this topper <span aria-hidden="true">→</span></Link>
            </article>)}
          </div>
          <p className="topper-line-products__price-note">Item prices are being completed. We&apos;ll confirm your total on WhatsApp before payment.</p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
