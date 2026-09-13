const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
export const GROQ_DISCOVERY_MODEL = 'openai/gpt-oss-20b'

type GroqMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

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

function getGroqApiKey() {
  return process.env.API_GROQ_KEY || process.env.GROQ_API_KEY || ''
}

async function callGroq(body: Record<string, unknown>) {
  const apiKey = getGroqApiKey()

  if (!apiKey) {
    throw new Error('API_GROQ_KEY não está configurada no ambiente do servidor.')
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(45000),
  })

  const data = (await response.json().catch(() => null)) as GroqChatResponse | null

  if (!response.ok) {
    const message = data?.error?.message || `HTTP ${response.status}`
    console.error('Groq API error:', response.status, message)
    throw new Error(`Erro ao consultar a Groq: ${message}`)
  }

  const content = data?.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('A Groq retornou uma resposta vazia.')
  }

  return content
}

export async function groqBrowserResearch(messages: GroqMessage[]) {
  return callGroq({
    model: GROQ_DISCOVERY_MODEL,
    messages,
    tools: [{ type: 'browser_search' }],
    tool_choice: 'required',
    reasoning_effort: 'low',
    include_reasoning: false,
    max_completion_tokens: 6000,
  })
}

export async function groqStructuredJson<T>(
  messages: GroqMessage[],
  name: string,
  schema: Record<string, unknown>
): Promise<T> {
  const content = await callGroq({
    model: GROQ_DISCOVERY_MODEL,
    messages,
    reasoning_effort: 'low',
    include_reasoning: false,
    max_completion_tokens: 6000,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name,
        strict: true,
        schema,
      },
    },
  })

  try {
    return JSON.parse(content) as T
  } catch (error) {
    console.error('Invalid structured Groq response:', error, content.slice(0, 1000))
    throw new Error('A Groq retornou dados estruturados inválidos.')
  }
}
