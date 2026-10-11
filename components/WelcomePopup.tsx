"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "@/components/AccountProvider";

const SEEN_KEY = "udesign-welcome-seen-v1";

export function WelcomePopup() {
  const { loading, user } = useAccount();
  const [open, setOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (loading || user) return;
    try {
      if (window.localStorage.getItem(SEEN_KEY)) return;
    } catch { return; }

    const timer = window.setTimeout(() => {
      try { window.localStorage.setItem(SEEN_KEY, "1"); } catch { return; }
      setOpen(true);
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [loading, user]);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;
  return (
    <div className="welcome-popup__backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="welcome-popup" role="dialog" aria-modal="true" aria-labelledby="welcome-popup-title" aria-describedby="welcome-popup-description">
        <button ref={closeButton} className="welcome-popup__close" type="button" aria-label="Close welcome message" onClick={() => setOpen(false)}>×</button>
        <p className="welcome-popup__eyebrow">HELLO, AND WELCOME</p>
        <h2 id="welcome-popup-title">Your idea starts here<span>.</span></h2>
        <p id="welcome-popup-description">Discover custom signs, meaningful gifts and cake toppers, all made personal by UDESIGN Projects Studio.</p>
        <Link className="welcome-popup__button" href="/#our-worlds" onClick={() => setOpen(false)}>Explore Our Creations</Link>
        <p className="welcome-popup__signoff">Designed by you, made to be yours.</p>
      </section>
    </div>
  );
}
