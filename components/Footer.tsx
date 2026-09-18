import Link from 'next/link'
import BrandLogo from '@/components/BrandLogo'
import styles from './Footer.module.css'

const exploreLinks = [
  { href: '/eventos', label: 'Agenda de eventos' },
  { href: '/', label: 'Explorar eventos' },
]

const producerLinks = [
  { href: '/cadastro', label: 'Cadastre seu evento' },
  { href: '/login', label: 'Entrar' },
]

const institutionalLinks = [
  { href: '/quemsomos', label: 'Quem somos' },
  { href: '/contato-e-suporte', label: 'Contato e suporte' },
  { href: '/termos-de-uso', label: 'Termos de uso e privacidade' },
]

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.glow} aria-hidden="true" />

      <div className={styles.container}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Link
              href="/"
              className={styles.logoLink}
              aria-label="Aonde Tem Baile - início"
            >
              <BrandLogo size="md" showSlogan={true} />
            </Link>

            <p className={styles.description}>
              Encontre bailes, festas, shows e eventos regionais perto de você.
              Uma agenda feita para aproximar público, produtores e a cultura de cada cidade.
            </p>

            <Link href="/eventos" className={styles.primaryLink}>
              Ver agenda de eventos
            </Link>
          </div>

          <nav className={styles.column} aria-label="Explorar">
            <h2>Explorar</h2>
            {exploreLinks.map((item) => (
              <Link key={item.href + item.label} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>

          <nav className={styles.column} aria-label="Para produtores">
            <h2>Para produtores</h2>
            {producerLinks.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>

          <nav className={styles.column} aria-label="Institucional">
            <h2>Institucional</h2>
            {institutionalLinks.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className={styles.bottom}>
          <p>
            © {new Date().getFullYear()} Aonde Tem Baile. Todos os direitos reservados.
          </p>

          <p className={styles.credit}>
            Desenvolvido por{' '}
            <a
              href="https://www.saulopavanello.com.br"
              target="_blank"
              rel="noopener"
            >
              Saulo Pavanello
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
