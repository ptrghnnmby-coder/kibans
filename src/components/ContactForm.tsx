'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Save, Building2, User, ArrowLeft, Hash, Globe, Camera, Upload, X, CheckCircle, Loader2, ScanLine } from 'lucide-react'
import { Button } from './ui/Button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from './ui/Toast'
import { AddressAutocomplete } from './AddressAutocomplete'

interface ContactoData {
    id?: string
    tipo: string
    empresa: string
    brand: string
    pais: string
    direccion: string
    nombreContacto: string
    apellido: string
    email: string
    telefono: string
    idioma: string
    taxId?: string
    nPlanta?: string
    fda?: string
    notes?: string
    description?: string
    isImporter?: boolean
    isExporter?: boolean
    isProducer?: boolean
    isForwarder?: boolean
    isBillTo?: boolean
    isConsignee?: boolean
    isNotify?: boolean
}

interface ContactFormProps {
    initialData?: ContactoData
    onSubmit: (data: ContactoData) => Promise<void>
    isEditing?: boolean
    onSuccess?: () => void
}

// ─── Card Scanner Modal ─────────────────────────────────────────────────────
function CardScannerModal({ onDataExtracted, onClose }: {
    onDataExtracted: (data: Record<string, string>) => void
    onClose: () => void
}) {
    const [mode, setMode] = useState<'upload' | 'camera'>('upload')
    const [isDragging, setIsDragging] = useState(false)
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [extractedData, setExtractedData] = useState<Record<string, string> | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [cameraActive, setCameraActive] = useState(false)
    const [cameraError, setCameraError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const streamRef = useRef<MediaStream | null>(null)

    const stopCamera = useCallback(() => {
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
        setCameraActive(false)
    }, [])

    useEffect(() => { return () => stopCamera() }, [stopCamera])

    const startCamera = async () => {
        setCameraError(null)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 } } })
            streamRef.current = stream
            if (videoRef.current) videoRef.current.srcObject = stream
            setCameraActive(true)
        } catch {
            setCameraError('No se pudo acceder a la cámara. Verificá los permisos del navegador.')
        }
    }

    const capturePhoto = () => {
        if (!videoRef.current) return
        const v = videoRef.current
        const canvas = document.createElement('canvas')
        canvas.width = v.videoWidth; canvas.height = v.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(v, 0, 0)
        canvas.toBlob((blob) => {
            if (!blob) return
            stopCamera()
            handleFile(new File([blob], 'card-capture.jpg', { type: 'image/jpeg' }))
        }, 'image/jpeg', 0.95)
    }

    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/')) { setError('Solo se aceptan imágenes (JPG, PNG, WEBP, etc.)'); return }
        setError(null); setExtractedData(null); setImageFile(file)
        const reader = new FileReader()
        reader.onload = (e) => setImagePreview(e.target?.result as string)
        reader.readAsDataURL(file)
    }

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
    }, [])

    const handleAnalyze = async () => {
        if (!imageFile) return
        setIsAnalyzing(true); setError(null)
        try {
            const fd = new FormData()
            fd.append('image', imageFile)
            const res = await fetch('/api/contactos/scan-card', { method: 'POST', body: fd })
            const json = await res.json()
            if (!json.success) throw new Error(json.error || 'Error desconocido')
            setExtractedData(json.data)
        } catch (err: any) {
            setError(err.message || 'Error al analizar la imagen')
        } finally { setIsAnalyzing(false) }
    }

    const handleUseData = () => { if (extractedData) { onDataExtracted(extractedData); onClose() } }
    const resetImage = () => { setImageFile(null); setImagePreview(null); setExtractedData(null); setError(null) }

    const btnTab = (active: boolean) => ({
        display: 'flex' as const, alignItems: 'center' as const, gap: '6px', padding: '8px 14px',
        borderRadius: 'var(--radius-md)', border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        background: active ? 'rgba(99,102,241,0.1)' : 'var(--surface-raised)',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s',
    })

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
            animation: 'fadeIn 0.2s ease',
        }} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="card" style={{
                width: '100%', maxWidth: '740px', padding: 0,
                border: '1px solid var(--accent-low)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            }}>
                {/* Modal Header */}
                <div style={{
                    padding: '20px 24px', borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, transparent 80%)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 'var(--radius-md)',
                            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <ScanLine size={20} color="var(--accent)" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Escanear Tarjeta de Visita</h2>
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>GPT-4o Vision extrae los datos automáticamente</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="icon-btn"><X size={18} /></button>
                </div>

                {/* Mode Tabs */}
                <div className="tab-nav" style={{ padding: '12px 24px 0', borderBottom: 'none', gap: '8px' }}>
                    <button
                        className={`tab-btn ${mode === 'upload' ? 'active' : ''}`}
                        onClick={() => { stopCamera(); setMode('upload') }}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Upload size={13} /> Subir foto
                    </button>
                    <button
                        className={`tab-btn ${mode === 'camera' ? 'active' : ''}`}
                        onClick={() => { setMode('camera'); if (!imagePreview) startCamera() }}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Camera size={13} /> Cámara
                    </button>
                    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) { stopCamera(); setMode('upload'); handleFile(f) } }} />
                    <button
                        className="tab-btn"
                        onClick={() => cameraInputRef.current?.click()}
                        title="Abre la cámara directamente (mejor en móvil)"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        📱 Móvil
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '16px 24px 24px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    {/* Left: capture zone */}
                    <div style={{ flex: '1 1 280px' }}>
                        {mode === 'camera' && !imagePreview ? (
                            <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: '#000', minHeight: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: 'block', maxHeight: '280px', objectFit: 'cover' }} />
                                {!cameraActive && !cameraError && (
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.7)' }}>
                                        <Camera size={36} style={{ opacity: 0.4 }} />
                                        <button onClick={startCamera} className="btn btn-primary" style={{ padding: '10px 20px' }}>Activar cámara</button>
                                    </div>
                                )}
                                {cameraError && (
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'rgba(0,0,0,0.85)', padding: '20px', textAlign: 'center' }}>
                                        <span style={{ fontSize: '24px' }}>⚠️</span>
                                        <p style={{ fontSize: '13px', margin: 0, color: 'var(--red)' }}>{cameraError}</p>
                                    </div>
                                )}
                                {cameraActive && (
                                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ width: '82%', height: '56%', border: '2px solid var(--accent)', borderRadius: '8px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' }} />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div
                                onClick={() => !imagePreview && fileInputRef.current?.click()}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                style={{
                                    border: `2px dashed ${isDragging ? 'var(--accent)' : imagePreview ? 'var(--green)' : 'var(--border)'}`,
                                    borderRadius: 'var(--radius-lg)',
                                    background: isDragging ? 'rgba(99,102,241,0.05)' : imagePreview ? 'rgba(34,197,94,0.04)' : 'var(--surface-raised)',
                                    minHeight: '220px', display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    cursor: imagePreview ? 'default' : 'pointer',
                                    transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                                }}
                            >
                                {imagePreview ? (
                                    <>
                                        <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '220px', display: 'block' }} />
                                        <button onClick={(e) => { e.stopPropagation(); resetImage() }} className="icon-btn" style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)' }}><X size={14} /></button>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>📇</div>
                                        <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>Arrastrá o hacé clic</p>
                                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>JPG, PNG, WEBP, HEIC</p>
                                        <div style={{ marginTop: '16px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                            <Upload size={13} color="var(--accent)" />
                                            <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>Seleccionar imagen</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

                        {mode === 'camera' && cameraActive && !imagePreview && (
                            <button onClick={capturePhoto} className="btn btn-primary" style={{ marginTop: '12px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <Camera size={16} /> 📸 Capturar foto
                            </button>
                        )}
                        {imagePreview && !extractedData && (
                            <button onClick={handleAnalyze} disabled={isAnalyzing} className="btn btn-primary" style={{ marginTop: '12px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: isAnalyzing ? 0.7 : 1 }}>
                                {isAnalyzing
                                    ? <><Loader2 size={15} className="animate-spin" /> Analizando...</>
                                    : <><ScanLine size={15} /> Analizar Tarjeta</>}
                            </button>
                        )}
                    </div>

                    {/* Right: extracted data */}
                    <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {!extractedData && !error && (
                            <div style={{
                                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                                justifyContent: 'center', gap: '12px', textAlign: 'center',
                                background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--border)', padding: '24px', minHeight: '180px',
                            }}>
                                <ScanLine size={28} style={{ opacity: 0.2, color: 'var(--text-muted)' }} />
                                <div>
                                    <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>Datos extraídos</p>
                                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Aparecerán aquí luego del análisis</p>
                                </div>
                            </div>
                        )}
                        {error && (
                            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-md)', padding: '14px', color: 'var(--red)', fontSize: '13px', lineHeight: 1.5 }}>⚠️ {error}</div>
                        )}
                        {extractedData && (
                            <>
                                <div style={{ flex: 1, background: 'var(--surface-raised)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--border)', overflowY: 'auto', maxHeight: '280px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <CheckCircle size={15} color="var(--green)" />
                                        <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--green)' }}>Datos encontrados</span>
                                    </div>
                                    {Object.entries(extractedData).filter(([, v]) => v).map(([k, v]) => (
                                        <div key={k} style={{ marginBottom: '10px' }}>
                                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '2px' }}>{k}</div>
                                            <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500, wordBreak: 'break-word' }}>{v}</div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={handleUseData} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <CheckCircle size={15} /> Usar estos datos
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
// ─────────────────────────────────────────────────────────────────────────────

export function ContactForm({ initialData, onSubmit, isEditing = false, onSuccess }: ContactFormProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [idAvailable, setIdAvailable] = useState<boolean | null>(null)
    const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)
    const [nextNumericId, setNextNumericId] = useState<string>('...')
    const [idSuffix, setIdSuffix] = useState('')
    const [showScanner, setShowScanner] = useState(false)

    const [formData, setFormData] = useState<ContactoData>({
        tipo: 'Importador',
        empresa: '',
        brand: '',
        pais: '',
        direccion: '',
        nombreContacto: '',
        apellido: '',
        email: '',
        telefono: '',
        idioma: 'EN',
        ...initialData
    })
    const { showToast } = useToast()

    // Aplicar datos extraídos de la tarjeta al formulario
    const handleCardData = (data: Record<string, string>) => {
        setFormData(prev => ({
            ...prev,
            empresa: data.empresa || prev.empresa,
            brand: data.brand || prev.brand,
            nombreContacto: data.nombreContacto || prev.nombreContacto,
            apellido: data.apellido || prev.apellido,
            email: data.email || prev.email,
            telefono: data.telefono || prev.telefono,
            direccion: data.direccion || prev.direccion,
            pais: data.pais || prev.pais,
            notes: data.notes ? (prev.notes ? `${prev.notes}\n${data.notes}` : data.notes) : prev.notes,
        }))
        // Sugerir la etiqueta del ID con el nombre de la empresa
        if (data.empresa && !idSuffix) {
            setIdSuffix(data.empresa.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20))
        }
        showToast('✅ Datos de la tarjeta cargados. Revisá y confirmá el ID.', 'success')
    }

    // Fetch next numeric ID on mount (if creating)
    useEffect(() => {
        if (!isEditing) {
            fetch('/api/contactos/next-id')
                .then(res => res.json())
                .then(res => {
                    if (res.success) {
                        setNextNumericId(String(res.data.nextId).padStart(3, '0'))
                    }
                })
        }
    }, [isEditing])

    // Update ID suffix based on company name
    useEffect(() => {
        if (!isEditing && formData.empresa && !idSuffix) {
            const suggested = formData.empresa.replace(/[^a-zA-Z0-9]/g, '')
            setIdSuffix(suggested)
        }
    }, [formData.empresa, isEditing])

    // Update full ID in formData when numeric or suffix changes
    useEffect(() => {
        if (!isEditing && nextNumericId !== '...') {
            const finalId = `E${nextNumericId}-${idSuffix}`
            setFormData(prev => ({ ...prev, id: finalId }))
        }
    }, [nextNumericId, idSuffix, isEditing])

    // Debounced Duplicate Check
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (isEditing) return

            if (formData.id) {
                const res = await fetch(`/api/contactos/check?id=${formData.id}`)
                const data = await res.json()
                if (data.success) setIdAvailable(!data.data.idExists)
            }

            if (formData.email) {
                const res = await fetch(`/api/contactos/check?email=${formData.email}`)
                const data = await res.json()
                if (data.success) setEmailAvailable(!data.data.emailExists)
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [formData.id, formData.email, isEditing])

    const handleChange = (field: keyof ContactoData, value: any) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value }

            if (field === 'isImporter' && value === true) {
                newData.isBillTo = true
                newData.isConsignee = true
                newData.isNotify = true
            }

            return newData
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            await onSubmit(formData)
            if (onSuccess) {
                onSuccess()
            } else {
                router.push('/contactos')
                router.refresh()
            }
        } catch (error) {
            console.error('Error submitting form:', error)
            showToast('Error al guardar el contacto', 'error')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            {showScanner && (
                <CardScannerModal
                    onDataExtracted={handleCardData}
                    onClose={() => setShowScanner(false)}
                />
            )}
            <form onSubmit={handleSubmit} className="card" style={{ padding: 'var(--space-8)', maxWidth: '900px', margin: '0 auto' }}>

                {/* ── Scanner Banner ── */}
                {!isEditing && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '16px',
                        flexWrap: 'wrap',
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.05) 100%)',
                        border: '1px solid rgba(99,102,241,0.2)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '16px 20px',
                        marginBottom: 'var(--space-6)',
                    }}>
                        <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <ScanLine size={22} color="var(--accent)" />
                        </div>
                        <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)', marginBottom: '2px' }}>Cargar datos desde tarjeta de visita</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>GPT-4o Vision extrae nombre, empresa, email y teléfono automáticamente</div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowScanner(true)}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexShrink: 0, width: 'min-content', minWidth: '160px' }}
                        >
                            <Camera size={15} />
                            Escanear tarjeta
                        </button>
                    </div>
                )}

                {/* ── Sección 1: Generación de ID ── */}
                {!isEditing ? (
                    <div style={{
                        background: 'var(--surface-raised)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--space-6)',
                        marginBottom: 'var(--space-6)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--space-2)' }}>
                            <Hash size={20} color="var(--accent)" />
                            <h3 style={{ fontSize: 'var(--font-size-lg)', margin: 0, fontWeight: 700 }}>Código de Identificación</h3>
                        </div>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', margin: '0 0 var(--space-5) 0', lineHeight: 1.6 }}>
                            El número ({`E${nextNumericId}`}) se asigna automáticamente. Agregá una etiqueta corta
                            para identificar rápidamente a este contacto (sin espacios ni caracteres especiales).
                        </p>

                        {/* Vista previa del ID final */}
                        <div style={{ marginBottom: 'var(--space-5)' }}>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vista previa del ID</div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0px' }}>
                                <span style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '22px',
                                    fontWeight: 800,
                                    letterSpacing: '0.04em',
                                    color: idAvailable === false ? 'var(--red)' : 'var(--text-dim)',
                                }}>
                                    E{nextNumericId}–
                                </span>
                                <span style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '22px',
                                    fontWeight: 800,
                                    letterSpacing: '0.04em',
                                    color: idAvailable === false ? 'var(--red)' : 'var(--accent)',
                                }}>
                                    {idSuffix || <span style={{ opacity: 0.3, fontStyle: 'italic', fontWeight: 400, fontSize: '18px' }}>Etiqueta</span>}
                                </span>
                            </div>
                            {idAvailable === false && (
                                <div style={{ fontSize: '11px', color: 'var(--red)', marginTop: '6px' }}>⚠️ Este ID ya existe. Cambiá la etiqueta.</div>
                            )}
                            {idAvailable === true && idSuffix && (
                                <div style={{ fontSize: '11px', color: 'var(--green)', marginTop: '6px' }}>✓ ID disponible</div>
                            )}
                        </div>

                        {/* Campo de etiqueta */}
                        <div style={{ maxWidth: '360px' }}>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Etiqueta del ID
                            </label>
                            <input
                                type="text"
                                value={idSuffix}
                                onChange={e => setIdSuffix(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
                                placeholder="Ej: MidasTrading"
                                className="input"
                                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}
                            />
                            <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '6px 0 0 0' }}>
                                Solo letras, números y guiones. Se completa automáticamente con el nombre de la empresa.
                            </p>
                        </div>

                        {/* Advertencia */}
                        <div style={{
                            marginTop: 'var(--space-5)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            background: 'rgba(245,158,11,0.08)',
                            border: '1px solid rgba(245,158,11,0.25)',
                            borderRadius: 'var(--radius-md)',
                            padding: '10px 14px',
                        }}>
                            <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>
                            <p style={{ fontSize: '12px', color: '#d97706', margin: 0, lineHeight: 1.5 }}>
                                <strong>Este código no se puede modificar una vez guardado.</strong> Revisá la etiqueta antes de continuar.
                            </p>
                        </div>
                    </div>
                ) : (
                    /* Modo edición: solo muestra el ID actual, sin editar */
                    <div style={{
                        background: 'var(--surface-raised)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--space-4) var(--space-6)',
                        marginBottom: 'var(--space-6)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-4)',
                    }}>
                        <Hash size={18} color="var(--text-muted)" />
                        <div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: '2px' }}>ID del Contacto (no modificable)</div>
                            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--accent)' }}>{formData.id}</code>
                        </div>
                    </div>
                )}

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 var(--space-6) 0' }} />

                {/* ── Sección 2: Tipo de contacto ── */}
                <div style={{ marginBottom: 'var(--space-6)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--space-2)' }}>
                        <Globe size={20} color="var(--accent)" />
                        <h3 style={{ fontSize: 'var(--font-size-lg)', margin: 0, fontWeight: 700 }}>Tipo de Contacto</h3>
                    </div>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', margin: '0 0 var(--space-4) 0', lineHeight: 1.6 }}>
                        Seleccioná uno o más roles. Esto determina cómo se clasifica el contacto y qué campos adicionales aparecen más abajo.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
                        {[
                            { field: 'isImporter' as const, label: 'Importador', color: 'var(--cyan)', desc: 'Cliente que compra e importa mercadería.' },
                            { field: 'isExporter' as const, label: 'Exportador', color: 'var(--green)', desc: 'Empresa que vende y exporta productos.' },
                            { field: 'isProducer' as const, label: 'Productor', color: 'var(--purple)', desc: 'Fábrica o productor de materia prima.' },
                            { field: 'isForwarder' as const, label: 'Forwarder', color: '#f59e0b', desc: 'Agente de carga o empresa de logística.' },
                        ].map(({ field, label, color, desc }) => {
                            const checked = !!formData[field]
                            return (
                                <label
                                    key={field}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '12px',
                                        padding: 'var(--space-4)',
                                        borderRadius: 'var(--radius-md)',
                                        border: `2px solid ${checked ? color : 'var(--border)'}`,
                                        background: checked ? `${color}11` : 'var(--surface-raised)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        userSelect: 'none',
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={e => handleChange(field, e.target.checked)}
                                        style={{ accentColor: color, width: '17px', height: '17px', marginTop: '2px', flexShrink: 0 }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: checked ? color : 'var(--text)' }}>{label}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>{desc}</div>
                                    </div>
                                </label>
                            )
                        })}
                    </div>
                </div>

                {/* ── Sección 3: Roles en Purchase Order ── */}
                <div style={{ marginBottom: 'var(--space-2)', background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', border: '1px solid var(--border)' }}>
                    <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Roles en Purchase Order</label>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', margin: '0 0 var(--space-4) 0', lineHeight: 1.5 }}>
                        Indicá el rol de este contacto en las órdenes de compra. Si es Importador, estos roles se activan automáticamente.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
                        {[
                            { field: 'isBillTo' as const, label: 'Bill to', color: 'var(--blue)', desc: 'A quien se le emite la factura.' },
                            { field: 'isConsignee' as const, label: 'Consignee', color: 'var(--cyan)', desc: 'Quien recibe físicamente la carga.' },
                            { field: 'isNotify' as const, label: 'Notify', color: 'var(--green)', desc: 'Quien recibe las notificaciones de embarque.' },
                        ].map(({ field, label, color, desc }) => {
                            const checked = !!formData[field]
                            return (
                                <label
                                    key={field}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '10px',
                                        padding: 'var(--space-3) var(--space-4)',
                                        borderRadius: 'var(--radius-md)',
                                        border: `1px solid ${checked ? color : 'var(--border)'}`,
                                        background: checked ? `${color}11` : 'var(--bg)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        userSelect: 'none',
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={e => handleChange(field, e.target.checked)}
                                        style={{ accentColor: color, width: '16px', height: '16px', marginTop: '3px', flexShrink: 0 }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: checked ? color : 'var(--text)' }}>{label}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>{desc}</div>
                                    </div>
                                </label>
                            )
                        })}
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 'var(--space-6) 0' }} />

                {/* Datos de Empresa */}
                <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Building2 size={24} color="var(--accent)" />
                    <span>Información de la Empresa</span>
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                    <div className="input-group" style={{ gridColumn: 'span 2' }}>
                        <label className="input-label">Nombre de la Empresa *</label>
                        <input
                            type="text"
                            required
                            className="input"
                            value={formData.empresa}
                            onChange={e => handleChange('empresa', e.target.value)}
                            placeholder="Ej: Midas Trading LLC"
                        />
                    </div>

                    {formData.isProducer && (
                        <div className="input-group">
                            <label className="input-label">Marca / Brand</label>
                            <input
                                type="text"
                                className="input"
                                value={formData.brand}
                                onChange={e => handleChange('brand', e.target.value)}
                                placeholder="Ej: MIDAS"
                            />
                        </div>
                    )}

                    <div className="input-group" style={{ gridColumn: formData.isProducer ? 'auto' : 'span 2' }}>
                        <AddressAutocomplete
                            label="Dirección Legal (Autocomplete)"
                            value={formData.direccion || ''}
                            onChangeAddress={(val) => handleChange('direccion', val)}
                            onChangeCountry={(val) => handleChange('pais', val)}
                            placeholder="Empezá a escribir la dirección..."
                        />
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 'var(--space-6) 0' }} />

                {/* Datos de Contacto */}
                <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <User size={24} color="var(--accent)" />
                    <span>Contacto Principal</span>
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                    <div className="input-group">
                        <label className="input-label">Nombre *</label>
                        <input
                            type="text"
                            required
                            className="input"
                            value={formData.nombreContacto}
                            onChange={e => handleChange('nombreContacto', e.target.value)}
                            placeholder="Nombre"
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Apellido</label>
                        <input
                            type="text"
                            className="input"
                            value={formData.apellido}
                            onChange={e => handleChange('apellido', e.target.value)}
                            placeholder="Apellido"
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Email</label>
                        <input
                            type="email"
                            className="input"
                            value={formData.email}
                            onChange={e => handleChange('email', e.target.value)}
                            placeholder="nombre@empresa.com"
                            style={{ borderColor: emailAvailable === false ? 'var(--red)' : 'var(--border)' }}
                        />
                        {emailAvailable === false && !isEditing && (
                            <div style={{ fontSize: '10px', color: 'var(--red)', marginTop: '2px' }}>Este email ya está registrado.</div>
                        )}
                    </div>

                    <div className="input-group">
                        <label className="input-label">Teléfono</label>
                        <input
                            type="tel"
                            className="input"
                            value={formData.telefono}
                            onChange={e => handleChange('telefono', e.target.value)}
                            placeholder="+1 555..."
                        />
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 'var(--space-6) 0' }} />

                {/* Datos Técnicos y Categorías (Condicionales) */}
                {(formData.isImporter || formData.isProducer) && (
                    <>
                        <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Hash size={24} color="var(--blue)" />
                            <span>Datos Marta & Categorías</span>
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                            {formData.isImporter && (
                                <div className="input-group">
                                    <label className="input-label">Tax ID / RUC</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.taxId || ''}
                                        onChange={e => handleChange('taxId', e.target.value)}
                                        placeholder="Identificación fiscal"
                                    />
                                </div>
                            )}

                            {formData.isProducer && (
                                <>
                                    <div className="input-group">
                                        <label className="input-label">N° de Planta</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={formData.nPlanta || ''}
                                            onChange={e => handleChange('nPlanta', e.target.value)}
                                            placeholder="Planta habilitada"
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">FDA Number</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={formData.fda || ''}
                                            onChange={e => handleChange('fda', e.target.value)}
                                            placeholder="N° Registro FDA"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}


                <div style={{ marginTop: 'var(--space-4)' }}>
                    <div className="input-group">
                        <label className="input-label">Descripción / Notas</label>
                        <textarea
                            className="input"
                            rows={4}
                            value={formData.notes || ''}
                            onChange={e => handleChange('notes', e.target.value)}
                            placeholder="Detalles de la empresa, condiciones especiales, etc..."
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'flex-end', marginTop: 'var(--space-8)' }}>
                    {!onSuccess && (
                        <Link href="/contactos" className="btn btn-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                            Cancelar
                        </Link>
                    )}
                    {onSuccess && (
                        <Button variant="secondary" onClick={() => onSuccess()}>
                            Cancelar
                        </Button>
                    )}
                    <Button
                        type="submit"
                        variant="primary"
                        isLoading={isLoading}
                        leftIcon={<Save size={18} />}
                        className="px-8"
                    >
                        {isEditing ? 'Actualizar' : 'Guardar Contacto'}
                    </Button>
                </div>
            </form>
        </>
    )
}
