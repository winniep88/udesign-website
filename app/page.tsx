import Link from "next/link";
import { SiteImage, SiteText } from "@/components/SiteContent";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { WelcomePopup } from "@/components/WelcomePopup";

const brands = [
  {
    number: "01",
    eyebrow: "Business logos & signs",
    name: "UDESIGN PROJECTS",
    textKey: "home.projectsText",
    categories: "LOGO SIGNS · ACRYLIC SIGNS · WOOD SIGNS · PVC SIGNS",
    cta: "UDesign Projects — Explore Our Projects",
    href: "/projects/",
    imageKey: "home.projectsImage",
    imageAlt: "Concept image of layered acrylic and wood signage",
    className: "world-card--projects",
  },
  {
    number: "02",
    eyebrow: "Gifts & event décor",
    name: "UDESIGN MOMENTS",
    textKey: "home.momentsText",
    categories: "WEDDING DÉCOR · GIFTS · CORPORATE GIFTS · BABY KEEPSAKES",
    cta: "UDesign Moments — Discover Our Creations",
    href: "/moments/",
    imageKey: "home.momentsImage",
    imageAlt: "Concept image of an elegant acrylic wedding sign",
    className: "world-card--moments",
  },
  {
    number: "03",
    eyebrow: "Custom cake toppers",
    name: "WINNIE CAKE TOPPER",
    textKey: "home.winnieText",
    categories: "BIRTHDAY · WEDDING · BABY SHOWER · CELEBRATIONS",
    cta: "Winnie Cake Topper — Find Your Perfect Topper",
    href: "/winnie-cake-topper/",
    imageKey: "home.winnieImage",
    imageAlt: "Pastel cake with a gold acrylic Winnie name topper and rainbow decoration",
    className: "world-card--winnie",
  },
] as const;

export default function Home() {
  return (
    <>
      <SiteHeader active="home" />
      <WelcomePopup />
      <main>
        <section className="home-hero shell" aria-labelledby="home-title">
          <div className="home-hero__copy">
            <p className="eyebrow">CUSTOM MADE IN MALAYSIA <span className="eyebrow-line" /></p>
            <h1 id="home-title"><SiteText contentKey="home.heroLine1" /><br /><em><SiteText contentKey="home.heroLine2" /></em></h1>
            <p className="home-hero__lead"><SiteText contentKey="home.heroLead" /></p>
            <Link className="button button--dark" href="#our-worlds">Explore Our Creations</Link>
            <div className="home-hero__index" aria-hidden="true"><span>01 / 03</span><span>YOUR IDEA STARTS HERE</span></div>
          </div>
          <div className="home-hero__visual" aria-label="Preview of UDESIGN's three brand worlds">
            <Link href="/projects/" className="hero-tile hero-tile--projects">
              <SiteImage contentKey="home.projectsImage" alt="UDESIGN Projects showcase" fill sizes="(max-width: 750px) 55vw, 35vw" priority />
              <span>PROJECTS <small>Logos &amp; signs</small></span>
            </Link>
            <Link href="/moments/" className="hero-tile hero-tile--moments">
              <SiteImage contentKey="home.momentsImage" alt="UDESIGN Moments showcase" fill sizes="(max-width: 750px) 40vw, 23vw" priority />
              <span>MOMENTS <small>Gifts &amp; event décor</small></span>
            </Link>
            <Link href="/winnie-cake-topper/" className="hero-tile hero-tile--winnie">
              <SiteImage contentKey="home.winnieImage" alt="Winnie Cake Topper showcase" fill sizes="(max-width: 750px) 40vw, 23vw" priority />
              <span>WINNIE <small>Cake toppers</small></span>
            </Link>
          </div>
        </section>

        <div className="ticker" aria-hidden="true"><div>MADE PERSONAL <span>✳</span> MADE WITH PURPOSE <span>✳</span> MADE TO CELEBRATE <span>✳</span> MADE PERSONAL <span>✳</span> MADE WITH PURPOSE <span>✳</span></div></div>

        <section className="worlds-section" id="our-worlds" aria-labelledby="worlds-title">
          <div className="shell section-intro">
            <div><p className="eyebrow">EXPLORE UDESIGN</p><h2 id="worlds-title">What are you looking for?</h2></div>
            <p>Choose a collection by the item you need. Each has its own style, with one UDESIGN checkout.</p>
          </div>
          <div className="shell world-list">
            {brands.map((brand) => (
              <Link key={brand.number} href={brand.href} className={`world-card ${brand.className}`}>
                <div className="world-card__image"><SiteImage contentKey={brand.imageKey} alt={brand.imageAlt} fill sizes="(max-width: 750px) 100vw, 45vw" /></div>
                <div className="world-card__content">
                  <span className="world-card__number">{brand.number} / {brand.eyebrow}</span>
                  <h3>{brand.name}</h3>
                  <p><SiteText contentKey={brand.textKey} /></p>
                  <span className="world-card__categories">{brand.categories}</span>
                  <span className="world-card__link">{brand.cta}</span>
                </div>
              </Link>
            ))}
          </div>
          <p className="shell concept-note">Images show design concepts. Actual work and finishes vary by order.</p>
        </section>

        <section className="story-section shell" aria-labelledby="story-title">
          <div className="story-section__headline"><p className="eyebrow">THE UDESIGN WAY</p><h2 id="story-title"><SiteText contentKey="home.storyLine1" /><br /><em><SiteText contentKey="home.storyLine2" /></em></h2></div>
          <div className="story-section__steps">
            <div><span>01</span><h3>Tell us your idea</h3><p>Share the occasion, style, size or message you have in mind.</p></div>
            <div><span>02</span><h3>Make it yours</h3><p>We&apos;ll discuss materials, details and a quote for your piece.</p></div>
            <div><span>03</span><h3>Celebrate the result</h3><p>Once the design and order details are agreed, we bring it to life.</p></div>
          </div>
        </section>

        <div className="scroll-sticker-band" aria-hidden="true">
          <span className="scroll-sticker"><span>ONE STUDIO<br />MANY<br />POSSIBILITIES</span></span>
        </div>

        <section className="closing-section"><div className="shell closing-section__inner"><div><p className="eyebrow">READY WHEN YOU ARE</p><h2><SiteText contentKey="home.closingHeading" /></h2><p><SiteText contentKey="home.closingText" /></p></div><a className="button button--white" href="https://www.instagram.com/udesign_projects/" target="_blank" rel="noopener noreferrer">Start a conversation</a></div></section>
      </main>
      <SiteFooter />
    </>
  );
}
