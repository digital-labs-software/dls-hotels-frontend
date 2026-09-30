export const ROOM_PHOTO_THUMB = 'w_400,c_fill,g_auto,f_auto,q_auto'
export const ROOM_PHOTO_DETAIL = 'w_1200,c_limit,f_auto,q_auto'

export const cloudinaryTransformedUrl = (url: string | null | undefined, transform: string) => {
  if (!url) {
    return null
  }

  const marker = '/image/upload/'
  const index = url.indexOf(marker)

  if (index === -1 || !transform) {
    return url
  }

  const prefix = url.slice(0, index + marker.length)
  const rest = url.slice(index + marker.length)

  if (rest.startsWith(`${transform}/`)) {
    return url
  }

  return `${prefix}${transform}/${rest}`
}
