import { useEffect, useMemo, useRef, useState } from "react";

import { Confetti } from "@/components/Confetti";

type Point = { x: number; y: number };
type Curve = [Point, Point, Point, Point];

type HoleInCelebrationProps = {
  strokes: number;
  startTitle: string;
  goalTitle: string;
  /** Titles of the intermediate hops (excluding start and goal). */
  hops?: string[];
  /** Called once the sequence has finished (after the numeral has landed). */
  onComplete?: () => void;
  /** Time attack result, if any. */
  timeLabel?: string;
};

/* ------------------------------------------------------------------ */
/* Scene layouts                                                         */
/* ------------------------------------------------------------------ */

type Layout = {
  kind: "desktop" | "mobile";
  viewBox: { w: number; h: number };
  /** The putting green (desktop). On mobile the whole screen is grass. */
  green: { cx: number; cy: number; r: number } | null;
  cup: Point;
  path: Curve;
  ballR: number;
  labelFont: number;
  labelMaxChars: number;
  dotR: number;
};

/** Top-down green with the tee on the grass; the ball sweeps in from the lower right. */
const DESKTOP: Layout = {
  kind: "desktop",
  viewBox: { w: 460, h: 440 },
  green: { cx: 230, cy: 224, r: 196 },
  cup: { x: 258, y: 160 },
  path: [
    { x: 92, y: 338 },
    { x: 190, y: 405 },
    { x: 365, y: 300 },
    { x: 258, y: 160 },
  ],
  ballR: 11,
  labelFont: 12,
  labelMaxChars: 9,
  dotR: 4.5,
};

/** Full-bleed grass; the ball rolls straight up from the bottom edge. */
const MOBILE: Layout = {
  kind: "mobile",
  viewBox: { w: 400, h: 800 },
  green: null,
  cup: { x: 200, y: 215 },
  path: [
    { x: 200, y: 770 },
    { x: 200, y: 600 },
    { x: 200, y: 380 },
    { x: 200, y: 215 },
  ],
  ballR: 13,
  labelFont: 15,
  labelMaxChars: 11,
  dotR: 6,
};

const DIMPLE_PERIOD = 3.4;
const DIMPLES: Point[] = (() => {
  const points: Point[] = [];
  for (let row = -5; row <= 5; row += 1) {
    for (let col = -7; col <= 7; col += 1) {
      points.push({ x: col * DIMPLE_PERIOD + (row % 2 ? DIMPLE_PERIOD / 2 : 0), y: row * DIMPLE_PERIOD });
    }
  }
  return points;
})();

const ROLL_MS = 2100;
const ROLL_DELAY_MS = 350;
const DROP_MS = 420;
const SETTLE_MS = 900;
const MAX_LABELS = 6;

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                      */
/* ------------------------------------------------------------------ */

const bezier = (t: number, [p0, p1, p2, p3]: Curve): Point => {
  const mt = 1 - t;
  return {
    x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
    y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y,
  };
};

/** Cumulative arc-length table so motion and labels are spaced by distance, not by t. */
const buildArc = (path: Curve) => {
  const samples = 240;
  const points: Point[] = [];
  const lengths: number[] = [0];
  let previous = bezier(0, path);
  points.push(previous);
  for (let index = 1; index <= samples; index += 1) {
    const point = bezier(index / samples, path);
    lengths.push(lengths[index - 1] + Math.hypot(point.x - previous.x, point.y - previous.y));
    points.push(point);
    previous = point;
  }
  const total = lengths[samples];
  const at = (fraction: number): Point => {
    const target = Math.min(1, Math.max(0, fraction)) * total;
    let low = 0;
    let high = lengths.length - 1;
    while (high - low > 1) {
      const mid = (low + high) >> 1;
      if (lengths[mid] <= target) low = mid;
      else high = mid;
    }
    const span = lengths[high] - lengths[low] || 1;
    const k = (target - lengths[low]) / span;
    const a = points[low];
    const b = points[high];
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  };
  return { at };
};

/** Fast off the tee, long slow roll to the lip. */
const easeRoll = (t: number) => 1 - (1 - t) ** 3.2;

/** Rough width of a label chip (CJK ≈ 1em, Latin ≈ 0.6em). */
const chipWidth = (text: string, fontSize: number) =>
  Array.from(text).reduce((sum, char) => sum + ((char.codePointAt(0) ?? 0) > 0x2e80 ? fontSize : fontSize * 0.6), 0) +
  fontSize * 1.5;

const clip = (text: string, max: number) =>
  Array.from(text).length > max ? `${Array.from(text).slice(0, max - 1).join("")}…` : text;

const strokeWord = (strokes: number) => {
  if (strokes <= 1) return "ホールインワン";
  if (strokes <= 3) return "チップイン";
  if (strokes <= 6) return "ナイスパット";
  if (strokes <= 10) return "ホールイン";
  return "長いホールでした";
};

const isNarrow = () => typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;

type Phase = "idle" | "rolling" | "dropped" | "done";

/* ------------------------------------------------------------------ */
/* Component                                                             */
/* ------------------------------------------------------------------ */

export const HoleInCelebration = ({ strokes, startTitle, goalTitle, hops = [], onComplete, timeLabel }: HoleInCelebrationProps) => {
  // Layout is decided once on mount (this only ever renders client-side).
  const [layout] = useState<Layout>(() => (isNarrow() ? MOBILE : DESKTOP));
  const arc = useMemo(() => buildArc(layout.path), [layout]);
  const { cup, path, ballR, labelFont, labelMaxChars, dotR } = layout;
  const tee = path[0];

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [trail, setTrail] = useState<Point[]>([]);
  const ballRef = useRef<SVGGElement>(null);
  const dimpleRef = useRef<SVGGElement>(null);
  const skipRef = useRef<(() => void) | null>(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const reduceMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  // Every hop gets a dot; at most MAX_LABELS of them get a title (evenly
  // sampled, always including the first and last hop). Labels alternate
  // sides so neighbours don't collide.
  const hopMarks = useMemo(() => {
    const count = hops.length;
    const labelled = new Set<number>();
    if (count <= MAX_LABELS) {
      hops.forEach((_, index) => labelled.add(index));
    } else {
      for (let i = 0; i < MAX_LABELS; i += 1) {
        labelled.add(Math.round((i * (count - 1)) / (MAX_LABELS - 1)));
      }
    }
    let labelIndex = 0;
    return hops.map((title, index) => {
      const t = (index + 1) / (count + 1);
      const showLabel = labelled.has(index);
      const alt = showLabel ? labelIndex++ % 2 === 0 : true;
      // Where the path runs sideways, stagger labels above/below; where it
      // runs up/down, put them left/right — so neighbours never stack.
      const before = arc.at(Math.max(0, t - 0.02));
      const after = arc.at(Math.min(1, t + 0.02));
      const vertical = Math.abs(after.y - before.y) > Math.abs(after.x - before.x);
      return { title, t, point: arc.at(t), alt, showLabel, vertical };
    });
  }, [hops, arc]);

  useEffect(() => {
    if (reduceMotion) {
      const show = window.setTimeout(() => {
        setPhase("done");
        setProgress(1);
      }, 0);
      const finish = window.setTimeout(() => onCompleteRef.current?.(), 400);
      return () => {
        window.clearTimeout(show);
        window.clearTimeout(finish);
      };
    }

    let frame = 0;
    let start = 0;
    let lastSample = -1;
    let lastPos: Point = tee;
    let travelled = 0;
    let heading = -90;
    const timers: number[] = [];
    const points: Point[] = [];

    skipRef.current = () => {
      cancelAnimationFrame(frame);
      timers.forEach((id) => window.clearTimeout(id));
      timers.length = 0;
      skipRef.current = null;
      setProgress(1);
      setPhase("done");
      timers.push(window.setTimeout(() => onCompleteRef.current?.(), 350));
    };

    const tick = (now: number) => {
      if (!start) start = now;
      const raw = Math.min(1, (now - start) / ROLL_MS);
      const eased = easeRoll(raw);
      setProgress(eased);
      const pos = arc.at(eased);
      if (ballRef.current) {
        ballRef.current.setAttribute("transform", `translate(${pos.x} ${pos.y})`);
      }
      // Rolling: seen from above, the top of a rolling ball moves forward
      // relative to its centre at the ball's own speed, so the dimple texture
      // flows in the direction of travel by the distance travelled.
      const dx = pos.x - lastPos.x;
      const dy = pos.y - lastPos.y;
      const step = Math.hypot(dx, dy);
      if (step > 0.01) {
        travelled += step;
        heading = (Math.atan2(dy, dx) * 180) / Math.PI;
        lastPos = pos;
      }
      if (dimpleRef.current) {
        dimpleRef.current.setAttribute(
          "transform",
          `rotate(${heading.toFixed(2)}) translate(${(travelled % DIMPLE_PERIOD).toFixed(3)} 0)`,
        );
      }
      if (eased - lastSample > 0.03 && eased < 0.985) {
        lastSample = eased;
        points.push(pos);
        setTrail([...points]);
      }
      if (raw < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setPhase("dropped");
        timers.push(window.setTimeout(() => setPhase("done"), DROP_MS));
        timers.push(
          window.setTimeout(() => {
            skipRef.current = null;
            onCompleteRef.current?.();
          }, DROP_MS + SETTLE_MS + 900),
        );
      }
    };

    timers.push(
      window.setTimeout(() => {
        setPhase("rolling");
        frame = requestAnimationFrame(tick);
      }, ROLL_DELAY_MS),
    );

    return () => {
      cancelAnimationFrame(frame);
      timers.forEach((id) => window.clearTimeout(id));
      skipRef.current = null;
    };
  }, [reduceMotion, arc, tee]);

  const landed = phase === "dropped" || phase === "done";
  const showNumeral = phase === "done";
  const mobile = layout.kind === "mobile";
  const { w: vw, h: vh } = layout.viewBox;

  const goalLabel = clip(goalTitle, 14);
  const goalChipW = chipWidth(goalLabel, labelFont) + labelFont * 1.2;
  const goalChipX = Math.min(Math.max(cup.x - goalChipW / 2, 12), vw - 12 - goalChipW);
  const goalChipH = labelFont * 2.1;
  const flagTop = cup.y - (mobile ? 96 : 78);

  const startLabel = clip(startTitle, 12);
  const startChipW = chipWidth(startLabel, labelFont);
  const startChipH = labelFont * 1.9;

  const scene = (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      preserveAspectRatio={mobile ? "xMidYMid slice" : "xMidYMid meet"}
      className={mobile ? "absolute inset-0 h-full w-full" : "block h-auto w-full overflow-visible"}
      aria-hidden
    >
      <defs>
        <radialGradient id="hi-green" cx="48%" cy="42%" r="62%">
          <stop offset="0" stopColor="#4aa571" />
          <stop offset="0.7" stopColor="#2b7d52" />
          <stop offset="1" stopColor="#1d6440" />
        </radialGradient>
        <linearGradient id="hi-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f8657" />
          <stop offset="0.45" stopColor="#3f9a68" />
          <stop offset="1" stopColor="#24704a" />
        </linearGradient>
        <pattern id="hi-stripes" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
          <rect width="13" height="26" fill="#ffffff" opacity="0.06" />
        </pattern>
        <pattern id="hi-stripes-v" width="44" height="44" patternUnits="userSpaceOnUse" patternTransform="rotate(-22)">
          <rect width="22" height="44" fill="#ffffff" opacity="0.055" />
        </pattern>
        <radialGradient id="hi-ball" cx="35%" cy="30%" r="70%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#cfcabc" />
        </radialGradient>
        <radialGradient id="hi-ball-shade" cx="36%" cy="32%" r="72%">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="0.62" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.38" />
        </radialGradient>
        <clipPath id="hi-ballclip">
          <circle r={ballR} />
        </clipPath>
      </defs>

      {/* ground */}
      {layout.green ? (
        <>
          <circle cx={layout.green.cx} cy={layout.green.cy} r={layout.green.r + 14} fill="#17543a" opacity="0.85" />
          <circle cx={layout.green.cx} cy={layout.green.cy} r={layout.green.r} fill="url(#hi-green)" />
          <circle cx={layout.green.cx} cy={layout.green.cy} r={layout.green.r} fill="url(#hi-stripes)" />
          <circle cx={layout.green.cx} cy={layout.green.cy} r={layout.green.r} fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="1.5" />
        </>
      ) : (
        <>
          <rect x="-300" y="-300" width={vw + 600} height={vh + 600} fill="url(#hi-grass)" />
          <rect x="-300" y="-300" width={vw + 600} height={vh + 600} fill="url(#hi-stripes-v)" />
        </>
      )}

      {/* trail of the putt */}
      <g opacity={showNumeral && mobile ? 0.35 : 1} style={{ transition: "opacity 400ms ease" }}>
        {trail.map((p, index) => (
          <circle
            key={index}
            cx={p.x}
            cy={p.y}
            r={mobile ? 3.2 : 2.6}
            fill="#F7F3EA"
            opacity={0.15 + (index / Math.max(1, trail.length)) * 0.55}
          />
        ))}
      </g>

      {/* tee marker + start label */}
      <g>
        <circle cx={tee.x} cy={tee.y} r={dotR + 1} fill="#1B1A17" stroke="#F7F3EA" strokeWidth="1.5" />
        <g transform={mobile ? `translate(${tee.x + dotR + 10} ${tee.y - startChipH / 2})` : `translate(${tee.x - startChipW / 2} ${tee.y + dotR + 7})`}>
          <rect x="0" y="0" rx={startChipH / 2} ry={startChipH / 2} width={startChipW} height={startChipH} fill="#F7F3EA" opacity="0.94" />
          <text x={labelFont * 0.75} y={startChipH / 2 + labelFont * 0.36} fontSize={labelFont} fontWeight="700" fill="#1B1A17" fontFamily="var(--font-sans)">
            {startLabel}
          </text>
        </g>
      </g>

      {/* hop dots + labels */}
      <g opacity={showNumeral && mobile ? 0.25 : 1} style={{ transition: "opacity 400ms ease" }}>
        {hopMarks.map((mark, index) => {
          const lit = progress >= mark.t;
          const label = clip(mark.title, labelMaxChars);
          const chipW = chipWidth(label, labelFont);
          const chipH = labelFont * 1.85;
          const gap = mobile ? 10 : 6;
          const tx = mark.vertical
            ? mark.alt
              ? mark.point.x + dotR + gap
              : mark.point.x - dotR - gap - chipW
            : mark.point.x + dotR + 4;
          const ty = mark.vertical
            ? mark.point.y - chipH / 2
            : mark.alt
              ? mark.point.y - chipH - dotR - 4
              : mark.point.y + dotR + 4;
          return (
            <g key={`${index}-${mark.title}`} opacity={lit ? 1 : 0} style={{ transition: "opacity 320ms ease" }}>
              <circle cx={mark.point.x} cy={mark.point.y} r={mark.showLabel ? dotR : dotR * 0.75} fill="#F7F3EA" stroke="#1B1A17" strokeWidth="1.5" />
              {mark.showLabel && (
                <g transform={`translate(${tx} ${ty})`}>
                  <rect x="0" y="0" rx={chipH / 2} ry={chipH / 2} width={chipW} height={chipH} fill="#F7F3EA" opacity="0.94" />
                  <text x={labelFont * 0.75} y={chipH / 2 + labelFont * 0.36} fontSize={labelFont} fontWeight="600" fill="#1B1A17" fontFamily="var(--font-sans)">
                    {label}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </g>

      {/* cup */}
      <ellipse cx={cup.x} cy={cup.y + 3} rx={ballR + 4} ry={(ballR + 4) * 0.4} fill="#000" opacity="0.28" />
      <circle cx={cup.x} cy={cup.y} r={ballR + 1.5} fill="#12110f" />
      <circle cx={cup.x} cy={cup.y} r={ballR + 1.5} fill="none" stroke="#F7F3EA" strokeOpacity="0.55" strokeWidth="1.2" />
      {landed && (
        <>
          <circle cx={cup.x} cy={cup.y} r={ballR + 4} fill="none" stroke="#E8C86A" strokeWidth="2" className="hi-ripple" />
          <circle cx={cup.x} cy={cup.y} r={ballR + 4} fill="none" stroke="#F7F3EA" strokeWidth="1.5" className="hi-ripple [animation-delay:160ms]" />
        </>
      )}

      {/* flag */}
      <g className={landed ? "hi-flag-bounce" : ""} style={{ transformOrigin: `${cup.x}px ${cup.y}px` }}>
        <line x1={cup.x} y1={cup.y} x2={cup.x} y2={flagTop} stroke="#F7F3EA" strokeWidth="2.5" strokeLinecap="round" />
        <path
          d={`M${cup.x + 1} ${flagTop} h${mobile ? 48 : 40} l-9 11 9 11 h-${mobile ? 48 : 40} z`}
          fill="#E0B24A"
          className="animate-flag-wave"
          style={{ transformOrigin: `${cup.x}px ${flagTop + 11}px` }}
        />
        <circle cx={cup.x} cy={flagTop - 2} r="2.5" fill="#F7F3EA" />
      </g>

      {/* goal label above the flag */}
      <g transform={`translate(${goalChipX} ${flagTop - goalChipH - 12})`}>
        <rect x="0" y="0" rx={goalChipH / 2} ry={goalChipH / 2} width={goalChipW} height={goalChipH} fill="#F7F3EA" opacity="0.96" />
        <path d={`M${labelFont * 0.9} ${goalChipH * 0.28}v${goalChipH * 0.46}`} stroke="#1B1A17" strokeWidth="1.4" strokeLinecap="round" />
        <path
          d={`M${labelFont * 0.95} ${goalChipH * 0.28}h${labelFont * 0.6}l-${labelFont * 0.13} ${labelFont * 0.2} ${labelFont * 0.13} ${labelFont * 0.2}h-${labelFont * 0.6}z`}
          fill="#B8860B"
        />
        <text x={labelFont * 1.9} y={goalChipH / 2 + labelFont * 0.36} fontSize={labelFont} fontWeight="700" fill="#1B1A17" fontFamily="var(--font-sans)">
          {goalLabel}
        </text>
      </g>

      {/* ball */}
      {phase !== "idle" && phase !== "done" && (
        <g ref={ballRef} transform={`translate(${tee.x} ${tee.y})`}>
          <g className={phase === "dropped" ? "hi-ball-drop" : ""}>
            <ellipse cx={ballR * 0.25} cy={ballR * 0.8} rx={ballR * 0.9} ry={ballR * 0.4} fill="#000" opacity="0.28" />
            <circle r={ballR} fill="url(#hi-ball)" />
            <g clipPath="url(#hi-ballclip)">
              <g ref={dimpleRef}>
                {DIMPLES.map((d, index) => (
                  <circle key={index} cx={d.x} cy={d.y} r="0.8" fill="#1B1A17" opacity="0.2" />
                ))}
              </g>
            </g>
            <circle r={ballR} fill="url(#hi-ball-shade)" />
            <ellipse cx={-ballR * 0.35} cy={-ballR * 0.42} rx={ballR * 0.35} ry={ballR * 0.24} fill="#fff" opacity="0.6" />
            <circle r={ballR} fill="none" stroke="#000" strokeOpacity="0.18" strokeWidth="0.6" />
          </g>
        </g>
      )}
    </svg>
  );

  const stamp = showNumeral ? (
    <>
      <p className="hi-stamp text-[11px] font-semibold uppercase tracking-[0.35em] text-[#E8C86A]">Hole out</p>
      <p className="hi-stamp mt-1 flex items-baseline gap-2 [animation-delay:80ms]">
        <span className="tabular font-numeral text-[5.5rem] font-semibold leading-none tracking-tight" style={{ fontVariationSettings: '"opsz" 144' }}>
          {strokes}
        </span>
        <span className="text-lg font-semibold text-[#F7F3EA]/70">打</span>
        {timeLabel ? <span className="ml-3 font-numeral text-3xl font-semibold text-[#F7F3EA]/80">{timeLabel}</span> : null}
      </p>
      <p className="hi-stamp mt-1 font-display text-2xl font-bold [animation-delay:200ms]">{strokeWord(strokes)}</p>
      <p className="mt-2 max-w-md truncate text-sm text-[#F7F3EA]/60 animate-fade-in [animation-delay:400ms]">
        {startTitle} → {goalTitle}
      </p>
    </>
  ) : null;

  return (
    <div
      className="hi-backdrop fixed inset-0 z-[150] flex flex-col items-center justify-center overflow-hidden px-4 backdrop-blur-[3px]"
      aria-live="polite"
      onClick={() => skipRef.current?.()}
      role="presentation"
    >
      <Confetti active={landed} />

      {mobile ? (
        <>
          <div className="absolute inset-0 animate-fade-in">{scene}</div>
          {showNumeral && (
            <div
              className="pointer-events-none absolute inset-x-0 h-[34%] animate-fade-in bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.5),transparent_72%)]"
              style={{ top: "44%" }}
            />
          )}
          <div
            className="pointer-events-none absolute inset-x-0 flex flex-col items-center text-center text-[#F7F3EA] [text-shadow:0_2px_12px_rgba(0,0,0,0.45)]"
            style={{ top: "52%" }}
          >
            {stamp}
          </div>
        </>
      ) : (
        <>
          <div className="relative w-[min(88vw,30rem)] animate-scale-in">{scene}</div>
          <div className="mt-2 flex min-h-[9rem] flex-col items-center text-center text-[#F7F3EA]">{stamp}</div>
        </>
      )}

      {!showNumeral && phase !== "idle" && (
        <p
          className={`pointer-events-none absolute text-[11px] tracking-[0.25em] text-[#F7F3EA]/45 animate-fade-in [animation-delay:800ms] ${
            mobile ? "top-5" : "bottom-6"
          }`}
        >
          タップでスキップ
        </p>
      )}
    </div>
  );
};
