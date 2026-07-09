import { Capacitor } from '@capacitor/core'

/** Read a safe-area env() value in CSS pixels */
function readEnvInset(name: string): number {
  if (typeof document === 'undefined') return 0

  const probe = document.createElement('div')
  probe.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:0',
    'height:0',
    `padding-top:env(${name}, 0px)`,
    'visibility:hidden',
    'pointer-events:none',
  ].join(';')

  document.documentElement.appendChild(probe)
  const value = probe.getBoundingClientRect().height
  document.documentElement.removeChild(probe)
  return value
}

function readVisualViewportTopInset(): number {
  if (typeof window === 'undefined') return 0
  const offsetTop = window.visualViewport?.offsetTop ?? 0
  return offsetTop > 0 ? Math.round(offsetTop) : 0
}

/**
 * Android: WebView may draw edge-to-edge on Android 15+ — measure top inset for headers.
 * When native window insets apply (opt-out / decorFitsSystemWindows), measured top is 0.
 * iOS: edge-to-edge with CSS safe-area on headers / public pages.
 */
export async function configureNativeStatusBar(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    const platform = Capacitor.getPlatform()

    if (platform === 'android') {
      await StatusBar.setOverlaysWebView({ overlay: false })
      await StatusBar.setBackgroundColor({ color: '#ffffff' })
      await StatusBar.setStyle({ style: Style.Dark })
    } else {
      await StatusBar.setOverlaysWebView({ overlay: true })
      await StatusBar.setBackgroundColor({ color: '#00000000' })
      await StatusBar.setStyle({ style: Style.Dark })
    }

    await StatusBar.show()
  } catch {
    // CSS fallbacks still apply
  }
}

/** Measure and write global safe-area CSS variables on <html> */
export function applyNativeSafeAreaInsets(): void {
  if (typeof document === 'undefined') return

  const platform = Capacitor.getPlatform()
  const isNative = Capacitor.isNativePlatform()
  const root = document.documentElement

  root.classList.remove('capacitor-android', 'capacitor-ios')

  if (!isNative) {
    root.classList.remove('capacitor-native')
    root.style.removeProperty('--app-safe-area-top')
    root.style.removeProperty('--app-safe-area-bottom')
    root.style.removeProperty('--safe-area-inset-top')
    root.style.removeProperty('--safe-area-inset-bottom')
    return
  }

  root.classList.add('capacitor-native')

  let top = 0
  let bottom = readEnvInset('safe-area-inset-bottom')

  if (platform === 'android') {
    root.classList.add('capacitor-android')
    // Do not force 0 — on Android 15 edge-to-edge this must reflect status bar height.
    top = Math.max(readEnvInset('safe-area-inset-top'), readVisualViewportTopInset())
    bottom = Math.max(bottom, readEnvInset('safe-area-inset-bottom'))
  } else if (platform === 'ios') {
    root.classList.add('capacitor-ios')
    top = Math.max(readEnvInset('safe-area-inset-top'), readVisualViewportTopInset())
    bottom = readEnvInset('safe-area-inset-bottom')
  }

  root.style.setProperty('--app-safe-area-top', `${top}px`)
  root.style.setProperty('--app-safe-area-bottom', `${bottom}px`)
  root.style.setProperty('--safe-area-inset-top', `${top}px`)
  root.style.setProperty('--safe-area-inset-bottom', `${bottom}px`)
}

export function bindNativeSafeAreaListeners(): () => void {
  if (!Capacitor.isNativePlatform()) return () => {}

  const refresh = () => applyNativeSafeAreaInsets()

  window.addEventListener('resize', refresh)
  window.addEventListener('orientationchange', refresh)
  window.visualViewport?.addEventListener('resize', refresh)

  return () => {
    window.removeEventListener('resize', refresh)
    window.removeEventListener('orientationchange', refresh)
    window.visualViewport?.removeEventListener('resize', refresh)
  }
}

if (typeof window !== 'undefined') {
  try {
    if (Capacitor.isNativePlatform()) {
      applyNativeSafeAreaInsets()
    }
  } catch {
    // SafeAreaProvider will retry
  }
}
