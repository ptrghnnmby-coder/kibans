export type EstadoOperacion =
    | '1. Operación Creada'
    | '2. Proforma Enviada'
    | '3. Proforma Aprobada'
    | '4. Orden de Compra Emitida'
    | '5. Producción / Preparación'
    | '6. Flete en Gestión'
    | '7. Booking Confirmado'
    | '8. Carga Realizada'
    | '9. En Tránsito'
    | '10. Arribada'
    | '11. En Revisión de Recepción'
    | '12A. Recepción Conforme'
    | '12B. Reclamo Reportado'
    | '13. Liquidación en Proceso'
    | '14. Operación Liquidada'
    | 'Cancelada';

export interface Operacion {
    row_number?: string | number
    id?: string
    estado: EstadoOperacion
    cliente: string
    exportador: string
    productor?: string
    fechaEmbarque?: string
    puertoDestino?: string
    productos?: string
    notas?: string
    brand?: string
    portLoad?: string
    preCarriage?: string   // Pre-carriage before Port of Loading (e.g. "Mendoza, Argentina|Camión")
    onCarriage?: string    // On-carriage after Port of Destination (e.g. "Chicago, USA|Camión")
    incoterm?: string
    shipLane?: string
    trading?: string
    paymentTerms?: string
    idDocumento?: string
    ocId?: string
    notifyId?: string
    billToId?: string
    consigneeId?: string
    nombreCarpeta?: string
    idCarpeta?: string
    piNumber?: string
    userId?: string
    timestamp?: string
    ocIdDocumento?: string
    purchasePricesRaw?: string
    notesOc?: string
    // Container tracking fields
    containerNumber?: string
    trackingStatus?: 'IN_TRANSIT' | 'ARRIVED' | 'DELAYED' | 'DEPARTED' | 'LOADING' | 'EMPTY' | 'UNKNOWN'
    trackingLastUpdated?: string
    // Freight details
    booking?: string
    forwarder?: string
    freightValue?: string
    freightTxId?: string
    arrivalDate?: string
    flete?: string
    estadoPi?: string
    bookingDocId?: string
    invoiceDocId?: string       // Original Invoice ID
    invoiceNumber?: string      // Original Invoice Number (e.g. SW40-081-26)
    invoiceNotes?: string       // Original Invoice Notes
    salePriceReal?: string      // Sale Price Real (id:qty:price per line)
    purchasePricesReal?: string // Purchase_Prices_Real (id:qty:price per line)
    // Financial Fields (Aliases or direct headers)
    etd?: string
    eta?: string
    fobGranTotal?: string
    totalPurchase?: string
    totalFOB?: string
    isArchived?: boolean
    lastUpdatedBy?: string
    // New fields for Freight Module
    seguro_estado?: 'Forwarder' | 'External' | 'None'
    instrucciones_frio?: string
    hsCode?: string
    drains?: 'OPEN' | 'CLOSED'
    humidity?: string
    ventilation?: string
    notasProforma?: string
    loadedDate?: string
}

export interface Producto {
    id: string
    especie: string
    corte?: string
    calibre?: string
    packing?: string
    tamanoCaja?: string
    nombreCientifico?: string
    origen?: string
    descripcion?: string
    hsCode?: string
    defaultTemp?: string
    defaultVent?: string
    defaultDrains?: string
    defaultHumidity?: string
}

export interface Flete {
    id_operacion: string
    forwarder: string
    monto: number
    moneda: string
    seguro: 'SI' | 'NO'
    temp: string
    validez: string
    estado: 'Pendiente' | 'Seleccionado' | 'Rechazado'
}

export interface Contacto {
    id: string
    tipo: 'Importador' | 'Exportador' | 'Productor' | 'NBC' | 'Forwarder' | 'Desconocido'
    empresa: string
    nombreContacto: string
    apellido: string
    direccion: string
    pais: string
    telefono: string
    email: string
    taxId?: string
    nPlanta?: string
    brand?: string
    fda?: string
    isImporter?: boolean
    isExporter?: boolean
    isProducer?: boolean
    notes?: string
    description?: string
    idioma?: string // Keep for internal logic
    // PO Roles
    isBillTo?: boolean
    isConsignee?: boolean
    isNotify?: boolean
    isForwarder?: boolean
    isProspecto?: boolean
}

export const USER_MAP: Record<string, { name: string, role: string, initial: string, avatar?: string, color?: string, phone?: string }> = {
    'rdm@southmarinetrading.com': { name: 'Rafa', role: 'Responsable', initial: 'R', color: 'var(--cyan)' },
    'fdm@southmarinetrading.com': { name: 'Fede', role: 'Responsable', initial: 'F', color: 'var(--purple)' },
    'gdm@southmarinetrading.com': { name: 'Guillermo', role: 'Responsable', initial: 'B', color: 'var(--orange)' },
    'gf@southmarinetrading.com': { name: 'Gonza', initial: 'G', role: 'Responsable', color: 'var(--amber)' },
    'hm@southmarinetrading.com': { name: 'Hernan', initial: 'H', role: 'Admin', color: 'var(--green)' },
    'admin@southmarinetrading.com': { name: 'Manuela', initial: 'M', role: 'Admin', color: 'var(--red)' },
    'info@southmarinetrading.com': { name: 'Info', initial: 'I', role: 'Admin', color: 'var(--accent)' },
    'demo@southmarinetrading.com': { name: 'DEMO', initial: 'D', role: 'Admin', color: 'var(--accent)', phone: '+1234567890' },
}


export const PAYMENT_TERMS_OPTIONS = [
    '100% Cash Against Documents (CAD)',
    '30% Advance Payment, 70% Cash Against Documents (CAD)',
    '20% Advance Payment, 80% Cash Against Documents (CAD)',
    '100% Cash Against Copy of Documents',
    '100% After Border Release',
    'Otros'
]

export const INCOTERMS_OPTIONS = [
    'FCA',
    'CFR',
    'FOB',
    'CIF',
    'DDP',
    'DAP',
    'CPT',
    'CIP',
    'EXW',
    'Otros'
]

export const getResponsableName = (email?: string) => {
    if (!email) return 'Desconocido'
    const normalized = email.toLowerCase().trim()
    return USER_MAP[normalized]?.name || email.split('@')[0]
}

/**
 * Centrally calculates the folder name based on operation data.
 * Format: ID / Importer / Exporter / Producer / Dest / Responsible Initial
 */
export function calculateFolderName(op: Partial<Operacion>): string {
    const userKey = (op.userId || '').split('@')[0].toLowerCase()
    const userInfo = (USER_MAP as any)[op.userId || ''] || (USER_MAP as any)[userKey]
    const initial = userInfo?.initial || '?'

    const parts = [
        op.id || '???',
        op.cliente || 'Smt',
        op.exportador || 'Exp',
        op.productor || 'Prod',
        op.puertoDestino || 'Dest',
        initial
    ]

    return parts.join(' / ')
}

export interface Note {
    id: string
    content: string
    author: string
    timestamp: string
    type: 'info' | 'alert' | 'success' | 'warning'
    mentions?: string[]
    operationId?: string
    dismissedBy?: string[]
    activeFor?: string[]
    productId?: string
    contactId?: string
}

export interface AgendaItem {
    id: string
    date: string
    time?: string
    title: string
    type: 'TASK' | 'MEETING' | 'PAYMENT' | 'COLLECTION'
    status: 'PENDING' | 'DONE' | 'PAGADO' | 'COBRADO'
    creator: string
    assignedTo?: string
    amount?: number
    operationId?: string
    productId?: string
    contactId?: string
}

export interface CashFlowTransaction {
    id: string
    operationId: string
    date: string // YYYY-MM-DD
    type: 'INGRESO' | 'EGRESO' | 'INFORMATIVO'
    category: string // e.g. "Venta", "Flete", "Adelanto"
    description: string
    amount: number
    status: 'PENDIENTE' | 'PAGADO'
    dueDate?: string // YYYY-MM-DD
    timestamp: string
}

export interface GastoGeneral {
    id: string
    date: string // YYYY-MM-DD
    responsable: string // email
    category: string // e.g. Sueldos, Equipamiento, Alquiler, Varios
    description: string
    amount: number
    timestamp: string
}

export interface Claim {
    id: string
    operationId: string
    cliente: string
    producto: string
    tipo: string
    fechaReporte: string
    responsable: string
    descripcion: string
    evidencia: string
    impactoEstimado: number
    resolucionPropuesta: string
    impactoFinal: number
    estado: string
    fechaCierre?: string
    timestamp: string
}

export type LeadStatus = 'Nuevo' | 'Contactado' | 'Calificado' | 'Propuesta' | 'Ganado' | 'Perdido';

export interface Lead {
    id: string;
    nombre: string;
    empresa: string;
    email: string;
    telefono?: string;
    pais?: string;
    fuente?: string;
    estado: LeadStatus;
    notas?: string;
    responsable?: string;
    fechaCreacion: string;
    ultimaInteraccion?: string;
    interes?: string;
    contactId?: string;
    timestamp?: string;
}
export interface QCInspection {
    id: string; // ej: QC-[OP]-[FECHA]
    operationId: string;
    fechaProgramada: string;
    responsable: string;
    estado: 'Pendiente' | 'En Proceso' | 'Completado';
    notas: string;
    rutaCarpetaDrive: string; // Ruta textual
    idCarpetaDrive?: string;  // ID real de Google Drive
    tipoInspeccion?: string;
    timestamp?: string;
}

export interface TeamMessage {
    id: string;
    from: string; // User email or 'marta@bot'
    to: string;   // Recipient email or 'group@southmarine'
    content: string;
    timestamp: string;
}


