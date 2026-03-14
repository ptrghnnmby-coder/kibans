'use client'

import { ShoppingCart, Search, Plus, Clock, FileText, Loader2, Link as LinkIcon, RefreshCw, Eye, Edit2, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Operacion, getResponsableName } from '@/lib/sheets-types'
import { UserAvatar } from './ui/UserAvatar'
import PoModal from './PoModal'
import DocViewerModal from './DocViewerModal'
import { useToast } from './ui/Toast'
import { ConfirmModal } from './ui/ConfirmModal'

export function OrdenesView() {
    const [loading, setLoading] = useState(true)
    const [operations, setOperations] = useState<Operacion[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedOp, setSelectedOp] = useState<Operacion | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [viewerConfig, setViewerConfig] = useState<{ isOpen: boolean, docId: string, title: string }>({
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

    const handleOpenModal = (op: Operacion) => {
        setSelectedOp(op)
        setIsModalOpen(true)
    }

    const handleDeleteOc = async (op: Operacion) => {
        setIsDeleting(true)
        try {
            // 1. Delete from Drive if exists
            if (op.ocIdDocumento) {
                const driveRes = await fetch('/api/drive/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileId: op.ocIdDocumento })
                })
                const driveData = await driveRes.json()
                if (!driveData.success) {
                    console.warn('Drive deletion failed or file already deleted:', driveData.error)
                }
            }

            // 2. Clear reference in Sheet
            const res = await fetch(`/api/operaciones/${op.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ocId: '',
                    ocIdDocumento: ''
                })
            })

            if (res.ok) {
                showToast('PO desvinculada y eliminada correctamente', 'success')
                fetchOperations()
            } else {
                showToast('Error al desvincular la PO en la planilla.', 'error')
            }
        } catch (error) {
            console.error('Error deleting OC:', error)
            showToast('Error al procesar la eliminación', 'error')
        } finally {
            setIsDeleting(false)
            setOpToDelete(null)
        }
    }

    const filteredOps = operations.filter(op => {
        const search = searchTerm.toLowerCase()
        const provider = (op.productor || op.exportador || '').toLowerCase()
        const id = (op.id || '').toLowerCase()
        const oc = (op.ocId || '').toLowerCase()
        const pi = (op.piNumber || '').toLowerCase()
        return provider.includes(search) || id.includes(search) || oc.includes(search) || pi.includes(search)
    }).sort((a, b) => (b.id || '').localeCompare(a.id || ''))

    return (
        <div className="animate-in">
            {/* Search and Actions */}
            <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="search-bar" style={{ maxWidth: '400px', flex: 1 }}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por PO, ID, Proveedor o PI..."
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
                        <p className="text-muted mt-4">Obteniendo Órdenes de Compra...</p>
                    </div>
                ) : filteredOps.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center' }}>
                        <ShoppingCart size={48} className="mx-auto text-muted" style={{ opacity: 0.2, marginBottom: '20px' }} />
                        <h3 style={{ color: 'var(--text-muted)' }}>No se encontraron órdenes</h3>
                        <p className="text-dim">Intenta con otro término de búsqueda</p>
                    </div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>OP ID</th>
                                <th>Responsable</th>
                                <th>PO Number</th>
                                <th>Proveedor / Productor</th>
                                <th>PI Ref.</th>
                                <th>Estado Doc.</th>
                                <th>Fecha Emb.</th>
                                <th style={{ textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOps.map((op) => {
                                const hasDoc = !!op.ocIdDocumento;
                                const hasOcId = !!op.ocId;

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
                                        <td style={{ fontWeight: 700, color: 'white' }}>
                                            {op.ocId || '-'}
                                        </td>
                                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                                            {op.productor || op.exportador || '-'}
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                            {op.piNumber || '-'}
                                        </td>
                                        <td>
                                            {hasDoc ? (
                                                <span className="badge badge-success">
                                                    <CheckCircle size={12} style={{ marginRight: '4px' }} /> Lista
                                                </span>
                                            ) : (
                                                <span className="badge badge-warning">
                                                    <Clock size={12} style={{ marginRight: '4px' }} /> Pendiente
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
                                                            docId: op.ocIdDocumento!,
                                                            title: `Order ${op.ocId || op.id}`
                                                        })}
                                                        className="icon-btn"
                                                        title="Ver Documento"
                                                        style={{ color: 'var(--cyan)' }}
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                )}
                                                {!hasDoc && (
                                                    <button
                                                        className="icon-btn"
                                                        title="Generar PO"
                                                        onClick={() => handleOpenModal(op)}
                                                        style={{ color: 'var(--text)' }}
                                                    >
                                                        <Plus size={18} />
                                                    </button>
                                                )}
                                                {hasDoc && (
                                                    <button
                                                        className="icon-btn"
                                                        title="Desvincular PO"
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
                <PoModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false)
                        setSelectedOp(null)
                        fetchOperations() // Refresh to see new doc IDs
                    }}
                    operationId={selectedOp.id || ''}
                    supplierName={selectedOp.productor || selectedOp.exportador || 'Proveedor'}
                    docId={selectedOp.ocIdDocumento}
                    ocId={selectedOp.ocId}
                    initialBillToId={selectedOp.billToId}
                    initialConsigneeId={selectedOp.consigneeId}
                    initialNotifyId={selectedOp.notifyId}
                    initialPortLoad={selectedOp.portLoad}
                    initialPortDest={selectedOp.puertoDestino}
                    initialIncoterm={selectedOp.incoterm}
                    initialPaymentTerms={selectedOp.paymentTerms}
                    initialFechaEmbarque={selectedOp.fechaEmbarque}
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
                title="¿Eliminar Orden de Compra?"
                message={`¿Estás seguro de que deseas eliminar permanentemente la PO ${opToDelete?.ocId}? El documento se borrará de Google Drive y se quitará la referencia de esta operación.`}
                isDestructive={true}
                isProcessing={isDeleting}
                onConfirm={() => opToDelete && handleDeleteOc(opToDelete)}
                onCancel={() => setOpToDelete(null)}
                confirmText="Sí, eliminar"
            />
        </div>
    )
}

function CheckCircle({ size, style }: { size: number, style?: any }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={style}
        >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    )
}
