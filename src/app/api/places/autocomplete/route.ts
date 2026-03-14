import { NextResponse } from 'next/server'

/**
 * Server-side proxy for Google Places Autocomplete API.
 * Avoids CORS issues and keeps the API key server-only.
 * GET /api/places/autocomplete?input=Buenos%20Aires
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const input = searchParams.get('input')?.trim()

    if (!input || input.length < 2) {
        return NextResponse.json({ predictions: [] })
    }

    const MAPS_KEY = process.env.GOOGLE_MAPS_KEY
    if (!MAPS_KEY) {
        return NextResponse.json(
            { error: 'GOOGLE_MAPS_KEY not configured' },
            { status: 500 }
        )
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
    url.searchParams.set('input', input)
    url.searchParams.set('key', MAPS_KEY)
    url.searchParams.set('language', 'es')
    url.searchParams.set('types', 'address')

    try {
        const res = await fetch(url.toString(), {
            next: { revalidate: 0 }
        })
        const data = await res.json()

        if (data.status === 'REQUEST_DENIED') {
            console.error('[Places API] Request denied:', data.error_message)
            return NextResponse.json(
                { error: data.error_message || 'API key denied' },
                { status: 403 }
            )
        }

        const predictions = (data.predictions || []).map((p: any) => ({
            placeId: p.place_id,
            description: p.description,
            mainText: p.structured_formatting?.main_text || p.description,
            secondaryText: p.structured_formatting?.secondary_text || '',
        }))

        return NextResponse.json({ predictions })
    } catch (error: any) {
        console.error('[Places API] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
