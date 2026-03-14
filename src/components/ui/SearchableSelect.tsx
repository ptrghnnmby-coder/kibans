import { useState, useRef, useEffect, useMemo } from "react"
import { ChevronsUpDown, Check, Plus } from "lucide-react"

interface SearchableSelectProps {
    options: { id: string, label: string }[]
    value: string
    onChange: (val: string) => void
    placeholder: string
    required?: boolean
    className?: string
    onAddNew?: () => void
}

export const SearchableSelect = ({
    options,
    value,
    onChange,
    placeholder,
    required,
    className,
    onAddNew
}: SearchableSelectProps) => {
    const [isOpen, setIsOpen] = useState(false)
    const [term, setTerm] = useState('')
    const [hasFocus, setHasFocus] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Sync term with external value
    useEffect(() => {
        const selected = options.find(o => o.id === value)
        if (selected) {
            // Update term only if not typing (focused) to allow editing
            // Or if the value changed externally (we can check if term matches label)
            if (!hasFocus || term === '') {
                setTerm(selected.label)
            }
        } else {
            // FALLBACK: If value exists but no option found, show the value (ID)
            if (!hasFocus && value) setTerm(value)
            else if (!hasFocus) setTerm('')
        }
    }, [value, options, hasFocus, term])

    // Initial load
    useEffect(() => {
        const selected = options.find(o => o.id === value)
        if (selected) setTerm(selected.label)
    }, [])

    const filtered = useMemo(() => {
        if (!term) return options
        // If term matches exactly a selected item, showing all might be better?
        // Or just filter. Flow: Focus -> Select all text -> User types -> Filter.
        const lower = term.toLowerCase()
        return options.filter(o => o.label.toLowerCase().includes(lower))
    }, [options, term])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Tab') {
            // Select first match if open and available
            if (isOpen && filtered.length > 0) {
                const match = filtered[0]
                onChange(match.id)
                setTerm(match.label)
                setIsOpen(false)
                // Default tab behavior continues, moving focus
            } else {
                setIsOpen(false)
            }
        }
        if (e.key === 'Enter') {
            e.preventDefault() // Prevent form submit
            if (isOpen && filtered.length > 0) {
                const match = filtered[0]
                onChange(match.id)
                setTerm(match.label)
                setIsOpen(false)
                inputRef.current?.blur()
            }
        }
        if (e.key === 'Escape') {
            setIsOpen(false)
            inputRef.current?.blur()
        }
    }

    const handleBlur = () => {
        // Small delay to allow click events to register
        setTimeout(() => {
            setHasFocus(false)
            setIsOpen(false)

            // Revert invalid input to currently selected value
            const selected = options.find(o => o.id === value)
            if (selected) {
                setTerm(selected.label)
            } else if (value) {
                setTerm(value) // Fallback to ID
            } else {
                setTerm('')
            }
        }, 200)
    }

    const handleFocus = () => {
        setHasFocus(true)
        setIsOpen(true)
        // Select all text for easy replacement
        inputRef.current?.select()
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTerm(e.target.value)
        setIsOpen(true)
        // Auto-select exact match?
        const exact = options.find(o => o.label.toLowerCase() === e.target.value.toLowerCase())
        if (exact) {
            onChange(exact.id)
        } else {
            // If user clears input or types something new, should we clear value?
            // Yes, technically value is no longer the previous ID.
            if (value) onChange('')
        }
    }

    return (
        <div className={`relative w-full ${className || ''}`} ref={wrapperRef} style={{ position: 'relative' }}>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    className="input w-full pr-8 cursor-pointer focus:cursor-text"
                    value={term}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    required={required && !value}
                    autoComplete="off"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none flex items-center justify-center">
                    <ChevronsUpDown size={14} className="opacity-50" />
                </div>
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: 'var(--surface-raised)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                    zIndex: 100,
                    maxHeight: '200px',
                    overflowY: 'auto'
                }}>
                    {filtered.map((opt, i) => (
                        <div
                            key={opt.id}
                            className="dropdown-item"
                            style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: opt.id === value ? 'var(--accent-soft)' : 'transparent',
                                color: opt.id === value ? 'var(--accent)' : 'var(--text)',
                                borderBottom: i === filtered.length - 1 && !onAddNew ? 'none' : '1px solid var(--border-dim)'
                            }}
                            onMouseDown={(e) => {
                                e.preventDefault() // Prevent blur before click
                                onChange(opt.id)
                                setTerm(opt.label)
                                setIsOpen(false)
                                setHasFocus(false)
                                inputRef.current?.blur()
                            }}
                        >
                            <span className="truncate mr-2" style={{ fontSize: '13px' }}>{opt.label}</span>
                            {opt.id === value && <Check size={14} className="shrink-0" />}
                        </div>
                    ))}
                    {filtered.length === 0 && !onAddNew && (
                        <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                            No se encontraron resultados
                        </div>
                    )}
                    {onAddNew && (
                        <div
                            className="dropdown-item"
                            style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'var(--surface)',
                                color: 'var(--accent)',
                                fontWeight: 600,
                                borderTop: '1px solid var(--border)',
                                fontSize: '13px'
                            }}
                            onMouseDown={(e) => {
                                e.preventDefault()
                                onAddNew()
                                setIsOpen(false)
                                setHasFocus(false)
                                inputRef.current?.blur()
                            }}
                        >
                            <Plus size={14} />
                            Agregar Nuevo...
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
