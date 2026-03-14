'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { GoogleMap, Marker, Polyline, useJsApiLoader, Libraries } from '@react-google-maps/api'

const libraries: Libraries = ['places']

const containerStyle = {
    width: '100%',
    height: '250px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
}

const defaultCenter = {
    lat: 20,
    lng: 0
}

interface MapComponentProps {
    portLoad: string
    portDest: string
    etd?: string
    eta?: string
}

export default function MapComponent({ portLoad, portDest, etd, eta }: MapComponentProps) {
    const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

    // Fallback if no key
    if (!MAPS_KEY) {
        return null // Silent hide or show message
    }

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: MAPS_KEY,
        libraries,
        version: "weekly"
    })

    const [origin, setOrigin] = useState<google.maps.LatLngLiteral | null>(null)
    const [destination, setDestination] = useState<google.maps.LatLngLiteral | null>(null)
    const [map, setMap] = useState<google.maps.Map | null>(null)
    const [apiHasError, setApiHasError] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Detect auth failure
    useEffect(() => {
        if (!mounted) return

        const authListener = window.google?.maps?.event?.addDomListener(window, 'gm_authFailure', () => {
            console.warn('MapComponent: Google Maps authentication failure.')
            setApiHasError(true)
        })
        return () => {
            if (window.google?.maps?.event) {
                window.google.maps.event.removeListener(authListener)
            }
        }
    }, [isLoaded, mounted])

    if (loadError || apiHasError) {
        return (
            <div className="h-[250px] w-full bg-slate-800/50 border border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                <span style={{ fontSize: '24px' }}>📍</span>
                <span>Visualización de mapa no disponible</span>
            </div>
        )
    }

    // Geocoding effect
    useEffect(() => {
        if (!isLoaded || !window.google || apiHasError || !mounted) return

        const geocoder = new window.google.maps.Geocoder()

        if (portLoad) {
            geocoder.geocode({ address: portLoad }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    const location = results[0].geometry.location
                    setOrigin({ lat: location.lat(), lng: location.lng() })
                }
            })
        } else {
            setOrigin(null)
        }

        if (portDest) {
            geocoder.geocode({ address: portDest }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    const location = results[0].geometry.location
                    setDestination({ lat: location.lat(), lng: location.lng() })
                }
            })
        } else {
            setDestination(null)
        }
    }, [isLoaded, portLoad, portDest, apiHasError, mounted])

    // Fit bounds effect
    useEffect(() => {
        if (map && (origin || destination) && mounted) {
            const bounds = new window.google.maps.LatLngBounds()
            if (origin) bounds.extend(origin)
            if (destination) bounds.extend(destination)

            // If only one point, zoom out a bit or set center
            if (!origin || !destination) {
                map.setCenter(origin || destination!)
                map.setZoom(5)
            } else {
                map.fitBounds(bounds)
            }
        }
    }, [map, origin, destination, mounted])

    const polylinePath = useMemo(() => {
        if (!origin || !destination) return []
        return [origin, destination]
    }, [origin, destination])

    const polylineOptions = useMemo(() => {
        if (!isLoaded || !window.google || !mounted) return undefined
        return {
            strokeColor: '#3B82F6',
            strokeOpacity: 0.8,
            strokeWeight: 4,
            geodesic: true,
            icons: [{
                icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3 },
                offset: '50%'
            }]
        }
    }, [isLoaded, mounted])

    if (!isLoaded || !mounted) {
        return <div className="h-[250px] w-full bg-slate-800/30 animate-pulse rounded-xl flex items-center justify-center text-slate-500">Cargando mapa...</div>
    }

    return (
        <div style={{ position: 'relative' }}>
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={defaultCenter}
                zoom={2}
                onLoad={setMap}
                options={{
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: true,
                    styles: [
                        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                        {
                            featureType: "water",
                            elementType: "geometry",
                            stylers: [{ color: "#17263c" }],
                        },
                    ]
                }}
            >
                {origin && <Marker position={origin} title="Puerto de Carga" label="A" />}
                {destination && <Marker position={destination} title="Puerto de Destino" label="D" />}

                {origin && destination && polylineOptions && (
                    <Polyline
                        path={polylinePath}
                        options={polylineOptions}
                    />
                )}
            </GoogleMap>

            {/* ETD/ETA Overlay */}
            {mounted && (etd || eta) && (
                <div style={{
                    position: 'absolute',
                    bottom: '24px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(15, 23, 42, 0.9)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '8px 16px',
                    borderRadius: '24px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    display: 'flex',
                    gap: '16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#e2e8f0',
                    zIndex: 10
                }}>
                    {etd && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ETD</span>
                            <span>{new Date(etd).toLocaleDateString()}</span>
                        </div>
                    )}
                    {etd && eta && <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)' }}></div>}
                    {eta && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ETA</span>
                            <span>{new Date(eta).toLocaleDateString()}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
