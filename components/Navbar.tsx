'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { PlusCircle, User as UserIcon, LogOut, ShieldCheck, Menu, X } from 'lucide-react'
import { signOutAction } from '@/app/actions/auth'
import { useRouter } from 'next/navigation'
import BrandLogo from '@/components/BrandLogo'
import styles from './Navbar.module.css'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        if (profile) setRole(profile.role)
      }
    }
    loadUser()

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentUser.id)
          .single()
        if (profile) setRole(profile.role)
      } else {
        setRole(null)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await signOutAction()
    setUser(null)
    setRole(null)
    router.push('/')
    router.refresh()
  }

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        
        {/* Official Brand Logo */}
        <Link href="/" className={styles.logoLink}>
          <BrandLogo size="md" showSlogan={true} />
        </Link>

        {/* Desktop Nav Links */}
        <nav className={styles.navLinks}>
          <Link href="/" className={styles.navLink}>
            Explorar Eventos
          </Link>

          {user ? (
            <>
              <Link href="/produtor/novo-evento" className="btn-primary">
                <PlusCircle size={16} />
                Divulgar Evento
              </Link>

              <Link href="/produtor/dashboard" className={styles.navLink}>
                <UserIcon size={16} />
                Meu Painel
              </Link>

              {['admin', 'superadmin'].includes(role || '') && (
                <Link href="/admin/dashboard" className={styles.adminBtn}>
                  <ShieldCheck size={16} />
                  SuperAdmin
                </Link>
              )}

              <button onClick={handleSignOut} className={styles.signOutBtn} title="Sair">
                <LogOut size={16} />
                Sair
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.navLink}>
                Entrar
              </Link>

              <Link href="/cadastro" className="btn-primary">
                Cadastre seu evento gratuitamente!
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={styles.mobileMenuBtn}
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className={styles.mobileDropdown}>
          <Link href="/" onClick={() => setMobileMenuOpen(false)} className={styles.navLink}>
            Explorar Eventos
          </Link>

          {user ? (
            <>
              <Link
                href="/produtor/novo-evento"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-primary"
                style={{ width: '100%' }}
              >
                <PlusCircle size={16} />
                Divulgar Evento
              </Link>

              <Link
                href="/produtor/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={styles.navLink}
              >
                <UserIcon size={16} />
                Meu Painel
              </Link>

              {['admin', 'superadmin'].includes(role || '') && (
                <Link
                  href="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={styles.adminBtn}
                >
                  <ShieldCheck size={16} />
                  Painel SuperAdmin
                </Link>
              )}

              <button
                onClick={() => {
                  handleSignOut()
                  setMobileMenuOpen(false)
                }}
                className={styles.signOutBtn}
                style={{ color: '#ef4444' }}
              >
                <LogOut size={16} />
                Sair da Conta
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className={styles.navLink}>
                Entrar
              </Link>
              <Link
                href="/cadastro"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-primary"
                style={{ width: '100%' }}
              >
                Cadastre seu evento gratuitamente!
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}
