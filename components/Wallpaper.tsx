'use client'

import Image from 'next/image'
import { useCallback, useState } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { WALLPAPERS } from '@/lib/wallpapers'
import { StoreEnvironment } from './StoreEnvironment'

export function Wallpaper() {
  const { theme } = useTheme()
  const [ready, setReady] = useState({ light: false, dark: false })
  const [cleanReady, setCleanReady] = useState({ light: false, dark: false })
  const [spritesReady, setSpritesReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const assetsReady = useCallback(() => setSpritesReady(true), [])
  const assetFailed = useCallback(() => setFailed(true), [])
  const animated = spritesReady && cleanReady.light && cleanReady.dark && !failed
  const visible = ready[theme] ? theme : ready.light ? 'light' : 'dark'
  return (
    <div className="wallpaper absolute inset-0 pointer-events-none overflow-hidden bg-background" aria-hidden>
      {(['light', 'dark'] as const).map(mode => (
        <div key={mode} className="wallpaper-layer absolute inset-0"
          style={{ opacity: mode === visible && ready[mode] ? 1 : 0 }}>
          <Image src={WALLPAPERS[mode].src} alt="" fill sizes="100vw"
            preload={mode === theme}
            onLoad={() => setReady(current => current[mode] ? current : { ...current, [mode]: true })}
            className="wallpaper-image object-contain" style={{ visibility: animated ? 'hidden' : 'visible' }} />
          <Image src={WALLPAPERS[mode].cleanSrc} alt="" fill sizes="100vw"
            onLoad={() => setCleanReady(current => current[mode] ? current : { ...current, [mode]: true })}
            onError={assetFailed} className="wallpaper-image object-contain"
            style={{ visibility: animated ? 'visible' : 'hidden' }} />
        </div>
      ))}
      <StoreEnvironment theme={visible} active={animated} onReady={assetsReady} onError={assetFailed} />
    </div>
  )
}
