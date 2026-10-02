export const BRAZIL_TIME_ZONE = 'America/Sao_Paulo'

// Brasília não tem horário de verão desde 2019, então o offset é fixo.
const BRAZIL_UTC_OFFSET = '-03:00'

const NAIVE_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/

/**
 * Converte o valor de um <input type="datetime-local"> (sem fuso) para ISO UTC,
 * interpretando-o como horário de Brasília. Valores que já têm fuso são apenas
 * normalizados. Retorna null para valores vazios ou inválidos.
 */
export function brazilLocalToIso(value?: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  const withZone = NAIVE_DATETIME.test(trimmed) ? `${trimmed}${BRAZIL_UTC_OFFSET}` : trimmed
  const date = new Date(withZone)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** Formata um ISO como valor de <input type="datetime-local"> no horário de Brasília. */
export function isoToBrazilLocal(isoStr?: string | null): string {
  if (!isoStr) return ''
  const date = new Date(isoStr)
  if (Number.isNaN(date.getTime())) return ''
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: BRAZIL_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  )
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}
