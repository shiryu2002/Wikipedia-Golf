import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const isNavigatingRef = useRef(false)

  useEffect(() => {
    // Handle browser back/forward button
    const handleBeforePopState = () => {
      const confirmed = window.confirm('前のページに戻りますか？')
      if (!confirmed) {
        // Prevent navigation
        window.history.pushState(null, '', router.asPath)
        return false
      }
      return true
    }

    // Next.js router beforePopState hook
    router.beforePopState(() => {
      return handleBeforePopState()
    })

    return () => {
      router.beforePopState(() => true)
    }
  }, [router])

  return <Component {...pageProps} />
}
