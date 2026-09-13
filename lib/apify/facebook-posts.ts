const APIFY_API_BASE = 'https://api.apify.com/v2'
const FACEBOOK_POSTS_SEARCH_ACTOR = 'scraper_one~facebook-posts-search'

export const APIFY_FACEBOOK_RESULTS_PER_RUN = 20
export const APIFY_ESTIMATED_COST_PER_ITEM_USD = 0.004
export const APIFY_MONTHLY_INTERNAL_BUDGET_USD = 3.6
export const APIFY_RUN_MAX_CHARGE_USD = 0.1

export interface ApifyFacebookAttachment {
  type?: string
  url?: string
  id?: string
  accessibilityCaption?: string
}

export interface ApifyFacebookPost {
  url?: string
  postId?: string
  postText?: string
  timestamp?: number
  taggedLocationId?: string
  reactionsCount?: number
  commentsCount?: number
  author?: {
    id?: string
    name?: string
    profileUrl?: string
    profilePicture?: string
  }
  attachments?: ApifyFacebookAttachment[]
}

function apifyApiKey() {
  return process.env.API_KEY_APIFY || ''
}

function formatBrazilDate(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function dateDaysAgo(days: number) {
  return formatBrazilDate(new Date(Date.now() - days * 86400000))
}

export function getApifyFacebookConfig() {
  return {
    apiKeyConfigured: Boolean(apifyApiKey()),
    userIdConfigured: Boolean(process.env.APIFY_USER_ID),
    actorId: FACEBOOK_POSTS_SEARCH_ACTOR,
  }
}

export async function searchFacebookPostsWithApify(input: {
  city: string
  query?: string
  publicationLookbackDays?: number
}) {
  const token = apifyApiKey()

  if (!token) {
    throw new Error('API_KEY_APIFY não está configurada no ambiente do servidor.')
  }

  const query = (input.query || 'baile').trim().slice(0, 100)
  const lookbackDays = Math.min(Math.max(input.publicationLookbackDays ?? 30, 7), 60)
  const location = input.city.trim().slice(0, 20)

  const url = new URL(
    `${APIFY_API_BASE}/acts/${FACEBOOK_POSTS_SEARCH_ACTOR}/run-sync-get-dataset-items`
  )
  url.searchParams.set('maxItems', String(APIFY_FACEBOOK_RESULTS_PER_RUN))
  url.searchParams.set('maxTotalChargeUsd', String(APIFY_RUN_MAX_CHARGE_USD))
  url.searchParams.set('timeout', '120')
  url.searchParams.set('clean', 'true')

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query,
      resultsCount: APIFY_FACEBOOK_RESULTS_PER_RUN,
      searchType: 'latest',
      location,
      startDate: dateDaysAgo(lookbackDays),
      endDate: formatBrazilDate(new Date()),
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(150000),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error?: { message?: string } }).error?.message || '')
        : ''

    console.error('Apify Facebook search error:', response.status, message)
    throw new Error(
      response.status === 401 || response.status === 403
        ? 'A Apify recusou API_KEY_APIFY. Confira a chave no ambiente.'
        : response.status === 408
          ? 'A busca do Facebook na Apify demorou demais. Tente novamente.'
          : `Não foi possível consultar a Apify (HTTP ${response.status}).`
    )
  }

  if (!Array.isArray(payload)) {
    throw new Error('A Apify retornou um formato inesperado para a busca do Facebook.')
  }

  const posts = (payload as ApifyFacebookPost[]).slice(0, APIFY_FACEBOOK_RESULTS_PER_RUN)

  return {
    posts,
    query,
    resultItems: posts.length,
    estimatedCostUsd: Number(
      (posts.length * APIFY_ESTIMATED_COST_PER_ITEM_USD).toFixed(4)
    ),
  }
}
