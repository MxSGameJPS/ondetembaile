import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EventCard from '@/components/EventCard'
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_URL,
  categorySeoPath,
  citySeoPath,
  getCityEventsBySlug,
  jsonLd,
} from '@/lib/seo'
import styles from '../../seo-listing.module.css'

interface CityPageProps {
  params: Promise<{ state: string; city: string }>
}

export const revalidate = 900

async function cityData(params: CityPageProps['params']) {
  const { state, city } = await params
  const stateSlug = state.toLowerCase()
  const citySlug = city.toLowerCase()
  const events = await getCityEventsBySlug(stateSlug, citySlug)
  const first = events[0] || null

  return {
    stateSlug,
    citySlug,
    events,
    cityName: first?.city || null,
    stateName: first?.state || state.toUpperCase(),
  }
}

export async function generateMetadata({
  params,
}: CityPageProps): Promise<Metadata> {
  const data = await cityData(params)

  if (!data.cityName || data.events.length === 0) {
    return {
      title: 'Eventos na cidade',
      robots: { index: false, follow: false },
    }
  }

  const canonicalPath = citySeoPath(data.cityName, data.stateName)
  const canonical = new URL(canonicalPath, SITE_URL).toString()
  const title = `Eventos em ${data.cityName} - ${data.stateName}`
  const description = `Veja os próximos eventos em ${data.cityName}, ${data.stateName}: bailes, festas, shows e programação regional com datas, locais e informações atualizadas.`
  const image = data.events.find((event) => event.image_url)?.image_url || DEFAULT_OG_IMAGE

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: canonical,
      type: 'website',
      locale: 'pt_BR',
      siteName: SITE_NAME,
      images: [{ url: image, alt: `Eventos em ${data.cityName}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [image],
    },
  }
}

export default async function CityEventsPage({ params }: CityPageProps) {
  const data = await cityData(params)

  if (!data.cityName || data.events.length === 0) {
    notFound()
  }

  const canonicalPath = citySeoPath(data.cityName, data.stateName)
  const canonical = new URL(canonicalPath, SITE_URL).toString()

  const categories = Array.from(
    new Set(
      data.events
        .map((event) => event.category_name)
        .filter((value): value is string => Boolean(value))
    )
  ).slice(0, 12)

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': canonical,
    name: `Eventos em ${data.cityName} - ${data.stateName}`,
    description: `Agenda de próximos eventos em ${data.cityName}, ${data.stateName}.`,
    inLanguage: 'pt-BR',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: data.events.length,
      itemListElement: data.events.map((event, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE_URL}/evento/${event.id}`,
        name: event.title,
      })),
    },
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Início',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: `Eventos em ${data.cityName}`,
        item: canonical,
      },
    ],
  }

  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema) }}
      />

      <nav className={styles.breadcrumbs} aria-label="Navegação estrutural">
        <Link href="/">Início</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Eventos em {data.cityName}</span>
      </nav>

      <header className={styles.hero}>
        <span className={styles.eyebrow}>Agenda local</span>
        <h1>
          Eventos em {data.cityName}, {data.stateName}
        </h1>
        <p>
          Encontre os próximos bailes, festas, shows e eventos em {data.cityName}.
          A agenda abaixo reúne apenas eventos futuros aprovados no Aonde Tem Baile.
        </p>

        {categories.length > 0 && (
          <div className={styles.links} aria-label="Categorias em destaque">
            {categories.map((category) => (
              <Link
                key={category}
                href={categorySeoPath(category)}
                className={styles.linkPill}
              >
                {category}
              </Link>
            ))}
          </div>
        )}
      </header>

      <p className={styles.summary}>
        {data.events.length} evento(s) futuro(s) encontrado(s).
      </p>

      <section className={styles.grid} aria-label="Próximos eventos">
        {data.events.map((event) => (
          <EventCard key={event.id} event={event as any} />
        ))}
      </section>
    </div>
  )
}
