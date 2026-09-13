import { GROQ_DISCOVERY_MODEL, groqBrowserResearch, groqCompoundJson, groqStructuredJson } from '@/lib/groq/client'
import type { DiscoverySource } from '@/types/event-discovery'

export interface GroqDiscoveryInput {
  city: string
  state?: string
  periodDays: number
  source: DiscoverySource
}

export interface GroqEventCandidate {
  title: string
  description: string
  event_date: string
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

interface StructuredEvent {
  is_single_event: boolean
  rejection_reason: string
  title: string
  description: string
  event_date: string
  location_name: string
  address: string
  city: string
  state: string
  category_name: string
  image_url: string
  ticket_price: string
  whatsapp_info: string
  source_url: string
  source_title: string
  source_snippet: string
  date_evidence: string
  confidence: number
}

interface StructuredEventsResponse {
  events: StructuredEvent[]
}

const SINGLE_EVENT_REJECTION_PATTERNS = [
  /\b(o que fazer|guia|agenda|calend[aá]rio|programa[cç][aã]o)\b/i,
  /\b(\d+\s+(ideias|eventos|shows|rol[eê]s))\b/i,
  /\b(eventos em|shows em|atra[cç][oõ]es em)\b/i,
  /\b(melhores eventos|pr[oó]ximos eventos)\b/i,
]

const EXPLICIT_YEAR_PATTERN = /\b(?:19|20)\d{2}\b/

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
  const value = new Date(Date.UTC(year, month - 1, day + days))
  return value.toISOString().slice(0, 10)
}

export function getDiscoveryWindow(periodDays: number) {
  const start = brazilToday()
  return {
    start,
    end: addDays(start, periodDays),
  }
}

function sourceInstructions(source: DiscoverySource) {
  switch (source) {
    case 'sympla':
      return 'Pesquise somente páginas individuais de eventos da Sympla. A URL precisa ser de sympla.com.br/evento/. Não use páginas de categoria, cidade, busca ou listagens.'
    case 'roleagora':
      return 'Pesquise somente páginas individuais de eventos do Rolê Agora. A URL precisa ser de roleagora.com.br/event/. Nunca use /city/, páginas de guia, artigos ou agendas.'
    case 'facebook':
      return 'Pesquise conteúdo público do Facebook que represente um único evento, como página de evento, post ou share público. Não use páginas genéricas, perfis ou agendas com vários eventos.'
    case 'reddit':
      return 'Pesquise posts públicos do Reddit que anunciem claramente um único evento presencial específico. Não use threads de agenda, listas ou recomendações gerais.'
    default:
      return 'Pesquise páginas públicas que representem um único evento presencial específico. Exclua guias, agendas, calendários, páginas de cidade, categorias, notícias e artigos que mencionem vários eventos.'
  }
}

function sourceMatches(source: DiscoverySource, value: string) {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    const path = url.pathname.toLowerCase()

    if (!['http:', 'https:'].includes(url.protocol)) return false

    if (source === 'sympla') {
      return (host === 'sympla.com.br' || host.endsWith('.sympla.com.br')) && path.startsWith('/evento/')
    }

    if (source === 'roleagora') {
      return (host === 'roleagora.com.br' || host.endsWith('.roleagora.com.br')) && path.startsWith('/event/')
    }

    if (source === 'facebook') {
      return host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.com' || host.endsWith('.fb.com')
    }

    if (source === 'reddit') {
      return host === 'reddit.com' || host.endsWith('.reddit.com')
    }

    return true
  } catch {
    return false
  }
}

function isLikelyListing(event: StructuredEvent, source: DiscoverySource) {
  const text = `${event.title} ${event.source_title} ${event.source_snippet}`

  try {
    const url = new URL(event.source_url)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    const path = url.pathname.toLowerCase()

    if ((host === 'roleagora.com.br' || host.endsWith('.roleagora.com.br')) && !path.startsWith('/event/')) {
      return true
    }

    if ((host === 'sympla.com.br' || host.endsWith('.sympla.com.br')) && !path.startsWith('/evento/')) {
      return true
    }
  } catch {
    return true
  }

  return SINGLE_EVENT_REJECTION_PATTERNS.some((pattern) => pattern.test(text))
}

function isInsideWindow(iso: string, start: string, end: string) {
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})T/)
  if (!match) return false

  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return false

  return match[1] >= start && match[1] <= end
}

function normalizeUrl(value: string) {
  try {
    const url = new URL(value)
    url.hash = ''

    ;[
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
    ].forEach((key) => url.searchParams.delete(key))

    return url.toString()
  } catch {
    return value
  }
}

function domainOf(value: string) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return 'desconhecido'
  }
}
function decodeHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function extractMeta(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = [
    new RegExp(`<meta[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${escaped}["'][^>]*>`, 'i'),
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return decodeHtml(match[1])
  }

  return ''
}
async function fetchExactPublicContext(value: string) {
  try {
    const response = await fetch(value, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'AondeTemBaileEventInspector/1.0',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })

    const contentType = response.headers.get('content-type') || ''
    if (!response.ok || !contentType.includes('text/html')) {
      return `Acesso HTTP direto: status ${response.status}; conteúdo não disponível como HTML público.`
    }

    const html = (await response.text()).slice(0, 120000)
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const title = titleMatch?.[1] ? decodeHtml(titleMatch[1]) : ''
    const ogTitle = extractMeta(html, 'og:title')
    const ogDescription = extractMeta(html, 'og:description')
    const ogUrl = extractMeta(html, 'og:url')
    const visible = decodeHtml(html).slice(0, 1400)

    return [
      `URL final HTTP: ${response.url || value}`,
      title ? `Título HTML: ${title}` : '',
      ogTitle ? `og:title: ${ogTitle}` : '',
      ogDescription ? `og:description: ${ogDescription}` : '',
      ogUrl ? `og:url: ${ogUrl}` : '',
      visible ? `Texto público visível: ${visible}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  } catch (error) {
    return `Acesso HTTP direto falhou: ${error instanceof Error ? error.message : 'erro inesperado'}`
  }
}

const EVENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['events'],
  properties: {
    events: {
      type: 'array',
      maxItems: 16,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'is_single_event',
          'rejection_reason',
          'title',
          'description',
          'event_date',
          'location_name',
          'address',
          'city',
          'state',
          'category_name',
          'image_url',
          'ticket_price',
          'whatsapp_info',
          'source_url',
          'source_title',
          'source_snippet',
          'date_evidence',
          'confidence',
        ],
        properties: {
          is_single_event: { type: 'boolean' },
          rejection_reason: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          event_date: { type: 'string' },
          location_name: { type: 'string' },
          address: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          category_name: { type: 'string' },
          image_url: { type: 'string' },
          ticket_price: { type: 'string' },
          whatsapp_info: { type: 'string' },
          source_url: { type: 'string' },
          source_title: { type: 'string' },
          source_snippet: { type: 'string' },
          date_evidence: { type: 'string' },
          confidence: { type: 'integer', minimum: 0, maximum: 100 },
        },
      },
    },
  },
}

async function structureResearch(
  research: string,
  input: GroqDiscoveryInput,
  exactUrl?: string
) {
  const window = getDiscoveryWindow(input.periodDays)
  const exactUrlInstruction = exactUrl
    ? `A análise foi solicitada para esta URL exata: ${exactUrl}. Se a pesquisa mencionar uma URL equivalente/canônica, preserve a URL solicitada em source_url.`
    : ''

  return groqStructuredJson<StructuredEventsResponse>(
    [
      {
        role: 'system',
        content:
          'Você é um validador de eventos para um site brasileiro. Extraia apenas fatos presentes no material de pesquisa. Nunca invente ano, data, horário, local, preço, URL ou imagem. Uma página de guia/listagem/agenda NÃO é um evento único.',
      },
      {
        role: 'user',
        content: `Valide o material de pesquisa abaixo.

Janela permitida: ${window.start} até ${window.end}, inclusive.
Cidade esperada: ${input.city}${input.state ? ` - ${input.state}` : ''}.
Fonte: ${input.source}.
${sourceInstructions(input.source)}
${exactUrlInstruction}

Regras obrigatórias:
- is_single_event=true somente para UMA página/post que represente UM evento específico.
- event_date deve estar em ISO 8601 com data, hora e ano explicitamente comprovados pelo material. Se faltar ano OU horário, use string vazia.
- date_evidence deve copiar/resumir a evidência que contém o ano. Se não houver ano explícito, deixe vazio.
- eventos fora da janela devem ser marcados is_single_event=false.
- eventos encerrados/passados devem ser marcados is_single_event=false.
- guias, agendas, listagens, páginas de cidade/categoria e textos com vários eventos devem ser marcados is_single_event=false.
- source_url precisa ser uma URL real presente no material; não construa URLs.
- campos desconhecidos devem ser string vazia.
- confidence mede confiança nos dados do EVENTO ÚNICO, não apenas relevância da página.

MATERIAL DE PESQUISA:
${research.slice(0, 45000)}`,
      },
    ],
    'event_discovery_validation',
    EVENT_SCHEMA
  )
}

function toCandidate(
  event: StructuredEvent,
  source: DiscoverySource,
  start: string,
  end: string,
  research: string
): GroqEventCandidate | null {
  if (!event.is_single_event) return null
  if (!event.title.trim() || !event.source_url.trim()) return null
  if (!sourceMatches(source, event.source_url)) return null
  if (isLikelyListing(event, source)) return null
  if (!event.event_date || !isInsideWindow(event.event_date, start, end)) return null
  if (!event.date_evidence || !EXPLICIT_YEAR_PATTERN.test(event.date_evidence)) return null
  if (!event.city.trim()) return null

  const sourceUrl = normalizeUrl(event.source_url)
  const confidence = Math.max(0, Math.min(event.confidence, 100))

  return {
    title: event.title.trim().slice(0, 180),
    description: (event.description || event.source_snippet || 'Evento encontrado em fonte pública.')
      .trim()
      .slice(0, 1600),
    event_date: new Date(event.event_date).toISOString(),
    location_name: event.location_name.trim() || null,
    address: (event.address.trim() || [event.city, event.state].filter(Boolean).join(', ')).slice(0, 300),
    city: event.city.trim().slice(0, 100),
    state: event.state.trim().toUpperCase().slice(0, 30) || null,
    category_name: event.category_name.trim().slice(0, 120) || null,
    image_url: event.image_url.trim() || null,
    ticket_price: event.ticket_price.trim().slice(0, 80) || null,
    whatsapp_info: event.whatsapp_info.replace(/\D/g, '').slice(0, 13) || null,
    source_url: sourceUrl,
    source_domain: domainOf(sourceUrl),
    source_type: source,
    source_title: (event.source_title || event.title).trim().slice(0, 220),
    source_snippet: (event.source_snippet || event.description).trim().slice(0, 1200),
    confidence,
    raw_data: {
      discovery_engine: 'groq',
      groq_model: 'openai/gpt-oss-20b',
      validation: {
        is_single_event: true,
        date_evidence: event.date_evidence,
        rejection_reason: event.rejection_reason,
        window_start: start,
        window_end: end,
      },
      research_excerpt: research.slice(0, 5000),
    },
  }
}

export async function discoverSourceWithGroq(input: GroqDiscoveryInput) {
  const window = getDiscoveryWindow(input.periodDays)

  const research = await groqBrowserResearch([
    {
      role: 'system',
      content:
        'Você pesquisa eventos públicos na web. Seja conservador: qualidade é mais importante que quantidade. Não transforme páginas de guia/listagem em eventos.',
    },
    {
      role: 'user',
      content: `Hoje, no fuso America/Sao_Paulo, considere a janela de ${window.start} até ${window.end}.

Encontre no máximo 12 eventos presenciais futuros em ${input.city}${input.state ? ` - ${input.state}` : ''}.
Interesses: bailes, festas, shows, forró, sertanejo, pagode, samba, rock, música eletrônica, festivais e eventos com dança.

${sourceInstructions(input.source)}

Requisitos:
1. Somente eventos cuja data esteja dentro da janela ${window.start} a ${window.end}.
2. A fonte precisa mostrar explicitamente o ANO e o HORÁRIO. Nunca deduza o ano.
3. Exclua eventos encerrados ou páginas antigas.
4. Exclua páginas de guia, cidade, categoria, agenda, calendário ou artigos que listem vários eventos.
5. Para cada resultado, inclua no texto final: título, data/hora com ano, local, cidade/UF, URL canônica completa e um trecho/evidência da fonte.
6. Se não houver eventos confiáveis, diga que não encontrou. Não preencha lacunas por suposição.`,
    },
  ])

  const structured = await structureResearch(research, input)
  const seen = new Set<string>()
  const events: GroqEventCandidate[] = []

  for (const event of structured.events) {
    const candidate = toCandidate(event, input.source, window.start, window.end, research)
    if (!candidate || seen.has(candidate.source_url)) continue
    seen.add(candidate.source_url)
    events.push(candidate)
  }

  return {
    events,
    searched: structured.events.length,
    research,
  }
}

export async function inspectEventUrlWithGroq(
  input: GroqDiscoveryInput & { url: string }
) {
  const window = getDiscoveryWindow(input.periodDays)

  if (!sourceMatches(input.source, input.url)) {
    throw new Error('A URL não corresponde à fonte selecionada ou ao formato de página de evento esperado.')
  }

  const directContext = await fetchExactPublicContext(input.url)

  const research = await groqBrowserResearch([
    {
      role: 'system',
      content:
        'Você verifica URLs públicas de eventos. Use pesquisa/browsing e nunca invente dados que não estejam disponíveis publicamente.',
    },
    {
      role: 'user',
      content: `Investigue esta URL pública exata:
${input.url}

Contexto esperado: ${input.city}${input.state ? ` - ${input.state}` : ''}.
Janela permitida: ${window.start} até ${window.end}.
Fonte: ${input.source}.

Foi feita também uma tentativa HTTP pública, sem login, cookies ou bypass:
--- CONTEXTO HTTP DIRETO ---
${directContext}
--- FIM DO CONTEXTO HTTP ---

Use browser search para corroborar ou localizar a página/versão canônica.
Determine se representa UM evento específico.
Informe no texto final o URL, título, data e horário COM ANO explícito, local, cidade/UF e evidências.
Se a página estiver bloqueada, indisponível ou não houver dados suficientes, diga isso claramente.
Nunca deduza ano/data a partir da janela solicitada.`,
    },
  ])

  const structured = await structureResearch(research, input, input.url)
  const candidates = structured.events
    .map((event) => {
      const withRequestedUrl =
        event.is_single_event && sourceMatches(input.source, input.url)
          ? { ...event, source_url: input.url }
          : event

      return toCandidate(withRequestedUrl, input.source, window.start, window.end, research)
    })
    .filter((candidate): candidate is GroqEventCandidate => Boolean(candidate))

  return {
    candidate: candidates[0] ?? null,
    research,
  }
}


export interface GroqConsolidatedDiscoveryInput {
  city: string
  state?: string
  periodDays: number
  sources: DiscoverySource[]
}

interface GroqCompoundUrlInput {
  city: string
  state?: string
  periodDays: number
  source: 'facebook' | 'sympla' | 'roleagora'
  url: string
}

function compoundSourceFromUrl(value: string): DiscoverySource {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')

    if (host === 'sympla.com.br' || host.endsWith('.sympla.com.br')) return 'sympla'
    if (host === 'roleagora.com.br' || host.endsWith('.roleagora.com.br')) return 'roleagora'

    if (
      host === 'facebook.com' ||
      host.endsWith('.facebook.com') ||
      host === 'fb.com' ||
      host.endsWith('.fb.com')
    ) {
      return 'facebook'
    }

    if (host === 'reddit.com' || host.endsWith('.reddit.com')) return 'reddit'
    return 'web'
  } catch {
    return 'web'
  }
}

function compoundNormalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function compoundCityMatches(actual: string, expected: string) {
  const actualCity = compoundNormalizeText(actual)
  const expectedCity = compoundNormalizeText(expected)

  return (
    actualCity === expectedCity ||
    actualCity.startsWith(expectedCity + ' ') ||
    expectedCity.startsWith(actualCity + ' ')
  )
}

function normalizeCompoundEvent(value: unknown): StructuredEvent | null {
  if (!value || typeof value !== 'object') return null

  const event = value as Record<string, unknown>
  const stringValue = (key: string) =>
    typeof event[key] === 'string' ? (event[key] as string) : ''

  return {
    is_single_event: event.is_single_event === true,
    rejection_reason: stringValue('rejection_reason'),
    title: stringValue('title'),
    description: stringValue('description'),
    event_date: stringValue('event_date'),
    location_name: stringValue('location_name'),
    address: stringValue('address'),
    city: stringValue('city'),
    state: stringValue('state'),
    category_name: stringValue('category_name'),
    image_url: stringValue('image_url'),
    ticket_price: stringValue('ticket_price'),
    whatsapp_info: stringValue('whatsapp_info'),
    source_url: stringValue('source_url'),
    source_title: stringValue('source_title'),
    source_snippet: stringValue('source_snippet'),
    date_evidence: stringValue('date_evidence'),
    confidence:
      typeof event.confidence === 'number' && Number.isFinite(event.confidence)
        ? event.confidence
        : 50,
  }
}

function compoundEvents(value: unknown) {
  if (!value || typeof value !== 'object') return [] as StructuredEvent[]

  const events = (value as Record<string, unknown>).events
  if (!Array.isArray(events)) return [] as StructuredEvent[]

  return events
    .slice(0, 10)
    .map(normalizeCompoundEvent)
    .filter((event): event is StructuredEvent => Boolean(event))
}

function compoundSourceRules(sources: DiscoverySource[]) {
  return sources
    .map((source) => '- ' + source + ': ' + sourceInstructions(source))
    .join('\n')
}

function compoundJsonShape() {
  return [
    'Retorne SOMENTE JSON válido no formato:',
    '{"events":[{"is_single_event":true,"rejection_reason":"","title":"","description":"","event_date":"YYYY-MM-DDTHH:mm:ss-03:00","location_name":"","address":"","city":"","state":"","category_name":"","image_url":"","ticket_price":"","whatsapp_info":"","source_url":"https://...","source_title":"","source_snippet":"","date_evidence":"trecho com ano e horário","confidence":0}]}',
    'Campos desconhecidos devem ser string vazia. Não escreva texto fora do JSON.',
  ].join('\n')
}

function compoundCandidate(
  event: StructuredEvent,
  allowedSources: DiscoverySource[],
  city: string,
  state: string | undefined,
  start: string,
  end: string
) {
  const source = compoundSourceFromUrl(event.source_url)

  if (!allowedSources.includes(source)) return null
  if (!compoundCityMatches(event.city, city)) return null

  const eventState = event.state.trim().toUpperCase()
  if (state && eventState && eventState !== state.toUpperCase()) return null

  const candidate = toCandidate(event, source, start, end, '')
  if (!candidate) return null

  return {
    ...candidate,
    raw_data: {
      discovery_engine: 'groq-compound',
      groq_model: GROQ_DISCOVERY_MODEL,
      validation: {
        is_single_event: true,
        date_evidence: event.date_evidence,
        window_start: start,
        window_end: end,
        source_type_inferred: source,
      },
    },
  } satisfies GroqEventCandidate
}

export async function discoverEventsWithGroq(input: GroqConsolidatedDiscoveryInput) {
  const window = getDiscoveryWindow(input.periodDays)
  const sources = Array.from(new Set(input.sources))

  const prompt = [
    'Você é o motor de descoberta do Aonde Tem Baile.',
    '',
    'Faça UMA pesquisa web atual para encontrar no máximo 8 eventos presenciais futuros em ' +
      input.city +
      (input.state ? ' - ' + input.state : '') +
      '.',
    'Janela obrigatória: ' + window.start + ' até ' + window.end + ', inclusive.',
    'Fontes habilitadas: ' + sources.join(', ') + '.',
    '',
    'Regras por fonte:',
    compoundSourceRules(sources),
    '',
    'Tipos desejados: bailes, festas, shows, forró, sertanejo, pagode, samba, rock, música eletrônica, festivais e eventos com dança.',
    '',
    'REGRAS OBRIGATÓRIAS:',
    '1. Cada item deve representar UM único evento específico.',
    '2. Exclua guias, agendas, calendários, páginas de cidade/categoria, matérias, listas e páginas com vários eventos.',
    '3. Exclua eventos passados, encerrados ou fora da janela.',
    '4. A fonte precisa comprovar explicitamente ANO e HORÁRIO. Nunca deduza o ano usando a janela.',
    '5. source_url precisa ser uma URL real encontrada na pesquisa.',
    '6. A cidade precisa corresponder à cidade solicitada.',
    '7. Não retorne fontes que não estejam habilitadas.',
    '8. Qualidade é mais importante que quantidade. Pode retornar zero eventos.',
    '',
    compoundJsonShape(),
  ].join('\n')

  const compactPrompt = [
    'Encontre até 6 eventos presenciais em ' + input.city + (input.state ? ' - ' + input.state : '') + '.',
    'Período: ' + window.start + ' a ' + window.end + '.',
    'Fontes permitidas: ' + sources.join(', ') + '.',
    'Somente evento único com URL real, ano e horário explícitos. Exclua guias, agendas, listas e eventos passados.',
    'Sympla: apenas /evento/. Rolê Agora: apenas /event/.',
    compoundJsonShape(),
  ].join('\n')

  const response = await groqCompoundJson<StructuredEventsResponse>(prompt, {
    enabledTools: ['web_search'],
    maxCompletionTokens: 2200,
    fallbackPrompt: compactPrompt,
  })

  const rawEvents = compoundEvents(response)
  const seen = new Set<string>()
  const events: GroqEventCandidate[] = []

  for (const event of rawEvents) {
    const candidate = compoundCandidate(
      event,
      sources,
      input.city,
      input.state,
      window.start,
      window.end
    )

    if (!candidate || seen.has(candidate.source_url)) continue
    seen.add(candidate.source_url)
    events.push(candidate)
  }

  return {
    events,
    searched: rawEvents.length,
  }
}

export async function inspectEventUrlWithGroqCompound(input: GroqCompoundUrlInput) {
  const window = getDiscoveryWindow(input.periodDays)

  if (!sourceMatches(input.source, input.url)) {
    throw new Error('A URL não corresponde à fonte selecionada ou ao formato esperado.')
  }

  const directContext = (await fetchExactPublicContext(input.url)).slice(0, 1800)

  const prompt = [
    'Você está validando uma URL pública informada manualmente para o Aonde Tem Baile.',
    '',
    'URL exata: ' + input.url,
    'Fonte: ' + input.source,
    'Cidade esperada: ' + input.city + (input.state ? ' - ' + input.state : ''),
    'Janela obrigatória: ' + window.start + ' até ' + window.end + '.',
    '',
    'Contexto obtido por acesso HTTP público, sem login, cookies ou bypass:',
    '--- INÍCIO ---',
    directContext,
    '--- FIM ---',
    '',
    'Use pesquisa web ou visita ao site para corroborar quando necessário.',
    'Retorne o evento somente se a URL representar UM evento específico.',
    'ANO e HORÁRIO precisam estar explicitamente comprovados. Nunca deduza o ano.',
    'Sympla deve ser /evento/. Rolê Agora deve ser /event/. Facebook pode ser /events/, post ou /share/ público.',
    'Se o conteúdo estiver bloqueado e não houver evidência pública suficiente, retorne events vazio.',
    'Quando o evento for comprovado, use a URL fornecida acima em source_url.',
    'Nunca invente título, data, local, imagem ou preço.',
    '',
    compoundJsonShape(),
  ].join('\n')

  const compactPrompt = [
    'Valide esta URL de evento: ' + input.url,
    'Fonte: ' + input.source + '. Cidade: ' + input.city + (input.state ? ' - ' + input.state : '') + '.',
    'Período: ' + window.start + ' a ' + window.end + '.',
    'Retorne events vazio se não houver prova pública de UM evento futuro com ano e horário explícitos.',
    'Use a URL informada em source_url.',
    compoundJsonShape(),
  ].join('\n')

  const response = await groqCompoundJson<StructuredEventsResponse>(prompt, {
    enabledTools: ['web_search'],
    maxCompletionTokens: 1200,
    fallbackPrompt: compactPrompt,
  })

  for (const event of compoundEvents(response)) {
    const candidate = compoundCandidate(
      { ...event, source_url: input.url },
      [input.source],
      input.city,
      input.state,
      window.start,
      window.end
    )

    if (candidate) return { candidate }
  }

  return { candidate: null }
}
