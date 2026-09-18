import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

const blockedPaths = ['/admin/', '/produtor/', '/api/']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: blockedPaths,
      },
      {
        userAgent: 'OAI-SearchBot',
        allow: '/',
        disallow: blockedPaths,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
