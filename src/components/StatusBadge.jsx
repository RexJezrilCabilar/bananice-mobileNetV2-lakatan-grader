import { useEffect, useState } from 'react'
import { isNativeApp } from '../lib/platform.js'

export default function StatusBadge({ modelState }) {
  const native = isNativeApp()
  const [offlineReady, setOfflineReady] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  useEffect(() => {
    if (native || !('serviceWorker' in navigator)) return undefined
    let cancelled = false
    navigator.serviceWorker.ready.then(() => {
      if (cancelled) return
      setOfflineReady(true)
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(() => {})
      }
    })
    return () => {
      cancelled = true
    }
  }, [native])

  let text = 'Model ready · saving a copy for offline use…'
  let tone = 'bg-sky-500/15 text-sky-200'
  if (modelState === 'loading') {
    text = 'Loading model…'
    tone = 'bg-amber-500/15 text-amber-200'
  } else if (modelState === 'error') {
    text = 'Model failed to load'
    tone = 'bg-red-500/15 text-red-200'
  } else if (native) {
    text = 'Android app · model is bundled, works offline'
    tone = 'bg-emerald-500/15 text-emerald-200'
  } else if (offlineReady) {
    text = online ? 'Ready offline' : 'Offline · running from the saved copy'
    tone = 'bg-emerald-500/15 text-emerald-200'
  }

  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${tone}`}>{text}</span>
}