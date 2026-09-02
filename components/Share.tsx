import { TwitterShareButton, XIcon } from "react-share";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import {
  CheckIcon,
  CopyIcon,
  FlagIcon,
  HomeIcon,
  LinkIcon,
  RefreshIcon,
  RouteIcon,
} from "@/components/ui/Icons";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { formatTime } from "@/utils/time";

interface ShareModalProps {
  open: boolean;
  stroke: number;
  history: { title: string; url: string; stroke: number }[];
  goal: string;
  isDailyMode: boolean;
  isTimeAttackMode: boolean;
  elapsedTime: number;
  locale: "en" | "ja";
  /** Whether hints were on — carried into the shareable hole URL. */
  hintEnabled?: boolean;
  onViewArticle: () => void;
  onReturnToTitle: () => void;
  onReplay: () => void;
}

const SITE_ORIGIN = "https://wikipedia-golf.vercel.app";

const strokeComment = (stroke: number) => {
  if (stroke <= 1) return "ホールインワン！";
  if (stroke <= 3) return "見事なショートゲーム。";
  if (stroke <= 6) return "堅実なプレーでした。";
  if (stroke <= 10) return "寄り道も知識のうち。";
  return "長い旅路、お疲れさまでした。";
};

export const ShareModal = ({
  open,
  stroke,
  history,
  goal,
  isDailyMode,
  isTimeAttackMode,
  elapsedTime,
  locale,
  hintEnabled = false,
  onViewArticle,
  onReturnToTitle,
  onReplay,
}: ShareModalProps) => {
  const { copied: isCopied, copy: copyText } = useCopyToClipboard();
  const { copied: isRouteCopied, copy: copyRoute } = useCopyToClipboard();
  const { copied: isUrlCopied, copy: copyUrl } = useCopyToClipboard();

  const startTitle = history.length > 0 ? history[0].title : "";
  const defaultShareUrl = `${SITE_ORIGIN}/`;
  const challengeShareUrl =
    !isDailyMode && startTitle && goal
      ? (() => {
          const params = new URLSearchParams({
            start: "custom",
            startTitle,
            goalTitle: goal,
          });
          if (locale) {
            params.set("locale", locale);
          }
          if (hintEnabled) {
            params.set("hint", "1");
          }
          return `${SITE_ORIGIN}/game?${params.toString()}`;
        })()
      : null;
  const shareUrl = challengeShareUrl ?? defaultShareUrl;
  const shareDateTag = `WikipediaGolf_${new Date().toISOString().slice(0, 10).replace(/-/g, "_")}`;
  const formattedTime = formatTime(elapsedTime);
  const timeText = isTimeAttackMode ? ` タイム: ${formattedTime}秒` : "";
  const baseShareText = `Wikipedia Golfで「${startTitle}」から${stroke}打で「${goal}」に到達しました！${timeText}`;
  const shareTagLine = isDailyMode ? `#WikipediaGolf #${shareDateTag}` : "#WikipediaGolf";
  const shareText = `${baseShareText}\n${shareUrl}\n${shareTagLine}`;
  const hashtags = isDailyMode ? ["WikipediaGolf", shareDateTag] : ["WikipediaGolf"];

  const routeText = `${history
    .map((item, index) => (index === 0 ? `スタート: ${item.title}` : `${item.stroke}打目: ${item.title}`))
    .join("\n")}\nゴール: ${goal}`;

  return (
    <Dialog
      open={open}
      variant="sheet"
      size="md"
      dismissible={false}
      showClose={false}
      mobileFull
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" size="sm" onClick={onViewArticle}>
            記事を見る
          </Button>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row">
            <Button variant="secondary" leading={<HomeIcon size={16} />} onClick={onReturnToTitle}>
              タイトルへ
            </Button>
            <Button variant="primary" leading={<RefreshIcon size={16} />} onClick={onReplay}>
              <span className="sm:hidden">もう一度</span>
              <span className="hidden sm:inline">同じお題でもう一度</span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="text-center">
        <h2 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">ゴール達成</h2>
        <p className="mt-2 text-sm text-ink-2">{strokeComment(stroke)}</p>
      </div>

      {/* Scorecard */}
      <div className="mt-4 rounded-card border border-rule bg-paper p-4 sm:mt-6 sm:p-5">
        <div className={`grid gap-4 ${isTimeAttackMode ? "grid-cols-2" : "grid-cols-1"}`}>
          <div className="text-center">
            <p className="text-xs font-medium text-ink-2">打数</p>
            <p className="mt-1 flex items-baseline justify-center gap-1.5">
              <span
                className="tabular font-numeral text-5xl font-semibold leading-none tracking-tight text-ink sm:text-6xl"
                style={{ fontVariationSettings: '"opsz" 144' }}
              >
                {stroke}
              </span>
              <span className="text-sm font-semibold text-ink-3">打</span>
            </p>
          </div>
          {isTimeAttackMode && (
            <div className="border-l border-rule text-center">
              <p className="text-xs font-medium text-ink-2">タイム</p>
              <p className="mt-1 flex items-baseline justify-center gap-1.5">
                <span
                  className="tabular font-numeral text-5xl font-semibold leading-none tracking-tight text-ink"
                  style={{ fontVariationSettings: '"opsz" 120' }}
                >
                  {formattedTime}
                </span>
                <span className="text-sm font-semibold text-ink-3">秒</span>
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-start gap-3 border-t border-rule pt-4 text-left sm:mt-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Start</p>
            <p className="mt-0.5 break-words font-display text-[15px] font-bold leading-snug">{startTitle || "-"}</p>
          </div>
          <svg width="24" height="10" viewBox="0 0 28 10" aria-hidden className="mt-4 text-rule-2">
            <path d="M0 5h24M20 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <div className="min-w-0 text-right">
            <p className="flex items-center justify-end gap-1 text-[11px] font-semibold uppercase tracking-wider text-gold">
              <FlagIcon size={12} /> Goal
            </p>
            <p className="mt-0.5 break-words font-display text-[15px] font-bold leading-snug">{goal || "-"}</p>
          </div>
        </div>
      </div>

      {/* Route */}
      {history.length > 1 && (
        <details className="group mt-4 rounded-xl border border-rule bg-paper-2">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <RouteIcon size={16} className="text-ink-2" /> 辿ったルート
            </span>
            <span className="text-xs font-normal text-ink-3 group-open:hidden">表示</span>
            <span className="hidden text-xs font-normal text-ink-3 group-open:inline">閉じる</span>
          </summary>
          <ol className="scroll-thin max-h-48 space-y-1.5 overflow-y-auto border-t border-rule px-4 py-3 text-sm">
            {history.map((item, index) => (
              <li key={`${item.title}-${index}`} className="flex gap-3">
                <span className="tabular w-8 shrink-0 text-right text-xs font-semibold text-ink-3">
                  {index === 0 ? "S" : item.stroke}
                </span>
                <span className={`min-w-0 break-words ${index === history.length - 1 ? "font-semibold text-ink" : "text-ink-2"}`}>
                  {item.title}
                </span>
              </li>
            ))}
          </ol>
        </details>
      )}

      {/* Share actions */}
      <div className="mt-4 grid gap-2 sm:mt-5 sm:grid-cols-2">
        <TwitterShareButton
          url={shareUrl}
          title={`Wikipedia Golfで｢${startTitle}｣から${stroke}打で｢${goal}｣に到達しました！${timeText}`}
          hashtags={hashtags}
          className="!block sm:col-span-2"
          resetButtonStyle={false}
        >
          <span className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-paper-2 shadow-lift transition hover:bg-ink/90 active:translate-y-px">
            <XIcon size={22} round bgStyle={{ fill: "transparent" }} iconFillColor="currentColor" />
            Xでシェア
          </span>
        </TwitterShareButton>
        <Button
          variant={isCopied ? "accent" : "secondary"}
          leading={isCopied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
          onClick={() => void copyText(shareText)}
        >
          {isCopied ? "コピーしました" : "共有用テキストをコピー"}
        </Button>
        <Button
          variant={isRouteCopied ? "accent" : "secondary"}
          leading={isRouteCopied ? <CheckIcon size={16} /> : <RouteIcon size={16} />}
          onClick={() => void copyRoute(routeText)}
        >
          {isRouteCopied ? "コピーしました" : "ルートをコピー"}
        </Button>
        {challengeShareUrl && (
          <Button
            variant={isUrlCopied ? "accent" : "secondary"}
            leading={isUrlCopied ? <CheckIcon size={16} /> : <LinkIcon size={16} />}
            onClick={() => void copyUrl(challengeShareUrl)}
            className="sm:col-span-2"
          >
            {isUrlCopied ? "コピーしました" : "このホールのURLをコピー"}
          </Button>
        )}
      </div>
    </Dialog>
  );
};
