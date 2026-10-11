import Link from "next/link";
import { whatsappLink } from "@/lib/contact";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell site-footer__top">
        <div className="site-footer__column">
          <span className="footer-label">Shop</span>
          <Link href="/projects/">Projects</Link>
          <Link href="/moments/">Moments</Link>
          <Link href="/winnie-cake-topper/">Winnie Cake Topper</Link>
        </div>
        <div className="site-footer__column">
          <span className="footer-label">Customer service</span>
          <a href={whatsappLink("Hi UDESIGN, I'd like to ask about your products.")} target="_blank" rel="noopener noreferrer">Contact on WhatsApp</a>
          <Link href="/cart/">Your cart</Link>
          <Link href="/privacy/">Privacy</Link>
        </div>
        <div className="site-footer__contact">
          <span className="footer-label">Stay in touch</span>
          <p>Questions about a design or an order? We&apos;re happy to help.</p>
          <a href="https://www.instagram.com/udesign_projects/" target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href="https://shopee.com.my/udesignprojectsstudio" target="_blank" rel="noopener noreferrer">Shopee</a>
        </div>
      </div>
      <div className="shell site-footer__wordmark" aria-hidden="true">UDesign.</div>
      <div className="shell site-footer__bottom"><span>© {new Date().getFullYear()} UDESIGN PROJECTS STUDIO</span><span>Designed by you, made to be yours.</span><span>Made in Malaysia</span></div>
    </footer>
  );
}
