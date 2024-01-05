import { useState } from "react";
import { useEffect } from "react";
export default function Home() {
  const [url, setUrl] = useState<string>("メインページ");
  const [stroke, setStroke] = useState<number>(0);

  useEffect(() => {
    const iframe = document.querySelector("iframe");
    if (iframe) {
      const handleLoad = () => {
        setStroke((prevStroke) => prevStroke + 1);
      };
      iframe.addEventListener("load", handleLoad);

      // クリーンアップ関数
      return () => {
        iframe.removeEventListener("load", handleLoad);
      };
    }
  }, [url]); // URLが変更されるたびにイベントリスナーを更新

  return (
    <main>
      <div>
        <p className="text-center text-3xl mt-6 font-bold">打数: {stroke}</p>
        <input
          className={`border-2 border-gray-300 rounded-md p-2 m-2 text-black`}
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>
      <iframe
        className={`h-screen w-screen`}
        src={`https://jp.wikipedia.org/wiki/${url}`}
        title="Wikipedia Page"
      ></iframe>
    </main>
  );
}
