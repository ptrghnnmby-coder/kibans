import { Operacion, Contacto, Note, CashFlowTransaction, TeamMessage, Flete } from './sheets-types'

export const MOCK_FLETES: Flete[] = [
    {
        id_operacion: '25-0004',
        forwarder: 'MSC LOGISTICS',
        monto: 1850.00,
        moneda: 'USD',
        seguro: 'SI',
        temp: '-1.5',
        validez: '2025-04-30',
        estado: 'Pendiente'
    },
    {
        id_operacion: '25-0004',
        forwarder: 'HAPAG LLOYD',
        monto: 1900.00,
        moneda: 'USD',
        seguro: 'NO',
        temp: '-1.5',
        validez: '2025-04-15',
        estado: 'Seleccionado'
    },
    {
        id_operacion: '25-0009',
        forwarder: 'CMA CGM',
        monto: 2200.00,
        moneda: 'USD',
        seguro: 'SI',
        temp: '0.5',
        validez: '2025-05-10',
        estado: 'Pendiente'
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
    // ─── 25-0001 · GLOBAL FRUITS BV · Manzanas Rotterdam ───
    { id: 'TX-D001', operationId: '25-0001', date: '2025-02-10', type: 'INGRESO', category: 'Adelanto', description: '30% Adelanto - GLOBAL FRUITS BV', amount: 8643.60, status: 'PAGADO', timestamp: '2025-02-10T14:35:00Z', dueDate: '2025-02-10' },
    { id: 'TX-D002', operationId: '25-0001', date: '2025-03-25', type: 'INGRESO', category: 'Saldo CAD', description: '70% Saldo CAD - GLOBAL FRUITS BV', amount: 20168.40, status: 'PENDIENTE', timestamp: '2025-02-10T14:35:00Z', dueDate: '2025-03-25' },
    { id: 'TX-D003', operationId: '25-0001', date: '2025-02-12', type: 'EGRESO', category: 'Compra Productor', description: 'Pago FRUTAS DEL SOL SA - 1176 ctn Manzanas', amount: 21403.20, status: 'PAGADO', timestamp: '2025-02-12T09:00:00Z', dueDate: '2025-02-12' },
    { id: 'TX-D004', operationId: '25-0001', date: '2025-02-18', type: 'EGRESO', category: 'Flete', description: 'Flete Oceánico MAERSK LOGISTICS', amount: 1850.00, status: 'PAGADO', timestamp: '2025-02-14T10:00:00Z', dueDate: '2025-02-18' },
    { id: 'TX-D005', operationId: '25-0001', date: '2025-02-13', type: 'EGRESO', category: 'Despachante', description: 'Servicio Despachante Exportación', amount: 480.00, status: 'PAGADO', timestamp: '2025-02-13T11:00:00Z', dueDate: '2025-02-13' },
    { id: 'TX-D006', operationId: '25-0001', date: '2025-02-14', type: 'EGRESO', category: 'Inspección', description: 'Inspección Fitosanitaria SENASA', amount: 210.00, status: 'PAGADO', timestamp: '2025-02-14T08:00:00Z', dueDate: '2025-02-14' },
    { id: 'TX-D007', operationId: '25-0001', date: '2025-02-15', type: 'EGRESO', category: 'Seguro', description: 'Seguro de Carga - Allianz', amount: 320.00, status: 'PAGADO', timestamp: '2025-02-15T09:00:00Z', dueDate: '2025-02-15' },

    // ─── 25-0002 · FRESH DIRECT LLC · Limones Philadelphia ───
    { id: 'TX-D010', operationId: '25-0002', date: '2025-02-15', type: 'INGRESO', category: 'Pago Total CAD', description: '100% CAD - FRESH DIRECT LLC', amount: 31200.00, status: 'PAGADO', timestamp: '2025-01-20T10:00:00Z', dueDate: '2025-02-15' },
    { id: 'TX-D011', operationId: '25-0002', date: '2025-01-16', type: 'EGRESO', category: 'Compra Productor', description: 'Pago CITRUS VIL SA - 1600 ctn Limones', amount: 21120.00, status: 'PAGADO', timestamp: '2025-01-16T10:00:00Z', dueDate: '2025-01-16' },
    { id: 'TX-D012', operationId: '25-0002', date: '2025-01-19', type: 'EGRESO', category: 'Flete', description: 'Flete Oceánico MSC', amount: 2100.00, status: 'PAGADO', timestamp: '2025-01-19T10:00:00Z', dueDate: '2025-01-19' },
    { id: 'TX-D013', operationId: '25-0002', date: '2025-01-17', type: 'EGRESO', category: 'Despachante', description: 'Servicio Despachante Exportación', amount: 520.00, status: 'PAGADO', timestamp: '2025-01-17T11:00:00Z', dueDate: '2025-01-17' },
    { id: 'TX-D014', operationId: '25-0002', date: '2025-01-18', type: 'EGRESO', category: 'Inspección', description: 'Inspección USDA - Cold Treatment', amount: 380.00, status: 'PAGADO', timestamp: '2025-01-18T08:00:00Z', dueDate: '2025-01-18' },
    { id: 'TX-D015', operationId: '25-0002', date: '2025-01-19', type: 'EGRESO', category: 'Seguro', description: 'Seguro de Carga CIF - Zurich', amount: 290.00, status: 'PAGADO', timestamp: '2025-01-19T09:00:00Z', dueDate: '2025-01-19' },

    // ─── 25-0003 · EURO DISTRI NV · Peras Barcelona ───
    { id: 'TX-D020', operationId: '25-0003', date: '2025-03-05', type: 'EGRESO', category: 'Despachante', description: 'Anticipo Despachante Exportación', amount: 300.00, status: 'PAGADO', timestamp: '2025-03-05T10:00:00Z', dueDate: '2025-03-05' },
    { id: 'TX-D021', operationId: '25-0003', date: '2025-03-14', type: 'EGRESO', category: 'Inspección', description: 'Inspección Fitosanitaria SENASA', amount: 190.00, status: 'PENDIENTE', timestamp: '2025-03-10T09:00:00Z', dueDate: '2025-03-14' },
    { id: 'TX-D022', operationId: '25-0003', date: '2025-03-25', type: 'INGRESO', category: 'Pago Total CAD', description: '100% CAD - EURO DISTRI N.V.', amount: 26460.00, status: 'PENDIENTE', timestamp: '2025-03-01T09:15:00Z', dueDate: '2025-03-25' },
    { id: 'TX-D023', operationId: '25-0003', date: '2025-03-20', type: 'EGRESO', category: 'Compra Productor', description: 'Pago COOPERATIVA DEL SUR - 1260 ctn Peras', amount: 19530.00, status: 'PENDIENTE', timestamp: '2025-03-01T09:15:00Z', dueDate: '2025-03-20' },
    { id: 'TX-D024', operationId: '25-0003', date: '2025-03-16', type: 'EGRESO', category: 'Flete', description: 'Flete Oceánico CFR - Evergreen', amount: 1950.00, status: 'PENDIENTE', timestamp: '2025-03-16T10:00:00Z', dueDate: '2025-03-20' },

    // ─── 25-0004 · UK FRESH PRODUCE · Cerezas London ───
    { id: 'TX-D030', operationId: '25-0004', date: '2025-03-10', type: 'INGRESO', category: 'Adelanto', description: '20% Adelanto - UK FRESH PRODUCE', amount: 9250.00, status: 'PAGADO', timestamp: '2025-03-10T14:00:00Z', dueDate: '2025-03-10' },
    { id: 'TX-D031', operationId: '25-0004', date: '2025-04-25', type: 'INGRESO', category: 'Saldo CAD', description: '80% Saldo CAD - UK FRESH PRODUCE', amount: 37000.00, status: 'PENDIENTE', timestamp: '2025-03-05T10:00:00Z', dueDate: '2025-04-25' },
    { id: 'TX-D032', operationId: '25-0004', date: '2025-04-10', type: 'EGRESO', category: 'Compra Productor', description: 'Pago PATAGONIA FRESH - Cerezas Bing Jumbo', amount: 34225.00, status: 'PENDIENTE', timestamp: '2025-03-05T10:00:00Z', dueDate: '2025-04-10' },
    { id: 'TX-D033', operationId: '25-0004', date: '2025-04-12', type: 'EGRESO', category: 'Flete', description: 'Flete Oceánico CFR - MSC', amount: 1850.00, status: 'PENDIENTE', timestamp: '2025-03-05T10:00:00Z', dueDate: '2025-04-12' },
    { id: 'TX-D034', operationId: '25-0004', date: '2025-03-15', type: 'EGRESO', category: 'Despachante', description: 'Reserva Despachante Exportación', amount: 250.00, status: 'PAGADO', timestamp: '2025-03-15T10:00:00Z', dueDate: '2025-03-15' },

    // ─── 25-0005 · HAMBURG FRUITS · Mandarinas Hamburg ───
    { id: 'TX-D040', operationId: '25-0005', date: '2025-03-12', type: 'EGRESO', category: 'Compra Productor', description: 'Pago CITRUS VIL SA - Mandarinas W. Murcott', amount: 25000.00, status: 'PAGADO', timestamp: '2025-03-12T09:00:00Z', dueDate: '2025-03-12' },
    { id: 'TX-D041', operationId: '25-0005', date: '2025-04-05', type: 'INGRESO', category: 'Pago Total CAD', description: '100% CAD - HAMBURG FRUITS', amount: 36000.00, status: 'PENDIENTE', timestamp: '2025-03-08T11:30:00Z', dueDate: '2025-04-05' },
    { id: 'TX-D042', operationId: '25-0005', date: '2025-03-25', type: 'EGRESO', category: 'Flete', description: 'Flete Oceánico FOB - HAPAG LLOYD', amount: 2200.00, status: 'PENDIENTE', timestamp: '2025-03-20T10:00:00Z', dueDate: '2025-03-25' },
    { id: 'TX-D043', operationId: '25-0005', date: '2025-03-13', type: 'EGRESO', category: 'Inspección', description: 'Inspección Fitosanitaria SENASA', amount: 175.00, status: 'PAGADO', timestamp: '2025-03-13T08:00:00Z', dueDate: '2025-03-13' },
    { id: 'TX-D044', operationId: '25-0005', date: '2025-03-14', type: 'EGRESO', category: 'Seguro', description: 'Seguro FOB - Marsh Insurance', amount: 210.00, status: 'PAGADO', timestamp: '2025-03-14T09:00:00Z', dueDate: '2025-03-14' },

    // ─── 25-0006 · PARIS PRIMEURS · Arándanos Le Havre (LIQUIDADA) ───
    { id: 'TX-D050', operationId: '25-0006', date: '2025-02-01', type: 'INGRESO', category: 'Pago Total CAD', description: '100% CAD - PARIS PRIMEURS', amount: 56448.00, status: 'PAGADO', timestamp: '2025-01-28T10:00:00Z', dueDate: '2025-02-01' },
    { id: 'TX-D051', operationId: '25-0006', date: '2024-12-22', type: 'EGRESO', category: 'Compra Productor', description: 'Pago BERRY BEST SR - Arándanos Duke 14mm', amount: 42336.00, status: 'PAGADO', timestamp: '2024-12-22T09:00:00Z', dueDate: '2024-12-22' },
    { id: 'TX-D052', operationId: '25-0006', date: '2025-01-03', type: 'EGRESO', category: 'Flete', description: 'Flete CIF CMA CGM', amount: 2800.00, status: 'PAGADO', timestamp: '2025-01-03T10:00:00Z', dueDate: '2025-01-03' },
    { id: 'TX-D053', operationId: '25-0006', date: '2025-01-04', type: 'EGRESO', category: 'Seguro', description: 'Seguro de Carga CIF - AXA', amount: 380.00, status: 'PAGADO', timestamp: '2025-01-04T09:00:00Z', dueDate: '2025-01-04' },
    { id: 'TX-D054', operationId: '25-0006', date: '2025-01-04', type: 'EGRESO', category: 'Despachante', description: 'Liquidación Final Despachante', amount: 620.00, status: 'PAGADO', timestamp: '2025-01-04T11:00:00Z', dueDate: '2025-01-04' },
    { id: 'TX-D055', operationId: '25-0006', date: '2024-12-29', type: 'EGRESO', category: 'Inspección', description: 'Inspección Fitosanitaria + Cold Chain', amount: 290.00, status: 'PAGADO', timestamp: '2024-12-29T08:00:00Z', dueDate: '2024-12-29' },

    // ─── 25-0007 · SHANGHAI IMPORTS · Uvas Shanghai ───
    { id: 'TX-D060', operationId: '25-0007', date: '2025-03-20', type: 'INGRESO', category: 'Adelanto', description: '30% Adelanto - SHANGHAI IMPORTS', amount: 8505.00, status: 'PENDIENTE', timestamp: '2025-03-11T14:45:00Z', dueDate: '2025-03-20' },
    { id: 'TX-D061', operationId: '25-0007', date: '2025-06-05', type: 'INGRESO', category: 'Saldo CAD', description: '70% Saldo CAD - SHANGHAI IMPORTS', amount: 19845.00, status: 'PENDIENTE', timestamp: '2025-03-11T14:45:00Z', dueDate: '2025-06-05' },
    { id: 'TX-D062', operationId: '25-0007', date: '2025-05-15', type: 'EGRESO', category: 'Compra Productor', description: 'Pago VINE YARD SA - Uvas Red Globe XL', amount: 20160.00, status: 'PENDIENTE', timestamp: '2025-03-11T14:45:00Z', dueDate: '2025-05-15' },
    { id: 'TX-D063', operationId: '25-0007', date: '2025-05-15', type: 'EGRESO', category: 'Flete', description: 'Flete Oceánico CFR - Evergreen', amount: 3200.00, status: 'PENDIENTE', timestamp: '2025-03-11T14:45:00Z', dueDate: '2025-05-15' },

    // ─── 25-0008 · NY GROCERS · Duraznos New York ───
    { id: 'TX-D070', operationId: '25-0008', date: '2025-03-01', type: 'INGRESO', category: 'Pago Total CAD', description: '100% CAD Copia Docs - NY GROCERS', amount: 46000.00, status: 'PAGADO', timestamp: '2025-02-25T10:00:00Z', dueDate: '2025-03-01' },
    { id: 'TX-D071', operationId: '25-0008', date: '2025-01-29', type: 'EGRESO', category: 'Compra Productor', description: 'Pago ACONCAGUA SRL - Duraznos Elegant Lady', amount: 33350.00, status: 'PAGADO', timestamp: '2025-01-29T09:00:00Z', dueDate: '2025-01-29' },
    { id: 'TX-D072', operationId: '25-0008', date: '2025-01-31', type: 'EGRESO', category: 'Flete', description: 'Flete FOB HAMBURG SUD', amount: 2950.00, status: 'PAGADO', timestamp: '2025-01-31T10:00:00Z', dueDate: '2025-01-31' },
    { id: 'TX-D073', operationId: '25-0008', date: '2025-01-30', type: 'EGRESO', category: 'Inspección', description: 'Inspección USDA + fumigación', amount: 430.00, status: 'PAGADO', timestamp: '2025-01-30T08:00:00Z', dueDate: '2025-01-30' },
    { id: 'TX-D074', operationId: '25-0008', date: '2025-01-30', type: 'EGRESO', category: 'Despachante', description: 'Despachante Exportación Buenos Aires', amount: 540.00, status: 'PAGADO', timestamp: '2025-01-30T11:00:00Z', dueDate: '2025-01-30' },
    { id: 'TX-D075', operationId: '25-0008', date: '2025-01-31', type: 'EGRESO', category: 'Seguro', description: 'Seguro FOB - Mapfre', amount: 265.00, status: 'PAGADO', timestamp: '2025-01-31T09:00:00Z', dueDate: '2025-01-31' },

    // ─── 25-0009 · MILANO AGRO · Manzanas Genova ───
    { id: 'TX-D080', operationId: '25-0009', date: '2025-04-28', type: 'INGRESO', category: 'Pago Total', description: '100% After Border Release - MILANO AGRO', amount: 29670.00, status: 'PENDIENTE', timestamp: '2025-03-12T08:30:00Z', dueDate: '2025-04-28' },
    { id: 'TX-D081', operationId: '25-0009', date: '2025-04-20', type: 'EGRESO', category: 'Compra Productor', description: 'Pago FRUTAS DEL SOL SA - Manzanas Granny Smith', amount: 22050.00, status: 'PENDIENTE', timestamp: '2025-03-12T08:30:00Z', dueDate: '2025-04-20' },
    { id: 'TX-D082', operationId: '25-0009', date: '2025-04-22', type: 'EGRESO', category: 'Flete', description: 'Flete Oceánico CFR - CMA CGM', amount: 2200.00, status: 'PENDIENTE', timestamp: '2025-04-18T10:00:00Z', dueDate: '2025-04-22' },
    { id: 'TX-D083', operationId: '25-0009', date: '2025-03-25', type: 'EGRESO', category: 'Despachante', description: 'Anticipo Despachante Exportación', amount: 280.00, status: 'PENDIENTE', timestamp: '2025-03-20T10:00:00Z', dueDate: '2025-03-25' },

    // ─── 25-0010 · TOKYO FRESH · Limones Yokohama ───
    { id: 'TX-D090', operationId: '25-0010', date: '2025-02-22', type: 'INGRESO', category: 'Adelanto', description: '30% Adelanto - TOKYO FRESH Co. Ltd.', amount: 13230.00, status: 'PAGADO', timestamp: '2025-02-20T10:15:00Z', dueDate: '2025-02-22' },
    { id: 'TX-D091', operationId: '25-0010', date: '2025-04-15', type: 'INGRESO', category: 'Saldo CAD', description: '70% Saldo CAD - TOKYO FRESH Co. Ltd.', amount: 30870.00, status: 'PENDIENTE', timestamp: '2025-02-20T10:15:00Z', dueDate: '2025-04-15' },
    { id: 'TX-D092', operationId: '25-0010', date: '2025-02-25', type: 'EGRESO', category: 'Compra Productor', description: 'Pago CITRUS VIL SA - 1600 ctn Limones Eureka 138', amount: 24000.00, status: 'PAGADO', timestamp: '2025-02-25T09:00:00Z', dueDate: '2025-02-25' },
    { id: 'TX-D093', operationId: '25-0010', date: '2025-03-01', type: 'EGRESO', category: 'Flete', description: 'Flete Oceánico CIF - ONE LINE', amount: 2500.00, status: 'PAGADO', timestamp: '2025-03-01T10:00:00Z', dueDate: '2025-03-01' },
    { id: 'TX-D094', operationId: '25-0010', date: '2025-02-26', type: 'EGRESO', category: 'Despachante', description: 'Servicio Despachante Exportación + Aduana', amount: 590.00, status: 'PAGADO', timestamp: '2025-02-26T11:00:00Z', dueDate: '2025-02-26' },
    { id: 'TX-D095', operationId: '25-0010', date: '2025-02-27', type: 'EGRESO', category: 'Inspección', description: 'Inspección Fitosanitaria SENASA - Protocolo Japón', amount: 420.00, status: 'PAGADO', timestamp: '2025-02-27T08:00:00Z', dueDate: '2025-02-27' },
    { id: 'TX-D096', operationId: '25-0010', date: '2025-02-28', type: 'EGRESO', category: 'Seguro', description: 'Seguro de Carga CIF - Mapfre Marine', amount: 310.00, status: 'PAGADO', timestamp: '2025-02-28T09:00:00Z', dueDate: '2025-02-28' },
    { id: 'TX-D097', operationId: '25-0010', date: '2025-02-28', type: 'EGRESO', category: 'Comisión', description: 'Comisión Agente TOKYO FRESH (1.5%)', amount: 659.25, status: 'PAGADO', timestamp: '2025-02-26T12:00:00Z', dueDate: '2025-02-28' },
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
    { id: 'P-001', especie: 'Manzanas', variedad: 'Red Delicious', calibre: '1176', envase: 'Caja 18kg', marca: 'GlobalFresh', corte: 'Entera', packing: 'Cartón' },
    { id: 'P-002', especie: 'Manzanas', variedad: 'Granny Smith', calibre: '110', envase: 'Caja 18kg', marca: 'GlobalFresh', corte: 'Entera', packing: 'Cartón' },
    { id: 'P-003', especie: 'Peras', variedad: 'Packhams', calibre: '1260', envase: 'Caja 15kg', marca: 'DelSol', corte: 'Entera', packing: 'Cartón' },
    { id: 'P-004', especie: 'Peras', variedad: 'Danjou', calibre: '100', envase: 'Caja 15kg', marca: 'DelSol', corte: 'Entera', packing: 'Cartón' },
    { id: 'P-005', especie: 'Arándanos', variedad: 'Duke', calibre: '14mm', envase: 'Clamshell 125g', marca: 'BerryBest', corte: 'Frescos', packing: 'Clamshell' },
    { id: 'P-006', especie: 'Limones', variedad: 'Eureka', calibre: '1600', envase: 'Caja 15kg', marca: 'CitrusVil', corte: 'Entera', packing: 'Cartón' },
    { id: 'P-007', especie: 'Uvas', variedad: 'Red Globe', calibre: 'XL', envase: 'Caja 8.2kg', marca: 'VineYard', corte: 'Racimo', packing: 'Cartón' },
    { id: 'P-008', especie: 'Mandarinas', variedad: 'W. Murcott', calibre: '2', envase: 'Caja 10kg', marca: 'CitrusVil', corte: 'Entera', packing: 'Cartón' },
    { id: 'P-009', especie: 'Cerezas', variedad: 'Bing', calibre: 'Jumbo', envase: 'Caja 5kg', marca: 'PatagoniaFresh', corte: 'Entera', packing: 'Cartón' },
    { id: 'P-010', especie: 'Duraznos', variedad: 'Elegant Lady', calibre: '40', envase: 'Caja 10kg', marca: 'Aconcagua', corte: 'Entera', packing: 'Cartón' }
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

