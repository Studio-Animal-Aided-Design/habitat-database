import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LifecycleDiagram } from "./lifecycle-diagram";

const phases = [
  {
    key: "adult",
    label: "Adult",
    ringOrder: 1,
    color: "#F5C76D",
    segments: [{ startTick: 45, endTick: 135, wrapsYear: false }]
  }
];

describe("LifecycleDiagram", () => {
  it("renders the 180-tick annual scale and both responsive presentations", () => {
    const markup = renderToStaticMarkup(<LifecycleDiagram
      phases={phases}
      phaseDetails={[{ phaseKey: "adult", title: "Adulte", text: "Tagaktiv.", sources: "Quelle" }]}
      originalImage={{ url: "/lifecycle.png", alt: "Original", attribution: "Studio", type: "lifecycle" }}
      fallbackAlt="Lebenszyklus"
    />);

    expect((markup.match(/<line/g) ?? []).length).toBe(181);
    expect((markup.match(/class="month-label"/g) ?? []).length).toBe(12);
    expect(markup).toContain("class=\"lifecycle-wheel\"");
    expect(markup).toContain("class=\"lifecycle-mobile\"");
    expect(markup).toContain("Originalgrafik");
    expect(markup).toContain("Tagaktiv.");
    expect(markup).toContain("textPath");
    expect(markup).toContain("Winter");
    expect(markup).toContain("Frühling");
    expect(markup).toContain("Sommer");
    expect(markup).toContain("Herbst");
  });
});
