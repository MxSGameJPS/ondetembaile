'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCategoriesAction } from '@/app/actions/categories'
import EventCard, { EventItem } from '@/components/EventCard'
import { Search, MapPin, Sparkles, PlusCircle, Tag, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import styles from './page.module.css'

interface Category {
  id: string
  name: string
  slug: string
}

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
    category_name: 'Baile Tradicionalista / Gaúcho',
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
    category_name: 'Forró / Pé de Serra',
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
    category_name: 'Sertanejo',
    image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
    event_date: new Date(Date.now() + 86400000 * 7).toISOString(),
    ticket_price: 'R$ 40,00',
    whatsapp_info: '53977776666',
    status: 'approved',
  },
]

export default function HomePage() {
  const [searchCity, setSearchCity] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'weekend'>('all')
  const [events, setEvents] = useState<EventItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      
      // Load Categories
      const catRes = await getCategoriesAction()
      if (catRes.success && catRes.data) {
        setCategories(catRes.data)
      }

      // Load Events
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'approved')
        .order('event_date', { ascending: true })

      if (!error && data && data.length > 0) {
        setEvents(data)
      } else {
        setEvents(DEMO_EVENTS)
      }
      setLoading(false)
    }

    loadData()
  }, [])

  // Filter events by City search, Category & Period
  const filteredEvents = events.filter((e) => {
    const matchesCity = searchCity.trim() === '' || e.city.toLowerCase().includes(searchCity.toLowerCase().trim())
    if (!matchesCity) return false

    const matchesCategory =
      selectedCategory === 'all' ||
      e.category_id === selectedCategory ||
      (e.category_name && e.category_name.toLowerCase() === selectedCategory.toLowerCase())

    if (!matchesCategory) return false

    if (filterPeriod === 'weekend') {
      const eventDate = new Date(e.event_date)
      const day = eventDate.getDay()
      return day === 5 || day === 6 || day === 0 // Fri, Sat, Sun
    }

    return true
  })

  const clearFilters = () => {
    setSearchCity('')
    setSelectedCategory('all')
    setFilterPeriod('all')
  }

  const activeCategoryName = categories.find((c) => c.id === selectedCategory)?.name || selectedCategory

  return (
    <div>
      {/* Hero Section with Cinematic Background & Party Light Effects */}
      <section className={styles.hero}>
        <div className={styles.heroBgImage} />
        <div className={styles.heroOverlay} />
        <div className={styles.partyStrobeLayer} />

        <div className={`container ${styles.heroContent}`}>
          

          <h1 className={styles.heroTitle}>
            Descubra o que está <span className="gradient-text">rolando perto de você.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Festas, shows, bailes e eventos da sua região.
          </p>

          {/* Dual Search Box: Cidade + Categoria */}
          <div className={styles.searchBoxGrid}>
            {/* Input 1: Cidade */}
            <div className={styles.searchInputWrapper}>
              <MapPin size={18} color="#F26A00" />
              <input
                type="text"
                placeholder="Buscar por Cidade (ex: Porto Alegre)..."
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            {/* Input 2: Categoria Dropdown */}
            <div className={styles.searchInputWrapper}>
              <Tag size={18} color="#F26A00" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={styles.searchSelect}
              >
                <option value="all">Todas as Categorias</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Button */}
            <button className="btn-primary" style={{ padding: '0.75rem 1.4rem', borderRadius: '12px' }}>
              <Search size={18} />
              <span>Encontrar eventos</span>
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
                {searchCity.trim() && selectedCategory !== 'all'
                  ? `Eventos de ${activeCategoryName} em "${searchCity}"`
                  : searchCity.trim()
                  ? `Eventos em "${searchCity}"`
                  : selectedCategory !== 'all'
                  ? `Eventos de ${activeCategoryName}`
                  : 'Próximos Eventos'}
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
                Todos os Dias
              </button>
              <button
                className={`${styles.filterBtn} ${filterPeriod === 'weekend' ? styles.filterBtnActive : ''}`}
                onClick={() => setFilterPeriod('weekend')}
              >
                Este Fim de Semana
              </button>
              {(searchCity || selectedCategory !== 'all' || filterPeriod !== 'all') && (
                <button
                  onClick={clearFilters}
                  className={styles.filterBtn}
                  style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                >
                  <RotateCcw size={13} />
                  <span>Limpar Filtros</span>
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills Bar */}
          {categories.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '1.75rem', scrollbarWidth: 'none' }}>
              <button
                className={`${styles.filterBtn} ${selectedCategory === 'all' ? styles.filterBtnActive : ''}`}
                onClick={() => setSelectedCategory('all')}
                style={{ whiteSpace: 'nowrap' }}
              >
                Todas as Categorias
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`${styles.filterBtn} ${selectedCategory === cat.id ? styles.filterBtnActive : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

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
                Nenhum evento encontrado {searchCity ? `em "${searchCity}"` : ''} {selectedCategory !== 'all' ? `na categoria "${activeCategoryName}"` : ''}
              </p>
              <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Conhece ou vai produzir um baile para essa categoria ou cidade? Cadastre gratuitamente agora mesmo!
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button onClick={clearFilters} className="btn-secondary">
                  Limpar Filtros
                </button>
                <Link href="/cadastro" className="btn-primary">
                  <PlusCircle size={18} />
                  Cadastrar Evento
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
