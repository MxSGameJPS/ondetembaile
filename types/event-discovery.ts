export type DiscoverySource = 'web' | 'reddit' | 'facebook' | 'sympla' | 'roleagora'

export type DiscoveryCandidateStatus = 'pending' | 'approved' | 'rejected'

export interface DiscoverEventsInput {
  city: string
  state?: string
  periodDays: number
  sources: DiscoverySource[]
}

export interface ImportFacebookEventInput {
  url: string
  city: string
  state?: string
  periodDays: number
}

export interface ImportSymplaEventInput {
  url: string
  city: string
  state?: string
  periodDays: number
}

export interface ImportRoleAgoraEventInput {
  url: string
  city: string
  state?: string
  periodDays: number
}

export interface EventDiscoveryCandidate {
  id: string
  title: string
  description: string | null
  event_date: string | null
  location_name: string | null
  address: string | null
  city: string
  state: string | null
  category_name: string | null
  image_url: string | null
  ticket_price: string | null
  whatsapp_info: string | null
  source_url: string
  source_domain: string | null
  source_type: DiscoverySource
  source_title: string | null
  source_snippet: string | null
  confidence: number
  status: DiscoveryCandidateStatus
  raw_data?: Record<string, unknown> | null
  found_at: string
  reviewed_at?: string | null
  reviewed_by?: string | null
  rejection_reason?: string | null
}

export interface UpdateDiscoveryCandidateInput {
  title?: string
  description?: string | null
  event_date?: string | null
  location_name?: string | null
  address?: string | null
  city?: string
  state?: string | null
  category_name?: string | null
  image_url?: string | null
  ticket_price?: string | null
  whatsapp_info?: string | null
}
