"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { topperCanonicalProductHref, topperEvent, topperLineCounts, topperLineLabel, topperProductHref, type TopperLineCount } from "@/lib/topper";

export function TopperProductSwitch({ lineCount }: { lineCount: TopperLineCount }) {
  const [eventSlug, setEventSlug] = useState("");
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("event") ?? "";
    if (topperEvent(requested)) setEventSlug(requested);
  }, []);

  return <nav className="topper-product-switch" aria-label="Choose number of lines">
    {topperLineCounts.map((lines) => <Link key={lines} aria-current={lineCount === lines ? "page" : undefined} href={eventSlug ? topperProductHref(eventSlug, lines) : topperCanonicalProductHref(lines)}>{topperLineLabel(lines)}</Link>)}
  </nav>;
}
