'use client'

import { FileText, Search, Plus, Clock, CheckCircle, Send, AlertCircle, Loader2, Eye, Edit2, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Operacion, USER_MAP, getResponsableName } from '@/lib/sheets-types'
import ProformaModal from './ProformaModal'
import DocViewerModal from './DocViewerModal'
import { useToast } from './ui/Toast'
import { ConfirmModal } from './ui/ConfirmModal'

import { UserAvatar } from './ui/UserAvatar'

const getEstadoBadge = (estado: string, hasDoc: boolean) => {
    if (hasDoc && (!estado || estado === 'Pendiente')) {
        return { className: 'badge badge-success', icon: <FileText size={12} />, label: 'PI Creada' }
    }
    switch (estado) {
        case '1. Operación Creada':
        case 'Borrador':
            return { className: 'badge badge-warning', icon: <Clock size={12} />, label: estado }
        case '2. Proforma Enviada':
        case 'Enviada':
            return { className: 'badge badge-importador', icon: <Send size={12} />, label: estado }
        case '14. Operación Liquidada':
        case 'Cerrada':
        case 'Firmada':
            return { className: 'badge badge-success', icon: <CheckCircle size={12} />, label: estado }
        default:
            return { className: 'badge', icon: <AlertCircle size={12} />, label: estado || 'Sin PI' }
    }
}

export function ProformasView() {
    const [loading, setLoading] = useState(true)
    const [operations, setOperations] = useState<Operacion[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedOp, setSelectedOp] = useState<Operacion | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [generatingId, setGeneratingId] = useState<string | null>(null)
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
            console.log('[ProformasView] Fetching operations...')
            const res = await fetch('/api/operaciones/all')
            const data = await res.json()
            console.log('[ProformasView] Data received:', data)

            if (data.success) {
                setOperations(data.data)
                if (data.data.length === 0) {
                    console.warn('[ProformasView] Received 0 operations')
                }
            } else {
                console.error('[ProformasView] API returned error:', data.error)
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

    const handleDeleteProforma = async (op: Operacion) => {
        setIsDeleting(true)
        try {
            // 1. Delete from Drive if exists
            if (op.idDocumento) {
                const driveRes = await fetch('/api/drive/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileId: op.idDocumento })
                })
                const driveData = await driveRes.json()
                if (!driveData.success) {
                    console.warn('Drive deletion failed or file already deleted:', driveData.error)
                }
            }

            // 2. Clear reference in Sheet via PUT
            const res = await fetch(`/api/operaciones/${op.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idDocumento: '',
                    piNumber: '',
                    estadoPi: ''
                })
            })

            if (res.ok) {
                showToast('Proforma desvinculada correctamente', 'success')
                fetchOperations()
            } else {
                showToast('Error al desvincular la Proforma en la planilla.', 'error')
            }
        } catch (error) {
            console.error('Error deleting Proforma:', error)
            showToast('Error al procesar la eliminación', 'error')
        } finally {
            setIsDeleting(false)
            setOpToDelete(null)
        }
    }

    const filteredOps = operations.filter(op => {
        const search = searchTerm.toLowerCase()
        const cliente = (op.cliente || '').toLowerCase()
        const id = (op.id || '').toLowerCase()
        const pi = (op.piNumber || '').toLowerCase()
        return cliente.includes(search) || id.includes(search) || pi.includes(search)
    }).sort((a, b) => {
        // Parse ID format: NNN-YY (e.g. 081-26)
        const parseId = (idStr: string | undefined) => {
            if (!idStr) return { num: 0, year: 0 }
            const parts = idStr.split('-')
            if (parts.length < 2) return { num: 0, year: 0 }
            return {
                num: parseInt(parts[0]) || 0,
                year: parseInt(parts[1]) || 0
            }
        }
        const idA = parseId(a.id)
        const idB = parseId(b.id)
        if (idA.year !== idB.year) return idB.year - idA.year
        return idB.num - idA.num
    })

    return (
        <div className="animate-in">
            {/* Header removed as it will be handled by tabs or parent */}

            {/* Search */}
            <div className="card mb-[var(--space-6)] !p-[var(--space-4)]">
                <div className="search-bar max-w-[400px]">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por PI, ID operación o cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="table-container">
                {loading ? (
                    <div className="p-10 text-center">
                        <Loader2 className="animate-spin mx-auto text-muted" size={24} />
                        <p className="text-muted mt-2">Cargando operaciones...</p>
                    </div>
                ) : (
                    <table className="table" style={{ tableLayout: 'fixed', width: '100%' }}>
                        <colgroup>
                            <col style={{ width: '90px' }} />
                            <col style={{ width: '130px' }} />
                            <col style={{ width: '110px' }} />
                            <col style={{ width: '220px' }} />
                            <col style={{ width: '120px' }} />
                            <col style={{ width: '110px' }} />
                            <col style={{ width: '90px' }} />
                            <col style={{ width: '80px' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th>OP ID</th>
                                <th>Responsable</th>
                                <th>PI Number</th>
                                <th>Cliente</th>
                                <th>Incoterm</th>
                                <th>Estado</th>
                                <th>Fecha Emb.</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOps.map((op) => {
                                const hasDoc = !!op.idDocumento;
                                const estadoBadge = getEstadoBadge(op.estadoPi || '', hasDoc);

                                return (
                                    <tr key={op.id} className="clickable-row">
                                        <td className="cell-op-id">
                                            {op.id}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <UserAvatar email={op.userId || ''} size={24} variant="outlined" />
                                                <span className="text-[var(--font-size-sm)]" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getResponsableName(op.userId)}</span>
                                            </div>
                                        </td>
                                        <td className="font-bold text-[var(--text)]" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {op.piNumber || '-'}
                                        </td>
                                        <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-[var(--cyan)] shrink-0" />
                                                <span className="text-[13px] text-[var(--text)] font-semibold" title={op.cliente || ''}>
                                                    {op.cliente || '-'}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            <div className="text-[var(--font-size-sm)] text-[var(--text-muted)]">
                                                {op.incoterm || '-'}
                                            </div>
                                            {op.puertoDestino && (
                                                <div className="text-[11px] text-[var(--text-dim)]" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {op.puertoDestino}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <span className={estadoBadge.className}>
                                                {estadoBadge.icon}
                                                <span className="ml-1">{estadoBadge.label}</span>
                                            </span>
                                        </td>
                                        <td className="text-[13px] text-[var(--text-muted)]">
                                            {op.fechaEmbarque ? new Date(op.fechaEmbarque).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="text-right">
                                            <div className="flex gap-1 justify-end">
                                                {hasDoc && (
                                                    <button
                                                        onClick={() => setViewerConfig({
                                                            isOpen: true,
                                                            docId: op.idDocumento!,
                                                            title: `Proforma ${op.piNumber || op.id}`
                                                        })}
                                                        className="icon-btn text-[var(--cyan)]"
                                                        title="Ver Documento"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                )}
                                                {!hasDoc && (
                                                    <button
                                                        className="icon-btn text-[var(--text)]"
                                                        title="Generar Proforma"
                                                        onClick={() => handleOpenModal(op)}
                                                    >
                                                        <Plus size={18} />
                                                    </button>
                                                )}
                                                {hasDoc && (
                                                    <button
                                                        className="icon-btn text-[var(--red)]"
                                                        title="Desvincular Proforma"
                                                        onClick={() => setOpToDelete(op)}
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
                <ProformaModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false)
                        setSelectedOp(null)
                    }}
                    operationId={selectedOp.id || ''}
                    clientName={selectedOp.cliente || 'Sin Cliente'}
                    docId={selectedOp.idDocumento || ''}
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
                title="¿Eliminar Proforma?"
                message={`¿Estás seguro de que deseas eliminar permanentemente la Proforma ${opToDelete?.piNumber || opToDelete?.id}? El documento se borrará de Google Drive y se quitará la referencia de la operación.`}
                isDestructive={true}
                isProcessing={isDeleting}
                onConfirm={() => opToDelete && handleDeleteProforma(opToDelete)}
                onCancel={() => setOpToDelete(null)}
                confirmText="Sí, eliminar"
            />
        </div>
    )
}
