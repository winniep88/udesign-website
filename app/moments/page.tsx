import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

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

export default function MomentsPage() {
  return (
    <div className="moments-page">
      <SiteHeader active="moments" />
      <main>
        <section className="moments-hero shell">
          <div className="moments-hero__image"><Image src="/images/moments.webp" alt="Concept image of a floral acrylic wedding sign" fill sizes="(max-width: 750px) 100vw, 45vw" priority /><span className="image-label">DESIGN CONCEPT / WEDDING</span></div>
          <div className="moments-hero__copy"><p className="eyebrow">02 / THE THOUGHTFUL ONE</p><span className="moments-hero__brand">UDESIGN MOMENTS</span><h1>For the moments<br /><em>you hold close.</em></h1><p>Beautifully personal pieces for the people and occasions that matter most.</p><a className="button button--outline" href="#moments-categories">Explore the moments <span aria-hidden="true">↓</span></a></div>
        </section>

        <section className="moments-categories" id="moments-categories" aria-labelledby="moments-categories-title"><div className="shell"><div className="moments-section-heading"><p className="eyebrow">THE COLLECTIONS</p><h2 id="moments-categories-title">A detail for every story.</h2><p>Each one begins with a person, a feeling or a day worth remembering.</p></div><div className="moments-grid">{moments.map((item) => <article key={item.name} className={`moment-category ${item.className}`}><span>{item.number} / MOMENTS</span><div><h3>{item.name}</h3><p>{item.detail}</p></div></article>)}</div></div></section>

        <section className="moments-quote shell"><span aria-hidden="true">✳</span><blockquote>It&apos;s the little things<br />that stay with us.</blockquote><p>Have a detail in mind? We&apos;d love to make it yours.</p><a className="button button--dark" href="https://www.instagram.com/udesign_projects/" target="_blank" rel="noopener noreferrer">Share your idea <span aria-hidden="true">↗</span></a></section>
        <div className="shell back-worlds"><Link href="/">← Back to all UDESIGN worlds</Link></div>
      </main>
      <SiteFooter />
    </div>
  );
}
