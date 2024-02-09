/* eslint-disable @next/next/no-img-element */

export default function Home() {
  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto px-4 bg-white text-black">
        <header className="border-b border-blue-300 py-4 ">
          <h1 className="text-3xl ">Wikipediaゴルフ</h1>
          <p className="text-sm">
            Wikipediaゴルフは誰でも遊べるフリーゲームです
          </p>
        </header>
        <div className="flex mt-6">
          <div className="w-3/4 pr-4">
            <section className="mb-6">
              <h2 className="text-xl font-bold mb-2">選り抜き記事</h2>
              <article className="border border-blue-300 p-4 rounded-xl">
                <div className="bg-gray-100 text-gray-900">
                  <div className="container mx-auto px-6 pb-6 ">
                    <header className="text-center my-4">
                      <h1 className="text-4xl ">
                        ようこそ、Wikipediaゴルフへ！
                      </h1>
                    </header>
                    <main>
                      <section className="mb-8 p-4 bg-white shadow-md rounded-lg">
                        <h2 className="text-2xl font-semibold mb-4">
                          ゲームの遊び方
                        </h2>
                        <p className="mb-4">
                          Wikipediaゴルフは、Wikipediaの奥深い世界を楽しみながら、知識を広げることができるユニークなゲームです。プレイヤーは、スタートとなる記事から始めて、指定された目的の記事に、できるだけ少ない「クリック」で到達することを目指します。
                        </p>
                        <ol className="list-decimal pl-4">
                          <li className="mb-2">
                            スタート記事を選ぶ：ゲーム開始時にランダムまたは指定された記事がスタート地点として提供されます。
                          </li>
                          <li className="mb-2">
                            目的地を確認：同時に、目標とする記事が明示されます。この記事にたどり着くことが今回のチャレンジです。
                          </li>
                          <li className="mb-2">
                            探索を開始：スタート記事からリンクを辿り、目的地の記事にできるだけ少ないクリックで到達しようと試みます。
                          </li>
                          <li>
                            記録を更新：クリック数が少ないほどスコアは高くなります。自己ベストや他のプレイヤーとの比較を楽しみましょう。
                          </li>
                        </ol>
                      </section>

                      <section className="mb-8 p-4 bg-white shadow-md rounded-lg">
                        <h2 className="text-2xl font-semibold mb-4">
                          ゲームの魅力
                        </h2>
                        <ul className="list-disc pl-4">
                          <li className="mb-2">
                            知識の拡大：様々な記事を通じて、思わぬ発見や新しい知識に出会うことができます。
                          </li>
                          <li className="mb-2">
                            戦略的思考：最短ルートを見つけるには、記事間の関係性を理解し、戦略的にリンクを選ぶ必要があります。
                          </li>
                          <li>
                            競争と共有：スコアを通じて他のプレイヤーと競争したり、面白い発見を共有することができます。
                          </li>
                        </ul>
                      </section>

                      <section className="p-4 bg-white shadow-md rounded-lg">
                        <h2 className="text-2xl font-semibold mb-4">
                          はじめに
                        </h2>
                        <p>
                          準備はいいですか？それでは、Wikipediaの知識の海を航海し、新たな発見を楽しみましょう。どこへたどり着くか、どんな知識に出会うかは、あなたの探索次第です。
                        </p>
                      </section>
                    </main>
                  </div>
                </div>
              </article>
            </section>
          </div>
          <aside className="w-1/4">
            <section className="mb-6">
              <h2 className="text-xl font-bold mb-2">今日の一枚</h2>
              <article className="border border-blue-300 p-4 rounded-xl">
                <img
                  src="w2.png"
                  alt="Grey heron (Ardea cinerea) standing in water"
                  className="mb-4"
                />
                <div className="text-sm">
                  アオサギ (Ardea cinerea)、湿原にて
                </div>
                <div className="text-blue-600 text-sm">
                  続きを読む / 寄贈 / 掲載
                </div>
              </article>
            </section>
            <section>
              <h2 className="text-xl font-bold mb-2">今日は何の日 2月9日</h2>
              <ul className="list-disc pl-5">
                <li className="mb-2 text-sm">
                  伊能忠敬が日本初の実測に基づく...
                </li>
                <li className="mb-2 text-sm">
                  ウィリアム・G・モーガンがバレーボールを考案 (1895年)
                </li>
                <li className="mb-2 text-sm">ミュンヘン一揆...</li>
              </ul>
              <div className="text-blue-600 text-sm">
                続きを読む / おまかせ表示 / つまみ読み / 選考
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
