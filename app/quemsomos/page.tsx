import type { Metadata } from 'next'
import { SITE_NAME, SITE_URL } from '@/lib/seo'
import Link from 'next/link'
import { CalendarSearch, HeartHandshake, MapPin, ShieldCheck } from 'lucide-react'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Quem Somos',
  description:
    'Conheça o Aonde Tem Baile, uma plataforma para descobrir, divulgar e valorizar bailes, festas, shows e eventos regionais.',
  alternates: {
    canonical: `${SITE_URL}/quemsomos`,
  },
  openGraph: {
    title: `Quem Somos | ${SITE_NAME}`,
    description:
      'Conheça a proposta do Aonde Tem Baile e como conectamos público, produtores e eventos regionais.',
    url: `${SITE_URL}/quemsomos`,
    type: 'website',
    locale: 'pt_BR',
    siteName: SITE_NAME,
  },
}

const pillars = [
  {
    icon: MapPin,
    title: 'Eventos perto de você',
    description:
      'Organizamos informações de eventos por cidade e região para tornar a descoberta mais simples e útil.',
  },
  {
    icon: CalendarSearch,
    title: 'Espaço para produtores',
    description:
      'Produtores podem cadastrar seus próprios eventos e acompanhar o processo de revisão pelo painel.',
  },
  {
    icon: ShieldCheck,
    title: 'Revisão antes da publicação',
    description:
      'Eventos enviados à plataforma passam por moderação para reduzir informações incompletas ou inadequadas.',
  },
  {
    icon: HeartHandshake,
    title: 'Valorização da cultura regional',
    description:
      'Bailes, festas, shows e encontros locais ganham um espaço dedicado para alcançar novas pessoas.',
  },
]

export default function QuemSomosPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.content}>
          <span className={styles.eyebrow}>Sobre o Aonde Tem Baile</span>
          <h1>A diversão começa quando as pessoas encontram o evento certo.</h1>
          <p>
            O Aonde Tem Baile nasceu para aproximar público, produtores e eventos
            regionais em um só lugar. A plataforma facilita a descoberta de
            bailes, festas, shows e encontros culturais e ajuda quem produz a
            divulgar seu evento de forma organizada.
          </p>

          <div className={styles.actions}>
            <Link href="/" className="btn-primary">
              Explorar eventos
            </Link>
            <Link href="/contato-e-suporte" className="btn-secondary">
              Falar com a equipe
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>Como trabalhamos</span>
          <h2>Uma plataforma feita para conectar a cena local.</h2>
          <p>
            Reunimos eventos cadastrados por produtores e informações encontradas
            em fontes públicas, sempre preservando uma etapa de revisão humana
            quando a publicação depende de moderação.
          </p>
        </div>

        <div className={styles.grid}>
          {pillars.map(({ icon: Icon, title, description }) => (
            <article key={title} className={styles.card}>
              <div className={styles.icon}>
                <Icon size={22} aria-hidden="true" />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.callout}>
        <div>
          <span className={styles.eyebrow}>Você produz eventos?</span>
          <h2>Divulgue seu próximo evento no Aonde Tem Baile.</h2>
          <p>
            Crie sua conta, envie as informações e acompanhe o status da
            moderação diretamente pelo seu painel.
          </p>
        </div>
        <Link href="/cadastro" className="btn-primary">
          Cadastrar gratuitamente
        </Link>
      </section>
    </div>
  )
}
