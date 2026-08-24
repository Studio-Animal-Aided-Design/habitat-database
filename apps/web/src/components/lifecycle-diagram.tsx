"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { LifecyclePhase, LifecycleSegment } from "@/lib/catalog/types";

const C = 320, TICKS = 180;
const round = (value: number) => Number(value.toFixed(3));
const seasons = [
  { name: "Winter", months: ["Dez", "Jan", "Feb"], start: 165, end: 30, color: "#c6e6ec" },
  { name: "Frühling", months: ["Mär", "Apr", "Mai"], start: 30, end: 75, color: "#dcefae" },
  { name: "Sommer", months: ["Jun", "Jul", "Aug"], start: 75, end: 120, color: "#f8dda0" },
  { name: "Herbst", months: ["Sep", "Okt", "Nov"], start: 120, end: 165, color: "#d7c6a8" }
];

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
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${effectiveEnd-start > 90 ? 1 : 0} 1 ${b.x} ${b.y}`;
}

function activeAt(segment: LifecycleSegment, tick: number) {
  return segment.wrapsYear ? tick >= segment.startTick || tick < segment.endTick : tick >= segment.startTick && tick < segment.endTick;
}

export function LifecycleDiagram({ phases, fallbackAlt }: { phases: LifecyclePhase[]; fallbackAlt: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const sorted = useMemo(() => [...phases].sort((a,b) => a.ringOrder-b.ringOrder), [phases]);
  if (!sorted.length) return <p className="lifecycle-unavailable">{fallbackAlt}</p>;
  const maxRings = Math.max(...sorted.map((phase) => phase.ringOrder));
  const ringWidth = maxRings > 4 ? 13 : 17, gap = maxRings > 4 ? 8 : 10, firstRadius = 190;
  const phaseOuter = firstRadius + (maxRings-1)*(ringWidth+gap);
  const seasonRadius = Math.min(286, phaseOuter + 34);
  // The pointer is an illustrative part of the source artwork, not a live date indicator.
  const pointer = point(seasonRadius + 7, 67);
  return <div className="lifecycle-diagram">
    <svg className="lifecycle-wheel" viewBox="-35 -35 710 710" role="img" aria-label="Interaktives Jahresrad der Lebensphasen">
      <defs><radialGradient id="lifecycle-clock" cx="42%" cy="35%"><stop stopColor="#dce990"/><stop offset="1" stopColor="#6fc49e"/></radialGradient></defs>
      {seasons.map((season) => <path key={season.name} d={arcPath(seasonRadius,season.start,season.end)} fill="none" stroke={season.color} strokeWidth="12" />)}
      {seasons.map((season) => { const mid = season.start > season.end ? (season.start+season.end+TICKS)/2%TICKS : (season.start+season.end)/2; const p=point(seasonRadius+23,mid); return <text key={`${season.name}-label`} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="season-label">{season.name}</text>; })}
      <circle cx={C} cy={C} r="154" fill="url(#lifecycle-clock)" stroke="#16231f" strokeWidth="2" />
      {Array.from({length:TICKS},(_,tick) => { const major=tick%15===0, a=point(154,tick), b=point(major?136:144,tick); return <line key={tick} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#16231f" strokeWidth={major?3:1} />; })}
      {Array.from({length:12},(_,month) => { const p=point(118,month*15+7.5); return <text key={month} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="month-label">{month+1}</text>; })}
      {sorted.map((phase) => {
        const radius=firstRadius+(phase.ringOrder-1)*(ringWidth+gap), isSelected=selected===phase.key;
        return <g key={phase.key} tabIndex={0} role="button" aria-label={phase.label} onMouseEnter={()=>setSelected(phase.key)} onMouseLeave={()=>setSelected(null)} onFocus={()=>setSelected(phase.key)} onBlur={()=>setSelected(null)} className={isSelected?"is-selected":""}>
          <circle cx={C} cy={C} r={radius} fill="none" stroke="rgba(255,255,255,.72)" strokeWidth={ringWidth} />
          {phase.segments.map((segment,index)=><path key={index} d={arcPath(radius,segment.startTick,segment.endTick)} fill="none" stroke={phase.color} strokeWidth={ringWidth} strokeLinecap="butt" />)}
          <text x={C} y={C-radius-5} textAnchor="middle" className="phase-label">{phase.label}</text>
        </g>;
      })}
      <line x1={C} y1={C} x2={pointer.x} y2={pointer.y} stroke="#16231f" strokeWidth="2" />
      <circle cx={C} cy={C} r="13" fill="#16231f"/><circle cx={C} cy={C} r="4" fill="#bde88c"/>
      {selected && <text x={C} y={C+45} textAnchor="middle" className="selected-label">{sorted.find((phase)=>phase.key===selected)?.label}</text>}
    </svg>
    <div className="lifecycle-mobile" aria-label="Lebensphasen nach Jahreszeiten">
      {seasons.map((season) => { const mid=season.start>season.end?(season.start+season.end+TICKS)/2%TICKS:(season.start+season.end)/2; const active=sorted.filter((phase)=>phase.segments.some((segment)=>activeAt(segment,mid))); return <section key={season.name} style={{"--season-color":season.color} as CSSProperties}><header><strong>{season.name}</strong><span>{season.months.join(" · ")}</span></header><div>{active.length?active.map((phase)=><span key={phase.key} style={{"--phase-color":phase.color} as CSSProperties}>{phase.label}</span>):<em>Keine Phase ausgewiesen</em>}</div></section>; })}
    </div>
  </div>;
}
