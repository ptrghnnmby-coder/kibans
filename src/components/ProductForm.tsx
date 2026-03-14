'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from './ui/Button'

export interface ProductData {
    especie: string
    corte: string
    calibre: string
    packing: string
    tamanoCaja: string
    nombreCientifico: string
    origen: string
    defaultTemp: string
    defaultVent: string
    defaultDrains: string
    defaultHumidity: string
}

interface ProductFormProps {
    initialData?: Partial<ProductData>
    onSubmit: (data: ProductData) => Promise<void>
    onCancel: () => void
    isSubmitting?: boolean
}

export function ProductForm({ initialData, onSubmit, onCancel, isSubmitting = false }: ProductFormProps) {
    const [formData, setFormData] = useState<ProductData>({
        especie: '',
        corte: '',
        calibre: '',
        packing: '',
        tamanoCaja: '',
        nombreCientifico: '',
        origen: '',
        defaultTemp: '',
        defaultVent: '',
        defaultDrains: '',
        defaultHumidity: '',
        ...initialData
    })

    const handleChange = (field: keyof ProductData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onSubmit(formData)
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="alert alert-info" style={{ borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
                <p style={{ fontSize: '12px', lineHeight: 1.4 }}>
                    <strong>Nota:</strong> Los nuevos productos se generarán siguiendo la secuencia de IDs existente.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="input-group">
                    <label className="input-label">Especie *</label>
                    <input
                        type="text"
                        required
                        className="input"
                        placeholder="Ej: Langostino"
                        value={formData.especie}
                        onChange={e => handleChange('especie', e.target.value)}
                    />
                </div>
                <div className="input-group">
                    <label className="input-label">Corte(s) *</label>
                    <input
                        type="text"
                        required
                        className="input"
                        placeholder="Ej: HGT, Entero"
                        value={formData.corte}
                        onChange={e => handleChange('corte', e.target.value)}
                    />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="input-group">
                    <label className="input-label">Calibre(s)</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="Ej: 10-20, 20-30"
                        value={formData.calibre}
                        onChange={e => handleChange('calibre', e.target.value)}
                    />
                </div>
                <div className="input-group">
                    <label className="input-label">Packing(s) *</label>
                    <input
                        type="text"
                        required
                        className="input"
                        placeholder="Ej: 6x2kg, 1x10kg"
                        value={formData.packing}
                        onChange={e => handleChange('packing', e.target.value)}
                    />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="input-group">
                    <label className="input-label">Tamaño Caja</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="Ej: 12kg Master"
                        value={formData.tamanoCaja}
                        onChange={e => handleChange('tamanoCaja', e.target.value)}
                    />
                </div>
                <div className="input-group">
                    <label className="input-label">Origen(es)</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="Argentina, Ecuador"
                        value={formData.origen}
                        onChange={e => handleChange('origen', e.target.value)}
                    />
                </div>
            </div>

            <div className="input-group">
                <label className="input-label">Nombre Científico (Opcional)</label>
                <input
                    type="text"
                    className="input"
                    placeholder="Ej: Pleoticus muelleri"
                    value={formData.nombreCientifico}
                    onChange={e => handleChange('nombreCientifico', e.target.value)}
                />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 'var(--space-2) 0' }} />

            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: 'var(--space-2)' }}>Condiciones Reefer (Opcional)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="input-group">
                    <label className="input-label">Temperatura</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="Ej: -18 C"
                        value={formData.defaultTemp}
                        onChange={e => handleChange('defaultTemp', e.target.value)}
                    />
                </div>
                <div className="input-group">
                    <label className="input-label">Ventilación</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="Ej: Closed"
                        value={formData.defaultVent}
                        onChange={e => handleChange('defaultVent', e.target.value)}
                    />
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="input-group">
                    <label className="input-label">Desagües (Drains)</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="Ej: Closed"
                        value={formData.defaultDrains}
                        onChange={e => handleChange('defaultDrains', e.target.value)}
                    />
                </div>
                <div className="input-group">
                    <label className="input-label">Humedad</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="Ej: OFF"
                        value={formData.defaultHumidity}
                        onChange={e => handleChange('defaultHumidity', e.target.value)}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
                <Button type="button" onClick={onCancel} variant="secondary" className="flex-1">
                    Cancelar
                </Button>
                <Button type="submit" isLoading={isSubmitting} variant="primary" className="flex-1">
                    Guardar Producto
                </Button>
            </div>
        </form>
    )
}
