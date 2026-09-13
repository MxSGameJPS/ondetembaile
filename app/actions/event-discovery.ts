'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/admin'
import { searchBraveWeb, type BraveWebResult } from '@/lib/brave/client'
import {
  normalizeBraveResult,
  normalizeSourceUrl,
  type NormalizedDiscoveredEvent,
} from '@/lib/event-discovery/extract'
import type {
  DiscoverEventsInput,
  DiscoverySource,
  EventDiscoveryCandidate,
  UpdateDiscoveryCandidateInput,
} from '@/types/event-discovery'

function cleanText(value: string | undefined | null, maxLength: number) {
  if (!value) return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function normalizePeriodDays(value: number) {
  if (![14, 30, 60, 90].includes(value)) return 30
  return value
}

function buildPeriodLabel(days: number) {
  const start = new Date()
  const end = new Date(Date.now() + days * 86400000)
  const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })

  const startLabel = formatter.format(start)
  const endLabel = formatter.format(end)

  return startLabel === endLabel ? startLabel : `${startLabel} ${endLabel}`
}

function buildSearchQuery(source: DiscoverySource, city: string, state: string, periodDays: number) {
  const location = `"${city}"${state ? ` "${state}"` : ''}`
  const period = buildPeriodLabel(periodDays)
  const terms = '("baile" OR "festa" OR "show" OR "festival" OR "evento" OR "forró" OR "sertanejo")'

  if (source === 'reddit') {
    return `site:reddit.com ${terms} ${location} ${period}`
  }

  return `${terms} ${location} ${period}`
}

function databaseSetupMessage(error?: { code?: string; message?: string } | null) {
  if (error?.code === '42P01' || String(error?.message ?? '').includes('event_candidates')) {
    return 'A estrutura de descoberta ainda não foi aplicada no Supabase. Execute o arquivo supabase/event_discovery_setup.sql no projeto antes de usar esta aba.'
  }

  return error?.message || 'Erro ao acessar a fila de eventos encontrados.'
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
    .limit(60)

  if (error) {
    return { success: false as const, error: databaseSetupMessage(error) }
  }

  return {
    success: true as const,
    candidates: (data ?? []) as EventDiscoveryCandidate[],
  }
}

export async function discoverEventsAction(input: DiscoverEventsInput) {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false as const, error: auth.error }

  if (!process.env.BRAVE_API_KEY) {
    return {
      success: false as const,
      error: 'BRAVE_API_KEY não está configurada no ambiente do servidor.',
    }
  }

  const city = cleanText(input.city, 100)
  const state = cleanText(input.state, 30).toUpperCase()
  const periodDays = normalizePeriodDays(Number(input.periodDays))
  const sources = Array.from(new Set(input.sources)).filter(
    (source): source is DiscoverySource => source === 'web' || source === 'reddit'
  )

  if (!city) {
    return { success: false as const, error: 'Informe uma cidade para iniciar a busca.' }
  }

  if (sources.length === 0) {
    return { success: false as const, error: 'Selecione ao menos uma fonte de busca.' }
  }

  try {
    const sourceResults = await Promise.all(
      sources.map(async (source) => {
        const query = buildSearchQuery(source, city, state, periodDays)
        const results = await searchBraveWeb(query, source === 'reddit' ? 12 : 18)
        return results.map((result) => ({ result, source }))
      })
    )

    const uniqueResults: Array<{ result: BraveWebResult; source: DiscoverySource }> = []
    const seen = new Set<string>()

    for (const item of sourceResults.flat()) {
      const normalizedUrl = normalizeSourceUrl(item.result.url || '')
      if (!normalizedUrl || seen.has(normalizedUrl)) continue
      seen.add(normalizedUrl)
      uniqueResults.push(item)
    }

    const normalized = (
      await Promise.all(
        uniqueResults.map((item, index) =>
          normalizeBraveResult(
            item.result,
            {
              city,
              state: state || undefined,
              periodDays,
              sourceType: item.source,
            },
            index < 10
          )
        )
      )
    ).filter(
      (candidate): candidate is NormalizedDiscoveredEvent => candidate !== null
    )

    if (normalized.length > 0) {
      const { error: insertError } = await auth.supabase
        .from('event_candidates')
        .upsert(normalized, {
          onConflict: 'source_url',
          ignoreDuplicates: true,
        })

      if (insertError) {
        return { success: false as const, error: databaseSetupMessage(insertError) }
      }
    }

    let candidatesQuery = auth.supabase
      .from('event_candidates')
      .select('*')
      .eq('status', 'pending')
      .ilike('city', `%${city}%`)
      .order('confidence', { ascending: false })
      .order('found_at', { ascending: false })
      .limit(60)

    if (state) {
      candidatesQuery = candidatesQuery.ilike('state', `%${state}%`)
    }

    const { data: candidates, error: candidatesError } = await candidatesQuery

    if (candidatesError) {
      return { success: false as const, error: databaseSetupMessage(candidatesError) }
    }

    return {
      success: true as const,
      candidates: (candidates ?? []) as EventDiscoveryCandidate[],
      found: normalized.length,
      searched: uniqueResults.length,
    }
  } catch (error) {
    console.error('Erro ao descobrir eventos:', error)
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Erro inesperado ao consultar fontes públicas.',
    }
  }
}

export async function updateDiscoveryCandidateAction(
  candidateId: string,
  updates: UpdateDiscoveryCandidateInput
) {
  const auth = await requireAdmin()
  if (!auth.ok) return { success: false as const, error: auth.error }

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

  if (!candidate.title || !candidate.city || !candidate.event_date) {
    return {
      success: false as const,
      error: 'Preencha título, cidade e data do evento antes de aprovar.',
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
      facebook_url: null,
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
