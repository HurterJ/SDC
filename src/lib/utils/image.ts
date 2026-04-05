/** Compression canvas → WebP, 1920×1080 max, qualité 0.82 */
export async function compressImage(file: File): Promise<File> {
  const MAX_W = 1920
  const MAX_H = 1080
  const QUALITY = 0.82
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > MAX_W || height > MAX_H) {
        const ratio = Math.min(MAX_W / width, MAX_H / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file)
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }))
        },
        'image/webp',
        QUALITY
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}
