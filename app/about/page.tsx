import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./about.css";

export const metadata: Metadata = {
  title: "About us",
  description: "The story behind UDESIGN PROJECTS STUDIO and the personalised pieces we make in Malaysia.",
};

export default function AboutPage() {
  return <div className="about-page">
    <SiteHeader active="about" />
    <main>
      <section className="about-hero">
        <div className="shell about-hero__inner">
          <p className="eyebrow">OUR STORY</p>
          <h1>A little more happiness.<br /><em>A little more love.</em></h1>
          <p>UDESIGN PROJECTS STUDIO began with a simple wish: to make thoughtful things that bring people joy.</p>
        </div>
      </section>
      <section className="shell about-story">
        <div className="about-story__aside"><span>01 / THE BEGINNING</span><strong>Made for the moments that matter.</strong></div>
        <div className="about-story__body">
          <h2>From an idea to something you can hold.</h2>
          <p>While pursuing her PhD, our founder wondered how else she could contribute to the world. She imagined gifts that make someone feel loved, decorations that brighten a celebration, and keepsakes that hold on to a precious memory. That idea became UDESIGN.</p>
          <p>Today we bring those stories to life through thoughtful design, laser cutting and engraving. From wood and acrylic signage to personalised gifts and cake toppers, each piece is made for a person, a place or a moment worth celebrating.</p>
        </div>
      </section>
      <section className="about-quote"><div className="shell"><p>“Not factory-perfect.<br /><em>Handmade-perfect.</em>”</p><span>CREATED WITH A HUMAN TOUCH</span></div></section>
      <section className="shell about-closing"><p className="eyebrow">MADE WITH CARE IN MALAYSIA</p><h2>Every celebration has a story.<br />We&apos;d love to be part of yours.</h2><p>A little creativity, a little thoughtfulness and a little more love, shared through the things we create.</p><Link href="/#our-worlds" className="button button--dark">Explore our creations <span aria-hidden="true">→</span></Link><small>UDESIGN PROJECTS STUDIO · Crafting Moments, Creating Memories.</small></section>
    </main>
    <SiteFooter />
  </div>;
}
