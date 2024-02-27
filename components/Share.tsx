import Modal from "react-modal";
import { TwitterShareButton, XIcon } from "react-share";
import cat from "../public/cat.png";

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
  return (
    <Modal
      isOpen={gameState === "gameover"}
      onRequestClose={() => {
        if (window.confirm("タイトルに戻りますか？")) {
          window.location.reload();
        }
      }}
      style={customStyles}
    >
      <div className="game-over bg-gray-900 text-3xl p-12 rounded-xl text-white">
        <p className="mb-6">おめでとうございます！ゴールに到達しました！</p>

        <p className="text-center mb-6">打数: {stroke}</p>
        <div className="text-center mb-6">
          <TwitterShareButton
            url="https://wikipedia-golf.vercel.app/"
            title={`Wikipedia Golfで｢${
              history.length > 0 ? history[0].title : ""
            }｣から${stroke}打で｢${goal}｣に到達しました！`}
            hashtags={["WikipediaGolf"]}
          >
            <div className="flex items-center justify-center">
              <XIcon size={32} round={true} />
              <span className="ml-2">で結果をシェアする</span>
            </div>
          </TwitterShareButton>
        </div>
        <div className="text-xl text-center ">
          枠外をクリックするとタイトルに戻ります
        </div>
      </div>
    </Modal>
  );
};
