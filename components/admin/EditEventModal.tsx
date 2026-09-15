'use client'

import { useState, useEffect } from 'react'
import { EventItem } from '@/components/EventCard'
import { updateEventAction } from '@/app/actions/events'
import { X, Edit3, Save, MapPin, Calendar, Ticket, Tag, Image, Phone, Globe } from 'lucide-react'
import styles from './EditEventModal.module.css'

interface CategoryOption {
  id: string
  name: string
}

interface EditEventModalProps {
  event: EventItem | null
  categories: CategoryOption[]
  isOpen: boolean
  isAdminView?: boolean
  onClose: () => void
  onSaveSuccess: (updatedEvent: EventItem) => void
}

function toDatetimeLocal(isoStr?: string | null): string {
  if (!isoStr) return ''
  const date = new Date(isoStr)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function EditEventModal({
  event,
  categories,
  isOpen,
  isAdminView = true,
  onClose,
  onSaveSuccess,
}: EditEventModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    category_name: '',
    location_name: '',
    address: '',
    city: '',
    state: 'RS',
    event_date: '',
    event_end_date: '',
    ticket_price: '',
    whatsapp_info: '',
    facebook_url: '',
    instagram_handle: '',
    image_url: '',
    status: 'approved' as 'pending' | 'approved' | 'rejected',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        description: event.description || '',
        category_id: event.category_id || '',
        category_name: event.category_name || '',
        location_name: event.location_name || '',
        address: event.address || '',
        city: event.city || '',
        state: event.state || 'RS',
        event_date: toDatetimeLocal(event.event_date),
        event_end_date: toDatetimeLocal(event.event_end_date),
        ticket_price: event.ticket_price || '',
        whatsapp_info: event.whatsapp_info || '',
        facebook_url: event.facebook_url || '',
        instagram_handle: event.instagram_handle || '',
        image_url: event.image_url || '',
        status: (event.status as any) || 'approved',
      })
      setError(null)
    }
  }, [event])

  if (!isOpen || !event) return null

  const handleCategoryChange = (catId: string) => {
    const selectedCat = categories.find((c) => c.id === catId)
    setFormData({
      ...formData,
      category_id: catId,
      category_name: selectedCat ? selectedCat.name : '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await updateEventAction(event.id, {
      title: formData.title,
      description: formData.description,
      category_id: formData.category_id || undefined,
      category_name: formData.category_name || undefined,
      location_name: formData.location_name,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      event_date: new Date(formData.event_date).toISOString(),
      event_end_date: formData.event_end_date
        ? new Date(formData.event_end_date).toISOString()
        : undefined,
      ticket_price: formData.ticket_price,
      whatsapp_info: formData.whatsapp_info,
      facebook_url: formData.facebook_url,
      instagram_handle: formData.instagram_handle,
      image_url: formData.image_url,
      ...(isAdminView ? { status: formData.status } : {}),
    })

    setLoading(false)

    if (!res.success || !res.event) {
      setError(res.error || 'Erro ao atualizar o evento.')
      return
    }

    onSaveSuccess(res.event as EventItem)
    onClose()
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Edit3 size={20} color="#f26a00" />
            <span>Editar Evento <span>"{event.title}"</span></span>
          </div>

          <button onClick={onClose} className={styles.closeBtn} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div className={styles.body}>
            {error && <div className={styles.errorBox}>{error}</div>}

            {/* Title & Category */}
            <div className={styles.grid2}>
              <div className="form-group">
                <label className="form-label">Título do Evento *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Categoria do Evento *</label>
                <select
                  required
                  className="form-input"
                  value={formData.category_id}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  style={{ background: '#1e1e1e', color: '#ffffff', cursor: 'pointer' }}
                >
                  <option value="">Selecione uma Categoria...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Descrição Completa do Evento *</label>
              <textarea
                required
                rows={4}
                className="form-input"
                style={{ resize: 'vertical' }}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Dates */}
            <div className={styles.grid2}>
              <div className="form-group">
                <label className="form-label">Data e Hora de Início *</label>
                <input
                  type="datetime-local"
                  required
                  className="form-input"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Data e Hora de Término (Opcional)</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={formData.event_end_date}
                  onChange={(e) => setFormData({ ...formData, event_end_date: e.target.value })}
                />
              </div>
            </div>

            {/* Location Name & Ticket Price */}
            <div className={styles.grid2}>
              <div className="form-group">
                <label className="form-label">Nome do Local / Casa de Show</label>
                <input
                  type="text"
                  placeholder="Ex: CTG Estância da Tradição"
                  className="form-input"
                  value={formData.location_name}
                  onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Valor do Ingresso *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: R$ 35,00 ou Gratuito"
                  className="form-input"
                  value={formData.ticket_price}
                  onChange={(e) => setFormData({ ...formData, ticket_price: e.target.value })}
                />
              </div>
            </div>

            {/* Address, City, State */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Endereço Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Rua, Número - Bairro"
                  className="form-input"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cidade *</label>
                <input
                  type="text"
                  required
                  placeholder="Cidade"
                  className="form-input"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">UF *</label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  className="form-input"
                  style={{ textTransform: 'uppercase' }}
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            {/* Contact & Social Links */}
            <div className={styles.grid2}>
              <div className="form-group">
                <label className="form-label">WhatsApp para Informações *</label>
                <input
                  type="text"
                  required
                  placeholder="(51) 99999-8888"
                  className="form-input"
                  value={formData.whatsapp_info}
                  onChange={(e) => setFormData({ ...formData, whatsapp_info: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Instagram do Evento (Opcional)</label>
                <input
                  type="text"
                  placeholder="@osserranos"
                  className="form-input"
                  value={formData.instagram_handle}
                  onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.grid2}>
              <div className="form-group">
                <label className="form-label">URL da Imagem de Capa *</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  className="form-input"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                />
              </div>

              {isAdminView && (
                <div className="form-group">
                  <label className="form-label">Status do Evento (Moderação)</label>
                  <select
                    className="form-input"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    style={{ background: '#1e1e1e', color: '#f59e0b', fontWeight: 'bold' }}
                  >
                    <option value="approved">Aprovado (Publicado no site)</option>
                    <option value="pending">Pendente (Em análise)</option>
                    <option value="rejected">Recusado</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className={styles.footer}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '0.65rem 1.2rem' }}>
              Cancelar
            </button>
            
            <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '0.65rem 1.4rem' }}>
              <Save size={18} />
              <span>{loading ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
