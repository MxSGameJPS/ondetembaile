'use client'

import React from 'react'

interface BrandLogoProps {
  showSlogan?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'horizontal' | 'full' | 'symbol'
}

export default function BrandLogo({ showSlogan = true, size = 'md', variant = 'full' }: BrandLogoProps) {
  const height = size === 'sm' ? 36 : size === 'lg' ? 68 : 48

  let logoSrc = '/logos/Logo_02_Fundo_Escuro_Transparente.png'
  if (variant === 'horizontal' || !showSlogan) {
    logoSrc = '/logos/Logo_03_Horizontal_Transparente.png'
  } else if (variant === 'symbol') {
    logoSrc = '/logos/Logo_05_Simbolo_Transparente.png'
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
      <img
        src={logoSrc}
        alt="Aonde Tem Baile - A Diversão começa aqui"
        style={{
          height: `${height}px`,
          width: 'auto',
          objectFit: 'contain',
          display: 'block',
        }}
        onError={(e) => {
          // Fallback SVG if image not found
          (e.target as HTMLElement).style.display = 'none'
        }}
      />
    </div>
  )
}
