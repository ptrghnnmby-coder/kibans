import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const placeId = searchParams.get('placeId')

    if (!placeId) {
        return NextResponse.json({ success: false, error: 'Missing placeId' }, { status: 400 })
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
        return NextResponse.json({ success: false, error: 'Server Start Error: Missing Maps API Key' }, { status: 500 })
    }

    try {
        // Fetch Place Details from Google Maps API with language=en
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,address_components&language=en&key=${apiKey}`

        const response = await fetch(url)
        const data = await response.json()

        if (data.status !== 'OK') {
            return NextResponse.json({ success: false, error: data.error_message || 'Google Maps API Error' }, { status: 500 })
        }

        const result = data.result
        const englishName = result.formatted_address

        // Optional: reconstruct to "City, Country" if formatted_address is too long
        // But usually formatted_address is what we want (e.g. "Barcelona, Spain")

        return NextResponse.json({
            success: true,
            address: englishName,
            components: result.address_components
        })

    } catch (error) {
        console.error('Geocoding error:', error)
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}
