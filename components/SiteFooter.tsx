import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell site-footer__top">
        <div>
          <Link href="/" className="footer-wordmark">UDESIGN<span>.</span></Link>
          <p>Designed by you, made to be yours.</p>
        </div>
        <div className="site-footer__links">
          <div>
            <span className="footer-label">Explore</span>
            <Link href="/projects/">Projects</Link>
            <Link href="/moments/">Moments</Link>
            <Link href="/winnie-cake-topper/">Winnie Cake Topper</Link>
          </div>
          <div>
            <span className="footer-label">Find us</span>
            <a href="https://www.instagram.com/udesign_projects/" target="_blank" rel="noopener noreferrer">Instagram ↗</a>
            <a href="https://shopee.com.my/udesignprojectsstudio" target="_blank" rel="noopener noreferrer">Shopee ↗</a>
          </div>
        </div>
      </div>
      <div className="shell site-footer__bottom"><span>© {new Date().getFullYear()} UDESIGN PROJECTS STUDIO</span><span>Made in Malaysia</span></div>
    </footer>
  );
}
