import { Operacion, Contacto, Note, CashFlowTransaction, TeamMessage, Flete } from './sheets-types'

export const MOCK_FLETES: Flete[] = [
    {
        id_operacion: '25-0004',
        forwarder: 'MSC LOGISTICS',
        tarifa: 1850.00,
        validez: '2025-04-30',
        free_days: 14,
        observaciones: 'Incluye THC en origen',
        estado: 'Pendiente',
        fecha_solicitud: '2025-03-01T10:00:00Z',
        fecha_actualizacion: '2025-03-02T10:00:00Z'
    },
    {
        id_operacion: '25-0004',
        forwarder: 'HAPAG LLOYD',
        tarifa: 1900.00,
        validez: '2025-04-15',
        free_days: 21,
        observaciones: 'Ruta directa, menor Transit Time',
        estado: 'Aprobado',
        fecha_solicitud: '2025-03-01T11:00:00Z',
        fecha_actualizacion: '2025-03-05T09:00:00Z'
    },
    {
        id_operacion: '25-0009',
        forwarder: 'CMA CGM',
        tarifa: 2200.00,
        validez: '2025-05-10',
        free_days: 10,
        observaciones: 'Sujeto a confirmación de espacio',
        estado: 'Pendiente',
        fecha_solicitud: '2025-03-10T14:00:00Z',
        fecha_actualizacion: '2025-03-11T16:00:00Z'
    }
]

export const MOCK_TEAM_MESSAGES: TeamMessage[] = [
    {
        id: 'msg-demo-1',
        from: 'marta@bot',
        to: 'demo@southmarinetrading.com',
        content: 'Hi! I am Marta 🤖, your AI assistant. I am currently running in **Demo Mode**.\n\nYou can ask me about these demo operations, for example:\n- "What is the status of operation 25-0001?"\n- "Do we have any pending payments?"\n- "Show me info about GLOBAL FRUITS".',
        timestamp: new Date().toISOString()
    },
    {
        id: 'msg-demo-2',
        from: 'logistics@southmarinetrading.com',
        to: 'demo@southmarinetrading.com',
        content: 'Hey, I just updated the booking for operation 25-0010. The new ETS is March 10th.',
        timestamp: new Date(Date.now() - 86400000).toISOString() // Yesterday
    },
    {
        id: 'msg-demo-3',
        from: 'finance@southmarinetrading.com',
        to: 'demo@southmarinetrading.com',
        content: 'Don\'t forget we need to collect the 70% CAD for operation 25-0001 next week.',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString() // 2 days ago
    }
]

export const MOCK_OPERACIONES: Operacion[] = [
    {
        id: '25-0001',
        estado: '9. En Tránsito',
        cliente: 'GLOBAL FRUITS BV',
        exportador: 'GLOBAL DEMO TRADING',
        productor: 'FRUTAS DEL SOL SA',
        fechaEmbarque: '2025-02-15',
        puertoDestino: 'ROTTERDAM',
        portLoad: 'BUENOS AIRES',
        productos: 'Manzanas Red Delicious:1176:24.50',
        purchasePricesRaw: 'Manzanas Red Delicious:1176:18.20',
        incoterm: 'FOB',
        containerNumber: 'MSKU1234567',
        booking: 'BK-MAERSK-001',
        forwarder: 'MAERSK LOGISTICS',
        freightValue: '1850',
        trackingStatus: 'IN_TRANSIT',
        idCarpeta: 'folder_id_25_0001',
        loadedDate: '2025-02-14',
        eta: '2025-03-10',
        brand: 'GlobalFresh',
        paymentTerms: '30% Advance Payment, 70% Cash Against Documents (CAD)',
        userId: 'demo@southmarinetrading.com',
        timestamp: '2025-02-10T14:30:00Z'
    },
    {
        id: '25-0002',
        estado: '12A. Recepción Conforme',
        cliente: 'FRESH DIRECT LLC',
        exportador: 'GLOBAL DEMO TRADING',
        productor: 'CITRUS VIL SA',
        fechaEmbarque: '2025-01-20',
        puertoDestino: 'PHILADELPHIA',
        portLoad: 'BUENOS AIRES',
        productos: 'Limones Eureka:1600:19.50',
        purchasePricesRaw: 'Limones Eureka:1600:13.20',
        incoterm: 'CIF',
        containerNumber: 'MEDU9876543',
        booking: 'BK-MSC-099',
        forwarder: 'MSC',
        freightValue: '2100',
        trackingStatus: 'ARRIVED',
        idCarpeta: 'folder_id_25_0002',
        loadedDate: '2025-01-18',
        eta: '2025-02-12',
        brand: 'Smt Selective',
        paymentTerms: '100% Cash Against Copy of Documents',
        userId: 'demo@southmarinetrading.com',
        timestamp: '2025-01-15T10:00:00Z'
    },
    {
        id: '25-0003',
        estado: '1. Operación Creada',
        cliente: 'EURO DISTRI N.V.',
        exportador: 'GLOBAL DEMO TRADING',
        productor: 'COOPERATIVA DEL SUR',
        fechaEmbarque: '2025-03-15',
        puertoDestino: 'BARCELONA',
        portLoad: 'BUENOS AIRES',
        productos: 'Peras Packhams:1260:21.00',
        purchasePricesRaw: 'Peras Packhams:1260:15.50',
        incoterm: 'CFR',
        trading: 'OCEANIC TRADE LLC',
        idCarpeta: 'folder_id_25_0003',
        brand: 'EuroSelect',
        paymentTerms: '100% Cash Against Documents (CAD)',
        userId: 'demo@southmarinetrading.com',
        timestamp: '2025-03-01T09:15:00Z'
    },
    {
        id: '25-0004',
        estado: '6. Flete en Gestión',
        cliente: 'UK FRESH PRODUCE',
        exportador: 'GLOBAL DEMO TRADING',
        productor: 'PATAGONIA FRESH',
        fechaEmbarque: '2025-04-10',
        puertoDestino: 'LONDON GATEWAY',
        portLoad: 'SAN ANTONIO',
        productos: 'Cerezas Bing:Jumbo:25.00',
        purchasePricesRaw: 'Cerezas Bing:Jumbo:18.50',
        incoterm: 'CFR',
        brand: 'PatagoniaFresh',
        paymentTerms: '20% Advance Payment, 80% Cash Against Documents (CAD)',
        userId: 'demo@southmarinetrading.com',
        timestamp: '2025-03-05T10:00:00Z'
    },
    {
        id: '25-0005',
        estado: '8. Carga Realizada',
        cliente: 'HAMBURG FRUITS',
        exportador: 'GLOBAL DEMO TRADING',
        productor: 'CITRUS VIL SA',
        fechaEmbarque: '2025-03-20',
        puertoDestino: 'HAMBURG',
        portLoad: 'BUENOS AIRES',
        productos: 'Mandarinas W. Murcott:2:18.00',
        purchasePricesRaw: 'Mandarinas W. Murcott:2:12.50',
        incoterm: 'FOB',
        containerNumber: 'HLXU1122334',
        booking: 'BK-HAPAG-005',
        forwarder: 'HAPAG LLOYD',
        trackingStatus: 'LOADING',
        loadedDate: '2025-03-12',
        brand: 'Smt Selective',
        paymentTerms: '100% Cash Against Documents (CAD)',
        userId: 'demo@southmarinetrading.com',
        timestamp: '2025-03-08T11:30:00Z'
    },
    {
        id: '25-0006',
        estado: '14. Operación Liquidada',
        cliente: 'PARIS PRIMEURS',
        exportador: 'GLOBAL DEMO TRADING',
        productor: 'BERRY BEST SR',
        fechaEmbarque: '2025-01-05',
        puertoDestino: 'LE HAVRE',
        portLoad: 'BUENOS AIRES',
        productos: 'Arándanos Duke:14mm:32.00',
        purchasePricesRaw: 'Arándanos Duke:14mm:24.00',
        incoterm: 'CIF',
        containerNumber: 'CMAU9988776',
        forwarder: 'CMA CGM',
        freightValue: '2800',
        trackingStatus: 'ARRIVED',
        eta: '2025-01-28',
        brand: 'BerryBest',
        paymentTerms: '100% Cash Against Documents (CAD)',
        userId: 'demo@southmarinetrading.com',
        timestamp: '2024-12-20T09:00:00Z'
    },
    {
        id: '25-0007',
        estado: '3. Proforma Aprobada',
        cliente: 'SHANGHAI IMPORTS',
        exportador: 'GLOBAL DEMO TRADING',
        productor: 'VINE YARD SA',
        fechaEmbarque: '2025-05-15',
        puertoDestino: 'SHANGHAI',
        portLoad: 'VALPARAISO',
        productos: 'Uvas Red Globe:XL:22.50',
        purchasePricesRaw: 'Uvas Red Globe:XL:16.00',
        incoterm: 'CFR',
        brand: 'VineYard',
        paymentTerms: '30% Advance Payment, 70% Cash Against Documents (CAD)',
        userId: 'demo@southmarinetrading.com',
        timestamp: '2025-03-11T14:45:00Z'
    },
    {
        id: '25-0008',
        estado: '10. Arribada',
        cliente: 'NY GROCERS',
        exportador: 'GLOBAL DEMO TRADING',
        productor: 'ACONCAGUA SRL',
        fechaEmbarque: '2025-02-01',
        puertoDestino: 'NEW YORK',
        portLoad: 'SAN ANTONIO',
        productos: 'Duraznos Elegant Lady:40:20.00',
        purchasePricesRaw: 'Duraznos Elegant Lady:40:14.50',
        incoterm: 'FOB',
        containerNumber: 'SUDU5544332',
        booking: 'BK-HAMBURG-008',
        forwarder: 'HAMBURG SUD',
        trackingStatus: 'ARRIVED',
        loadedDate: '2025-01-30',
        eta: '2025-02-25',
        brand: 'Aconcagua',
        paymentTerms: '100% Cash Against Copy of Documents',
        userId: 'demo@southmarinetrading.com',
        timestamp: '2025-01-15T16:00:00Z'
    },
    {
        id: '25-0009',
        estado: '2. Proforma Enviada',
        cliente: 'MILANO AGRO',
        exportador: 'GLOBAL DEMO TRADING',
        productor: 'FRUTAS DEL SOL SA',
        fechaEmbarque: '2025-04-20',
        puertoDestino: 'GENOA',
        portLoad: 'BUENOS AIRES',
        productos: 'Manzanas Granny Smith:110:23.00',
        purchasePricesRaw: 'Manzanas Granny Smith:110:17.50',
        incoterm: 'CFR',
        brand: 'GlobalFresh',
        paymentTerms: '100% After Border Release',
        userId: 'demo@southmarinetrading.com',
        timestamp: '2025-03-12T08:30:00Z'
    },
    {
        id: '25-0010',
        estado: '9. En Tránsito',
        cliente: 'TOKYO FRESH',
        exportador: 'GLOBAL DEMO TRADING',
        productor: 'CITRUS VIL SA',
        fechaEmbarque: '2025-03-01',
        puertoDestino: 'YOKOHAMA',
        portLoad: 'BUENOS AIRES',
        productos: 'Limones Eureka:138:21.00',
        purchasePricesRaw: 'Limones Eureka:138:15.00',
        incoterm: 'CIF',
        containerNumber: 'ONEU3322110',
        booking: 'BK-ONE-010',
        forwarder: 'ONE LINE',
        freightValue: '2500',
        trackingStatus: 'IN_TRANSIT',
        loadedDate: '2025-02-28',
        eta: '2025-04-05',
        brand: 'Smt Selective',
        paymentTerms: '30% Advance Payment, 70% Cash Against Documents (CAD)',
        userId: 'demo@southmarinetrading.com',
        timestamp: '2025-02-20T10:15:00Z'
    }
]

export const MOCK_CONTACTOS: Contacto[] = [
    {
        id: 'C-001',
        tipo: 'Importador',
        empresa: 'GLOBAL FRUITS BV',
        nombreContacto: 'Pieter',
        apellido: 'Vandenberg',
        direccion: 'Fruitkade 45, Rotterdam Port',
        pais: 'NETHERLANDS',
        telefono: '+31 10 456 7890',
        email: 'pieter@globalfruits.nl',
        isImporter: true,
        taxId: 'NL884422110',
        brand: 'GlobalFresh'
    },
    {
        id: 'C-002',
        tipo: 'Productor',
        empresa: 'FRUTAS DEL SOL SA',
        nombreContacto: 'Ricardo',
        apellido: 'Gómez',
        direccion: 'Ruta 5, km 120',
        pais: 'ARGENTINA',
        telefono: '+54 11 4000 0000',
        email: 'info@frutasdelsol.com.ar',
        isProducer: true,
        taxId: '30-12345678-9',
        nPlanta: 'A-22'
    },
    {
        id: 'C-003',
        tipo: 'Forwarder',
        empresa: 'MAERSK LOGISTICS',
        nombreContacto: 'Christian',
        apellido: 'Olsen',
        direccion: 'Esplanaden 50',
        pais: 'DENMARK',
        telefono: '+45 33 63 33 63',
        email: 'olsen@maersk.com',
        isForwarder: true,
        brand: 'Maersk'
    },
    {
        id: 'C-004',
        tipo: 'Importador',
        empresa: 'UK FRESH PRODUCE',
        nombreContacto: 'Sarah',
        apellido: 'Jenkins',
        direccion: '10 Produce Lane',
        pais: 'UNITED KINGDOM',
        telefono: '+44 20 7123 4567',
        email: 'sarah@ukfresh.co.uk',
        isImporter: true,
        brand: 'UK Fresh'
    },
    {
        id: 'C-005',
        tipo: 'Importador',
        empresa: 'HAMBURG FRUITS',
        nombreContacto: 'Hans',
        apellido: 'Müller',
        direccion: 'Hafenstrasse 15',
        pais: 'GERMANY',
        telefono: '+49 40 1234 5678',
        email: 'hans@hamburgfruits.de',
        isImporter: true,
        brand: 'HamburgF'
    },
    {
        id: 'C-006',
        tipo: 'Importador',
        empresa: 'SHANGHAI IMPORTS',
        nombreContacto: 'Chen',
        apellido: 'Wei',
        direccion: '88 Pudong Ave',
        pais: 'CHINA',
        telefono: '+86 21 8765 4321',
        email: 'chen@shanghaiimports.cn',
        isImporter: true,
        brand: 'SH Imports'
    },
    {
        id: 'C-007',
        tipo: 'Importador',
        empresa: 'NY GROCERS',
        nombreContacto: 'John',
        apellido: 'Smith',
        direccion: '100 Broadway',
        pais: 'UNITED STATES',
        telefono: '+1 212 555 0199',
        email: 'john@nygrocers.com',
        isImporter: true,
        brand: 'NY Grocers'
    },
    {
        id: 'C-008',
        tipo: 'Productor',
        empresa: 'PATAGONIA FRESH',
        nombreContacto: 'Martín',
        apellido: 'Pérez',
        direccion: 'Ruta 40 km 200',
        pais: 'ARGENTINA',
        telefono: '+54 294 455 0000',
        email: 'martin@patagoniafresh.com.ar',
        isProducer: true,
        taxId: '30-87654321-0',
        nPlanta: 'B-33'
    },
    {
        id: 'C-009',
        tipo: 'Productor',
        empresa: 'VINE YARD SA',
        nombreContacto: 'Laura',
        apellido: 'Rodríguez',
        direccion: 'Valle Central s/n',
        pais: 'CHILE',
        telefono: '+56 9 8888 7777',
        email: 'laura@vineyardsa.cl',
        isProducer: true,
        taxId: '76.123.456-7',
        nPlanta: 'C-44'
    },
    {
        id: 'C-010',
        tipo: 'Forwarder',
        empresa: 'HAPAG LLOYD',
        nombreContacto: 'Klaus',
        apellido: 'Schmidt',
        direccion: 'Ballindamm 25',
        pais: 'GERMANY',
        telefono: '+49 40 3001 0',
        email: 'klaus@hapag-lloyd.com',
        isForwarder: true,
        brand: 'Hapag'
    }
]

export const MOCK_CASHFLOW: CashFlowTransaction[] = [
    {
        id: 'TX-D001',
        operationId: '25-0001',
        date: '2025-02-10',
        type: 'INGRESO',
        category: 'Adelanto',
        description: '30% Adelanto GLOBAL FRUITS',
        amount: 8643.60,
        status: 'PAGADO',
        timestamp: '2025-02-10T14:35:00Z',
        dueDate: '2025-02-10'
    },
    {
        id: 'TX-D002',
        operationId: '25-0001',
        date: '2025-03-20',
        type: 'INGRESO',
        category: 'Saldo',
        description: '70% Saldo GLOBAL FRUITS',
        amount: 20168.40,
        status: 'PENDIENTE',
        timestamp: '2025-02-10T14:35:00Z',
        dueDate: '2025-03-25'
    },
    {
        id: 'TX-D003',
        operationId: '25-0001',
        date: '2025-02-12',
        type: 'EGRESO',
        category: 'Compra',
        description: 'Pago a Productor FRUTAS DEL SOL',
        amount: 21403.20,
        status: 'PAGADO',
        timestamp: '2025-02-12T09:00:00Z',
        dueDate: '2025-02-12'
    },
    {
        id: 'TX-D004',
        operationId: '25-0001',
        date: '2025-02-14',
        type: 'EGRESO',
        category: 'Flete',
        description: 'Flete Oceanico MAERSK',
        amount: 1850.00,
        status: 'PENDIENTE',
        timestamp: '2025-02-14T10:00:00Z',
        dueDate: '2025-03-01'
    },
    {
        id: 'TX-D005',
        operationId: '25-0003',
        date: '2025-02-11',
        type: 'EGRESO',
        category: 'Flete',
        description: 'Anticipo Flete - 003-26',
        amount: 450.00,
        status: 'PAGADO',
        timestamp: '2025-02-11T10:00:00Z',
        dueDate: '2025-02-11'
    }
]

export const MOCK_NOTES: Note[] = [
    {
        id: 'N-D001',
        content: 'Carga 25-0001: Confirmar ETD con Maersk.',
        author: 'Hernan',
        timestamp: '2025-02-14T10:00:00Z',
        type: 'warning'
    },
    {
        id: 'N-D002',
        content: '25-0002: Documentación enviada a cliente.',
        author: 'Ana',
        timestamp: '2025-01-25T11:20:00Z',
        type: 'info'
    }
]

export const MOCK_DASHBOARD_STATS = {
    monthlySales: 75500,
    totalSales: 125000,
    financials: {
        totalCollected: 49500,
        pendingToCollect: 75500,
        totalPaid: 42000,
        pendingToPay: 15400,
        investedCapital: -7500,
        totalUtility: 67600
    },
    recentOps: MOCK_OPERACIONES
}

export const MOCK_PRODUCTOS = [
    { id: 'P-001', especie: 'Manzanas', variedad: 'Red Delicious', calibre: '100', envase: 'Caja 18kg', marca: 'GlobalFresh' },
    { id: 'P-002', especie: 'Manzanas', variedad: 'Granny Smith', calibre: '110', envase: 'Caja 18kg', marca: 'GlobalFresh' },
    { id: 'P-003', especie: 'Peras', variedad: 'Packhams', calibre: '90', envase: 'Caja 15kg', marca: 'DelSol' },
    { id: 'P-004', especie: 'Peras', variedad: 'Danjou', calibre: '100', envase: 'Caja 15kg', marca: 'DelSol' },
    { id: 'P-005', especie: 'Arándanos', variedad: 'Duke', calibre: '14mm', envase: 'Clamshell 125g', marca: 'BerryBest' },
    { id: 'P-006', especie: 'Limones', variedad: 'Eureka', calibre: '138', envase: 'Caja 15kg', marca: 'CitrusVil' },
    { id: 'P-007', especie: 'Uvas', variedad: 'Red Globe', calibre: 'XL', envase: 'Caja 8.2kg', marca: 'VineYard' },
    { id: 'P-008', especie: 'Mandarinas', variedad: 'W. Murcott', calibre: '2', envase: 'Caja 10kg', marca: 'CitrusVil' },
    { id: 'P-009', especie: 'Cerezas', variedad: 'Bing', calibre: 'Jumbo', envase: 'Caja 5kg', marca: 'PatagoniaFresh' },
    { id: 'P-010', especie: 'Duraznos', variedad: 'Elegant Lady', calibre: '40', envase: 'Caja 10kg', marca: 'Aconcagua' }
]

export const MOCK_LEADS: import('./sheets-types').Lead[] = [
    { id: 'L-001', nombre: 'Carlos Ruiz', empresa: 'Importaciones CR', email: 'carlos@importacionescr.com', pais: 'Mexico', estado: 'Propuesta', fuente: 'Web', fechaCreacion: '2025-02-01T10:00:00Z', responsable: 'demo@southmarinetrading.com' },
    { id: 'L-002', nombre: 'Sarah Jenkins', empresa: 'UK Fresh Produce', email: 'sarah@ukfresh.co.uk', pais: 'UK', estado: 'Contactado', fuente: 'Feria', fechaCreacion: '2025-02-15T09:30:00Z', responsable: 'demo@southmarinetrading.com' },
    { id: 'L-003', nombre: 'Hans Müller', empresa: 'Hamburg Fruits', email: 'hans@hamburgfruits.de', pais: 'Germany', estado: 'Calificado', fuente: 'Referido', fechaCreacion: '2025-03-01T14:15:00Z', responsable: 'demo@southmarinetrading.com' },
    { id: 'L-004', nombre: 'Luigi Esposito', empresa: 'Milano Agro', email: 'luigi@milanoagro.it', pais: 'Italy', estado: 'Nuevo', fuente: 'Web', fechaCreacion: '2025-03-10T11:00:00Z', responsable: 'demo@southmarinetrading.com' },
    { id: 'L-005', nombre: 'Marie Dubois', empresa: 'Paris Primeurs', email: 'marie@parisprimeurs.fr', pais: 'France', estado: 'Ganado', fuente: 'LinkedIn', fechaCreacion: '2025-01-20T08:45:00Z', responsable: 'demo@southmarinetrading.com' },
    { id: 'L-006', nombre: 'Chen Wei', empresa: 'Shanghai Imports', email: 'chen@shanghaiimports.cn', pais: 'China', estado: 'Propuesta', fuente: 'Email Cold', fechaCreacion: '2025-02-28T16:20:00Z', responsable: 'demo@southmarinetrading.com' },
    { id: 'L-007', nombre: 'John Smith', empresa: 'NY Grocers', email: 'john@nygrocers.com', pais: 'USA', estado: 'Contactado', fuente: 'Web', fechaCreacion: '2025-03-05T13:10:00Z', responsable: 'demo@southmarinetrading.com' },
    { id: 'L-008', nombre: 'Ana Silva', empresa: 'Lisboa Frutas', email: 'ana@lisboafrutas.pt', pais: 'Portugal', estado: 'Calificado', fuente: 'Feria', fechaCreacion: '2025-02-18T10:30:00Z', responsable: 'demo@southmarinetrading.com' },
    { id: 'L-009', nombre: 'Diego López', empresa: 'Madrid Mayoristas', email: 'diego@madridmayoristas.es', pais: 'Spain', estado: 'Perdido', fuente: 'Referido', fechaCreacion: '2025-01-15T09:00:00Z', responsable: 'demo@southmarinetrading.com' },
    { id: 'L-010', nombre: 'Taro Tanaka', empresa: 'Tokyo Fresh', email: 'taro@tokyofresh.jp', pais: 'Japan', estado: 'Nuevo', fuente: 'Web', fechaCreacion: '2025-03-12T08:00:00Z', responsable: 'demo@southmarinetrading.com' }
]

