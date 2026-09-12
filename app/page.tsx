'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import EventCard, { EventItem } from '@/components/EventCard'
import { Search, MapPin, Sparkles, PlusCircle } from 'lucide-react'
import Link from 'next/link'
import styles from './page.module.css'

// Demo events fallback in case DB is newly created
const DEMO_EVENTS: EventItem[] = [
  {
    id: 'demo-1',
    title: 'Grande Baile de Gaúcho com Os Serranos',
    description: 'Um evento imperdível com o melhor da música tradicionalista gaucha. Muita vanera, xote e fandango para animar a noite toda.',
    location_name: 'CTG Estância da Tradição',
    address: 'Av. das Indústrias, 1500 - Porto Alegre, RS',
    city: 'Porto Alegre',
    state: 'RS',
    image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
    event_date: new Date(Date.now() + 86400000 * 3).toISOString(),
    ticket_price: 'R$ 35,00',
    whatsapp_info: '51999998888',
    status: 'approved',
  },
  {
    id: 'demo-2',
    title: 'Baile de Forró Pé de Serra ao Vivo',
    description: 'Noite especial de forró com trios convidados e recepção calorosa. Venha dançar dois pra lá, dois pra cá!',
    location_name: 'Espaço Cultural Beira Rio',
    address: 'Rua da Bahia, 320 - Caxias do Sul, RS',
    city: 'Caxias do Sul',
    state: 'RS',
    image_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
    event_date: new Date(Date.now() + 86400000 * 5).toISOString(),
    ticket_price: 'R$ 25,00',
    whatsapp_info: '54988887777',
    status: 'approved',
  },
  {
    id: 'demo-3',
    title: 'Super Baile Sertanejo de Primavera',
    description: 'O maior encontro sertanejo da região! Grandes sucessos do modão ao universitário.',
    location_name: 'Sociedade Recreativa',
    address: 'Rua XV de Novembro, 450 - Pelotas, RS',
    city: 'Pelotas',
    state: 'RS',
    image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    event_date: new Date(Date.now() + 86400000 * 7).toISOString(),
    ticket_price: 'R$ 40,00',
    whatsapp_info: '53977776666',
    status: 'approved',
  },
]

export default function HomePage() {
  const [searchCity, setSearchCity] = useState('')
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'weekend' | 'month'>('all')
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    async function loadEvents() {
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'approved')
        .order('event_date', { ascending: true })

      if (!error && data && data.length > 0) {
        setEvents(data)
      } else {
        // Use DEMO_EVENTS if no events registered in database yet
        setEvents(DEMO_EVENTS)
      }
      setLoading(false)
    }

    loadEvents()
  }, [])

  // Filter events by City search & Period
  const filteredEvents = events.filter((e) => {
    const matchesCity = searchCity.trim() === '' || e.city.toLowerCase().includes(searchCity.toLowerCase().trim())
    
    if (!matchesCity) return false

    if (filterPeriod === 'weekend') {
      const eventDate = new Date(e.event_date)
      const day = eventDate.getDay()
      return day === 5 || day === 6 || day === 0 // Fri, Sat, Sun
    }

    return true
  })

  return (
    <div>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className="container">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '9999px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            <Sparkles size={14} />
            <span>O Maior Portal de Eventos Regionais</span>
          </div>

          <h1 className={styles.heroTitle}>
            Descubra <span className="gradient-text">Onde Tem Baile</span> perto de você!
          </h1>
          <p className={styles.heroSubtitle}>
            Encontre bailes, festas, fandangos e shows em qualquer cidade do Brasil.
          </p>

          {/* Search Box by City */}
          <div className={styles.searchContainer}>
            <div className={styles.searchInputWrapper}>
              <MapPin size={20} color="#f59e0b" />
              <input
                type="text"
                placeholder="Digite o nome da sua cidade (ex: Porto Alegre, Pelotas, Caxias)..."
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <button className="btn-primary" style={{ padding: '0.75rem 1.25rem', borderRadius: '16px' }}>
              <Search size={18} />
              <span>Buscar</span>
            </button>
          </div>
        </div>
      </section>

      {/* Events Feed Section */}
      <section style={{ padding: '3rem 1.5rem' }}>
        <div className="container">
          
          {/* Header & Filter options */}
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>
                {searchCity.trim() ? `Eventos em "${searchCity}"` : 'Próximos Eventos'}
              </h2>
              <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '4px' }}>
                Exibindo {filteredEvents.length} baile(s) cadastrado(s)
              </p>
            </div>

            <div className={styles.filters}>
              <button
                className={`${styles.filterBtn} ${filterPeriod === 'all' ? styles.filterBtnActive : ''}`}
                onClick={() => setFilterPeriod('all')}
              >
                Todos os Eventos
              </button>
              <button
                className={`${styles.filterBtn} ${filterPeriod === 'weekend' ? styles.filterBtnActive : ''}`}
                onClick={() => setFilterPeriod('weekend')}
              >
                Este Fim de Semana
              </button>
            </div>
          </div>

          {/* Grid of Events */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#9ca3af' }}>
              Buscando os melhores bailes...
            </div>
          ) : filteredEvents.length > 0 ? (
            <div className="events-grid">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#f8fafc', marginBottom: '0.5rem' }}>
                Nenhum evento encontrado em "{searchCity}"
              </p>
              <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Conhece ou vai produzir um baile nessa cidade? Cadastre gratuitamente agora mesmo!
              </p>
              <Link href="/cadastro" className="btn-primary">
                <PlusCircle size={18} />
                Cadastrar Evento na Cidade
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
