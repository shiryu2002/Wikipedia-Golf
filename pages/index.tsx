import { useState } from "react";
import { useEffect } from "react";
export default function Home() {
  const [baseURL, setBaseURL] = useState<string>(
    "https://ja.wikipedia.org/wiki/"
  );
  const [url, setUrl] = useState<string>("メインページ");
  const [stroke, setStroke] = useState<number>(0);
  const [history, setHistory] = useState<{ url: string; stroke: number }[]>([]);

  useEffect(() => {
    const iframe = document.querySelector("iframe");
    console.log(iframe);
    if (iframe) {
      console.table(history);
      const handleLoad = () => {
        //記事名を取得
        setStroke((prevStroke) => prevStroke + 1);
      };
      iframe.addEventListener("load", handleLoad);

      // クリーンアップ関数
      return () => {
        iframe.removeEventListener("load", handleLoad);
      };
    }
  }, [history, stroke]);

  return (
    <main>
      <div>
        <p className="text-center text-3xl my-6 ">
          打数:<span className="text-5xl font-bold"> {stroke}</span>
        </p>
      </div>
      <iframe
        className={`h-screen w-screen`}
        src={`${baseURL}${url}`}
        title="Wikipedia Page"
      ></iframe>
    </main>
  );
}
