import React, { useState, useEffect } from 'react'
import { Ship, Send, FileText, Plus, Trash2, CheckCircle, AlertCircle, X, ExternalLink, Edit2, Save } from 'lucide-react'
import { parseNumeric, formatInputBankStyle, formatNumber } from '@/lib/numbers'
import { Operacion, Contacto, Flete } from '../lib/sheets-types'
import { SearchableSelect } from './ui/SearchableSelect'
import { useToast } from './ui/Toast'
import BookingModal from './BookingModal'

interface FreightViewProps {
    op: Operacion
    contacts: Contacto[]
    fletes: Flete[]
    onAddFlete: (flete: Partial<Flete>) => Promise<void>
    onUpdateFlete: (forwarder: string, updates: Partial<Flete>) => Promise<void>
    onDeleteFlete: (forwarder: string) => Promise<void>
    isEditing: boolean
    allProducts?: any[]
}

export const FreightView: React.FC<FreightViewProps> = ({
    op,
    contacts,
    fletes,
    onAddFlete,
    onUpdateFlete,
    onDeleteFlete,
    isEditing,
    allProducts
}) => {
    const [selectedForwarder, setSelectedForwarder] = useState<string>('')
    const [isAdding, setIsAdding] = useState(false)
    const [editingFleteId, setEditingFleteId] = useState<string | null>(null)
    const [editingFleteData, setEditingFleteData] = useState<Partial<Flete>>({})
    const [fleteToDelete, setFleteToDelete] = useState<string | null>(null)
    const [bookingModal, setBookingModal] = useState<{ isOpen: boolean, forwarder: string } | null>(null)
    const { showToast } = useToast()

    // Filter contacts to only show Forwarders
    const forwarders = contacts.filter(c => c.tipo === 'Forwarder' || c.isForwarder)

    const handleAddForwarder = async () => {
        if (!selectedForwarder) return

        // Check if already exists
        if (fletes.some(f => f.forwarder === selectedForwarder)) {
            showToast('Este forwarder ya está en la lista', 'warning')
            return
        }

        await onAddFlete({
            forwarder: selectedForwarder,
            estado: 'Pendiente',
            monto: 0,
            moneda: 'USD',
            seguro: 'NO',
            temp: '',
            validez: ''
        })
        setSelectedForwarder('')
        setIsAdding(false)
    }

    const generateWhatsAppLink = (flete: Flete) => {
        const forwarderContact = contacts.find(c => c.id === flete.forwarder || c.empresa === flete.forwarder)
        if (!forwarderContact?.telefono) return null

        let cargaStr = op.productos || ''
        if (allProducts && op.productos) {
            const rawEntries = op.productos.split(/[\n,]/).filter(Boolean)
            const humanReadable = rawEntries.map(line => {
                const parts = line.trim().split(':')
                const id = parts[0]?.trim()
                const qty = parts[1] ? parseNumeric(parts[1]) : 0

                const product = allProducts.find(p => p.id === id)
                const desc = product ? `${product.especie} ${product.corte}`.trim() : id
                return `${qty} CTNS / KGS de ${desc}`
            })
            if (humanReadable.length > 0) {
                cargaStr = humanReadable.join('\n')
            }
        }

        const message = `Hola ${forwarderContact.nombreContacto}, solicito cotización para:

Ref: ${op.id}
Ruta: ${op.portLoad} -> ${op.puertoDestino}

Carga:
${cargaStr}

Contenedor: 40HC (Reefer)`

        return `https://wa.me/${forwarderContact.telefono.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`
    }

    return (
        <div className="flex flex-col gap-[var(--space-6)]">

            {/* Header / Resumen */}
            <div className="card !p-[var(--space-6)]">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-[var(--cyan-soft)] text-[var(--cyan)] p-2.5 rounded-[var(--radius-lg)]">
                            <Ship size={24} />
                        </div>
                        <div>
                            <h3 className="text-[var(--font-size-base)] font-bold m-0">Gestión de Fletes</h3>
                            <p className="text-[var(--font-size-xs)] text-[var(--text-muted)] mt-1">
                                {fletes.length} cotizaciones activas
                            </p>
                        </div>
                    </div>

                    <button className="btn btn-primary" onClick={() => setIsAdding(true)}>
                        <Plus size={16} /> Agregar Forwarder
                    </button>

                </div>

                {isAdding && (
                    <div className="mt-5 p-4 bg-[var(--surface-raised)] rounded-[var(--radius-md)] flex gap-2.5 items-end">
                        <div className="flex-1">
                            <label className="text-[var(--font-size-xs)] mb-1 block">Seleccionar Forwarder</label>
                            <SearchableSelect
                                options={forwarders.map(c => ({ id: c.id, label: `${c.id} | ${c.empresa} (${c.nombreContacto})` }))}
                                value={selectedForwarder}
                                onChange={setSelectedForwarder}
                                placeholder="Buscar forwarder..."
                            />
                        </div>
                        <button className="btn btn-primary" onClick={handleAddForwarder} disabled={!selectedForwarder}>
                            Confirmar
                        </button>
                        <button className="btn btn-secondary" onClick={() => setIsAdding(false)}>
                            Cancelar
                        </button>
                    </div>
                )}
            </div>

            {/* Lista de Cotizaciones */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
                {fletes.map(flete => {
                    const contact = contacts.find(c => c.id === flete.forwarder)
                    const waLink = generateWhatsAppLink(flete)

                    return (
                        <div key={flete.forwarder} className="card relative !p-5" style={{ borderLeft: flete.estado === 'Seleccionado' ? '4px solid var(--green)' : '4px solid transparent' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="m-0 text-[var(--font-size-sm)] font-bold">{contact?.empresa || flete.forwarder}</h4>
                                    <span className="text-[11px] text-[var(--text-muted)]">{contact?.nombreContacto}</span>
                                </div>
                                <div className={`badge badge-${flete.estado === 'Seleccionado' ? 'success' : flete.estado === 'Rechazado' ? 'error' : 'warning'}`}>
                                    {flete.estado}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 mb-4 text-[13px]">
                                <div>
                                    <label className="text-[10px] text-[var(--text-muted)]">Monto ({flete.moneda})</label>
                                    {editingFleteId === flete.forwarder ? (
                                        <input
                                            type="text"
                                            className="input input-small w-full"
                                            value={editingFleteData.monto || ''}
                                            onChange={e => setEditingFleteData({ ...editingFleteData, monto: parseFloat(formatInputBankStyle(e.target.value).replace(/[^0-9.-]+/g, "")) || 0 })}
                                        />
                                    ) : (
                                        <div className="font-semibold">{flete.moneda} {formatNumber(Number(flete.monto))}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="text-[10px] text-[var(--text-muted)]">Validez</label>
                                    {editingFleteId === flete.forwarder ? (
                                        <input
                                            type="text"
                                            className="input input-small w-full"
                                            value={editingFleteData.validez || ''}
                                            onChange={e => setEditingFleteData({ ...editingFleteData, validez: e.target.value })}
                                        />
                                    ) : (
                                        <div>{flete.validez || '-'}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="text-[10px] text-[var(--text-muted)]">Seguro</label>
                                    {editingFleteId === flete.forwarder ? (
                                        <select
                                            className="input input-small w-full"
                                            value={editingFleteData.seguro || 'NO'}
                                            onChange={e => setEditingFleteData({ ...editingFleteData, seguro: e.target.value as 'SI' | 'NO' })}
                                        >
                                            <option value="NO">NO</option>
                                            <option value="SI">SI</option>
                                        </select>
                                    ) : (
                                        <div>{flete.seguro || 'NO'}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="text-[10px] text-[var(--text-muted)]">Temperatura</label>
                                    {editingFleteId === flete.forwarder ? (
                                        <input
                                            type="text"
                                            className="input input-small w-full"
                                            value={editingFleteData.temp || ''}
                                            onChange={e => setEditingFleteData({ ...editingFleteData, temp: e.target.value })}
                                            placeholder="-18°C"
                                        />
                                    ) : (
                                        <div>{flete.temp || '-'}</div>
                                    )}
                                </div>
                            </div>

                            {/* Acciones */}
                            {editingFleteId === flete.forwarder ? (
                                <div className="flex gap-2 mt-auto">
                                    <button
                                        className="btn btn-primary btn-small flex-1 justify-center"
                                        onClick={async () => {
                                            await onUpdateFlete(flete.forwarder, editingFleteData)
                                            setEditingFleteId(null)
                                        }}
                                    >
                                        <Save size={14} /> Guardar
                                    </button>
                                    <button
                                        className="btn btn-secondary btn-small flex-1 justify-center"
                                        onClick={() => setEditingFleteId(null)}
                                    >
                                        <X size={14} /> Cancelar
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2 mt-auto">
                                    {waLink ? (
                                        <a
                                            href={waLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-secondary btn-small flex-1 justify-center"
                                        >
                                            <Send size={14} /> WhatsApp
                                        </a>
                                    ) : (
                                        <button
                                            disabled
                                            className="btn btn-secondary btn-small flex-1 justify-center disabled"
                                            style={{ opacity: 0.5, cursor: 'not-allowed' }}
                                        >
                                            <Send size={14} /> WhatsApp
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-secondary btn-small"
                                        title="Generar Instrucción PDF"
                                        onClick={() => setBookingModal({ isOpen: true, forwarder: flete.forwarder })}
                                    >
                                        <FileText size={14} />
                                    </button>
                                    <button
                                        className="btn btn-secondary btn-small"
                                        title="Editar cotización"
                                        onClick={() => {
                                            setEditingFleteId(flete.forwarder)
                                            setEditingFleteData({
                                                monto: flete.monto,
                                                moneda: flete.moneda,
                                                validez: flete.validez,
                                                seguro: flete.seguro,
                                                temp: flete.temp
                                            })
                                        }}
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        className="btn btn-danger btn-small"
                                        onClick={() => setFleteToDelete(flete.forwarder)}
                                        title="Eliminar"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Selección */}
                            {flete.estado !== 'Seleccionado' && (
                                <button
                                    className="btn btn-primary btn-small w-full mt-2.5"
                                    onClick={() => onUpdateFlete(flete.forwarder, { estado: 'Seleccionado' })}
                                >
                                    <CheckCircle size={14} /> Adjudicar Flete
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>

            {fletes.length === 0 && (
                <div className="p-10 text-center text-[var(--text-muted)] bg-[var(--surface-raised)] rounded-[var(--radius-lg)]">
                    <Ship size={48} className="opacity-20 mb-2.5 mx-auto" />
                    <p>No hay cotizaciones solicitadas.</p>
                </div>
            )}

            {/* Custom Delete Modal */}
            {fleteToDelete && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[10001] p-5 animate-in fade-in duration-200">
                    <div className="card w-full max-w-[380px] p-8 text-center border border-[var(--border)]">
                        <div className="w-16 h-16 rounded-full bg-[var(--red-soft)] text-[var(--red)] flex items-center justify-center mx-auto mb-6">
                            <Trash2 size={32} />
                        </div>

                        <h4 className="text-[var(--font-size-xl)] font-extrabold mb-3">
                            ¿Eliminar cotización?
                        </h4>
                        <p className="text-[var(--text-dim)] text-[var(--font-size-sm)] mb-8">
                            Se eliminará la cotización de <strong>{contacts.find(c => c.id === fleteToDelete)?.empresa || fleteToDelete}</strong>. <br />Esta acción no se puede deshacer.
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                className="btn btn-secondary flex justify-center"
                                onClick={() => setFleteToDelete(null)}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn bg-[var(--red)] text-white border-none flex justify-center"
                                onClick={async () => {
                                    await onDeleteFlete(fleteToDelete)
                                    setFleteToDelete(null)
                                }}
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {bookingModal && (
                <BookingModal
                    isOpen={bookingModal.isOpen}
                    onClose={() => setBookingModal(null)}
                    operationId={op.id || ''}
                    forwarderName={bookingModal.forwarder}
                    waLink={generateWhatsAppLink(fletes.find(f => f.forwarder === bookingModal.forwarder)!)}
                />
            )}

        </div>
    )
}
