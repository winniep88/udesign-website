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
  title: "UDESIGN PROJECTS — Logos, acrylic, wood & PVC",
  description: "Custom logos and dimensional signs in acrylic, wood and PVC by UDESIGN PROJECTS.",
};

const categories = [
  { number: "01", title: "Logo signs", body: "Turn your identity into something people can see and feel, from dimensional lettering to standout wall pieces." },
  { number: "02", title: "Acrylic", body: "Clean lines, rich colour and a polished finish for signs, displays and details with impact." },
  { number: "03", title: "Wood", body: "Natural texture and warmth for personalised boards, lettering and layered designs." },
  { number: "04", title: "PVC", body: "A versatile option for bold shapes, lettering and lightweight display pieces." },
] as const;

export default function ProjectsPage() {
  return (
    <div className="projects-page">
      <SiteHeader active="projects" light />
      <main>
        <section className="projects-hero">
          <div className="shell projects-hero__grid">
            <div className="projects-hero__copy">
              <p className="eyebrow">01 / THE BOLD ONE</p>
              <p className="projects-hero__brand">UDESIGN <strong>PROJECTS</strong></p>
              <h1>Make your<br /><em>mark.</em></h1>
              <p>Signs and pieces that give your idea a place in the world. Custom made for your brand, business or space.</p>
              <a className="button button--orange" href="#products">Shop Projects <span aria-hidden="true">↓</span></a>
            </div>
            <div className="projects-hero__image"><Image src="/images/projects.webp" alt="Concept image of a layered acrylic and wood sign" fill sizes="(max-width: 750px) 100vw, 50vw" priority /><span className="image-label">DESIGN CONCEPT / SIGNAGE</span></div>
          </div>
          <div className="projects-hero__rail shell"><span>LOGO</span><span>ACRYLIC</span><span>WOOD</span><span>PVC</span></div>
        </section>

        <section className="projects-categories shell" aria-labelledby="projects-categories-title">
          <div className="section-intro"><div><p className="eyebrow">WHAT WE MAKE</p><h2 id="projects-categories-title">Built to stand out.</h2></div><p>Choose the material or format that fits your idea. We&apos;ll work through the details together.</p></div>
          <div className="projects-grid">
            {categories.map((item) => <article key={item.number} className="projects-category"><span>{item.number} / 04</span><h3>{item.title}</h3><p>{item.body}</p><span className="projects-category__shape" aria-hidden="true"></span></article>)}
          </div>
        </section>

        <ProductCatalog brand="projects" products={productsForBrand("projects")} />
        <CustomRequest brand="Projects" />
        <section className="projects-message"><div className="shell projects-message__inner"><span>YOUR IDEA HAS DIMENSION.</span><h2>Let&apos;s give it shape.</h2><a className="button button--dark" href={whatsappLink("Hi UDESIGN, I'd like to discuss a custom Projects piece.")} target="_blank" rel="noopener noreferrer">Ask about a custom piece <span aria-hidden="true">↗</span></a></div></section>
        <div className="shell back-worlds"><Link href="/">← Back to all UDESIGN worlds</Link></div>
      </main>
      <SiteFooter />
    </div>
  );
}
