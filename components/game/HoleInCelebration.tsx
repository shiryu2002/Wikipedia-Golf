import { useEffect, useMemo, useRef, useState } from "react";

import { Confetti } from "@/components/Confetti";

type Point = { x: number; y: number };

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

/* Scene geometry (SVG user units, viewBox 0 0 400 400) */
const GREEN = { cx: 200, cy: 212, r: 148 };
const CUP: Point = { x: 218, y: 172 };
const TEE: Point = { x: 46, y: 368 };
/** A long S across the green: up the left side, sweep right, curl into the cup. */
const PATH: [Point, Point, Point, Point] = [
  TEE,
  { x: 70, y: 235 },
  { x: 340, y: 330 },
  CUP,
];

/** Rough width of a label chip (CJK ≈ 1em, Latin ≈ 0.6em) at 11px. */
const chipWidth = (text: string, fontSize = 11) =>
  Array.from(text).reduce((sum, char) => sum + ((char.codePointAt(0) ?? 0) > 0x2e80 ? fontSize : fontSize * 0.6), 0) + 16;

const clip = (text: string, max: number) => (Array.from(text).length > max ? `${Array.from(text).slice(0, max - 1).join("")}…` : text);

const BALL_R = 11;
/** Spacing of the dimple grid; the texture flows by travelled distance. */
const DIMPLE_PERIOD = 3.4;
const DIMPLES: Point[] = (() => {
  const points: Point[] = [];
  for (let row = -4; row <= 4; row += 1) {
    for (let col = -6; col <= 6; col += 1) {
      points.push({ x: col * DIMPLE_PERIOD + (row % 2 ? DIMPLE_PERIOD / 2 : 0), y: row * DIMPLE_PERIOD });
    }
  }
  return points;
})();

const ROLL_MS = 2100;
const ROLL_DELAY_MS = 350;
const DROP_MS = 420;
const SETTLE_MS = 900;

const bezier = (t: number, [p0, p1, p2, p3]: typeof PATH): Point => {
  const mt = 1 - t;
  return {
    x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
    y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y,
  };
};

/** Cumulative arc length so motion and labels are spaced by distance, not by t. */
const ARC = (() => {
  const samples = 240;
  const points: Point[] = [];
  const lengths: number[] = [0];
  let previous = bezier(0, PATH);
  points.push(previous);
  for (let index = 1; index <= samples; index += 1) {
    const point = bezier(index / samples, PATH);
    lengths.push(lengths[index - 1] + Math.hypot(point.x - previous.x, point.y - previous.y));
    points.push(point);
    previous = point;
  }
  return { points, lengths, total: lengths[samples] };
})();

/** Point at a fraction (0..1) of the path length. */
const pointAtFraction = (fraction: number): Point => {
  const target = Math.min(1, Math.max(0, fraction)) * ARC.total;
  let low = 0;
  let high = ARC.lengths.length - 1;
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if (ARC.lengths[mid] <= target) low = mid;
    else high = mid;
  }
  const span = ARC.lengths[high] - ARC.lengths[low] || 1;
  const k = (target - ARC.lengths[low]) / span;
  const a = ARC.points[low];
  const b = ARC.points[high];
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
};

/** Fast off the tee, long slow roll to the lip. */
const easeRoll = (t: number) => 1 - (1 - t) ** 3.2;

const strokeWord = (strokes: number) => {
  if (strokes <= 1) return "ホールインワン";
  if (strokes <= 3) return "チップイン";
  if (strokes <= 6) return "ナイスパット";
  if (strokes <= 10) return "ホールイン";
  return "長いホールでした";
};

type Phase = "idle" | "rolling" | "dropped" | "done";

export const HoleInCelebration = ({ strokes, startTitle, goalTitle, hops = [], onComplete, timeLabel }: HoleInCelebrationProps) => {
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

  // Positions along the path where the hop labels light up.
  const hopMarks = useMemo(() => {
    const visible = hops.slice(0, 6);
    return visible.map((title, index) => {
      const t = (index + 1) / (visible.length + 1);
      return { title, t, point: pointAtFraction(t), side: index % 2 === 0 ? ("right" as const) : ("left" as const) };
    });
  }, [hops]);

  useEffect(() => {
    if (reduceMotion) {
      // Skip the roll: show the landed state and hand over almost immediately.
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
    let lastPos: Point = PATH[0];
    let travelled = 0;
    let heading = 0;
    const timers: number[] = [];
    const points: Point[] = [];

    // Tap to skip: jump straight to the landed state.
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
      const pos = pointAtFraction(eased);
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
        dimpleRef.current.setAttribute("transform", `rotate(${heading.toFixed(2)}) translate(${(travelled % DIMPLE_PERIOD).toFixed(3)} 0)`);
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
  }, [reduceMotion]);

  const landed = phase === "dropped" || phase === "done";
  const showNumeral = phase === "done";

  return (
    <div
      className="fixed inset-0 z-[150] flex flex-col items-center justify-center overflow-hidden bg-ink/75 px-4 backdrop-blur-[3px]"
      aria-live="polite"
      onClick={() => skipRef.current?.()}
      role="presentation"
    >
      <Confetti active={landed} />

      <div className="relative w-[min(88vw,26rem)] animate-scale-in">
        <svg viewBox="0 0 400 400" className="block h-auto w-full overflow-visible" aria-hidden>
          <defs>
            <radialGradient id="hi-green" cx="48%" cy="42%" r="62%">
              <stop offset="0" stopColor="#4aa571" />
              <stop offset="0.7" stopColor="#2b7d52" />
              <stop offset="1" stopColor="#1d6440" />
            </radialGradient>
            <pattern id="hi-stripes" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
              <rect width="13" height="26" fill="#ffffff" opacity="0.06" />
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
              <circle r={BALL_R} />
            </clipPath>
          </defs>

          {/* fringe + green */}
          <circle cx={GREEN.cx} cy={GREEN.cy} r={GREEN.r + 14} fill="#17543a" opacity="0.85" />
          <circle cx={GREEN.cx} cy={GREEN.cy} r={GREEN.r} fill="url(#hi-green)" />
          <circle cx={GREEN.cx} cy={GREEN.cy} r={GREEN.r} fill="url(#hi-stripes)" />
          <circle cx={GREEN.cx} cy={GREEN.cy} r={GREEN.r} fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="1.5" />

          {/* trail of the putt */}
          {trail.map((p, index) => (
            <circle
              key={index}
              cx={p.x}
              cy={p.y}
              r={index === trail.length - 1 ? 2.2 : 2.6}
              fill="#F7F3EA"
              opacity={0.15 + (index / Math.max(1, trail.length)) * 0.55}
            />
          ))}

          {/* hop labels */}
          {hopMarks.map((mark) => {
            const lit = progress >= mark.t;
            return (
              <g key={mark.title} opacity={lit ? 1 : 0} style={{ transition: "opacity 320ms ease" }}>
                <circle cx={mark.point.x} cy={mark.point.y} r="4.5" fill="#F7F3EA" stroke="#1B1A17" strokeWidth="1.5" />
                <g
                  transform={`translate(${
                    mark.side === "right" ? mark.point.x + 9 : mark.point.x - 9 - chipWidth(clip(mark.title, 9), 10.5)
                  } ${mark.point.y - 9})`}
                >
                  <rect x="0" y="-11" rx="6" ry="6" width={chipWidth(clip(mark.title, 9), 10.5)} height="20" fill="#F7F3EA" opacity="0.94" />
                  <text x="8" y="3.5" fontSize="10.5" fontWeight="600" fill="#1B1A17" fontFamily="var(--font-sans)">
                    {clip(mark.title, 9)}
                  </text>
                </g>
              </g>
            );
          })}

          {/* tee marker + start label */}
          <g>
            <circle cx={TEE.x} cy={TEE.y} r="5" fill="#1B1A17" stroke="#F7F3EA" strokeWidth="1.5" />
            <g transform={`translate(${TEE.x + 10} ${TEE.y + 4})`}>
              <rect x="0" y="-11" rx="6" ry="6" width={chipWidth(clip(startTitle, 12))} height="21" fill="#F7F3EA" opacity="0.94" />
              <text x="8" y="4" fontSize="11" fontWeight="700" fill="#1B1A17" fontFamily="var(--font-sans)">
                {clip(startTitle, 12)}
              </text>
            </g>
          </g>

          {/* cup */}
          <ellipse cx={CUP.x} cy={CUP.y + 3} rx="15" ry="6" fill="#000" opacity="0.28" />
          <circle cx={CUP.x} cy={CUP.y} r="12.5" fill="#12110f" />
          <circle cx={CUP.x} cy={CUP.y} r="12.5" fill="none" stroke="#F7F3EA" strokeOpacity="0.55" strokeWidth="1.2" />
          {landed && (
            <>
              <circle cx={CUP.x} cy={CUP.y} r="15" fill="none" stroke="#E8C86A" strokeWidth="2" className="hi-ripple" />
              <circle cx={CUP.x} cy={CUP.y} r="15" fill="none" stroke="#F7F3EA" strokeWidth="1.5" className="hi-ripple [animation-delay:160ms]" />
            </>
          )}

          {/* flag */}
          <g className={landed ? "hi-flag-bounce" : ""} style={{ transformOrigin: `${CUP.x}px ${CUP.y}px` }}>
            <line x1={CUP.x} y1={CUP.y} x2={CUP.x} y2={CUP.y - 78} stroke="#F7F3EA" strokeWidth="2.5" strokeLinecap="round" />
            <path
              d={`M${CUP.x + 1} ${CUP.y - 78} h40 l-9 11 9 11 h-40 z`}
              fill="#E0B24A"
              className="animate-flag-wave"
              style={{ transformOrigin: `${CUP.x}px ${CUP.y - 67}px` }}
            />
            <circle cx={CUP.x} cy={CUP.y - 80} r="2.5" fill="#F7F3EA" />
          </g>
          {/* goal label above the flag */}
          {(() => {
            const label = clip(goalTitle, 14);
            const width = chipWidth(label) + 14;
            const x = Math.min(Math.max(CUP.x - width / 2, 4), 396 - width);
            return (
              <g transform={`translate(${x} ${CUP.y - 112})`}>
                <rect x="0" y="0" rx="7" ry="7" width={width} height="24" fill="#F7F3EA" opacity="0.96" />
                <path d="M9 7v11" stroke="#1B1A17" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M9.5 7h6l-1.3 2.2 1.3 2.2h-6z" fill="#B8860B" />
                <text x="21" y="16" fontSize="11" fontWeight="700" fill="#1B1A17" fontFamily="var(--font-sans)">
                  {label}
                </text>
              </g>
            );
          })()}

          {/* ball */}
          {phase !== "idle" && phase !== "done" && (
            <g ref={ballRef} transform={`translate(${PATH[0].x} ${PATH[0].y})`}>
              {/* inner group takes the CSS drop animation so it doesn't fight the translate above */}
              <g className={phase === "dropped" ? "hi-ball-drop" : ""}>
                <ellipse cx="2.5" cy="9" rx="10" ry="4.5" fill="#000" opacity="0.28" />
                <circle r={BALL_R} fill="url(#hi-ball)" />
                {/* dimple texture, clipped to the ball and flowing with travel */}
                <g clipPath="url(#hi-ballclip)">
                  <g ref={dimpleRef}>
                    {DIMPLES.map((d, index) => (
                      <circle key={index} cx={d.x} cy={d.y} r="0.8" fill="#1B1A17" opacity="0.2" />
                    ))}
                  </g>
                </g>
                {/* fixed lighting: shade at the far edge, highlight near the light */}
                <circle r={BALL_R} fill="url(#hi-ball-shade)" />
                <ellipse cx="-3.8" cy="-4.6" rx="3.8" ry="2.6" fill="#fff" opacity="0.6" />
                <circle r={BALL_R} fill="none" stroke="#000" strokeOpacity="0.18" strokeWidth="0.6" />
              </g>
            </g>
          )}
        </svg>

      </div>

      {/* the score stamp */}
      <div className="mt-2 flex min-h-[9rem] flex-col items-center text-center text-paper-2">
        {showNumeral ? (
          <>
            <p className="hi-stamp text-[11px] font-semibold uppercase tracking-[0.35em] text-[#E8C86A]">Hole out</p>
            <p className="hi-stamp mt-1 flex items-baseline gap-2 [animation-delay:80ms]">
              <span className="tabular font-numeral text-[5.5rem] font-semibold leading-none tracking-tight" style={{ fontVariationSettings: '"opsz" 144' }}>
                {strokes}
              </span>
              <span className="text-lg font-semibold text-paper-2/70">打</span>
              {timeLabel ? <span className="ml-3 font-numeral text-3xl font-semibold text-paper-2/80">{timeLabel}</span> : null}
            </p>
            <p className="hi-stamp mt-1 font-display text-2xl font-bold [animation-delay:200ms]">{strokeWord(strokes)}</p>
            <p className="mt-2 max-w-md truncate text-sm text-paper-2/60 animate-fade-in [animation-delay:400ms]">
              {startTitle} → {goalTitle}
            </p>
          </>
        ) : null}
      </div>

      {!showNumeral && phase !== "idle" && (
        <p className="pointer-events-none absolute bottom-6 text-[11px] tracking-[0.25em] text-paper-2/45 animate-fade-in [animation-delay:800ms]">
          タップでスキップ
        </p>
      )}
    </div>
  );
};
