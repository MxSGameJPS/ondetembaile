import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EventCard from '@/components/EventCard'
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  absoluteUrl,
  SITE_URL,
  categorySeoPath,
  citySeoPath,
  getCategoryEventsBySlug,
  jsonLd,
} from '@/lib/seo'
import styles from '../../seo-listing.module.css'

interface CategoryPageProps {
  params: Promise<{ slug: string }>
}

export const revalidate = 900

async function categoryData(params: CategoryPageProps['params']) {
  const { slug } = await params
  return getCategoryEventsBySlug(slug.toLowerCase())
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const data = await categoryData(params)

  if (!data.category || data.events.length === 0) {
    return {
      title: 'Categoria de eventos',
      robots: { index: false, follow: false },
    }
  }

  const canonicalPath = categorySeoPath(data.category.slug)
  const canonical = new URL(canonicalPath, SITE_URL).toString()
  const title = `${data.category.name}: próximos eventos`
  const description = `Confira os próximos eventos de ${data.category.name}: datas, cidades, locais e informações para encontrar festas, bailes e shows no Aonde Tem Baile.`
  const image = absoluteUrl(
    data.events.find((event) => event.image_url)?.image_url || DEFAULT_OG_IMAGE
  )

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
      images: [{ url: image, alt: `Eventos de ${data.category.name}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [image],
    },
  }
}

export default async function CategoryEventsPage({
  params,
}: CategoryPageProps) {
  const data = await categoryData(params)

  if (!data.category || data.events.length === 0) {
    notFound()
  }

  const canonical = new URL(
    categorySeoPath(data.category.slug),
    SITE_URL
  ).toString()

  const cities = Array.from(
    new Map(
      data.events
        .filter((event) => event.city && event.state)
        .map((event) => [
          citySeoPath(event.city, event.state),
          { city: event.city, state: event.state as string },
        ])
    ).entries()
  ).slice(0, 16)

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': canonical,
    name: `${data.category.name}: próximos eventos`,
    description: `Agenda de eventos de ${data.category.name} no Aonde Tem Baile.`,
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

  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(itemListSchema) }}
      />

      <nav className={styles.breadcrumbs} aria-label="Navegação estrutural">
        <Link href="/">Início</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{data.category.name}</span>
      </nav>

      <header className={styles.hero}>
        <span className={styles.eyebrow}>Eventos por categoria</span>
        <h1>Próximos eventos de {data.category.name}</h1>
        <p>
          Confira a agenda futura de {data.category.name} com informações de
          data, local e cidade. Os eventos exibidos abaixo já foram aprovados
          para publicação.
        </p>

        {cities.length > 0 && (
          <div className={styles.links} aria-label="Cidades com eventos">
            {cities.map(([path, place]) => (
              <Link key={path} href={path} className={styles.linkPill}>
                {place.city}, {place.state}
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
      </section>
    </div>
  )
}
