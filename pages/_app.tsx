import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()

  useEffect(() => {
    // Handle browser back/forward button with confirmation
    router.beforePopState(() => {
      const confirmed = window.confirm('タイトルに戻りますか？ゲームは中断されます。')
      if (!confirmed) {
        // Prevent navigation
        window.history.pushState(null, '', router.asPath)
        return false
      }
      return true
    })

    return () => {
      router.beforePopState(() => true)
    }
  }, [router])

  return <Component {...pageProps} />
}
