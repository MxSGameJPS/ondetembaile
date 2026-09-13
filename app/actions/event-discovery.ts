'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/admin'
import {
  discoverSourceWithGroq,
  getDiscoveryWindow,
  inspectEventUrlWithGroq,
  type GroqEventCandidate,
} from '@/lib/event-discovery/groq'
import type {
  DiscoverEventsInput,
  DiscoverySource,
  EventDiscoveryCandidate,
  ImportFacebookEventInput,
  ImportRoleAgoraEventInput,
  ImportSymplaEventInput,
  UpdateDiscoveryCandidateInput,
} from '@/types/event-discovery'

function cleanText(value: string | undefined | null, maxLength: number) {
  if (!value) return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function normalizePeriodDays(value: number) {
  if (![30, 60, 90].includes(value)) return 30
  return value
}

function databaseSetupMessage(error?: { code?: string; message?: string } | null) {
  const message = String(error?.message ?? '')

  if (
    error?.code === '42P01' ||
    message.includes('event_candidates') ||
    (error?.code === '23514' && message.includes('source_type'))
  ) {
    return 'A estrutura de descoberta precisa ser atualizada no Supabase. Execute a versão atual de supabase/event_discovery_setup.sql antes de usar esta fonte.'
  }

  return error?.message || 'Erro ao acessar a fila de eventos encontrados.'
}

function hasGroqKey() {
  return Boolean(process.env.API_GROQ_KEY || process.env.GROQ_API_KEY)
}

function normalizeSourceUrl(value: string) {
  try {
    const url = new URL(value)
    url.hash = ''
    return url.toString()
  } catch {
    return value
  }
}

function candidateDateMetadata(candidate: EventDiscoveryCandidate) {
  const rawData =
    candidate.raw_data && typeof candidate.raw_data === 'object'
      ? candidate.raw_data
      : {}
  const date =
    'date' in rawData && rawData.date && typeof rawData.date === 'object'
      ? (rawData.date as Record<string, unknown>)
      : {}

  return {
    engine:
      'discovery_engine' in rawData && typeof rawData.discovery_engine === 'string'
        ? rawData.discovery_engine
        : '',
    manuallyConfirmed: date.manual_confirmed === true,
  }
}

function sanitizeCandidateForReview(candidate: EventDiscoveryCandidate) {
  if (!candidate.event_date) return candidate

  const eventTime = new Date(candidate.event_date).getTime()
  if (!Number.isNaN(eventTime) && eventTime < Date.now() - 6 * 60 * 60 * 1000) {
    return { ...candidate, event_date: null, confidence: Math.min(candidate.confidence, 35) }
  }

  const metadata = candidateDateMetadata(candidate)
  if (
    candidate.source_type === 'sympla' &&
    metadata.engine !== 'groq' &&
    !metadata.manuallyConfirmed
  ) {
    const sourceText = `${candidate.source_title || ''} ${candidate.source_snippet || ''}`
    if (!/\b(?:19|20)\d{2}\b/.test(sourceText)) {
      return { ...candidate, event_date: null, confidence: Math.min(candidate.confidence, 45) }
    }
  }

  return candidate
}

function isLegacyListing(candidate: EventDiscoveryCandidate) {
  const text = `${candidate.title} ${candidate.source_title || ''} ${candidate.source_snippet || ''}`
  if (
    /\b(o que fazer|guia|agenda|calend[aá]rio|programa[cç][aã]o|eventos em|melhores eventos|pr[oó]ximos eventos)\b/i.test(
      text
    )
  ) {
    return true
  }

  try {
    const url = new URL(candidate.source_url)
    const host = url.hostname.replace(/^www\./, '').toLowerCase()
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

  return false
}

function prepareCandidates(candidates: EventDiscoveryCandidate[]) {
  return candidates
    .filter((candidate) => !isLegacyListing(candidate))
    .map(sanitizeCandidateForReview)
}

async function upsertCandidates(
  supabase: Awaited<ReturnType<typeof requireAdmin>> extends { supabase: infer T } ? T : never,
  candidates: GroqEventCandidate[]
) {
  if (candidates.length === 0) return null

  const { error } = await (supabase as any)
    .from('event_candidates')
    .upsert(candidates, {
      onConflict: 'source_url',
      ignoreDuplicates: false,
    })

  return error
}

export async function getDiscoveryCandidatesAction() {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false as const, error: auth.error }

  const { data, error } = await auth.supabase
    .from('event_candidates')
    .select('*')
    .eq('status', 'pending')
    .order('confidence', { ascending: false })
    .order('found_at', { ascending: false })
    .limit(80)

  if (error) {
    return { success: false as const, error: databaseSetupMessage(error) }
  }

  return {
    success: true as const,
    candidates: prepareCandidates((data ?? []) as EventDiscoveryCandidate[]),
  }
}

export async function discoverEventsAction(input: DiscoverEventsInput) {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false as const, error: auth.error }

  if (!hasGroqKey()) {
    return {
      success: false as const,
      error: 'API_GROQ_KEY não está configurada no ambiente do servidor.',
    }
  }

  const city = cleanText(input.city, 100)
  const state = cleanText(input.state, 30).toUpperCase()
  const periodDays = normalizePeriodDays(Number(input.periodDays))
  const sources = Array.from(new Set(input.sources)).filter(
    (source): source is DiscoverySource =>
      source === 'web' ||
      source === 'reddit' ||
      source === 'facebook' ||
      source === 'sympla' ||
      source === 'roleagora'
  )

  if (!city) {
    return { success: false as const, error: 'Informe uma cidade para iniciar a busca.' }
  }

  if (sources.length === 0) {
    return { success: false as const, error: 'Selecione ao menos uma fonte de busca.' }
  }

  const discovered: GroqEventCandidate[] = []
  const warnings: string[] = []
  let searched = 0

  for (const source of sources) {
    try {
      const result = await discoverSourceWithGroq({
        city,
        state: state || undefined,
        periodDays,
        source,
      })

      discovered.push(...result.events)
      searched += result.searched
    } catch (error) {
      console.error(`Erro na descoberta Groq para ${source}:`, error)
      warnings.push(
        `${source}: ${error instanceof Error ? error.message : 'falha inesperada'}`
      )
    }
  }

  const unique = new Map<string, GroqEventCandidate>()
  for (const candidate of discovered) {
    unique.set(normalizeSourceUrl(candidate.source_url), candidate)
  }
  const candidatesToSave = Array.from(unique.values())

  const insertError = await upsertCandidates(auth.supabase as any, candidatesToSave)
  if (insertError) {
    return { success: false as const, error: databaseSetupMessage(insertError) }
  }

  const window = getDiscoveryWindow(periodDays)
  const startIso = `${window.start}T00:00:00-03:00`
  const endIso = `${window.end}T23:59:59-03:00`

  let candidatesQuery = auth.supabase
    .from('event_candidates')
    .select('*')
    .eq('status', 'pending')
    .ilike('city', `%${city}%`)
    .gte('event_date', startIso)
    .lte('event_date', endIso)
    .order('event_date', { ascending: true })
    .limit(80)

  if (state) {
    candidatesQuery = candidatesQuery.ilike('state', `%${state}%`)
  }

  const { data: candidates, error: candidatesError } = await candidatesQuery

  if (candidatesError) {
    return { success: false as const, error: databaseSetupMessage(candidatesError) }
  }

  if (candidatesToSave.length === 0 && warnings.length === sources.length) {
    return {
      success: false as const,
      error: `Nenhuma fonte conseguiu concluir a busca com Groq. ${warnings.join(' | ')}`,
    }
  }

  return {
    success: true as const,
    candidates: prepareCandidates((candidates ?? []) as EventDiscoveryCandidate[]),
    found: candidatesToSave.length,
    searched,
    warnings,
    window,
  }
}

async function importUrlWithGroq(
  source: 'facebook' | 'sympla' | 'roleagora',
  input: ImportFacebookEventInput | ImportSymplaEventInput | ImportRoleAgoraEventInput
) {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false as const, error: auth.error }

  if (!hasGroqKey()) {
    return {
      success: false as const,
      error: 'API_GROQ_KEY não está configurada no ambiente do servidor.',
    }
  }

  const url = cleanText(input.url, 1500)
  const city = cleanText(input.city, 100)
  const state = cleanText(input.state, 30).toUpperCase()
  const periodDays = normalizePeriodDays(Number(input.periodDays))

  if (!url) {
    return { success: false as const, error: 'Informe uma URL para importar.' }
  }

  if (!city) {
    return {
      success: false as const,
      error: 'Informe a cidade para validar o evento dentro da janela escolhida.',
    }
  }

  try {
    const result = await inspectEventUrlWithGroq({
      url,
      city,
      state: state || undefined,
      periodDays,
      source,
    })

    if (!result.candidate) {
      return {
        success: false as const,
        error:
          'A Groq não conseguiu comprovar que esta URL representa um evento único dentro da janela selecionada. A página pode estar bloqueada, encerrada, fora do período ou sem data/horário/ano explícitos.',
      }
    }

    const insertError = await upsertCandidates(auth.supabase as any, [result.candidate])
    if (insertError) {
      return { success: false as const, error: databaseSetupMessage(insertError) }
    }

    const { data: matches, error: candidateError } = await auth.supabase
      .from('event_candidates')
      .select('*')
      .eq('source_url', result.candidate.source_url)
      .limit(1)

    if (candidateError || !matches?.[0]) {
      return {
        success: false as const,
        error: databaseSetupMessage(candidateError) || 'Não foi possível carregar o candidato importado.',
      }
    }

    const candidate = matches[0] as EventDiscoveryCandidate

    if (candidate.status === 'rejected') {
      return {
        success: false as const,
        error: 'Esta URL já foi recusada anteriormente e permanece bloqueada na fila.',
      }
    }

    if (candidate.status === 'approved') {
      return {
        success: false as const,
        error: 'Esta URL já foi aprovada e publicada anteriormente.',
      }
    }

    return {
      success: true as const,
      candidate: sanitizeCandidateForReview(candidate),
    }
  } catch (error) {
    console.error(`Erro ao importar URL de ${source} com Groq:`, error)
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : 'Erro inesperado ao analisar a URL com Groq.',
    }
  }
}

export async function importFacebookEventAction(input: ImportFacebookEventInput) {
  return importUrlWithGroq('facebook', input)
}

export async function importSymplaEventAction(input: ImportSymplaEventInput) {
  return importUrlWithGroq('sympla', input)
}

export async function importRoleAgoraEventAction(input: ImportRoleAgoraEventInput) {
  return importUrlWithGroq('roleagora', input)
}

export async function updateDiscoveryCandidateAction(
  candidateId: string,
  updates: UpdateDiscoveryCandidateInput
) {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false as const, error: auth.error }

  const { data: existingCandidate, error: existingError } = await auth.supabase
    .from('event_candidates')
    .select('source_type, raw_data')
    .eq('id', candidateId)
    .eq('status', 'pending')
    .single()

  if (existingError || !existingCandidate) {
    return {
      success: false as const,
      error: databaseSetupMessage(existingError) || 'Evento encontrado não está mais disponível.',
    }
  }

  const existingRawData =
    existingCandidate.raw_data && typeof existingCandidate.raw_data === 'object'
      ? existingCandidate.raw_data
      : {}
  const existingDateMeta =
    'date' in existingRawData &&
    existingRawData.date &&
    typeof existingRawData.date === 'object'
      ? (existingRawData.date as Record<string, unknown>)
      : {}

  const rawData =
    updates.event_date !== undefined
      ? {
          ...existingRawData,
          date: {
            ...existingDateMeta,
            manual_confirmed: Boolean(updates.event_date),
            manual_confirmed_at: updates.event_date ? new Date().toISOString() : null,
          },
        }
      : undefined

  const allowedUpdates = {
    title: updates.title !== undefined ? cleanText(updates.title, 180) : undefined,
    description: updates.description !== undefined ? cleanText(updates.description, 1600) || null : undefined,
    event_date: updates.event_date !== undefined ? updates.event_date || null : undefined,
    location_name:
      updates.location_name !== undefined ? cleanText(updates.location_name, 180) || null : undefined,
    address: updates.address !== undefined ? cleanText(updates.address, 300) || null : undefined,
    city: updates.city !== undefined ? cleanText(updates.city, 100) : undefined,
    state: updates.state !== undefined ? cleanText(updates.state, 30).toUpperCase() || null : undefined,
    category_name:
      updates.category_name !== undefined ? cleanText(updates.category_name, 120) || null : undefined,
    image_url: updates.image_url !== undefined ? cleanText(updates.image_url, 1000) || null : undefined,
    ticket_price:
      updates.ticket_price !== undefined ? cleanText(updates.ticket_price, 80) || null : undefined,
    whatsapp_info:
      updates.whatsapp_info !== undefined
        ? updates.whatsapp_info.replace(/\D/g, '').slice(0, 13) || null
        : undefined,
    raw_data: rawData,
    updated_at: new Date().toISOString(),
  }

  const payload = Object.fromEntries(
    Object.entries(allowedUpdates).filter(([, value]) => value !== undefined)
  )

  const { data, error } = await auth.supabase
    .from('event_candidates')
    .update(payload)
    .eq('id', candidateId)
    .eq('status', 'pending')
    .select('*')
    .single()

  if (error || !data) {
    return {
      success: false as const,
      error: databaseSetupMessage(error) || 'Evento encontrado não pôde ser atualizado.',
    }
  }

  return {
    success: true as const,
    candidate: data as EventDiscoveryCandidate,
  }
}

export async function approveDiscoveryCandidateAction(candidateId: string) {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false as const, error: auth.error }

  const { data: candidate, error: candidateError } = await auth.supabase
    .from('event_candidates')
    .select('*')
    .eq('id', candidateId)
    .eq('status', 'pending')
    .single()

  if (candidateError || !candidate) {
    return {
      success: false as const,
      error: databaseSetupMessage(candidateError) || 'Evento encontrado não está mais disponível.',
    }
  }

  const reviewCandidate = sanitizeCandidateForReview(candidate as EventDiscoveryCandidate)

  if (candidate.source_type === 'sympla' && candidate.event_date && !reviewCandidate.event_date) {
    return {
      success: false as const,
      error:
        'A data encontrada na Sympla não possui ano confirmado. Abra a fonte e informe manualmente a data correta antes de aprovar.',
    }
  }

  if (!candidate.title || !candidate.city || !candidate.event_date) {
    return {
      success: false as const,
      error: 'Preencha título, cidade e data do evento antes de aprovar.',
    }
  }

  const eventTime = new Date(candidate.event_date).getTime()
  if (Number.isNaN(eventTime) || eventTime < Date.now() - 6 * 60 * 60 * 1000) {
    return {
      success: false as const,
      error: 'A data do evento é inválida ou já passou. Revise a fonte antes de publicar.',
    }
  }

  let categoryId: string | null = null
  let categoryName: string | null = candidate.category_name || null

  if (candidate.category_name) {
    const safeCategorySearch = candidate.category_name.replace(/[%_]/g, '')
    const { data: matchingCategories } = await auth.supabase
      .from('categories')
      .select('id, name')
      .ilike('name', `%${safeCategorySearch}%`)
      .limit(1)

    if (matchingCategories?.[0]) {
      categoryId = matchingCategories[0].id
      categoryName = matchingCategories[0].name
    }
  }

  const { data: createdEvent, error: insertError } = await auth.supabase
    .from('events')
    .insert({
      producer_id: auth.user.id,
      category_id: categoryId,
      category_name: categoryName,
      title: candidate.title,
      description: candidate.description || 'Evento encontrado em fonte pública e revisado pela administração.',
      location_name: candidate.location_name || null,
      address: candidate.address || [candidate.city, candidate.state].filter(Boolean).join(', '),
      city: candidate.city,
      state: candidate.state || null,
      image_url: candidate.image_url || '/img_hero/image.png',
      event_date: candidate.event_date,
      ticket_price: candidate.ticket_price || 'Consultar',
      whatsapp_info: candidate.whatsapp_info || '',
      facebook_url: candidate.source_type === 'facebook' ? candidate.source_url : null,
      instagram_handle: null,
      origin: 'discovered',
      source_url: candidate.source_url,
      source_domain: candidate.source_domain,
      status: 'pending',
    })
    .select()
    .single()

  if (insertError || !createdEvent) {
    return {
      success: false as const,
      error: insertError?.message || 'Não foi possível criar o evento aprovado.',
    }
  }

  const { data: approvedEvent, error: approveError } = await auth.supabase
    .from('events')
    .update({
      status: 'approved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', createdEvent.id)
    .select()
    .single()

  if (approveError || !approvedEvent) {
    await auth.supabase.from('events').delete().eq('id', createdEvent.id)

    return {
      success: false as const,
      error: approveError?.message || 'O evento foi criado, mas não pôde ser aprovado.',
    }
  }

  const { error: candidateUpdateError } = await auth.supabase
    .from('event_candidates')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', candidateId)

  if (candidateUpdateError) {
    console.error('Evento publicado, mas candidato não foi marcado como aprovado:', candidateUpdateError)
  }

  revalidatePath('/admin/dashboard')
  revalidatePath('/')
  revalidatePath(`/evento/${approvedEvent.id}`)

  return {
    success: true as const,
    event: approvedEvent,
  }
}

export async function rejectDiscoveryCandidateAction(candidateId: string, reason?: string) {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false as const, error: auth.error }

  const { error } = await auth.supabase
    .from('event_candidates')
    .update({
      status: 'rejected',
      rejection_reason: cleanText(reason, 500) || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', candidateId)
    .eq('status', 'pending')

  if (error) {
    return { success: false as const, error: databaseSetupMessage(error) }
  }

  revalidatePath('/admin/dashboard')
  return { success: true as const }
}
