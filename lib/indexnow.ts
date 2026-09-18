import 'server-only'

import {
  SITE_URL,
  absoluteUrl,
  categorySeoPath,
  citySeoPath,
} from '@/lib/seo'

const INDEXNOW_KEY = '45c6c4c0a7a7b3e7860bb568bd7eb520'
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/IndexNow'
const SITE_HOST = new URL(SITE_URL).hostname

interface IndexableEvent {
  id: string
  city?: string | null
  state?: string | null
  category_name?: string | null
}

export async function notifyIndexNow(urls: string[]) {
  const uniqueUrls = Array.from(
    new Set(
      urls
        .map((value) => {
          try {
            return new URL(value, SITE_URL)
          } catch {
            return null
          }
        })
        .filter(
          (url): url is URL =>
            Boolean(url) &&
            url.hostname === SITE_HOST &&
            (url.protocol === 'https:' || url.protocol === 'http:')
        )
        .map((url) => {
          url.hash = ''
          return url.toString()
        })
    )
  ).slice(0, 10000)

  if (uniqueUrls.length === 0) {
    return { success: true, submitted: 0 }
  }

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        host: SITE_HOST,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: uniqueUrls,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    })

    if (!response.ok && response.status !== 202) {
      console.error(
        'IndexNow recusou a atualização:',
        response.status,
        await response.text().catch(() => '')
      )
      return { success: false, submitted: 0 }
    }

    return { success: true, submitted: uniqueUrls.length }
  } catch (error) {
    console.error('IndexNow indisponível; publicação seguirá normalmente:', error)
    return { success: false, submitted: 0 }
  }
}

export async function notifyIndexNowForEvent(event: IndexableEvent) {
  const urls = [
    absoluteUrl(`/evento/${event.id}`),
    absoluteUrl('/eventos'),
    absoluteUrl('/sitemap.xml'),
  ]

  if (event.city && event.state) {
    urls.push(absoluteUrl(citySeoPath(event.city, event.state)))
  }

  if (event.category_name) {
    urls.push(absoluteUrl(categorySeoPath(event.category_name)))
  }

  return notifyIndexNow(urls)
}
