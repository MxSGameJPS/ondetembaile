import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { cache } from 'react'
import EventMap from '@/components/EventMap'
import SocialShare from '@/components/SocialShare'
import {
  Calendar,
  MapPin,
  MessageCircle,
  ArrowLeft,
  Globe,
  Share2,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_URL,
  categorySeoPath,
  citySeoPath,
  jsonLd,
} from '@/lib/seo'
import styles from './page.module.css'

interface EventPageProps {
  params: Promise<{ id: string }>
}

const getEventById = cache(async (id: string) => {
  if (id.startsWith('demo-')) {
    return {
      id,
      title: 'Grande Baile de Gaúcho com Os Serranos',
      description:
        'Um evento imperdível com o melhor da música tradicionalista gaucha. Muita vanera, xote e fandango para animar a noite toda. Estacionamento amplo, segurança no local e ambiente climatizado. Garanta já o seu ingresso!',
      location_name: 'CTG Estância da Tradição',
      address: 'Av. das Indústrias, 1500 - Porto Alegre, RS',
      city: 'Porto Alegre',
      state: 'RS',
      latitude: -30.0346,
      longitude: -51.2177,
      category_name: 'Baile Tradicionalista / Gaúcho',
      image_url:
        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
      event_date: new Date(Date.now() + 86400000 * 3).toISOString(),
      event_end_date: null,
      ticket_price: 'R$ 35,00',
      whatsapp_info: '51999998888',
      facebook_url: 'https://facebook.com',
      instagram_handle: '@osserranos',
      status: 'approved',
      source_url: null,
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return null
  }

  if (data.status === 'approved') {
    return data
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  if (data.producer_id === user.id) {
    return data
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return profile && ['admin', 'superadmin'].includes(profile.role) ? data : null
})

function absoluteImageUrl(imageUrl?: string | null) {
  if (!imageUrl) return DEFAULT_OG_IMAGE

  try {
    return new URL(imageUrl, SITE_URL).toString()
  } catch {
    return DEFAULT_OG_IMAGE
  }
}

function metadataDescription(event: {
  description?: string | null
  city?: string | null
  state?: string | null
}) {
  const description = event.description?.replace(/\s+/g, ' ').trim()

  if (description) {
    return description.length > 160
      ? `${description.slice(0, 157).trimEnd()}...`
      : description
  }

  const location = [event.city, event.state].filter(Boolean).join(' - ')
  return location
    ? `Confira este evento em ${location} no Aonde Tem Baile.`
    : 'Confira este evento no Aonde Tem Baile.'
}

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { id } = await params
  const event = await getEventById(id)

  if (!event) {
    return {
      title: 'Evento não encontrado',
      description: 'Confira eventos, bailes, festas e shows no Aonde Tem Baile.',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const url = `${SITE_URL}/evento/${event.id}`
  const image = absoluteImageUrl(event.image_url)
  const description = metadataDescription(event)
  const socialTitle = `${event.title} | ${SITE_NAME}`
  const shouldIndex = !id.startsWith('demo-') && event.status === 'approved'

  return {
    title: event.title,
    description,
    alternates: {
      canonical: url,
    },
    robots: {
      index: shouldIndex,
      follow: shouldIndex,
    },
    openGraph: {
      title: socialTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'pt_BR',
      type: 'website',
      images: [
        {
          url: image,
          alt: event.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: [image],
    },
  }
}

export default async function EventDetailPage({ params }: EventPageProps) {
  const { id } = await params
  const event = await getEventById(id)

  if (!event) {
    notFound()
  }

  const startDate = new Date(event.event_date)
  const endDate = event.event_end_date ? new Date(event.event_end_date) : null
  const validEndDate =
    endDate && !Number.isNaN(endDate.getTime()) ? endDate : null

  const formatFullDate = (date: Date) =>
    date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const formattedDate = validEndDate
    ? `De ${formatFullDate(startDate)} até ${formatFullDate(validEndDate)}`
    : formatFullDate(startDate)

  const cleanWhatsapp = event.whatsapp_info?.replace(/\D/g, '') ?? ''
  const whatsappUrl = cleanWhatsapp
    ? `https://wa.me/55${cleanWhatsapp}?text=${encodeURIComponent(
        `Olá! Quero mais informações sobre o evento "${event.title}" no Aonde Tem Baile.`
      )}`
    : null

  const currentUrl = `${SITE_URL}/evento/${event.id}`
  const cityPath =
    event.city && event.state ? citySeoPath(event.city, event.state) : '/'
  const categoryPath =
    event.category_name && event.category_id
      ? categorySeoPath(event.category_name)
      : null
  const image = absoluteImageUrl(event.image_url)
  const locationSchema: Record<string, unknown> = {
    '@type': 'Place',
    name:
      event.location_name ||
      [event.city, event.state].filter(Boolean).join(', '),
    address: {
      '@type': 'PostalAddress',
      streetAddress: event.address || undefined,
      addressLocality: event.city || undefined,
      addressRegion: event.state || undefined,
      addressCountry: 'BR',
    },
  }

  if (
    Number.isFinite(event.latitude) &&
    Number.isFinite(event.longitude)
  ) {
    locationSchema.geo = {
      '@type': 'GeoCoordinates',
      latitude: Number(event.latitude),
      longitude: Number(event.longitude),
    }
  }

  const eventSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': `${currentUrl}#event`,
    name: event.title,
    description: metadataDescription(event),
    url: currentUrl,
    image: [image],
    startDate: event.event_date,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: locationSchema,
    inLanguage: 'pt-BR',
  }

  if (event.event_end_date) eventSchema.endDate = event.event_end_date
  if (event.category_name) eventSchema.keywords = event.category_name
  if (event.source_url) eventSchema.sameAs = event.source_url

  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Início',
      item: SITE_URL,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: `Eventos em ${event.city}`,
      item: new URL(cityPath, SITE_URL).toString(),
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: event.title,
      item: currentUrl,
    },
  ]

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  }

  return (
    <div className={styles.container}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(eventSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema) }}
      />

      <nav
        aria-label="Navegação estrutural"
        style={{
          display: 'flex',
          gap: '0.4rem',
          flexWrap: 'wrap',
          marginBottom: '1rem',
          fontSize: '0.82rem',
          color: '#9ca3af',
        }}
      >
        <Link href="/" style={{ color: '#f59e0b', textDecoration: 'none' }}>
          Início
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={cityPath}
          style={{ color: '#f59e0b', textDecoration: 'none' }}
        >
          Eventos em {event.city}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{event.title}</span>
      </nav>

      <Link href="/" className={styles.backBtn}>
        <ArrowLeft size={16} />
        <span>Voltar para todos os eventos</span>
      </Link>

      <div className={styles.heroBanner}>
        <img src={image} alt={event.title} className={styles.bannerImg} />
        <div className={styles.bannerOverlay} />
      </div>

      <div className={styles.titleHeader}>
        <h1 className={styles.eventTitle}>{event.title}</h1>

        <div className={styles.metaGrid}>
          <div className={styles.metaBadge}>
            <Calendar size={16} />
            <span>{formattedDate}</span>
          </div>

          <div className={styles.metaBadge}>
            <MapPin size={16} />
            <Link
              href={cityPath}
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              {event.city}
              {event.state ? `, ${event.state}` : ''}
            </Link>
          </div>
        </div>

        {categoryPath && (
          <div style={{ marginTop: '0.75rem' }}>
            <Link
              href={categoryPath}
              style={{
                color: '#fde047',
                textDecoration: 'none',
                fontSize: '0.82rem',
                fontWeight: 700,
              }}
            >
              Ver mais eventos de {event.category_name}
            </Link>
          </div>
        )}
      </div>

      <div className={styles.mainLayout}>
        <div>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span>Sobre o Evento</span>
            </h2>
            <p className={styles.descriptionText}>{event.description}</p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <EventMap
              address={event.address}
              locationName={event.location_name || ''}
              city={event.city}
              state={event.state || ''}
              latitude={event.latitude}
              longitude={event.longitude}
            />
          </div>

          <SocialShare
            title={event.title}
            url={currentUrl}
            image={event.image_url}
          />
        </div>

        <div>
          <div className={styles.sidebarCard}>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-success"
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  fontSize: '0.95rem',
                  borderRadius: '12px',
                  marginBottom: '1.5rem',
                }}
              >
                <MessageCircle size={20} />
                <span>WhatsApp para Informações</span>
              </a>
            ) : event.source_url ? (
              <a
                href={event.source_url}
                target="_blank"
                rel="noopener noreferrer external"
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  fontSize: '0.95rem',
                  borderRadius: '12px',
                  marginBottom: '1.5rem',
                }}
              >
                <ExternalLink size={20} />
                <span>Ver publicação original</span>
              </a>
            ) : null}

            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,0.08)',
                paddingTop: '1rem',
              }}
            >
              <p
                style={{
                  fontSize: '0.78rem',
                  color: '#9ca3af',
                  lineHeight: '1.45',
                  marginBottom: '1rem',
                }}
              >
                As informações aqui listadas são extraídas da publicação
                original, o{' '}
                <strong style={{ color: '#e5e7eb', fontWeight: 'bold' }}>
                  Aondetembaile.com.br
                </strong>{' '}
                é apenas um meio para facilitar a busca e pesquisa do conteúdo.
              </p>

              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  color: '#9ca3af',
                  marginBottom: '0.75rem',
                }}
              >
                Redes Sociais do Evento
              </div>

              <div className={styles.socialLinks}>
                {event.source_url && (
                  <a
                    href={event.source_url}
                    target="_blank"
                    rel="noopener noreferrer external"
                    className={styles.socialBtn}
                  >
                    <ExternalLink size={16} color="#f97316" />
                    <span>Ver publicação original</span>
                  </a>
                )}

                {event.facebook_url && (
                  <a
                    href={event.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer external"
                    className={styles.socialBtn}
                  >
                    <Globe size={16} color="#3b82f6" />
                    <span>Página no Facebook</span>
                  </a>
                )}

                {event.instagram_handle && (
                  <a
                    href={`https://instagram.com/${event.instagram_handle.replace(
                      '@',
                      ''
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer external"
                    className={styles.socialBtn}
                  >
                    <Share2 size={16} color="#ec4899" />
                    <span>
                      {event.instagram_handle.startsWith('@')
                        ? event.instagram_handle
                        : `@${event.instagram_handle}`}
                    </span>
                  </a>
                )}

                {!event.facebook_url &&
                  !event.instagram_handle &&
                  !event.source_url && (
                    <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      Nenhuma rede social informada para este evento.
                    </p>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
