'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Upload, Loader2, CheckCircle2, Sparkles, ChevronRight, FileText } from 'lucide-react'
import { AIFeatureBadge } from './AIFeatureBadge'
import { useToast } from './ui/Toast'

interface ExtractedField {
    // Partes
    shipper?: string
    consignee?: string
    notify?: string
    productor?: string
    shipperTaxId?: string
    // Financiero
    invoiceNumber?: string
    invoiceDate?: string
    incoterm?: string
    paymentTerms?: string
    totalAmount?: string
    currency?: string
    bankDetails?: string
    // Logística
    booking?: string
    vessel?: string
    naviera?: string
    container?: string
    pol?: string
    pod?: string
    etd?: string
    eta?: string
    vgm?: string
    // Productos
    products?: { description: string; ncm: string; qty: string; weight: string; unitPrice: string; total: string }[]
    // Notas adicionales
    additionalNotes?: string
}

const DEMO_EXTRACTED: ExtractedField = {
    shipper: 'SOUTH MARINE TRADING S.A.',
    consignee: 'GLOBAL FRUITS BV',
    notify: 'GLOBAL FRUITS BV – Rotterdam Port',
    productor: 'Pesquera del Sur S.A.',
    shipperTaxId: '30-71234567-8',
    invoiceNumber: 'SMT-2026-047',
    invoiceDate: '2026-03-10',
    incoterm: 'CIF Rotterdam',
    paymentTerms: '30 días desde B/L',
    totalAmount: '148.500',
    currency: 'USD',
    bankDetails: 'Banco Nación Argentina · CBU 0110-0123 · SWIFT: NACNARBA',
    booking: 'BK-MAERSK-2026-047',
    vessel: 'MAERSK STOCKHOLM',
    naviera: 'Maersk Line',
    container: 'MSKU7654321',
    pol: 'Buenos Aires (BAUEN)',
    pod: 'Rotterdam (NLRTM)',
    etd: '2026-04-02',
    eta: '2026-04-28',
    vgm: '28.450 kg',
    products: [
        { description: 'Merluza Hubbsi Filet PBI – Caja 10kg – 200/400g', ncm: '0304.89.00', qty: '1.200 cajas', weight: '12.000 kg', unitPrice: '12,25 USD/kg', total: '147.000 USD' },
        { description: 'Merluza Hubbsi Porciones – Caja 10kg – 150/200g', ncm: '0304.89.00', qty: '150 cajas', weight: '1.500 kg', unitPrice: '1,00 USD/kg', total: '1.500 USD' },
    ],
    additionalNotes: 'Documento procesado correctamente. Una sola Invoice detectada (pág. 1).',
}

interface DocumentImportWizardProps {
    isOpen: boolean
    onClose: () => void
    operationId?: string
    isDemo?: boolean
}

export default function DocumentImportWizard({ isOpen, onClose, operationId, isDemo }: DocumentImportWizardProps) {
    const [step, setStep] = useState<'upload' | 'review' | 'saved'>('upload')
    const [isDragging, setIsDragging] = useState(false)
    const [isExtracting, setIsExtracting] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [fields, setFields] = useState<ExtractedField>({})
    const [opId, setOpId] = useState(operationId || '')
    const [isSaving, setIsSaving] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)
    const { showToast } = useToast()

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    if (!isOpen) return null

    const handleFile = async (f: File) => {
        setFile(f)
        setIsExtracting(true)
        await new Promise(r => setTimeout(r, isDemo ? 2200 : 1500))
        if (isDemo) {
            setFields(DEMO_EXTRACTED)
        } else {
            try {
                const reader = new FileReader()
                reader.onload = async () => {
                    const base64 = (reader.result as string).split(',')[1]
                    const res = await fetch('/api/invoice/extract', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ base64, mimeType: f.type, filename: f.name }),
                    })
                    const data = await res.json()
                    if (data.success) setFields(data.fields)
                    else { showToast('Error al extraer datos del documento', 'error'); setIsExtracting(false); return }
                }
                reader.readAsDataURL(f)
                setIsExtracting(false)
                setStep('review')
                return
            } catch {
                showToast('Error al conectar con el servicio de IA', 'error')
                setIsExtracting(false)
                return
            }
        }
        setIsExtracting(false)
        setStep('review')
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false)
        const f = e.dataTransfer.files[0]
        if (f) handleFile(f)
    }

    const handleSave = async () => {
        if (!opId.trim()) { showToast('Ingresá el ID de la operación', 'warning'); return }
        setIsSaving(true)
        await new Promise(r => setTimeout(r, 1800))
        setIsSaving(false)
        setStep('saved')
        if (!isDemo) showToast('Documento guardado en Drive y datos aplicados', 'success')
    }

    const handleClose = () => { setStep('upload'); setFile(null); setFields({}); setOpId(operationId || ''); onClose() }

    const fieldRow = (label: string, value?: string) => value ? (
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>{label}</span>
            <input defaultValue={value} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', color: 'var(--text)', width: '100%' }} />
        </div>
    ) : null

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '0' : '20px' }}>
            <div style={{
                background: 'var(--surface-raised)',
                borderRadius: isMobile ? '0' : '20px',
                border: isMobile ? 'none' : '1px solid var(--border)',
                width: '100%',
                maxWidth: isMobile ? 'none' : '720px',
                height: isMobile ? '100%' : 'auto',
                maxHeight: isMobile ? 'none' : '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 30px 80px rgba(0,0,0,0.6)'
            }}>

                {/* Header */}
                <div style={{ padding: isMobile ? '16px' : '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', background: 'linear-gradient(135deg, #0a1628 0%, #0d2244 100%)' }}>
                    <Sparkles size={20} color="#dca64b" fill="#dca64b" />
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>Importar Documento con IA</h3>
                        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>GPT-4o Vision extrae automáticamente todos los campos del documento</p>
                    </div>
                    <AIFeatureBadge
                        title="GPT-4o Vision"
                        description="Marta usa GPT-4o para leer y extraer datos de facturas, BLs, packing lists y declaraciones. Los campos quedan editables antes de guardar."
                        position="left"
                    />
                    <button onClick={handleClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', padding: 0 }}><X size={18} /></button>
                </div>

                {/* Step indicators */}
                <div style={{ display: 'flex', padding: isMobile ? '10px 16px' : '12px 24px', gap: '8px', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                    {(['upload', 'review', 'saved'] as const).map((s, i) => (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: step === s ? 1 : 0.4, flexShrink: 0 }}>
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: step === s ? '#dca64b' : 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: step === s ? '#000' : 'var(--text-dim)' }}>{i + 1}</div>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: step === s ? 'var(--text)' : 'var(--text-dim)' }}>
                                {s === 'upload' ? (isMobile ? 'Subir' : 'Subir archivo') : s === 'review' ? (isMobile ? 'Revisar' : 'Revisar campos') : 'Guardado'}
                            </span>
                            {i < 2 && <ChevronRight size={12} style={{ color: 'var(--text-dim)' }} />}
                        </div>
                    ))}
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px' : '24px' }}>

                    {step === 'upload' && (
                        <div
                            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileRef.current?.click()}
                            style={{
                                border: `2px dashed ${isDragging ? '#dca64b' : 'var(--border)'}`,
                                borderRadius: '16px', padding: '60px 40px', textAlign: 'center', cursor: 'pointer',
                                background: isDragging ? 'rgba(220,166,75,0.05)' : 'transparent',
                                transition: 'all 0.2s',
                            }}
                        >
                            {isExtracting ? (
                                <>
                                    <Loader2 size={40} style={{ margin: '0 auto 16px', color: '#dca64b', animation: 'spin 1s linear infinite' }} />
                                    <p style={{ fontWeight: 700, fontSize: '15px' }}>Analizando con GPT-4o…</p>
                                    <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Extrayendo partes, datos financieros y logísticos</p>
                                </>
                            ) : (
                                <>
                                    <Upload size={40} style={{ margin: '0 auto 16px', color: 'var(--text-dim)', opacity: 0.4 }} />
                                    <p style={{ fontWeight: 700, fontSize: '15px' }}>Arrastrá o hacé click para seleccionar</p>
                                    <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginTop: '6px' }}>PDF · PNG · JPG · DOC · XLS — Invoice, BL, Packing List, Declaración</p>
                                    {file && <p style={{ marginTop: '12px', fontSize: '12px', color: '#dca64b' }}>📎 {file.name}</p>}
                                </>
                            )}
                            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
                        </div>
                    )}

                    {step === 'review' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(34,197,94,0.08)', borderRadius: '10px', border: '1px solid rgba(34,197,94,0.2)' }}>
                                <CheckCircle2 size={16} color="var(--green)" />
                                <span style={{ fontSize: '13px', color: 'var(--green)', fontWeight: 600 }}>IA extrajo los datos correctamente. Revisá y editá antes de guardar.</span>
                            </div>

                            {/* Partes */}
                            <section>
                                <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Partes</h4>
                                {fieldRow('Shipper', fields.shipper)}
                                {fieldRow('Consignee', fields.consignee)}
                                {fieldRow('Notify', fields.notify)}
                                {fieldRow('Productor', fields.productor)}
                                {fieldRow('CUIT / Tax ID', fields.shipperTaxId)}
                            </section>

                            {/* Financiero */}
                            <section>
                                <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Financiero</h4>
                                {fieldRow('Invoice N°', fields.invoiceNumber)}
                                {fieldRow('Fecha', fields.invoiceDate)}
                                {fieldRow('Incoterm', fields.incoterm)}
                                {fieldRow('Pago', fields.paymentTerms)}
                                {fieldRow('Total', `${fields.totalAmount} ${fields.currency || ''}`)}
                                {fieldRow('Datos bancarios', fields.bankDetails)}
                            </section>

                            {/* Logística */}
                            <section>
                                <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Logística</h4>
                                {fieldRow('Booking', fields.booking)}
                                {fieldRow('Buque', fields.vessel)}
                                {fieldRow('Naviera', fields.naviera)}
                                {fieldRow('Contenedor', fields.container)}
                                {fieldRow('POL', fields.pol)}
                                {fieldRow('POD', fields.pod)}
                                {fieldRow('ETD', fields.etd)}
                                {fieldRow('ETA', fields.eta)}
                                {fieldRow('VGM', fields.vgm)}
                            </section>

                            {/* Productos */}
                            {fields.products && fields.products.length > 0 && (
                                <section>
                                    <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Productos</h4>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                            <thead>
                                                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                                                    {['Descripción', 'NCM', 'Cantidad', 'Peso', 'Precio', 'Total'].map(h => (
                                                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 600 }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {fields.products.map((p, i) => (
                                                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                                        {[p.description, p.ncm, p.qty, p.weight, p.unitPrice, p.total].map((v, j) => (
                                                            <td key={j} style={{ padding: '6px 10px', color: 'var(--text)' }}>{v}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            )}

                            {fields.additionalNotes && (
                                <div style={{ padding: '10px 14px', background: 'rgba(220,166,75,0.06)', borderRadius: '8px', border: '1px solid rgba(220,166,75,0.2)', fontSize: '12px', color: 'var(--text-dim)' }}>
                                    💡 {fields.additionalNotes}
                                </div>
                            )}

                            {/* Operation ID */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)' }}>ID de Operación</label>
                                <input
                                    value={opId}
                                    onChange={e => setOpId(e.target.value)}
                                    placeholder="ej: 021-26"
                                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: 'var(--text)', width: '200px' }}
                                />
                                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>El archivo se subirá a la carpeta Drive de esa operación y los datos se aplicarán en Sheets.</span>
                            </div>
                        </div>
                    )}

                    {step === 'saved' && (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <CheckCircle2 size={56} color="var(--green)" style={{ margin: '0 auto 16px' }} />
                            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>¡Listo!</h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: '1.6' }}>
                                El documento fue subido a la carpeta Drive de la operación <strong>{opId}</strong> y los datos fueron aplicados en la planilla.
                            </p>
                            <button onClick={handleClose} style={{ marginTop: '24px', padding: '10px 28px', background: 'var(--accent)', border: 'none', borderRadius: '10px', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
                                Cerrar
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 'review' && (
                    <div style={{ padding: isMobile ? '12px 16px' : '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: 'rgba(0,0,0,0.1)' }}>
                        <button onClick={handleClose} style={{ padding: '9px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text)', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                            Cancelar
                        </button>
                        <button onClick={handleSave} disabled={isSaving} style={{ padding: '9px 20px', background: 'var(--accent)', border: 'none', borderRadius: '10px', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', flex: isMobile ? 1 : 'none', justifyContent: 'center' }}>
                            {isSaving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />Guardando…</> : <><FileText size={14} />{isMobile ? 'Aplicar' : 'Guardar y Aplicar'}</>}
                        </button>
                    </div>
                )}

                <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
            </div>
        </div>
    )
}
