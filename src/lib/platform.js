export function isNativeApp() {
  const cap = typeof window !== 'undefined' ? window.Capacitor : undefined
  if (!cap) return false
  if (typeof cap.isNativePlatform === 'function') return cap.isNativePlatform()
  return Boolean(cap.isNative)
}