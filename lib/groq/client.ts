const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
export const GROQ_DISCOVERY_MODEL = 'groq/compound-mini'

interface GroqChatResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  error?: {
    message?: string
  }
}

type GroqMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface CompoundJsonOptions {
  enabledTools?: Array<'web_search' | 'visit_website'>
  maxCompletionTokens?: number
}

function getGroqApiKey() {
  return process.env.API_GROQ_KEY || process.env.GROQ_API_KEY || ''
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function friendlyGroqError(status: number, message: string, retryAfter: string | null) {
  if (status === 429) {
    const seconds = retryAfter ? Math.ceil(Number(retryAfter)) : null
    const waitText =
      seconds && Number.isFinite(seconds)
        ? ` Aguarde cerca de ${seconds}s e tente novamente.`
        : ' Aguarde alguns segundos e tente novamente.'

    return new Error(`A Groq atingiu o limite temporário de uso.${waitText}`)
  }

  if (status === 401 || status === 403) {
    return new Error('A Groq recusou a API key. Confira API_GROQ_KEY no ambiente do servidor.')
  }

  if (status === 400) {
    console.error('Groq request rejected:', message)
    return new Error('A Groq recusou a configuração da pesquisa. Tente novamente em instantes.')
  }

  return new Error(`Não foi possível consultar a Groq (HTTP ${status}).`)
}

async function callGroq(body: Record<string, unknown>, retry = true) {
  const apiKey = getGroqApiKey()

  if (!apiKey) {
    throw new Error('API_GROQ_KEY não está configurada no ambiente do servidor.')
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Groq-Model-Version': 'latest',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(50000),
  })

  const data = (await response.json().catch(() => null)) as GroqChatResponse | null

  if (!response.ok) {
    const message = data?.error?.message || `HTTP ${response.status}`
    const retryAfter = response.headers.get('retry-after')

    if (response.status === 429 && retry && retryAfter) {
      const seconds = Number(retryAfter)

      if (Number.isFinite(seconds) && seconds > 0 && seconds <= 10) {
        await sleep(Math.ceil(seconds * 1000) + 250)
        return callGroq(body, false)
      }
    }

    console.error('Groq API error:', response.status, message)
    throw friendlyGroqError(response.status, message, retryAfter)
  }

  const content = data?.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('A Groq retornou uma resposta vazia.')
  }

  return content
}

export async function groqCompoundJson<T>(
  prompt: string,
  options: CompoundJsonOptions = {}
): Promise<T> {
  const content = await callGroq({
    model: GROQ_DISCOVERY_MODEL,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    compound_custom: {
      tools: {
        enabled_tools: options.enabledTools ?? ['web_search'],
      },
    },
    response_format: {
      type: 'json_object',
    },
    temperature: 0.1,
    max_completion_tokens: options.maxCompletionTokens ?? 4500,
  })

  try {
    return JSON.parse(content) as T
  } catch (error) {
    console.error('Invalid Groq Compound JSON:', error, content.slice(0, 1000))
    throw new Error('A Groq retornou uma resposta inválida. Tente novamente.')
  }
}


export async function groqBrowserResearch(messages: GroqMessage[]) {
  return callGroq({
    model: GROQ_DISCOVERY_MODEL,
    messages,
    compound_custom: {
      tools: {
        enabled_tools: ['web_search'],
      },
    },
    max_completion_tokens: 3500,
  })
}

export async function groqStructuredJson<T>(
  messages: GroqMessage[],
  _name: string,
  _schema: Record<string, unknown>
): Promise<T> {
  const prompt = messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n\n')

  return groqCompoundJson<T>(prompt, {
    enabledTools: ['web_search'],
    maxCompletionTokens: 3500,
  })
}
