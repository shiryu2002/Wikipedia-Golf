import { Html, Head, Main, NextScript } from "next/document";
import { themeInitScript } from "@/components/ui/ThemeToggle";

export default function Document() {
  return (
    <Html lang="ja">
      <Head>
        <meta name="application-name" content="Wikipedia Golf" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#F7F3EA" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#151411" />
        <link rel="icon" href="/favicon.ico" />
        {/* Apply the stored theme before paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </Head>
      <body className="paper-grain">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
