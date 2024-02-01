import React, { useState, useEffect } from "react";

import CircularProgress from "@mui/material/CircularProgress";
import countReferer from "@/useCase/referer";
import { HintsModal } from "@/components/Hints";
import { ShareModal } from "@/components/Share";

export default function Home() {
  const [title, setTitle] = useState<string>("メインページ"); //英語版は"Main Page"
  const [locale, setLocale] = useState<"en" | "ja">("ja");
  const [content, setContent] = useState("");
  const [history, setHistory] = useState<
    { title: string; url: string; stroke: number }[]
  >([]);
  const [stroke, setStroke] = useState<number>(-1);
  const [goal, setGoal] = useState<string>("");
  const [goalArticle, setGoalArticle] = useState("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">(
    "idle"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [numOfReferer, setNumOfReferer] = useState<number>(0);
  const [hints, setHints] = useState([]);
  const [isHintModalOpen, setHintModal] = useState(false);
  const modalControl = () => {
    setIsModalOpen(!isModalOpen);
  };
  const GoalModal = () => (
    <div
      className={`${isModalOpen ? "w-2/5" : "hidden"} bg-white p-4 rounded-2xl`}
    >
      <div>
        <div className="text-center text-3xl">{goal}</div>
        <div className="text-center text-xl">リンク元数:{numOfReferer}</div>
        <div
          dangerouslySetInnerHTML={{ __html: goalArticle }}
          id="articleContent2"
          className="w-full"
        ></div>
      </div>
    </div>
  );
  const pickStart = async () => {
    try {
      const response = await fetch(
        `https://${locale}.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*`
      );
      const data = await response.json();
      const randomTitle = data.query.random[0].title;
      setTitle(randomTitle);
      setGameState("playing");
    } catch (error) {
      console.error("スタートページの取得に失敗しました", error);
    }
  };

  const getGoal = async () => {
    try {
      const response = await fetch(
        `https://${locale}.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*`
      );
      const data = await response.json();
      const randomTitle = data.query.random[0].title;
      setGoal(randomTitle);
      const ref = await countReferer(randomTitle, locale);
      setNumOfReferer(ref.numOfRef);
      setHints(ref.hints);
      console.log(ref.hints);
      const url = `https://${locale}.wikipedia.org/w/api.php?action=parse&page=${randomTitle}&format=json&origin=*`;
      const response2 = await fetch(url);
      const data2 = await response2.json();
      setGoalArticle(data2.parse.text["*"]);
    } catch (error) {
      console.error("ゴールページの取得に失敗しました", error);
    }
  };

  const checkIfGameOver = (title: string) => {
    if (title === goal) {
      setGameState("gameover");
    }
  };

  useEffect(() => {
    fetchTitle(title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  useEffect(() => {
    const links = document.querySelectorAll("#articleContent a");
    links.forEach((link) => {
      link.addEventListener("click", handleLinkClick);
    });

    return () => {
      links.forEach((link) => {
        link.removeEventListener("click", handleLinkClick);
      });
    };
  }, [content]);

  const fetchTitle = async (title: string) => {
    setIsLoading(true);
    const url = `https://${locale}.wikipedia.org/w/api.php?action=parse&page=${title}&format=json&origin=*`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      setContent(data.parse.text["*"]);
      if (title !== "メインページ" && gameState === "playing") {
        setStroke(stroke + 1);
        setHistory((prev) => [
          ...prev,
          { title: title, url: url, stroke: stroke + 1 },
        ]);
      }
      checkIfGameOver(title);
    } catch (error) {
      console.error("記事の取得に失敗しました", error);
    } finally {
      setIsLoading(false); // ローディング終了
      //一番上にスクロール
      window.scrollTo(0, 0);
    }
  };
  useEffect(() => {
    const links = document.querySelectorAll("#articleContent a");
    links.forEach((link) => {
      link.addEventListener("click", handleLinkClick);
    });

    return () => {
      links.forEach((link) => {
        link.removeEventListener("click", handleLinkClick);
      });
    };
  }, [content]);
  const handleLinkClick = (event: any) => {
    event.preventDefault();
    const title = event.target.getAttribute("title");
    if (title) {
      setTitle(title);
    }
  };

  const handleBackClick = () => {
    if (history[history.length - 1].title)
      setTitle(history[history.length - 1].title);
    setHistory(history.slice(0, history.length - 1));
    setStroke(stroke - 1);
  };

  const start = async () => {
    if (stroke > 0) {
      const confirm = window.confirm("別のお題でやり直しますか？");
      if (!confirm) return;
    }
    setGameState("idle");
    setHintModal(false);
    setStroke(-1);
    setHistory([]);
    setIsModalOpen(true);
    await getGoal();
    await pickStart();
  };

  return (
    <div className="bg-gray-100">
      <div className="sticky top-0 z-10 bg-black text-white flex justify-center items-center">
        {/* ヘッダーセクション */}
        <p className="text-center text-3xl py-4">
          打数:
          <span className="text-5xl font-bold">
            {" "}
            {stroke == -1 ? "0" : stroke}
          </span>
        </p>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 mx-6 rounded"
          onClick={start}
        >
          スタート
        </button>
        {gameState === "playing" && (
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 mx-6 rounded"
            onClick={() => setHintModal(!isHintModalOpen)}
          >
            ヒントを見る
          </button>
        )}
        {/* <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 mx-6 rounded"
          onClick={pickRandom}
        >
          ランダム
        </button> */}
        {/* <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleBackClick}
        >
          戻る
        </button> */}
        <ShareModal
          gameState={gameState}
          stroke={stroke}
          history={history}
          goal={goal}
        />
      </div>
      <div className="bg-gray-100 text-black mr-96 flex flex-row justify-start items-start">
        {/* 履歴セクション */}
        {/* fix this スクロールできない */}
        <div
          className={`history flex-none w-1/4 h-4/5 p-4 bg-white border-r-2 border-white rounded-2xl mr-5 sticky top-20 `}
        >
          {/* {goal !== "" && stroke > -1 ? ( */}
          {goal !== "" ? (
            <div className="text-center">
              <p className="text-xl">
                ↓をクリックすると
                <br />
                記事を開閉できます
              </p>
              <button onClick={modalControl} className="text-black text-xl">
                <p className="">
                  ゴール:
                  <span className="text-red-600 text-3xl hover:underline">
                    {goal}
                  </span>
                </p>
              </button>
            </div>
          ) : (
            <div>
              <p>ゴールが設定されていません</p>
            </div>
          )}
          <HintsModal hints={hints} isOpen={isHintModalOpen} />
          <ul className="overflow-auto max-h-screen mt-6">
            {history.map((item, index) => (
              <li key={index}>
                {item.stroke == 0 ? (
                  <span className="text-center">
                    <div className="text-green-600 font-bold text-3xl">
                      スタート:{item.title}
                    </div>
                    <div>↓</div>
                  </span>
                ) : (
                  <div className="text-center text-2xl">
                    <span>
                      {item.stroke}打目:{item.title}
                    </span>
                    <div>↓</div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
        {/* コンテンツセクション */}
        <GoalModal />
        {isLoading ? (
          <div
            className={`flex justify-center items-center h-screen  ${
              isModalOpen ? "w-2/5" : "w-4/5"
            }`}
          >
            <CircularProgress />
          </div>
        ) : (
          <div
            id="articleContent"
            dangerouslySetInnerHTML={{ __html: content }}
            className={`flex-grow p-4 flex flex-col bg-white ml-8 rounded-2xl
             ${isModalOpen ? "w-2/5" : "w-4/5"}`}
          />
        )}
      </div>
    </div>
  );
}
