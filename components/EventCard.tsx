'use client'

import Link from 'next/link'
import { Calendar, MapPin, Ticket, MessageCircle, ArrowRight } from 'lucide-react'
import styles from './EventCard.module.css'

export interface EventItem {
  id: string
  title: string
  description: string
  location_name?: string | null
  address: string
  city: string
  state?: string | null
  image_url: string
  event_date: string
  ticket_price: string
  whatsapp_info: string
  status?: string
  rejection_reason?: string | null
}

interface EventCardProps {
  event: EventItem
  showStatus?: boolean
  adminActions?: React.ReactNode
}

export default function EventCard({ event, showStatus = false, adminActions }: EventCardProps) {
  const formattedDate = new Date(event.event_date).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Format WhatsApp number link
  const cleanWhatsapp = event.whatsapp_info.replace(/\D/g, '')
  const whatsappUrl = `https://wa.me/55${cleanWhatsapp}?text=${encodeURIComponent(`Olá! Vi o evento "${event.title}" no Aonde Tem Baile e gostaria de mais informações.`)}`

  return (
    <div className={styles.card}>
      {/* Event Banner Image Container */}
      <div className={styles.bannerContainer}>
        <img
          src={event.image_url}
          alt={event.title}
          className={styles.bannerImg}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80'
          }}
        />
        <div className={styles.overlay} />

        {/* City Badge */}
        <div className={styles.cityBadge}>
          <MapPin size={12} />
          <span>{event.city}{event.state ? `, ${event.state}` : ''}</span>
        </div>

        {/* Price Tag */}
        <div className={styles.priceTag}>
          <Ticket size={12} />
          <span>{event.ticket_price}</span>
        </div>

        {/* Status Badge (for Producer/Admin view) */}
        {showStatus && event.status && (
          <div style={{ position: 'absolute', bottom: '12px', left: '12px' }}>
            {event.status === 'approved' && (
              <span className="badge badge-green">Aprovado</span>
            )}
            {event.status === 'pending' && (
              <span className="badge badge-gold">Em Análise</span>
            )}
            {event.status === 'rejected' && (
              <span className="badge badge-red">Recusado</span>
            )}
          </div>
        )}
      </div>

      {/* Event Details Content */}
      <div className={styles.content}>
        <div>
          {/* Date & Time */}
          <div className={styles.dateHeader}>
            <Calendar size={14} />
            <span>{formattedDate}</span>
          </div>

          {/* Title */}
          <h3 className={styles.title}>{event.title}</h3>

          {/* Location Name / Address */}
          <p className={styles.location}>
            {event.location_name ? `${event.location_name} • ` : ''}{event.address}
          </p>

          {/* Description snippet */}
          <p className={styles.description}>{event.description}</p>
        </div>

        {/* Rejection reason if applicable */}
        {showStatus && event.status === 'rejected' && event.rejection_reason && (
          <div style={{ margin: '0.5rem 0', padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', fontSize: '0.75rem', color: '#fca5a5' }}>
            <strong>Motivo da recusa:</strong> {event.rejection_reason}
          </div>
        )}

        {/* Admin Action Buttons if passed */}
        {adminActions ? (
          <div style={{ paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            {adminActions}
          </div>
        ) : (
          /* Footer Actions */
          <div className={styles.footer}>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.whatsappBtn}
            >
              <MessageCircle size={14} />
              <span>WhatsApp</span>
            </a>

            <Link href={`/evento/${event.id}`} className={styles.detailsBtn}>
              <span>Ver Evento</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
