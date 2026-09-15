import 'server-only'

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search'

interface NominatimResult {
  lat?: string
  lon?: string
  display_name?: string
  address?: {
    city?: string
    town?: string
    village?: string
    municipality?: string
    county?: string
    state?: string
    postcode?: string
    house_number?: string
  }
}

export interface GeocodeInput {
  address?: string
  locationName?: string
  city?: string
  state?: string
}

function normalize(value: string | undefined | null) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function cityMatches(result: NominatimResult, city: string) {
  if (!city.trim()) return true

  const expected = normalize(city)
  const candidates = [
    result.address?.city,
    result.address?.town,
    result.address?.village,
    result.address?.municipality,
    result.address?.county,
    result.display_name,
  ]
    .map(normalize)
    .filter(Boolean)

  return candidates.some(
    (candidate) =>
      candidate === expected ||
      candidate.includes(expected) ||
      expected.includes(candidate)
  )
}

function scoreResult(result: NominatimResult, city: string, state: string, address: string) {
  let score = 0
  const display = normalize(result.display_name)

  if (cityMatches(result, city)) score += 20

  const normalizedState = normalize(state)
  if (normalizedState && display.includes(normalizedState)) score += 4

  const cep = address.match(/\b\d{5}-?\d{3}\b/)?.[0]?.replace(/\D/g, '')
  const resultCep = result.address?.postcode?.replace(/\D/g, '')
  if (cep && resultCep && cep === resultCep) score += 8

  const number = address.match(/(?:^|,|\s)(\d{1,6})(?:,|\s|$)/)?.[1]
  if (number && result.address?.house_number === number) score += 5

  return score
}

async function search(query: string) {
  const url = new URL(NOMINATIM_SEARCH_URL)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('countrycodes', 'br')
  url.searchParams.set('limit', '5')
  url.searchParams.set('q', query)

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'AondeTemBaile/1.0 (event geocoding)',
    },
    next: { revalidate: 60 * 60 * 24 * 30 },
    signal: AbortSignal.timeout(8000),
  })

  if (!response.ok) return [] as NominatimResult[]

  const data = await response.json().catch(() => [])
  return Array.isArray(data) ? (data as NominatimResult[]) : []
}

export async function geocodeLocation(input: GeocodeInput) {
  const address = input.address?.trim() || ''
  const locationName = input.locationName?.trim() || ''
  const city = input.city?.trim() || ''
  const state = input.state?.trim() || ''

  if (!address && !locationName && !city) return null

  const queries = unique([
    [address, city, state, 'Brasil'].filter(Boolean).join(', '),
    [locationName, address, city, state, 'Brasil'].filter(Boolean).join(', '),
    [locationName, city, state, 'Brasil'].filter(Boolean).join(', '),
    [city, state, 'Brasil'].filter(Boolean).join(', '),
  ])

  for (const query of queries) {
    const results = await search(query)
    const compatible = results
      .filter((result) => cityMatches(result, city))
      .map((result) => ({
        result,
        score: scoreResult(result, city, state, address),
      }))
      .sort((a, b) => b.score - a.score)

    const best = compatible[0]?.result
    if (!best?.lat || !best?.lon) continue

    const lat = Number(best.lat)
    const lng = Number(best.lon)

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue

    return {
      lat,
      lng,
      displayName: best.display_name || query,
    }
  }

  return null
}
