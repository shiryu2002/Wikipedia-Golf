import { useState } from "react";

import Modal from "react-modal";
import { TwitterShareButton, XIcon } from "react-share";
import { formatTime } from "@/utils/time";

interface ShareModalProps {
  gameState: "idle" | "playing" | "gameover";
  stroke: number;
  history: { title: string; url: string; stroke: number }[];
  goal: string;
  isDailyMode: boolean;
  isTimeAttackMode: boolean;
  elapsedTime: number;
  locale: "en" | "ja";
}

Modal.setAppElement("#__next");

// モーダルのスタイルを定義
const customStyles = {
  content: {
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)",
    border: "none",
    padding: "0",
    background: "transparent",
  },
  overlay: {
    backgroundColor: "rgba(2, 6, 23, 0.78)",
    backdropFilter: "blur(6px)",
    zIndex: 9999,
  },
};

export const ShareModal = ({
  gameState,
  stroke,
  history,
  goal,
  isDailyMode,
  isTimeAttackMode,
  elapsedTime,
  locale,
}: ShareModalProps) => {
  const [isCopied, setIsCopied] = useState(false);

  const startTitle = history.length > 0 ? history[0].title : "";
  const siteOrigin = "https://wikipedia-golf.vercel.app";
  const defaultShareUrl = `${siteOrigin}/`;
  const challengeShareUrl = !isDailyMode && startTitle && goal
    ? (() => {
      const params = new URLSearchParams({
        start: "custom",
        startTitle,
        goalTitle: goal,
      });
      if (locale) {
        params.set("locale", locale);
      }
      return `${siteOrigin}/game?${params.toString()}`;
    })()
    : null;
  const shareUrl = challengeShareUrl ?? defaultShareUrl;
  const shareDateTag = `WikipediaGolf_${new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "_")}`;
  const formattedTime = formatTime(elapsedTime);
  const timeText = isTimeAttackMode ? ` タイム: ${formattedTime}秒` : "";
  const baseShareText = `Wikipedia Golfで「${startTitle}」から${stroke}打で「${goal}」に到達しました！${timeText}`;
  const shareTagLine = isDailyMode
    ? `#WikipediaGolf #${shareDateTag}`
    : "#WikipediaGolf";
  const shareText = `${baseShareText}\n${shareUrl}\n${shareTagLine}`;
  const hashtags = isDailyMode
    ? ["WikipediaGolf", shareDateTag]
    : ["WikipediaGolf"];

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = shareText;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("共有テキストのコピーに失敗しました", error);
    }
  };

  return (
    <Modal
      isOpen={gameState === "gameover"}
      onRequestClose={() => {
        if (window.confirm("タイトルに戻りますか？")) {
          window.location.href = "/";
        }
      }}
      style={customStyles}
    >
      <div className="w-[min(90vw,30rem)] rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-10 text-white shadow-[0_35px_80px_-20px_rgba(15,23,42,0.8)]">
        <header className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-500/20 text-2xl font-semibold text-blue-200">
            WG
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-blue-200/80">
              Congratulations
            </p>
            <h2 className="mt-1 text-3xl font-semibold leading-tight">
              ゴール達成！
            </h2>
          </div>
        </header>
        <p className="mt-6 text-sm leading-relaxed text-slate-300">
          {startTitle ? `「${startTitle}」からスタートして「${goal}」に到達しました。` : `「${goal}」に到達しました。`}
          あなたのプレイ結果をシェアして、友だちとスコアを競いましょう。
        </p>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-md uppercase tracking-[0.35em] text-slate-300">
            記録
          </p>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-5xl font-bold text-white">{stroke}</span>
            <span className="text-md text-slate-300">打</span>
          </div>
          {isTimeAttackMode && (
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-blue-200">{formattedTime}</span>
              <span className="text-md text-slate-300">秒</span>
            </div>
          )}
          <dl className="mt-4 space-y-2 text-sm text-slate-200">
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">スタート記事</dt>
              <dd className="text-right text-white/90">
                {startTitle || "-"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">ゴール記事</dt>
              <dd className="text-right text-white/90">{goal || "-"}</dd>
            </div>
          </dl>
        </section>

        <section className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TwitterShareButton
            url={shareUrl}
            title={`Wikipedia Golfで｢${startTitle}｣から${stroke}打で｢${goal}｣に到達しました！${timeText}`}
            hashtags={hashtags}
          >
            <div className="group flex w-full items-center justify-center gap-3 rounded-full bg-blue-500/90 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-400 sm:w-auto sm:self-start">
              <XIcon size={28} round={true} />
              <span className="tracking-wide">Xで結果をシェア</span>
            </div>
          </TwitterShareButton>

          <button
            type="button"
            onClick={handleCopy}
            className={`w-full rounded-full px-6 py-3 text-sm font-semibold transition sm:ml-auto sm:w-auto ${isCopied
              ? "bg-emerald-500 text-white shadow-lg"
              : "border border-white/20 bg-transparent text-white hover:bg-white/10"
              }`}
          >
            {isCopied ? "コピーしました！" : "共有テキストをコピー"}
          </button>
        </section>

        <p className="mt-8 text-center text-xs text-slate-400">
          タイトルに戻るには枠外をクリックしてください。
        </p>
      </div>
    </Modal>
  );
};
