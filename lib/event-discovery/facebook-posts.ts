import { groqCompoundJson } from '@/lib/groq/client'
import { getDiscoveryWindow, type GroqEventCandidate } from '@/lib/event-discovery/groq'
import type { ApifyFacebookPost } from '@/lib/apify/facebook-posts'

const MAX_POSTS_FOR_AI = 6
const MAX_CONTEXT_PER_POST = 850

const EVENT_WORDS =
  /\b(baile|festa|show|fandango|forr[oó]|pagode|samba|sertanejo|dan[cç]a|dan[cç]ante|festival|ingresso|ingressos|reservas?|whatsapp|ctg|sal[aã]o)\b/i
const DATE_SIGNAL =
  /\b\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?\b|\b\d{1,2}\s+de\s+(?:janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/i
const TIME_SIGNAL = /\b(?:[01]?\d|2[0-3])(?::\d{2}|h(?:\d{2})?)\b|\b[aà]s\s+(?:[01]?\d|2[0-3])\b/i
const STRONG_PAST =
  /\b(fotos? do baile|obrigad[oa].*baile|baile maravilhoso realizado|quem esteve presente|reviver esse momento|foi bom demais|realizado no|último sábado|ontem foi|agradece.*presentes)\b/i

interface FacebookAiEvent {
  post_id?: string
  is_event?: boolean
  is_past?: boolean
  title?: string
  event_date?: string
  year_source?: 'explicit' | 'post_timestamp_inference' | 'unknown'
  location_name?: string
  address?: string
  city?: string
  state?: string
  category_name?: string
  ticket_price?: string
  whatsapp_info?: string
  description?: string
  confidence?: number
  reason?: string
}

interface FacebookAiResponse {
  events?: FacebookAiEvent[]
}

interface PreparedFacebookPost {
  postId: string
  url: string
  author: string
  publishedAt: string
  text: string
  imageUrl: string | null
  raw: ApifyFacebookPost
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function sameCity(actual: string, expected: string) {
  const left = normalizeText(actual)
  const right = normalizeText(expected)
  return Boolean(left && right && (left === right || left.startsWith(right + ' ') || right.startsWith(left + ' ')))
}

function brazilDateTime(timestamp?: number) {
  if (!timestamp || !Number.isFinite(timestamp)) return ''

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(timestamp))
}

function sourceText(post: ApifyFacebookPost) {
  const captions = (post.attachments ?? [])
    .map((attachment) => attachment.accessibilityCaption || '')
    .filter(Boolean)
    .slice(0, 2)

  return [post.postText || '', ...captions]
    .filter(Boolean)
    .join('\n')
    .replace(/\s+/g, ' ')
    .trim()
}

function imageUrl(post: ApifyFacebookPost) {
  const image = (post.attachments ?? []).find(
    (attachment) => attachment.type === 'photo' && attachment.url
  )

  return image?.url || null
}

function localCandidateScore(text: string) {
  let score = 0

  if (EVENT_WORDS.test(text)) score += 2
  if (DATE_SIGNAL.test(text)) score += 2
  if (TIME_SIGNAL.test(text)) score += 2
  if (/\b(ingresso|ingressos|reservas?|whatsapp|informa[cç][oõ]es|local:)\b/i.test(text)) score += 1
  if (/\b(venha|esperamos vocês|garanta|participe|neste sábado|nesta sexta|neste domingo)\b/i.test(text)) score += 1
  if (STRONG_PAST.test(text)) score -= 5

  return score
}

function preparePosts(posts: ApifyFacebookPost[]) {
  return posts
    .map((post): PreparedFacebookPost | null => {
      const postId = post.postId || ''
      const url = post.url || ''
      const text = sourceText(post)

      if (!postId || !url || !text || localCandidateScore(text) < 4) return null

      return {
        postId,
        url,
        author: post.author?.name || 'Facebook',
        publishedAt: brazilDateTime(post.timestamp),
        text: text.slice(0, MAX_CONTEXT_PER_POST),
        imageUrl: imageUrl(post),
        raw: post,
      }
    })
    .filter((post): post is PreparedFacebookPost => Boolean(post))
    .slice(0, MAX_POSTS_FOR_AI)
}

function datePart(iso: string) {
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})T/)
  return match?.[1] || ''
}

function isInsideWindow(iso: string, start: string, end: string) {
  const day = datePart(iso)
  const time = new Date(iso).getTime()

  return Boolean(day && !Number.isNaN(time) && day >= start && day <= end)
}

function publishedDateFromPost(post: PreparedFacebookPost) {
  if (!post.raw.timestamp) return null
  const value = new Date(post.raw.timestamp)
  return Number.isNaN(value.getTime()) ? null : value
}

function yearInferenceIsSafe(
  item: FacebookAiEvent,
  post: PreparedFacebookPost,
  eventDate: string
) {
  const textHasExplicitYear = /\b(?:19|20)\d{2}\b/.test(post.text)

  if (item.year_source === 'explicit') {
    return textHasExplicitYear
  }

  if (item.year_source !== 'post_timestamp_inference' || textHasExplicitYear) {
    return false
  }

  const publishedAt = publishedDateFromPost(post)
  const eventTime = new Date(eventDate).getTime()

  if (!publishedAt || Number.isNaN(eventTime)) return false

  return eventTime >= publishedAt.getTime() - 6 * 60 * 60 * 1000
}

function facebookPrompt(
  posts: PreparedFacebookPost[],
  city: string,
  state: string | undefined,
  periodDays: number
) {
  const window = getDiscoveryWindow(periodDays)
  const payload = posts.map((post) => ({
    post_id: post.postId,
    published_at: post.publishedAt,
    author: post.author,
    url: post.url,
    content: post.text,
  }))

  return [
    'Classifique posts públicos do Facebook para o Aonde Tem Baile.',
    'Não pesquise a web. Use SOMENTE os posts fornecidos.',
    `Cidade obrigatória do evento: ${city}${state ? ' - ' + state : ''}.`,
    `Janela do evento: ${window.start} até ${window.end}.`,
    '',
    'Regras:',
    '- is_event=true apenas para anúncio de UM evento futuro específico.',
    '- Rejeite fotos/agradecimentos/retrospectivas de eventos que já aconteceram.',
    '- event_date deve ser ISO 8601 com horário.',
    '- Se o post trouxer ano explícito, year_source="explicit".',
    '- Se trouxer dia/mês e horário mas não ano, você pode inferir o ano SOMENTE a partir da data de publicação, escolhendo a próxima ocorrência compatível dentro da janela; use year_source="post_timestamp_inference".',
    '- Se faltar dia/mês ou horário, rejeite.',
    '- A cidade precisa ser a cidade solicitada. Não aceite região metropolitana como se fosse a mesma cidade.',
    '- Não invente endereço, preço ou WhatsApp.',
    '',
    'Retorne SOMENTE JSON válido:',
    '{"events":[{"post_id":"","is_event":true,"is_past":false,"title":"","event_date":"YYYY-MM-DDTHH:mm:ss-03:00","year_source":"explicit","location_name":"","address":"","city":"","state":"","category_name":"","ticket_price":"","whatsapp_info":"","description":"","confidence":0,"reason":""}]}',
    '',
    'POSTS:',
    JSON.stringify(payload),
  ].join('\n')
}

export async function extractFacebookEventsFromPosts(input: {
  posts: ApifyFacebookPost[]
  city: string
  state?: string
  periodDays: number
}) {
  const prepared = preparePosts(input.posts)
  const window = getDiscoveryWindow(input.periodDays)

  if (prepared.length === 0) {
    return {
      candidates: [] as GroqEventCandidate[],
      filteredPosts: 0,
      analyzedPosts: 0,
    }
  }

  const prompt = facebookPrompt(prepared, input.city, input.state, input.periodDays)
  const response = await groqCompoundJson<FacebookAiResponse>(prompt, {
    enabledTools: [],
    maxCompletionTokens: 1600,
    fallbackPrompt: prompt.slice(0, 2200),
  })

  const byId = new Map(prepared.map((post) => [post.postId, post]))
  const candidates: GroqEventCandidate[] = []

  for (const item of Array.isArray(response.events) ? response.events : []) {
    if (!item.is_event || item.is_past) continue

    const post = byId.get(item.post_id || '')
    const eventDate = item.event_date || ''
    const eventCity = (item.city || '').trim()

    if (!post || !eventDate || !eventCity) continue
    if (!DATE_SIGNAL.test(post.text) || !TIME_SIGNAL.test(post.text)) continue
    if (!isInsideWindow(eventDate, window.start, window.end)) continue
    if (!sameCity(eventCity, input.city)) continue

    const eventState = (item.state || '').trim().toUpperCase()
    if (input.state && eventState && eventState !== input.state.toUpperCase()) continue
    if (!yearInferenceIsSafe(item, post, eventDate)) continue

    const confidence =
      typeof item.confidence === 'number' && Number.isFinite(item.confidence)
        ? Math.max(0, Math.min(Math.round(item.confidence), 100))
        : 60

    candidates.push({
      title: (item.title || `Evento de ${post.author}`).trim().slice(0, 180),
      description: (item.description || post.text).trim().slice(0, 1600),
      event_date: new Date(eventDate).toISOString(),
      location_name: item.location_name?.trim().slice(0, 180) || null,
      address:
        (item.address?.trim() || [eventCity, eventState].filter(Boolean).join(', ')).slice(0, 300),
      city: eventCity.slice(0, 100),
      state: eventState.slice(0, 30) || null,
      category_name: item.category_name?.trim().slice(0, 120) || null,
      image_url: post.imageUrl,
      ticket_price: item.ticket_price?.trim().slice(0, 80) || null,
      whatsapp_info: item.whatsapp_info?.replace(/\D/g, '').slice(0, 13) || null,
      source_url: post.url,
      source_domain: 'facebook.com',
      source_type: 'facebook',
      source_title: post.author.slice(0, 220),
      source_snippet: post.text.slice(0, 1200),
      confidence,
      raw_data: {
        discovery_engine: 'apify-facebook-posts+groq',
        apify_post_id: post.postId,
        apify_author: post.author,
        apify_published_at: post.publishedAt,
        year_source: item.year_source || 'unknown',
        validation: {
          window_start: window.start,
          window_end: window.end,
          city_required: input.city,
          local_filter_score: localCandidateScore(post.text),
        },
      },
    })
  }

  return {
    candidates,
    filteredPosts: prepared.length,
    analyzedPosts: prepared.length,
  }
}
