import type { Metadata } from 'next'
import HomePageClient from './HomePageClient'
import { SITE_URL } from '@/lib/seo'

export const metadata: Metadata = {
  alternates: {
    canonical: `${SITE_URL}/`,
  },
}

export default function HomePage() {
  return <HomePageClient />
}