'use client'

export const dynamic = 'force-dynamic'


import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, Briefcase, FileText, Plus, Trash2, Search, DollarSign, User, Anchor, Globe } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Contacto, USER_MAP, PAYMENT_TERMS_OPTIONS, INCOTERMS_OPTIONS } from '@/lib/sheets-types'
import { Producto } from '@/lib/googleSheets'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { PortAutocomplete } from '@/components/PortAutocomplete'
import MapComponent from '@/components/MapComponent'
import { useToast } from '@/components/ui/Toast'
import { ContactForm } from '@/components/ContactForm'
import { ProductForm } from '@/components/ProductForm'
import { useUnsavedChanges } from '@/lib/hooks/useUnsavedChanges'

interface ProductItem {
    id: string
    qty: number
    price: number | string
    buyPrice?: number | string
    desc: string
}

import { Suspense } from 'react'

function NuevaOperacionContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const editId = searchParams.get('id')
    const isEdit = !!editId

    const [contactos, setContactos] = useState<Contacto[]>([])
    // ... rest
    const [productosLib, setProductosLib] = useState<Producto[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [translating, setTranslating] = useState(false)
    const [isForwarderModalOpen, setIsForwarderModalOpen] = useState(false)
    const [isImporterModalOpen, setIsImporterModalOpen] = useState(false)
    const [isExporterModalOpen, setIsExporterModalOpen] = useState(false)
    const [isProducerModalOpen, setIsProducerModalOpen] = useState(false)
    const [isProductModalOpen, setIsProductModalOpen] = useState(false)
    const [activeProductIndex, setActiveProductIndex] = useState<number | null>(null)
    const { showToast } = useToast()

    const [isDirty, setIsDirty] = useState(false)
    useUnsavedChanges(isDirty)

    // Formulario
    const [form, setForm] = useState({
        cliente: '', // Importador
        exportador: '',
        productor: '',
        userId: '', // Responsable Email
        portLoad: '',
        preCarriage: '',   // e.g. "Mendoza, Argentina|Camión"
        puertoDestino: '',
        onCarriage: '',    // e.g. "Chicago, USA|Camión",
        incoterm: '',
        fechaEmbarque: '', // ETD
        paymentTerms: '',
        trading: '',
        notas: '',
        brand: '', // Derived from producer but editable?
        // New Freight Fields
        booking: '',
        forwarder: '',
        freightValue: '',
        containerNumber: '',
        arrivalDate: '', // ETA
    })

    const handleFormChange = (updates: Partial<typeof form>) => {
        setForm(prev => ({ ...prev, ...updates }))
        setIsDirty(true)
    }

    const [productItems, setProductItems] = useState<ProductItem[]>([
        { id: '', qty: 0, price: 0, desc: '' }
    ])

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resContacts, resProducts] = await Promise.all([
                    fetch('/api/contactos').then(r => r.json()),
                    fetch('/api/productos').then(r => r.json())
                ])
                if (resContacts.success) setContactos(resContacts.data)
                // Products API currently not standardized, let's assume get all or implement logic
                if (resProducts.success) setProductosLib(resProducts.data)
                // Fallback if productos api response structure differs
                else if (Array.isArray(resProducts)) setProductosLib(resProducts)

            } catch (error) {
                console.error('Error fetching data:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    // Helpers for Select Options with Role-Based Filtering
    const getOptions = (filterFn: (c: Contacto) => boolean) =>
        contactos.filter(filterFn).map(c => ({
            id: c.id, // Use ID as value for persistence
            label: `${c.id} | ${c.empresa}` // Format: "ID | Name"
        }))

    const responsableOptions = Object.entries(USER_MAP).map(([email, info]) => ({
        id: email, // Store email in UserID field as per prompt logic
        label: info.name
    }))

    const tradingOptions = [
        { id: 'SM Exports Inc', label: 'SM Exports Inc' },
        { id: 'SEAWIND Trade LLC', label: 'SEAWIND Trade LLC' }
    ]

    const forwarderOptions = getOptions(c => c.isForwarder === true || c.tipo === 'Forwarder')

    const productOptions = productosLib.map(p => ({
        id: p.id,
        label: `${p.id} | ${p.descripcion || p.especie}`
    }))

    const updateProduct = (index: number, field: keyof ProductItem, val: any) => {
        const newItems = [...productItems]
        newItems[index] = { ...newItems[index], [field]: val }
        // Auto-fill description if ID changes
        if (field === 'id') {
            const prod = productosLib.find(p => p.id === val)
            if (prod) newItems[index].desc = prod.descripcion || ''
        }
        setProductItems(newItems)
    }

    const removeProduct = (index: number) => {
        setProductItems(productItems.filter((_, i) => i !== index))
    }

    const addProduct = () => {
        setProductItems([...productItems, { id: '', qty: 0, price: 0, buyPrice: 0, desc: '' }])
        setIsDirty(true)
    }

    const handleNotesBlur = async () => {
        if (!form.notas || form.notas.length < 3) return
        setTranslating(true)
        try {
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: form.notas, targetLanguage: 'English' })
            })
            const data = await response.json()
            if (data.translatedText) {
                setForm(prev => ({ ...prev, notas: data.translatedText }))
            }
        } catch (error) {
            console.error('Translation error:', error)
        } finally {
            setTranslating(false)
        }
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
            // Add new contact to list
            const newContact = { ...data, id: result.data.id }
            setContactos(prev => [...prev, newContact])

            // Auto Select based on role
            if (role === 'importer') setForm(prev => ({ ...prev, cliente: result.data.id }))
            else if (role === 'exporter') setForm(prev => ({ ...prev, exportador: result.data.id }))
            else if (role === 'producer') setForm(prev => ({ ...prev, productor: result.data.id }))
            else if (role === 'forwarder') setForm(prev => ({ ...prev, forwarder: result.data.id }))

            // Close correct modal
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
                body: JSON.stringify(data)
            })
            const result = await res.json()

            if (res.ok && result.success) {
                const newProducts = result.data.filter((i: any) => i.esNuevo)
                if (newProducts.length > 0) {
                    showToast(`${newProducts.length} nuevos productos creados`, 'success')

                    // Update products library
                    const fetchedProducts = await fetch('/api/productos').then(r => r.json())
                    if (fetchedProducts.success) setProductosLib(fetchedProducts.data)

                    // Auto Select the first new one for the active row
                    if (activeProductIndex !== null) {
                        updateProduct(activeProductIndex, 'id', newProducts[0].id)
                    }
                }
                setIsProductModalOpen(false)
                setActiveProductIndex(null)
            } else {
                showToast(`Error: ${result.error || 'Error desconocido'}`, 'error')
            }
        } catch (error) {
            console.error(error)
            showToast('Error de conexión', 'error')
        }
    }

    const [successData, setSuccessData] = useState<any>(null)
    const [sendingEmail, setSendingEmail] = useState(false)

    // User Email Map for persistence
    const USER_EMAIL_MAP_REQ: Record<string, string> = {
        'Rafa': 'rdm@southmarinetrading.com',
        'Fede': 'fdm@southmarinetrading.com',
        'Jefe': 'gdm@southmarinetrading.com',
        'Gonza': 'gf@southmarinetrading.com',
        'Hernan': 'hm@southmarinetrading.com',
        'Ana': 'admin@southmarinetrading.com'
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // VALIDATION: Check if there are products
        const validProducts = productItems.filter(p => p.id && p.qty > 0)
        if (validProducts.length === 0) {
            showToast('Debes agregar al menos un producto con ID y cantidad mayor a cero.', 'warning')
            return
        }

        setSubmitting(true)

        // Format products for Sheets (ID:QTY:PRICE)
        // Seller Price in Productos_Raw
        const productosRaw = productItems.map(p => `${p.id}:${p.qty}:${p.price}`).join('\n')
        // Buyer Price in Purchase_Prices_Raw
        const purchasePricesRaw = productItems.map(p => `${p.id}:${p.qty}:${p.buyPrice || 0}`).join('\n')

        // Determine Brand from Producer if not manually set
        const producerContact = contactos.find(c => c.id === form.productor)
        const finalBrand = form.brand || producerContact?.brand || ''

        // Map User Name to Email
        let finalUserEmail = form.userId
        if (!finalUserEmail.includes('@')) {
            finalUserEmail = USER_EMAIL_MAP_REQ[form.userId] || form.userId
        }

        // Prepare payload matching OperationInput
        const payload = {
            ...form,
            estado: 'Operación cargada',
            brand: finalBrand,
            // products array for the engine (structured)
            products: productItems.map(p => ({
                id: p.id,
                qty: p.qty,
                price: p.price,
                // Add details from library
                ...productosLib.find(lib => lib.id === p.id)
            })),
            // raw string for sheet column compatibility
            products_raw: productosRaw,
            purchase_prices_raw: purchasePricesRaw,

            // Map form fields to API expected fields
            import_id: form.cliente,
            export_id: form.exportador,
            producer_id: form.productor,
            user_id: finalUserEmail,
            port_dest: form.puertoDestino,
            port_load: form.portLoad,
            ship_date: form.fechaEmbarque,
            ship_lane: "To be confirmed", // User said if empty use this. We don't have input yet so always this.
            payment_terms: form.paymentTerms.trim(),
            incoterm: form.incoterm.trim(),

            // New Freight Fields mapping (if needed explicitly, though ...form spreads them)
            booking: form.booking,
            forwarder: form.forwarder,
            freight_value: form.freightValue ? parseFloat(form.freightValue) : undefined, // Ensure number if backend expects it, or keep string
            container_number: form.containerNumber,
            arrival_date: form.arrivalDate,
            preCarriage: form.preCarriage || '',
            onCarriage: form.onCarriage || ''
        }

        console.log('PAYLOAD DEBUG:', payload)

        try {
            // Call the Proforma Generation Endpoint (which handles Sheet creation)
            const res = await fetch('/api/operaciones/proforma', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const result = await res.json()

            if (res.ok && result.success) {
                setIsDirty(false) // Reset dirty state on success
                // If a new brand was typed, add it to the producer's brand list
                if (form.brand && form.productor) {
                    const producerContact = contactos.find(c => c.id === form.productor)
                    const existingBrands = producerContact?.brand
                        ? producerContact.brand.split(',').map(b => b.trim()).filter(Boolean)
                        : []
                    if (form.brand && !existingBrands.includes(form.brand)) {
                        const updatedBrands = [...existingBrands, form.brand].join(', ')
                        try {
                            await fetch('/api/contactos/update-brand', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ contactId: form.productor, brand: updatedBrands })
                            })
                        } catch (brandErr) {
                            console.warn('Could not update brand for producer:', brandErr)
                        }
                    }
                }
                setSuccessData(result.data)
                // Modal will appear
            } else {
                showToast(`Error: ${result.error || 'Hubo un error al crear la operación'}`, 'error')
            }
        } catch (error) {
            console.error(error)
            showToast('Error de conexión', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const handleSendEmail = async () => {
        // Placeholder
        setSendingEmail(false)
    }

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-primary space-y-4">
            <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin" />
            <p className="animate-pulse font-medium">Cargando datos maestros...</p>
        </div>
    )

    return (
        <div className="animate-in">
            {/* Header */}
            <div className="page-header">
                <div className="flex items-center gap-[var(--space-4)]">
                    <Link href="/" className="btn btn-secondary p-2">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="page-title">Nueva Operación</h1>
                        <p className="page-subtitle">Registrar nueva carga en Master Input</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="card p-[var(--space-8)]">
                <div className="grid-cols-op-detail">
                    {/* COLUMNA 1: TRADING Y CONTACTOS */}
                    <div className="flex flex-col gap-[var(--space-6)]">
                        {/* SECCIÓN 1: RESPONSABLE Y TRADING */}
                        <div className="card !bg-[var(--surface-raised)] !p-[var(--space-6)]">
                            <h3 className="text-[var(--font-size-lg)] mb-[var(--space-4)] flex items-center gap-3">
                                <User size={24} color="var(--accent)" />
                                <span>Responsable y Trading</span>
                            </h3>

                            <div className="flex flex-col gap-[var(--space-4)]">
                                <div className="input-group">
                                    <label className="input-label">Responsable (User) *</label>
                                    <SearchableSelect
                                        options={responsableOptions}
                                        value={form.userId}
                                        onChange={v => handleFormChange({ userId: v })}
                                        placeholder="Seleccionar Responsable..."
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Trading Company *</label>
                                    <SearchableSelect
                                        options={tradingOptions}
                                        value={form.trading}
                                        onChange={v => handleFormChange({ trading: v })}
                                        placeholder="Seleccionar Trading..."
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 2: DETALLES COMERCIALES */}
                        <div className="card !bg-[var(--surface-raised)] !p-[var(--space-6)]">
                            <h3 className="text-[var(--font-size-lg)] mb-[var(--space-4)] flex items-center gap-3">
                                <Briefcase size={24} color="var(--accent)" />
                                <span>Detalles Comerciales</span>
                            </h3>

                            <div className="flex flex-col gap-[var(--space-4)]">
                                <div className="input-group">
                                    <label className="input-label flex justify-between items-center">
                                        <span>Importador (Cliente) *</span>
                                        <button
                                            type="button"
                                            onClick={() => setIsImporterModalOpen(true)}
                                            className="bg-transparent border-none text-[var(--accent)] cursor-pointer text-[11px] flex items-center gap-1 hover:underline"
                                            title="Crear nuevo importador"
                                        >
                                            <Plus size={12} /> Nuevo
                                        </button>
                                    </label>
                                    <SearchableSelect
                                        options={getOptions(c => c.isImporter === true)}
                                        value={form.cliente}
                                        onChange={v => handleFormChange({ cliente: v })}
                                        placeholder="Buscar Importador..."
                                        onAddNew={() => setIsImporterModalOpen(true)}
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label flex justify-between items-center">
                                        <span>Exportador *</span>
                                        <button
                                            type="button"
                                            onClick={() => setIsExporterModalOpen(true)}
                                            className="bg-transparent border-none text-[var(--accent)] cursor-pointer text-[11px] flex items-center gap-1 hover:underline"
                                            title="Crear nuevo exportador"
                                        >
                                            <Plus size={12} /> Nuevo
                                        </button>
                                    </label>
                                    <SearchableSelect
                                        options={getOptions(c => c.isExporter === true)}
                                        value={form.exportador}
                                        onChange={v => handleFormChange({ exportador: v })}
                                        placeholder="Buscar Exportador..."
                                        onAddNew={() => setIsExporterModalOpen(true)}
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label flex justify-between items-center">
                                        <span>Productor</span>
                                        <button
                                            type="button"
                                            onClick={() => setIsProducerModalOpen(true)}
                                            className="bg-transparent border-none text-[var(--accent)] cursor-pointer text-[11px] flex items-center gap-1 hover:underline"
                                            title="Crear nuevo productor"
                                        >
                                            <Plus size={12} /> Nuevo
                                        </button>
                                    </label>
                                    <SearchableSelect
                                        options={getOptions(c => c.isProducer === true)}
                                        value={form.productor}
                                        onChange={v => {
                                            const producer = contactos.find(c => c.id === v)
                                            const brands = producer?.brand
                                                ? producer.brand.split(',').map(b => b.trim()).filter(Boolean)
                                                : []
                                            // Auto-select if only one brand, else clear for user to pick
                                            handleFormChange({ productor: v, brand: brands.length === 1 ? brands[0] : '' })
                                        }}
                                        placeholder="Buscar Productor..."
                                        onAddNew={() => setIsProducerModalOpen(true)}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Brand</label>
                                    {/* Show brand chips if producer has brands */}
                                    {(() => {
                                        const producer = contactos.find(c => c.id === form.productor)
                                        const brands = producer?.brand
                                            ? producer.brand.split(',').map(b => b.trim()).filter(Boolean)
                                            : []
                                        return brands.length > 1 ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                                                {brands.map(b => (
                                                    <button
                                                        key={b}
                                                        type="button"
                                                        onClick={() => setForm({ ...form, brand: b })}
                                                        style={{
                                                            padding: '4px 12px',
                                                            borderRadius: '999px',
                                                            border: `1px solid ${form.brand === b ? 'var(--accent)' : 'var(--border)'}`,
                                                            background: form.brand === b ? 'var(--accent-soft)' : 'var(--surface)',
                                                            color: form.brand === b ? 'var(--accent)' : 'var(--text-muted)',
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer'
                                                        }}
                                                    >{b}</button>
                                                ))}
                                            </div>
                                        ) : null
                                    })()}
                                    <input
                                        type="text"
                                        className="input"
                                        value={form.brand}
                                        onChange={e => handleFormChange({ brand: e.target.value })}
                                        placeholder="Brand del productor"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA 2: LOGÍSTICA */}
                    <div className="flex flex-col gap-[var(--space-6)]">
                        {/* SECCIÓN 3: LOGÍSTICA DE EMBARQUE */}
                        <div className="card !bg-[var(--surface-raised)] !p-[var(--space-8)]">
                            <h3 className="text-[var(--font-size-lg)] mb-[var(--space-4)] flex items-center gap-3">
                                <Anchor size={24} color="var(--accent)" />
                                <span>Logística de Embarque y Flete</span>
                            </h3>

                            <div className="grid grid-cols-2 gap-[var(--space-4)]">
                                <PortAutocomplete
                                    label="Puerto de Carga (POL)"
                                    value={form.portLoad}
                                    onChange={v => handleFormChange({ portLoad: v })}
                                    placeholder="Ej: Barcelona, Spain"
                                />
                                <PortAutocomplete
                                    label="Puerto de Destino (POD)"
                                    value={form.puertoDestino}
                                    onChange={v => handleFormChange({ puertoDestino: v })}
                                    placeholder="Ej: New York, USA"
                                />

                                {/* Pre-Carriage (antes del barco) */}
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <div style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '12px 14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: form.preCarriage !== undefined && form.preCarriage !== '' ? '12px' : '0' }}>
                                            <input
                                                type="checkbox"
                                                id="preCarriage-toggle"
                                                checked={form.preCarriage !== ''}
                                                onChange={e => handleFormChange({ preCarriage: e.target.checked ? '|Camión' : '' })}
                                                style={{ width: 16, height: 16, flexShrink: 0, cursor: 'pointer', accentColor: 'var(--accent)' }}
                                            />
                                            <label htmlFor="preCarriage-toggle" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', cursor: 'pointer', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: 'var(--text)', fontWeight: 700, letterSpacing: '0.01em' }}>Pre-Carriage <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>transporte antes del barco</span></span>
                                                {form.preCarriage !== '' && (
                                                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Desde origen hasta {form.portLoad || 'POL'}</span>
                                                )}
                                            </label>
                                        </div>
                                        {form.preCarriage !== '' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'end' }}>
                                                <div style={{ margin: 0 }}>
                                                    <PortAutocomplete
                                                        label="Lugar de Origen"
                                                        value={form.preCarriage.split('|')[0]}
                                                        onChange={v => handleFormChange({ preCarriage: `${v}|${form.preCarriage.split('|')[1] || 'Camión'}` })}
                                                        placeholder="Ej: Mendoza, Argentina"
                                                    />
                                                </div>
                                                <div className="input-group" style={{ margin: 0, width: '140px' }}>
                                                    <label className="input-label">Modo</label>
                                                    <select
                                                        className="input"
                                                        value={form.preCarriage.split('|')[1] || 'Camión'}
                                                        onChange={e => handleFormChange({ preCarriage: `${form.preCarriage.split('|')[0]}|${e.target.value}` })}
                                                    >
                                                        <option>Camión</option>
                                                        <option>Tren</option>
                                                        <option>Barco</option>
                                                        <option>Avión</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* On-Carriage (después del barco) */}
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <div style={{ background: 'var(--surface-raised)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '12px 14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: form.onCarriage !== '' ? '12px' : '0' }}>
                                            <input
                                                type="checkbox"
                                                id="onCarriage-toggle"
                                                checked={form.onCarriage !== ''}
                                                onChange={e => handleFormChange({ onCarriage: e.target.checked ? '|Camión' : '' })}
                                                style={{ width: 16, height: 16, flexShrink: 0, cursor: 'pointer', accentColor: 'var(--accent)' }}
                                            />
                                            <label htmlFor="onCarriage-toggle" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', cursor: 'pointer', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: 'var(--text)', fontWeight: 700, letterSpacing: '0.01em' }}>On-Carriage <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>transporte después del barco</span></span>
                                                {form.onCarriage !== '' && (
                                                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Desde {form.puertoDestino || 'POD'} hasta destino final</span>
                                                )}
                                            </label>
                                        </div>
                                        {form.onCarriage !== '' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'end' }}>
                                                <div style={{ margin: 0 }}>
                                                    <PortAutocomplete
                                                        label="Destino Final"
                                                        value={form.onCarriage.split('|')[0]}
                                                        onChange={v => handleFormChange({ onCarriage: `${v}|${form.onCarriage.split('|')[1] || 'Camión'}` })}
                                                        placeholder="Ej: Chicago, USA"
                                                    />
                                                </div>
                                                <div className="input-group" style={{ margin: 0, width: '140px' }}>
                                                    <label className="input-label">Modo</label>
                                                    <select
                                                        className="input"
                                                        value={form.onCarriage.split('|')[1] || 'Camión'}
                                                        onChange={e => handleFormChange({ onCarriage: `${form.onCarriage.split('|')[0]}|${e.target.value}` })}
                                                    >
                                                        <option>Camión</option>
                                                        <option>Tren</option>
                                                        <option>Barco</option>
                                                        <option>Avión</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Booking */}
                                <div className="input-group">
                                    <label className="input-label">Booking</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={form.booking}
                                        onChange={e => handleFormChange({ booking: e.target.value })}
                                        placeholder="Ej: MSC12345678"
                                    />
                                </div>

                                {/* Forwarder */}
                                <div className="input-group">
                                    <label className="input-label flex justify-between">
                                        <span>Forwarder</span>
                                        <button
                                            type="button"
                                            onClick={() => setIsForwarderModalOpen(true)}
                                            className="bg-transparent border-none text-[var(--accent)] cursor-pointer text-[11px] flex items-center gap-1"
                                        >
                                            <Plus size={12} /> Nuevo Forwarder
                                        </button>
                                    </label>
                                    <SearchableSelect
                                        options={forwarderOptions}
                                        value={form.forwarder}
                                        onChange={v => handleFormChange({ forwarder: v })}
                                        placeholder="Buscar Forwarder..."
                                        onAddNew={() => setIsForwarderModalOpen(true)}
                                    />
                                </div>

                                {/* Container */}
                                <div className="input-group">
                                    <label className="input-label">Container Number</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={form.containerNumber}
                                        onChange={e => handleFormChange({ containerNumber: e.target.value.replace(/\s/g, '').toUpperCase() })}
                                        placeholder="Ej: ABCD1234567"
                                        style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                    />
                                </div>

                                {/* Incoterm */}
                                <div className="input-group">
                                    <label className="input-label">Incoterm</label>
                                    <select
                                        className="input"
                                        value={INCOTERMS_OPTIONS.filter(opt => opt !== 'Otros').includes(form.incoterm) ? form.incoterm : (form.incoterm === '' ? '' : 'Otros')}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val === 'Otros') {
                                                handleFormChange({ incoterm: ' ' });
                                            } else {
                                                handleFormChange({ incoterm: val });
                                            }
                                        }}
                                    >
                                        <option value="">Seleccionar Incoterm...</option>
                                        {INCOTERMS_OPTIONS.filter(opt => opt !== 'Otros').map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                        <option value="Otros">Otros (Especificar abajo)</option>
                                    </select>
                                </div>

                                {/* Freight Value */}
                                <div className="input-group">
                                    <label className="input-label">Valor Flete (Freight Value)</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>$</span>
                                        <input
                                            type="number"
                                            className="input"
                                            style={{ paddingLeft: '24px' }}
                                            value={form.freightValue}
                                            onChange={e => handleFormChange({ freightValue: e.target.value })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {/* Payment Terms */}
                                <div className="input-group">
                                    <label className="input-label">Payment Terms</label>
                                    <select
                                        className="input"
                                        value={PAYMENT_TERMS_OPTIONS.filter(opt => opt !== 'Otros').includes(form.paymentTerms) ? form.paymentTerms : (form.paymentTerms === '' ? '' : 'Otros')}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val === 'Otros') {
                                                handleFormChange({ paymentTerms: ' ' });
                                            } else {
                                                handleFormChange({ paymentTerms: val });
                                            }
                                        }}
                                    >
                                        <option value="">Seleccionar condiciones...</option>
                                        {PAYMENT_TERMS_OPTIONS.filter(opt => opt !== 'Otros').map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                        <option value="Otros">Otros (Especificar abajo)</option>
                                    </select>
                                </div>

                                {/* DATES SECTION */}
                                <div className="col-span-2 grid grid-cols-2 gap-[var(--space-4)] mt-[var(--space-2)]">
                                    <div className="input-group">
                                        <label className="input-label">Ship Date (ETD)</label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={form.fechaEmbarque}
                                            onChange={e => handleFormChange({ fechaEmbarque: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Arrival (ETA)</label>
                                        <input
                                            type="date"
                                            className="input"
                                            value={form.arrivalDate}
                                            onChange={e => handleFormChange({ arrivalDate: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* MAP VISUALIZATION */}
                                <div className="col-span-2 mt-[var(--space-4)]">
                                    <MapComponent
                                        portLoad={form.portLoad}
                                        portDest={form.puertoDestino}
                                        etd={form.fechaEmbarque}
                                        eta={form.arrivalDate}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>



                <hr className="border-none border-t border-[var(--border)] my-[var(--space-6)]" />

                {/* SECCIÓN 5: PRODUCTOS */}
                <h3 className="text-[var(--font-size-lg)] mb-[var(--space-4)] flex items-center gap-3">
                    <Globe size={24} color="var(--accent)" />
                    <span>Productos</span>
                </h3>

                <div className="flex flex-col gap-[var(--space-4)]">
                    {productItems.map((item, idx) => (
                        <div
                            key={idx}
                            className="card relative !p-[var(--space-6)] bg-[var(--surface-raised)] border border-[var(--border)]"
                        >
                            {/* Delete Button - Top Right */}
                            <button
                                type="button"
                                onClick={() => removeProduct(idx)}
                                className="btn-icon absolute top-[var(--space-3)] right-[var(--space-3)] text-[var(--red)] p-1.5"
                                title="Eliminar producto"
                            >
                                <Trash2 size={16} />
                            </button>

                            {/* Product ID - Full Width */}
                            <div className="input-group mb-[var(--space-4)]">
                                <label className="input-label">Producto (ID o Nombre)</label>
                                <SearchableSelect
                                    options={productOptions}
                                    value={item.id}
                                    onChange={v => updateProduct(idx, 'id', v)}
                                    placeholder="Buscar Producto..."
                                    onAddNew={() => {
                                        setActiveProductIndex(idx)
                                        setIsProductModalOpen(true)
                                    }}
                                />
                            </div>

                            {/* Quantity and Prices - 3 Columns */}
                            <div className="grid grid-cols-3 gap-[var(--space-4)]">
                                <div className="input-group">
                                    <label className="input-label">Cantidad</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={item.qty}
                                        onChange={e => updateProduct(idx, 'qty', parseFloat(e.target.value))}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label" style={{ color: 'var(--blue)' }}>
                                        Precio de Compra
                                    </label>
                                    <input
                                        type="number"
                                        className="input"
                                        style={{
                                            borderColor: 'var(--blue)',
                                            background: 'rgba(59, 130, 246, 0.05)'
                                        }}
                                        value={item.buyPrice ?? ''}
                                        onChange={e => updateProduct(idx, 'buyPrice', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        placeholder="0.00"
                                        step="0.01"
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Precio de Venta</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={item.price ?? ''}
                                        onChange={e => updateProduct(idx, 'price', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        placeholder="0.00"
                                        step="0.01"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Add Product Button - Bottom */}
                    <button
                        type="button"
                        onClick={addProduct}
                        className="btn btn-secondary w-full flex items-center justify-center gap-[var(--space-2)] p-[var(--space-3)]"
                    >
                        <Plus size={18} />
                        Agregar Producto
                    </button>
                </div>

                <hr className="border-none border-t border-[var(--border)] my-[var(--space-6)]" />

                {/* SECCIÓN 4: NOTAS */}
                <h3 className="text-[var(--font-size-lg)] mb-[var(--space-4)] flex items-center gap-3">
                    <FileText size={24} color="var(--accent)" />
                    <span>Notas</span>
                </h3>

                <div className="input-group">
                    <label className="input-label">Notas Adicionales</label>
                    <div className="flex gap-[var(--space-2)] mb-[var(--space-2)]">
                        <button
                            type="button"
                            onClick={handleNotesBlur} // Changed from handleTranslate to handleNotesBlur
                            disabled={translating || !form.notas}
                            className="btn btn-secondary btn-small text-[var(--font-size-sm)]"
                        >
                            {translating ? 'Traduciendo...' : '🌐 Traducir a inglés'}
                        </button>
                    </div>
                    <textarea
                        className="input resize-y min-h-[100px]"
                        value={form.notas}
                        onChange={e => setForm({ ...form, notas: e.target.value })}
                        placeholder="Información adicional sobre la operación..."
                        rows={4}
                    />
                </div>

                <hr className="border-none border-t border-[var(--border)] my-[var(--space-6)]" />

                {/* SUBMIT BUTTONS */}
                <div className="flex gap-[var(--space-3)] mt-[var(--space-4)]">
                    <Link href="/" className="btn btn-secondary flex-1 justify-center">
                        Cancelar
                    </Link>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="btn btn-primary flex-[2] justify-center"
                    >
                        {submitting ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="spinner" />
                                Creando Operación...
                            </span>
                        ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Save size={18} />
                                Crear Operación
                            </span>
                        )}
                    </button>
                </div>
            </form >

            {/* SUCCESS MODAL */}
            {
                successData && (
                    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[9999] backdrop-blur-sm p-5 animate-in fade-in duration-200">
                        <div className="card w-full max-w-[600px] !p-0 border border-[var(--accent)] shadow-[0_0_50px_rgba(59,130,246,0.2)]">
                            <div className="p-[var(--space-6)] text-center border-b border-[var(--border)] bg-[var(--surface-raised)]">
                                <div className="w-[60px] h-[60px] bg-[rgba(16,185,129,0.1)] text-[#10b981] rounded-full flex items-center justify-center mx-auto mb-[var(--space-4)]">
                                    <FileText size={32} />
                                </div>
                                <h2 className="text-2xl font-extrabold text-white mb-2">Operación Creada con Éxito</h2>
                                <p className="text-[var(--text-muted)]">ID: <span className="text-[var(--accent)] font-mono">{successData.id_carga}</span></p>
                            </div>

                            <div className="p-[var(--space-6)] flex flex-col gap-[var(--space-4)]">

                                <div className="grid grid-cols-2 gap-[var(--space-4)]">
                                    <div>
                                        <label className="text-[11px] text-[var(--text-dim)] uppercase">IMP (Importador)</label>
                                        <div className="font-semibold">
                                            {contactos.find(c => c.id === form.cliente)?.empresa || form.cliente}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-[var(--text-dim)] uppercase">EXP (Exportador)</label>
                                        <div className="font-semibold">
                                            {contactos.find(c => c.id === form.exportador)?.empresa || form.exportador}
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[11px] text-[var(--text-dim)] uppercase">PROD (Productor)</label>
                                        <div className="font-semibold">
                                            {contactos.find(c => c.id === form.productor)?.empresa || form.productor}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[var(--surface-raised)] p-[var(--space-3)] rounded-[var(--radius-md)] flex items-center gap-[var(--space-3)]">
                                    <div className="flex-1">
                                        <label className="text-[10px] text-[var(--text-dim)]">POL</label>
                                        <div className="text-[13px]">{form.portLoad || '-'}</div>
                                    </div>
                                    <ArrowLeft size={16} className="rotate-180 text-[var(--accent)]" />
                                    <div className="flex-1 text-right">
                                        <label className="text-[10px] text-[var(--text-dim)]">POD</label>
                                        <div className="text-[13px]">{form.puertoDestino || '-'}</div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[11px] text-[var(--text-dim)] uppercase mb-2 block">Productos</label>
                                    <div className="border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden">
                                        {productItems.map((p, i) => (
                                            <div key={i} className={`flex justify-between p-2 px-3 text-[13px] ${i === productItems.length - 1 ? 'border-none' : 'border-b border-[var(--border)]'} ${i % 2 === 0 ? 'bg-[rgba(255,255,255,0.02)]' : 'bg-transparent'}`}>
                                                <span>
                                                    <span className="text-[var(--accent)] font-semibold">{p.id}</span>
                                                    <span className="text-[var(--text-muted)] ml-2">
                                                        {productosLib.find(lib => lib.id === p.id)?.especie || ''}
                                                    </span>
                                                </span>
                                                <span className="font-mono">{p.qty}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>

                            <div className="p-[var(--space-4)] px-[var(--space-6)] border-t border-[var(--border)] text-center flex flex-col gap-3">
                                <Link
                                    href={`/operaciones/${successData.id_carga}`}
                                    className="btn btn-primary w-full justify-center p-3"
                                >
                                    Ver Detalle de Operación
                                </Link>
                                <Link
                                    href="/"
                                    className="btn btn-secondary w-full justify-center p-3"
                                >
                                    Volver al Dashboard
                                </Link>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* IMPORTER MODAL */}
            {
                isImporterModalOpen && (
                    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[9999] backdrop-blur-sm p-8 animate-in fade-in duration-200">
                        <div className="w-full max-w-[900px] max-h-[90vh] overflow-y-auto bg-transparent">
                            <ContactForm
                                initialData={{ tipo: 'Importador', isImporter: true, empresa: '' } as any}
                                onSubmit={(data) => handleCreateContact(data, 'importer')}
                                onSuccess={() => setIsImporterModalOpen(false)}
                            />
                        </div>
                    </div>
                )
            }

            {/* EXPORTER MODAL */}
            {
                isExporterModalOpen && (
                    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[9999] backdrop-blur-sm p-8 animate-in fade-in duration-200">
                        <div className="w-full max-w-[900px] max-h-[90vh] overflow-y-auto bg-transparent">
                            <ContactForm
                                initialData={{ tipo: 'Exportador', isExporter: true, empresa: '' } as any}
                                onSubmit={(data) => handleCreateContact(data, 'exporter')}
                                onSuccess={() => setIsExporterModalOpen(false)}
                            />
                        </div>
                    </div>
                )
            }

            {/* PRODUCER MODAL */}
            {
                isProducerModalOpen && (
                    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[9999] backdrop-blur-sm p-8 animate-in fade-in duration-200">
                        <div className="w-full max-w-[900px] max-h-[90vh] overflow-y-auto bg-transparent">
                            <ContactForm
                                initialData={{ tipo: 'Productor', isProducer: true, empresa: '' } as any}
                                onSubmit={(data) => handleCreateContact(data, 'producer')}
                                onSuccess={() => setIsProducerModalOpen(false)}
                            />
                        </div>
                    </div>
                )
            }

            {/* FORWARDER MODAL */}
            {
                isForwarderModalOpen && (
                    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[9999] backdrop-blur-sm p-8 animate-in fade-in duration-200">
                        <div className="w-full max-w-[900px] max-h-[90vh] overflow-y-auto bg-transparent">
                            <ContactForm
                                initialData={{ tipo: 'Forwarder', isForwarder: true, empresa: '' } as any}
                                onSubmit={(data) => handleCreateContact(data, 'forwarder')}
                                onSuccess={() => setIsForwarderModalOpen(false)}
                            />
                        </div>
                    </div>
                )
            }

            {/* PRODUCT MODAL */}
            {
                isProductModalOpen && (
                    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[9999] backdrop-blur-sm p-8 animate-in fade-in duration-200">
                        <div className="card w-full max-w-[700px] max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold">Agregar Nuevo Producto</h2>
                                <button onClick={() => setIsProductModalOpen(false)} className="icon-btn">
                                    <Plus size={24} className="rotate-45" />
                                </button>
                            </div>
                            <ProductForm
                                onSubmit={handleCreateProduct}
                                onCancel={() => setIsProductModalOpen(false)}
                            />
                        </div>
                    </div>
                )
            }
        </div >
    )
}

export default function NuevaOperacionPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Cargando formulario...</div>}>
            <NuevaOperacionContent />
        </Suspense>
    )
}
