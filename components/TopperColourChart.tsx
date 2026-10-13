import type { CSSProperties } from "react";
import { topperFinishes, type TopperMaterial } from "@/lib/topper";

type Swatch = { base: string; light: string; dark: string; effect: "glitter" | "matte" | "shiny" | "mirror" | "wood" };

const swatches: Record<TopperMaterial, Record<string, Swatch>> = {
  cardstock: {
    "Glitter Black": { base: "#29262e", light: "#8f8794", dark: "#121116", effect: "glitter" },
    "Glitter Dark Blue": { base: "#164681", light: "#83b9e6", dark: "#071f4e", effect: "glitter" },
    "Glitter Green": { base: "#227d62", light: "#8acbb4", dark: "#124b3e", effect: "glitter" },
    "Glitter Gold": { base: "#b69837", light: "#f8e4a0", dark: "#735617", effect: "glitter" },
    "Glitter Pink": { base: "#d85091", light: "#ffc0df", dark: "#892951", effect: "glitter" },
    "Glitter Purple": { base: "#9b69b9", light: "#dfc4f1", dark: "#5a3578", effect: "glitter" },
    "Glitter Silver": { base: "#a9aeb5", light: "#fbfdff", dark: "#626a77", effect: "glitter" },
    "Matte Black": { base: "#252327", light: "#514d54", dark: "#171519", effect: "matte" },
    "Shiny Gold": { base: "#c7a145", light: "#fff1ae", dark: "#805a16", effect: "shiny" },
    "Shiny Rose Gold": { base: "#c89183", light: "#ffe7db", dark: "#8e584b", effect: "shiny" },
    "Shiny Silver": { base: "#b8bec7", light: "#ffffff", dark: "#707985", effect: "shiny" },
  },
  acrylic: {
    Black: { base: "#242127", light: "#615b65", dark: "#121014", effect: "matte" },
    Blue: { base: "#3868ad", light: "#91b8eb", dark: "#234474", effect: "matte" },
    Green: { base: "#468e73", light: "#a4d3b9", dark: "#28644f", effect: "matte" },
    Grey: { base: "#969ba3", light: "#d6d9dd", dark: "#646a73", effect: "matte" },
    "Matte gold": { base: "#bea05b", light: "#e4d3a6", dark: "#8d7136", effect: "matte" },
    "Mirror Copper": { base: "#ad7151", light: "#ffe2c5", dark: "#70402c", effect: "mirror" },
    "Mirror Gold": { base: "#cfa63d", light: "#fff7cf", dark: "#8b5e13", effect: "mirror" },
    "Mirror Rose Gold": { base: "#c88e86", light: "#fff0e8", dark: "#915a56", effect: "mirror" },
    "Mirror Silver": { base: "#b6bec8", light: "#ffffff", dark: "#68717c", effect: "mirror" },
    Pink: { base: "#dfa5bd", light: "#f7d6e2", dark: "#a96b85", effect: "matte" },
    Red: { base: "#b9434d", light: "#eaa0a3", dark: "#81212c", effect: "matte" },
    Yellow: { base: "#ebc756", light: "#fff0a2", dark: "#b5902b", effect: "matte" },
  },
  wood: {
    "Natural wood": { base: "#d1a874", light: "#e8ca9c", dark: "#aa7d4f", effect: "wood" },
    "Brown wood": { base: "#865a3c", light: "#b38862", dark: "#593821", effect: "wood" },
  },
};

const materialNames: Record<TopperMaterial, string> = { cardstock: "Cardstock", acrylic: "Acrylic", wood: "Wood" };

export function TopperColourChart({ material, selectedFinish }: { material: TopperMaterial; selectedFinish: string }) {
  return <figure className="topper-colour-chart" aria-label={`${materialNames[material]} colour chart`}>
    <div className="topper-colour-chart__heading">
      <span>Colour Chart</span>
      <strong>{materialNames[material]} {material === "wood" ? "finishes" : "colours"}</strong>
    </div>
    <div className="topper-colour-chart__grid">
      {topperFinishes[material].map(({ name }) => {
        const swatch = swatches[material][name] ?? { base: "#c9bbc1", light: "#e4dce0", dark: "#8a7981", effect: "matte" };
        const style = { "--swatch-base": swatch.base, "--swatch-light": swatch.light, "--swatch-dark": swatch.dark } as CSSProperties;
        return <div className={`topper-colour-chart__item${selectedFinish === name ? " is-selected" : ""}`} key={name}>
          <span className={`topper-colour-chart__swatch topper-colour-chart__swatch--${swatch.effect}`} style={style} aria-hidden="true" />
          <span>{name}</span>
        </div>;
      })}
    </div>
    <figcaption>Colours shown are a guide. Choose your finish below; the actual material may look slightly different.</figcaption>
  </figure>;
}
