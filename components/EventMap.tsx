'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapPin, ExternalLink } from 'lucide-react'
import styles from './EventMap.module.css'

interface EventMapProps {
  address: string
  locationName?: string
  city?: string
  state?: string
  latitude?: number | null
  longitude?: number | null
}

const LEGACY_BRAZIL_CENTER = { lat: -14.235, lng: -51.9253 }

function validCoordinatePair(latitude?: number | null, longitude?: number | null) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false

  const lat = Number(latitude)
  const lng = Number(longitude)

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false

  const isLegacyFallback =
    Math.abs(lat - LEGACY_BRAZIL_CENTER.lat) < 0.0001 &&
    Math.abs(lng - LEGACY_BRAZIL_CENTER.lng) < 0.0001

  return !isLegacyFallback
}

export default function EventMap({
  address,
  locationName,
  city,
  state,
  latitude,
  longitude,
}: EventMapProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [loadingGeocode, setLoadingGeocode] = useState(false)
  const [geocodeFailed, setGeocodeFailed] = useState(false)

  const addressQuery = useMemo(
    () =>
      [address, city, state, 'Brasil']
        .map((value) => value?.trim())
        .filter(Boolean)
        .join(', '),
    [address, city, state]
  )

  useEffect(() => {
    setIsMounted(true)

    const controller = new AbortController()

    async function resolveCoordinates() {
      setLoadingGeocode(true)
      setGeocodeFailed(false)
      setCoords(null)

      try {
        const params = new URLSearchParams()
        if (address) params.set('address', address)
        if (locationName) params.set('locationName', locationName)
        if (city) params.set('city', city)
        if (state) params.set('state', state)

        if (address || locationName) {
          const response = await fetch(`/api/geocode?${params.toString()}`, {
            signal: controller.signal,
            cache: 'no-store',
          })
          const data = await response.json().catch(() => null)

          if (
            response.ok &&
            data?.found === true &&
            Number.isFinite(data.lat) &&
            Number.isFinite(data.lng)
          ) {
            setCoords({ lat: data.lat, lng: data.lng })
            return
          }
        }

        if (validCoordinatePair(latitude, longitude)) {
          setCoords({ lat: Number(latitude), lng: Number(longitude) })
          return
        }

        setGeocodeFailed(true)
      } catch (error) {
        if (controller.signal.aborted) return

        if (validCoordinatePair(latitude, longitude)) {
          setCoords({ lat: Number(latitude), lng: Number(longitude) })
          return
        }

        console.error('Erro ao carregar coordenadas do evento:', error)
        setGeocodeFailed(true)
      } finally {
        if (!controller.signal.aborted) {
          setLoadingGeocode(false)
        }
      }
    }

    resolveCoordinates()

    return () => controller.abort()
  }, [address, locationName, city, state, latitude, longitude])

  const mapQuery = addressQuery || address || locationName || ''
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    mapQuery
  )}`
  const googleMapsEmbedUrl = mapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=16&output=embed`
    : ''

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
            Localizando endereço...
          </div>
        ) : coords ? (
          <iframe
            title="Mapa do Evento"
            className={styles.mapIframe}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.01}%2C${coords.lat - 0.01}%2C${coords.lng + 0.01}%2C${coords.lat + 0.01}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`}
          />
        ) : googleMapsEmbedUrl ? (
          <iframe
            title="Mapa do Evento no Google Maps"
            className={styles.mapIframe}
            src={googleMapsEmbedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.85rem', padding: '1rem', textAlign: 'center' }}>
            <MapPin size={22} />
            <span>
              {geocodeFailed
                ? 'Não foi possível confirmar este endereço no mapa automaticamente.'
                : 'Localização ainda não disponível.'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
