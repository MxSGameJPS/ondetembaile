import type { GroqEventCandidate } from '@/lib/event-discovery/groq'

const ROLE_AGORA_BASE_URL = 'https://www.roleagora.com.br'
const FETCH_TIMEOUT_MS = 20000
const MAX_EVENT_PAGES_PER_CITY = 40
const EVENT_PAGE_CONCURRENCY = 6

interface RoleAgoraLocation {
  name?: string | null
  lat?: number | null
  lng?: number | null
  address?: string | null
  addressStreet?: string | null
  addressNumber?: string | number | null
  addressDistrict?: string | null
  addressCity?: string | null
  addressState?: string | null
  backgroundImageUrl?: string | null
}

interface RoleAgoraGenre {
  name?: string | null
  slug?: string | null
}

interface RoleAgoraArtist {
  artist?: {
    id?: string | null
    slug?: string | null
    name?: string | null
    backgroundImageUrl?: string | null
    genre?: RoleAgoraGenre | null
  } | null
}

interface RoleAgoraGenreLink {
  genre?: RoleAgoraGenre | null
}

interface RoleAgoraEvent {
  id?: string | null
  slug?: string | null
  name?: string | null
  nameOriginal?: string | null
  description?: string | null
  startsAt?: string | null
  endsAt?: string | null
  eventTypeName?: string | null
  backgroundImageUrl?: string | null
  location?: RoleAgoraLocation | null
  artists?: RoleAgoraArtist[] | null
  genres?: RoleAgoraGenreLink[] | null
  ticketUrl?: string | null
  ticketsUrl?: string | null
  purchaseUrl?: string | null
  externalUrl?: string | null
}

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string'
    ? value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
    : ''
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function citySlug(city: string, state?: string) {
  const cityPart = slugify(city)
  const statePart = slugify(state || '')
  return statePart ? `${cityPart}-${statePart}` : cityPart
}

function parseNextData(html: string) {
  const match = html.match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
  )

  if (!match?.[1]) {
    throw new Error('O Rolê Agora não expôs __NEXT_DATA__ nesta página.')
  }

  try {
    return JSON.parse(match[1]) as Record<string, unknown>
  } catch {
    throw new Error('O __NEXT_DATA__ do Rolê Agora retornou JSON inválido.')
  }
}


function tryParseNextData(html: string) {
  try {
    return parseNextData(html)
  } catch {
    return null
  }
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&#x2F;/gi, '/')
    .replace(/&#47;/gi, '/')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function extractEventLinks(html: string) {
  const links = new Set<string>()
  const patterns = [
    /href=["'](\/event\/[^"'?#<>\s]+)["']/gi,
    /href=["'](https?:\/\/www\.roleagora\.com\.br\/event\/[^"'?#<>\s]+)["']/gi,
  ]

  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(html)) !== null) {
      const raw = decodeHtmlEntities(match[1] || '')
      if (!raw) continue

      try {
        const url = new URL(raw, ROLE_AGORA_BASE_URL)
        if (url.hostname !== 'www.roleagora.com.br') continue
        if (!url.pathname.startsWith('/event/')) continue
        url.hash = ''
        url.search = ''
        links.add(url.toString())
      } catch {
        // Ignora links inválidos.
      }
    }
  }

  return Array.from(links).slice(0, MAX_EVENT_PAGES_PER_CITY)
}

function collectJsonLdEvents(value: unknown, output: Record<string, unknown>[]) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectJsonLdEvents(item, output))
    return
  }

  if (!value || typeof value !== 'object') return

  const record = value as Record<string, unknown>
  const type = record['@type']
  const types = Array.isArray(type) ? type : [type]

  if (
    types.some(
      (item) => typeof item === 'string' && item.toLowerCase() === 'event'
    )
  ) {
    output.push(record)
  }

  if (record['@graph']) {
    collectJsonLdEvents(record['@graph'], output)
  }
}

function extractJsonLdEvent(html: string) {
  const regex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  const events: Record<string, unknown>[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(html)) !== null) {
    const raw = match[1]?.trim()
    if (!raw) continue

    try {
      collectJsonLdEvents(JSON.parse(raw), events)
    } catch {
      // Continua tentando os demais blocos JSON-LD.
    }
  }

  return events[0] || null
}

function jsonLdImage(value: unknown) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    return value.find((item) => typeof item === 'string') as string | undefined
  }
  if (value && typeof value === 'object') {
    const url = (value as Record<string, unknown>).url
    return typeof url === 'string' ? url : undefined
  }
  return undefined
}

function roleAgoraEventFromJsonLd(
  value: Record<string, unknown>,
  sourceUrl: string
): RoleAgoraEvent | null {
  const startsAt = clean(value.startDate, 80)
  if (!startsAt) return null

  const location =
    value.location && typeof value.location === 'object'
      ? (value.location as Record<string, unknown>)
      : {}
  const addressValue =
    location.address && typeof location.address === 'object'
      ? (location.address as Record<string, unknown>)
      : {}

  const sourceSlug = (() => {
    try {
      const url = new URL(sourceUrl)
      return url.pathname.split('/event/')[1] || ''
    } catch {
      return ''
    }
  })()

  return {
    slug: sourceSlug,
    name: clean(value.name, 240),
    description: clean(value.description, 1600),
    startsAt,
    endsAt: clean(value.endDate, 80) || null,
    backgroundImageUrl: clean(jsonLdImage(value.image), 1000) || null,
    location: {
      name: clean(location.name, 180) || null,
      address: [
        clean(addressValue.streetAddress, 180),
        clean(addressValue.addressLocality, 120),
        clean(addressValue.addressRegion, 30),
      ]
        .filter(Boolean)
        .join(', '),
      addressStreet: clean(addressValue.streetAddress, 180) || null,
      addressCity: clean(addressValue.addressLocality, 120) || null,
      addressState: clean(addressValue.addressRegion, 30) || null,
    },
  }
}

function extractEventFromEventPage(html: string, sourceUrl: string) {
  const nextData = tryParseNextData(html)
  if (nextData) {
    const events: RoleAgoraEvent[] = []
    collectEvents(nextData, events)
    if (events[0]) return events[0]
  }

  const jsonLd = extractJsonLdEvent(html)
  return jsonLd ? roleAgoraEventFromJsonLd(jsonLd, sourceUrl) : null
}

async function fetchEventPages(eventUrls: string[]) {
  const events: RoleAgoraEvent[] = []

  for (let index = 0; index < eventUrls.length; index += EVENT_PAGE_CONCURRENCY) {
    const batch = eventUrls.slice(index, index + EVENT_PAGE_CONCURRENCY)
    const results = await Promise.all(
      batch.map(async (url) => {
        try {
          const html = await fetchText(url)
          return extractEventFromEventPage(html, url)
        } catch (error) {
          console.error('Erro ao ler evento do Rolê Agora:', url, error)
          return null
        }
      })
    )

    for (const event of results) {
      if (event) events.push(event)
    }
  }

  return events
}

function isRoleAgoraEvent(value: unknown): value is RoleAgoraEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  const record = value as Record<string, unknown>
  return (
    typeof record.startsAt === 'string' &&
    (typeof record.slug === 'string' || typeof record.id === 'string') &&
    (typeof record.name === 'string' || typeof record.nameOriginal === 'string')
  )
}

function collectEvents(value: unknown, output: RoleAgoraEvent[]) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectEvents(item, output))
    return
  }

  if (!value || typeof value !== 'object') return

  if (isRoleAgoraEvent(value)) {
    output.push(value)
  }

  for (const child of Object.values(value as Record<string, unknown>)) {
    collectEvents(child, output)
  }
}

function normalizeComparable(value?: string | null) {
  return slugify(clean(value, 120))
}

function sameCity(event: RoleAgoraEvent, city: string, state?: string) {
  const eventCity = normalizeComparable(event.location?.addressCity)
  const requestedCity = normalizeComparable(city)

  if (eventCity && requestedCity && eventCity !== requestedCity) return false

  const eventState = clean(event.location?.addressState, 30).toUpperCase()
  const requestedState = clean(state, 30).toUpperCase()

  if (eventState && requestedState && eventState !== requestedState) return false

  return true
}

function withinWindow(
  event: RoleAgoraEvent,
  startTimestamp: number,
  endTimestamp: number
) {
  const start = Date.parse(event.startsAt || '')
  if (Number.isNaN(start)) return false

  const end = event.endsAt ? Date.parse(event.endsAt) : null
  const effectiveEnd = end !== null && !Number.isNaN(end) ? end : start

  return effectiveEnd >= startTimestamp && start <= endTimestamp
}

function firstGenre(event: RoleAgoraEvent) {
  const directGenre = event.genres
    ?.map((item) => clean(item.genre?.name, 120))
    .find(Boolean)

  if (directGenre) return directGenre

  return (
    event.artists
      ?.map((item) => clean(item.artist?.genre?.name, 120))
      .find(Boolean) || null
  )
}

function firstArtistImage(event: RoleAgoraEvent) {
  return (
    event.artists
      ?.map((item) => clean(item.artist?.backgroundImageUrl, 1000))
      .find(Boolean) || null
  )
}

function imageUrl(event: RoleAgoraEvent) {
  return (
    clean(event.backgroundImageUrl, 1000) ||
    firstArtistImage(event) ||
    clean(event.location?.backgroundImageUrl, 1000) ||
    null
  )
}

function address(event: RoleAgoraEvent, fallbackCity: string, fallbackState?: string) {
  const location = event.location
  const street = clean(location?.addressStreet, 180)
  const number =
    typeof location?.addressNumber === 'number'
      ? String(location.addressNumber)
      : clean(location?.addressNumber, 40)

  if (clean(location?.address, 300)) {
    return clean(location?.address, 300)
  }

  const streetLine = [street, number].filter(Boolean).join(', ')
  const locality = [
    clean(location?.addressDistrict, 120),
    clean(location?.addressCity, 120) || clean(fallbackCity, 120),
    clean(location?.addressState, 30) || clean(fallbackState, 30).toUpperCase(),
  ]
    .filter(Boolean)
    .join(', ')

  return [streetLine, locality].filter(Boolean).join(' - ').slice(0, 300)
}

function sourceSnippet(event: RoleAgoraEvent) {
  const parts = [
    clean(event.nameOriginal, 240) || clean(event.name, 240),
    clean(event.location?.name, 180),
    clean(event.startsAt, 80),
  ].filter(Boolean)

  return parts.join(' • ').slice(0, 500)
}

function eventUrl(event: RoleAgoraEvent) {
  const slug = clean(event.slug, 600)
  return slug ? `${ROLE_AGORA_BASE_URL}/event/${slug}` : ''
}

function mapEvent(
  event: RoleAgoraEvent,
  fallbackCity: string,
  fallbackState?: string
): GroqEventCandidate | null {
  const url = eventUrl(event)
  const startsAt = clean(event.startsAt, 80)
  if (!url || !startsAt) return null

  const title =
    clean(event.nameOriginal, 180) ||
    clean(event.name, 180) ||
    'Evento no Rolê Agora'

  const city = clean(event.location?.addressCity, 100) || clean(fallbackCity, 100)
  const state =
    clean(event.location?.addressState, 30).toUpperCase() ||
    clean(fallbackState, 30).toUpperCase() ||
    null

  return {
    title,
    description:
      clean(event.description, 1600) ||
      clean(event.nameOriginal, 1600) ||
      clean(event.name, 1600),
    event_date: startsAt,
    event_end_date: clean(event.endsAt, 80) || null,
    location_name: clean(event.location?.name, 180) || null,
    address: address(event, fallbackCity, fallbackState),
    city,
    state,
    category_name: firstGenre(event),
    image_url: imageUrl(event),
    ticket_price: null,
    whatsapp_info: null,
    source_url: url,
    source_domain: 'roleagora.com.br',
    source_type: 'roleagora',
    source_title: clean(event.name, 240) || title,
    source_snippet: sourceSnippet(event),
    confidence: 95,
    raw_data: {
      discovery_engine: 'roleagora-next-data',
      roleagora_id: clean(event.id, 120) || null,
      roleagora_slug: clean(event.slug, 600) || null,
      roleagora_event_type: clean(event.eventTypeName, 100) || null,
      roleagora_starts_at: startsAt,
      roleagora_ends_at: clean(event.endsAt, 80) || null,
      roleagora_ticket_url:
        clean(event.ticketUrl, 1000) ||
        clean(event.ticketsUrl, 1000) ||
        clean(event.purchaseUrl, 1000) ||
        clean(event.externalUrl, 1000) ||
        null,
      location: {
        name: clean(event.location?.name, 180) || null,
        lat:
          typeof event.location?.lat === 'number' && Number.isFinite(event.location.lat)
            ? event.location.lat
            : null,
        lng:
          typeof event.location?.lng === 'number' && Number.isFinite(event.location.lng)
            ? event.location.lng
            : null,
        district: clean(event.location?.addressDistrict, 120) || null,
        city,
        state,
      },
      date: {
        structured: true,
        source_field: 'startsAt',
      },
    },
  }
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/json',
      'User-Agent':
        'Mozilla/5.0 (compatible; AondeTemBaile/1.0; +https://aondetembaile.com.br)',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Rolê Agora respondeu HTTP ${response.status} para ${url}`)
  }

  return response.text()
}

async function tryFetchJson(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json,text/plain,*/*',
      'User-Agent':
        'Mozilla/5.0 (compatible; AondeTemBaile/1.0; +https://aondetembaile.com.br)',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })

  if (!response.ok) return null

  return response.json().catch(() => null)
}

export async function discoverRoleAgoraEvents(input: {
  city: string
  state?: string
  periodDays: number
}) {
  const slug = citySlug(input.city, input.state)
  const pageUrl = `${ROLE_AGORA_BASE_URL}/city/${slug}`
  const html = await fetchText(pageUrl)
  const nextData = parseNextData(html)

  const payloads: unknown[] = [nextData]
  const buildId = clean(nextData.buildId, 300)
  let usedDataEndpoint = false

  if (buildId) {
    const dataUrl = `${ROLE_AGORA_BASE_URL}/_next/data/${encodeURIComponent(
      buildId
    )}/city/${slug}.json`
    const dataPayload = await tryFetchJson(dataUrl)

    if (dataPayload) {
      payloads.unshift(dataPayload)
      usedDataEndpoint = true
    }
  }

  const rawEvents: RoleAgoraEvent[] = []
  payloads.forEach((payload) => collectEvents(payload, rawEvents))

  const eventLinks = extractEventLinks(html)
  let usedHtmlEventPages = false

  if (eventLinks.length > 0) {
    const detailedEvents = await fetchEventPages(eventLinks)
    rawEvents.push(...detailedEvents)
    usedHtmlEventPages = detailedEvents.length > 0
  }

  const uniqueRaw = new Map<string, RoleAgoraEvent>()
  for (const event of rawEvents) {
    const key = clean(event.id, 160) || clean(event.slug, 600)
    if (!key) continue
    uniqueRaw.set(key, event)
  }

  const now = Date.now()
  const endTimestamp = now + input.periodDays * 24 * 60 * 60 * 1000

  const candidates: GroqEventCandidate[] = []
  for (const event of uniqueRaw.values()) {
    if (!sameCity(event, input.city, input.state)) continue
    if (!withinWindow(event, now, endTimestamp)) continue

    const candidate = mapEvent(event, input.city, input.state)
    if (candidate) candidates.push(candidate)
  }

  candidates.sort(
    (a, b) => Date.parse(a.event_date) - Date.parse(b.event_date)
  )

  return {
    events: candidates,
    scanned: uniqueRaw.size,
    pageUrl,
    buildId: buildId || null,
    usedDataEndpoint,
    usedHtmlEventPages,
    eventLinksFound: eventLinks.length,
    warnings:
      candidates.length === 0
        ? [
            `Rolê Agora: nenhum evento futuro de ${input.city} foi encontrado na janela de ${input.periodDays} dias.`,
          ]
        : [],
  }
}
