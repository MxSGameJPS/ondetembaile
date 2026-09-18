import './globals.css'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  DEFAULT_LOGO,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_URL,
  jsonLd,
} from '@/lib/seo'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Aonde Tem Baile | Eventos, bailes, festas e shows perto de vocÃª',
    template: '%s | Aonde Tem Baile',
  },
  description:
    'Descubra bailes, festas, shows e eventos regionais perto de vocÃª. Consulte datas, locais e informaÃ§Ãµes dos prÃ³ximos eventos da sua cidade.',
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  keywords: [
    'eventos perto de mim',
    'eventos hoje',
    'eventos fim de semana',
    'bailes',
    'festas',
    'shows',
    'eventos regionais',
    'agenda de eventos',
    'aonde tem baile',
    'divulgaÃ§Ã£o de eventos',
  ],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'Aonde Tem Baile | Eventos, bailes, festas e shows perto de vocÃª',
    description:
      'Descubra eventos da sua cidade: bailes, festas, shows e programaÃ§Ã£o regional em um sÃ³ lugar.',
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        alt: 'Aonde Tem Baile â€” eventos, festas, bailes e shows',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aonde Tem Baile | Eventos perto de vocÃª',
    description:
      'Descubra bailes, festas, shows e eventos regionais da sua cidade.',
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : {}),
    other: {
      ...(process.env.BING_SITE_VERIFICATION
        ? { 'msvalidate.01': process.env.BING_SITE_VERIFICATION }
        : {}),
    },
  },
  pinterest: {
    richPin: true,
  },
  icons: {
    icon: '/logos/Logo_05_Simbolo_Transparente.png',
    apple: '/logos/Logo_01_Principal_Transparente.png',
  },
}

const siteSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: DEFAULT_LOGO,
      },
      description:
        'Portal brasileiro para descobrir e divulgar bailes, festas, shows e eventos regionais.',
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      inLanguage: 'pt-BR',
      publisher: {
        '@id': `${SITE_URL}/#organization`,
      },
    },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(siteSchema) }}
        />
        <Navbar />
        <main style={{ flex: 1, minHeight: 'calc(100vh - 70px)' }}>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
