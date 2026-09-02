import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { Fraunces, Shippori_Mincho } from "next/font/google";

const mincho = Shippori_Mincho({
  weight: ["500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mincho",
  preload: false,
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["opsz"],
});

const SITE_ORIGIN = "https://wikipedia-golf.vercel.app";
const DESCRIPTION =
  "スタート記事からリンクだけを辿って、最少の打数でゴール記事へ。毎日更新される「今日のお題」で友だちと競おう。";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Wikipedia Golf</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Wikipedia Golf" />
        <meta property="og:title" content="Wikipedia Golf" />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={SITE_ORIGIN} />
        <meta name="twitter:card" content="summary" />
      </Head>
      <div className={`${mincho.variable} ${fraunces.variable} font-sans`}>
        <Component {...pageProps} />
      </div>
    </>
  );
}
