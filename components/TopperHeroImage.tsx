"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { topperEventDesigns, type TopperEventSlug } from "@/lib/topper";

export function TopperHeroImage({ eventSlug }: { eventSlug: TopperEventSlug }) {
  const designs = topperEventDesigns[eventSlug];
  const [selectedId, setSelectedId] = useState("");
  useEffect(() => {
    setSelectedId(new URLSearchParams(window.location.search).get("design") ?? "");
  }, []);
  const design = designs.find((item) => item.id === selectedId);
  const displayImage = design ?? designs[0];
  return <>
    <div className={`custom-topper__image${design ? " custom-topper__image--design" : ""}`}>
      <Image src={displayImage?.imageSrc ?? "/images/winnie.webp"} alt={design ? `${design.name} cake topper design inspiration` : "Cake topper style inspiration"} fill sizes={design ? "(max-width: 900px) min(100vw, 440px), 440px" : "(max-width: 900px) 100vw, 42vw"} priority />
      {!design && <span>STYLE INSPIRATION · NOT A PRODUCT PHOTO</span>}
    </div>
    {design && <p className="custom-topper__image-caption">{design.id} · DESIGN INSPIRATION</p>}
  </>;
}
