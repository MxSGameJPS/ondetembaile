'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import EventCard, { EventItem } from '@/components/EventCard'
import { ShieldCheck, CheckCircle2, XCircle, Trash2, Users, Calendar, AlertOctagon, Tag, PlusCircle } from 'lucide-react'
import { updateEventStatusAction, deleteEventAction } from '@/app/actions/events'
import { updateUserStatusAction } from '@/app/actions/users'
import { getCategoriesAction, createCategoryAction, deleteCategoryAction } from '@/app/actions/categories'
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

interface CategoryItem {
  id: string
  name: string
  slug: string
  created_at: string
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'users' | 'all-events' | 'categories'>('pending')
  const [events, setEvents] = useState<EventItem[]>([])
  const [profiles, setProfiles] = useState<ProfileItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
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

      // Fetch Categories
      const catRes = await getCategoriesAction()
      if (catRes.success && catRes.data) {
        setCategories(catRes.data)
      }

      setLoading(false)
    }

    loadAdminData()
  }, [])

  // Category Actions
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return

    setCreatingCategory(true)
    const res = await createCategoryAction(newCategoryName)
    setCreatingCategory(false)

    if (res.success && res.category) {
      setCategories([...categories, res.category].sort((a, b) => a.name.localeCompare(b.name)))
      setNewCategoryName('')
      alert('Categoria criada com sucesso!')
    } else {
      alert(res.error || 'Erro ao criar categoria.')
    }
  }

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (confirm(`Tem certeza que deseja excluir a categoria "${categoryName}"?`)) {
      const res = await deleteCategoryAction(categoryId)
      if (res.success) {
        setCategories(categories.filter((c) => c.id !== categoryId))
      } else {
        alert(res.error || 'Erro ao excluir categoria.')
      }
    }
  }

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
            Aprove/recuse eventos, gerencie categorias, produtores e monitore a plataforma.
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
          className={`${styles.tabBtn} ${activeTab === 'categories' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          <Tag size={16} />
          <span>Categorias de Eventos ({categories.length})</span>
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
      ) : activeTab === 'categories' ? (
        /* Categories Management Tab */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Create Category Form */}
          <div className="glass-card">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#f8fafc', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Tag size={18} color="#f59e0b" />
              <span>Cadastrar Nova Categoria</span>
            </h2>

            <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '0.75rem', maxWidth: '600px' }}>
              <input
                type="text"
                required
                placeholder="Ex: Pagode & Samba, Baile Tradicionalista, Sertanejo..."
                className="form-input"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <button
                type="submit"
                disabled={creatingCategory}
                className="btn-primary"
                style={{ whiteSpace: 'nowrap', padding: '0.75rem 1.25rem' }}
              >
                <PlusCircle size={18} />
                <span>{creatingCategory ? 'Salvando...' : 'Adicionar'}</span>
              </button>
            </form>
          </div>

          {/* Categories List Table */}
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nome da Categoria</th>
                  <th>Identificador (Slug)</th>
                  <th>Data de Criação</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td>
                      <span style={{ fontWeight: 'bold', color: '#fde047' }}>{cat.name}</span>
                    </td>
                    <td>
                      <code style={{ background: '#090d16', padding: '2px 8px', borderRadius: '4px', color: '#9ca3af', fontSize: '0.8rem' }}>
                        {cat.slug}
                      </code>
                    </td>
                    <td style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                      {new Date(cat.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="btn-danger"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                      >
                        <Trash2 size={14} />
                        <span>Excluir</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'users' ? (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome / Empresa</th>
                <th>E-mail ID</th>
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
