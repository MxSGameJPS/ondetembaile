import { NextRequest, NextResponse } from 'next/server'
import { geocodeLocation } from '@/lib/geocoding/server'

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')?.trim() || ''
  const locationName = request.nextUrl.searchParams.get('locationName')?.trim() || ''
  const city = request.nextUrl.searchParams.get('city')?.trim() || ''
  const state = request.nextUrl.searchParams.get('state')?.trim() || ''

  if (!address && !locationName && !city) {
    return NextResponse.json({ found: false }, { status: 400 })
  }

  try {
    const result = await geocodeLocation({
      address,
      locationName,
      city,
      state,
    })

    if (!result) {
      return NextResponse.json({ found: false })
    }

    return NextResponse.json({
      found: true,
      lat: result.lat,
      lng: result.lng,
      displayName: result.displayName,
    })
  } catch (error) {
    console.error('Erro ao geocodificar localização:', error)
    return NextResponse.json({ found: false })
  }
}
