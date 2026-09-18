'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { getCategoriesAction } from '@/app/actions/categories'
import EventCard, { EventItem } from '@/components/EventCard'
import { Search, MapPin, PlusCircle, Tag, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import styles from './page.module.css'

interface Category {
  id: string
  name: string
  slug: string
}

interface CitySuggestion {
  name: string
  state: string
  label: string
}

const HERO_IMAGES = [
  '/img_hero/carousel/image.png',
  '/img_hero/carousel/image2.png',
  '/img_hero/carousel/image3.png',
  '/img_hero/carousel/image4.png',
  '/img_hero/carousel/image5.png',
]

const SEARCH_RADIUS_KM = 20
const LEGACY_BRAZIL_CENTER = { lat: -14.235, lng: -51.9253 }

function normalizeCity(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function validCoordinates(latitude?: number | null, longitude?: number | null) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false

  const lat = Number(latitude)
  const lng = Number(longitude)

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false

  return !(
    Math.abs(lat - LEGACY_BRAZIL_CENTER.lat) < 0.0001 &&
    Math.abs(lng - LEGACY_BRAZIL_CENTER.lng) < 0.0001
  )
}

function distanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
) {
  const earthRadiusKm = 6371
  const radians = (degrees: number) => (degrees * Math.PI) / 180
  const deltaLat = radians(to.lat - from.lat)
  const deltaLng = radians(to.lng - from.lng)
  const lat1 = radians(from.lat)
  const lat2 = radians(to.lat)

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
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
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([])
  const [showCitySuggestions, setShowCitySuggestions] = useState(false)
  const [citySuggestionsLoading, setCitySuggestionsLoading] = useState(false)
  const [selectedCityState, setSelectedCityState] = useState<string | null>(null)
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [eventCityCenters, setEventCityCenters] = useState<
    Record<string, { lat: number; lng: number }>
  >({})

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isMouseDown = useRef(false)
  const startX = useRef(0)
  const scrollLeftPos = useRef(0)

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

  useEffect(() => {
    const query = searchCity.trim()

    if (query.length < 2) {
      setCitySuggestions([])
      setCitySuggestionsLoading(false)
      setShowCitySuggestions(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setCitySuggestionsLoading(true)

      try {
        const response = await fetch(
          `/api/cities?q=${encodeURIComponent(query)}`,
          {
            signal: controller.signal,
          }
        )
        const data = await response.json().catch(() => null)

        if (response.ok && Array.isArray(data?.cities)) {
          setCitySuggestions(data.cities)
        } else {
          setCitySuggestions([])
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Não foi possível carregar sugestões de cidades:', error)
          setCitySuggestions([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setCitySuggestionsLoading(false)
        }
      }
    }, 250)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [searchCity])

  useEffect(() => {
    const cityQuery = searchCity.trim()

    if (cityQuery.length < 2) {
      setSearchCenter(null)
      return
    }

    const exactCityEvent = events.find(
      (event) => normalizeCity(event.city) === normalizeCity(cityQuery)
    )
    const state = selectedCityState || exactCityEvent?.state || 'RS'
    const controller = new AbortController()

    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          city: cityQuery,
          state,
        })
        const response = await fetch(`/api/geocode?${params.toString()}`, {
          signal: controller.signal,
          cache: 'no-store',
        })
        const data = await response.json().catch(() => null)

        if (
          response.ok &&
          data?.found === true &&
          Number.isFinite(data.lat) &&
          Number.isFinite(data.lng)
        ) {
          setSearchCenter({ lat: data.lat, lng: data.lng })
        } else {
          setSearchCenter(null)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Não foi possível resolver a cidade pesquisada:', error)
          setSearchCenter(null)
        }
      }
    }, 450)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [searchCity, events, selectedCityState])

  useEffect(() => {
    if (!searchCenter || searchCity.trim().length < 2 || events.length === 0) return

    const missingCities = Array.from(
      new Map(
        events
          .filter((event) => !validCoordinates(event.latitude, event.longitude))
          .map((event) => {
            const state = event.state || 'RS'
            const key = `${normalizeCity(event.city)}|${state.toUpperCase()}`
            return [key, { city: event.city, state }] as const
          })
      ).entries()
    ).filter(([key]) => !eventCityCenters[key])

    if (missingCities.length === 0) return

    const controller = new AbortController()
    let cancelled = false

    async function resolveMissingEventCities() {
      const resolved: Record<string, { lat: number; lng: number }> = {}

      for (const [key, location] of missingCities) {
        if (cancelled) return

        try {
          const params = new URLSearchParams({
            city: location.city,
            state: location.state,
          })

          const response = await fetch(`/api/geocode?${params.toString()}`, {
            signal: controller.signal,
            cache: 'no-store',
          })
          const data = await response.json().catch(() => null)

          if (
            response.ok &&
            data?.found === true &&
            Number.isFinite(data.lat) &&
            Number.isFinite(data.lng)
          ) {
            resolved[key] = { lat: data.lat, lng: data.lng }
          }
        } catch (error) {
          if (!controller.signal.aborted) {
            console.error(
              `Não foi possível resolver a cidade do evento ${location.city}:`,
              error
            )
          }
        }
      }

      if (!cancelled && Object.keys(resolved).length > 0) {
        setEventCityCenters((current) => ({
          ...current,
          ...resolved,
        }))
      }
    }

    resolveMissingEventCities()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [searchCenter, searchCity, events, eventCityCenters])

  // Desktop Scroll Handlers
  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    if (scrollContainerRef.current && e.deltaY !== 0) {
      scrollContainerRef.current.scrollLeft += e.deltaY * 0.8
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isMouseDown.current = true
    if (scrollContainerRef.current) {
      startX.current = e.pageX - scrollContainerRef.current.offsetLeft
      scrollLeftPos.current = scrollContainerRef.current.scrollLeft
    }
  }

  const handleMouseLeave = () => {
    isMouseDown.current = false
  }

  const handleMouseUp = () => {
    isMouseDown.current = false
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDown.current || !scrollContainerRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollContainerRef.current.offsetLeft
    const walk = (x - startX.current) * 1.5
    scrollContainerRef.current.scrollLeft = scrollLeftPos.current - walk
  }

  const scrollToResults = () => {
    const el = document.getElementById('eventos-feed')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleCategoryClick = (catId: string) => {
    setSelectedCategory(catId)
    scrollToResults()
  }

  const handleCitySuggestionSelect = (city: CitySuggestion) => {
    setSearchCity(city.name)
    setSelectedCityState(city.state)
    setShowCitySuggestions(false)
    setCitySuggestions([])
  }

  // Filter events by City search, Category & Period
  const filteredEvents = events.filter((e) => {
    const cityQuery = normalizeCity(searchCity)
    const directCityMatch =
      cityQuery === '' || normalizeCity(e.city).includes(cityQuery)

    const eventCityKey = `${normalizeCity(e.city)}|${(e.state || 'RS').toUpperCase()}`
    const fallbackCityCenter = eventCityCenters[eventCityKey]
    const eventCoordinates = validCoordinates(e.latitude, e.longitude)
      ? {
          lat: Number(e.latitude),
          lng: Number(e.longitude),
        }
      : fallbackCityCenter

    const matchesRadius =
      cityQuery !== '' && searchCenter && eventCoordinates
        ? distanceKm(searchCenter, eventCoordinates) <= SEARCH_RADIUS_KM
        : false

    if (!directCityMatch && !matchesRadius) return false

    const matchesCategory =
      selectedCategory === 'all' ||
      e.category_id === selectedCategory ||
      (e.category_name && e.category_name.toLowerCase() === selectedCategory.toLowerCase())

    if (!matchesCategory) return false

    if (filterPeriod === 'weekend') {
      const start = new Date(e.event_date)
      const end = e.event_end_date ? new Date(e.event_end_date) : start

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false

      const cursor = new Date(start)
      const last = end.getTime() >= start.getTime() ? end : start
      let checkedDays = 0

      while (cursor.getTime() <= last.getTime() && checkedDays < 120) {
        const day = cursor.getDay()
        if (day === 5 || day === 6 || day === 0) return true
        cursor.setDate(cursor.getDate() + 1)
        checkedDays += 1
      }

      return false
    }

    return true
  })

  const clearFilters = () => {
    setSearchCity('')
    setSelectedCityState(null)
    setCitySuggestions([])
    setShowCitySuggestions(false)
    setSelectedCategory('all')
    setFilterPeriod('all')
  }

  const activeCategoryName = categories.find((c) => c.id === selectedCategory)?.name || selectedCategory

  return (
    <div>
      {/* Hero Section */}
      <section className={styles.hero}>
        {/* Layer 0: Infinite carousel of traditional Rio Grande do Sul baile scenes */}
        <div className={styles.heroCarousel} aria-hidden="true">
          <div className={styles.heroCarouselTrack}>
            {[...HERO_IMAGES, HERO_IMAGES[0]].map((image, index) => (
              <div
                key={`${image}-${index}`}
                className={styles.heroCarouselSlide}
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="100vw"
                  preload={index === 0}
                  className={styles.heroCarouselImage}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Layer 1: Ambient nightclub lights — no strobe/flashing */}
        <div className={styles.clubLights} aria-hidden="true">
          <span className={`${styles.clubLight} ${styles.clubLightA}`} />
          <span className={`${styles.clubLight} ${styles.clubLightC}`} />
          <span className={`${styles.clubLight} ${styles.clubLightE}`} />
        </div>

        {/* Layer 2: Legibility overlay + vignette */}
        <div className={styles.heroOverlay} />

        <div className={`container ${styles.heroContent}`}>
          <h1 className={styles.heroTitle}>
            Descubra o que está <span className="gradient-text">rolando perto de você.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Festas, shows, bailes e eventos da sua região — a agitação da sua cidade em um só lugar.
          </p>

          {/* Dual Search Box: Cidade + Categoria */}
          <div className={`${styles.searchBoxGrid} ${styles.searchBoxAnim}`}>
            {/* Input 1: Cidade */}
            <div className={styles.searchInputWrapper}>
              <MapPin size={18} color="#F26A00" />
              <input
                type="text"
                placeholder="Buscar por Cidade (ex: Porto Alegre)..."
                value={searchCity}
                onChange={(e) => {
                  setSearchCity(e.target.value)
                  setSelectedCityState(null)
                  setShowCitySuggestions(e.target.value.trim().length >= 2)
                }}
                onFocus={() => {
                  if (searchCity.trim().length >= 2) {
                    setShowCitySuggestions(true)
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setShowCitySuggestions(false)
                    scrollToResults()
                  }

                  if (e.key === 'Escape') {
                    setShowCitySuggestions(false)
                  }
                }}
                className={styles.searchInput}
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showCitySuggestions}
                aria-controls="city-suggestions"
              />

              {showCitySuggestions && searchCity.trim().length >= 2 && (
                <div
                  id="city-suggestions"
                  className={styles.citySuggestions}
                  role="listbox"
                  aria-label="Sugestões de cidades"
                >
                  {citySuggestionsLoading ? (
                    <div className={styles.citySuggestionStatus}>
                      Buscando cidades...
                    </div>
                  ) : citySuggestions.length > 0 ? (
                    citySuggestions.map((city) => (
                      <button
                        key={`${city.name}-${city.state}`}
                        type="button"
                        className={styles.citySuggestion}
                        role="option"
                        aria-selected={false}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleCitySuggestionSelect(city)}
                      >
                        <span>{city.name}</span>
                        <strong>{city.state}</strong>
                      </button>
                    ))
                  ) : (
                    <div className={styles.citySuggestionStatus}>
                      Nenhuma cidade encontrada.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input 2: Categoria Dropdown */}
            <div className={styles.searchInputWrapper}>
              <Tag size={18} color="#F26A00" />
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value)
                  scrollToResults()
                }}
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
            <button
              onClick={scrollToResults}
              className="btn-primary"
              style={{ padding: '0.75rem 1.4rem', borderRadius: '12px' }}
            >
              <Search size={18} />
              <span>Encontrar eventos</span>
            </button>
          </div>
        </div>
      </section>

      {/* Events Feed Section */}
      <section id="eventos-feed" style={{ padding: '3.5rem 1.5rem', scrollMarginTop: '2rem' }}>
        <div className="container">
          
          {/* Header & Filter options */}
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>
                {searchCity.trim() && selectedCategory !== 'all'
                  ? `Eventos de ${activeCategoryName} em "${searchCity}" e até ${SEARCH_RADIUS_KM} km`
                  : searchCity.trim()
                  ? `Eventos em "${searchCity}" e até ${SEARCH_RADIUS_KM} km`
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

          {/* Category Filter Pills Bar with Drag/Wheel Scroll (hidden scrollbar, no arrows) */}
          {categories.length > 0 && (
            <div className={styles.categoryFilterWrapper}>
              <div
                ref={scrollContainerRef}
                className={styles.categoriesScrollContainer}
                onWheel={handleWheelScroll}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
              >
                <button
                  className={`${styles.filterBtn} ${selectedCategory === 'all' ? styles.filterBtnActive : ''}`}
                  onClick={() => handleCategoryClick('all')}
                >
                  Todas as Categorias
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    className={`${styles.filterBtn} ${selectedCategory === cat.id ? styles.filterBtnActive : ''}`}
                    onClick={() => handleCategoryClick(cat.id)}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
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
                  Cadastre seu evento gratuitamente!
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}