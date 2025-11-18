import Image from "next/image";
import Link from "next/link";

export default function Custom404() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/w2.png"
                alt="Wikipedia Golf アイコン"
                width={64}
                height={64}
                className="h-14 w-14 rounded-2xl object-cover sm:h-16 sm:w-16"
                priority
              />
              <div className="max-w-2xl">
                <h1 className="text-2xl font-semibold leading-tight text-white sm:text-3xl md:text-4xl">
                  Wikipedia Golf
                </h1>
                <p className="mt-2 text-sm text-slate-400 sm:text-base">
                  知識の海で最短ルートを描こう
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-16 sm:px-6 sm:py-24">
        <div className="w-full max-w-2xl">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-xl backdrop-blur sm:p-12">
            <div className="mb-8">
              <p className="text-8xl font-bold text-blue-400 sm:text-9xl">404</p>
            </div>
            
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">
              エラーが発生しました。
            </h2>
            
            <p className="mt-4 text-slate-300 sm:text-lg">
              お探しのページは見つかりませんでした。
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="rounded-full bg-blue-500 px-8 py-3 text-center text-sm font-semibold text-white shadow-lg transition hover:bg-blue-400 sm:text-base"
              >
                ホームに戻る
              </Link>
              
              <a
                href="https://github.com/shiryu2002/Wikipedia-Golf/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/20 px-8 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10 sm:text-base"
              >
                Githubで報告する
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
