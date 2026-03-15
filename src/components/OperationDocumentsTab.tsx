'use client'

import { FileText, ShoppingCart, Ship, Eye, Edit2, Trash2, Send, Download, Loader2, Clock, CheckCircle, ExternalLink, MessageSquare, Mail, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Operacion, Contacto, getResponsableName } from '@/lib/sheets-types'
import DocViewerModal from './DocViewerModal'
import ProformaModal from './ProformaModal'
import PoModal from './PoModal'
import BookingModal from './BookingModal'
import OriginalInvoiceModal from './OriginalInvoiceModal'
import { useToast } from './ui/Toast'
import { ConfirmModal } from './ui/ConfirmModal'
import DocumentImportWizard from './DocumentImportWizard'
import { AIFeatureBadge } from './AIFeatureBadge'
import { useSession } from 'next-auth/react'

interface OperationDocumentsTabProps {
    op: Operacion
    allContacts: Contacto[]
    onUpdate: () => void
}

export default function OperationDocumentsTab({ op, allContacts, onUpdate }: OperationDocumentsTabProps) {
    const { data: session } = useSession()
    const isDemo = (session?.user as any)?.isDemo
    const [selectedDocId, setSelectedDocId] = useState<string | null>(op.idDocumento || op.ocIdDocumento || op.bookingDocId || null)
    const [selectedDocTitle, setSelectedDocTitle] = useState<string>('Documento')
    const [isProformaModalOpen, setIsProformaModalOpen] = useState(false)
    const [isPOModalOpen, setIsPOModalOpen] = useState(false)
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
    const [isViewerModalOpen, setIsViewerModalOpen] = useState(false)
    const [isImportWizardOpen, setIsImportWizardOpen] = useState(false)
    const [opToDelete, setOpToDelete] = useState<{ type: 'PI' | 'PO' | 'Booking' | 'Invoice', docId: string } | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const { showToast } = useToast()

    // Sincronizar selección automática cuando aparecen nuevos documentos
    useEffect(() => {
        if (op.invoiceDocId && !selectedDocId) {
            setSelectedDocId(op.invoiceDocId)
            setSelectedDocTitle('Original Invoice')
        } else if (op.idDocumento && !selectedDocId) {
            setSelectedDocId(op.idDocumento)
            setSelectedDocTitle('Proforma Invoice')
        } else if (op.ocIdDocumento && !selectedDocId) {
            setSelectedDocId(op.ocIdDocumento)
            setSelectedDocTitle('Purchase Order')
        } else if (op.bookingDocId && !selectedDocId) {
            setSelectedDocId(op.bookingDocId)
            setSelectedDocTitle('Instrucción Booking')
        }
    }, [op.idDocumento, op.ocIdDocumento, op.bookingDocId, op.invoiceDocId])

    const documents = [
        {
            id: 'pi',
            name: 'Proforma Invoice',
            icon: <FileText size={18} />,
            docId: op.idDocumento,
            status: op.idDocumento ? 'Listo' : 'Pendiente',
            color: 'var(--cyan)',
            action: () => setIsProformaModalOpen(true),
            type: 'PI'
        },
        {
            id: 'po',
            name: 'Purchase Order',
            icon: <ShoppingCart size={18} />,
            docId: op.ocIdDocumento,
            status: op.ocIdDocumento ? 'Listo' : 'Pendiente',
            color: 'var(--amber)',
            action: () => setIsPOModalOpen(true),
            type: 'PO'
        },
        {
            id: 'booking',
            name: 'Instrucción Booking',
            icon: <Ship size={18} />,
            docId: op.bookingDocId,
            status: op.bookingDocId ? 'Listo' : 'Pendiente',
            color: 'var(--green)',
            action: () => setIsBookingModalOpen(true),
            type: 'Booking'
        },
        {
            id: 'invoice',
            name: 'Original Invoice',
            icon: <FileText size={18} />,
            docId: op.invoiceDocId,
            status: op.invoiceDocId ? 'Listo' : 'Pendiente',
            color: '#a855f7',
            action: () => setIsInvoiceModalOpen(true),
            type: 'Invoice'
        }
    ]

    const handleDeleteDoc = async () => {
        if (!opToDelete) return
        setIsDeleting(true)
        try {
            // 1. Delete from Drive
            await fetch('/api/drive/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId: opToDelete.docId })
            })

            // 2. Clear reference in Sheet
            const updatePayload: any = {}
            if (opToDelete.type === 'PI') {
                updatePayload.idDocumento = ''
                updatePayload.piNumber = ''
                updatePayload.estadoPi = ''
            } else if (opToDelete.type === 'PO') {
                updatePayload.ocIdDocumento = ''
                updatePayload.ocId = ''
            } else if (opToDelete.type === 'Booking') {
                updatePayload.bookingDocId = ''
            } else if (opToDelete.type === 'Invoice') {
                updatePayload.invoiceDocId = ''
            }

            const res = await fetch(`/api/operaciones/${op.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            })

            if (res.ok) {
                showToast('Documento eliminado correctamente', 'success')
                onUpdate()
                if (selectedDocId === opToDelete.docId) setSelectedDocId(null)
            } else {
                showToast('Error al actualizar la planilla', 'error')
            }
        } catch (error) {
            console.error('Error deleting document:', error)
            showToast('Error al procesar la eliminación', 'error')
        } finally {
            setIsDeleting(false)
            setOpToDelete(null)
        }
    }

    const [isSavingPdf, setIsSavingPdf] = useState<string | null>(null)
    const [isSendingEmail, setIsSendingEmail] = useState<string | null>(null)

    const handleSavePdf = async (doc: any) => {
        setIsSavingPdf(doc.docId)
        try {
            const fileName = `${doc.name} ${op.cliente || ''}`;
            const res = await fetch('/api/proformas/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ docId: doc.docId, operationId: op.id, fileName })
            })
            const data = await res.json()
            if (data.success) {
                showToast('PDF guardado en Drive correctamente', 'success')
            } else {
                throw new Error(data.error)
            }
        } catch (error: any) {
            showToast(error.message || 'Error al guardar PDF', 'error')
        } finally {
            setIsSavingPdf(null)
        }
    }

    const handleSendEmail = async (doc: any) => {
        setIsSendingEmail(doc.docId)
        try {
            const docUrl = `https://docs.google.com/document/d/${doc.docId}/edit`
            const endpoint =
                doc.type === 'PO' ? '/api/purchase-orders/send' :
                    doc.type === 'Booking' ? '/api/booking/send' :
                        '/api/proformas/send'
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ operationId: op.id, docUrl })
            })
            const data = await res.json()
            if (data.success) {
                const label = doc.type === 'Booking' ? 'Booking enviado al forwarder' : 'Email enviado con éxito'
                showToast(label, 'success')
            } else {
                throw new Error(data.error)
            }
        } catch (error: any) {
            showToast(error.message || 'Error al enviar email', 'error')
        } finally {
            setIsSendingEmail(null)
        }
    }

    const handleShareWhatsApp = (doc: any) => {
        let contactEmpresa: string | undefined
        if (doc.type === 'PI' || doc.type === 'Invoice') {
            contactEmpresa = op.cliente
        } else if (doc.type === 'Booking') {
            contactEmpresa = op.forwarder
        } else {
            contactEmpresa = op.productor || op.exportador
        }
        const contact = allContacts.find(c => c.empresa === contactEmpresa || c.id === contactEmpresa)
        if (!contact?.telefono) {
            showToast('No hay teléfono registrado para este contacto', 'warning')
            return
        }
        const message = `Hola ${contact.nombreContacto || ''}, te adjunto la ${doc.name} de la operación ${op.id}: https://docs.google.com/document/d/${doc.docId}/view`
        window.open(`https://wa.me/${contact.telefono.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank')
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--space-6)', height: 'calc(100vh - 250px)', minHeight: '600px' }}>

            {/* Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', overflowY: 'auto' }}>
                <div className="card" style={{ padding: 'var(--space-4)', flex: 1 }}>
                    <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        GESTIÓN DE DOCUMENTOS
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {documents.map((doc) => (
                            <div
                                key={doc.id}
                                className={`card-hover ${selectedDocId === doc.docId ? 'active-doc' : ''}`}
                                style={{
                                    padding: 'var(--space-3)',
                                    cursor: 'pointer',
                                    border: selectedDocId === doc.docId ? '1px solid var(--cyan)' : '1px solid var(--border)',
                                    background: selectedDocId === doc.docId ? 'rgba(6, 182, 212, 0.05)' : 'var(--surface)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--space-3)'
                                }}
                                onClick={() => {
                                    if (doc.docId) {
                                        setSelectedDocId(doc.docId)
                                        setSelectedDocTitle(doc.name)
                                    }
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ color: doc.color }}>{doc.icon}</div>
                                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{doc.name}</span>
                                    </div>
                                    <span style={{
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        background: doc.docId ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                        color: doc.docId ? 'var(--green)' : 'var(--orange)'
                                    }}>
                                        {doc.status}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                                    {doc.docId ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                                            {/* Fila 1: Enviar por Mail – ancho completo */}
                                            <button
                                                className="btn btn-secondary"
                                                style={{ fontSize: '10px', height: '28px', padding: '0 10px', justifyContent: 'center', gap: '5px', color: 'var(--text)', gridColumn: 'span 2' }}
                                                onClick={(e) => { e.stopPropagation(); handleSendEmail(doc); }}
                                                disabled={isSendingEmail === doc.docId}
                                                title={doc.type === 'Booking' ? 'Enviar al forwarder' : 'Enviar por email'}
                                            >
                                                {isSendingEmail === doc.docId
                                                    ? <Loader2 size={12} className="animate-spin" style={{ color: 'var(--accent)' }} />
                                                    : <Mail size={12} style={{ color: 'var(--accent)' }} />
                                                }
                                                {doc.type === 'Booking' ? 'Enviar al Forwarder' : 'Enviar por Mail'}
                                            </button>

                                            {/* Fila 2: WhatsApp + Ver/Editar */}
                                            <button
                                                className="btn btn-secondary"
                                                style={{ fontSize: '10px', height: '28px', padding: '0 6px', justifyContent: 'center', gap: '4px', color: 'var(--text)' }}
                                                onClick={(e) => { e.stopPropagation(); handleShareWhatsApp(doc); }}
                                            >
                                                <MessageSquare size={12} style={{ color: 'var(--green)' }} /> WhatsApp
                                            </button>

                                            <button
                                                className="btn btn-secondary"
                                                style={{ fontSize: '10px', height: '28px', padding: '0 6px', justifyContent: 'center', gap: '4px', color: 'var(--text)' }}
                                                onClick={(e) => { e.stopPropagation(); window.open(`https://docs.google.com/document/d/${doc.docId}/edit`, '_blank'); }}
                                                title="Abrir en Google Docs"
                                            >
                                                <Edit2 size={12} style={{ color: 'var(--cyan)' }} /> Ver / Editar
                                            </button>

                                            {/* Fila 3: Guardar PDF + Eliminar */}
                                            <button
                                                className="btn btn-secondary"
                                                style={{ fontSize: '10px', height: '28px', padding: '0 6px', justifyContent: 'center', gap: '4px', color: 'var(--text)' }}
                                                onClick={(e) => { e.stopPropagation(); handleSavePdf(doc); }}
                                                disabled={isSavingPdf === doc.docId}
                                            >
                                                {isSavingPdf === doc.docId
                                                    ? <Loader2 size={12} className="animate-spin" style={{ color: 'var(--amber)' }} />
                                                    : <Download size={12} style={{ color: 'var(--amber)' }} />
                                                } Guardar PDF
                                            </button>

                                            <button
                                                className="btn btn-secondary"
                                                style={{ fontSize: '10px', height: '28px', padding: '0 6px', justifyContent: 'center', gap: '4px', color: 'var(--red)' }}
                                                onClick={(e) => { e.stopPropagation(); setOpToDelete({ type: doc.type as any, docId: doc.docId! }); }}
                                            >
                                                <Trash2 size={12} /> Eliminar
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            className="btn btn-primary"
                                            style={{ width: '100%', height: '32px', fontSize: '12px', padding: '0' }}
                                            onClick={(e) => { e.stopPropagation(); doc.action(); }}
                                        >
                                            Generar {doc.name.split(' ')[0]}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: 'var(--space-8)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
                        <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: 'var(--space-3)' }}>ACCIONES RÁPIDAS</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <a
                                href={(op as any).carpetaDrive}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary"
                                style={{ width: '100%', justifyContent: 'flex-start', fontSize: '12px', height: '36px' }}
                            >
                                <ExternalLink size={14} style={{ marginRight: '8px' }} /> Abrir Carpeta Drive
                            </a>
                            {/* Importar con IA */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                    onClick={() => setIsImportWizardOpen(true)}
                                    className="btn btn-secondary"
                                    style={{ flex: 1, justifyContent: 'flex-start', fontSize: '12px', height: '36px', border: '1px solid rgba(220,166,75,0.3)', color: 'var(--text)' }}
                                >
                                    <Sparkles size={13} color="#dca64b" style={{ marginRight: '8px' }} /> Importar con IA
                                </button>
                                <AIFeatureBadge
                                    title="Importar con IA"
                                    description="GPT-4o Vision lee tu documento (invoice, BL, packing list) y extrae automáticamente todos los datos: partes, financiero, logística y productos. Después los aplica en la planilla."
                                    position="right"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Viewer */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
                {selectedDocId ? (
                    <>
                        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <FileText size={16} className="text-cyan" />
                                <span style={{ fontWeight: 600, fontSize: '14px' }}>{selectedDocTitle}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <a
                                    href={`https://docs.google.com/document/d/${selectedDocId}/edit`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary btn-small"
                                    style={{ height: '30px', fontSize: '12px' }}
                                >
                                    <ExternalLink size={14} /> Abrir Original
                                </a>
                            </div>
                        </div>
                        <div style={{ flex: 1, position: 'relative', background: '#e4e7eb' }}>
                            <iframe
                                src={`https://docs.google.com/document/d/${selectedDocId}/preview`}
                                style={{ width: '100%', height: '100%', border: 'none' }}
                                title="Doc Viewer"
                            />
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', padding: '40px' }}>
                        <FileText size={48} style={{ opacity: 0.1, marginBottom: '20px' }} />
                        <p style={{ fontSize: '14px' }}>Selecciona un documento para visualizarlo</p>
                        <p style={{ fontSize: '12px' }}>Si aún no ha sido generado, utiliza el panel lateral para crearlo.</p>
                    </div>
                )}
            </div>

            {/* Modals */}
            <ProformaModal
                isOpen={isProformaModalOpen}
                onClose={() => { setIsProformaModalOpen(false); onUpdate(); }}
                operationId={op.id || ''}
                clientName={op.cliente || 'Sin Cliente'}
                docId={op.idDocumento || ''}
            />

            {isPOModalOpen && (
                <PoModal
                    isOpen={isPOModalOpen}
                    onClose={() => { setIsPOModalOpen(false); onUpdate(); }}
                    operationId={op.id || ''}
                    supplierName={op.productor || op.exportador || 'Proveedor'}
                    docId={op.ocIdDocumento}
                    ocId={op.ocId}
                    initialBillToId={op.billToId}
                    initialConsigneeId={op.consigneeId}
                    initialNotifyId={op.notifyId}
                    initialPortLoad={op.portLoad}
                    initialPortDest={op.puertoDestino}
                    initialIncoterm={op.incoterm}
                    initialPaymentTerms={op.paymentTerms}
                    initialFechaEmbarque={(op as any).fechaEmbarque}
                />
            )}

            <BookingModal
                isOpen={isBookingModalOpen}
                onClose={() => { setIsBookingModalOpen(false); onUpdate(); }}
                operationId={op.id || ''}
                forwarderName={op.forwarder || 'Desconocido'}
            />

            <OriginalInvoiceModal
                isOpen={isInvoiceModalOpen}
                onClose={() => { setIsInvoiceModalOpen(false); onUpdate(); }}
                operationId={op.id || ''}
                clientName={op.cliente || 'Sin Cliente'}
                invoiceDocId={op.invoiceDocId}
                opProductos={op.productos}
                opPurchaseRaw={op.purchasePricesRaw}
            />

            <ConfirmModal
                isOpen={!!opToDelete}
                title="¿Eliminar Documento?"
                message="Esta acción eliminará el archivo de Google Drive y la referencia en la planilla. No se puede deshacer."
                isDestructive={true}
                isProcessing={isDeleting}
                onConfirm={handleDeleteDoc}
                onCancel={() => setOpToDelete(null)}
                confirmText="Sí, eliminar"
            />

            <DocumentImportWizard
                isOpen={isImportWizardOpen}
                onClose={() => setIsImportWizardOpen(false)}
                operationId={op.id}
                isDemo={isDemo}
            />
        </div>
    )
}
