import React, { useState, useEffect } from "react";
import { XIcon, TwitterShareButton } from "react-share";
import CircularProgress from "@mui/material/CircularProgress";

export default function Home() {
  const [title, setTitle] = useState("メインページ");
  const [content, setContent] = useState("");
  const [history, setHistory] = useState<
    { title: string; url: string; stroke: number }[]
  >([]);
  const [stroke, setStroke] = useState(-1);
  const [goal, setGoal] = useState<string>("");
  const [isStart, setIsStart] = useState(false);
  const [goalArticle, setGoalArticle] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gameState, setGameState] = useState<"start" | "playing" | "gameover">(
    "start"
  );
  const [isLoading, setIsLoading] = useState(false);

  const ShareModal = () => {
    if (gameState === "gameover") {
      return (
        <div className="game-over bg-gray-900">
          <h1>おめでとうございます！ゴールに到達しました！</h1>
          <p>打数: {stroke}</p>
          <TwitterShareButton
            // url={location.href}
            url="https://wikipedia-golf.vercel.app/"
            title={`Wikipedia Golfで｢${history[0].title}｣から${stroke}打で｢${goal}｣に到達しました！`}
            hashtags={["WikipediaGolf"]}
          >
            <XIcon size={32} round={true} />
          </TwitterShareButton>
        </div>
      );
    }
  };

  const modalControl = () => {
    setIsModalOpen(!isModalOpen);
    console.log(goalArticle);
  };
  const GoalModal = () => (
    <div className={`${isModalOpen ? "w-2/5" : "hidden"} bg-white p-4`}>
      <div>
        {/* モーダルのコンテンツ */}

        {/* 記事内のリンクを無効化してくれ */}

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
        "https://ja.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*"
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
        "https://ja.wikipedia.org/w/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*"
      );
      const data = await response.json();
      const randomTitle = data.query.random[0].title;
      setGoal(randomTitle);
      const url = `https://ja.wikipedia.org/w/api.php?action=parse&page=${randomTitle}&format=json&origin=*`;
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
    const url = `https://ja.wikipedia.org/w/api.php?action=parse&page=${title}&format=json&origin=*`;
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
    setGameState("start");
    await getGoal();
    setHistory([]);
    await pickStart();
    setStroke(-1);
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
        <ShareModal />
      </div>
      <div className="bg-gray-100 text-black mr-96 flex flex-row justify-start items-start">
        {/* 履歴セクション */}
        {/* fix this スクロールできない */}
        <div className="history flex-none w-1/4 h-4/5 p-4 bg-white border-r-2 border-white rounded-2xl mt-10 sticky top-20 overflow-y-scroll">
          {goal !== "" && stroke > -1 ? (
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

          <h2>履歴</h2>
          <ul>
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
            className={`flex justify-center items-center h-screen w-screen  ${
              isModalOpen ? "w-2/5" : "w-4/5"
            }`}
          >
            <CircularProgress />
          </div>
        ) : (
          <div
            id="articleContent"
            dangerouslySetInnerHTML={{ __html: content }}
            className={`flex-grow p-4 flex flex-col ${
              isModalOpen ? (isLoading ? "hidden" : "w-2/5") : "w-4/5"
            }`}
          />
        )}
      </div>
    </div>
  );
}
