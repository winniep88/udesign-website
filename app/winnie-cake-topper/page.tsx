import type { Metadata } from "next";
import Link from "next/link";
import { SiteImage, SiteText } from "@/components/SiteContent";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCatalog } from "@/components/ProductCatalog";
import { CustomRequest } from "@/components/CustomRequest";
import { TopperEventPicker } from "@/components/TopperEventPicker";
import { productsForBrand } from "@/lib/catalog";
import { whatsappLink } from "@/lib/contact";
import { topperEventHref, topperEvents } from "@/lib/topper";

export const metadata: Metadata = {
  title: "WINNIE CAKE TOPPER by Udesign — Celebration pieces",
  description: "Choose an event, then personalise a custom cake topper with Winnie Cake Topper by UDESIGN.",
};

const featuredIdeas = topperEvents.map((event) => ({ event: event.name, href: topperEventHref(event.slug), slug: event.slug }));

export default function WinniePage() {
  return (
    <div className="winnie-page">
      <SiteHeader active="winnie" />
      <main>
        <section className="winnie-hero" id="choose-event">
          <div className="shell winnie-hero__inner">
            <div className="winnie-hero__copy">
              <p className="eyebrow">WINNIE CAKE TOPPER BY UDESIGN</p>
              <span className="winnie-hero__brand">WINNIE CAKE TOPPER <small>by Udesign</small></span>
              <h1><SiteText contentKey="winnie.heroLine1" /><br /><em><SiteText contentKey="winnie.heroLine2" /></em></h1>
              <p><SiteText contentKey="winnie.heroLead" /></p>
              <TopperEventPicker />
              <a className="winnie-instagram-link" href="https://www.instagram.com/winniecaketopper/" target="_blank" rel="noopener noreferrer">See our real toppers on Instagram</a>
            </div>
            <div className="winnie-hero__image"><SiteImage contentKey="winnie.heroImage" alt="Winnie Cake Topper showcase" fill sizes="(max-width: 750px) 100vw, 50vw" priority /></div>
          </div>
        </section>

        <section className="custom-topper-feature shell" aria-labelledby="custom-topper-feature-title">
          <div><p className="eyebrow">YOUR TOPPER, YOUR WAY</p><h2 id="custom-topper-feature-title">One custom topper. Your choices.</h2><p>For every event, choose your wording, font, cardstock, acrylic or wood, its matching colour or finish, and your topper width.</p></div>
          <a href="#choose-event">Choose your event <span aria-hidden="true">↑</span></a>
        </section>

        <section className="winnie-ideas shell" aria-labelledby="winnie-ideas-title"><p className="eyebrow">CHOOSE AN OCCASION</p><h2 id="winnie-ideas-title">Find your starting point.</h2><p>Browse topper ideas for your celebration, or create one entirely your own.</p><div className="winnie-ideas__grid">{featuredIdeas.map((idea) => <Link key={idea.event} href={idea.href}><div><SiteImage contentKey={`event.${idea.slug}Image`} alt={`${idea.event} cake topper design inspiration`} fill sizes="(max-width: 650px) 100vw, 30vw" /></div><span>{idea.event} <span aria-hidden="true">→</span></span></Link>)}</div></section>

        <section className="winnie-collections shell" aria-labelledby="winnie-collections-title"><p className="eyebrow">MORE TO EXPLORE</p><h2 id="winnie-collections-title">Little pieces, big celebrations.</h2><p className="collection-note">Browse other listed pieces below, or start above with your event for a custom cake topper.</p><div className="winnie-grid"><article><span>01 / THE TOPPING</span><h3>Cake toppers</h3><p>Names, themes and joyful finishing touches for the cake at the centre of it all.</p><a className="collection-browse" href="#products">Browse toppers</a></article><article><span>02 / THE LITTLE EXTRAS</span><h3>Celebration pieces</h3><p>Personal details to make birthdays, parties and special days feel more like yours.</p><a className="collection-browse" href="#products">Browse pieces</a></article></div></section>

        <ProductCatalog brand="winnie" products={productsForBrand("winnie").filter((product) => product.id !== "4911844020" && product.id !== "4306939371")} />
        <CustomRequest brand="cake topper or celebration" />
        <section className="winnie-ending"><div className="shell"><span>MAKE IT A DAY TO REMEMBER</span><h2>Every celebration<br />deserves its own sparkle.</h2><a className="button button--white" href={whatsappLink("Hi UDESIGN, I'd like to discuss a custom cake topper or celebration piece.")} target="_blank" rel="noopener noreferrer">Ask about a custom piece <span aria-hidden="true">↗</span></a></div></section>
        <div className="shell back-worlds"><Link href="/">← Back to all UDESIGN worlds</Link></div>
      </main>
      <SiteFooter />
    </div>
  );
}
