import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const SITE_URL = 'https://aondetembaile.com.br'
export const SITE_NAME = 'Aonde Tem Baile'
export const DEFAULT_OG_IMAGE = `${SITE_URL}/img_hero/image.png`
export const DEFAULT_LOGO = `${SITE_URL}/logos/Logo_03_Horizontal_Transparente.png`

export interface SeoEvent {
  id: string
  title: string
  description?: string | null
  location_name?: string | null
  address?: string | null
  city: string
  state?: string | null
  latitude?: number | null
  longitude?: number | null
  category_id?: string | null
  category_name?: string | null
  image_url?: string | null
  event_date: string
  event_end_date?: string | null
  ticket_price?: string | null
  source_url?: string | null
  source_domain?: string | null
  facebook_url?: string | null
  instagram_handle?: string | null
  updated_at?: string | null
}

export interface SeoCategory {
  id: string
  name: string
  slug: string
}

export function seoSlug(value?: string | null) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function citySeoPath(city: string, state?: string | null) {
  const stateSlug = seoSlug(state || 'br')
  return `/eventos/${stateSlug}/${seoSlug(city)}`
}

export function categorySeoPath(category: string) {
  return `/eventos/categoria/${seoSlug(category)}`
}

export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString()
}

function publicSeoClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || url.includes('placeholder')) return null

  return createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

const EVENT_SELECT = [
  'id',
  'title',
  'description',
  'location_name',
  'address',
  'city',
  'state',
  'latitude',
  'longitude',
  'category_id',
  'category_name',
  'image_url',
  'event_date',
  'event_end_date',
  'ticket_price',
  'source_url',
  'source_domain',
  'facebook_url',
  'instagram_handle',
  'updated_at',
].join(',')

export async function getFutureApprovedEvents(input?: {
  state?: string
  limit?: number
}) {
  const supabase = publicSeoClient()
  if (!supabase) return [] as SeoEvent[]

  const requestedLimit = Math.min(Math.max(input?.limit ?? 500, 1), 10000)
  const pageSize = 1000
  const events: SeoEvent[] = []
  const now = new Date().toISOString()

  while (events.length < requestedLimit) {
    const batchSize = Math.min(pageSize, requestedLimit - events.length)
    const from = events.length
    const to = from + batchSize - 1

    let query = supabase
      .from('events')
      .select(EVENT_SELECT)
      .eq('status', 'approved')
      .gte('event_date', now)
      .order('event_date', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)

    if (input?.state) {
      query = query.ilike('state', input.state)
    }

    const { data, error } = await query

    if (error) {
      console.error('SEO: nÃ£o foi possÃ­vel carregar eventos futuros:', error)
      break
    }

    const batch = (data || []) as unknown as SeoEvent[]
    events.push(...batch)

    if (batch.length < batchSize) break
  }

  return events
}

export async function getSeoCategories() {
  const supabase = publicSeoClient()
  if (!supabase) return [] as SeoCategory[]

  const { data, error } = await supabase
    .from('categories')
    .select('id,name,slug')
    .order('name', { ascending: true })
    .limit(500)

  if (error) {
    console.error('SEO: nÃ£o foi possÃ­vel carregar categorias:', error)
    return []
  }

  return (data || []) as SeoCategory[]
}

export async function getCategoryBySlug(slug: string) {
  const supabase = publicSeoClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('categories')
    .select('id,name,slug')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('SEO: nÃ£o foi possÃ­vel resolver categoria:', error)
    return null
  }

  return (data as SeoCategory | null) || null
}

export async function getCityEventsBySlug(
  stateSlug: string,
  citySlug: string,
  limit = 120
) {
  const state = stateSlug.toUpperCase()
  const events = await getFutureApprovedEvents({
    state,
    limit: Math.min(Math.max(limit * 12, 1000), 3000),
  })

  return events
    .filter((event) => seoSlug(event.city) === citySlug)
    .slice(0, limit)
}

export async function getCategoryEventsBySlug(slug: string, limit = 120) {
  const category = await getCategoryBySlug(slug)
  const supabase = publicSeoClient()

  if (!category || !supabase) {
    return { category, events: [] as SeoEvent[] }
  }

  const base = () =>
    supabase
      .from('events')
      .select(EVENT_SELECT)
      .eq('status', 'approved')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(Math.min(Math.max(limit, 1), 300))

  const [byId, byName] = await Promise.all([
    base().eq('category_id', category.id),
    base().ilike('category_name', category.name),
  ])

  if (byId.error) {
    console.error('SEO: erro ao carregar categoria por ID:', byId.error)
  }

  if (byName.error) {
    console.error('SEO: erro ao carregar categoria por nome:', byName.error)
  }

  const merged = new Map<string, SeoEvent>()

  for (const event of [...(byId.data || []), ...(byName.data || [])] as unknown as SeoEvent[]) {
    merged.set(event.id, event)
  }

  return {
    category,
    events: Array.from(merged.values())
      .sort(
        (a, b) =>
          new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
      )
      .slice(0, limit),
  }
}

export function compactDescription(value?: string | null, maxLength = 160) {
  const clean = (value || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= maxLength) return clean
  return `${clean.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
