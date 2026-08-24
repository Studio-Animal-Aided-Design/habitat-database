import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LifecycleDiagram, lifecyclePointerTick } from "./lifecycle-diagram";

const phases = [
  {
    key: "adult",
    label: "Adult",
    ringOrder: 1,
    color: "#F5C76D",
    segments: [{ startTick: 45, endTick: 135, wrapsYear: false }]
  },
  {
    key: "breeding",
    label: "Brut & Aufzucht",
    ringOrder: 2,
    color: "#6EB089",
    segments: [{ startTick: 52, endTick: 88, wrapsYear: false }]
  }
];

describe("LifecycleDiagram", () => {
  it("renders the 180-tick annual scale and both responsive presentations", () => {
    const markup = renderToStaticMarkup(<LifecycleDiagram
      phases={phases}
      phaseDetails={[{ phaseKey: "adult", title: "Adulte", text: "Tagaktiv.", sources: "Quelle" }]}
      fallbackAlt="Lebenszyklus"
    />);

    expect((markup.match(/<line/g) ?? []).length).toBe(181);
    expect((markup.match(/class="month-label"/g) ?? []).length).toBe(12);
    expect(markup).toContain("class=\"lifecycle-wheel\"");
    expect(markup).toContain("class=\"lifecycle-mobile\"");
    expect(markup).not.toContain("Originalgrafik");
    expect(markup).toContain("Lebensphase auswählen");
    expect(markup).not.toContain("Tagaktiv.");
    expect(markup).toContain("Beginn Brut &amp; Aufzucht");
    expect(markup).toContain("textPath");
    expect(markup).toContain("Winter");
    expect(markup).toContain("Frühling");
    expect(markup).toContain("Sommer");
    expect(markup).toContain("Herbst");
  });

  it("points to the beginning of breeding, independent of ring order", () => {
    expect(lifecyclePointerTick(phases)).toBe(52);
  });

  it("uses juvenile development as the meaningful fallback for insects", () => {
    expect(lifecyclePointerTick([
      { key: "adult", label: "Adult", ringOrder: 1, color: "#F5C76D", segments: [{ startTick: 20, endTick: 90, wrapsYear: false }] },
      { key: "larva_pupa", label: "Larve & Puppe", ringOrder: 2, color: "#6EB089", segments: [{ startTick: 61, endTick: 120, wrapsYear: false }] }
    ])).toBe(61);
  });
});
