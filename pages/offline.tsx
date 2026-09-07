import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

import { Wordmark } from "@/components/Brand";
import { Button, ButtonLink } from "@/components/ui/Button";
import { HomeIcon, RefreshIcon } from "@/components/ui/Icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/**
 * Served by the service worker when a navigation fails while offline.
 * Wikipedia articles are always fetched live, so the game itself needs a
 * connection; this page just explains that and offers a retry.
 */
/** Only same-origin, absolute-path targets are safe to navigate back to. */
const safeReturnPath = (value: string | string[] | undefined): string | null => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
};

export default function Offline() {
  const router = useRouter();
  const from = safeReturnPath(router.query.from);

  const retry = () => {
    if (from) {
      window.location.assign(from);
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <Head>
        <title>オフライン | Wikipedia Golf</title>
        <meta name="robots" content="noindex" />
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">Rain delay</p>
          <h1 className="mt-4 font-display text-2xl font-bold">オフラインです</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-2">
            Wikipedia
            の記事はプレイ中にその場で取得するため、ラウンドにはインターネット接続が必要です。接続が戻ったら、もう一度お試しください。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              variant="primary"
              leading={<RefreshIcon size={16} />}
              onClick={retry}
            >
              再読み込み
            </Button>
            <ButtonLink href="/" variant="secondary" leading={<HomeIcon size={16} />}>
              タイトルに戻る
            </ButtonLink>
          </div>
        </div>
      </main>
    </div>
  );
}
