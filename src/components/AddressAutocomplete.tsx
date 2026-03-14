'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Loader2, X } from 'lucide-react'

interface Prediction {
    placeId: string
    description: string
    mainText: string
    secondaryText: string
}

interface AddressAutocompleteProps {
    value: string
    onChangeAddress: (value: string) => void
    onChangeCountry?: (country: string) => void
    placeholder?: string
    label?: string
}

export function AddressAutocomplete({
    value,
    onChangeAddress,
    onChangeCountry,
    placeholder = 'Empezá a escribir la dirección...',
    label,
}: AddressAutocompleteProps) {
    const [inputValue, setInputValue] = useState(value || '')
    const [predictions, setPredictions] = useState<Prediction[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [highlightedIdx, setHighlightedIdx] = useState(-1)

    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<NodeJS.Timeout | null>(null)

    // Sync external value changes (edit mode)
    useEffect(() => {
        if (value !== inputValue) setInputValue(value || '')
    }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const fetchPredictions = useCallback(async (query: string) => {
        if (query.length < 3) {
            setPredictions([])
            setIsOpen(false)
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(query)}`)
            const data = await res.json()

            if (data.error) {
                setError(data.error)
                setPredictions([])
            } else {
                setPredictions(data.predictions || [])
                setIsOpen((data.predictions || []).length > 0)
            }
        } catch (err) {
            setError('No se pudo contactar el servicio de autocompletado')
            setPredictions([])
        } finally {
            setIsLoading(false)
        }
    }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setInputValue(val)
        onChangeAddress(val) // keep parent in sync as user types

        // Debounce API call
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => fetchPredictions(val), 320)
    }

    const handleSelect = async (prediction: Prediction) => {
        setInputValue(prediction.description)
        onChangeAddress(prediction.description)
        setPredictions([])
        setIsOpen(false)
        setHighlightedIdx(-1)

        // Extract country from description (last part after last comma)
        if (onChangeCountry) {
            const parts = prediction.description.split(',')
            const countryName = parts[parts.length - 1].trim()
            if (countryName) onChangeCountry(countryName)
        }
    }

    const handleClear = () => {
        setInputValue('')
        onChangeAddress('')
        setPredictions([])
        setIsOpen(false)
        inputRef.current?.focus()
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen || predictions.length === 0) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlightedIdx(i => Math.min(i + 1, predictions.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlightedIdx(i => Math.max(i - 1, 0))
        } else if (e.key === 'Enter' && highlightedIdx >= 0) {
            e.preventDefault()
            handleSelect(predictions[highlightedIdx])
        } else if (e.key === 'Escape') {
            setIsOpen(false)
        }
    }

    return (
        <div className="input-group" style={{ gridColumn: 'span 2', position: 'relative' }} ref={containerRef}>
            {label && <label className="input-label">{label}</label>}

            <div style={{ position: 'relative' }}>
                {/* Pin icon */}
                <MapPin
                    size={16}
                    style={{
                        position: 'absolute', left: '12px', top: '50%',
                        transform: 'translateY(-50%)', color: 'var(--accent)',
                        zIndex: 1, pointerEvents: 'none', flexShrink: 0,
                    }}
                />

                <input
                    ref={inputRef}
                    type="text"
                    className="input"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (predictions.length > 0) setIsOpen(true)
                    }}
                    placeholder={placeholder}
                    autoComplete="off"
                    style={{ paddingLeft: '36px', paddingRight: inputValue ? '32px' : '12px' }}
                />

                {/* Loader / Clear button */}
                {isLoading ? (
                    <Loader2
                        size={14}
                        className="animate-spin"
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
                    />
                ) : inputValue ? (
                    <button
                        type="button"
                        onClick={handleClear}
                        style={{
                            position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '2px',
                        }}
                    >
                        <X size={14} />
                    </button>
                ) : null}
            </div>

            {/* Dropdown suggestions */}
            {isOpen && predictions.length > 0 && (
                <div style={{
                    position: 'absolute', top: label ? 'calc(100% - 4px)' : 'calc(100% + 4px)',
                    left: 0, right: 0, zIndex: 9999,
                    background: 'var(--surface)',
                    border: '1px solid var(--accent-low)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    overflow: 'hidden',
                    marginTop: '4px',
                }}>
                    {predictions.map((p, idx) => (
                        <button
                            key={p.placeId}
                            type="button"
                            onMouseDown={(e) => {
                                e.preventDefault() // prevent blur before click
                                handleSelect(p)
                            }}
                            onMouseEnter={() => setHighlightedIdx(idx)}
                            style={{
                                width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                                padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px',
                                background: idx === highlightedIdx ? 'var(--surface-raised)' : 'transparent',
                                transition: 'background 0.1s',
                                borderBottom: idx < predictions.length - 1 ? '1px solid var(--border)' : 'none',
                            }}
                        >
                            <MapPin size={14} style={{ color: 'var(--accent)', marginTop: '2px', flexShrink: 0 }} />
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{p.mainText}</div>
                                {p.secondaryText && (
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{p.secondaryText}</div>
                                )}
                            </div>
                        </button>
                    ))}
                    <div style={{ padding: '6px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-dim)', opacity: 0.6 }}>powered by</span>
                        <img src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-non-white3_hdpi.png" alt="Google" style={{ height: '12px', opacity: 0.5 }} />
                    </div>
                </div>
            )}

            {/* Error message */}
            {error && (
                <div style={{ fontSize: '11px', color: 'var(--red)', marginTop: '4px' }}>
                    ⚠ {error}
                </div>
            )}
        </div>
    )
}
