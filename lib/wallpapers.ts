// Originals remain in public/background light.jpg and public/background dark.jpg.
// Replace these paths with approved native-resolution artwork, never CSS upscaling claims.
export const WALLPAPERS = {
  light: { src: '/wallpapers/store-day.webp', cleanSrc: '/wallpapers/animation/day-base.webp' },
  dark: { src: '/wallpapers/store-night.webp', cleanSrc: '/wallpapers/animation/night-base.webp' },
} as const
