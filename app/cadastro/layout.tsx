import type { Metadata } from 'next'
import { DEFAULT_OG_IMAGE, SITE_URL } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Divulgue seu evento gratuitamente',
  description:
    'Cadastre-se como produtor no Aonde Tem Baile e envie bailes, festas, shows e eventos regionais para divulgação.',
  alternates: {
    canonical: `${SITE_URL}/cadastro`,
  },
  openGraph: {
    title: 'Divulgue seu evento gratuitamente | Aonde Tem Baile',
    description:
      'Cadastre-se como produtor e envie seu evento para divulgação no Aonde Tem Baile.',
    url: `${SITE_URL}/cadastro`,
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Aonde Tem Baile',
    images: [{ url: DEFAULT_OG_IMAGE, alt: 'Divulgue seu evento — Aonde Tem Baile' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Divulgue seu evento gratuitamente | Aonde Tem Baile',
    description:
      'Cadastre-se como produtor e envie seu evento para divulgação no Aonde Tem Baile.',
    images: [DEFAULT_OG_IMAGE],
  },
}

export default function CadastroLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children
}
