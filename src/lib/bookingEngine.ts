
import { Contacto, Producto, Operacion } from './sheets-types'

export interface BookingInput {
    operation: Operacion
    flete?: {
        forwarder: string
        monto: number
        temp?: string
    }
    catalogProducts: Producto[]
    contacts: Contacto[]
    marine?: string
    inland?: string
    notes?: string       // Booking-specific notes (from form)
    freightType?: string // 'MARITIMO' | 'TERRESTRE'
}

export interface ProductBookingItem {
    qty: string
    description: string
    cartons: string
    weight: string // Gross weight for this line
    netWeight: string // Net weight for this line
}

export interface GeneratedBookingData {
    replacements: Record<string, string>
    productsArray: ProductBookingItem[]
}

export function generateBookingData(input: BookingInput): GeneratedBookingData {
    const { operation: op, catalogProducts, contacts, flete, marine, inland, notes, freightType } = input

    // 1. Resolve Entities
    const resolveContact = (idOrName?: string) => {
        if (!idOrName) return { name: 'TO BE NOMINATED', address: '', taxId: '' }
        const contact = contacts.find(c => c.id === idOrName || c.empresa === idOrName)
        if (contact) return {
            name: contact.empresa,
            address: contact.direccion || '',
            taxId: contact.taxId || ''
        }
        return { name: idOrName, address: '', taxId: '' }
    }

    const shipper = resolveContact(op.exportador)
    const consignee = resolveContact(op.consigneeId || 'TO ORDER')
    const notify = resolveContact(op.notifyId || 'SAME AS CONSIGNEE')

    // 2. Parse Products and Calculate Weights/Cartons
    const productLines = (op.productos || '').split('\n').map(l => {
        const parts = l.split(':')
        return { id: parts[0], qty: parseFloat(parts[1]) || 0 }
    })

    let totalNetWeight = 0
    let totalGrossWeight = 0
    let totalCartons = 0
    const productsArray: ProductBookingItem[] = []

    // Pre-resolve all products to handle grouping logic
    const resolvedProducts = productLines.map(line => {
        const catProd = catalogProducts.find(p => p.id === line.id)
        return { ...catProd, qty: line.qty, lineId: line.id }
    })

    for (let i = 0; i < resolvedProducts.length; i++) {
        const currentProd = resolvedProducts[i]
        if (!currentProd.lineId) continue

        const qty = currentProd.qty
        totalNetWeight += qty

        const especie = currentProd.especie || ''
        const idRaw = (currentProd.lineId || '').toLowerCase()
        const isService = especie.toLowerCase().includes('servicio') ||
            especie.toLowerCase().includes('service') ||
            idRaw.includes('servicio')

        let description = ''
        let cartonsVal = ''
        let lineGross = qty * 1.07 // Default 7% tare

        if (isService) {
            description = currentProd.descripcion || especie || currentProd.lineId
        } else if (currentProd.id) {
            description = `${especie} ${currentProd.corte || ''} ${currentProd.calibre || ''}`.trim()
            if (currentProd.packing) description += ` - ${currentProd.packing}`

            // Scientific Name / HS Code at end of species group
            const nextProd = resolvedProducts[i + 1]
            const esUltimoDelGrupo = !nextProd || (nextProd.especie !== currentProd.especie)
            if (esUltimoDelGrupo) {
                const parts = []
                if (currentProd.nombreCientifico) parts.push(`Sci: ${currentProd.nombreCientifico}`)
                if (currentProd.hsCode) parts.push(`HS: ${currentProd.hsCode}`)
                if (parts.length > 0) description += `\n(${parts.join(' / ')})`
            }

            // Cartons calculation
            if (currentProd.tamanoCaja) {
                const boxString = String(currentProd.tamanoCaja).toLowerCase().replace(/,/g, '.')
                let boxWeight = 0
                if (boxString.includes('x')) {
                    const parts = boxString.split('x')
                    const a = parseFloat(parts[0])
                    const b = parseFloat(parts[1] || '0')
                    if (!isNaN(a) && !isNaN(b)) boxWeight = a * b
                } else {
                    boxWeight = parseFloat(boxString)
                }
                if (boxWeight > 0) {
                    const numCartons = Math.floor(qty / boxWeight)
                    cartonsVal = `${numCartons} CTNS`
                    totalCartons += numCartons
                }
            }
        } else {
            description = currentProd.lineId
        }

        const netStr = `${qty.toLocaleString('en-US', { minimumFractionDigits: 3 })} KGS`
        const grossStr = `${lineGross.toLocaleString('en-US', { minimumFractionDigits: 3 })} KGS`

        productsArray.push({
            qty: netStr,
            description,
            cartons: cartonsVal,
            weight: grossStr,
            netWeight: netStr
        })
        totalGrossWeight += lineGross
    }

    // 3. Resolve Smart Reefer Defaults
    // Hierarchy: 1. Operation Level -> 2. Product Catalog Level -> 3. Standard Seafood Industry Level
    const getSmartDefault = (field: 'temp' | 'vent' | 'drains' | 'humidity') => {
        // Helper to ignore hyphens and empty values
        const isValid = (val: any) => val && val.toString().trim() !== '-' && val.toString().trim() !== '';

        // 1. Operation Level (manual override)
        if (field === 'temp') {
            if (isValid(flete?.temp)) return flete?.temp;
            if (isValid(op.instrucciones_frio)) return op.instrucciones_frio;
        }
        if (field === 'vent' && isValid(op.ventilation)) return op.ventilation;
        if (field === 'drains' && isValid(op.drains)) return op.drains;
        if (field === 'humidity' && isValid(op.humidity)) return op.humidity;

        // 2. Product Catalog Level (Default for the species)
        // Find the first product with a default defined
        const prodWithDefault = resolvedProducts.find(p => {
            if (field === 'temp') return !!p.defaultTemp
            if (field === 'vent') return !!p.defaultVent
            if (field === 'drains') return !!p.defaultDrains
            if (field === 'humidity') return !!p.defaultHumidity
            return false
        })

        if (prodWithDefault) {
            if (field === 'temp') return prodWithDefault.defaultTemp
            if (field === 'vent') return prodWithDefault.defaultVent
            if (field === 'drains') return prodWithDefault.defaultDrains
            if (field === 'humidity') return prodWithDefault.defaultHumidity
        }

        // 3. Standard Seafood Industry Defaults
        const defaults = {
            temp: '-18.0 DEGREES CELSIUS',
            vent: 'CLOSED',
            drains: 'CLOSED',
            humidity: 'OFF'
        }
        return defaults[field]
    }

    // 4. Numbered Replacements for Tables (up to 15 items)
    const numberedReplacements: Record<string, string> = {}
    for (let i = 1; i <= 15; i++) {
        const p = productsArray[i - 1]
        numberedReplacements[`product_qty_${i}`] = p ? p.qty : ""
        numberedReplacements[`product_desc_${i}`] = p ? p.description : ""
        numberedReplacements[`product_cartons_${i}`] = p ? p.cartons : ""
        numberedReplacements[`product_gross_${i}`] = p ? p.weight : ""
        numberedReplacements[`product_net_${i}`] = p ? p.netWeight : ""
    }

    // 5. Prepare Final Replacements
    const replacements: Record<string, string> = {
        ...numberedReplacements,
        'id': op.id || '',
        'booking_n': `B${op.id || ''}`, // B098-26 format
        'trading': 'SOUTH MARINE TRADING', // Hardcoded as per previous logic, or could be dynamic if needed
        'trading_address': 'Shipping Order / International Logistics',
        'date': new Date().toLocaleDateString('en-GB'),
        'shipper_name': shipper.name,
        'shipper_address': shipper.address,
        'shipper_taxid': shipper.taxId,
        'consignee_name': consignee.name,
        'consignee_address': consignee.address,
        'consignee_taxid': consignee.taxId,
        'notify_name': notify.name,
        'notify_address': notify.address,
        'notify_taxid': notify.taxId,
        'origin': 'ARGENTINA', // Add origin from operation data
        'portLoad': op.portLoad || 'Any Argentina Port',
        'portDest': op.puertoDestino || 'To Order',
        'containerType': `${op.containerNumber ? '1 x ' : ''}40' HIGH CUBE REEFER`,
        'temperature': getSmartDefault('temp')!,
        'ventilation': getSmartDefault('vent')!,
        'drains': getSmartDefault('drains')!,
        'humidity': getSmartDefault('humidity')!,
        'remarks': notes || '',
        'incoterm': op.incoterm || 'CFR',
        'freightTerm': (op.incoterm === 'FOB' || op.incoterm === 'FCA') ? 'COLLECT' : 'PREPAID',
        'marine': marine || '',
        'Inland': inland || '',
        'total_net': `${totalNetWeight.toLocaleString('en-US', { minimumFractionDigits: 3 })} KGS`,
        'total_gross': `${totalGrossWeight.toLocaleString('en-US', { minimumFractionDigits: 3 })} KGS`,
        'total_cartons': totalCartons > 0 ? `${totalCartons} CARTONS` : '',
        'commodity': productsArray.length > 0 ? productsArray[0].description.split('\n')[0] : 'SEAFOOD'
    }

    return { replacements, productsArray }
}
