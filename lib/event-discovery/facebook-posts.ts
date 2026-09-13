import type { ApifyFacebookPost } from '@/lib/apify/facebook-posts'
import type { GroqEventCandidate } from '@/lib/event-discovery/groq'

function clean(value: string | undefined | null, maxLength: number) {
  return (value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function attachmentText(post: ApifyFacebookPost) {
  return (post.attachments ?? [])
    .map((attachment) => clean(attachment.accessibilityCaption, 700))
    .filter(Boolean)
    .slice(0, 2)
    .join(' ')
}

function combinedText(post: ApifyFacebookPost) {
  return clean([post.postText || '', attachmentText(post)].filter(Boolean).join(' '), 1600)
}

function firstImage(post: ApifyFacebookPost) {
  const attachment = (post.attachments ?? []).find((item) => {
    if (!item.url) return false

    try {
      const url = new URL(item.url)
      return url.protocol === 'https:' || url.protocol === 'http:'
    } catch {
      return false
    }
  })

  return attachment?.url || null
}

function candidateTitle(post: ApifyFacebookPost, text: string) {
  const firstSentence = text
    .split(/(?:\n|[.!?]\s)/)
    .map((part) => part.trim())
    .find((part) => part.length >= 8)

  if (firstSentence) {
    return firstSentence.slice(0, 140)
  }

  const author = clean(post.author?.name, 100)
  return author ? `Post de ${author}` : 'Post do Facebook para revisão'
}

function normalizeFacebookUrl(value?: string) {
  if (!value) return ''

  try {
    const url = new URL(value)
    url.hash = ''
    return url.toString()
  } catch {
    return value.trim()
  }
}

function publishedAt(timestamp?: number) {
  if (!timestamp || !Number.isFinite(timestamp)) return null

  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function mapFacebookPostsToReviewCandidates(input: {
  posts: ApifyFacebookPost[]
  city: string
  state?: string
}) {
  const seen = new Set<string>()
  const candidates: GroqEventCandidate[] = []

  for (const post of input.posts) {
    const sourceUrl = normalizeFacebookUrl(post.url)
    if (!sourceUrl || seen.has(sourceUrl)) continue
    seen.add(sourceUrl)

    const text = combinedText(post)
    const author = clean(post.author?.name, 180) || 'Facebook'

    candidates.push({
      title: candidateTitle(post, text),
      description:
        text ||
        'Post encontrado pela Apify. Abra a fonte e complete os dados antes de publicar.',
      event_date: null as unknown as string,
      location_name: null,
      address: [input.city, input.state].filter(Boolean).join(', '),
      city: clean(input.city, 100),
      state: clean(input.state, 30).toUpperCase() || null,
      category_name: null,
      image_url: firstImage(post),
      ticket_price: null,
      whatsapp_info: null,
      source_url: sourceUrl,
      source_domain: 'facebook.com',
      source_type: 'facebook',
      source_title: author,
      source_snippet:
        text ||
        'Post encontrado pela Apify. Conteúdo não estruturado; revisão manual necessária.',
      confidence: 25,
      raw_data: {
        discovery_engine: 'apify-facebook-posts-manual-review',
        apify_post_id: post.postId || null,
        apify_author: author,
        apify_published_at: publishedAt(post.timestamp),
        apify_reactions_count: post.reactionsCount ?? null,
        apify_comments_count: post.commentsCount ?? null,
        review_required: true,
        city_source: 'admin_search',
      },
    })
  }

  return {
    candidates,
    queuedPosts: candidates.length,
  }
}
