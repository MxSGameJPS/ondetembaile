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

function newestDate(values: Array<string | null | undefined>) {
  const timestamps = values
    .map((value) => (value ? new Date(value).getTime() : Number.NaN))
    .filter((value) => Number.isFinite(value))

  if (timestamps.length === 0) return undefined
  return new Date(Math.max(...timestamps))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: absoluteUrl('/eventos'),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/quemsomos'),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: absoluteUrl('/contato-e-suporte'),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: absoluteUrl('/termos-de-uso'),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: absoluteUrl('/cadastro'),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  try {
    const [events, categories] = await Promise.all([
      getFutureApprovedEvents({ limit: 10000 }),
      getSeoCategories(),
    ])

    const eventPages: MetadataRoute.Sitemap = events.map((event) => ({
      url: absoluteUrl(`/evento/${event.id}`),
      lastModified: event.updated_at ? new Date(event.updated_at) : undefined,
      changeFrequency: 'daily',
      priority: 0.8,
    }))

    const cities = new Map<string, string[]>()
    const usedCategoryIds = new Set<string>()
    const usedCategoryNames = new Set<string>()
    const categoryUpdatesById = new Map<string, string[]>()
    const categoryUpdatesByName = new Map<string, string[]>()

    for (const event of events) {
      const updatedAt = event.updated_at || null

      if (event.city && event.state) {
        const path = citySeoPath(event.city, event.state)
        const updates = cities.get(path) || []
        if (updatedAt) updates.push(updatedAt)
        cities.set(path, updates)
      }

      if (event.category_id) {
        usedCategoryIds.add(event.category_id)
        const updates = categoryUpdatesById.get(event.category_id) || []
        if (updatedAt) updates.push(updatedAt)
        categoryUpdatesById.set(event.category_id, updates)
      }

      if (event.category_name) {
        const normalizedName = event.category_name.toLowerCase()
        usedCategoryNames.add(normalizedName)
        const updates = categoryUpdatesByName.get(normalizedName) || []
        if (updatedAt) updates.push(updatedAt)
        categoryUpdatesByName.set(normalizedName, updates)
      }
    }

    const cityPages: MetadataRoute.Sitemap = Array.from(cities.entries()).map(
      ([path, updates]) => ({
        url: absoluteUrl(path),
        lastModified: newestDate(updates),
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
        lastModified: newestDate([
          ...(categoryUpdatesById.get(category.id) || []),
          ...(categoryUpdatesByName.get(category.name.toLowerCase()) || []),
        ]),
        changeFrequency: 'daily',
        priority: 0.7,
      }))

    const hubUpdatedAt = newestDate(events.map((event) => event.updated_at))
    const pages = [...staticPages]

    if (hubUpdatedAt) {
      pages[1] = {
        ...pages[1],
        lastModified: hubUpdatedAt,
      }
    }

    return [...pages, ...cityPages, ...categoryPages, ...eventPages]
  } catch (error) {
    console.error('SEO: sitemap dinâmico caiu para páginas estáticas:', error)
    return staticPages
  }
}
