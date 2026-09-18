import type { Metadata } from 'next'
import Link from 'next/link'
import EventCard from '@/components/EventCard'
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_URL,
  categorySeoPath,
  citySeoPath,
  getFutureApprovedEvents,
  getSeoCategories,
  jsonLd,
} from '@/lib/seo'
import styles from './seo-listing.module.css'

export const revalidate = 900

export const metadata: Metadata = {
  title: 'Agenda de eventos por cidade e categoria',
  description:
    'Explore a agenda do Aonde Tem Baile por cidade e categoria e encontre próximos bailes, festas, shows e eventos regionais.',
  alternates: {
    canonical: `${SITE_URL}/eventos`,
  },
  openGraph: {
    title: `Agenda de eventos | ${SITE_NAME}`,
    description:
      'Encontre os próximos eventos por cidade e categoria no Aonde Tem Baile.',
    url: `${SITE_URL}/eventos`,
    type: 'website',
    locale: 'pt_BR',
    siteName: SITE_NAME,
    images: [{ url: DEFAULT_OG_IMAGE, alt: 'Agenda Aonde Tem Baile' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Agenda de eventos | ${SITE_NAME}`,
    description:
      'Encontre os próximos eventos por cidade e categoria no Aonde Tem Baile.',
    images: [DEFAULT_OG_IMAGE],
  },
}

export default async function EventsHubPage() {
  const [events, categories] = await Promise.all([
    getFutureApprovedEvents({ limit: 500 }),
    getSeoCategories(),
  ])

  const cities = Array.from(
    new Map(
      events
        .filter((event) => event.city && event.state)
        .map((event) => [
          citySeoPath(event.city, event.state),
          { city: event.city, state: event.state as string },
        ])
    ).entries()
  ).sort((a, b) =>
    `${a[1].state} ${a[1].city}`.localeCompare(
      `${b[1].state} ${b[1].city}`,
      'pt-BR'
    )
  )

  const usedCategoryIds = new Set(
    events.map((event) => event.category_id).filter(Boolean)
  )
  const usedCategoryNames = new Set(
    events
      .map((event) => event.category_name?.toLowerCase())
      .filter((value): value is string => Boolean(value))
  )

  const activeCategories = categories.filter(
    (category) =>
      usedCategoryIds.has(category.id) ||
      usedCategoryNames.has(category.name.toLowerCase())
  )

  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE_URL}/eventos`,
    name: 'Agenda de eventos por cidade e categoria',
    url: `${SITE_URL}/eventos`,
    inLanguage: 'pt-BR',
    isPartOf: {
      '@id': `${SITE_URL}/#website`,
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: Math.min(events.length, 30),
      itemListElement: events.slice(0, 30).map((event, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE_URL}/evento/${event.id}`,
        name: event.title,
      })),
    },
  }

  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(pageSchema) }}
      />

      <nav className={styles.breadcrumbs} aria-label="Navegação estrutural">
        <Link href="/">Início</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Agenda de eventos</span>
      </nav>

      <header className={styles.hero}>
        <span className={styles.eyebrow}>Explore a agenda</span>
        <h1>Eventos, bailes, festas e shows perto de você</h1>
        <p>
          Navegue por cidades e categorias para encontrar apenas eventos futuros
          aprovados no Aonde Tem Baile.
        </p>
      </header>

      {cities.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#f9fafb', marginBottom: '0.8rem' }}>
            Eventos por cidade
          </h2>
          <div className={styles.links}>
            {cities.map(([path, place]) => (
              <Link key={path} href={path} className={styles.linkPill}>
                {place.city}, {place.state}
              </Link>
            ))}
          </div>
        </section>
      )}

      {activeCategories.length > 0 && (
        <section style={{ marginBottom: '2.25rem' }}>
          <h2 style={{ color: '#f9fafb', marginBottom: '0.8rem' }}>
            Eventos por categoria
          </h2>
          <div className={styles.links}>
            {activeCategories.map((category) => (
              <Link
                key={category.id}
                href={categorySeoPath(category.slug)}
                className={styles.linkPill}
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 style={{ color: '#f9fafb', marginBottom: '0.5rem' }}>
          Próximos eventos
        </h2>
        <p className={styles.summary}>
          {events.length} evento(s) futuro(s) disponível(is) na agenda.
        </p>

        {events.length > 0 ? (
          <div className={styles.grid}>
            {events.slice(0, 30).map((event) => (
              <EventCard
                key={event.id}
                event={{
                  ...event,
                  description: event.description || '',
                  address:
                    event.address ||
                    [event.city, event.state].filter(Boolean).join(', '),
                  image_url: event.image_url || '/img_hero/image.png',
                  ticket_price: event.ticket_price || 'Consultar',
                }}
              />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            Nenhum evento futuro está publicado neste momento.
          </div>
        )}
      </section>
    </div>
  )
}
