import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteText } from "@/components/SiteContent";
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
          <h1><SiteText contentKey="about.heroLine1" /><br /><em><SiteText contentKey="about.heroLine2" /></em></h1>
          <p><SiteText contentKey="about.intro" /></p>
        </div>
      </section>
      <section className="shell about-story">
        <div className="about-story__aside"><span>01 / THE BEGINNING</span><strong>Made for the moments that matter.</strong></div>
        <div className="about-story__body">
          <h2><SiteText contentKey="about.storyHeading" /></h2>
          <p><SiteText contentKey="about.story1" /></p>
          <p><SiteText contentKey="about.story2" /></p>
        </div>
      </section>
      <section className="about-quote"><div className="shell"><p>“Not factory-perfect.<br /><em>Handmade-perfect.</em>”</p><span>CREATED WITH A HUMAN TOUCH</span></div></section>
      <section className="shell about-closing"><p className="eyebrow">MADE WITH CARE IN MALAYSIA</p><h2>Every celebration has a story.<br />We&apos;d love to be part of yours.</h2><p><SiteText contentKey="about.closing" /></p><Link href="/#our-worlds" className="button button--dark">Explore our creations <span aria-hidden="true">→</span></Link><small>UDESIGN PROJECTS STUDIO · Crafting Moments, Creating Memories.</small></section>
    </main>
    <SiteFooter />
  </div>;
}
