'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import EventCard, { EventItem } from '@/components/EventCard'
import EditEventModal from '@/components/admin/EditEventModal'
import { PlusCircle, Sparkles, AlertCircle, Calendar, Edit3 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteEventAction } from '@/app/actions/events'
import { getCategoriesAction } from '@/app/actions/categories'

export default function ProducerDashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [events, setEvents] = useState<EventItem[]>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadProducerData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Load Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(profileData)

      // Load Categories
      const catRes = await getCategoriesAction()
      if (catRes.success && catRes.data) {
        setCategories(catRes.data)
      }

      // Load Producer's Events
      const { data: eventsData, error } = await supabase
        .from('events')
        .select('*')
        .eq('producer_id', user.id)
        .order('created_at', { ascending: false })

      if (!error && eventsData) {
        setEvents(eventsData)
      }
      setLoading(false)
    }

    loadProducerData()
  }, [])

  const handleEditEvent = (eventItem: EventItem) => {
    setEditingEvent(eventItem)
    setIsEditModalOpen(true)
  }

  const handleSaveEventSuccess = (updatedEvent: EventItem) => {
    setEvents((current) => current.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)))
    alert('Evento atualizado com sucesso!')
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (confirm('Tem certeza que deseja excluir este evento?')) {
      const res = await deleteEventAction(eventId)
      if (res.success) {
        setEvents(events.filter((e) => e.id !== eventId))
      } else {
        alert(res.error || 'Erro ao excluir evento.')
      }
    }
  }

  return (
    <div style={{ padding: '3rem 1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.9), rgba(9, 13, 22, 0.9))',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: '24px',
          padding: '2rem',
          marginBottom: '2.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            <Sparkles size={14} />
            <span>Painel do Produtor</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', color: '#f8fafc' }}>
            Olá, {profile?.name || 'Produtor'}! 👋
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginTop: '4px' }}>
            Gerencie os seus eventos e acompanhe o status de aprovação.
          </p>
        </div>

        <Link href="/produtor/novo-evento" className="btn-primary" style={{ padding: '0.85rem 1.5rem' }}>
          <PlusCircle size={20} />
          <span>Cadastrar Novo Evento</span>
        </Link>
      </div>

      {/* Account Warning if Banned/Blocked */}
      {profile?.is_blocked && (
        <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '16px', padding: '1rem 1.5rem', color: '#fca5a5', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} />
          <div>
            <strong>Atenção:</strong> Sua conta está temporariamente bloqueada para envio de novos eventos. Entre em contato com o suporte.
          </div>
        </div>
      )}

      {/* Events List Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f8fafc' }}>
          Meus Eventos Cadastrados ({events.length})
        </h2>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#9ca3af' }}>
          Carregando seus eventos...
        </div>
      ) : events.length > 0 ? (
        <div className="events-grid">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              showStatus={true}
              adminActions={
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', width: '100%' }}>
                  <button
                    onClick={() => handleEditEvent(event)}
                    className="btn-primary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', gap: '0.3rem', display: 'flex', alignItems: 'center' }}
                  >
                    <Edit3 size={14} />
                    <span>Editar</span>
                  </button>

                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="btn-danger"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                  >
                    Excluir
                  </button>
                </div>
              }
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            background: '#111827',
            border: '1px dashed rgba(245, 158, 11, 0.3)',
            borderRadius: '24px',
            padding: '4rem 2rem',
            textAlign: 'center',
          }}
        >
          <Calendar size={48} color="#f59e0b" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f8fafc', marginBottom: '0.5rem' }}>
            Você ainda não cadastrou nenhum evento
          </h3>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '1.75rem', maxWidth: '500px', margin: '0 auto 1.75rem auto' }}>
            Cadastre seu primeiro baile ou festa e comece a divulgar para milhares de pessoas na sua região!
          </p>
          <Link href="/produtor/novo-evento" className="btn-primary">
            <PlusCircle size={18} />
            Cadastrar Meu Primeiro Evento
          </Link>
        </div>
      )}

      {/* Edit Event Modal */}
      <EditEventModal
        event={editingEvent}
        categories={categories}
        isOpen={isEditModalOpen}
        isAdminView={false}
        onClose={() => setIsEditModalOpen(false)}
        onSaveSuccess={handleSaveEventSuccess}
      />
    </div>
  )
}
