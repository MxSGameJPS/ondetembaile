'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import EventCard, { EventItem } from '@/components/EventCard'
import DiscoveredEventCard from '@/components/admin/DiscoveredEventCard'
import { ShieldCheck, CheckCircle2, XCircle, Trash2, Users, Calendar, AlertOctagon, Tag, PlusCircle, Search, Globe2, MessageCircle, Share2, Link2, Ticket, Sparkles } from 'lucide-react'
import { updateEventStatusAction, deleteEventAction } from '@/app/actions/events'
import { updateUserStatusAction } from '@/app/actions/users'
import { getCategoriesAction, createCategoryAction, deleteCategoryAction } from '@/app/actions/categories'
import {
  approveDiscoveryCandidateAction,
  discoverEventsAction,
  getDiscoveryCandidatesAction,
  importFacebookEventAction,
  importRoleAgoraEventAction,
  importSymplaEventAction,
  rejectDiscoveryCandidateAction,
  updateDiscoveryCandidateAction,
} from '@/app/actions/event-discovery'
import type {
  DiscoverySource,
  EventDiscoveryCandidate,
  UpdateDiscoveryCandidateInput,
} from '@/types/event-discovery'
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
  const [activeTab, setActiveTab] = useState<'pending' | 'discover' | 'users' | 'all-events' | 'categories'>('pending')
  const [events, setEvents] = useState<EventItem[]>([])
  const [profiles, setProfiles] = useState<ProfileItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [candidateEvents, setCandidateEvents] = useState<EventDiscoveryCandidate[]>([])
  const [discoverCity, setDiscoverCity] = useState('')
  const [discoverState, setDiscoverState] = useState('RS')
  const [discoverPeriod, setDiscoverPeriod] = useState(30)
  const [discoverSources, setDiscoverSources] = useState<DiscoverySource[]>(['web', 'facebook', 'sympla', 'roleagora'])
  const [facebookUrl, setFacebookUrl] = useState('')
  const [importingFacebook, setImportingFacebook] = useState(false)
  const [symplaUrl, setSymplaUrl] = useState('')
  const [importingSympla, setImportingSympla] = useState(false)
  const [roleAgoraUrl, setRoleAgoraUrl] = useState('')
  const [importingRoleAgora, setImportingRoleAgora] = useState(false)
  const [discovering, setDiscovering] = useState(false)
  const [candidateBusyId, setCandidateBusyId] = useState<string | null>(null)
  const [discoveryError, setDiscoveryError] = useState<string | null>(null)
  const [discoverySummary, setDiscoverySummary] = useState<string | null>(null)
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
        .select('role, city')
        .eq('id', user.id)
        .single()

      if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
        alert('Acesso restrito apenas a administradores.')
        router.push('/')
        return
      }

      setAdminRole(profile.role)
      if (profile.city) setDiscoverCity(profile.city)

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

      // Fetch pending candidates discovered from public sources
      const candidateRes = await getDiscoveryCandidatesAction()
      if (candidateRes.success) {
        setCandidateEvents(candidateRes.candidates)
      } else {
        setDiscoveryError(candidateRes.error)
      }

      setLoading(false)
    }

    loadAdminData()
  }, [])

  const toggleDiscoverySource = (source: DiscoverySource) => {
    setDiscoverSources((current) =>
      current.includes(source)
        ? current.filter((item) => item !== source)
        : [...current, source]
    )
  }

  const handleDiscoverEvents = async () => {
    if (!discoverCity.trim()) {
      setDiscoveryError('Informe uma cidade para iniciar a busca.')
      return
    }

    if (discoverSources.length === 0) {
      setDiscoveryError('Selecione ao menos uma fonte de busca.')
      return
    }

    setDiscovering(true)
    setDiscoveryError(null)
    setDiscoverySummary(null)

    const res = await discoverEventsAction({
      city: discoverCity,
      state: discoverState,
      periodDays: discoverPeriod,
      sources: discoverSources,
    })

    setDiscovering(false)

    if (res.success) {
      setCandidateEvents(res.candidates)
      const warningText = res.warnings?.length
        ? ` Algumas fontes tiveram avisos: ${res.warnings.join(' | ')}`
        : ''
      setDiscoverySummary(
        `Groq pesquisou e validou ${res.searched} resultado(s), aceitando ${res.found} evento(s) dentro de ${res.window.start} a ${res.window.end}.${warningText}`
      )
    } else {
      setDiscoveryError(res.error)
    }
  }

  const handleImportFacebookUrl = async () => {
    if (!facebookUrl.trim()) {
      setDiscoveryError('Cole uma URL pública do Facebook para importar.')
      return
    }

    if (!discoverCity.trim()) {
      setDiscoveryError('Informe a cidade antes de importar a URL do Facebook.')
      return
    }

    setImportingFacebook(true)
    setDiscoveryError(null)
    setDiscoverySummary(null)

    const res = await importFacebookEventAction({
      url: facebookUrl,
      city: discoverCity,
      state: discoverState,
      periodDays: discoverPeriod,
    })

    setImportingFacebook(false)

    if (!res.success) {
      setDiscoveryError(res.error)
      return
    }

    setCandidateEvents((current) => {
      const withoutImported = current.filter((candidate) => candidate.id !== res.candidate.id)
      return [res.candidate, ...withoutImported]
    })
    setFacebookUrl('')
    setDiscoverySummary(
      'URL do Facebook pesquisada e validada pela Groq. O evento foi adicionado à fila de revisão.'
    )
  }

  const handleImportSymplaUrl = async () => {
    if (!symplaUrl.trim()) {
      setDiscoveryError('Cole uma URL de evento da Sympla para importar.')
      return
    }

    if (!discoverCity.trim()) {
      setDiscoveryError('Informe a cidade antes de importar a URL da Sympla.')
      return
    }

    setImportingSympla(true)
    setDiscoveryError(null)
    setDiscoverySummary(null)

    const res = await importSymplaEventAction({
      url: symplaUrl,
      city: discoverCity,
      state: discoverState,
      periodDays: discoverPeriod,
    })

    setImportingSympla(false)

    if (!res.success) {
      setDiscoveryError(res.error)
      return
    }

    setCandidateEvents((current) => {
      const withoutImported = current.filter((candidate) => candidate.id !== res.candidate.id)
      return [res.candidate, ...withoutImported]
    })
    setSymplaUrl('')
    setDiscoverySummary(
      'URL da Sympla pesquisada e validada pela Groq. O evento foi adicionado à fila de revisão.'
    )
  }

  const handleImportRoleAgoraUrl = async () => {
    if (!roleAgoraUrl.trim()) {
      setDiscoveryError('Cole uma URL de evento do Rolê Agora para importar.')
      return
    }

    if (!discoverCity.trim()) {
      setDiscoveryError('Informe a cidade antes de importar a URL do Rolê Agora.')
      return
    }

    setImportingRoleAgora(true)
    setDiscoveryError(null)
    setDiscoverySummary(null)

    const res = await importRoleAgoraEventAction({
      url: roleAgoraUrl,
      city: discoverCity,
      state: discoverState,
      periodDays: discoverPeriod,
    })

    setImportingRoleAgora(false)

    if (!res.success) {
      setDiscoveryError(res.error)
      return
    }

    setCandidateEvents((current) => {
      const withoutImported = current.filter((candidate) => candidate.id !== res.candidate.id)
      return [res.candidate, ...withoutImported]
    })
    setRoleAgoraUrl('')
    setDiscoverySummary(
      'URL do Rolê Agora pesquisada e validada pela Groq. O evento foi adicionado à fila de revisão.'
    )
  }

  const handleCandidateSave = async (
    candidateId: string,
    updates: UpdateDiscoveryCandidateInput
  ) => {
    setCandidateBusyId(candidateId)
    const res = await updateDiscoveryCandidateAction(candidateId, updates)
    setCandidateBusyId(null)

    if (!res.success) {
      alert(res.error || 'Erro ao salvar os ajustes do evento.')
      return false
    }

    setCandidateEvents((current) =>
      current.map((candidate) => (candidate.id === candidateId ? res.candidate : candidate))
    )

    return true
  }

  const handleCandidateApprove = async (candidateId: string) => {
    setCandidateBusyId(candidateId)
    const res = await approveDiscoveryCandidateAction(candidateId)
    setCandidateBusyId(null)

    if (!res.success) {
      alert(res.error || 'Erro ao aprovar o evento encontrado.')
      return
    }

    setCandidateEvents((current) => current.filter((candidate) => candidate.id !== candidateId))
    setEvents((current) => [res.event as EventItem, ...current])
    alert('Evento encontrado aprovado e publicado com sucesso!')
  }

  const handleCandidateReject = async (candidateId: string) => {
    const reason = prompt('Motivo da recusa (opcional):')
    if (reason === null) return

    setCandidateBusyId(candidateId)
    const res = await rejectDiscoveryCandidateAction(candidateId, reason)
    setCandidateBusyId(null)

    if (!res.success) {
      alert(res.error || 'Erro ao recusar o evento encontrado.')
      return
    }

    setCandidateEvents((current) => current.filter((candidate) => candidate.id !== candidateId))
  }

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
          className={`${styles.tabBtn} ${activeTab === 'discover' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('discover')}
        >
          <Search size={16} />
          <span>Encontrar Eventos ({candidateEvents.length})</span>
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
      ) : activeTab === 'discover' ? (
        <div className={styles.discoverySection}>
          <div className={styles.discoveryPanel}>
            <div className={styles.discoveryPanelHeader}>
              <div>
                <div className={styles.discoveryEyebrow}>
                  <Sparkles size={15} />
                  <span>Descoberta com Groq + busca em tempo real</span>
                </div>
                <h2>Encontrar eventos em fontes públicas</h2>
                <p>
                  A Groq pesquisa as fontes, rejeita páginas de guia/listagem e só aceita eventos com data e horário comprovados dentro da janela escolhida.
                </p>
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={handleDiscoverEvents}
                disabled={discovering}
              >
                <Search size={18} />
                <span>{discovering ? 'Buscando...' : 'Encontrar eventos'}</span>
              </button>
            </div>

            <div className={styles.discoveryForm}>
              <label>
                <span>Cidade *</span>
                <input
                  value={discoverCity}
                  placeholder="Ex: Porto Alegre"
                  onChange={(event) => setDiscoverCity(event.target.value)}
                  disabled={discovering}
                />
              </label>

              <label>
                <span>UF</span>
                <input
                  value={discoverState}
                  maxLength={2}
                  placeholder="RS"
                  onChange={(event) => setDiscoverState(event.target.value.toUpperCase())}
                  disabled={discovering}
                />
              </label>

              <label>
                <span>Período</span>
                <select
                  value={discoverPeriod}
                  onChange={(event) => setDiscoverPeriod(Number(event.target.value))}
                  disabled={discovering}
                >
                  <option value={30}>Próximos 30 dias</option>
                  <option value={60}>Próximos 60 dias</option>
                  <option value={90}>Próximos 90 dias</option>
                </select>
              </label>
            </div>

            <div className={styles.sourceOptions}>
              <span className={styles.sourceOptionsLabel}>Fontes:</span>

              <label className={styles.sourceOption}>
                <input
                  type="checkbox"
                  checked={discoverSources.includes('web')}
                  onChange={() => toggleDiscoverySource('web')}
                  disabled={discovering}
                />
                <Globe2 size={15} />
                <span>Web pública</span>
              </label>

              <label className={styles.sourceOption}>
                <input
                  type="checkbox"
                  checked={discoverSources.includes('reddit')}
                  onChange={() => toggleDiscoverySource('reddit')}
                  disabled={discovering}
                />
                <MessageCircle size={15} />
                <span>Reddit</span>
              </label>

              <label className={styles.sourceOption}>
                <input
                  type="checkbox"
                  checked={discoverSources.includes('facebook')}
                  onChange={() => toggleDiscoverySource('facebook')}
                  disabled={discovering}
                />
                <Share2 size={15} />
                <span>Facebook</span>
              </label>

              <label className={styles.sourceOption}>
                <input
                  type="checkbox"
                  checked={discoverSources.includes('sympla')}
                  onChange={() => toggleDiscoverySource('sympla')}
                  disabled={discovering}
                />
                <Ticket size={15} />
                <span>Sympla</span>
              </label>

              <label className={styles.sourceOption}>
                <input
                  type="checkbox"
                  checked={discoverSources.includes('roleagora')}
                  onChange={() => toggleDiscoverySource('roleagora')}
                  disabled={discovering}
                />
                <Calendar size={15} />
                <span>Rolê Agora</span>
              </label>
            </div>

            <div className={styles.facebookImport}>
              <div className={styles.facebookImportCopy}>
                <div className={styles.facebookImportTitle}>
                  <Link2 size={15} />
                  <span>Importar URL do Facebook</span>
                </div>
                <p>
                  Cole o link público. A Groq tenta localizar e validar o conteúdo em tempo real, inclusive links /share/, sem inventar dados quando a Meta bloquear o acesso.
                </p>
              </div>

              <div className={styles.facebookImportForm}>
                <input
                  type="url"
                  value={facebookUrl}
                  placeholder="https://www.facebook.com/events/..."
                  onChange={(event) => setFacebookUrl(event.target.value)}
                  disabled={importingFacebook || discovering}
                />
                <button
                  type="button"
                  className="btn-outline"
                  onClick={handleImportFacebookUrl}
                  disabled={importingFacebook || discovering || !facebookUrl.trim()}
                >
                  <Search size={16} />
                  <span>{importingFacebook ? 'Localizando...' : 'Importar URL'}</span>
                </button>
              </div>
            </div>

            <div className={styles.facebookImport}>
              <div className={styles.facebookImportCopy}>
                <div className={styles.facebookImportTitle}>
                  <Ticket size={15} />
                  <span>Importar URL da Sympla</span>
                </div>
                <p>
                  Cole a URL de um evento da Sympla. A Groq valida se ele é futuro e se está dentro do período selecionado.
                </p>
              </div>

              <div className={styles.facebookImportForm}>
                <input
                  type="url"
                  value={symplaUrl}
                  placeholder="https://www.sympla.com.br/evento/..."
                  onChange={(event) => setSymplaUrl(event.target.value)}
                  disabled={importingSympla || discovering}
                />
                <button
                  type="button"
                  className="btn-outline"
                  onClick={handleImportSymplaUrl}
                  disabled={importingSympla || discovering || !symplaUrl.trim()}
                >
                  <Search size={16} />
                  <span>{importingSympla ? 'Localizando...' : 'Importar URL'}</span>
                </button>
              </div>
            </div>

            <div className={styles.facebookImport}>
              <div className={styles.facebookImportCopy}>
                <div className={styles.facebookImportTitle}>
                  <Calendar size={15} />
                  <span>Importar URL do Rolê Agora</span>
                </div>
                <p>
                  Aceita apenas páginas individuais /event/. Páginas /city/, guias e agendas são rejeitadas automaticamente.
                </p>
              </div>

              <div className={styles.facebookImportForm}>
                <input
                  type="url"
                  value={roleAgoraUrl}
                  placeholder="https://www.roleagora.com.br/event/..."
                  onChange={(event) => setRoleAgoraUrl(event.target.value)}
                  disabled={importingRoleAgora || discovering}
                />
                <button
                  type="button"
                  className="btn-outline"
                  onClick={handleImportRoleAgoraUrl}
                  disabled={importingRoleAgora || discovering || !roleAgoraUrl.trim()}
                >
                  <Search size={16} />
                  <span>{importingRoleAgora ? 'Localizando...' : 'Importar URL'}</span>
                </button>
              </div>
            </div>
          </div>

          {discoveryError && (
            <div className={styles.discoveryError}>{discoveryError}</div>
          )}

          {discoverySummary && (
            <div className={styles.discoverySummary}>{discoverySummary}</div>
          )}

          <div className={styles.discoveryResultsHeader}>
            <div>
              <h3>Fila de revisão</h3>
              <p>
                {candidateEvents.length} evento(s) aguardando decisão. Resultados recusados não voltam nas próximas buscas.
              </p>
            </div>
          </div>

          {candidateEvents.length > 0 ? (
            <div className={styles.discoveryGrid}>
              {candidateEvents.map((candidate) => (
                <DiscoveredEventCard
                  key={candidate.id}
                  candidate={candidate}
                  busy={candidateBusyId === candidate.id}
                  onSave={handleCandidateSave}
                  onApprove={handleCandidateApprove}
                  onReject={handleCandidateReject}
                />
              ))}
            </div>
          ) : (
            <div className={styles.discoveryEmpty}>
              <Search size={34} />
              <h3>Nenhum evento encontrado aguardando revisão</h3>
              <p>Escolha cidade, período e fontes e clique em “Encontrar eventos”.</p>
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
