'use client'

import { useState, useEffect } from 'react'
import { createEventAction } from '@/app/actions/events'
import { getCategoriesAction } from '@/app/actions/categories'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import EventMap from '@/components/EventMap'
import { PlusCircle, Upload, ArrowLeft, Image as ImageIcon, MapPin } from 'lucide-react'
import Link from 'next/link'
import styles from './page.module.css'

interface Category {
  id: string
  name: string
  slug: string
}

export default function NewEventPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location_name: '',
    address: '',
    city: '',
    state: 'RS',
    category_id: '',
    category_name: '',
    image_url: '',
    event_date: '',
    event_end_date: '',
    ticket_price: '',
    whatsapp_info: '',
    facebook_url: '',
    instagram_handle: '',
  })

  const [uploadingImage, setUploadingImage] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadCategories() {
      const res = await getCategoriesAction()
      if (res.success && res.data) {
        setCategories(res.data)
      }
    }
    loadCategories()
  }, [])

  // Handle direct file upload to Supabase storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setError(null)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      const filePath = `banners/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('event-banners')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        throw uploadError
      }

      const { data: publicUrlData } = supabase.storage
        .from('event-banners')
        .getPublicUrl(filePath)

      setFormData((prev) => ({ ...prev, image_url: publicUrlData.publicUrl }))
    } catch (err: any) {
      console.error('Erro no upload de imagem:', err)
      setError('Não foi possível fazer upload da imagem. Você pode colar o URL da imagem manualmente.')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const catId = e.target.value
    const catObj = categories.find((c) => c.id === catId)
    setFormData((prev) => ({
      ...prev,
      category_id: catId,
      category_name: catObj ? catObj.name : '',
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.image_url) {
      setError('Por favor, faça upload ou insira o URL de uma imagem para o banner do evento.')
      return
    }

    if (
      formData.event_end_date &&
      new Date(formData.event_end_date).getTime() < new Date(formData.event_date).getTime()
    ) {
      setError('A data final precisa ser igual ou posterior à data inicial.')
      return
    }

    setLoading(true)
    const result = await createEventAction({
      title: formData.title,
      description: formData.description,
      location_name: formData.location_name,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      category_id: formData.category_id,
      category_name: formData.category_name,
      image_url: formData.image_url,
      event_date: formData.event_date,
      event_end_date: formData.event_end_date,
      ticket_price: formData.ticket_price,
      whatsapp_info: formData.whatsapp_info,
      facebook_url: formData.facebook_url,
      instagram_handle: formData.instagram_handle,
    })

    if (!result.success) {
      setError(result.error || 'Erro ao cadastrar evento.')
      setLoading(false)
      return
    }

    alert('Evento cadastrado com sucesso! Ele foi enviado para análise e você receberá um e-mail com a confirmação.')
    router.push('/produtor/dashboard')
    router.refresh()
  }

  return (
    <div className={styles.container}>
      <Link href="/produtor/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} />
        <span>Voltar ao meu painel</span>
      </Link>

      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Cadastrar Novo Evento</h1>
          <p className={styles.subtitle}>
            Preencha os dados do baile para enviar para análise da moderação.
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '0.85rem', borderRadius: '12px', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          
          {/* Nome do Evento */}
          <div className="form-group">
            <label className="form-label">Nome do Evento *</label>
            <input
              type="text"
              required
              placeholder="Ex: Baile de Primavera com Grupo Tradição"
              className="form-input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          {/* Categoria do Evento */}
          <div className="form-group">
            <label className="form-label">Categoria do Evento *</label>
            <select
              required
              className="form-select"
              value={formData.category_id}
              onChange={handleCategoryChange}
            >
              <option value="">Selecione uma categoria...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Local & Cidade */}
          <div className={styles.grid2}>
            <div className="form-group">
              <label className="form-label">Nome do Local (Salão, CTG, Espaço)</label>
              <input
                type="text"
                placeholder="Ex: CTG Estância Gaúcha"
                className="form-input"
                value={formData.location_name}
                onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Cidade do Evento *</label>
              <input
                type="text"
                required
                placeholder="Ex: Porto Alegre"
                className="form-input"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
          </div>

          {/* Endereço Completo */}
          <div className="form-group">
            <label className="form-label">Endereço Completo (para ser exibido no Mapa) *</label>
            <input
              type="text"
              required
              placeholder="Ex: Av. Sertório, 1234 - Bairro Navegantes, Porto Alegre - RS"
              className="form-input"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          {/* Live OpenSource Map preview if address filled */}
          {formData.address.length > 5 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold', marginBottom: '0.4rem' }}>
                Pré-visualização da Localização no Mapa:
              </div>
              <EventMap
                address={formData.address}
                locationName={formData.location_name}
                city={formData.city}
                state={formData.state}
              />
            </div>
          )}

          {/* Período do evento */}
          <div className={styles.grid2}>
            <div className="form-group">
              <label className="form-label">Data e Horário de Início *</label>
              <input
                type="datetime-local"
                required
                className="form-input"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Data e Horário de Término (Opcional)</label>
              <input
                type="datetime-local"
                min={formData.event_date || undefined}
                className="form-input"
                value={formData.event_end_date}
                onChange={(e) => setFormData({ ...formData, event_end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Valor do Ingresso *</label>
            <input
              type="text"
              required
              placeholder="Ex: R$ 30,00 ou Entrada Gratuita"
              className="form-input"
              value={formData.ticket_price}
              onChange={(e) => setFormData({ ...formData, ticket_price: e.target.value })}
            />
          </div>

          {/* WhatsApp para Informações */}
          <div className="form-group">
            <label className="form-label">WhatsApp para Mais Informações *</label>
            <input
              type="text"
              required
              placeholder="Ex: (51) 99999-8888"
              className="form-input"
              value={formData.whatsapp_info}
              onChange={(e) => setFormData({ ...formData, whatsapp_info: e.target.value })}
            />
          </div>

          {/* Imagem do Evento (Banner) */}
          <div className="form-group">
            <label className="form-label">Imagem do Evento (Banner de Divulgação) *</label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
              <input
                type="text"
                placeholder="Cole o URL da imagem ou faça upload ao lado..."
                className="form-input"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              />
              <label className="btn-secondary" style={{ cursor: 'pointer', whiteSpace: 'nowrap', padding: '0.75rem 1rem' }}>
                <Upload size={16} />
                <span>{uploadingImage ? 'Enviando...' : 'Upload'}</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
            </div>

            {formData.image_url && (
              <div className={styles.imagePreview}>
                <img src={formData.image_url} alt="Preview Banner" className={styles.previewImg} />
              </div>
            )}
          </div>

          {/* Redes Sociais */}
          <div className={styles.grid2}>
            <div className="form-group">
              <label className="form-label">Página no Facebook (Opcional)</label>
              <input
                type="url"
                placeholder="https://facebook.com/seu-evento"
                className="form-input"
                value={formData.facebook_url}
                onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Perfil no Instagram (Opcional)</label>
              <input
                type="text"
                placeholder="@seu.evento"
                className="form-input"
                value={formData.instagram_handle}
                onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
              />
            </div>
          </div>

          {/* Descrição do Evento */}
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label">Descrição Detalhada do Evento *</label>
            <textarea
              required
              rows={5}
              placeholder="Descreva atrações, estacionamento, horários de início, trajes e informações adicionais..."
              className="form-textarea"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading || uploadingImage}
            className="btn-primary"
            style={{ width: '100%', padding: '0.9rem 1rem', fontSize: '1rem' }}
          >
            <PlusCircle size={20} />
            <span>{loading ? 'Submetendo Evento...' : 'Enviar Evento para Análise'}</span>
          </button>
        </form>
      </div>
    </div>
  )
}
