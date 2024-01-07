import { useState, useEffect } from "react";

export default function Home() {
  const [baseURL, setBaseURL] = useState("https://ja.wikipedia.org/wiki/");
  const [article, setArticle] = useState("メインページ");
  const [stroke, setStroke] = useState(0);
  const [history, setHistory] = useState<{ url: string; stroke: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const iframe = document.querySelector("iframe");
    if (iframe && iframe.contentWindow) {
      const handleLoad = () => {
        setStroke((prevStroke) => prevStroke + 1);
        let currentUrl;
        try {
          if (iframe && iframe.contentWindow) {
            currentUrl = iframe.contentWindow.location.href;
          }
        } catch (e) {
          console.error("URLの取得に失敗しました。", e);
          return;
        }
        const newHistoryItem = { url: currentUrl, stroke: stroke + 1 };
        setHistory([...history, { url: currentUrl || "", stroke: stroke + 1 }]);
      };
      iframe.addEventListener("load", handleLoad);

      return () => {
        iframe.removeEventListener("load", handleLoad);
      };
    }
  }, [history, stroke]);

  const pickRandom = () => {
    setArticle("特別:おまかせ表示");
  };

  return (
    <main>
      <div className="sticky top-0 z-10 bg-black flex justify-center items-center">
        <p className="text-center text-3xl py-4">
          打数:<span className="text-5xl font-bold"> {stroke}</span>
        </p>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 mx-6 rounded"
          onClick={pickRandom}
        >
          ランダム
        </button>
      </div>
      <iframe
        className="h-screen w-screen"
        src={`${baseURL}${article}`}
        title="Wikipedia Page"
      ></iframe>
      <div className="history">
        <h2>履歴</h2>
        <ul>
          {history.map((item, index) => (
            <li key={index}>
              {item.stroke}: <a href={item.url}>{item.url}</a>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
