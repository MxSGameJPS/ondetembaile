import Link from 'next/link'
import { ShieldCheck, ArrowLeft, FileText, Lock, AlertCircle, HelpCircle } from 'lucide-react'
import styles from './page.module.css'

export const metadata = {
  title: 'Termos de Uso e Privacidade | Aonde Tem Baile',
  description: 'Termos de uso, condições gerais e política de privacidade do portal Aonde Tem Baile.',
}

export default function TermsOfUsePage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #f59e0b, #f97316)',
              margin: '0 auto 1.25rem auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#030712',
              boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)',
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <h1 className={styles.title}>Termos de Uso e Privacidade</h1>
          <p className={styles.subtitle}>
            Condições gerais de uso da plataforma e diretrizes de privacidade do <strong>Aonde Tem Baile</strong>.
          </p>
          <span className={styles.lastUpdated}>Última atualização: Setembro de 2026</span>
        </div>

        <div className={styles.content}>
          {/* Section 1 */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span>1.</span> Apresentação e Objeto
            </h2>
            <p className={styles.paragraph}>
              O portal <strong>Aonde Tem Baile</strong> (disponível em <code>aondetembaile.com.br</code>) é uma plataforma digital que tem como objetivo promover, mapear e facilitar a busca por bailes, festas, shows e eventos culturais e regionais em todo o Brasil.
            </p>
            <p className={styles.paragraph}>
              Ao navegar pelo site, realizar cadastro como produtor de eventos ou divulgar atrações, você concorda expressamente com os presentes Termos de Uso e Privacidade.
            </p>
          </div>

          {/* Section 2 */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span>2.</span> Cadastro de Produtores e Publicação de Eventos
            </h2>
            <p className={styles.paragraph}>
              Para publicar eventos no portal, o produtor ou organizador deve criar uma conta fornecendo dados verídicos, completos e atualizados.
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <strong>Veracidade das informações:</strong> É de responsabilidade exclusiva do produtor a precisão de todas as informações cadastradas (data, horário, local, cidade, valores de ingressos, telefone de contato e atrações).
              </li>
              <li className={styles.listItem}>
                <strong>Conteúdo permitido:</strong> Não é permitida a publicação de eventos com conteúdo ilícito, discriminatório, incitação à violência, informações falsas ou fraudações.
              </li>
              <li className={styles.listItem}>
                <strong>Moderação:</strong> O portal <strong>Aonde Tem Baile</strong> se reserva o direito de revisar, aprovar, recusar ou remover qualquer publicação que descumpra as diretrizes de qualidade ou segurança da comunidade.
              </li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span>3.</span> Isenção de Responsabilidade sobre Eventos
            </h2>
            <div className={styles.highlightBox}>
              <strong>Importante:</strong> O <strong>Aonde Tem Baile</strong> atua exclusivamente como veículo divulgador e agregador de informações. As informações aqui listadas são extraídas de publicações originais ou cadastradas diretamente por organizadores independentes.
            </div>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                Não realizamos vendas diretas de ingressos e não intermediamos transações financeiras entre participantes e organizadores.
              </li>
              <li className={styles.listItem}>
                Não nos responsabilizamos por alterações na programação, adiamentos, cancelamentos, qualidade dos serviços prestados nos locais ou problemas na realização dos eventos.
              </li>
              <li className={styles.listItem}>
                Recomendamos sempre que os usuários confirmem os detalhes diretamente com a produção responsável ou nos canais oficiais de cada evento antes de se deslocarem.
              </li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span>4.</span> Privacidade e Proteção de Dados (LGPD)
            </h2>
            <p className={styles.paragraph}>
              Respeitamos a sua privacidade e tratamos os seus dados pessoais em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <strong>Dados Coletados:</strong> Coletamos apenas as informações necessárias para criação da conta (nome, e-mail, telefone/WhatsApp, cidade e senha criptografada).
              </li>
              <li className={styles.listItem}>
                <strong>Uso dos Dados:</strong> Os dados de contato informados pelo produtor são utilizados para gerenciamento de acesso e para disponibilizar canais de atendimento aos frequentadores interessados em seus eventos.
              </li>
              <li className={styles.listItem}>
                <strong>Não Compartilhamento:</strong> Não vendemos nem compartilhamos seus dados pessoais com terceiros para fins publicitários não autorizados.
              </li>
            </ul>
          </div>

          {/* Section 5 */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span>5.</span> Propriedade Intelectual
            </h2>
            <p className={styles.paragraph}>
              Todos os elementos visuais, marcas, logotipos, layout e marca registrada <strong>Aonde Tem Baile</strong> são de propriedade exclusiva dos seus criadores. As imagens e marcas registradas relativas aos eventos e bandas pertencem aos seus respectivos organizadores e artistas.
            </p>
          </div>

          {/* Section 6 */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span>6.</span> Alterações nos Termos
            </h2>
            <p className={styles.paragraph}>
              Podemos atualizar estes Termos de Uso periodicamente para refletir melhorias no serviço ou exigências legais. Recomendamos a consulta regular desta página.
            </p>
          </div>

          {/* Section 7 */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span>7.</span> Contato e Suporte
            </h2>
            <p className={styles.paragraph}>
              Se você tiver dúvidas sobre estes termos, quiser reportar um erro em um evento ou solicitar a remoção de conteúdo, entre em contato através dos canais de atendimento oficial no site.
            </p>
          </div>
        </div>

        <div className={styles.footerActions}>
          <Link href="/" className={styles.backBtn}>
            <ArrowLeft size={16} />
            <span>Voltar para a Página Inicial</span>
          </Link>

          <Link href="/cadastro" className="btn-primary" style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}>
            Ir para Cadastro de Produtor
          </Link>
        </div>
      </div>
    </div>
  )
}
