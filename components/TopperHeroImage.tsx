"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { topperEvent, topperEventDesigns, type TopperEventSlug } from "@/lib/topper";
import { useSiteValue } from "@/components/SiteContent";

export function TopperHeroImage({ eventSlug }: { eventSlug: TopperEventSlug }) {
  const designs = topperEventDesigns[eventSlug];
  const [selectedId, setSelectedId] = useState("");
  useEffect(() => {
    setSelectedId(new URLSearchParams(window.location.search).get("design") ?? "");
  }, []);
  const design = designs.find((item) => item.id === selectedId);
  const displayImage = useSiteValue(design ? `design.${design.id}Image` : `event.${eventSlug}Image`) || "/images/winnie.webp";
  return <>
    <div className={`custom-topper__image custom-topper__image--design${design ? "" : " custom-topper__image--event"}`}>
      <Image src={displayImage} alt={design ? `${design.name} cake topper design inspiration` : `Custom cake topper for a ${topperEvent(eventSlug)?.name.toLowerCase() ?? "special"} celebration`} fill sizes="(max-width: 900px) min(100vw, 440px), 440px" priority />
      {!design && <span>STYLE INSPIRATION · NOT A PRODUCT PHOTO</span>}
    </div>
    {design && <p className="custom-topper__image-caption">{design.id} · DESIGN INSPIRATION</p>}
  </>;
}
