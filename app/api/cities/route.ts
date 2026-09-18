import { NextRequest, NextResponse } from 'next/server'

interface IbgeCity {
  nome?: string
  microrregiao?: {
    mesorregiao?: {
      UF?: {
        sigla?: string
      }
    }
  }
  'regiao-imediata'?: {
    'regiao-intermediaria'?: {
      UF?: {
        sigla?: string
      }
    }
  }
}

interface CitySuggestion {
  name: string
  state: string
  label: string
}

const IBGE_CITIES_URL =
  'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome'

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function getState(city: IbgeCity) {
  return (
    city.microrregiao?.mesorregiao?.UF?.sigla ||
    city['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla ||
    ''
  )
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() || ''

  if (query.length < 2) {
    return NextResponse.json({ cities: [] satisfies CitySuggestion[] })
  }

  try {
    const response = await fetch(IBGE_CITIES_URL, {
      headers: {
        Accept: 'application/json',
      },
      next: {
        revalidate: 86400,
      },
    })

    if (!response.ok) {
      throw new Error(`IBGE respondeu com status ${response.status}`)
    }

    const cities = (await response.json()) as IbgeCity[]
    const normalizedQuery = normalize(query)

    const ranked = cities
      .map((city) => {
        const name = city.nome?.trim()
        const state = getState(city)

        if (!name || !state) return null

        const normalizedName = normalize(name)
        const startsWith = normalizedName.startsWith(normalizedQuery)
        const includes = normalizedName.includes(normalizedQuery)

        if (!startsWith && !includes) return null

        return {
          suggestion: {
            name,
            state,
            label: `${name} - ${state}`,
          },
          priority: startsWith ? 0 : 1,
        }
      })
      .filter(
        (
          item
        ): item is {
          suggestion: CitySuggestion
          priority: number
        } => Boolean(item)
      )
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        return a.suggestion.name.localeCompare(b.suggestion.name, 'pt-BR')
      })
      .slice(0, 8)
      .map((item) => item.suggestion)

    return NextResponse.json(
      { cities: ranked },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
        },
      }
    )
  } catch (error) {
    console.error('Erro ao buscar sugestões de cidades no IBGE:', error)

    return NextResponse.json(
      { cities: [] satisfies CitySuggestion[] },
      { status: 502 }
    )
  }
}
