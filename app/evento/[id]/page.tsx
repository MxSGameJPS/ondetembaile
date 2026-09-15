import { createClient } from '@/lib/supabase/server'
import EventMap from '@/components/EventMap'
import SocialShare from '@/components/SocialShare'
import { Calendar, MapPin, MessageCircle, ArrowLeft, Globe, Share2, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import styles from './page.module.css'

interface EventPageProps {
  params: Promise<{ id: string }>
}

export default async function EventDetailPage({ params }: EventPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch event from Supabase
  let event = null

  if (id.startsWith('demo-')) {
    event = {
      id: id,
      title: 'Grande Baile de Gaúcho com Os Serranos',
      description: 'Um evento imperdível com o melhor da música tradicionalista gaucha. Muita vanera, xote e fandango para animar a noite toda. Estacionamento amplo, segurança no local e ambiente climatizado. Garanta já o seu ingresso!',
      location_name: 'CTG Estância da Tradição',
      address: 'Av. das Indústrias, 1500 - Porto Alegre, RS',
      city: 'Porto Alegre',
      state: 'RS',
      latitude: -30.0346,
      longitude: -51.2177,
      image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
      event_date: new Date(Date.now() + 86400000 * 3).toISOString(),
      event_end_date: null,
      ticket_price: 'R$ 35,00',
      whatsapp_info: '51999998888',
      facebook_url: 'https://facebook.com',
      instagram_handle: '@osserranos',
      status: 'approved',
    }
  } else {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (!error && data) {
      event = data
    }
  }

  if (!event) {
    notFound()
  }

  const startDate = new Date(event.event_date)
  const endDate = event.event_end_date ? new Date(event.event_end_date) : null
  const validEndDate = endDate && !Number.isNaN(endDate.getTime()) ? endDate : null

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
    ? `https://wa.me/55${cleanWhatsapp}?text=${encodeURIComponent(`Olá! Quero mais informações sobre o evento "${event.title}" no Aonde Tem Baile.`)}`
    : null
  const currentUrl = `https://aondetembaile.com.br/evento/${event.id}`

  return (
    <div className={styles.container}>
      {/* Back Button */}
      <Link href="/" className={styles.backBtn}>
        <ArrowLeft size={16} />
        <span>Voltar para todos os eventos</span>
      </Link>

      {/* Hero Banner Image */}
      <div className={styles.heroBanner}>
        <img src={event.image_url} alt={event.title} className={styles.bannerImg} />
        <div className={styles.bannerOverlay} />
      </div>

      {/* Event Header */}
      <div className={styles.titleHeader}>
        <h1 className={styles.eventTitle}>{event.title}</h1>
        
        <div className={styles.metaGrid}>
          <div className={styles.metaBadge}>
            <Calendar size={16} />
            <span>{formattedDate}</span>
          </div>

          <div className={styles.metaBadge}>
            <MapPin size={16} />
            <span>{event.city}{event.state ? `, ${event.state}` : ''}</span>
          </div>

        </div>
      </div>

      {/* Main Layout Grid */}
      <div className={styles.mainLayout}>
        
        {/* Left Column: Description & Map */}
        <div>
          {/* Description */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span>Sobre o Evento</span>
            </h2>
            <p className={styles.descriptionText}>{event.description}</p>
          </div>

          {/* Interactive OpenSource Map */}
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

          {/* Social Share Section */}
          <SocialShare title={event.title} url={currentUrl} image={event.image_url} />
        </div>

        {/* Right Sidebar: Contact & Info Box */}
        <div>
          <div className={styles.sidebarCard}>
            
            {/* Contact / original source action */}
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-success"
                style={{ width: '100%', padding: '0.85rem 1rem', fontSize: '0.95rem', borderRadius: '12px', marginBottom: '1.5rem' }}
              >
                <MessageCircle size={20} />
                <span>WhatsApp para Informações</span>
              </a>
            ) : event.source_url ? (
              <a
                href={event.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ width: '100%', padding: '0.85rem 1rem', fontSize: '0.95rem', borderRadius: '12px', marginBottom: '1.5rem' }}
              >
                <ExternalLink size={20} />
                <span>Ver fonte original do evento</span>
              </a>
            ) : null}

            {/* Event Networks / Producer Info */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#9ca3af', marginBottom: '0.75rem' }}>
                Redes Sociais do Evento
              </div>

              <div className={styles.socialLinks}>
                {event.source_url && (
                  <a
                    href={event.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialBtn}
                  >
                    <ExternalLink size={16} color="#f97316" />
                    <span>Fonte original</span>
                  </a>
                )}

                {event.facebook_url && (
                  <a
                    href={event.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialBtn}
                  >
                    <Globe size={16} color="#3b82f6" />
                    <span>Página no Facebook</span>
                  </a>
                )}

                {event.instagram_handle && (
                  <a
                    href={`https://instagram.com/${event.instagram_handle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialBtn}
                  >
                    <Share2 size={16} color="#ec4899" />
                    <span>{event.instagram_handle.startsWith('@') ? event.instagram_handle : `@${event.instagram_handle}`}</span>
                  </a>
                )}

                {!event.facebook_url && !event.instagram_handle && !event.source_url && (
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
