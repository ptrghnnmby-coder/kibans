'use client'

import React, { useState } from 'react'
import { Ship, Calendar, Package, FileText, Anchor, X, Loader2, CheckCircle, Navigation } from 'lucide-react'
import { Operacion } from '@/lib/sheets-types'

interface LoadModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (data: Partial<Operacion>) => Promise<void>
    initialData: Operacion
}

export default function LoadModal({ isOpen, onClose, onSave, initialData }: LoadModalProps) {
    const [saving, setSaving] = useState(false)
    const [progress, setProgress] = useState(0)
    const [formData, setFormData] = useState({
        loadedDate: initialData.loadedDate || new Date().toISOString().split('T')[0],
        containerNumber: initialData.containerNumber || '',
        booking: initialData.booking || '',
        shipLane: initialData.shipLane || '',
        portLoad: initialData.portLoad || '',
        puertoDestino: initialData.puertoDestino || '',
        estado: '8. Carga Realizada' as any
    })

    React.useEffect(() => {
        let interval: any
        if (saving) {
            setProgress(0)
            interval = setInterval(() => {
                setProgress(prev => (prev < 1 ? prev + 0.05 : 1))
            }, 100)
        }
        return () => clearInterval(interval)
    }, [saving])

    if (!isOpen) return null

    const handleSave = async () => {
        setSaving(true)
        try {
            await onSave(formData)
            onClose()
        } catch (error) {
            console.error('Error saving load data:', error)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-xl bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">

                {/* Header Decoration */}
                <div className="h-1 bg-gradient-to-r from-blue to-accent"></div>

                <div className="p-8">
                    <div className="flex justify-between items-start mb-8">
                        <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
                                <Ship size={28} className={saving ? 'animate-bounce' : ''} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-[var(--text)] uppercase tracking-tight">Hito de Carga</h2>
                                <p className="text-xs text-[var(--text-dim)] font-bold tracking-widest uppercase opacity-70">
                                    Operation Milestone: {initialData.id}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-[var(--surface-raised)] rounded-lg transition-colors text-[var(--text-dim)]"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center gap-2">
                                <Calendar size={12} /> Fecha de Carga (LD)
                            </label>
                            <input
                                type="date"
                                className="input-compact w-full !bg-[var(--surface-raised)]"
                                value={formData.loadedDate}
                                onChange={e => setFormData({ ...formData, loadedDate: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center gap-2">
                                <Package size={12} /> Contenedor #
                            </label>
                            <input
                                type="text"
                                className="input-compact w-full font-mono !bg-[var(--surface-raised)]"
                                placeholder="SUTU1234567"
                                value={formData.containerNumber}
                                onChange={e => setFormData({ ...formData, containerNumber: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center gap-2">
                                <FileText size={12} /> Booking / BL
                            </label>
                            <input
                                type="text"
                                className="input-compact w-full !bg-[var(--surface-raised)]"
                                value={formData.booking}
                                onChange={e => setFormData({ ...formData, booking: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center gap-2">
                                <Navigation size={12} /> Naviera / Ship Lane
                            </label>
                            <input
                                type="text"
                                className="input-compact w-full !bg-[var(--surface-raised)]"
                                value={formData.shipLane}
                                onChange={e => setFormData({ ...formData, shipLane: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center gap-2">
                                <Anchor size={12} /> Puerto Origen (POL)
                            </label>
                            <input
                                type="text"
                                className="input-compact w-full !bg-[var(--surface-raised)]"
                                value={formData.portLoad}
                                onChange={e => setFormData({ ...formData, portLoad: e.target.value })}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center gap-2">
                                <Anchor size={12} /> Puerto Destino (POD)
                            </label>
                            <input
                                type="text"
                                className="input-compact w-full !bg-[var(--surface-raised)]"
                                value={formData.puertoDestino}
                                onChange={e => setFormData({ ...formData, puertoDestino: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Boat Animation Section */}
                    <div className="mt-10 py-6 border-t border-[var(--border)] relative overflow-hidden">
                        {saving ? (
                            <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
                                <div className="relative w-full h-12 flex items-center">
                                    <div className="absolute left-0 right-0 h-[1px] bg-[var(--border)]"></div>
                                    <Ship
                                        size={32}
                                        className="text-accent absolute transition-all duration-1000 ease-in-out"
                                        style={{ left: 'calc(10% + 70% * var(--progress, 0))', '--progress': '0.5' } as any}
                                    />
                                </div>
                                <span className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] animate-pulse">
                                    Procesando Carga...
                                </span>
                            </div>
                        ) : (
                            <div className="flex justify-between items-center bg-[var(--surface-raised)] p-4 rounded-xl border border-[var(--border)]">
                                <div className="text-[11px] text-[var(--text-dim)] font-medium max-w-[280px]">
                                    Completar este paso moverá la operación automáticamente a la sección de <span className="text-accent font-bold">Tracking</span>.
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={onClose}
                                        className="btn btn-secondary !rounded-lg"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="btn btn-primary !rounded-lg !px-6 flex gap-2 items-center"
                                    >
                                        <CheckCircle size={16} /> Confirmar Carga
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .animate-cruise {
                    animation: cruise 3s infinite linear;
                }
                @keyframes cruise {
                    0% { transform: translateX(-20px); }
                    50% { transform: translateX(20px); }
                    100% { transform: translateX(-20px); }
                }
            `}</style>
        </div>
    )
}
