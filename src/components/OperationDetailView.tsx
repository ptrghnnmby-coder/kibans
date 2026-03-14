'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import OperationDocumentsTab from './OperationDocumentsTab'
import { Button } from './ui/Button'
import {
    ArrowLeft,
    Calendar,
    ChevronDown,
    Edit2,
    FileText,
    MapPin,
    Package, // Replaced Box with Package as it seems more appropriate, or keep Box if prefered.
    Box,
    RefreshCw,
    Plus,
    Save,
    Ship,
    Trash2,
    User,
    X,
    FileCheck,
    ClipboardList,
    ShieldCheck,
    MessageSquare,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Briefcase,
    Settings,
    ChevronRight,
    Users,
    FolderOpen,
    ShoppingCart,
    Clock,
    Tag,
    Loader2,
    CheckCircle,
    Archive,
    ExternalLink,
    Truck,
    Factory
} from 'lucide-react'
import { ConfirmModal } from './ui/ConfirmModal'
import { ContainerTrackingWidget } from './ContainerTrackingWidget'
import { PortAutocomplete } from './PortAutocomplete'
import { CashFlowManager } from './CashFlowManager'
import { FreightView } from './FreightView'
import { ProductCard } from './ProductCard'
import QualityControlTab from './QualityControlTab'
import { Operacion, Contacto, USER_MAP, getResponsableName, PAYMENT_TERMS_OPTIONS, INCOTERMS_OPTIONS, Flete } from '../lib/sheets-types'
import { Producto } from '../lib/googleSheets'
import { parseNumeric, formatNumber, parseBankStyle, formatInputBankStyle } from '@/lib/numbers'
import { SearchableSelect } from './ui/SearchableSelect'
import PoModal from './PoModal'
import LoadModal from './LoadModal'
import { detectCarrier, getCarrierTrackingURL } from '@/lib/containerTracking'
import { ClaimsSection } from './ClaimsSection'
import { useToast } from './ui/Toast'
import { ContactForm } from './ContactForm'
import { ProductForm } from './ProductForm'
import { useUnsavedChanges } from '../lib/hooks/useUnsavedChanges'

interface OperationDetailViewProps {
    initialOp: Operacion
    allProducts: Producto[]
    allContacts: Contacto[]
}

export default function OperationDetailView({ initialOp, allProducts, allContacts }: OperationDetailViewProps) {
    const router = useRouter()
    const { showToast } = useToast()
    const [op, setOp] = useState(initialOp)

    useEffect(() => {
        setOp(initialOp)
    }, [initialOp])

    const [mounted, setMounted] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [backupOp, setBackupOp] = useState<Operacion | null>(null)
    const [saving, setSaving] = useState(false)
    const [generatingPdf, setGeneratingPdf] = useState(false)
    const [newComment, setNewComment] = useState('')
    const [editedProducts, setEditedProducts] = useState<{ id: string, qty: number | string, price: number | string, purchasePrice: number | string }[]>([])
    const [noteToDeleteIndex, setNoteToDeleteIndex] = useState<number | null>(null)
    const [deleteModal, setDeleteModal] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [deleting, setDeleting] = useState(false)
    const [liquidating, setLiquidating] = useState(false)
    const [showLiquidationModal, setShowLiquidationModal] = useState(false)
    const [showLoadModal, setShowLoadModal] = useState(false)
    const [fleteToDelete, setFleteToDelete] = useState<string | null>(null)
    const [isDeletingFlete, setIsDeletingFlete] = useState(false)
    const [activeTab, setActiveTab] = useState<'detalle' | 'finanzas' | 'logistica' | 'qc' | 'embarque' | 'reclamos' | 'documentos' | 'tracking'>('detalle')
    const [isHistorial, setIsHistorial] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])
    const [isDirty, setIsDirty] = useState(false)
    useUnsavedChanges(isDirty)

    const [isForwarderModalOpen, setIsForwarderModalOpen] = useState(false)
    const [isImporterModalOpen, setIsImporterModalOpen] = useState(false)
    const [isExporterModalOpen, setIsExporterModalOpen] = useState(false)
    const [isProducerModalOpen, setIsProducerModalOpen] = useState(false)
    const [isProductModalOpen, setIsProductModalOpen] = useState(false)
    const [activeProductIndex, setActiveProductIndex] = useState<number | null>(null)
    const [localContacts, setLocalContacts] = useState<Contacto[]>(allContacts)
    const [localProducts, setLocalProducts] = useState<Producto[]>(allProducts)

    useEffect(() => {
        setLocalContacts(allContacts)
    }, [allContacts])

    useEffect(() => {
        setLocalProducts(allProducts)
    }, [allProducts])

    useEffect(() => {
        setMounted(true)
    }, [])

    // Fletes State
    const [fletes, setFletes] = useState<Flete[]>([])
    const [loadingFletes, setLoadingFletes] = useState(false)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            const tab = params.get('tab')
            if (tab === 'finanzas' || tab === 'detalle' || tab === 'logistica' || tab === 'qc' || tab === 'embarque' || tab === 'reclamos' || tab === 'documentos' || tab === 'tracking') {
                setActiveTab(tab as any)
            }
            if (params.get('historial') === '1') {
                setIsHistorial(true)
            }
        }
    }, [])

    // Central Notes State
    const [centralNotes, setCentralNotes] = useState<any[]>([])
    const [loadingNotes, setLoadingNotes] = useState(false)

    useEffect(() => {
        if (op.id) {
            fetchFletes()
            fetchCentralNotes()
        }
    }, [op.id])

    const fetchCentralNotes = async () => {
        try {
            setLoadingNotes(true)
            const res = await fetch(`/api/operaciones/notes?operationId=${op.id}`)
            if (res.ok) {
                const data = await res.json()
                // API just returns the array in the response when there is an operationId
                setCentralNotes(Array.isArray(data) ? data : (data.data || []))
            }
        } catch (error) {
            console.error('Error fetching central notes:', error)
        } finally {
            setLoadingNotes(false)
        }
    }

    const fetchFletes = async () => {
        try {
            setLoadingFletes(true)
            const res = await fetch(`/api/operaciones/${op.id}/fletes`)
            const data = await res.json()
            if (data.success) {
                setFletes(data.data)
            }
        } catch (error) {
            console.error('Error fetching fletes:', error)
        } finally {
            setLoadingFletes(false)
        }
    }

    const handleAddFlete = async (flete: Partial<Flete>) => {
        try {
            const res = await fetch(`/api/operaciones/${op.id}/fletes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(flete)
            })
            if (res.ok) {
                fetchFletes()
            }
        } catch (error) {
            console.error(error)
        }
    }

    const handleUpdateFlete = async (forwarder: string, updates: Partial<Flete>) => {
        try {
            const res = await fetch(`/api/operaciones/${op.id}/fletes`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ forwarder, updates })
            })
            if (res.ok) {
                fetchFletes()
            }
        } catch (error) {
            console.error(error)
        }
    }

    const handleDeleteFlete = async (forwarder: string) => {
        setFleteToDelete(forwarder)
    }

    const confirmDeleteFlete = async () => {
        if (!fleteToDelete) return
        setIsDeletingFlete(true)
        try {
            const res = await fetch(`/api/operaciones/${op.id}/fletes?forwarder=${fleteToDelete}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                fetchFletes()
                showToast('Cotización eliminada', 'success')
            } else {
                showToast('Error al eliminar la cotización', 'error')
            }
        } catch (error) {
            console.error(error)
            showToast('Error de conexión', 'error')
        } finally {
            setIsDeletingFlete(false)
            setFleteToDelete(null)
        }
    }

    // Helper to parse product strings: ID:QTY:PRICE
    const parseProductEntries = (raw: string | undefined) => {
        if (!raw) return []
        return raw.split(/[\n,]/).map(line => {
            const trimmed = line.trim()
            if (!trimmed) return null
            const parts = trimmed.split(':')
            if (parts.length < 2) return null
            return {
                id: parts[0].trim(),
                qty: parseNumeric(parts[1]),
                price: parts.length >= 3 ? parseNumeric(parts[2]) : 0
            }
        }).filter(Boolean) as { id: string, qty: number, price: number }[]
    }

    const handleStartEditing = () => {
        // Parse current products for granular editing
        const sales = parseProductEntries(op.productos)
        const purchases = parseProductEntries(op.purchasePricesRaw)

        const mergedMap = new Map<string, { id: string, qty: number | string, price: number | string, purchasePrice: number | string }>()
        sales.forEach(s => {
            mergedMap.set(s.id, { id: s.id, qty: s.qty, price: s.price, purchasePrice: formatInputBankStyle(0) })
        })
        purchases.forEach(p => {
            if (mergedMap.has(p.id)) {
                mergedMap.get(p.id)!.purchasePrice = p.price
            } else {
                mergedMap.set(p.id, { id: p.id, qty: p.qty, price: formatInputBankStyle(0), purchasePrice: p.price })
            }
        })

        setEditedProducts(Array.from(mergedMap.values()))
        setBackupOp(op)
        setIsEditing(true)
    }

    const handleCancelEditing = () => {
        if (backupOp) setOp(backupOp)
        setIsEditing(false)
        setIsDirty(false)
    }

    const handleChange = (field: string, value: any) => {
        setOp(prev => ({
            ...prev,
            [field]: value
        }))
        setIsDirty(true)
    }

    const handleCreateContact = async (data: any, role: 'importer' | 'exporter' | 'producer' | 'forwarder') => {
        const response = await fetch('/api/contactos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        const result = await response.json()
        if (response.ok && result.success) {
            showToast(`${role.charAt(0).toUpperCase() + role.slice(1)} creado con éxito`, 'success')
            const newContact = { ...data, id: result.data.id }
            setLocalContacts(prev => [...prev, newContact])

            if (role === 'importer') handleChange('cliente', result.data.id)
            else if (role === 'exporter') handleChange('exportador', result.data.id)
            else if (role === 'producer') handleChange('productor', result.data.id)
            else if (role === 'forwarder') handleChange('forwarder', result.data.id)

            if (role === 'importer') setIsImporterModalOpen(false)
            else if (role === 'exporter') setIsExporterModalOpen(false)
            else if (role === 'producer') setIsProducerModalOpen(false)
            else if (role === 'forwarder') setIsForwarderModalOpen(false)
        } else {
            showToast(result.error || 'Error al guardar el contacto', 'error')
            throw new Error(result.error)
        }
    }

    const handleCreateProduct = async (data: any) => {
        try {
            const res = await fetch('/api/productos/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            const result = await res.json()
            if (res.ok && result.success) {
                showToast('Producto creado con éxito', 'success')
                const newProduct = { ...data, id: result.data.id }
                setLocalProducts(prev => [...prev, newProduct])

                if (activeProductIndex !== null) {
                    const newProds = [...editedProducts]
                    newProds[activeProductIndex] = { ...newProds[activeProductIndex], id: result.data.id }
                    setEditedProducts(newProds)
                    setIsDirty(true)
                }
                setIsProductModalOpen(false)
                setActiveProductIndex(null)
            } else {
                showToast(result.error || 'Error al crear producto', 'error')
            }
        } catch (error) {
            console.error(error)
            showToast('Error de conexión', 'error')
        }
    }

    const handleSave = async () => {
        if (!op.id) return
        setSaving(true)
        let finalOp = { ...op }

        if (isEditing) {
            // Serialize products back to strings: ID:QTY:PRICE
            // parseNumeric handles locale-formatted strings like "4.100,00" from formatInputBankStyle
            const productosStr = editedProducts
                .filter(p => p.id)
                .map(p => `${p.id}:${parseNumeric(p.qty)}:${parseBankStyle(p.price).toFixed(2)}`)
                .join('\n')

            const purchaseStr = editedProducts
                .filter(p => p.id)
                .map(p => `${p.id}:${parseNumeric(p.qty)}:${parseBankStyle(p.purchasePrice).toFixed(2)}`)
                .join('\n')

            finalOp = {
                ...op,
                productos: productosStr,
                purchasePricesRaw: purchaseStr
            }
        }

        try {
            const res = await fetch(`/api/operaciones/${op.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(finalOp)
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Error al guardar')
            }

            const updated = await res.json()
            if (updated && updated.id) {
                setOp(updated)
                setIsEditing(false)
                setIsDirty(false)
                router.refresh()
            } else {
                throw new Error('La respuesta del servidor no es válida')
            }
        } catch (err) {
            console.error(err)
            showToast('Error al guardar los cambios', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleLiquidate = async () => {
        setLiquidating(true)
        try {
            const res = await fetch(`/api/operaciones/${op.id}/liquidate`, {
                method: 'POST'
            })
            const data = await res.json()
            if (data.success) {
                showToast('✅ Operación liquidada correctamente.', 'success')
                setTimeout(() => {
                    router.push('/operaciones?tab=liquidadas')
                }, 1800)
            } else if (data.blocked && data.reasons?.length) {
                // Show each blocking reason as a warning
                for (const reason of data.reasons) {
                    showToast(`⚠️ ${reason}`, 'error')
                }
            } else {
                showToast(data.error || 'Error al liquidar la operación', 'error')
            }
        } catch (error) {
            console.error('Error liquidating:', error)
            showToast('Error crítico al conectar con el servidor', 'error')
        } finally {
            setLiquidating(false)
            setShowLiquidationModal(false)
        }
    }

    const handleAddComment = async () => {
        if (!newComment.trim()) return

        const timestamp = new Date().toLocaleString()
        const noteEntry = `[${timestamp}] Usuario: ${newComment}`
        const updatedNotas = op.notas ? `${op.notas}\n\n${noteEntry}` : noteEntry

        // Optimistic update
        setOp(prev => ({ ...prev, notas: updatedNotas }))
        const currentComment = newComment
        setNewComment('')

        try {
            // 1. Save to Master Input (Legacy/Persistent Operation History)
            await fetch(`/api/operaciones/${op.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...op, notas: updatedNotas })
            })

            // 2. Save to Central Notes Spreadsheet (For Dashboard Notifications)
            await fetch('/api/operaciones/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    operationId: op.id,
                    content: currentComment
                })
            })
        } catch (e) {
            console.error("Failed to sync comment", e)
        }
    }

    const handleDeleteComment = async () => {
        if (noteToDeleteIndex === null || !op.notas) return
        const index = noteToDeleteIndex

        // Snapshot op before any state updates to avoid stale closure in the fetch body
        const opSnapshot = { ...op }
        const rawNotes = op.notas.split(/\n\n/)
        const updatedNotesArray = rawNotes.filter((_, i) => i !== index)
        const updatedNotas = updatedNotesArray.join('\n\n')

        // Optimistic update — dismiss the modal right away
        setNoteToDeleteIndex(null)
        setOp(prev => ({ ...prev, notas: updatedNotas }))

        try {
            const res = await fetch(`/api/operaciones/${op.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                // Use opSnapshot (pre-update) so we don't accidentally send stale notas
                body: JSON.stringify({ ...opSnapshot, notas: updatedNotas })
            })

            if (!res.ok) throw new Error("Server error")
        } catch (e) {
            console.error("Failed to delete comment", e)
            // Revert the optimistic update on failure
            setOp(opSnapshot)
            showToast("No se pudo eliminar el comentario. Se revirtió el cambio.", "error")
        }
    }

    // Helper to find contact name/company
    const getContactLabel = (id?: string) => {
        if (!id) return '-'
        const c = allContacts.find(Contact => Contact.id === id)
        return c ? c.empresa : id
    }

    const getContactsByRole = (role: 'BillTo' | 'Consignee' | 'Notify' | 'Importador') => {
        switch (role) {
            case 'BillTo': return allContacts.filter(c => c.isBillTo)
            case 'Consignee': return allContacts.filter(c => c.isConsignee)
            case 'Notify': return allContacts.filter(c => c.isNotify)
            // Fallback for logical roles that might not be flags
            case 'Importador': return allContacts.filter(c => c.tipo === 'Importador' || c.isImporter)
            default: return allContacts
        }
    }

    const handleDeleteOperation = async () => {
        console.log('Iniciando proceso de eliminación de operación:', op.id);
        setSaving(true)
        try {
            console.log(`Enviando DELETE request a /api/operaciones/${op.id}`);
            const res = await fetch(`/api/operaciones/${op.id}`, {
                method: 'DELETE'
            })
            console.log('Respuesta recibida:', res.status);

            if (!res.ok) {
                const data = await res.json()
                console.error('Error del servidor:', data);
                throw new Error(data.error || "Error al eliminar la operación")
            }

            console.log('Operación eliminada exitosamente');
            setDeleteModal(false)
            setShowSuccessModal(true)
        } catch (e: any) {
            console.error("Failed to delete operation", e)
            showToast(e.message || "Error al eliminar la operación.", "error")
        } finally {
            setSaving(false)
        }
    }

    const handleGeneratePdf = () => {
        alert("Funcionalidad en desarrollo");
    }

    const renderNotesSection = () => {
        return (
            <div id="notes-section" className="card" style={{ padding: 'var(--space-6)', marginTop: 'var(--space-6)' }}>
                <h3 style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={16} /> COMENTARIOS Y NOTAS
                </h3>

                {/* Feed */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '400px', overflowY: 'auto', marginBottom: 'var(--space-4)' }}>
                    {loadingNotes ? (
                        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>Cargando notas...</div>
                    ) : (() => {
                        // Merge Master Input notes and Central Notes
                        const mergedNotes: any[] = []

                        // Parse legacy notes
                        if (op.notas) {
                            const rawNotes = op.notas.split(/\n\n/)
                            rawNotes.forEach((note, idx) => {
                                const match = note.match(/^\[(.*?)\] (.*?): ([\s\S]*)$/)
                                let timestamp = ''
                                let user = 'Desconocido'
                                let content = note

                                if (match) {
                                    timestamp = match[1]
                                    user = match[2]
                                    content = match[3]
                                }
                                mergedNotes.push({
                                    id: `legacy-${idx}`,
                                    originalIndex: idx, // Keep index to delete from text field
                                    isLegacy: true,
                                    timestamp,
                                    author: user,
                                    content,
                                    sortDate: timestamp ? new Date(timestamp).getTime() : 0
                                })
                            })
                        }

                        // Add central notes
                        centralNotes.forEach(note => {
                            mergedNotes.push({
                                id: note.id,
                                isLegacy: false,
                                timestamp: note.timestamp,
                                author: note.author || 'Desconocido',
                                content: note.content || '',
                                sortDate: note.timestamp ? new Date(note.timestamp).getTime() : 0,
                                type: note.type
                            })
                        })

                        // Sort by date descending
                        mergedNotes.sort((a, b) => b.sortDate - a.sortDate)

                        if (mergedNotes.length === 0) {
                            return (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '16px' }}>
                                    No hay notas registradas.
                                </div>
                            )
                        }

                        return mergedNotes.map((note) => {
                            const userObj = (USER_MAP as any)[note.author] || Object.values(USER_MAP).find((u: any) => u.name === note.author);
                            const displayDate = note.isLegacy ? note.timestamp : new Date(note.timestamp).toLocaleString();
                            
                            // Style variations based on note type (if applicable)
                            let bgStyle = 'var(--surface-raised)'
                            let borderStyle = 'none'
                            if (note.type === 'alert' || note.type === 'warning') borderStyle = '1px solid var(--accent)'
                            if (note.type === 'success') borderStyle = '1px solid var(--green)'
                            
                            return (
                                <div key={note.id} style={{ display: 'flex', gap: '12px', padding: '12px', background: bgStyle, border: borderStyle, borderRadius: 'var(--radius-md)', position: 'relative' }}>
                                    <div className="avatar-container" style={{ width: 32, height: 32, flexShrink: 0 }}>
                                        {userObj && (userObj as any).avatar ? <img src={(userObj as any).avatar} alt={note.author} /> : <User size={16} color="var(--text-dim)" />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
                                                {note.author} {note.isLegacy ? '' : <span style={{fontSize: '10px', fontWeight: 'normal', color: 'var(--text-muted)'}}>(Central)</span>}
                                            </span>
                                            <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{displayDate}</span>
                                        </div>
                                        <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.4', margin: 0, whiteSpace: 'pre-wrap' }}>{note.content}</p>
                                    </div>
                                    {note.isLegacy && (
                                        <button
                                            onClick={() => setNoteToDeleteIndex(note.originalIndex)}
                                            style={{ position: 'absolute', top: '8px', right: '8px', background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', opacity: 0.5 }}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                            )
                        });
                    })()}
                </div>

                {/* Add Note */}
                <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
                    <input
                        type="text"
                        className="input"
                        style={{ flex: 1 }}
                        placeholder="Escribir una nota o comentario..."
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                    />
                    <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="btn btn-primary"
                        style={{ padding: '0 20px' }}
                    >
                        Enviar
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="dashboard-container animate-in pb-20">
            <header className="flex flex-col md:flex-row md:items-start justify-between mb-6 pb-4 border-b border-border-light gap-4">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', flex: 1, minWidth: 0 }}>
                    <button
                        onClick={() => {
                            if (window.history.length > 2) {
                                router.back()
                            } else {
                                router.push(op.isArchived ? "/operaciones/historial" : `/operaciones?tab=${op.containerNumber && op.containerNumber.trim() !== '' ? 'cargadas' : 'por_cargar'}`)
                            }
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '8px', flexShrink: 0 }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <h1 className="page-title" style={{ marginBottom: 0, fontSize: 'clamp(1.1rem, 4vw, 1.75rem)' }}>{op.id}</h1>
                            {op.isArchived && (
                                <span style={{
                                    padding: '4px 8px',
                                    background: 'var(--surface-raised)',
                                    color: 'var(--text-muted)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    <Archive size={14} /> ARCHIVADA
                                </span>
                            )}
                        </div>
                        {op.timestamp && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <span style={{ color: 'var(--text-dim)', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <Clock size={12} />
                                    <span>{new Date(op.timestamp).toLocaleString()}</span>
                                    {op.lastUpdatedBy && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span>por</span>
                                            <div style={{
                                                width: '16px',
                                                height: '16px',
                                                borderRadius: '50%',
                                                background: (USER_MAP as any)[op.lastUpdatedBy.toLowerCase()]?.color || 'var(--surface-raised)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '8px',
                                                color: 'white',
                                                fontWeight: 800,
                                                overflow: 'hidden',
                                                flexShrink: 0
                                            }}>
                                                {(USER_MAP as any)[op.lastUpdatedBy.toLowerCase()]?.avatar ? (
                                                    <img src={(USER_MAP as any)[op.lastUpdatedBy.toLowerCase()].avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    (USER_MAP as any)[op.lastUpdatedBy.toLowerCase()]?.initial || '?'
                                                )}
                                            </div>
                                            <span style={{ fontWeight: 600 }}>{(USER_MAP as any)[op.lastUpdatedBy.toLowerCase()]?.name || op.lastUpdatedBy.split('@')[0]}</span>
                                        </div>
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {!op.isArchived && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', alignSelf: 'flex-end', width: 'auto' }}>
                        {op.containerNumber && op.containerNumber.trim() !== '' && (
                            <Button
                                variant="secondary"
                                onClick={() => setShowLiquidationModal(true)}
                                title="Liquidar operación"
                                style={{ color: 'var(--cyan)', borderColor: 'var(--cyan-soft)' }}
                            >
                                <Archive size={16} />
                                <span>Liquidar</span>
                            </Button>
                        )}
                        <Button
                            variant="secondary"
                            onClick={() => setDeleteModal(true)}
                            title="Eliminar operación"
                            className="hover:bg-red-soft hover:border-red hover:text-red border-border-light"
                        >
                            <Trash2 size={16} />
                        </Button>
                    </div>
                )}
            </header>

            {/* ── Badge: Operación Concluida ── */}
            {isHistorial && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-6)',
                    background: 'rgba(34,197,94,0.06)',
                    borderLeft: '3px solid var(--green)',
                    borderBottom: '1px solid var(--border)',
                }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="6.5" stroke="#22c55e" strokeWidth="1.2"/>
                        <path d="M4 7l2.2 2.2L10 5" stroke="#22c55e" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Operación Concluida
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>— Esta operación fue liquidada y archivada.</span>
                </div>
            )}

            {/* Sticky Summary & Navigation Bar */}
            <div style={{
                position: 'sticky',
                top: '-2px',
                zIndex: 100,
                background: 'rgba(10, 15, 26, 0.95)',
                backdropFilter: 'blur(8px)',
                padding: 'var(--space-2) 0',
                borderBottom: '1px solid var(--border)',
                marginBottom: 'var(--space-6)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
                paddingLeft: 'var(--space-2)',
                paddingRight: 'var(--space-2)',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    gap: 'var(--space-2)'
                }}>
                    <div style={{
                        flex: 1,
                        overflowX: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        display: 'flex',
                        gap: 'var(--space-2)',
                        paddingBottom: '4px'
                    }} className="hide-scrollbar">
                        {/* Navigation Tabs */}
                        <div style={{
                            display: 'flex',
                            gap: 'var(--space-1)',
                            background: 'var(--surface-raised)',
                            padding: '3px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            flexShrink: 0
                        }}>
                            {[
                                { id: 'detalle', label: 'Detalle', icon: <ClipboardList size={14} /> },
                                { id: 'logistica', label: 'Logística', icon: <Ship size={14} /> },
                                { id: 'qc', label: 'QC', icon: <ShieldCheck size={14} /> },
                                { id: 'finanzas', label: 'Finanzas', icon: <DollarSign size={14} /> },
                                { id: 'documentos', label: 'Docs', icon: <FileText size={14} /> },
                                { id: 'reclamos', label: 'Reclamos', icon: <MessageSquare size={14} /> }
                            ].filter(tab => {
                                if ((tab.id === 'logistica' || tab.id === 'qc' || tab.id === 'embarque') && isHistorial) return false
                                if (tab.id === 'logistica' && op.isArchived) return false
                                return true
                            }).map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '5px 10px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
                                        background: activeTab === tab.id ? 'var(--accent)' : 'transparent',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {tab.icon}
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                        <button
                            onClick={() => {
                                const noteSection = document.getElementById('notes-section');
                                if (noteSection) {
                                    noteSection.scrollIntoView({ behavior: 'smooth' });
                                    const input = noteSection.querySelector('input');
                                    if (input) (input as any).focus();
                                } else {
                                    setActiveTab('detalle');
                                    setTimeout(() => {
                                        const sec = document.getElementById('notes-section');
                                        if (sec) {
                                            sec.scrollIntoView({ behavior: 'smooth' });
                                            const input = sec.querySelector('input, textarea');
                                            if (input) (input as HTMLElement).focus();
                                        }
                                    }, 150);
                                }
                            }}
                            className="btn btn-secondary btn-small"
                            style={{ padding: '6px', minWidth: '32px', height: '32px' }}
                            title="Añadir Nota"
                        >
                            <Plus size={14} />
                        </button>
                        {op.idCarpeta && (
                            <a
                                href={`https://drive.google.com/drive/folders/${op.idCarpeta}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary btn-small"
                                style={{ padding: '6px', minWidth: '32px', height: '32px' }}
                                title="Abrir Google Drive"
                            >
                                <FolderOpen size={14} />
                            </a>
                        )}
                    </div>
                </div>
            </div>

            <div className="animate-in">
                {activeTab === 'detalle' && (
                    <div className="detalle-tab-container" style={{ display: 'flex', flexDirection: 'column' }}>
                        {/* Edit Actions for Detalle */}
                        {!op.isArchived && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'var(--surface-raised)',
                                padding: '8px 12px',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--border)',
                                marginBottom: 'var(--space-6)'
                            }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {!isEditing && (
                                        <>
                                            {(!op.containerNumber || op.containerNumber.trim() === '') && (
                                                <Button
                                                    onClick={() => setShowLoadModal(true)}
                                                    variant="primary"
                                                    leftIcon={<Ship size={16} />}
                                                    className="shadow-lg shadow-black/20"
                                                >
                                                    Load
                                                </Button>
                                            )}
                                            <Button
                                                onClick={() => setShowLiquidationModal(true)}
                                                variant="secondary"
                                                leftIcon={<Archive size={16} />}
                                                className="bg-cyan-soft text-cyan border-cyan-soft hover:bg-cyan/20"
                                            >
                                                Liquidar
                                            </Button>
                                        </>
                                    )}
                                </div>

                                {isEditing ? (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <Button
                                            variant="secondary"
                                            onClick={handleCancelEditing}
                                            disabled={saving}
                                            leftIcon={<X size={16} />}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            variant="primary"
                                            onClick={handleSave}
                                            isLoading={saving}
                                            leftIcon={<Save size={16} />}
                                        >
                                            Guardar Cambios
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        variant="secondary"
                                        onClick={handleStartEditing}
                                        leftIcon={<Edit2 size={16} />}
                                    >
                                        Editar Detalles
                                    </Button>
                                )}
                            </div>
                        )}
            {/* Main Content Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* COL 1: OVERVIEW & PARTIES */}
                <div className="xl:col-span-1" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                    {/* OVERVIEW CABECERA */}
                    <div className="card" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                        {/* TRADING & STATUS */}
                                <div className="card" style={{ padding: 'var(--space-5)' }}>
                                    <h3 style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
                                        TRADING & ESTADO
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                        <div>
                                            <label style={{ fontSize: '8px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Trading</label>
                                            {isEditing ? (
                                                <SearchableSelect
                                                    options={[
                                                        { id: 'SM Exports Inc', label: 'SM Exports Inc' },
                                                        { id: 'SEAWIND Trade LLC', label: 'SEAWIND Trade LLC' }
                                                    ]}
                                                    value={op.trading || ''}
                                                    onChange={v => handleChange('trading', v)}
                                                    placeholder="Trading Company"
                                                />
                                            ) : (
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cyan)' }}>{op.trading || '-'}</div>
                                            )}
                                        </div>
                                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                                            <label style={{ fontSize: '8px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Estado</label>
                                            {isEditing ? (
                                                <SearchableSelect
                                                    options={[
                                                        '1. Operación Creada',
                                                        '2. Proforma Enviada',
                                                        '3. Proforma Aprobada',
                                                        '4. Orden de Compra Emitida',
                                                        '5. Producción / Preparación',
                                                        '6. Flete en Gestión',
                                                        '7. Booking Confirmado',
                                                        '8. Carga Realizada',
                                                        '9. En Tránsito',
                                                        '10. Arribada',
                                                        '11. En Revisión de Recepción',
                                                        '12A. Recepción Conforme',
                                                        '12B. Reclamo Reportado',
                                                        '13. Liquidación en Proceso',
                                                        '14. Operación Liquidada',
                                                        'Cancelada'
                                                    ].map(s => ({ id: s, label: s }))}
                                                    value={op.estado || ''}
                                                    onChange={v => handleChange('estado', v)}
                                                    placeholder="Estado de la Operación"
                                                />
                                            ) : (
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{op.estado || '-'}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* RESPONSABLE */}
                                <div className="card" style={{ padding: 'var(--space-5)' }}>
                                    <h3 className="flex justify-between items-center" style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
                                        <span>RESPONSABLE</span>
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'var(--surface-raised)', borderRadius: 'var(--radius-md)' }}>
                                        {isEditing ? (
                                            <SearchableSelect
                                                options={Object.entries(USER_MAP).map(([email, info]) => ({ id: email, label: info.name }))}
                                                value={op.userId || ''}
                                                onChange={v => handleChange('userId', v)}
                                                placeholder="Responsable"
                                            />
                                        ) : (
                                            (() => {
                                                const userName = getResponsableName(op.userId);
                                                const user = (USER_MAP as any)[userName] || Object.values(USER_MAP).find((u: any) => u.name === userName);
                                                return (
                                                    <>
                                                        <div className="avatar-container" style={{ width: 32, height: 32 }}>
                                                            {user?.avatar ? (
                                                                <img src={user.avatar} alt={userName} />
                                                            ) : (
                                                                <User size={16} color="var(--text-dim)" />
                                                            )}
                                                        </div>
                                                        <div style={{ minWidth: 0 }}>
                                                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
                                                            <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{user?.role || 'Ops'}</div>
                                                        </div>
                                                    </>
                                                )
                                            })()
                                        )}
                                    </div>
                                </div>

                                {/* GOOGLE DRIVE LINK (Refined) */}
                                <div className="card" style={{ padding: 'var(--space-5)' }}>
                                    <div style={{ marginBottom: 'var(--space-4)' }}>
                                        <h3 style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, margin: 0 }}>
                                            VER EN GOOGLE
                                        </h3>
                                        <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', fontWeight: 500 }}>
                                            {op.nombreCarpeta || 'Cargando carpeta...'}
                                        </p>
                                    </div>
                                    {op.idCarpeta ? (
                                        <a href={`https://drive.google.com/drive/folders/${op.idCarpeta}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
                                            <FolderOpen size={16} /> Abrir Carpeta Drive
                                        </a>
                                    ) : (
                                        <div style={{ padding: '10px', background: 'var(--surface-raised)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                                            Sin carpeta asignada
                                        </div>
                                    )}
                                </div>

                                {/* ALL PARTIES (Contacts, Billing, Forwarder) */}
                                <div className="card" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                                    {/* MAIN ENTITIES */}
                                    <div>
                                        <h3 style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
                                            CONTACTOS
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                            {[
                                                { label: 'CLIENTE', value: op.cliente, field: 'cliente', border: 'var(--accent)' },
                                                { label: 'EXPORTER', value: op.exportador, field: 'exportador', border: 'var(--green)' },
                                                { label: 'PRODUCER', value: op.productor, field: 'productor', border: 'var(--amber)' }
                                            ].map((ent, i) => (
                                                <div
                                                    key={i}
                                                    style={{
                                                        padding: 'var(--space-2) var(--space-3)',
                                                        borderRadius: 'var(--radius-sm)',
                                                        borderLeft: `3px solid ${ent.border}`,
                                                        background: 'var(--surface-raised)',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '2px',
                                                        transition: 'all 0.2s ease',
                                                        cursor: isEditing ? 'default' : 'pointer'
                                                    }}
                                                    className="hover:bg-opacity-80 hover:brightness-110 active:scale-[0.98]"
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <label className="flex justify-between items-center w-full" style={{ fontSize: '8px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                                                            <span>{ent.label}</span>
                                                            {isEditing && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (ent.field === 'cliente') setIsImporterModalOpen(true);
                                                                        else if (ent.field === 'exportador') setIsExporterModalOpen(true);
                                                                        else if (ent.field === 'productor') setIsProducerModalOpen(true);
                                                                    }}
                                                                    className="bg-transparent border-none text-[var(--accent)] cursor-pointer text-[9px] flex items-center gap-1 hover:underline p-0"
                                                                    title={`Crear nuevo ${ent.label.toLowerCase()}`}
                                                                >
                                                                    <Plus size={10} /> Nuevo
                                                                </button>
                                                            )}
                                                        </label>

                                                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', opacity: 0.6 }}>ID: {ent.value || '-'}</span>
                                                    </div>
                                                    {isEditing ? (
                                                        <div style={{ marginTop: '4px' }}>
                                                            <SearchableSelect
                                                                options={localContacts.map(c => ({ id: c.id, label: `${c.id} | ${c.empresa}` }))}

                                                                value={ent.value || ''}
                                                                onChange={(val) => handleChange(ent.field, val)}
                                                                placeholder={`Seleccionar ${ent.label}`}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {allContacts.find(c => c.id === ent.value)?.empresa || ent.value || '-'}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* FORWARDER */}
                                    <div>
                                        <h3 style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
                                            AGENTE DE CARGA
                                        </h3>
                                        <div style={{
                                            padding: 'var(--space-2) var(--space-3)',
                                            borderRadius: 'var(--radius-sm)',
                                            borderLeft: `3px solid var(--blue)`,
                                            background: 'var(--surface-raised)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '2px',
                                            transition: 'all 0.2s ease',
                                            cursor: isEditing ? 'default' : 'pointer'
                                        }}
                                            className="hover:bg-opacity-80 hover:brightness-110 active:scale-[0.98]"
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <label className="flex justify-between items-center w-full" style={{ fontSize: '8px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                                                    <span>FORWARDER</span>
                                                    {isEditing && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsForwarderModalOpen(true)}
                                                            className="bg-transparent border-none text-[var(--accent)] cursor-pointer text-[9px] flex items-center gap-1 hover:underline p-0"
                                                            title="Crear nuevo forwarder"
                                                        >
                                                            <Plus size={10} /> Nuevo
                                                        </button>
                                                    )}
                                                </label>

                                                <span style={{ fontSize: '9px', color: 'var(--text-muted)', opacity: 0.6 }}>ID: {op.forwarder || '-'}</span>
                                            </div>
                                            {isEditing ? (
                                                <div style={{ marginTop: '4px' }}>
                                                    <SearchableSelect
                                                        options={localContacts.filter(c => c.isForwarder || c.tipo === 'Forwarder').map(c => ({ id: c.id, label: `${c.id} | ${c.empresa}` }))}
                                                        value={op.forwarder || ''}
                                                        onChange={(val) => handleChange('forwarder', val)}
                                                        placeholder="Seleccionar Forwarder"
                                                    />
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {localContacts.find(c => c.id === op.forwarder)?.empresa || op.forwarder || '-'}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* LOGISTICS PARTIES */}
                                    <div>
                                        <h3 style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
                                            FACTURACIÓN Y ENVÍO
                                        </h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                            {[
                                                { label: 'BILL TO', value: op.billToId, field: 'billToId', border: 'var(--purple)' },
                                                { label: 'CONSIGNEE', value: op.consigneeId, field: 'consigneeId', border: 'var(--cyan)' },
                                                { label: 'NOTIFY PARTY', value: op.notifyId, field: 'notifyId', border: 'var(--indigo)' }
                                            ].map((ent, i) => (
                                                <div
                                                    key={i}
                                                    style={{
                                                        padding: 'var(--space-2) var(--space-3)',
                                                        borderRadius: 'var(--radius-sm)',
                                                        borderLeft: `3px solid ${ent.border}`,
                                                        background: 'var(--surface-raised)',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '2px',
                                                        transition: 'all 0.2s ease',
                                                        cursor: isEditing ? 'default' : 'pointer'
                                                    }}
                                                    className="hover:bg-opacity-80 hover:brightness-110 active:scale-[0.98]"
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <label className="flex justify-between items-center w-full" style={{ fontSize: '8px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                                                            <span>{ent.label}</span>
                                                            {isEditing && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setIsImporterModalOpen(true)}
                                                                    className="bg-transparent border-none text-[var(--accent)] cursor-pointer text-[9px] flex items-center gap-1 hover:underline p-0"
                                                                    title={`Crear nuevo ${ent.label.toLowerCase()}`}
                                                                >
                                                                    <Plus size={10} /> Nuevo
                                                                </button>
                                                            )}
                                                        </label>

                                                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', opacity: 0.6 }}>ID: {ent.value || '-'}</span>
                                                    </div>
                                                    {isEditing ? (
                                                        <div style={{ marginTop: '4px' }}>
                                                            <SearchableSelect
                                                                options={localContacts.map(c => ({ id: c.id, label: `${c.id} | ${c.empresa}` }))}

                                                                value={ent.value || ''}
                                                                onChange={(val) => handleChange(ent.field, val)}
                                                                placeholder={`Seleccionar ${ent.label}`}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {localContacts.find(c => c.id === ent.value)?.empresa || ent.value || '-'}

                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                </div>

                                </div>

                            {/* COL 3/4: DETAILED LOGISTICS & PRODUCTS */}
                            <div className="xl:col-span-3" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                                <div className="card" style={{ padding: 'var(--space-6)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ background: 'var(--accent-soft)', color: 'var(--accent)', padding: '10px', borderRadius: 'var(--radius-lg)' }}>
                                                <Ship size={24} />
                                            </div>
                                            <div>
                                                <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>LOGÍSTICA DE OPERACIÓN</h3>
                                                <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>Detalles de Tránsito y Carga</p>
                                            </div>
                                        </div>
                                        {isEditing ? (
                                            <div style={{ textAlign: 'right' }}>
                                                <label style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Booking / BL</label>
                                                <input
                                                    type="text"
                                                    className="input-compact"
                                                    style={{ width: '100%', maxWidth: '180px', fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}
                                                    value={op.booking || ''}
                                                    onChange={e => handleChange('booking', e.target.value.trim())}
                                                    placeholder="Ej: HLCU1234567"
                                                />
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'right' }}>
                                                <label style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Booking / BL</label>
                                                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                                                    {op.booking || 'Sin BL'}
                                                </div>
                                            </div>
                                        )}

                                    </div>

                                    {/* Main Route Display */}
                                    <div style={{
                                        background: 'var(--surface-raised)',
                                        padding: 'var(--space-6)',
                                        borderRadius: 'var(--radius-lg)',
                                        marginBottom: 'var(--space-6)',
                                        display: 'flex',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 'var(--space-4)',
                                        border: '1px solid var(--border)',
                                        flexWrap: 'wrap'
                                    }}>
                                        <div style={{ flex: '1 1 100px', textAlign: 'left' }}>
                                            <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '8px' }}>Punto de Origen (POL)</div>
                                            {isEditing ? (
                                                <div style={{ marginTop: '8px' }}>
                                                    <PortAutocomplete
                                                        value={op.portLoad || ''}
                                                        onChange={(v) => handleChange('portLoad', v)}
                                                        placeholder="Ej: Buenos Aires, Argentina"
                                                    />
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 900, color: 'var(--text)' }}>{op.portLoad || 'POR DEFINIR'}</div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto', color: 'var(--accent)', opacity: 0.9, margin: '0 16px' }}>
                                            <div style={{ padding: '12px', background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                                                <RefreshCw size={24} className="animate-pulse" />
                                            </div>
                                        </div>

                                        <div style={{ flex: '1 1 100px', textAlign: 'right' }}>
                                            <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '8px' }}>Destino Final (POD)</div>
                                            {isEditing ? (
                                                <div style={{ marginTop: '8px' }}>
                                                    <PortAutocomplete
                                                        value={op.puertoDestino || ''}
                                                        onChange={(v) => handleChange('puertoDestino', v)}
                                                        placeholder="Ej: Norfolk, USA"
                                                    />
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 900, color: 'var(--text)' }}>{op.puertoDestino || 'POR DEFINIR'}</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Pre / On Carriage */}
                                    {(op.preCarriage || op.onCarriage || isEditing) && (
                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                            {[
                                                { key: 'preCarriage' as const, label: 'Pre-Carriage', sub: 'antes del barco', placeholder: 'Lugar de origen...', icon: <Truck size={13} /> },
                                                { key: 'onCarriage' as const, label: 'On-Carriage', sub: 'después del barco', placeholder: 'Destino final...', icon: <Factory size={13} /> }
                                            ].map(({ key, label, sub, placeholder, icon }) => (
                                                <div key={key} style={{ flex: '1 1 140px', background: 'var(--surface-raised)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '10px 12px' }}>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        {icon} {label}
                                                        <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: '2px' }}>({sub})</span>
                                                    </div>
                                                    {isEditing ? (
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <div style={{ flex: 1 }}>
                                                                <PortAutocomplete
                                                                    value={(op[key] || '').split('|')[0]}
                                                                    onChange={v => handleChange(key, `${v}|${(op[key] || '').split('|')[1] || 'Camión'}`)}
                                                                    placeholder={placeholder}
                                                                />
                                                            </div>
                                                            <select className="input-compact" style={{ width: '110px' }}
                                                                value={(op[key] || '').split('|')[1] || 'Camión'}
                                                                onChange={e => handleChange(key, `${(op[key] || '').split('|')[0]}|${e.target.value}`)}>
                                                                <option>Camión</option><option>Tren</option><option>Barco</option><option>Avión</option>
                                                            </select>
                                                        </div>
                                                    ) : op[key] ? (
                                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                                                            {(op[key] || '').split('|')[0] || '—'}
                                                            <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--text-dim)', background: 'var(--surface)', padding: '2px 7px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                                                {(op[key] || '').split('|')[1] || 'Camión'}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic' }}>No aplica</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Logistics Grid - Grouped and Ordered */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Left Sub-column: Transit */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                                                <h4 style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '16px' }}>Gestión de Tránsito</h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                    {[
                                                        {
                                                            label: 'Contenedor', value: op.containerNumber, field: 'containerNumber', icon: <Box size={14} />,
                                                            renderValue: () => {
                                                                const n = op.containerNumber
                                                                if (!n) return <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>---</span>
                                                                const url = getCarrierTrackingURL(n, detectCarrier(n))
                                                                return (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{n}</span>
                                                                        {url && <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center' }}><ExternalLink size={11} /></a>}
                                                                    </div>
                                                                )
                                                            }
                                                        },
                                                        { label: 'Ship Lane', value: op.shipLane, field: 'shipLane', icon: <RefreshCw size={14} /> },
                                                        { label: 'Freight Value', value: op.freightValue, field: 'freightValue', icon: <DollarSign size={14} />, color: 'var(--accent)' },
                                                    ].map((item, idx) => (
                                                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                                                                {item.icon}
                                                                <span style={{ fontSize: '11px', fontWeight: 600 }}>{item.label}</span>
                                                            </div>
                                                            {isEditing ? (
                                                                item.field === 'forwarder' ? (
                                                                    <div style={{ width: '160px' }}>
                                                                        <SearchableSelect
                                                                            options={allContacts
                                                                                .filter(c => c.isForwarder || c.tipo === 'Forwarder')
                                                                                .map(c => ({ id: c.id, label: `${c.id} | ${c.empresa}` }))}
                                                                            value={item.value || ''}
                                                                            onChange={(val) => handleChange('forwarder', val)}
                                                                            placeholder="Seleccionar..."
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <input className="input-compact" style={{ width: '100%', fontSize: '12px' }} value={item.value || ''} onChange={e => handleChange(item.field!, e.target.value)} />
                                                                )
                                                            ) : (
                                                                (item as any).renderValue
                                                                    ? (item as any).renderValue()
                                                                    : <span style={{ fontSize: '13px', fontWeight: 700, color: (item as any).color || 'var(--text)' }}>
                                                                        {item.field === 'forwarder' && item.value
                                                                            ? (allContacts.find(c => c.id === item.value)?.empresa || item.value)
                                                                            : (item.value || '---')}
                                                                    </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Sub-column: Commercial */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                                                <h4 style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '16px' }}>Condiciones Comerciales</h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                    {[
                                                        { label: 'Incoterm', value: op.incoterm, field: 'incoterm', icon: <Package size={14} /> },
                                                        {
                                                            label: 'Payment Terms',
                                                            value: op.paymentTerms,
                                                            field: 'paymentTerms',
                                                            icon: <Clock size={14} />,
                                                            isCustom: true
                                                        },
                                                        { label: 'Brand', value: op.brand, field: 'brand', icon: <Tag size={14} /> },
                                                    ].map((item, idx) => (
                                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', flexShrink: 0 }}>
                                                                {item.icon}
                                                                <span style={{ fontSize: '11px', fontWeight: 600 }}>{item.label}</span>
                                                            </div>
                                                            {isEditing ? (
                                                                item.field === 'paymentTerms' ? (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '150px' }}>
                                                                        <select
                                                                            className="input-compact"
                                                                            style={{ width: '100%', fontSize: '12px' }}
                                                                            value={PAYMENT_TERMS_OPTIONS.includes(op.paymentTerms || '') ? op.paymentTerms : (op.paymentTerms ? 'Otros' : '')}
                                                                            onChange={e => {
                                                                                if (e.target.value === 'Otros') {
                                                                                    handleChange('paymentTerms', ' ')
                                                                                } else {
                                                                                    handleChange('paymentTerms', e.target.value)
                                                                                }
                                                                            }}
                                                                        >
                                                                            <option value="">Seleccionar...</option>
                                                                            {PAYMENT_TERMS_OPTIONS.filter(o => o !== 'Otros').map(opt => (
                                                                                <option key={opt} value={opt}>{opt}</option>
                                                                            ))}
                                                                            <option value="Otros">Otros (Especificar abajo)</option>
                                                                        </select>
                                                                        {(!PAYMENT_TERMS_OPTIONS.filter(o => o !== 'Otros').includes(op.paymentTerms || '') && op.paymentTerms !== '') && (
                                                                            <input
                                                                                className="input-compact"
                                                                                style={{ width: '100%', fontSize: '12px', borderStyle: 'dashed' }}
                                                                                value={op.paymentTerms === ' ' ? '' : op.paymentTerms}
                                                                                placeholder="Especificar..."
                                                                                onChange={e => handleChange('paymentTerms', e.target.value || ' ')}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                ) : item.field === 'incoterm' ? (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '150px' }}>
                                                                        <select
                                                                            className="input-compact"
                                                                            style={{ width: '100%', fontSize: '12px' }}
                                                                            value={INCOTERMS_OPTIONS.includes(op.incoterm || '') ? op.incoterm : (op.incoterm ? 'Otros' : '')}
                                                                            onChange={e => {
                                                                                if (e.target.value === 'Otros') {
                                                                                    handleChange('incoterm', ' ')
                                                                                } else {
                                                                                    handleChange('incoterm', e.target.value)
                                                                                }
                                                                            }}
                                                                        >
                                                                            <option value="">Seleccionar...</option>
                                                                            {INCOTERMS_OPTIONS.filter(o => o !== 'Otros').map(opt => (
                                                                                <option key={opt} value={opt}>{opt}</option>
                                                                            ))}
                                                                            <option value="Otros">Otros (Especificar abajo)</option>
                                                                        </select>
                                                                        {(!INCOTERMS_OPTIONS.filter(o => o !== 'Otros').includes(op.incoterm || '') && op.incoterm !== '') && (
                                                                            <input
                                                                                className="input-compact"
                                                                                style={{ width: '100%', fontSize: '12px', borderStyle: 'dashed' }}
                                                                                value={op.incoterm === ' ' ? '' : op.incoterm}
                                                                                placeholder="Especificar..."
                                                                                onChange={e => handleChange('incoterm', e.target.value || ' ')}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <input className="input-compact" style={{ width: '100%', fontSize: '12px' }} value={item.value || ''} onChange={e => handleChange(item.field!, e.target.value)} />
                                                                )
                                                            ) : (
                                                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', textAlign: 'right' }}>{item.value || '---'}</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cronograma - Full width below both columns */}
                                    <div style={{ marginTop: '8px' }}>
                                        <h4 style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '16px' }}>Cronograma</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            {[
                                                { label: 'LD (Carga)', value: op.loadedDate, field: 'loadedDate', color: 'var(--blue)', icon: <Calendar size={14} /> },
                                                { label: 'ETD (Salida)', value: op.fechaEmbarque, field: 'fechaEmbarque', color: 'var(--amber)', icon: <Calendar size={14} /> },
                                                { label: 'ETA (Llegada)', value: op.arrivalDate, field: 'arrivalDate', color: 'var(--green)', icon: <Calendar size={14} /> }
                                            ].map((item, idx) => {
                                                const renderDateValue = (val: string | undefined | null) => {
                                                    if (!val) return '-';
                                                    if (val.match(/^\d{2}\/\d{2}\/\d{4}$/)) return val;
                                                    const dateStr = val && val.includes('-') && !val.includes('T') ? `${val}T00:00:00` : val;
                                                    const d = new Date(dateStr as string);
                                                    if (!isNaN(d.getTime())) return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                                    return val;
                                                };
                                                const getInputDateValue = (val: string | undefined | null) => {
                                                    if (!val) return '';
                                                    if (val.match(/^\d{2}\/\d{2}\/\d{4}/)) {
                                                        const [d, m, y] = val.substring(0, 10).split('/');
                                                        return `${y}-${m}-${d}`;
                                                    }
                                                    if (val.match(/^\d{4}-\d{2}-\d{2}/)) return val.substring(0, 10);
                                                    return '';
                                                };
                                                return (
                                                    <div key={idx} style={{ background: 'var(--surface-raised)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim)', marginBottom: '12px' }}>
                                                            {item.icon}
                                                            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</span>
                                                        </div>
                                                        {isEditing ? (
                                                            <div style={{ position: 'relative' }}>
                                                                <input
                                                                    type="date"
                                                                    className="input-compact"
                                                                    style={{
                                                                        width: '100%',
                                                                        height: '36px',
                                                                        fontSize: '13px',
                                                                        fontWeight: 600,
                                                                        paddingLeft: '12px',
                                                                        paddingRight: '12px',
                                                                        color: 'var(--text)',
                                                                        background: 'var(--surface)'
                                                                    }}
                                                                    value={getInputDateValue(item.value)}
                                                                    onChange={e => handleChange(item.field!, e.target.value)}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div style={{ fontSize: '16px', fontWeight: 800, color: item.value ? item.color : 'var(--text-dim)' }}>
                                                                {renderDateValue(item.value)}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* PRODUCTS TABLE */}
                                <div className="card" style={{ padding: 'var(--space-6)' }}>
                                    {(() => {
                                        const salesEntries = parseProductEntries(op.productos)
                                        const purchaseEntries = parseProductEntries(op.purchasePricesRaw)
                                        const totalVenta = salesEntries.reduce((s, i) => s + i.qty * i.price, 0)
                                        const totalCompra = purchaseEntries.reduce((s, i) => s + i.qty * i.price, 0)
                                        const fmt = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })
                                        return (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                                                <h3 style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                                                    PRODUCTOS &amp; CARGA
                                                </h3>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    {totalCompra > 0 && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                            <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Compra</span>
                                                            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--amber)' }}>{fmt(totalCompra)}</span>
                                                        </div>
                                                    )}
                                                    {totalVenta > 0 && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                            <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Venta</span>
                                                            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent)' }}>{fmt(totalVenta)}</span>
                                                        </div>
                                                    )}
                                                    <div className="badge badge-success">
                                                        {salesEntries.length} Ítems
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })()}


                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                        {isEditing ? (
                                            <>
                                                {editedProducts.map((p, idx) => (
                                                    <ProductCard
                                                        key={idx}
                                                        isEditing={true}
                                                        product={p}
                                                        allProducts={localProducts}
                                                        allContacts={localContacts}
                                                        onQuickCreateProduct={() => setIsProductModalOpen(true)}
                                                        onChange={(updates) => {
                                                            const newProds = [...editedProducts];
                                                            newProds[idx] = { 
                                                                ...newProds[idx], 
                                                                ...updates,
                                                                qty: updates.qty !== undefined ? updates.qty : newProds[idx].qty,
                                                                price: updates.price !== undefined ? updates.price : newProds[idx].price,
                                                                purchasePrice: updates.purchasePrice !== undefined ? updates.purchasePrice : newProds[idx].purchasePrice
                                                            };
                                                            setEditedProducts(newProds);
                                                        }}
                                                        onDelete={() => setEditedProducts(prev => prev.filter((_, i) => i !== idx))}
                                                    />
                                                ))}
                                                <button
                                                    className="btn btn-secondary"
                                                    onClick={() => setEditedProducts([...editedProducts, { id: '', qty: 0, price: formatInputBankStyle(0), purchasePrice: formatInputBankStyle(0) }])}
                                                    style={{ width: '100%', borderStyle: 'dashed', padding: 'var(--space-4)', background: 'transparent' }}
                                                >
                                                    <Plus size={16} /> Añadir Producto
                                                </button>
                                            </>
                                        ) : (
                                            /* Read-Only View */
                                            (() => {
                                                const sales = parseProductEntries(op.productos)
                                                const purchases = parseProductEntries(op.purchasePricesRaw)

                                                const mergedMap = new Map<string, { id: string, qty: number, price: number, purchasePrice: number }>()
                                                sales.forEach(s => {
                                                    mergedMap.set(s.id, { id: s.id, qty: s.qty, price: s.price, purchasePrice: 0 })
                                                })
                                                purchases.forEach(p => {
                                                    if (mergedMap.has(p.id)) {
                                                        mergedMap.get(p.id)!.purchasePrice = p.price
                                                    } else {
                                                        mergedMap.set(p.id, { id: p.id, qty: p.qty, price: 0, purchasePrice: p.price })
                                                    }
                                                })
                                                const merged = Array.from(mergedMap.values())

                                                if (merged.length === 0) {
                                                    return <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)', fontStyle: 'italic' }}>No hay productos registrados</div>
                                                }

                                                return merged.map((p, i) => (
                                                    <ProductCard
                                                        key={i}
                                                        isEditing={false}
                                                        product={p}
                                                        allProducts={localProducts}
                                                        allContacts={localContacts}
                                                    />
                                                ));
                                            })()
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar - Optional */}
                        </div>
                    </div>
                )}

                {activeTab === 'documentos' && (
                    <OperationDocumentsTab
                        op={op}
                        allContacts={allContacts}
                        onUpdate={() => router.refresh()}
                    />
                )}

                {activeTab === 'logistica' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                        {/* Si NO hay contenedor: mostrar cotizaciones de flete */}
                        {(!op.containerNumber || op.containerNumber.trim() === '') && (
                            <FreightView
                                op={op}
                                contacts={allContacts}
                                fletes={fletes}
                                onAddFlete={handleAddFlete}
                                onUpdateFlete={handleUpdateFlete}
                                onDeleteFlete={handleDeleteFlete}
                                isEditing={isEditing}
                            />
                        )}

                        {/* Si HAY BL o booking: mostrar tracking */}
                        {(op.booking && op.booking.trim() !== '') && (
                            <ContainerTrackingWidget
                                trackingIdentifier={op.booking}
                                containerNumber={op.containerNumber}
                                bookingNumber={op.booking}
                                operationId={op.id}
                                fallbackPol={op.portLoad}
                                fallbackPod={op.puertoDestino}
                            />
                        )}
                    </div>
                )}

                {activeTab === 'finanzas' && (
                    <CashFlowManager
                        operationId={op.id!}
                        totalSales={parseProductEntries(op.productos).reduce((s, i) => s + (i.qty * i.price), 0)}
                        totalPurchases={parseProductEntries(op.purchasePricesRaw).reduce((s, i) => s + (i.qty * i.price), 0)}
                        showAddButton={!isEditing}
                    />
                )}

                {activeTab === 'reclamos' && (
                    <ClaimsSection
                        operationId={op.id!}
                        clienteId={op.cliente}
                        allContacts={allContacts}
                    />
                )}

                {activeTab === 'qc' && (
                    <QualityControlTab
                        op={op}
                        allContacts={allContacts}
                    />
                )}

                {renderNotesSection()}

                {/* Load Milestone Modal */}
                <LoadModal
                    isOpen={showLoadModal}
                    onClose={() => setShowLoadModal(false)}
                    initialData={op}
                    onSave={async (loadData) => {
                        // Merge current op with load data
                        const updatedOp = { ...op, ...loadData }
                        setOp(updatedOp)

                        try {
                            const res = await fetch(`/api/operaciones/${op.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(updatedOp)
                            })
                            if (res.ok) {
                                showToast('Hito de Carga registrado con éxito. El contenedor ahora está en Tracking.', 'success')
                                router.refresh()
                            } else {
                                throw new Error('Failed to update')
                            }
                        } catch (e) {
                            showToast('Error al registrar el hito de carga', 'error')
                        }
                    }}
                />

                {/* Confirmation Modal for Note Deletion */}
                {noteToDeleteIndex !== null && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000,
                        padding: '20px'
                    }}>
                        <div style={{
                            background: 'var(--surface-raised)',
                            border: '1px solid var(--border)',
                            borderRadius: '16px',
                            padding: '32px',
                            width: '100%',
                            maxWidth: '400px',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: 'var(--red)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px'
                            }}>
                                <Trash2 size={24} />
                            </div>
                            <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Eliminar comentario</h4>
                            <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginBottom: '24px' }}>
                                ¿Estás seguro de que deseas eliminar este comentario? Esta acción no se puede deshacer.
                            </p>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                <Button
                                    variant="secondary"
                                    onClick={() => setNoteToDeleteIndex(null)}
                                    style={{ flex: 1 }}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={handleDeleteComment}
                                    style={{ flex: 1 }}
                                >
                                    Eliminar
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Operation Confirmation Modal */}
                {deleteModal && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10001,
                        padding: '20px',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div className="card" style={{
                            width: '100%',
                            maxWidth: '420px',
                            padding: '32px',
                            border: '1px solid var(--red-soft)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                        }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: 'var(--red)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 24px'
                            }}>
                                <Trash2 size={32} />
                            </div>

                            <h4 style={{
                                fontSize: '20px',
                                fontWeight: 800,
                                marginBottom: '12px',
                                textAlign: 'center',
                                color: 'var(--text)'
                            }}>
                                ¿Eliminar Operación?
                            </h4>

                            <p style={{
                                color: 'var(--text-dim)',
                                fontSize: '14px',
                                marginBottom: '32px',
                                textAlign: 'center',
                                lineHeight: '1.6'
                            }}>
                                Esta acción eliminará permanentemente la operación <strong>{op.id}</strong> y todos sus datos asociados. <br />
                                <span style={{ color: 'var(--red)', fontWeight: 600 }}>Esta acción no se puede deshacer.</span>
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <Button
                                    variant="secondary"
                                    onClick={() => setDeleteModal(false)}
                                    disabled={saving}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={handleDeleteOperation}
                                    isLoading={saving}
                                >
                                    Eliminar
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Success Modal for Operation Deletion */}
                {showSuccessModal && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10001,
                        padding: '20px'
                    }}>
                        <div style={{
                            background: 'var(--surface-raised)',
                            border: '1px solid var(--border)',
                            borderRadius: '24px',
                            padding: '40px',
                            width: '100%',
                            maxWidth: '400px',
                            textAlign: 'center',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                        }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: 'rgba(34, 197, 94, 0.1)',
                                color: 'var(--green)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 24px'
                            }}>
                                <CheckCircle size={32} />
                            </div>
                            <h4 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '12px' }}>Operación Eliminada</h4>
                            <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginBottom: '32px' }}>
                                La operación ha sido eliminada correctamente de la base de datos y de Google Drive.
                            </p>
                            <Button
                                variant="primary"
                                onClick={() => {
                                    router.push('/operaciones')
                                    router.refresh()
                                }}
                                className="w-full"
                            >
                                Continuar
                            </Button>
                        </div>
                    </div>
                )}

                {/* Liquidation Confirmation Modal */}
                {showLiquidationModal && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10001,
                        padding: '20px',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div className="card" style={{
                            width: '100%',
                            maxWidth: '420px',
                            padding: '32px',
                            border: '1px solid var(--cyan-soft)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                        }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: 'var(--cyan-soft)',
                                color: 'var(--cyan)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 24px'
                            }}>
                                <Archive size={32} />
                            </div>

                            <h4 style={{
                                fontSize: '20px',
                                fontWeight: 800,
                                marginBottom: '12px',
                                textAlign: 'center',
                                color: 'var(--text)'
                            }}>
                                ¿Liquidar Operación?
                            </h4>

                            <p style={{
                                color: 'var(--text-dim)',
                                fontSize: '14px',
                                marginBottom: '32px',
                                textAlign: 'center',
                                lineHeight: '1.6'
                            }}>
                                Esta acción moverá la operación <strong>{op.id}</strong> al Historial y ya no aparecerá en el Dashboard activo. <br />
                                <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>Todos los datos financieros y logísticos serán preservados.</span>
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowLiquidationModal(false)}
                                    disabled={liquidating}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleLiquidate}
                                    isLoading={liquidating}
                                >
                                    Confirmar Liquidación
                                </Button>
                            </div>
                        </div>
                    </div>
                )}


                {activeTab === 'embarque' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                        {/* Fletes & RFQ Section */}
                        <div className="card" style={{ padding: 'var(--space-6)', border: '1px solid var(--accent-soft)', background: 'linear-gradient(180deg, var(--surface) 0%, var(--surface-raised) 100%)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ background: 'var(--accent)', color: 'white', padding: '10px', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 12px rgba(26, 59, 92, 0.3)' }}>
                                        <Ship size={24} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>COTIZACIONES Y FLETES</h3>
                                        <p style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Gestión de Forwarders (RFQ)</p>
                                    </div>
                                </div>
                                <Button
                                    variant="primary"
                                    onClick={() => {
                                        const forwarders = allContacts.filter(c => c.isForwarder)
                                        if (forwarders.length === 0) {
                                            showToast('No hay forwarders registrados. Por favor, crea uno en la sección de Contactos.', 'warning')
                                            return
                                        }

                                        const prodEntries = parseProductEntries(op.productos)
                                        const cargaDesc = prodEntries.map(p => {
                                            const prod = allProducts.find(ap => ap.id === p.id)
                                            return `${prod?.especie || p.id} - ${p.qty}kg`
                                        }).join(', ')

                                        const message = `Hola, ¿me cotizas este flete? Op ${op.id}: ${op.portLoad || 'POL'} a ${op.puertoDestino || 'POD'} ` +
                                            `Carga: ${cargaDesc || 'A definir'} ` +
                                            `Especial: Temp ${op.instrucciones_frio || 'Frozen -18°C'} ` +
                                            `Fecha: ${op.fechaEmbarque || 'A definir'}.` +
                                            `${op.seguro_estado === 'Forwarder' ? ' Con seguro.' : ''}`

                                        const encoded = encodeURIComponent(message)
                                        // If multiple forwarders, user might want to pick one or send to all. 
                                        // For now, let's open WhatsApp with the message for the user to pick.
                                        window.open(`https://wa.me/?text=${encoded}`, '_blank')
                                    }}
                                    leftIcon={<Plus size={18} />}
                                >
                                    Solicitar Cotización (RFQ)
                                </Button>
                            </div>

                            {loadingFletes ? (
                                <div style={{ padding: 'var(--space-10)', textAlign: 'center' }}>
                                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto', color: 'var(--accent)' }} />
                                    <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-dim)' }}>Cargando cotizaciones...</p>
                                </div>
                            ) : fletes.length === 0 ? (
                                <div style={{ padding: 'var(--space-8)', textAlign: 'center', background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
                                    <p style={{ color: 'var(--text-muted)' }}>No hay cotizaciones registradas para esta operación.</p>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Forwarder</th>
                                                <th>Monto</th>
                                                <th>Seguro</th>
                                                <th>Temp</th>
                                                <th>Validez</th>
                                                <th>Estado</th>
                                                <th style={{ textAlign: 'right' }}>Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {fletes.map((f, i) => (
                                                <tr key={i} style={{ opacity: f.estado === 'Rechazado' ? 0.6 : 1 }}>
                                                    <td style={{ fontWeight: 700 }}>{f.forwarder}</td>
                                                    <td style={{ fontFamily: 'var(--font-mono)' }}>{f.moneda} {formatNumber(Number(f.monto))}</td>
                                                    <td>
                                                        <span className={f.seguro === 'SI' ? 'text-green' : 'text-dim'}>
                                                            {f.seguro === 'SI' ? 'SI' : 'NO'}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontSize: '11px' }}>{f.temp}</td>
                                                    <td style={{ fontSize: '11px' }}>{f.validez}</td>
                                                    <td>
                                                        <span className={`badge ${f.estado === 'Seleccionado' ? 'badge-success' : f.estado === 'Rechazado' ? 'badge-danger' : 'badge-info'}`}>
                                                            {f.estado}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                            {f.estado === 'Pendiente' && (
                                                                <button
                                                                    className="btn btn-secondary btn-small"
                                                                    onClick={async () => {
                                                                        await fetch(`/api/operaciones/${op.id}/fletes`, {
                                                                            method: 'PUT',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ forwarder: f.forwarder, estado: 'Seleccionado' })
                                                                        })
                                                                        // Update operation forwarder and freightValue
                                                                        await handleSave(); // To refresh, or fetch locally
                                                                        await handleChange('forwarder', f.forwarder)
                                                                        await handleChange('freightValue', f.monto)
                                                                        await handleSave()
                                                                        fetchFletes()
                                                                    }}
                                                                >
                                                                    Seleccionar
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDeleteFlete(f.forwarder)}
                                                                style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: '4px' }}
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Refrigeration & Insurance Specs */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
                            <div className="card" style={{ padding: 'var(--space-6)' }}>
                                <h3 style={{ fontSize: '12px', fontWeight: 800, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <RefreshCw size={16} color="var(--cyan)" /> ESPECIFICACIONES DE FRÍO
                                </h3>
                                <div className="input-group">
                                    <label className="input-label">Instrucciones de Temperatura / Ventilación</label>
                                    {isEditing ? (
                                        <textarea
                                            className="input"
                                            rows={3}
                                            value={op.instrucciones_frio || ''}
                                            onChange={e => handleChange('instrucciones_frio', e.target.value)}
                                            placeholder="Ej: Mantener a -18°C constante. Vent: Closed."
                                        />
                                    ) : (
                                        <div style={{ padding: '12px', background: 'var(--surface-raised)', borderRadius: 'var(--radius-md)', fontSize: '14px', minHeight: '80px' }}>
                                            {op.instrucciones_frio || 'Sin instrucciones especificadas'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="card" style={{ padding: 'var(--space-6)' }}>
                                <h3 style={{ fontSize: '12px', fontWeight: 800, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ShieldCheck size={16} color="var(--green)" /> SEGURO DE CARGA
                                </h3>
                                <div className="input-group">
                                    <label className="input-label">Estado del Seguro</label>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <Button
                                            onClick={() => handleChange('seguro_estado', 'None')}
                                            variant={(!op.seguro_estado || op.seguro_estado === 'None') ? 'primary' : 'secondary'}
                                            className="flex-1 h-12"
                                        >
                                            Sin Seguro
                                        </Button>
                                        <Button
                                            onClick={() => handleChange('seguro_estado', 'Forwarder')}
                                            variant={op.seguro_estado === 'Forwarder' ? 'primary' : 'secondary'}
                                            className="flex-1 h-12"
                                        >
                                            Con Seguro
                                        </Button>
                                    </div>
                                </div>
                                <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: 'var(--space-4)' }}>
                                    * Esta información será incluida automáticamente en la "Booking Instruction".
                                </p>
                            </div>
                        </div>

                        {/* Booking Instruction Action */}
                        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', border: '2px dashed var(--accent-soft)' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>Instrucción de Booking (BI)</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: '14px', maxWidth: '500px', margin: '0 auto 24px' }}>
                                Una vez seleccionado el forwarder y confirmada la tarifa, genera el documento formal de instrucciones de booking para enviar al agente.
                            </p>
                            <button
                                className="btn btn-primary"
                                style={{ padding: '12px 32px' }}
                                disabled={!op.forwarder}
                                onClick={async () => {
                                    try {
                                        // Show loading toast or state if possible, or just rely on browser download
                                        const btn = document.activeElement as HTMLButtonElement;
                                        const originalText = btn.innerText;
                                        btn.innerText = 'Generando...';
                                        btn.disabled = true;

                                        const res = await fetch(`/api/operaciones/${op.id}/fletes/pdf`, {
                                            method: 'POST',
                                        });

                                        if (!res.ok) {
                                            const err = await res.json();
                                            throw new Error(err.error || 'Error al generar PDF');
                                        }

                                        // Handle PDF download
                                        const blob = await res.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `Booking_Instruction_${op.id}.pdf`;
                                        document.body.appendChild(a);
                                        a.click();
                                        window.URL.revokeObjectURL(url);
                                        document.body.removeChild(a);

                                        btn.innerText = originalText;
                                        btn.disabled = false;
                                        // Use toast if available in this scope, otherwise silent success (download is feedback)
                                        // If showToast is available from context... but we are deep in render. 
                                        // It seems OperationDetailView doesn't extract showToast from useToast() at top level yet?
                                        // Let's check if we can add it. 
                                    } catch (e: any) {
                                        showToast('Error al generar PDF: ' + e.message, 'error'); // Fallback until we refactor to Toast completely
                                        const btn = document.activeElement as HTMLButtonElement;
                                        if (btn) {
                                            btn.innerText = 'Generar Booking Instruction PDF';
                                            btn.disabled = false;
                                        }
                                    }
                                }}
                            >
                                <FileCheck size={18} /> Generar Booking Instruction PDF
                            </button>
                            {!op.forwarder && <p style={{ color: 'var(--red)', fontSize: '11px', marginTop: '8px' }}>* Debes seleccionar un forwarder primero</p>}
                        </div>
                    </div>
                )}
            </div>

            {fleteToDelete && (
                <ConfirmModal
                    isOpen={!!fleteToDelete}
                    onCancel={() => setFleteToDelete(null)}
                    onConfirm={confirmDeleteFlete}
                    title="Eliminar Cotización"
                    message="¿Estás seguro de que deseas eliminar esta cotización de flete? Esta acción no se puede deshacer."
                    confirmText="Eliminar"
                    cancelText="Cancelar"
                    isDestructive={true}
                    isProcessing={isDeletingFlete}
                />
            )}

            {/* QUICK CREATE MODALS */}
            {isImporterModalOpen && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: 'var(--space-8)' }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '900px', background: 'transparent' }}>
                        <ContactForm
                            onSubmit={(data) => handleCreateContact(data, 'importer')}
                            initialData={{ tipo: 'Importador' } as any}
                            onSuccess={() => setIsImporterModalOpen(false)}
                        />
                    </div>
                </div>
            )}

            {isExporterModalOpen && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: 'var(--space-8)' }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '900px', background: 'transparent' }}>
                        <ContactForm
                            onSubmit={(data) => handleCreateContact(data, 'exporter')}
                            initialData={{ tipo: 'Exportador' } as any}
                            onSuccess={() => setIsExporterModalOpen(false)}
                        />
                    </div>
                </div>
            )}

            {isProducerModalOpen && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: 'var(--space-8)' }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '900px', background: 'transparent' }}>
                        <ContactForm
                            onSubmit={(data) => handleCreateContact(data, 'producer')}
                            initialData={{ tipo: 'Productor' } as any}
                            onSuccess={() => setIsProducerModalOpen(false)}
                        />
                    </div>
                </div>
            )}

            {isForwarderModalOpen && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: 'var(--space-8)' }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '900px', background: 'transparent' }}>
                        <ContactForm
                            onSubmit={(data) => handleCreateContact(data, 'forwarder')}
                            initialData={{ tipo: 'Forwarder', isForwarder: true } as any}
                            onSuccess={() => setIsForwarderModalOpen(false)}
                        />
                    </div>
                </div>
            )}

            {isProductModalOpen && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: 'var(--space-8)' }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '900px', background: 'var(--surface)', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Nuevo Producto</h3>
                            <button onClick={() => setIsProductModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <ProductForm
                            onSubmit={handleCreateProduct}
                            onCancel={() => setIsProductModalOpen(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
