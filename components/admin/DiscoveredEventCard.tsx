'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Globe2,
  MapPin,
  Save,
  XCircle,
} from 'lucide-react'
import type {
  EventDiscoveryCandidate,
  UpdateDiscoveryCandidateInput,
} from '@/types/event-discovery'
import styles from './DiscoveredEventCard.module.css'

interface DiscoveredEventCardProps {
  candidate: EventDiscoveryCandidate
  busy?: boolean
  onSave: (candidateId: string, updates: UpdateDiscoveryCandidateInput) => Promise<boolean>
  onApprove: (candidateId: string) => Promise<void>
  onReject: (candidateId: string) => Promise<void>
}

function toDateTimeLocal(value: string | null) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (number: number) => String(number).padStart(2, '0')

  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
  ].join('')
}

function toIso(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function createDraft(candidate: EventDiscoveryCandidate) {
  return {
    title: candidate.title ?? '',
    description: candidate.description ?? '',
    event_date: toDateTimeLocal(candidate.event_date),
    event_end_date: toDateTimeLocal(candidate.event_end_date),
    location_name: candidate.location_name ?? '',
    address: candidate.address ?? '',
    city: candidate.city ?? '',
    state: candidate.state ?? '',
    category_name: candidate.category_name ?? '',
    image_url: candidate.image_url ?? '',
    ticket_price: candidate.ticket_price ?? '',
    whatsapp_info: candidate.whatsapp_info ?? '',
  }
}

export default function DiscoveredEventCard({
  candidate,
  busy = false,
  onSave,
  onApprove,
  onReject,
}: DiscoveredEventCardProps) {
  const [draft, setDraft] = useState(() => createDraft(candidate))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(createDraft(candidate))
  }, [candidate])

  const persistedDraft = useMemo(() => createDraft(candidate), [candidate])
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(persistedDraft)
  const endBeforeStart = Boolean(
    draft.event_date &&
      draft.event_end_date &&
      new Date(draft.event_end_date).getTime() < new Date(draft.event_date).getTime()
  )
  const canApprove = Boolean(
    draft.title.trim() && draft.city.trim() && draft.event_date && !endBeforeStart
  )

  const patch: UpdateDiscoveryCandidateInput = {
    title: draft.title,
    description: draft.description || null,
    event_date: toIso(draft.event_date),
    event_end_date: toIso(draft.event_end_date),
    location_name: draft.location_name || null,
    address: draft.address || null,
    city: draft.city,
    state: draft.state || null,
    category_name: draft.category_name || null,
    image_url: draft.image_url || null,
    ticket_price: draft.ticket_price || null,
    whatsapp_info: draft.whatsapp_info || null,
  }

  const handleSave = async () => {
    setSaving(true)
    const ok = await onSave(candidate.id, patch)
    setSaving(false)
    return ok
  }

  const handleApprove = async () => {
    if (!canApprove) return

    if (hasChanges) {
      const saved = await handleSave()
      if (!saved) return
    }

    await onApprove(candidate.id)
  }

  const confidenceLabel =
    candidate.confidence >= 75 ? 'Alta confiança' : candidate.confidence >= 50 ? 'Confiança média' : 'Revisar dados'

  return (
    <article className={styles.card}>
      <div
        className={styles.image}
        style={draft.image_url ? { backgroundImage: `url("${draft.image_url.replace(/"/g, '%22')}")` } : undefined}
      >
        {!draft.image_url && <Globe2 size={28} />}
        <div className={styles.imageOverlay} />
        <div className={styles.badges}>
          <span className={styles.sourceBadge}>
            {candidate.source_type === 'reddit'
              ? 'Reddit'
              : candidate.source_type === 'facebook'
                ? 'Facebook'
                : candidate.source_type === 'sympla'
                  ? 'Sympla'
                  : candidate.source_type === 'roleagora'
                    ? 'Rolê Agora'
                    : 'Web'}
          </span>
          <span className={styles.confidenceBadge}>
            {candidate.confidence}% · {confidenceLabel}
          </span>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.sourceRow}>
          <div>
            <div className={styles.sourceDomain}>{candidate.source_domain || 'Fonte pública'}</div>
            <div className={styles.foundAt}>
              Encontrado em {new Date(candidate.found_at).toLocaleDateString('pt-BR')}
            </div>
          </div>

          <a
            href={candidate.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.sourceLink}
          >
            <ExternalLink size={14} />
            Ver fonte
          </a>
        </div>

        {candidate.source_snippet && (
          <p className={styles.snippet}>{candidate.source_snippet}</p>
        )}

        <div className={styles.formGrid}>
          <label className={`${styles.field} ${styles.full}`}>
            <span>Título *</span>
            <input
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              disabled={busy}
            />
          </label>

          <label className={styles.field}>
            <span>
              <CalendarClock size={13} />
              Início *
            </span>
            <input
              type="datetime-local"
              value={draft.event_date}
              onChange={(event) => setDraft({ ...draft, event_date: event.target.value })}
              disabled={busy}
            />
          </label>

          <label className={styles.field}>
            <span>
              <CalendarClock size={13} />
              Término (opcional)
            </span>
            <input
              type="datetime-local"
              min={draft.event_date || undefined}
              value={draft.event_end_date}
              onChange={(event) => setDraft({ ...draft, event_end_date: event.target.value })}
              disabled={busy}
            />
          </label>

          <label className={styles.field}>
            <span>Categoria</span>
            <input
              value={draft.category_name}
              placeholder="Ex: Sertanejo"
              onChange={(event) => setDraft({ ...draft, category_name: event.target.value })}
              disabled={busy}
            />
          </label>

          <label className={styles.field}>
            <span>
              <MapPin size={13} />
              Cidade *
            </span>
            <input
              value={draft.city}
              onChange={(event) => setDraft({ ...draft, city: event.target.value })}
              disabled={busy}
            />
          </label>

          <label className={styles.field}>
            <span>UF</span>
            <input
              value={draft.state}
              maxLength={2}
              placeholder="RS"
              onChange={(event) => setDraft({ ...draft, state: event.target.value.toUpperCase() })}
              disabled={busy}
            />
          </label>

          <label className={styles.field}>
            <span>Local</span>
            <input
              value={draft.location_name}
              placeholder="Nome do local"
              onChange={(event) => setDraft({ ...draft, location_name: event.target.value })}
              disabled={busy}
            />
          </label>

          <label className={styles.field}>
            <span>Ingresso</span>
            <input
              value={draft.ticket_price}
              placeholder="Consultar"
              onChange={(event) => setDraft({ ...draft, ticket_price: event.target.value })}
              disabled={busy}
            />
          </label>

          <label className={`${styles.field} ${styles.full}`}>
            <span>Endereço</span>
            <input
              value={draft.address}
              onChange={(event) => setDraft({ ...draft, address: event.target.value })}
              disabled={busy}
            />
          </label>

          <label className={styles.field}>
            <span>WhatsApp</span>
            <input
              value={draft.whatsapp_info}
              inputMode="tel"
              placeholder="Opcional"
              onChange={(event) => setDraft({ ...draft, whatsapp_info: event.target.value })}
              disabled={busy}
            />
          </label>

          <label className={styles.field}>
            <span>Imagem</span>
            <input
              value={draft.image_url}
              placeholder="URL da imagem"
              onChange={(event) => setDraft({ ...draft, image_url: event.target.value })}
              disabled={busy}
            />
          </label>

          <label className={`${styles.field} ${styles.full}`}>
            <span>Descrição</span>
            <textarea
              value={draft.description}
              rows={4}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              disabled={busy}
            />
          </label>
        </div>

        {!canApprove && (
          <div className={styles.warning}>
            {endBeforeStart
              ? 'A data final precisa ser igual ou posterior à data inicial.'
              : 'Preencha título, cidade e data/hora de início antes de aprovar.'}
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className="btn-outline"
            onClick={handleSave}
            disabled={busy || saving || !hasChanges}
          >
            <Save size={15} />
            <span>{saving ? 'Salvando...' : 'Salvar ajustes'}</span>
          </button>

          <button
            type="button"
            className="btn-success"
            onClick={handleApprove}
            disabled={busy || saving || !canApprove}
          >
            <CheckCircle2 size={15} />
            <span>Aprovar e publicar</span>
          </button>

          <button
            type="button"
            className="btn-danger"
            onClick={() => onReject(candidate.id)}
            disabled={busy || saving}
          >
            <XCircle size={15} />
            <span>Recusar</span>
          </button>
        </div>
      </div>
    </article>
  )
}
