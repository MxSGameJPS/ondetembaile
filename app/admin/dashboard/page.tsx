'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import EventCard, { EventItem } from '@/components/EventCard'
import { ShieldCheck, CheckCircle2, XCircle, Trash2, Users, Calendar, AlertOctagon, UserX, UserCheck } from 'lucide-react'
import { updateEventStatusAction, deleteEventAction } from '@/app/actions/events'
import { updateUserStatusAction } from '@/app/actions/users'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

interface ProfileItem {
  id: string
  name: string
  company?: string
  whatsapp: string
  city: string
  role: 'producer' | 'admin' | 'superadmin'
  is_banned: boolean
  is_blocked: boolean
  created_at: string
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'users' | 'all-events'>('pending')
  const [events, setEvents] = useState<EventItem[]>([])
  const [profiles, setProfiles] = useState<ProfileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [adminRole, setAdminRole] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadAdminData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Check Admin Role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
        alert('Acesso restrito apenas a administradores.')
        router.push('/')
        return
      }

      setAdminRole(profile.role)

      // Fetch Events
      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })

      if (eventsData) setEvents(eventsData)

      // Fetch Profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesData) setProfiles(profilesData)

      setLoading(false)
    }

    loadAdminData()
  }, [])

  // Event Approval / Rejection Handler
  const handleApprove = async (eventId: string) => {
    const res = await updateEventStatusAction(eventId, 'approved')
    if (res.success) {
      setEvents(events.map((e) => (e.id === eventId ? { ...e, status: 'approved' } : e)))
      alert('Evento aprovado com sucesso! O produtor foi notificado por e-mail.')
    } else {
      alert(res.error || 'Erro ao aprovar evento.')
    }
  }

  const handleReject = async (eventId: string) => {
    const reason = prompt('Informe o motivo da recusa do evento (será enviado por e-mail ao produtor):')
    if (reason === null) return // Cancelled

    const res = await updateEventStatusAction(eventId, 'rejected', reason)
    if (res.success) {
      setEvents(events.map((e) => (e.id === eventId ? { ...e, status: 'rejected', rejection_reason: reason } : e)))
      alert('Evento recusado. E-mail de notificação enviado ao produtor.')
    } else {
      alert(res.error || 'Erro ao recusar evento.')
    }
  }

  const handleDelete = async (eventId: string) => {
    if (confirm('Tem certeza que deseja excluir permanentemente este evento?')) {
      const res = await deleteEventAction(eventId)
      if (res.success) {
        setEvents(events.filter((e) => e.id !== eventId))
      } else {
        alert(res.error || 'Erro ao excluir evento.')
      }
    }
  }

  // User Management Handlers
  const handleToggleBan = async (userId: string, currentBanned: boolean) => {
    const actionText = currentBanned ? 'desbanir' : 'banir'
    if (confirm(`Tem certeza que deseja ${actionText} este usuário?`)) {
      const res = await updateUserStatusAction(userId, { is_banned: !currentBanned })
      if (res.success) {
        setProfiles(profiles.map((p) => (p.id === userId ? { ...p, is_banned: !currentBanned } : p)))
      } else {
        alert(res.error || 'Erro ao alterar status.')
      }
    }
  }

  const handleToggleBlock = async (userId: string, currentBlocked: boolean) => {
    const actionText = currentBlocked ? 'desbloquear' : 'bloquear'
    if (confirm(`Tem certeza que deseja ${actionText} a criação de eventos para este usuário?`)) {
      const res = await updateUserStatusAction(userId, { is_blocked: !currentBlocked })
      if (res.success) {
        setProfiles(profiles.map((p) => (p.id === userId ? { ...p, is_blocked: !currentBlocked } : p)))
      } else {
        alert(res.error || 'Erro ao alterar status.')
      }
    }
  }

  const handleChangeRole = async (userId: string, newRole: 'producer' | 'admin' | 'superadmin') => {
    if (confirm(`Alterar papel do usuário para "${newRole}"?`)) {
      const res = await updateUserStatusAction(userId, { role: newRole })
      if (res.success) {
        setProfiles(profiles.map((p) => (p.id === userId ? { ...p, role: newRole } : p)))
      } else {
        alert(res.error || 'Erro ao alterar papel.')
      }
    }
  }

  const pendingEvents = events.filter((e) => e.status === 'pending')

  return (
    <div className={styles.container}>
      
      {/* Header Banner */}
      <div className={styles.header}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>
            <ShieldCheck size={16} />
            <span>Painel Administrativo ({adminRole?.toUpperCase()})</span>
          </div>
          <h1 className={styles.title}>Moderação & Gestão do Sistema</h1>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginTop: '4px' }}>
            Aprove/recuse eventos, gerencie produtores e monitore a plataforma.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'pending' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <AlertOctagon size={16} />
          <span>Aprovação de Eventos ({pendingEvents.length})</span>
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === 'users' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} />
          <span>Gestão de Usuários ({profiles.length})</span>
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === 'all-events' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('all-events')}
        >
          <Calendar size={16} />
          <span>Todos os Eventos ({events.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#9ca3af' }}>
          Carregando dados do painel...
        </div>
      ) : activeTab === 'pending' ? (
        <div>
          {pendingEvents.length > 0 ? (
            <div className="events-grid">
              {pendingEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  showStatus={true}
                  adminActions={
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', width: '100%' }}>
                      <button
                        onClick={() => handleApprove(event.id)}
                        className="btn-success"
                        style={{ flex: 1, padding: '0.5rem' }}
                      >
                        <CheckCircle2 size={16} />
                        <span>Aprovar</span>
                      </button>

                      <button
                        onClick={() => handleReject(event.id)}
                        className="btn-danger"
                        style={{ flex: 1, padding: '0.5rem' }}
                      >
                        <XCircle size={16} />
                        <span>Recusar</span>
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#111827', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#f8fafc' }}>
                Nenhum evento pendente de aprovação!
              </h3>
              <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                Todos os eventos enviados foram revisados.
              </p>
            </div>
          )}
        </div>
      ) : activeTab === 'users' ? (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome / Empresa</th>
                <th>E-mail</th>
                <th>WhatsApp</th>
                <th>Cidade</th>
                <th>Papel (Role)</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                    {p.company && <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{p.company}</div>}
                  </td>
                  <td>{p.id}</td>
                  <td>{p.whatsapp || '-'}</td>
                  <td>{p.city || '-'}</td>
                  <td>
                    <select
                      value={p.role}
                      onChange={(e) => handleChangeRole(p.id, e.target.value as any)}
                      style={{ background: '#0f172a', color: '#f59e0b', border: '1px solid #334155', borderRadius: '6px', padding: '4px 8px', fontSize: '0.8rem', fontWeight: 'bold' }}
                    >
                      <option value="producer">Produtor</option>
                      <option value="admin">Admin</option>
                      <option value="superadmin">SuperAdmin</option>
                    </select>
                  </td>
                  <td>
                    {p.is_banned ? (
                      <span className="badge badge-red">BANIDO</span>
                    ) : p.is_blocked ? (
                      <span className="badge badge-gold">BLOQUEADO</span>
                    ) : (
                      <span className="badge badge-green">ATIVO</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.actionBtns}>
                      <button
                        onClick={() => handleToggleBlock(p.id, p.is_blocked)}
                        className="btn-outline"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        title={p.is_blocked ? 'Desbloquear usuário' : 'Bloquear criação de eventos'}
                      >
                        {p.is_blocked ? 'Desbloquear' : 'Bloquear'}
                      </button>

                      <button
                        onClick={() => handleToggleBan(p.id, p.is_banned)}
                        className="btn-danger"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        title={p.is_banned ? 'Desbanir usuário' : 'Banir usuário'}
                      >
                        {p.is_banned ? 'Desbanir' : 'Banir'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* All Events List */
        <div className="events-grid">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              showStatus={true}
              adminActions={
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', width: '100%' }}>
                  {event.status !== 'approved' && (
                    <button
                      onClick={() => handleApprove(event.id)}
                      className="btn-success"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                    >
                      Aprovar
                    </button>
                  )}
                  {event.status !== 'rejected' && (
                    <button
                      onClick={() => handleReject(event.id)}
                      className="btn-danger"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                    >
                      Recusar
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="btn-outline"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: '#ef4444' }}
                  >
                    Excluir
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
