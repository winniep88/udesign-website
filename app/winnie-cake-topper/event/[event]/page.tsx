import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteImage } from "@/components/SiteContent";
import { TopperStartingPrice } from "@/components/TopperStartingPrice";
import { topperEvent, topperEventDesigns, topperEvents, topperProductHref, topperProductName } from "@/lib/topper";

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
  const designs = topperEventDesigns[chosen.slug];

  return (
    <div className="winnie-page topper-event-page">
      <SiteHeader active="winnie" />
      <main>
        <section className="topper-event-hero shell">
          <nav className="winnie-product__breadcrumbs" aria-label="Breadcrumb"><Link href="/winnie-cake-topper/">Winnie Cake Topper</Link><span aria-hidden="true">/</span><span>{chosen.name}</span></nav>
          <div className="topper-event-hero__grid">
            <div><p className="eyebrow">CHOOSE YOUR EVENT / {chosen.name.toUpperCase()}</p><h1>{chosen.name} cake toppers</h1><p>{chosen.description} Personalise one custom cake topper with your wording, material, colour and size.</p><Link className="topper-event-hero__change" href="/winnie-cake-topper/#choose-event">← Choose another event</Link></div>
            <div className="topper-event-hero__image"><SiteImage contentKey={`event.${chosen.slug}Image`} alt={`Custom cake topper for a ${chosen.name.toLowerCase()} celebration`} fill sizes="(max-width: 800px) 100vw, 42vw" priority /><span>STYLE INSPIRATION · FINAL MOCK-UP TO CONFIRM</span></div>
          </div>
        </section>
        <section className="topper-line-products shell" aria-labelledby="topper-line-products-title">
          <p className="eyebrow">STEP 2 / CHOOSE A PRODUCT</p>
          <h2 id="topper-line-products-title">Make it yours.</h2>
          <p>One custom product for every event. Choose the size, type your wording, preview your font, then choose cardstock, acrylic or wood and its colour.</p>
          <div className="topper-line-products__grid topper-line-products__grid--single">
            <article>
              <span className="topper-line-products__number">CUSTOM MADE</span>
              <h3>{topperProductName()}</h3>
              <p>Choose your topper size and enter your personalised wording on the product page.</p>
              <small>10–20 cm / 4–8 inch</small>
              <small><TopperStartingPrice /></small>
              <Link href={topperProductHref(chosen.slug)}>Customise your cake topper <span aria-hidden="true">→</span></Link>
            </article>
          </div>
          <p className="topper-line-products__price-note">Your exact item price appears as you choose material, finish and width. We&apos;ll confirm the design and ready date before payment.</p>
          {designs.length > 0 && <section className="topper-designs" aria-labelledby="topper-designs-title">
            <p className="eyebrow">NEED AN IDEA?</p>
            <h2 id="topper-designs-title">Design ideas for {chosen.name.toLowerCase()}.</h2>
            <p>Choose a look you like, then personalise the wording, size, material and colour. We&apos;ll send you a mock-up to confirm before making it.</p>
            <div className="topper-designs__grid">{designs.map((design) => <article className="topper-designs__card" key={design.id}>
              <div className="topper-designs__image"><SiteImage contentKey={`design.${design.id}Image`} alt={`${design.name} cake topper design inspiration`} fill sizes="(max-width: 650px) 48vw, (max-width: 1000px) 30vw, 22vw" /></div>
              <div className="topper-designs__caption"><span>{design.id}</span><h3>{design.name}</h3><Link href={`${topperProductHref(chosen.slug)}?design=${encodeURIComponent(design.id)}`}>Choose this style <span aria-hidden="true">→</span></Link></div>
            </article>)}</div>
          </section>}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
