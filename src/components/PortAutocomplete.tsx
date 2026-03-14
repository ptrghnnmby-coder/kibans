'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin } from 'lucide-react'
import { useJsApiLoader, Libraries } from '@react-google-maps/api'

const libraries: Libraries = ['places']

// Detect key once at module level to avoid runtime re-checks
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

// Global flag to track if Maps API has failed authenticated once (e.g. RefererNotAllowed)
// This helps other components skip trying to load it and failing.
let globalMapsHasError = false

interface PortAutocompleteProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    label?: string
}

// Plain text fallback — used when Maps API is unavailable
function PlainPortInput({ value, onChange, placeholder, label }: PortAutocompleteProps) {
    return (
        <div className="input-group">
            {label && <label className="input-label">{label}</label>}
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    className="input"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    style={{ paddingRight: '30px', position: 'relative', zIndex: 10, background: 'var(--surface)' }}
                />
                <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 11 }}>
                    <MapPin size={16} className="text-gray-400" />
                </div>
            </div>
            <style jsx>{`
                .input-group :global(.gm-err-container) { display: none !important; }
                .input-group :global(.gm-err-content) { display: none !important; }
                .input-group :global(.gm-err-icon) { display: none !important; }
                .input :disabled { background: var(--surface) !important; color: white !important; cursor: text !important; }
            `}</style>
        </div>
    )
}

export function PortAutocomplete({ value, onChange, placeholder, label }: PortAutocompleteProps) {
    // If no API key is configured OR we already detected a global error, skip loading Maps entirely
    if (!MAPS_KEY || globalMapsHasError) {
        return <PlainPortInput value={value} onChange={onChange} placeholder={placeholder} label={label} />
    }

    return <PortAutocompleteWithMaps value={value} onChange={onChange} placeholder={placeholder} label={label} />
}

// Inner component that loads Maps only when a key is available
function PortAutocompleteWithMaps({ value, onChange, placeholder, label }: PortAutocompleteProps) {
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: MAPS_KEY,
        libraries,
        version: "weekly"
    })

    const inputRef = useRef<HTMLInputElement>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [inputValue, setInputValue] = useState(value)
    const [apiHasError, setApiHasError] = useState(globalMapsHasError)

    // Safety timeout: If after 2s it's not loaded or has error markers, force plain input
    useEffect(() => {
        if (isLoaded && !(window as any).gm_authFailure) return;

        const checkError = () => {
            if ((window as any).gm_authFailure) {
                console.warn('Immediate GM auth failure detected.')
                globalMapsHasError = true
                setApiHasError(true)
                return true
            }
            return false
        }

        if (checkError()) return;

        const timer = setTimeout(() => {
            if (!isLoaded || (window as any).gm_authFailure) {
                console.warn('Google Maps load timeout or auth failure detected. Falling back to plain input.')
                globalMapsHasError = true
                setApiHasError(true)
            }
        }, 2000)
        return () => clearTimeout(timer)
    }, [isLoaded])

    useEffect(() => {
        setInputValue(value)
    }, [value])

    const onChangeRef = useRef(onChange)
    useEffect(() => {
        onChangeRef.current = onChange
    }, [onChange])

    // If API key is present but Maps fails to load or we detect an error
    if (loadError || apiHasError) {
        return <PlainPortInput value={value} onChange={onChange} placeholder={placeholder} label={label} />
    }

    useEffect(() => {
        if (!isLoaded || !inputRef.current || !window.google) return

        try {
            // Check for existing error markers if the API loaded but something is wrong
            if ((window as any).gm_authFailure) {
                globalMapsHasError = true
                setApiHasError(true)
                return
            }

            const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
                types: ['geocode'],
                fields: ['place_id', 'formatted_address', 'name']
            })

            console.log('PortAutocomplete: Initialized for', label)

            // Add listener for GMaps specific auth errors
            const authListener = window.google.maps.event.addDomListener(window, 'gm_authFailure', () => {
                console.warn('Google Maps authentication failure detected.')
                globalMapsHasError = true
                setApiHasError(true)
            })

            const listener = autocomplete.addListener('place_changed', async () => {
                const place = autocomplete.getPlace()

                if (place.place_id) {
                    setIsLoading(true)
                    try {
                        const res = await fetch(`/api/geo/place-details?placeId=${place.place_id}`)
                        const data = await res.json()

                        if (data.success && data.address) {
                            onChangeRef.current(data.address)
                            setInputValue(data.address)
                        } else {
                            const fallbackParams = place.formatted_address || place.name || ''
                            onChangeRef.current(fallbackParams)
                            setInputValue(fallbackParams)
                        }
                    } catch (error) {
                        console.error('Error normalizing address:', error)
                        const fallbackParams = place.formatted_address || place.name || ''
                        onChangeRef.current(fallbackParams)
                        setInputValue(fallbackParams)
                    } finally {
                        setIsLoading(false)
                    }
                } else {
                    const val = inputRef.current?.value || ''
                    onChangeRef.current(val)
                    setInputValue(val)
                }
            })

            return () => {
                if (window.google) {
                    window.google.maps.event.clearInstanceListeners(autocomplete)
                    window.google.maps.event.removeListener(authListener)
                }
            }
        } catch (err) {
            console.error('Error initializing Autocomplete:', err)
            setApiHasError(true)
        }
    }, [isLoaded])

    return (
        <div className="input-group">
            {label && <label className="input-label">{label}</label>}
            <div style={{ position: 'relative' }}>
                <input
                    ref={inputRef}
                    type="text"
                    className="input"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value)
                        onChange(e.target.value)
                    }}
                    placeholder={placeholder}
                    disabled={isLoading || !isLoaded}
                    style={{ paddingRight: '30px', opacity: (isLoading || !isLoaded) ? 0.7 : 1 }}
                />
                <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    {isLoading || !isLoaded ? (
                        <div className="spinner" style={{ width: 14, height: 14, border: '2px solid var(--text-muted)', borderTopColor: 'transparent' }}></div>
                    ) : (
                        <MapPin size={16} className="text-gray-400" />
                    )}
                </div>
            </div>
            {isLoading && <div style={{ fontSize: '10px', color: 'var(--accent)', marginTop: '4px' }}>Normalizando a inglés...</div>}
        </div>
    )
}
