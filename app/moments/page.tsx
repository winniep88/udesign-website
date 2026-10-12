import type { Metadata } from "next";
import Link from "next/link";
import { SiteImage, SiteText } from "@/components/SiteContent";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCatalog } from "@/components/ProductCatalog";
import { CustomRequest } from "@/components/CustomRequest";
import { productsForBrand } from "@/lib/catalog";
import { whatsappLink } from "@/lib/contact";

export const metadata: Metadata = {
  title: "UDESIGN MOMENTS — Wedding, gifts, corporate, baby & kids",
  description: "Personal pieces for weddings, gifting, teams, babies and children by UDESIGN MOMENTS.",
};

const moments = [
  { name: "Wedding", detail: "Welcome signs, place names and the details that make the day feel like yours.", className: "moment-category--wedding", number: "01" },
  { name: "Gifts", detail: "A name, a message, a memory. Thoughtful keepsakes made for someone special.", className: "moment-category--gifts", number: "02" },
  { name: "Corporate", detail: "Personalised appreciation pieces for clients, colleagues and teams.", className: "moment-category--corporate", number: "03" },
  { name: "Baby & Kids", detail: "Sweet name signs, milestone pieces and keepsakes for little beginnings.", className: "moment-category--baby", number: "04" },
] as const;

const weddingSettings = ["W001", "W002", "W003", "W004"] as const;

export default function MomentsPage() {
  return (
    <div className="moments-page">
      <SiteHeader active="moments" />
      <main>
        <section className="moments-hero shell">
          <div className="moments-hero__image"><SiteImage contentKey="moments.heroImage" alt="UDESIGN Moments showcase" fill sizes="(max-width: 750px) 100vw, 45vw" priority /><span className="image-label">DESIGN CONCEPT / WEDDING</span></div>
          <div className="moments-hero__copy"><p className="eyebrow">02 / THE THOUGHTFUL ONE</p><span className="moments-hero__brand">UDESIGN MOMENTS</span><h1><SiteText contentKey="moments.heroLine1" /><br /><em><SiteText contentKey="moments.heroLine2" /></em></h1><p><SiteText contentKey="moments.heroLead" /></p><a className="button button--outline" href="#products">Shop products &amp; prices <span aria-hidden="true">↓</span></a></div>
        </section>

        <section className="moments-categories" id="moments-categories" aria-labelledby="moments-categories-title"><div className="shell"><div className="moments-section-heading"><p className="eyebrow">THE COLLECTIONS</p><h2 id="moments-categories-title">A detail for every story.</h2><p>Each one begins with a person, a feeling or a day worth remembering.</p><p className="collection-note">Browse the products below to choose an option and see its price.</p></div><div className="moments-grid">{moments.map((item) => <article key={item.name} className={`moment-category ${item.className}`}><span>{item.number} / MOMENTS</span><div><h3>{item.name}</h3><p>{item.detail}</p></div><a className="collection-browse" href="#products">Browse products ↓</a></article>)}</div></div></section>

        <section className="moments-inspiration shell" aria-labelledby="moments-inspiration-title"><p className="eyebrow">WEDDING IDEAS</p><h2 id="moments-inspiration-title">A setting made for your story.</h2><p>Explore these wedding setting ideas. Tell us which look you like and we&apos;ll discuss the details and price with you.</p><div className="moments-inspiration__grid">{weddingSettings.map((code) => <a key={code} href={whatsappLink(`Hi UDESIGN, I like wedding setting idea ${code}. Could you tell me about the options and price?`)} target="_blank" rel="noopener noreferrer"><div><SiteImage contentKey={`moments.wedding${code}Image`} alt={`Wedding setting design idea ${code}`} fill sizes="(max-width: 650px) 48vw, 25vw" /></div><span>IDEA {code} · ASK ABOUT THIS LOOK ↗</span></a>)}</div><small>Design inspiration. We&apos;ll confirm the materials, layout and final price with you before an order.</small></section>

        <ProductCatalog brand="moments" products={productsForBrand("moments")} />
        <CustomRequest brand="Moments" />
        <section className="moments-quote shell"><span aria-hidden="true">✳</span><blockquote>It&apos;s the little things<br />that stay with us.</blockquote><p>Have a detail in mind? We&apos;d love to make it yours.</p><a className="button button--dark" href={whatsappLink("Hi UDESIGN, I'd like to discuss a custom Moments piece.")} target="_blank" rel="noopener noreferrer">Share your idea <span aria-hidden="true">↗</span></a></section>
        <div className="shell back-worlds"><Link href="/">← Back to all UDESIGN worlds</Link></div>
      </main>
      <SiteFooter />
    </div>
  );
}
