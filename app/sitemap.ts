import type { MetadataRoute } from 'next'
import {
  SITE_URL,
  absoluteUrl,
  categorySeoPath,
  citySeoPath,
  getFutureApprovedEvents,
  getSeoCategories,
} from '@/lib/seo'

export const revalidate = 900

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: absoluteUrl('/eventos'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/quemsomos'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: absoluteUrl('/contato-e-suporte'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: absoluteUrl('/termos-de-uso'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: absoluteUrl('/cadastro'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  try {
    const [events, categories] = await Promise.all([
      getFutureApprovedEvents({ limit: 1000 }),
      getSeoCategories(),
    ])

    const eventPages: MetadataRoute.Sitemap = events.map((event) => ({
      url: absoluteUrl(`/evento/${event.id}`),
      lastModified: event.updated_at ? new Date(event.updated_at) : now,
      changeFrequency: 'daily',
      priority: 0.8,
    }))

    const cities = new Map<string, { city: string; state: string }>()
    const usedCategoryIds = new Set<string>()
    const usedCategoryNames = new Set<string>()

    for (const event of events) {
      if (event.city && event.state) {
        const path = citySeoPath(event.city, event.state)
        cities.set(path, { city: event.city, state: event.state })
      }

      if (event.category_id) usedCategoryIds.add(event.category_id)
      if (event.category_name) usedCategoryNames.add(event.category_name.toLowerCase())
    }

    const cityPages: MetadataRoute.Sitemap = Array.from(cities.entries()).map(
      ([path]) => ({
        url: absoluteUrl(path),
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.75,
      })
    )

    const categoryPages: MetadataRoute.Sitemap = categories
      .filter(
        (category) =>
          usedCategoryIds.has(category.id) ||
          usedCategoryNames.has(category.name.toLowerCase())
      )
      .map((category) => ({
        url: absoluteUrl(categorySeoPath(category.slug)),
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.7,
      }))

    return [...staticPages, ...cityPages, ...categoryPages, ...eventPages]
  } catch (error) {
    console.error('SEO: sitemap dinâmico caiu para páginas estáticas:', error)
    return staticPages
  }
}
