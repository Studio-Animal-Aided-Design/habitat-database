"use client";

import Image from "next/image";
import { useId, useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { ImageAsset, LifecyclePhase, LifecycleSegment } from "@/lib/catalog/types";

const C = 320;
const TICKS = 180;
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const round = (value: number) => Number(value.toFixed(3));
const seasons = [
  { name: "Winter", months: ["Dez", "Jan", "Feb"], start: 165, end: 30, color: "#b9dfe7" },
  { name: "Frühling", months: ["Mär", "Apr", "Mai"], start: 30, end: 75, color: "#dcefae" },
  { name: "Sommer", months: ["Jun", "Jul", "Aug"], start: 75, end: 120, color: "#f5c76d" },
  { name: "Herbst", months: ["Sep", "Okt", "Nov"], start: 120, end: 165, color: "#dda06d" }
];

export type LifecyclePhaseDetail = { phaseKey: string; title: string; text?: string; sources?: string };
type LifecycleDiagramProps = { phases: LifecyclePhase[]; phaseDetails?: LifecyclePhaseDetail[]; originalImage: ImageAsset; fallbackAlt: string };

function point(radius: number, tick: number) {
  const angle = -Math.PI / 2 + 2 * Math.PI * tick / TICKS;
  return { x: round(C + radius * Math.cos(angle)), y: round(C + radius * Math.sin(angle)) };
}

function arcPath(radius: number, start: number, end: number) {
  const effectiveEnd = end <= start ? end + TICKS : end;
  if (effectiveEnd - start >= TICKS) {
    const a = point(radius, 0), b = point(radius, 90);
    return `M ${a.x} ${a.y} A ${radius} ${radius} 0 1 1 ${b.x} ${b.y} A ${radius} ${radius} 0 1 1 ${a.x} ${a.y}`;
  }
  const a = point(radius, start), b = point(radius, effectiveEnd % TICKS);
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${effectiveEnd - start > 90 ? 1 : 0} 1 ${b.x} ${b.y}`;
}

function activeAt(segment: LifecycleSegment, tick: number) {
  return segment.wrapsYear ? tick >= segment.startTick || tick < segment.endTick : tick >= segment.startTick && tick < segment.endTick;
}

function phasePeriod(phase: LifecyclePhase) {
  return phase.segments.map((segment) => {
    const startMonth = MONTHS[Math.floor(segment.startTick / 15) % 12];
    const endTick = (segment.endTick - 1 + TICKS) % TICKS;
    const endMonth = MONTHS[Math.floor(endTick / 15) % 12];
    return startMonth === endMonth ? startMonth : `${startMonth} bis ${endMonth}`;
  }).join(" · ");
}

export function LifecycleDiagram({ phases, phaseDetails = [], originalImage, fallbackAlt }: LifecycleDiagramProps) {
  const id = useId().replaceAll(":", "");
  const sorted = useMemo(() => [...phases].sort((a, b) => a.ringOrder - b.ringOrder), [phases]);
  const [selected, setSelected] = useState(sorted[0]?.key ?? "");
  const [view, setView] = useState<"interactive" | "original">("interactive");
  if (!sorted.length) return <p className="lifecycle-unavailable">{fallbackAlt}</p>;

  const maxRings = Math.max(...sorted.map((phase) => phase.ringOrder));
  const clockRadius = 164;
  const ringWidth = maxRings > 4 ? 23 : 30;
  const ringGap = 2;
  const firstRadius = clockRadius + ringWidth / 2 + 3;
  const phaseOuter = firstRadius + (maxRings - 1) * (ringWidth + ringGap) + ringWidth / 2;
  const seasonRadius = phaseOuter + 15;
  const pointer = point(seasonRadius + 2, 67);
  const selectedPhase = sorted.find((phase) => phase.key === selected) ?? sorted[0];
  const selectedDetail = phaseDetails.find((detail) => detail.phaseKey === selectedPhase.key);

  const selectWithKeyboard = (event: KeyboardEvent<SVGGElement>, key: string) => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(key); }
  };

  return <div className="lifecycle-card">
    <div className="lifecycle-view-switcher" role="tablist" aria-label="Darstellung des Lebenszyklus">
      <button type="button" role="tab" aria-selected={view === "interactive"} onClick={() => setView("interactive")}>Interaktiv</button>
      <button type="button" role="tab" aria-selected={view === "original"} onClick={() => setView("original")}>Originalgrafik</button>
    </div>

    {view === "original" ? <div className="lifecycle-original">
      <Image src={originalImage.url} alt={originalImage.alt} fill sizes="(max-width: 820px) 88vw, 55vw" />
      {originalImage.attribution && <small>{originalImage.attribution}</small>}
    </div> : <div className="lifecycle-diagram">
      <svg className="lifecycle-wheel" viewBox="-24 -24 688 688" role="img" aria-label="Interaktives Jahresrad der Lebensphasen">
        <defs>
          <radialGradient id={`${id}-clock`} cx="42%" cy="35%"><stop stopColor="#dce990"/><stop offset="1" stopColor="#6fc49e"/></radialGradient>
          {sorted.map((phase) => { const radius = firstRadius + (phase.ringOrder - 1) * (ringWidth + ringGap); return <path key={phase.key} id={`${id}-${phase.key}-label`} d={arcPath(radius, 135, 45)} />; })}
        </defs>
        {seasons.map((season) => <path key={season.name} d={arcPath(seasonRadius, season.start + 1.6, season.end - 1.6)} fill="none" stroke={season.color} strokeWidth="7" />)}
        {seasons.map((season) => { const mid = season.start > season.end ? (season.start + season.end + TICKS) / 2 % TICKS : (season.start + season.end) / 2; const p = point(seasonRadius + 18, mid); return <text key={`${season.name}-label`} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="season-label">{season.name}</text>; })}
        {sorted.map((phase) => {
          const radius = firstRadius + (phase.ringOrder - 1) * (ringWidth + ringGap), isSelected = selectedPhase.key === phase.key;
          return <g key={phase.key} tabIndex={0} role="button" aria-label={`${phase.label}, ${phasePeriod(phase)}`} aria-pressed={isSelected} onClick={() => setSelected(phase.key)} onKeyDown={(event) => selectWithKeyboard(event, phase.key)} className={isSelected ? "is-selected" : ""}>
            <circle cx={C} cy={C} r={radius} fill="none" stroke="#fffdfa" strokeWidth={ringWidth} />
            {phase.segments.map((segment, index) => <path key={index} d={arcPath(radius, segment.startTick, segment.endTick)} fill="none" stroke={phase.color} strokeWidth={ringWidth} strokeLinecap="butt" />)}
            <circle cx={C} cy={C} r={radius - ringWidth / 2} fill="none" stroke="#16231f" strokeWidth="1.4" />
            <circle cx={C} cy={C} r={radius + ringWidth / 2} fill="none" stroke="#16231f" strokeWidth="1.4" />
            <text className="phase-label"><textPath href={`#${id}-${phase.key}-label`} startOffset="50%" textAnchor="middle">{phase.label}</textPath></text>
          </g>;
        })}
        <circle cx={C} cy={C} r={clockRadius} fill={`url(#${id}-clock)`} stroke="#16231f" strokeWidth="2" />
        {Array.from({ length: TICKS }, (_, tick) => { const major = tick % 15 === 0, a = point(clockRadius, tick), b = point(major ? clockRadius - 20 : clockRadius - 10, tick); return <line key={tick} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#16231f" strokeWidth={major ? 3 : 1} />; })}
        {Array.from({ length: 12 }, (_, month) => { const p = point(clockRadius - 39, month * 15 + 7.5); return <text key={month} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="month-label">{month + 1}</text>; })}
        <line x1={C} y1={C} x2={pointer.x} y2={pointer.y} stroke="#16231f" strokeWidth="2" />
        <circle cx={C} cy={C} r="13" fill="#16231f"/><circle cx={C} cy={C} r="4" fill="#bde88c"/>
      </svg>

      <div className="lifecycle-mobile" aria-label="Lebensphasen nach Jahreszeiten">
        {seasons.map((season) => { const mid = season.start > season.end ? (season.start + season.end + TICKS) / 2 % TICKS : (season.start + season.end) / 2; const active = sorted.filter((phase) => phase.segments.some((segment) => activeAt(segment, mid))); return <section key={season.name} style={{ "--season-color": season.color } as CSSProperties}><header><strong>{season.name}</strong><span>{season.months.join(" · ")}</span></header><div>{active.length ? active.map((phase) => <button type="button" key={phase.key} aria-pressed={selectedPhase.key === phase.key} onClick={() => setSelected(phase.key)} style={{ "--phase-color": phase.color } as CSSProperties}>{phase.label}</button>) : <em>Keine Phase ausgewiesen</em>}</div></section>; })}
      </div>

      <article className="lifecycle-phase-detail" aria-live="polite">
        <div><span style={{ background: selectedPhase.color }} /><p className="eyebrow">Ausgewählte Lebensphase</p><h3>{selectedDetail?.title ?? selectedPhase.label}</h3><small>{phasePeriod(selectedPhase)}</small></div>
        {selectedDetail?.text ? <p>{selectedDetail.text}</p> : <p>Für diese Lebensphase ist im Jahresrad ein Zeitraum ausgewiesen; ein eigener Beschreibungstext liegt derzeit nicht vor.</p>}
        {selectedDetail?.sources && <footer><strong>Quellen</strong>{selectedDetail.sources}</footer>}
      </article>
    </div>}
  </div>;
}
