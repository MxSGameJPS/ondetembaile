import { isIP } from 'node:net'
import type { BraveWebResult } from '@/lib/brave/client'
import type { DiscoverySource } from '@/types/event-discovery'

const MONTHS: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  marco: 2,
  março: 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11,
}

const EVENT_KEYWORDS = [
  'baile',
  'festa',
  'show',
  'festival',
  'evento',
  'forró',
  'forro',
  'sertanejo',
  'pagode',
  'samba',
  'vanera',
  'fandango',
  'dança',
  'danca',
]

export interface DiscoveryContext {
  city: string
  state?: string
  periodDays: number
  sourceType: DiscoverySource
}

export interface NormalizedDiscoveredEvent {
  title: string
  description: string
  event_date: string | null
  location_name: string | null
  address: string
  city: string
  state: string | null
  category_name: string | null
  image_url: string | null
  ticket_price: string | null
  whatsapp_info: string | null
  source_url: string
  source_domain: string
  source_type: DiscoverySource
  source_title: string
  source_snippet: string
  confidence: number
  raw_data: Record<string, unknown>
}

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}…` : value
}

export function normalizeSourceUrl(value: string) {
  try {
    const url = new URL(value)
    url.hash = ''

    const removable = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
      'ref',
      'ref_src',
    ]

    removable.forEach((key) => url.searchParams.delete(key))

    if (url.pathname !== '/') {
      url.pathname = url.pathname.replace(/\/+$/, '')
    }

    return url.toString()
  } catch {
    return value
  }
}

function getDomain(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return 'desconhecido'
  }
}

function isPrivateIpv4(ip: string) {
  const octets = ip.split('.').map(Number)
  if (octets.length !== 4 || octets.some((part) => Number.isNaN(part))) return false

  const [a, b] = octets

  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 0
  )
}

function canFetchPublicUrl(value: string) {
  try {
    const url = new URL(value)

    if (!['http:', 'https:'].includes(url.protocol)) return false

    const hostname = url.hostname.toLowerCase()
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname === '0.0.0.0'
    ) {
      return false
    }

    const ipVersion = isIP(hostname)
    if (ipVersion === 4 && isPrivateIpv4(hostname)) return false
    if (ipVersion === 6 && (hostname === '::1' || hostname.startsWith('fc') || hostname.startsWith('fd'))) {
      return false
    }

    return true
  } catch {
    return false
  }
}

function getMetaContent(html: string, key: string, attribute: 'property' | 'name' = 'property') {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = [
    new RegExp(`<meta[^>]*${attribute}=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*${attribute}=["']${escaped}["'][^>]*>`, 'i'),
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return decodeHtml(match[1])
  }

  return null
}

function collectJsonLdEvents(value: unknown, output: Record<string, any>[]) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectJsonLdEvents(item, output))
    return
  }

  if (!value || typeof value !== 'object') return

  const object = value as Record<string, any>
  const type = object['@type']
  const types = Array.isArray(type) ? type : [type]

  if (types.some((item) => typeof item === 'string' && item.toLowerCase() === 'event')) {
    output.push(object)
  }

  if (Array.isArray(object['@graph'])) {
    collectJsonLdEvents(object['@graph'], output)
  }
}

function extractJsonLdEvent(html: string) {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  const events: Record<string, any>[] = []
  let match: RegExpExecArray | null

  while ((match = scriptRegex.exec(html)) !== null) {
    const raw = match[1]?.trim()
    if (!raw) continue

    try {
      collectJsonLdEvents(JSON.parse(raw), events)
    } catch {
      // Ignore malformed structured data and keep the Brave result as fallback.
    }
  }

  return events[0] ?? null
}

function jsonLdImage(value: unknown) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === 'string')
    return typeof first === 'string' ? first : null
  }
  if (value && typeof value === 'object') {
    const url = (value as Record<string, any>).url
    return typeof url === 'string' ? url : null
  }
  return null
}

function jsonLdPrice(value: unknown) {
  const offers = Array.isArray(value) ? value[0] : value
  if (!offers || typeof offers !== 'object') return null

  const offer = offers as Record<string, any>
  const price = offer.price ?? offer.lowPrice
  if (price === undefined || price === null || price === '') return null

  const currency = typeof offer.priceCurrency === 'string' ? offer.priceCurrency.toUpperCase() : 'BRL'
  const numeric = String(price).replace('.', ',')

  return currency === 'BRL' ? `R$ ${numeric}` : `${currency} ${numeric}`
}

function jsonLdAddress(location: unknown) {
  if (!location || typeof location !== 'object') {
    return {
      locationName: null as string | null,
      address: null as string | null,
      city: null as string | null,
      state: null as string | null,
    }
  }

  const locationObject = location as Record<string, any>
  const addressValue = locationObject.address
  let address: string | null = null
  let city: string | null = null
  let state: string | null = null

  if (typeof addressValue === 'string') {
    address = addressValue
  } else if (addressValue && typeof addressValue === 'object') {
    const addressObject = addressValue as Record<string, any>
    city = typeof addressObject.addressLocality === 'string' ? addressObject.addressLocality : null
    state = typeof addressObject.addressRegion === 'string' ? addressObject.addressRegion : null

    address = [
      addressObject.streetAddress,
      addressObject.addressLocality,
      addressObject.addressRegion,
    ]
      .filter((item) => typeof item === 'string' && item.trim())
      .join(', ') || null
  }

  return {
    locationName: typeof locationObject.name === 'string' ? locationObject.name : null,
    address,
    city,
    state,
  }
}

function buildBrazilIso(year: number, monthIndex: number, day: number, hour = 20, minute = 0) {
  const month = String(monthIndex + 1).padStart(2, '0')
  const dayValue = String(day).padStart(2, '0')
  const hourValue = String(hour).padStart(2, '0')
  const minuteValue = String(minute).padStart(2, '0')
  const date = new Date(`${year}-${month}-${dayValue}T${hourValue}:${minuteValue}:00-03:00`)

  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function chooseYear(monthIndex: number, day: number, explicitYear?: number) {
  if (explicitYear) return explicitYear < 100 ? 2000 + explicitYear : explicitYear

  const now = new Date()
  const candidate = new Date(now.getFullYear(), monthIndex, day, 23, 59, 59)
  return candidate.getTime() < now.getTime() - 7 * 86400000 ? now.getFullYear() + 1 : now.getFullYear()
}

function parseDateFromText(text: string, periodDays: number) {
  const numeric = text.match(/\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?(?:\s+(?:às?|as)?\s*(\d{1,2})(?::|h)(\d{2})?)?/i)

  if (numeric) {
    const day = Number(numeric[1])
    const monthIndex = Number(numeric[2]) - 1
    const year = chooseYear(monthIndex, day, numeric[3] ? Number(numeric[3]) : undefined)
    const iso = buildBrazilIso(year, monthIndex, day, Number(numeric[4] ?? 20), Number(numeric[5] ?? 0))
    if (iso && isReasonableFutureDate(iso, periodDays)) return iso
  }

  const monthNames = Object.keys(MONTHS).join('|')
  const namedPattern = new RegExp(
    `\\b(\\d{1,2})\\s*(?:de\\s+)?(${monthNames})(?:\\s*(?:de\\s+)?(\\d{4}))?(?:\\s+(?:às?|as)?\\s*(\\d{1,2})(?::|h)(\\d{2})?)?`,
    'i'
  )
  const named = text.match(namedPattern)

  if (named) {
    const day = Number(named[1])
    const monthIndex = MONTHS[named[2].toLowerCase()]
    const year = chooseYear(monthIndex, day, named[3] ? Number(named[3]) : undefined)
    const iso = buildBrazilIso(year, monthIndex, day, Number(named[4] ?? 20), Number(named[5] ?? 0))
    if (iso && isReasonableFutureDate(iso, periodDays)) return iso
  }

  return null
}

function isReasonableFutureDate(iso: string, periodDays: number) {
  const time = new Date(iso).getTime()
  const now = Date.now()
  const min = now - 2 * 86400000
  const max = now + Math.max(periodDays, 7) * 86400000 + 14 * 86400000
  return time >= min && time <= max
}

function extractPrice(text: string) {
  const match = text.match(/R\$\s*\d{1,4}(?:[.,]\d{2})?/i)
  return match ? match[0].replace(/\s+/g, ' ') : null
}

function extractWhatsapp(text: string) {
  const match = text.match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}/)
  if (!match) return null

  const digits = match[0].replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 13) return null
  return digits.startsWith('55') ? digits.slice(2) : digits
}

function detectCategory(text: string) {
  const normalized = text.toLowerCase()

  if (/forr[oó]/.test(normalized)) return 'Forró'
  if (/sertanej/.test(normalized)) return 'Sertanejo'
  if (/pagode|samba/.test(normalized)) return 'Pagode & Samba'
  if (/ga[uú]ch|tradicional|vanera|fandango/.test(normalized)) return 'Baile Tradicionalista / Gaúcho'
  if (/eletr[oô]nic|dj\b|techno|house\b/.test(normalized)) return 'Eletrônica'
  if (/rock\b/.test(normalized)) return 'Rock'
  if (/baile/.test(normalized)) return 'Baile'

  return null
}

function resolveSourceType(url: string, fallback: DiscoverySource): DiscoverySource {
  return getDomain(url).includes('reddit.com') ? 'reddit' : fallback
}

async function fetchPublicPage(url: string) {
  if (!canFetchPublicUrl(url)) return null

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'AondeTemBaileEventDiscovery/1.0 (+https://aondetembaile.com.br)',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(4500),
    })

    if (!response.ok) return null

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return null
    }

    const html = await response.text()
    return html.slice(0, 700_000)
  } catch {
    return null
  }
}

export async function normalizeBraveResult(
  result: BraveWebResult,
  context: DiscoveryContext,
  enrichFromPage: boolean
): Promise<NormalizedDiscoveredEvent | null> {
  if (!result.url || !result.title) return null

  const sourceUrl = normalizeSourceUrl(result.url)
  const sourceDomain = getDomain(sourceUrl)
  const sourceType = resolveSourceType(sourceUrl, context.sourceType)
  const braveText = decodeHtml(
    [result.title, result.description, ...(result.extra_snippets ?? [])].filter(Boolean).join(' ')
  )

  const looksLikeEvent = EVENT_KEYWORDS.some((keyword) => braveText.toLowerCase().includes(keyword))
  if (!looksLikeEvent) return null

  const html = enrichFromPage ? await fetchPublicPage(sourceUrl) : null
  const jsonLdEvent = html ? extractJsonLdEvent(html) : null
  const location = jsonLdAddress(jsonLdEvent?.location)

  const pageTitle = html ? getMetaContent(html, 'og:title') : null
  const pageDescription = html
    ? getMetaContent(html, 'og:description') ?? getMetaContent(html, 'description', 'name')
    : null
  const pageImage = html ? getMetaContent(html, 'og:image') : null

  const rawTitle =
    (typeof jsonLdEvent?.name === 'string' && jsonLdEvent.name) ||
    pageTitle ||
    decodeHtml(result.title)

  const rawDescription =
    (typeof jsonLdEvent?.description === 'string' && jsonLdEvent.description) ||
    pageDescription ||
    decodeHtml([result.description, ...(result.extra_snippets ?? [])].filter(Boolean).join(' '))

  const structuredDate =
    typeof jsonLdEvent?.startDate === 'string' && !Number.isNaN(new Date(jsonLdEvent.startDate).getTime())
      ? new Date(jsonLdEvent.startDate).toISOString()
      : null

  const eventDate = structuredDate ?? parseDateFromText(braveText, context.periodDays)
  const image =
    jsonLdImage(jsonLdEvent?.image) ||
    pageImage ||
    result.thumbnail?.original ||
    result.thumbnail?.src ||
    null

  const combinedText = `${rawTitle} ${rawDescription} ${location.address ?? ''}`
  const price = jsonLdPrice(jsonLdEvent?.offers) ?? extractPrice(combinedText)
  const whatsapp =
    extractWhatsapp(
      [
        typeof jsonLdEvent?.organizer?.telephone === 'string' ? jsonLdEvent.organizer.telephone : '',
        rawDescription,
      ].join(' ')
    )

  const city = location.city || context.city
  const state = location.state || context.state || null
  const address = location.address || [city, state].filter(Boolean).join(', ')

  let confidence = 35
  if (eventDate) confidence += 25
  if (combinedText.toLowerCase().includes(context.city.toLowerCase())) confidence += 10
  if (location.locationName || location.address) confidence += 8
  if (image) confidence += 5
  if (price) confidence += 4
  if (jsonLdEvent) confidence += 13

  return {
    title: truncate(decodeHtml(rawTitle), 180),
    description: truncate(decodeHtml(rawDescription || 'Evento encontrado em fonte pública.'), 1600),
    event_date: eventDate,
    location_name: location.locationName,
    address: truncate(address || `${context.city}${context.state ? `, ${context.state}` : ''}`, 300),
    city: truncate(city, 100),
    state: state ? truncate(state, 30) : null,
    category_name: detectCategory(combinedText),
    image_url: image,
    ticket_price: price,
    whatsapp_info: whatsapp,
    source_url: sourceUrl,
    source_domain: sourceDomain,
    source_type: sourceType,
    source_title: truncate(decodeHtml(result.title), 220),
    source_snippet: truncate(
      decodeHtml([result.description, ...(result.extra_snippets ?? [])].filter(Boolean).join(' ')),
      1200
    ),
    confidence: Math.min(confidence, 100),
    raw_data: {
      brave: {
        title: result.title,
        description: result.description ?? null,
        age: result.age ?? result.page_age ?? null,
        extra_snippets: result.extra_snippets ?? [],
      },
      enrichment: {
        fetched: Boolean(html),
        json_ld_event: Boolean(jsonLdEvent),
      },
    },
  }
}
