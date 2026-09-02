import Head from "next/head";
import Link from "next/link";

import { Wordmark } from "@/components/Brand";
import { ButtonLink } from "@/components/ui/Button";
import { GitHubIcon, HomeIcon } from "@/components/ui/Icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function Custom404() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <Head>
        <title>ページが見つかりません | Wikipedia Golf</title>
      </Head>
      <header className="border-b border-rule">
        <div className="mx-auto flex h-16 max-w-shell items-center justify-between px-4 sm:px-6">
          <Link href="/" className="rounded-xl transition hover:opacity-80">
            <Wordmark size="sm" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-shell flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-lg animate-fade-up rounded-card border border-rule bg-paper-2 p-8 text-center shadow-paper-lg sm:p-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">Out of bounds</p>
          <p
            className="mt-3 font-numeral text-[6rem] font-semibold leading-none tracking-tight text-ink sm:text-[8rem]"
            style={{ fontVariationSettings: '"opsz" 144' }}
          >
            404
          </p>
          <h1 className="mt-4 font-display text-2xl font-bold">ページが見つかりません</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">
            お探しのページは移動または削除されたようです。タイトルに戻って、もう一度ティーオフしましょう。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <ButtonLink href="/" variant="primary" leading={<HomeIcon size={16} />}>
              タイトルに戻る
            </ButtonLink>
            <ButtonLink
              href="https://github.com/shiryu2002/Wikipedia-Golf/issues"
              target="_blank"
              rel="noopener noreferrer"
              variant="secondary"
              leading={<GitHubIcon size={16} />}
            >
              GitHubで報告する
            </ButtonLink>
          </div>
        </div>
      </main>
    </div>
  );
}
