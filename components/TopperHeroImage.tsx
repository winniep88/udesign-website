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
  const design = designs.find((item) => item.id === selectedId) ?? designs[0];
  return <div className="custom-topper__image">
    <Image src={design?.imageSrc ?? "/images/winnie.webp"} alt={design ? `${design.name} cake topper design inspiration` : "Cake topper style inspiration"} fill sizes="(max-width: 900px) 100vw, 42vw" priority />
    <span>{design ? `${design.id} · DESIGN INSPIRATION` : "STYLE INSPIRATION · NOT A PRODUCT PHOTO"}</span>
  </div>;
}
