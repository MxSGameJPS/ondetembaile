const BRAVE_WEB_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search'

export interface BraveWebResult {
  title: string
  url: string
  description?: string
  age?: string
  page_age?: string
  extra_snippets?: string[]
  thumbnail?: {
    src?: string
    original?: string
  }
}

interface BraveSearchResponse {
  web?: {
    results?: BraveWebResult[]
  }
}

export async function searchBraveWeb(query: string, count = 15): Promise<BraveWebResult[]> {
  const apiKey = process.env.BRAVE_API_KEY

  if (!apiKey) {
    throw new Error('BRAVE_API_KEY não configurada no ambiente do servidor.')
  }

  const params = new URLSearchParams({
    q: query,
    country: 'BR',
    search_lang: 'pt-br',
    ui_lang: 'pt-BR',
    count: String(Math.min(Math.max(count, 1), 20)),
    safesearch: 'moderate',
    extra_snippets: 'true',
  })

  const response = await fetch(`${BRAVE_WEB_SEARCH_URL}?${params.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': apiKey,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    console.error('Brave Search API error:', response.status, body.slice(0, 500))
    throw new Error(`Erro ao consultar o Brave Search (HTTP ${response.status}).`)
  }

  const data = (await response.json()) as BraveSearchResponse
  return data.web?.results ?? []
}
