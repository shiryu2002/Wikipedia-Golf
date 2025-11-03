import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  DailyChallenge,
  fetchDailyChallenge,
} from "@/useCase/dailyChallenge";

export default function Home() {
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(
    null
  );

  useEffect(() => {
    let isCancelled = false;
    const loadChallenge = async () => {
      try {
        const challenge = await fetchDailyChallenge("ja");
        if (!isCancelled) {
          setDailyChallenge(challenge);
        }
      } catch (error) {
        console.error("デイリーチャレンジの取得に失敗しました", error);
        if (!isCancelled) {
          setDailyChallenge(null);
        }
      }
    };

    loadChallenge();

    return () => {
      isCancelled = true;
    };
  }, []);

  const dailyGoalTitle = dailyChallenge?.goal.title ?? "読み込み中";
  const dailyStartTitle = dailyChallenge?.start.title ?? "読み込み中";
  const dailyGoalDate = dailyChallenge?.date ?? new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-8">
          <div className="flex shrink-0 items-center">
            <Image
              src="/w2.png"
              alt="Wikipedia Golf アイコン"
              width={64}
              height={64}
              className="h-16 w-16 rounded-2xl object-cover"
              priority
            />
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Wikipedia Golf
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight text-white md:text-4xl">
                知識の海で最短ルートを描こう
              </h1>
              <p className="mt-4 text-sm text-slate-400 md:text-base">
                Wikipediaゴルフは、リンクを辿ってゴール記事へ到達するまでの手数を競うブラウザゲームです。
                日替わりのお題で仲間と一緒に腕試ししましょう。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                className="rounded-full bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-400"
                href="/?start=daily"
              >
                今日のお題でプレイ
              </Link>
              <Link
                className="rounded-full border border-blue-300/60 px-5 py-3 text-sm font-semibold text-blue-100 transition hover:border-blue-200 hover:text-white"
                href="/?start=random"
              >
                ランダムに挑戦
              </Link>
              <Link
                className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
                href="/"
              >
                ゲーム画面へ移動
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-12">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-slate-900 p-8 text-white shadow-2xl">
            <p className="text-sm  text-white/70">
              今日のお題
            </p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight md:text-4xl">
              ゴール: {dailyGoalTitle}
            </h2>
            <p className="mt-2 text-3xl font-semibold leading-tight md:text-4xl">スタート: {dailyStartTitle}</p>
            <p className="mt-4 text-sm text-white/80">{dailyGoalDate} のチャレンジ</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow transition hover:bg-slate-100"
                href="/?start=daily"
              >
                このお題でスタート
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-full border border-white/60 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                href="/?start=random"
              >
                ランダムに挑戦
              </Link>
            </div>
          </div>
          <article className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white shadow-xl backdrop-blur">
            <h2 className="text-2xl font-semibold">ゲームの遊び方</h2>
            <p className="mt-4 text-xl text-slate-200">
              Wikipediaゴルフは、スタート記事からリンクだけを辿り、ゴールの記事にできるだけ少ない手数で到達することを目指すシンプルなゲームです。
            </p>
            <ol className="mt-6 space-y-3 text-sm text-slate-200">
              <li>スタートページを開き、リンクの行き先をイメージします。</li>
              <li>目標となるゴール記事を確認し、ルートを思い描きます。</li>
              <li>リンクを辿りながら最短を探し、手数を更新していきます。</li>
              <li>ゴール到達後は結果をシェアして仲間と競い合いましょう。</li>
            </ol>
          </article>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white shadow-xl backdrop-blur">
          <h2 className="text-2xl font-semibold">プレイの流れ</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-blue-200">
                Step 01
              </p>
              <h3 className="mt-3 text-lg font-semibold">お題を選ぶ</h3>
              <p className="mt-2 text-sm text-slate-200">
                今日のお題またはランダムスタートを選んでゲームを開始しましょう。
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-blue-200">
                Step 02
              </p>
              <h3 className="mt-3 text-lg font-semibold">リンクを辿る</h3>
              <p className="mt-2 text-sm text-slate-200">
                直感や推理を頼りに、ゴール記事へとつながる可能性の高いリンクを選びます。
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-blue-200">
                Step 03
              </p>
              <h3 className="mt-3 text-lg font-semibold">結果を共有</h3>
              <p className="mt-2 text-sm text-slate-200">
                プレイログをシェアして、他のプレイヤーとルートや手数を比較しましょう。
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-xl backdrop-blur">
            <h3 className="text-lg font-semibold">今日は何の日？</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-200">
              <li>伊能忠敬が日本初の実測地図を完成</li>
              <li>ウィリアム・G・モーガンがバレーボールを考案 (1895年)</li>
              <li>ミュンヘン一揆が未遂に終わる (1923年)</li>
            </ul>
            <p className="mt-3 text-xs text-blue-100 uppercase tracking-[0.25em]">
              Wikipedia Style Archive
            </p>
          </div>

          <article className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white shadow-xl backdrop-blur">
            <h2 className="text-2xl font-semibold">ゲームの魅力</h2>
            <ul className="mt-6 space-y-4 text-sm text-slate-200">
              <li>多彩な記事に触れることで、知らなかったトピックを発見できます。</li>
              <li>最短ルートを考える戦略性があり、思考ゲームとしても楽しめます。</li>
              <li>プレイログを振り返ることで、辿ったルートを他のプレイヤーと共有できます。</li>
              <li>日替わりモードで、毎日全員が同じお題に挑戦できます。</li>
            </ul>
          </article>
        </section>
      </main>
    </div>
  );
}
