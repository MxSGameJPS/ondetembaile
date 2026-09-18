import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2, Mail, MessageSquareText } from 'lucide-react'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Contato e Suporte | Aonde Tem Baile',
  description:
    'Entre em contato com a equipe do Aonde Tem Baile para suporte, dúvidas sobre eventos, cadastro ou moderação.',
}

interface ContactPageProps {
  searchParams: Promise<{
    enviado?: string
  }>
}

export default async function ContatoSuportePage({
  searchParams,
}: ContactPageProps) {
  const params = await searchParams
  const sent = params.enviado === '1'

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <section className={styles.intro}>
          <span className={styles.eyebrow}>Contato e suporte</span>
          <h1>Como podemos ajudar?</h1>
          <p>
            Use o formulário para falar com a equipe sobre cadastro, moderação,
            correções em eventos, dúvidas técnicas ou outros assuntos
            relacionados ao Aonde Tem Baile.
          </p>

          <div className={styles.contactCard}>
            <Mail size={20} aria-hidden="true" />
            <div>
              <strong>E-mail</strong>
              <a href="mailto:alexmobihaus@gmail.com">
                alexmobihaus@gmail.com
              </a>
            </div>
          </div>

          <Link href="/quemsomos" className={styles.aboutLink}>
            Conheça também quem somos
          </Link>
        </section>

        <section className={styles.formCard}>
          <div className={styles.formHeading}>
            <MessageSquareText size={22} aria-hidden="true" />
            <div>
              <h2>Envie sua mensagem</h2>
              <p>Preencha os campos abaixo e responderemos pelo e-mail informado.</p>
            </div>
          </div>

          {sent && (
            <div className={styles.success} role="status">
              <CheckCircle2 size={20} aria-hidden="true" />
              <span>Mensagem enviada com sucesso.</span>
            </div>
          )}

          <form
            action="https://formsubmit.co/alexmobihaus@gmail.com"
            method="POST"
            className={styles.form}
          >
            <input
              type="hidden"
              name="_subject"
              value="Novo contato pelo site Aonde Tem Baile"
            />
            <input type="hidden" name="_template" value="table" />
            <input
              type="hidden"
              name="_next"
              value="https://aondetembaile.com.br/contato-e-suporte?enviado=1"
            />
            <input
              type="text"
              name="_honey"
              tabIndex={-1}
              autoComplete="off"
              className={styles.honeypot}
              aria-hidden="true"
            />

            <div className={styles.field}>
              <label htmlFor="name">Nome *</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Seu nome"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="email">E-mail *</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="voce@exemplo.com"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="subject">Assunto *</label>
              <select id="subject" name="assunto" required defaultValue="">
                <option value="" disabled>
                  Selecione um assunto
                </option>
                <option value="Suporte ao produtor">Suporte ao produtor</option>
                <option value="Moderacao de evento">Moderação de evento</option>
                <option value="Correcao de informacao">Correção de informação</option>
                <option value="Problema tecnico">Problema técnico</option>
                <option value="Parcerias">Parcerias</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div className={styles.field}>
              <label htmlFor="message">Mensagem *</label>
              <textarea
                id="message"
                name="mensagem"
                rows={7}
                required
                placeholder="Descreva sua dúvida ou solicitação com o máximo de detalhes possível."
              />
            </div>

            <button type="submit" className="btn-primary">
              Enviar mensagem
            </button>
          </form>

          <p className={styles.privacy}>
            Os dados informados serão utilizados somente para responder à sua
            solicitação. Consulte nossos{' '}
            <Link href="/termos-de-uso">Termos de Uso e Privacidade</Link>.
          </p>
        </section>
      </div>
    </div>
  )
}
