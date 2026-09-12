'use client'

import { useState } from 'react'
import { signUpProducerAction } from '@/app/actions/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, UserCheck, Lock, Mail, Phone, MapPin, Building } from 'lucide-react'
import styles from './page.module.css'

export default function ProducerSignUpPage() {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    whatsapp: '',
    city: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false,
  })

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem. Verifique a confirmação.')
      return
    }

    if (!formData.termsAccepted) {
      setError('Você deve aceitar os termos de uso para continuar.')
      return
    }

    setLoading(true)
    const result = await signUpProducerAction({
      name: formData.name,
      company: formData.company,
      email: formData.email,
      whatsapp: formData.whatsapp,
      city: formData.city,
      password: formData.password,
      termsAccepted: formData.termsAccepted,
    })

    if (!result.success) {
      setError(result.error || 'Erro ao realizar cadastro.')
      setLoading(false)
      return
    }

    router.push('/produtor/dashboard')
    router.refresh()
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #f59e0b, #f97316)', margin: '0 auto 1rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#030712' }}>
            <Sparkles size={24} />
          </div>
          <h1 className={styles.title}>Cadastro de Produtor</h1>
          <p className={styles.subtitle}>
            Cadastre-se gratuitamente para divulgar os seus bailes e eventos!
          </p>
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Nome */}
          <div className="form-group">
            <label className="form-label">Nome Completo *</label>
            <input
              type="text"
              required
              placeholder="Seu nome"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Empresa (Opcional) */}
          <div className="form-group">
            <label className="form-label">Empresa ou Nome do Grupo (Opcional)</label>
            <input
              type="text"
              placeholder="Ex: Produtora Baile Bom"
              className="form-input"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            />
          </div>

          {/* Email & WhatsApp */}
          <div className={styles.grid2}>
            <div className="form-group">
              <label className="form-label">E-mail *</label>
              <input
                type="email"
                required
                placeholder="seuemail@exemplo.com"
                className="form-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">WhatsApp *</label>
              <input
                type="text"
                required
                placeholder="(51) 99999-9999"
                className="form-input"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              />
            </div>
          </div>

          {/* Cidade */}
          <div className="form-group">
            <label className="form-label">Sua Cidade Base *</label>
            <input
              type="text"
              required
              placeholder="Ex: Porto Alegre - RS"
              className="form-input"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>

          {/* Senha e Confirmação */}
          <div className={styles.grid2}>
            <div className="form-group">
              <label className="form-label">Senha *</label>
              <input
                type="password"
                required
                placeholder="Mínimo 6 caracteres"
                className="form-input"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirmar Senha *</label>
              <input
                type="password"
                required
                placeholder="Repita a senha"
                className="form-input"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>
          </div>

          {/* Aceite de Termos Checkbox */}
          <div className="form-group" style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            <label className="form-checkbox">
              <input
                type="checkbox"
                required
                checked={formData.termsAccepted}
                onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
              />
              <span>
                Li e aceito os <strong>Termos de Uso</strong> e Políticas de Privacidade do site Aonde Tem Baile.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', padding: '0.85rem 1rem', fontSize: '1rem' }}
          >
            {loading ? 'Cadastrando...' : 'Criar Conta de Produtor'}
          </button>
        </form>

        <div className={styles.footerText}>
          Já possui uma conta?{' '}
          <Link href="/login" className={styles.link}>
            Fazer Login
          </Link>
        </div>
      </div>
    </div>
  )
}
