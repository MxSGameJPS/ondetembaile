import './globals.css'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://aondetembaile.com.br'),
  title: 'Aonde Tem Baile | Divulgação de Eventos e Festas Regionais pelo Brasil',
  description:
    'Encontre e divulgue bailes, festas, shows e eventos regionais perto de você. Plataforma completa para produtores de eventos.',
  keywords: ['baile', 'festas', 'eventos regionais', 'shows', 'aonde tem baile', 'divulgação de eventos'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Navbar />
        <main style={{ flex: 1, minHeight: 'calc(100vh - 70px)' }}>{children}</main>
        <footer
          style={{
            borderTop: '1px solid rgba(245, 158, 11, 0.2)',
            background: 'radial-gradient(circle at top center, rgba(242, 106, 0, 0.22) 0%, rgba(17, 17, 17, 1) 75%)',
            padding: '2rem 1.5rem',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '0.85rem',
          }}
        >
          <div className="container">
            <p style={{ color: '#d1d5db', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              🪩 Aonde Tem Baile — O portal de eventos regionais do Brasil
            </p>
            <p>
              © {new Date().getFullYear()} Aonde Tem Baile. Todos os direitos reservados.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
              <Link href="/quemsomos" style={{ color: '#f59e0b', textDecoration: 'none' }}>
                Quem somos
              </Link>
              <Link href="/contato-e-suporte" style={{ color: '#f59e0b', textDecoration: 'none' }}>
                Contato e Suporte
              </Link>
              <Link href="/termos-de-uso" style={{ color: '#f59e0b', textDecoration: 'none' }}>
                Termos de Uso e Privacidade
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}