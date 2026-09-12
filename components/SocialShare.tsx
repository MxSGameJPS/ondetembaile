'use client'

import { useState } from 'react'
import { Share2, Check, Copy } from 'lucide-react'
import styles from './SocialShare.module.css'

interface SocialShareProps {
  title: string
  url: string
  image?: string
}

export default function SocialShare({ title, url }: SocialShareProps) {
  const [copied, setCopied] = useState(false)

  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(`Confira o evento "${title}" no Aonde Tem Baile: ${url}`)

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank')
  }

  const shareWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank')
  }

  const shareInstagram = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
    alert('Link copiado com sucesso! Você pode colá-lo no seu Story ou mensagem do Instagram.')
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Share2 size={18} color="#f59e0b" />
        <span>Compartilhar este Evento</span>
      </div>

      <div className={styles.grid}>
        {/* WhatsApp */}
        <button onClick={shareWhatsApp} className={styles.btnWhatsapp}>
          <span>WhatsApp</span>
        </button>

        {/* Facebook */}
        <button onClick={shareFacebook} className={styles.btnFacebook}>
          <span>Facebook</span>
        </button>

        {/* Instagram */}
        <button onClick={shareInstagram} className={styles.btnInstagram}>
          <span>Instagram</span>
        </button>

        {/* Copy Link */}
        <button onClick={copyToClipboard} className={styles.btnCopy}>
          {copied ? (
            <>
              <Check size={14} color="#10b981" />
              <span style={{ color: '#10b981' }}>Copiado!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copiar Link</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
