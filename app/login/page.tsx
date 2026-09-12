'use client'

import { useState } from 'react'
import { signInAction } from '@/app/actions/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, Lock, Mail } from 'lucide-react'
import styles from '../cadastro/page.module.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await signInAction(email, password)

    if (!result.success) {
      setError(result.error || 'Credenciais inválidas.')
      setLoading(false)
      return
    }

    if (email === 'alexmobihaus@gmail.com') {
      router.push('/admin/dashboard')
    } else {
      router.push('/produtor/dashboard')
    }
    router.refresh()
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #f59e0b, #f97316)', margin: '0 auto 1rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#030712' }}>
            <Sparkles size={24} />
          </div>
          <h1 className={styles.title}>Acessar Minha Conta</h1>
          <p className={styles.subtitle}>
            Digite suas credenciais para gerenciar seus eventos
          </p>
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input
              type="email"
              required
              placeholder="seuemail@exemplo.com"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label className="form-label">Senha</label>
            <input
              type="password"
              required
              placeholder="Sua senha"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', padding: '0.85rem 1rem', fontSize: '1rem' }}
          >
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className={styles.footerText}>
          Ainda não tem conta de produtor?{' '}
          <Link href="/cadastro" className={styles.link}>
            Cadastrar-se
          </Link>
        </div>
      </div>
    </div>
  )
}
