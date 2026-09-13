import React from 'react'

interface BrandLogoProps {
  showSlogan?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function BrandLogo({ showSlogan = true, size = 'md' }: BrandLogoProps) {
  const iconSize = size === 'sm' ? 36 : size === 'lg' ? 56 : 46
  const titleSize = size === 'sm' ? '1rem' : size === 'lg' ? '1.75rem' : '1.35rem'
  const sloganSize = size === 'sm' ? '0.65rem' : size === 'lg' ? '0.85rem' : '0.75rem'

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
      
      {/* Official Map Pin Symbol with Dancing Couple */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 100 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0px 4px 10px rgba(242, 106, 0, 0.3))' }}
      >
        {/* Outer Pin Body */}
        <path
          d="M50 5C25.1472 5 5 25.1472 5 50C5 78.5 50 115 50 115C50 115 95 78.5 95 50C95 25.1472 74.8528 5 50 5Z"
          fill="#F26A00"
        />
        {/* Inner Dark Circle */}
        <circle cx="50" cy="48" r="35" fill="#111111" />
        
        {/* Energy Rays above dancing couple */}
        <line x1="50" y1="22" x2="50" y2="28" stroke="#F26A00" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="38" y1="26" x2="42" y2="31" stroke="#F26A00" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="62" y1="26" x2="58" y2="31" stroke="#F26A00" strokeWidth="3.5" strokeLinecap="round" />

        {/* Dancing Man Silhouette */}
        <circle cx="38" cy="40" r="4" fill="#F26A00" />
        <path d="M38 45C32 46 26 50 25 58M38 45L40 68M38 45C41 49 46 54 48 60" stroke="#F26A00" strokeWidth="3.5" strokeLinecap="round" />

        {/* Dancing Woman Silhouette */}
        <circle cx="62" cy="40" r="4" fill="#F26A00" />
        <path d="M62 45C68 47 74 50 75 58M62 45L60 55L64 68M62 45C58 49 53 53 52 60" stroke="#F26A00" strokeWidth="3.5" strokeLinecap="round" />

        {/* Dynamic Curved Swoosh at bottom of pin */}
        <path d="M12 55C30 75 70 75 88 55" stroke="#F26A00" strokeWidth="3" fill="none" opacity="0.4" />
      </svg>

      {/* Brand Typography */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontStyle: 'italic',
            fontWeight: 900,
            fontSize: titleSize,
            color: '#FFFFFF',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
          }}
        >
          AONDE TEM <span style={{ color: '#F26A00' }}>BAILE</span>
        </div>

        {showSlogan && (
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: sloganSize,
              fontWeight: 500,
              color: '#D9D9D9',
              letterSpacing: '0.01em',
              marginTop: '2px',
            }}
          >
            A Diversão começa aqui
          </div>
        )}
      </div>

    </div>
  )
}
