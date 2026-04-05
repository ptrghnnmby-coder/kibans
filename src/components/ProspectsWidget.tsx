'use client'

import { useState, useEffect, useRef } from 'react'
import {
    Users, Plus, Clipboard, Send, X, RefreshCw,
    MessageSquare, CheckCircle2, UserPlus, Trash2,
    Calendar, Building2, User, MessageCircle
} from 'lucide-react'
import { Contacto } from '@/lib/sheets-types'
import { AIFeatureBadge } from '@/components/AIFeatureBadge'

const SimpleCard = ({ children, className }: any) => (
    <div className={`card ${className}`} style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    }}>
        {children}
    </div>
)

const SimpleButton = ({ children, onClick, className, disabled, variant = 'primary', size = 'md' }: any) => (
    <button
        onClick={onClick}
        disabled={disabled}
        style={{
            padding: size === 'sm' ? '4px 8px' : '8px 12px',
            background: variant === 'ghost' ? 'transparent' : variant === 'secondary' ? 'var(--surface-raised)' : 'var(--accent)',
            color: variant === 'ghost' ? 'var(--text-muted)' : 'white',
            border: variant === 'secondary' ? '1px solid var(--border)' : 'none',
            borderRadius: 'var(--radius-md)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: size === 'sm' ? '11px' : '13px',
            fontWeight: 500,
            transition: 'all 0.2s ease',
            opacity: disabled ? 0.5 : 1
        }}
    >
        {children}
    </button>
)

interface CRMInteraction {
    id: string
    contactId: string
    author: string
    message: string
    timestamp: string
}

export function ProspectsWidget({ userName = 'Usuario', userEmail = '' }: { userName?: string, userEmail?: string }) {
    const [prospects, setProspects] = useState<Contacto[]>([])
    const [loading, setLoading] = useState(true)
    const [showPasteModal, setShowPasteModal] = useState(false)
    const [pasteValue, setPasteValue] = useState('')
    const [importing, setImporting] = useState(false)

    // Interactions state
    const [selectedProspect, setSelectedProspect] = useState<Contacto | null>(null)
    const [interactions, setInteractions] = useState<CRMInteraction[]>([])
    const [loadingInteractions, setLoadingInteractions] = useState(false)
    const [newInteraction, setNewInteraction] = useState('')
    const [sendingInteraction, setSendingInteraction] = useState(false)

    // Auto-scroll ref
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const fetchProspects = async () => {
        try {
            const res = await fetch('/api/dashboard/prospects')
            const data = await res.json()
            if (data.success) setProspects(data.data)
        } catch (error) {
            console.error('Error fetching prospects:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchInteractions = async (prospectId: string) => {
        setLoadingInteractions(true)
        try {
            const res = await fetch(`/api/dashboard/prospects/interactions?prospectId=${prospectId}`)
            const data = await res.json()
            if (data.success) {
                setInteractions(data.data)
                // Scroll to bottom after state update
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
            }
        } catch (error) {
            console.error('Error fetching interactions:', error)
        } finally {
            setLoadingInteractions(false)
        }
    }

    useEffect(() => {
        fetchProspects()
    }, [])

    useEffect(() => {
        if (selectedProspect) {
            fetchInteractions(selectedProspect.id)
        } else {
            setInteractions([])
        }
    }, [selectedProspect])

    const handleImport = async () => {
        if (!pasteValue.trim()) return
        setImporting(true)

        // Simple parsing logic: Split by lines, try to find "Company: X" or just treat each line as a potential lead if short
        const lines = pasteValue.split('\n').filter(l => l.trim().length > 0)
        const itemsToCreate: { empresa: string; description: string; nombreContacto?: string; notes?: string }[] = []

        // Basic Heuristic Parser
        for (const line of lines) {
            if (line.includes(':')) {
                const [label, ...valParts] = line.split(':')
                const val = valParts.join(':').trim()
                const cleanLabel = label.toLowerCase().trim()

                if (cleanLabel.includes('empresa') || cleanLabel.includes('company')) {
                    itemsToCreate.push({ empresa: val, description: 'Importado desde Keep' })
                } else if (itemsToCreate.length > 0) {
                    // Enrich last item if it looks like a field
                    const last = itemsToCreate[itemsToCreate.length - 1]
                    if (cleanLabel.includes('contacto') || cleanLabel.includes('nombre')) last.nombreContacto = val
                    else if (cleanLabel.includes('nota') || cleanLabel.includes('interes')) last.notes = val
                }
            } else if (line.length > 3 && line.length < 50) {
                // If it's a short line without colon, assume it's a company name/lead
                itemsToCreate.push({ empresa: line.trim(), description: 'Importado desde Keep' })
            }
        }

        // If nothing found with colon, treat each line as a company
        if (itemsToCreate.length === 0 && lines.length > 0) {
            lines.forEach(l => itemsToCreate.push({ empresa: l.trim(), description: 'Importado desde Keep' }))
        }

        try {
            const res = await fetch('/api/dashboard/prospects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: itemsToCreate })
            })
            const data = await res.json()
            if (data.success) {
                await fetchProspects()
                setShowPasteModal(false)
                setPasteValue('')
            }
        } catch (error) {
            console.error('Error importing prospects:', error)
        } finally {
            setImporting(false)
        }
    }

    const handleAddInteraction = async () => {
        if (!newInteraction.trim() || !selectedProspect) return
        setSendingInteraction(true)

        // Use prop userName or fallback
        const effectiveAuthor = userName || (localStorage.getItem('user-profile') ? JSON.parse(localStorage.getItem('user-profile')!).name : 'Usuario')

        try {
            const res = await fetch('/api/dashboard/prospects/interactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prospectId: selectedProspect.id,
                    author: effectiveAuthor,
                    message: newInteraction
                })
            })
            const data = await res.json()
            if (data.success) {
                setInteractions([...interactions, data.data])
                setNewInteraction('')
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
            }
        } catch (error) {
            console.error('Error adding interaction:', error)
        } finally {
            setSendingInteraction(false)
        }
    }

    return (
        <SimpleCard className="h-full" style={{ position: 'relative' }}>
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--surface-raised)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={18} color="var(--accent)" />
                    <h2 style={{ fontSize: '12px', fontWeight: 500, margin: 0, letterSpacing: '0.05em', color: 'var(--text-muted)' }}>PROSPECTOS CRM</h2>
                </div>
                <AIFeatureBadge 
                    title="Extracción de Leads CRM" 
                    description="Tess utiliza procesamiento de lenguaje natural (NLP) para convertir notas informales de Keep o WhatsApp en contactos estructurados en el CRM, identificando automáticamente la empresa, el contacto y el interés comercial." 
                    position="bottom"
                />

                <div style={{ display: 'flex', gap: '8px' }}>
                    <SimpleButton size="sm" variant="secondary" onClick={() => setShowPasteModal(true)}>
                        <Clipboard size={14} />
                        Keep Import
                    </SimpleButton>
                </div>
            </div>

            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                scrollbarWidth: 'thin'
            }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                        <RefreshCw size={24} className="animate-spin" color="var(--text-dim)" />
                    </div>
                ) : prospects.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                        <UserPlus size={32} style={{ marginBottom: '12px', opacity: 0.2 }} />
                        <p style={{ fontSize: '12px' }}>No hay prospectos activos.</p>
                        <p style={{ fontSize: '11px', opacity: 0.7 }}>Usa Keep Import para empezar.</p>
                    </div>
                ) : (
                    prospects.map(p => (
                        <div key={p.id} className="prospect-card hover-lift" style={{
                            padding: '12px',
                            background: 'var(--surface-raised)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer'
                        }}
                            onClick={() => setSelectedProspect(p)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <Building2 size={14} color="var(--accent)" />
                                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{p.empresa}</span>
                                </div>
                                <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600 }}>#{p.id}</span>
                            </div>

                            {p.nombreContacto && (
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                                    <User size={12} />
                                    <span>{p.nombreContacto}</span>
                                </div>
                            )}

                            {p.notes && (
                                <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '4px 0', fontStyle: 'italic' }}>
                                    "{p.notes}"
                                </p>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                                <SimpleButton size="sm" variant="ghost" onClick={(e: any) => { e.stopPropagation(); /* delete logic */ }}>
                                    <Trash2 size={12} />
                                </SimpleButton>
                                <SimpleButton size="sm" variant="secondary" onClick={(e: any) => { e.stopPropagation(); setSelectedProspect(p); }}>
                                    <MessageCircle size={12} />
                                </SimpleButton>
                                <SimpleButton size="sm" onClick={(e: any) => { e.stopPropagation(); /* convert logic */ }}>
                                    Convertir
                                </SimpleButton>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* KEEP IMPORT MODAL (Inline simulation for speed) */}
            {showPasteModal && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'var(--surface-raised)',
                        borderRadius: 'var(--radius-lg)',
                        width: '100%',
                        maxWidth: '400px',
                        border: '1px solid var(--border)',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Importar desde Keep</h3>
                            <button onClick={() => setShowPasteModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={18} />
                            </button>
                        </div>
                        <div style={{ padding: '16px' }}>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                                Pega aquí tus notas de seguimiento. Tess extraerá los prospectos automáticamente.
                            </p>
                            <textarea
                                value={pasteValue}
                                onChange={(e) => setPasteValue(e.target.value)}
                                placeholder="Empresa: Argentum&#10;Contacto: Juan Perez&#10;Interés: Litio"
                                style={{
                                    width: '100%',
                                    height: '150px',
                                    background: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '12px',
                                    color: 'var(--text)',
                                    fontSize: '12px',
                                    resize: 'none',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>
                        <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <SimpleButton variant="ghost" onClick={() => setShowPasteModal(false)}>Cancelar</SimpleButton>
                            <SimpleButton onClick={handleImport} disabled={importing || !pasteValue.trim()}>
                                {importing ? <RefreshCw className="animate-spin" size={16} /> : 'Procesar Notas'}
                            </SimpleButton>
                        </div>
                    </div>
                </div>
            )}

            {/* INTERACTIONS MODAL (Discussion Thread) */}
            {selectedProspect && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'var(--bg)',
                    zIndex: 150,
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-raised)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button onClick={() => setSelectedProspect(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                                <X size={20} />
                            </button>
                            <div>
                                <h3 style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>{selectedProspect.empresa}</h3>
                                <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 600 }}>MURO DE CONSULTAS</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {loadingInteractions ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                                <RefreshCw size={20} className="animate-spin" color="var(--text-dim)" />
                            </div>
                        ) : interactions.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                                <MessageSquare size={32} style={{ marginBottom: '12px', opacity: 0.1 }} />
                                <p style={{ fontSize: '12px' }}>Sin consultas compartidas aún.</p>
                                <p style={{ fontSize: '11px', opacity: 0.7 }}>Anota aquí preguntas del cliente o soluciones.</p>
                            </div>
                        ) : (
                            interactions.map(int => (
                                <div key={int.id} style={{
                                    alignSelf: 'flex-start',
                                    maxWidth: '90%',
                                    background: 'var(--surface-raised)',
                                    padding: '10px 14px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    position: 'relative'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', gap: '12px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)' }}>{int.author.toUpperCase()}</span>
                                        <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>
                                            {new Date(int.timestamp).toLocaleDateString([], { day: '2-digit', month: '2-digit' })} {new Date(int.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '12px', margin: 0, color: 'var(--text)', lineHeight: '1.4' }}>{int.message}</p>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div style={{ padding: '16px', borderTop: '1px solid var(--border)', background: 'var(--surface-raised)', display: 'flex', gap: '8px' }}>
                        <textarea
                            value={newInteraction}
                            onChange={(e) => setNewInteraction(e.target.value)}
                            placeholder="Anota una consulta o solución..."
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleAddInteraction()
                                }
                            }}
                            style={{
                                flex: 1,
                                minHeight: '40px',
                                maxHeight: '120px',
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                padding: '8px 12px',
                                color: 'var(--text)',
                                fontSize: '12px',
                                resize: 'none',
                                fontFamily: 'inherit'
                            }}
                        />
                        <button
                            onClick={handleAddInteraction}
                            disabled={sendingInteraction || !newInteraction.trim()}
                            style={{
                                width: '40px',
                                height: '40px',
                                background: 'var(--accent)',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                cursor: 'pointer',
                                opacity: !newInteraction.trim() || sendingInteraction ? 0.5 : 1
                            }}
                        >
                            {sendingInteraction ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                        </button>
                    </div>
                </div>
            )}
        </SimpleCard>
    )
}
