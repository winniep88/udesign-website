import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const brands = [
  {
    number: "01",
    eyebrow: "Business logos & signs",
    name: "UDESIGN PROJECTS",
    text: "Custom logos and signs for your business or space, made in acrylic, wood or PVC.",
    categories: "LOGO SIGNS · ACRYLIC SIGNS · WOOD SIGNS · PVC SIGNS",
    href: "/projects/",
    image: "/images/projects.webp",
    imageAlt: "Concept image of layered acrylic and wood signage",
    className: "world-card--projects",
  },
  {
    number: "02",
    eyebrow: "Gifts & event décor",
    name: "UDESIGN MOMENTS",
    text: "Personalised decorations and keepsakes for weddings, celebrations, gifting and little ones.",
    categories: "WEDDING DÉCOR · GIFTS · CORPORATE GIFTS · BABY KEEPSAKES",
    href: "/moments/",
    image: "/images/moments.webp",
    imageAlt: "Concept image of an elegant acrylic wedding sign",
    className: "world-card--moments",
  },
  {
    number: "03",
    eyebrow: "Custom cake toppers",
    name: "WINNIE CAKE TOPPER",
    text: "Personalised cake toppers for birthdays, weddings and every reason to celebrate. Find us at @winniecaketopper.",
    categories: "BIRTHDAY · WEDDING · BABY SHOWER · CELEBRATIONS",
    href: "/winnie-cake-topper/",
    image: "/images/winnie.webp",
    imageAlt: "Concept image of a colourful acrylic cake decoration",
    className: "world-card--winnie",
  },
] as const;

export default function Home() {
  return (
    <>
      <SiteHeader active="home" />
      <main>
        <section className="home-hero shell" aria-labelledby="home-title">
          <div className="home-hero__copy">
            <p className="eyebrow">CUSTOM MADE IN MALAYSIA <span className="eyebrow-line" /></p>
            <h1 id="home-title">Designed by you,<br /><em>made to be yours.</em></h1>
            <p className="home-hero__lead">Need a business sign, a personal gift or a cake topper? Find what you&apos;re looking for across our three collections.</p>
            <Link className="button button--dark" href="#our-worlds">Find your world <span aria-hidden="true">↘</span></Link>
            <div className="home-hero__index" aria-hidden="true"><span>01 / 03</span><span>YOUR IDEA STARTS HERE</span></div>
          </div>
          <div className="home-hero__visual" aria-label="Preview of UDESIGN's three brand worlds">
            <Link href="/projects/" className="hero-tile hero-tile--projects">
              <Image src="/images/projects.webp" alt="Concept image of a custom acrylic and wood sign" fill sizes="(max-width: 750px) 55vw, 35vw" priority />
              <span>PROJECTS <small>Logos &amp; signs</small></span>
            </Link>
            <Link href="/moments/" className="hero-tile hero-tile--moments">
              <Image src="/images/moments.webp" alt="Concept image of a wedding sign" fill sizes="(max-width: 750px) 40vw, 23vw" priority />
              <span>MOMENTS <small>Gifts &amp; event décor</small></span>
            </Link>
            <Link href="/winnie-cake-topper/" className="hero-tile hero-tile--winnie">
              <Image src="/images/winnie.webp" alt="Concept image of a cake decoration" fill sizes="(max-width: 750px) 40vw, 23vw" priority />
              <span>WINNIE <small>Cake toppers</small></span>
            </Link>
            <span className="visual-sticker">ONE STUDIO<br />MANY POSSIBILITIES</span>
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
                <div className="world-card__image"><Image src={brand.image} alt={brand.imageAlt} fill sizes="(max-width: 750px) 100vw, 45vw" /></div>
                <div className="world-card__content">
                  <span className="world-card__number">{brand.number} / {brand.eyebrow}</span>
                  <h3>{brand.name}</h3>
                  <p>{brand.text}</p>
                  <span className="world-card__categories">{brand.categories}</span>
                  <span className="world-card__link">Enter this world <span aria-hidden="true">↗</span></span>
                </div>
              </Link>
            ))}
          </div>
          <p className="shell concept-note">Images show design concepts. Actual work and finishes vary by order.</p>
        </section>

        <section className="story-section shell" aria-labelledby="story-title">
          <div className="story-section__headline"><p className="eyebrow">THE UDESIGN WAY</p><h2 id="story-title">You imagine it.<br /><em>We make it real.</em></h2></div>
          <div className="story-section__steps">
            <div><span>01</span><h3>Tell us your idea</h3><p>Share the occasion, style, size or message you have in mind.</p></div>
            <div><span>02</span><h3>Make it yours</h3><p>We&apos;ll discuss materials, details and a quote for your piece.</p></div>
            <div><span>03</span><h3>Celebrate the result</h3><p>Once the design and order details are agreed, we bring it to life.</p></div>
          </div>
        </section>

        <section className="closing-section"><div className="shell closing-section__inner"><div><p className="eyebrow">READY WHEN YOU ARE</p><h2>Have something in mind?</h2><p>Tell us what you&apos;re dreaming up and we&apos;ll help you find a place to start.</p></div><a className="button button--white" href="https://www.instagram.com/udesign_projects/" target="_blank" rel="noopener noreferrer">Start a conversation <span aria-hidden="true">↗</span></a></div></section>
      </main>
      <SiteFooter />
    </>
  );
}
