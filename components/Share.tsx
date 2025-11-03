import { useState } from "react";

import Modal from "react-modal";
import { TwitterShareButton, XIcon } from "react-share";

interface ShareModalProps {
  gameState: "idle" | "playing" | "gameover";
  stroke: number;
  history: { title: string; url: string; stroke: number }[];
  goal: string;
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
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", // オプション: モーダルに影をつける
    border: "none",

  },
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.75)",
  },
};

export const ShareModal = ({
  gameState,
  stroke,
  history,
  goal,
}: ShareModalProps) => {
  const [isCopied, setIsCopied] = useState(false);

  const startTitle = history.length > 0 ? history[0].title : "";
  const shareUrl = "https://wikipedia-golf.vercel.app/";
  const shareDateTag = `WikipediaGolf_${new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "_")}`;
  const shareText = `Wikipedia Golfで「${startTitle}」から${stroke}打で「${goal}」に到達しました！\n${shareUrl}\n#WikipediaGolf #${shareDateTag}`;

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
      <div className="game-over bg-gray-900 text-3xl p-12 rounded-xl text-white">
        <p className="mb-6">おめでとうございます！ゴールに到達しました！</p>

        <p className="text-center mb-6">記録: {stroke}打</p>
        <div className="text-center mb-6">
          <TwitterShareButton
            url={shareUrl}
            title={`Wikipedia Golfで｢${startTitle}｣から${stroke}打で｢${goal}｣に到達しました！`}
            hashtags={[
              "WikipediaGolf",
              shareDateTag,
            ]}
          >
            <div className="flex items-center justify-center">
              <XIcon size={32} round={true} />
              <span className="ml-2">で結果をシェアする</span>
            </div>
          </TwitterShareButton>
          <button
            type="button"
            onClick={handleCopy}
            className={`mt-4 w-full rounded-lg px-4 py-2 text-sm font-semibold transition ${isCopied
              ? "bg-black text-white"
              : "bg-white text-gray-900 hover:bg-gray-200"
              }`}
          >
            {isCopied ? "✓コピーしました！" : "共有テキストをコピー"}
          </button>
        </div>
        <div className="text-xl text-center ">
          枠外をクリックするとタイトルに戻ります
        </div>
      </div>
    </Modal>
  );
};
