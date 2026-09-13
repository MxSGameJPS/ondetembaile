import { searchBraveWeb } from '@/lib/brave/client'
import { normalizeBraveResult } from '@/lib/event-discovery/extract'
import type { DiscoverySource } from '@/types/event-discovery'
import type { GroqEventCandidate } from '@/lib/event-discovery/groq'

interface BraveDiscoveryInput {
  city: string
  state?: string
  periodDays: number
  sources: DiscoverySource[]
}

function brazilToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

function queryForSource(
  source: DiscoverySource,
  city: string,
  state: string | undefined,
  year: string
) {
  const location = `"${city}"${state ? ` "${state}"` : ''}`
  const terms = '(baile OR festa OR show OR forró OR forro OR pagode OR samba OR sertanejo OR festival)'

  if (source === 'sympla') {
    return `site:sympla.com.br/evento ${terms} ${location} ${year}`
  }

  if (source === 'roleagora') {
    return `site:roleagora.com.br/event/ ${terms} ${location} ${year}`
  }

  if (source === 'reddit') {
    return `site:reddit.com ${terms} ${location} ${year}`
  }

  return `${terms} ${location} ${year}`
}

function sourceUrlAllowed(source: DiscoverySource, value: string) {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    const path = url.pathname.toLowerCase()

    if (source === 'sympla') {
      return (
        (host === 'sympla.com.br' || host.endsWith('.sympla.com.br')) &&
        path.startsWith('/evento/')
      )
    }

    if (source === 'roleagora') {
      return (
        (host === 'roleagora.com.br' || host.endsWith('.roleagora.com.br')) &&
        path.startsWith('/event/')
      )
    }

    if (source === 'reddit') {
      return host === 'reddit.com' || host.endsWith('.reddit.com')
    }

    if (source === 'web') {
      return !(
        host === 'facebook.com' ||
        host.endsWith('.facebook.com') ||
        host === 'fb.com' ||
        host.endsWith('.fb.com') ||
        host === 'sympla.com.br' ||
        host.endsWith('.sympla.com.br') ||
        host === 'roleagora.com.br' ||
        host.endsWith('.roleagora.com.br') ||
        host === 'reddit.com' ||
        host.endsWith('.reddit.com')
      )
    }

    return false
  } catch {
    return false
  }
}

function insideWindow(eventDate: string | null, start: string, end: string) {
  if (!eventDate) return false
  const day = eventDate.slice(0, 10)
  return day >= start && day <= end
}

export async function discoverEventsWithBrave(input: BraveDiscoveryInput) {
  const start = brazilToday()
  const end = addDays(start, input.periodDays)
  const year = start.slice(0, 4)
  const selected = Array.from(
    new Set(input.sources.filter((source) => source !== 'facebook'))
  )

  const events: GroqEventCandidate[] = []
  const warnings: string[] = []
  let searched = 0

  for (const source of selected) {
    try {
      const results = await searchBraveWeb(
        queryForSource(source, input.city, input.state, year),
        source === 'web' ? 10 : 8
      )

      searched += results.length

      for (const result of results) {
        if (!sourceUrlAllowed(source, result.url || '')) continue

        const normalized = await normalizeBraveResult(
          result,
          {
            city: input.city,
            state: input.state,
            periodDays: input.periodDays,
            sourceType: source,
          },
          source === 'web' || source === 'roleagora'
        )

        if (!normalized || !insideWindow(normalized.event_date, start, end)) continue
        if (normalized.source_type === 'facebook') continue

        events.push(normalized as GroqEventCandidate)
      }
    } catch (error) {
      console.error(`Erro na descoberta Brave para ${source}:`, error)
      warnings.push(
        `${source}: ${error instanceof Error ? error.message : 'falha inesperada'}`
      )
    }
  }

  const unique = new Map<string, GroqEventCandidate>()
  for (const event of events) {
    unique.set(event.source_url, event)
  }

  return {
    events: Array.from(unique.values()),
    searched,
    warnings,
    window: { start, end },
  }
}
