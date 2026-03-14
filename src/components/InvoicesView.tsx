'use client'

import { FileText, Search, RefreshCw, Eye, Plus, Trash2, Clock, CheckCircle, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Operacion, getResponsableName } from '@/lib/sheets-types'
import { UserAvatar } from './ui/UserAvatar'
import OriginalInvoiceModal from './OriginalInvoiceModal'
import DocViewerModal from './DocViewerModal'
import { useToast } from './ui/Toast'
import { ConfirmModal } from './ui/ConfirmModal'

export function InvoicesView() {
    const [loading, setLoading] = useState(true)
    const [operations, setOperations] = useState<Operacion[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedOp, setSelectedOp] = useState<Operacion | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [viewerConfig, setViewerConfig] = useState<{ isOpen: boolean; docId: string; title: string }>({
        isOpen: false,
        docId: '',
        title: ''
    })
    const { showToast } = useToast()
    const [opToDelete, setOpToDelete] = useState<Operacion | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        fetchOperations()
    }, [])

    const fetchOperations = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/operaciones/all')
            const data = await res.json()
            if (data.success) {
                setOperations(data.data)
            }
        } catch (error) {
            console.error('Error fetching operations:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteInvoice = async (op: Operacion) => {
        setIsDeleting(true)
        try {
            if (op.invoiceDocId) {
                const driveRes = await fetch('/api/drive/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileId: op.invoiceDocId })
                })
                const driveData = await driveRes.json()
                if (!driveData.success) {
                    console.warn('Drive deletion failed or file already deleted:', driveData.error)
                }
            }

            const res = await fetch(`/api/operaciones/${op.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoiceDocId: '' })
            })

            if (res.ok) {
                showToast('Original Invoice eliminada correctamente', 'success')
                fetchOperations()
            } else {
                showToast('Error al actualizar la planilla', 'error')
            }
        } catch (error) {
            console.error('Error deleting invoice:', error)
            showToast('Error al procesar la eliminación', 'error')
        } finally {
            setIsDeleting(false)
            setOpToDelete(null)
        }
    }

    const filteredOps = operations.filter(op => {
        const search = searchTerm.toLowerCase()
        const customer = (op.cliente || '').toLowerCase()
        const id = (op.id || '').toLowerCase()
        const piNumber = (op.piNumber || '').toLowerCase()
        return customer.includes(search) || id.includes(search) || piNumber.includes(search)
    }).sort((a, b) => (b.id || '').localeCompare(a.id || ''))

    return (
        <div className="animate-in">
            {/* Search and Refresh */}
            <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="search-bar" style={{ maxWidth: '400px', flex: 1 }}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por ID operación, PI Number o cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    className="btn btn-secondary"
                    onClick={fetchOperations}
                    disabled={loading}
                    style={{ marginLeft: 'var(--space-4)' }}
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Table Container */}
            <div className="table-container">
                {loading && operations.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center' }}>
                        <Loader2 className="animate-spin mx-auto text-muted" size={32} />
                        <p className="text-muted mt-4">Obteniendo Original Invoices...</p>
                    </div>
                ) : filteredOps.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center' }}>
                        <FileText size={48} className="mx-auto text-muted" style={{ opacity: 0.2, marginBottom: '20px' }} />
                        <h3 style={{ color: 'var(--text-muted)' }}>No se encontraron operaciones</h3>
                        <p className="text-dim">Intenta con otro término de búsqueda</p>
                    </div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Referencia</th>
                                <th>Responsable</th>
                                <th>PI Number</th>
                                <th>Cliente</th>
                                <th>Incoterm</th>
                                <th>Estado Invoice</th>
                                <th>Fecha Emb.</th>
                                <th style={{ textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOps.map((op) => {
                                const hasDoc = !!op.invoiceDocId

                                return (
                                    <tr key={op.id}>
                                        <td className="cell-op-id">
                                            {op.id}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-size-sm)' }}>
                                                <UserAvatar email={op.userId || ''} size={24} variant="outlined" />
                                                <span>{getResponsableName(op.userId)}</span>
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: 700, color: 'var(--text)', fontSize: '13px' }}>
                                            {op.piNumber || '-'}
                                        </td>
                                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                                            {op.cliente || '-'}
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                            {op.incoterm || '-'}
                                            {op.puertoDestino ? (
                                                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{op.puertoDestino}</div>
                                            ) : null}
                                        </td>
                                        <td>
                                            {hasDoc ? (
                                                <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                    <CheckCircle size={12} /> Lista
                                                </span>
                                            ) : (
                                                <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                    <Clock size={12} /> Pendiente
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                                            {op.fechaEmbarque || '-'}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                {hasDoc && (
                                                    <button
                                                        onClick={() => setViewerConfig({
                                                            isOpen: true,
                                                            docId: op.invoiceDocId!,
                                                            title: `Original Invoice ${op.piNumber || op.id}`
                                                        })}
                                                        className="icon-btn"
                                                        title="Ver Documento"
                                                        style={{ color: 'var(--cyan)' }}
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    className="icon-btn"
                                                    title={hasDoc ? 'Editar / Regenerar Invoice' : 'Generar Original Invoice'}
                                                    onClick={() => { setSelectedOp(op); setIsModalOpen(true) }}
                                                    style={{ color: '#a855f7' }}
                                                >
                                                    {hasDoc ? <FileText size={18} /> : <Plus size={18} />}
                                                </button>
                                                {hasDoc && (
                                                    <button
                                                        className="icon-btn"
                                                        title="Eliminar Invoice"
                                                        onClick={() => setOpToDelete(op)}
                                                        style={{ color: 'var(--red)' }}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {selectedOp && (
                <OriginalInvoiceModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false)
                        setSelectedOp(null)
                        fetchOperations()
                    }}
                    operationId={selectedOp.id || ''}
                    clientName={selectedOp.cliente || 'Sin Cliente'}
                    invoiceDocId={selectedOp.invoiceDocId}
                    opProductos={selectedOp.productos}
                    opPurchaseRaw={selectedOp.purchasePricesRaw}
                />
            )}

            {viewerConfig.isOpen && (
                <DocViewerModal
                    isOpen={viewerConfig.isOpen}
                    onClose={() => setViewerConfig({ ...viewerConfig, isOpen: false })}
                    docId={viewerConfig.docId}
                    title={viewerConfig.title}
                />
            )}

            <ConfirmModal
                isOpen={!!opToDelete}
                title="¿Eliminar Original Invoice?"
                message={`¿Estás seguro de que deseas eliminar la Original Invoice de la operación ${opToDelete?.id}? El documento se borrará de Google Drive y se quitará la referencia.`}
                isDestructive={true}
                isProcessing={isDeleting}
                onConfirm={() => opToDelete && handleDeleteInvoice(opToDelete)}
                onCancel={() => setOpToDelete(null)}
                confirmText="Sí, eliminar"
            />
        </div>
    )
}
