"use client";

import Image, { type ImageProps } from "next/image";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import fields from "@/data/site-content.json";

export type SiteContentValues = Record<string, string>;

const defaults: SiteContentValues = Object.fromEntries(fields.map((field) => [field.key, field.default]));
const SiteContentContext = createContext<SiteContentValues>(defaults);

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<SiteContentValues>(defaults);

  useEffect(() => {
    let mounted = true;
    const refresh = () => { fetch("/api/site-content/", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((body) => {
        if (!mounted || !body?.values || typeof body.values !== "object") return;
        const safe = { ...defaults };
        for (const field of fields) {
          const value = body.values[field.key];
          if (typeof value === "string" && value.trim()) safe[field.key] = value;
        }
        setValues(safe);
      })
      .catch(() => {}); };
    refresh();
    window.addEventListener("udesign:site-content-changed", refresh);
    return () => { mounted = false; window.removeEventListener("udesign:site-content-changed", refresh); };
  }, []);

  return <SiteContentContext.Provider value={values}>{children}</SiteContentContext.Provider>;
}

export function useSiteValue(key: string) {
  return useContext(SiteContentContext)[key] ?? defaults[key] ?? "";
}

export function SiteText({ contentKey }: { contentKey: string }) {
  return <>{useSiteValue(contentKey)}</>;
}

export function SiteImage({ contentKey, ...props }: Omit<ImageProps, "src"> & { contentKey: string }) {
  return <Image {...props} src={useSiteValue(contentKey)} />;
}
