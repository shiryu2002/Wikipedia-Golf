import { useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";

import { Wordmark } from "@/components/Brand";
import { ShareModal } from "@/components/Share";
import { HoleInCelebration } from "@/components/game/HoleInCelebration";
import { Button } from "@/components/ui/Button";
import { RefreshIcon } from "@/components/ui/Icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/**
 * /mock/goal — preview of the hole-in celebration followed by the result
 * dialog. Not linked from the app; safe to delete once the real thing is wired.
 */

const SAMPLE_ROUTE = ["日本", "東アジア", "ユーラシア", "地球", "太陽", "光", "電磁波", "物理学", "アルベルト・アインシュタイン", "相対性理論", "真空", "メートル", "光速"];

export default function GoalMock() {
  const [strokes, setStrokes] = useState(3);
  const [timeAttack, setTimeAttack] = useState(false);
  const [run, setRun] = useState(1);
  const [stage, setStage] = useState<"celebration" | "result" | "idle">("idle");

  const route = useMemo(() => {
    const n = Math.min(strokes, SAMPLE_ROUTE.length - 1);
    // start + n hops, with the last hop being the goal
    const titles = [SAMPLE_ROUTE[0], ...SAMPLE_ROUTE.slice(1, n), SAMPLE_ROUTE[SAMPLE_ROUTE.length - 1]];
    return titles.map((title, index) => ({ title, url: "", stroke: index }));
  }, [strokes]);
  const goal = route[route.length - 1].title;
  const hops = route.slice(1, -1).map((entry) => entry.title);

  const replay = () => {
    setStage("celebration");
    setRun((value) => value + 1);
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Head>
        <title>Mock: ゴール演出 | Wikipedia Golf</title>
        <meta name="robots" content="noindex" />
      </Head>

      <header className="border-b border-rule">
        <div className="mx-auto flex h-16 max-w-shell items-center justify-between px-4 sm:px-6">
          <Link href="/" className="rounded-xl transition hover:opacity-80">
            <Wordmark size="sm" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-shell px-4 py-10 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-green">Mock</p>
        <h1 className="mt-2 font-display text-3xl font-bold">ゴール演出のプレビュー</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-2">
          打数を選んで「再生」を押すと、ホールインの演出 → 結果ダイアログの順に流れます。演出中は画面をタップするとスキップ、ダイアログは「記事を見る」で閉じられます。
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full border border-rule bg-paper-2 p-1 text-sm font-semibold">
            {[1, 2, 3, 5, 8, 12].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setStrokes(n)}
                className={`tabular rounded-full px-3.5 py-1.5 transition ${strokes === n ? "bg-ink text-paper-2" : "text-ink-2 hover:text-ink"}`}
              >
                {n}打
              </button>
            ))}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-2">
            <input type="checkbox" checked={timeAttack} onChange={(e) => setTimeAttack(e.target.checked)} className="h-4 w-4 accent-green" />
            タイムアタック表示
          </label>
          <Button variant="accent" leading={<RefreshIcon size={16} />} onClick={replay}>
            再生
          </Button>
        </div>

        <div className="mt-10 rounded-card border border-rule bg-paper-2 p-6 text-sm text-ink-2">
          <p className="font-display text-base font-bold text-ink">ルート（{strokes}打）</p>
          <p className="mt-2 leading-relaxed">{route.map((entry) => entry.title).join(" → ")}</p>
        </div>
      </main>

      {stage === "celebration" && (
        <HoleInCelebration
          key={run}
          strokes={strokes}
          startTitle={route[0].title}
          goalTitle={goal}
          hops={hops}
          timeLabel={timeAttack ? "48.2秒" : undefined}
          onComplete={() => setStage("result")}
        />
      )}

      <ShareModal
        open={stage === "result"}
        stroke={strokes}
        history={route}
        goal={goal}
        isDailyMode={false}
        isTimeAttackMode={timeAttack}
        elapsedTime={48200}
        locale="ja"
        onViewArticle={() => setStage("idle")}
        onReturnToTitle={() => setStage("idle")}
        onReplay={replay}
      />
    </div>
  );
}
