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
const PATH: [Point, Point, Point, Point] = [
  { x: -30, y: 405 },
  { x: 110, y: 430 },
  { x: 330, y: 300 },
  CUP,
];

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
      return { title, t, point: bezier(t, PATH) };
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
    const timers: number[] = [];
    const points: Point[] = [];

    const tick = (now: number) => {
      if (!start) start = now;
      const raw = Math.min(1, (now - start) / ROLL_MS);
      const eased = easeRoll(raw);
      setProgress(eased);
      const pos = bezier(eased, PATH);
      if (ballRef.current) {
        ballRef.current.setAttribute("transform", `translate(${pos.x} ${pos.y})`);
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
        timers.push(window.setTimeout(() => onCompleteRef.current?.(), DROP_MS + SETTLE_MS + 900));
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
    };
  }, [reduceMotion]);

  const landed = phase === "dropped" || phase === "done";
  const showNumeral = phase === "done";

  return (
    <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center overflow-hidden bg-ink/75 px-4 backdrop-blur-[3px]" aria-live="polite">
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
            <clipPath id="hi-clip">
              <circle cx={GREEN.cx} cy={GREEN.cy} r={GREEN.r} />
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
                <g transform={`translate(${mark.point.x + 9} ${mark.point.y - 9})`}>
                  <rect x="0" y="-11" rx="6" ry="6" width={Math.min(mark.title.length, 9) * 10.5 + 14} height="20" fill="#F7F3EA" opacity="0.94" />
                  <text x="7" y="3.5" fontSize="10.5" fontWeight="600" fill="#1B1A17" fontFamily="var(--font-sans)">
                    {mark.title.length > 9 ? `${mark.title.slice(0, 8)}…` : mark.title}
                  </text>
                </g>
              </g>
            );
          })}

          {/* cup */}
          <ellipse cx={CUP.x} cy={CUP.y + 3} rx="12" ry="5" fill="#000" opacity="0.28" />
          <circle cx={CUP.x} cy={CUP.y} r="9.5" fill="#12110f" />
          <circle cx={CUP.x} cy={CUP.y} r="9.5" fill="none" stroke="#F7F3EA" strokeOpacity="0.55" strokeWidth="1.2" />
          {landed && (
            <>
              <circle cx={CUP.x} cy={CUP.y} r="12" fill="none" stroke="#E8C86A" strokeWidth="2" className="hi-ripple" />
              <circle cx={CUP.x} cy={CUP.y} r="12" fill="none" stroke="#F7F3EA" strokeWidth="1.5" className="hi-ripple [animation-delay:160ms]" />
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

          {/* ball */}
          {phase !== "idle" && phase !== "done" && (
            <g ref={ballRef} transform={`translate(${PATH[0].x} ${PATH[0].y})`}>
              {/* inner group takes the CSS drop animation so it doesn't fight the translate above */}
              <g className={phase === "dropped" ? "hi-ball-drop" : ""}>
                <ellipse cx="2" cy="7" rx="8" ry="3.5" fill="#000" opacity="0.28" />
                <circle r="8.5" fill="url(#hi-ball)" />
                <circle cx="-2.5" cy="-3" r="0.9" fill="#1B1A17" opacity="0.25" />
                <circle cx="1.5" cy="-4" r="0.9" fill="#1B1A17" opacity="0.25" />
                <circle cx="3.5" cy="0" r="0.9" fill="#1B1A17" opacity="0.25" />
                <circle cx="-1" cy="1.5" r="0.9" fill="#1B1A17" opacity="0.25" />
                <circle cx="-4" cy="3" r="0.9" fill="#1B1A17" opacity="0.25" />
              </g>
            </g>
          )}
        </svg>

        {/* start label at the tee side */}
        <p className="pointer-events-none absolute bottom-1 left-2 max-w-[45%] truncate rounded-full bg-paper-2/90 px-3 py-1 text-[11px] font-semibold text-ink shadow-paper">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-ink align-middle" /> {startTitle}
        </p>
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
    </div>
  );
};
