import Link from "next/link";

type SiteHeaderProps = {
  active?: "home" | "projects" | "moments" | "winnie";
  light?: boolean;
};

const links = [
  { href: "/projects/", label: "Projects", key: "projects" },
  { href: "/moments/", label: "Moments", key: "moments" },
  { href: "/winnie-cake-topper/", label: "Winnie Cake Topper", key: "winnie" },
] as const;

export function SiteHeader({ active = "home", light = false }: SiteHeaderProps) {
  return (
    <header className={`site-header ${light ? "site-header--light" : ""}`}>
      <div className="site-header__inner shell">
        <Link href="/" className="wordmark" aria-label="UDESIGN PROJECTS STUDIO, home">
          <span className="wordmark__main">UDESIGN<span className="wordmark__dot">.</span></span>
          <span className="wordmark__sub">PROJECTS STUDIO</span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map((link) => (
            <Link
              key={link.key}
              className={active === link.key ? "is-active" : ""}
              href={link.href}
              aria-current={active === link.key ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <a className="header-contact" href="https://www.instagram.com/udesign_projects/" target="_blank" rel="noopener noreferrer">
          Let&apos;s talk <span aria-hidden="true">↗</span>
        </a>
        <details className="mobile-menu">
          <summary aria-label="Open menu"><span></span><span></span></summary>
          <nav aria-label="Mobile navigation">
            <Link href="/">Home</Link>
            {links.map((link) => <Link key={link.key} href={link.href}>{link.label}</Link>)}
            <a href="https://www.instagram.com/udesign_projects/" target="_blank" rel="noopener noreferrer">Contact on Instagram ↗</a>
          </nav>
        </details>
      </div>
    </header>
  );
}
