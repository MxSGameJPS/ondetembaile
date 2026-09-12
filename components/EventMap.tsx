'use client'

import { useEffect, useState } from 'react'
import { MapPin, ExternalLink } from 'lucide-react'
import styles from './EventMap.module.css'

interface EventMapProps {
  address: string
  locationName?: string
  latitude?: number | null
  longitude?: number | null
}

export default function EventMap({ address, locationName, latitude, longitude }: EventMapProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  )
  const [loadingGeocode, setLoadingGeocode] = useState(false)

  useEffect(() => {
    setIsMounted(true)

    if (!latitude || !longitude) {
      setLoadingGeocode(true)
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.length > 0) {
            setCoords({
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
            })
          } else {
            // Default Brazil center fallback
            setCoords({ lat: -14.235, lng: -51.9253 })
          }
        })
        .catch(() => {
          setCoords({ lat: -14.235, lng: -51.9253 })
        })
        .finally(() => setLoadingGeocode(false))
    }
  }, [address, latitude, longitude])

  const googleMapsUrl = coords
    ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

  if (!isMounted) return null

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.locationInfo}>
          <div className={styles.pinIconBox}>
            <MapPin size={18} />
          </div>
          <div>
            <h3 className={styles.locationTitle}>{locationName || 'Localização do Evento'}</h3>
            <p className={styles.locationAddress}>{address}</p>
          </div>
        </div>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.googleMapsBtn}
        >
          <span>Abrir no Google Maps</span>
          <ExternalLink size={14} />
        </a>
      </div>

      <div className={styles.mapFrame}>
        {loadingGeocode ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
            Carregando mapa...
          </div>
        ) : coords ? (
          <iframe
            title="Mapa do Evento"
            className={styles.mapIframe}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.01}%2C${coords.lat - 0.01}%2C${coords.lng + 0.01}%2C${coords.lat + 0.01}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
            Endereço: {address}
          </div>
        )}
      </div>
    </div>
  )
}
