
import { Contacto } from './sheets-types'
import { ProductItemWithDetails } from './proformaEngine'

// ==========================================
// TYPES
// ==========================================

export interface POInput {
    po_number: string; // OC-ID
    date: string; // Today or provided
    user_id: string;

    // Logistics
    port_load: string;
    port_dest: string;
    ship_date: string; // ETD
    incoterm: string;
    payment_terms: string;

    // Parties (IDs or Names to find in catalog)
    bill_to_id: string;
    consignee_id: string;

    notify_id: string;
    supplier_id: string; // New field for the Seller/Producer

    // Data
    notes: string;
    products: ProductItemWithDetails[]; // Derived from Purchase Prices
}

export interface GeneratedPOData {
    po_number: string;
    date_formatted: string;

    // Blocks
    bill_block: string;
    consignee_block: string;
    notify_block: string;

    // Logic fields
    port_loading: string;
    port_destination: string;
    shipping_date: string;

    // Totals
    total_number: string;
    total_text: string;

    // Replacements for Google Doc
    replacements: Record<string, string>;

    // Structured Products for Dynamic Table
    products: Array<{ qty: string, desc: string, unit: string, subtotal: string, ctns: string }>;
}

// ==========================================
// HELPERS (Reused or adapted)
// ==========================================

function getVal(obj: any, ...keys: string[]): string {
    if (!obj) return "";
    const searchKeys = keys.map(k => k.toLowerCase().replace(/[^a-z0-9\-_]/g, ""));
    for (const key of Object.keys(obj)) {
        const cleanKey = key.toLowerCase().replace(/[^a-z0-9\-_]/g, "");
        if (searchKeys.includes(cleanKey)) return obj[key];
    }
    return "";
}

function cleanEntityBlock(data: Contacto | undefined): string {
    if (!data) return "";
    const lines: string[] = [];

    const empresa = data.empresa || getVal(data, "Brand", "Name", "Company");
    if (empresa) lines.push(empresa);

    const dir = data.direccion || getVal(data, "Address", "Billing Address");
    if (dir) lines.push(dir);

    const pais = data.pais || getVal(data, "Country");
    if (pais) lines.push(pais);

    const taxId = data.taxId || getVal(data, "Tax ID", "TaxId", "CUIT", "RUC", "VAT");
    if (taxId) lines.push(`Tax ID: ${taxId}`);

    return lines.join("\n").trim();
}

function numberToEnglishWords(n: number): string {
    if (n < 0) return "";
    if (n === 0) return "ZERO USD";

    const ones = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
    const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

    function convertHundreds(num: number): string {
        let str = "";
        if (num >= 100) { str += ones[Math.floor(num / 100)] + " HUNDRED "; num %= 100; }
        if (num > 0) {
            if (num < 20) { str += ones[num] + " "; }
            else { str += tens[Math.floor(num / 10)] + " "; if (num % 10 > 0) str += ones[num % 10] + " "; }
        }
        return str.trim();
    }

    const num = Math.floor(n);
    const decimals = Math.round((n - num) * 100);
    let str = "";

    if (Math.floor(num / 1000000000) > 0) str += convertHundreds(Math.floor(num / 1000000000)) + " BILLION ";
    if (Math.floor((num % 1000000000) / 1000000) > 0) str += convertHundreds(Math.floor((num % 1000000000) / 1000000)) + " MILLION ";
    if (Math.floor((num % 1000000) / 1000) > 0) str += convertHundreds(Math.floor((num % 1000000) / 1000)) + " THOUSAND ";

    const remainder = num % 1000;
    if (remainder > 0) { if (str !== "") str += "AND "; str += convertHundreds(remainder); }
    else if (str === "") { return "ZERO USD"; }

    str = str.trim();
    if (decimals > 0) str += ` AND ${decimals}/100`; else str += ` AND 00/100`;

    return str + " USD";
}

function smartDate(val: string): string {
    if (!val) return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const dt = new Date(val); // assumes YYYY-MM-DD
    if (isNaN(dt.getTime())) return val;
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
}

// ==========================================
// CORE LOGIC
// ==========================================

export function generatePOData(
    input: POInput,
    catalogProducts: any[] = [],
    allContacts: Contacto[]
): GeneratedPOData {

    // 1. Resolve Parties
    const billTo = allContacts.find(c => c.id === input.bill_to_id || c.empresa === input.bill_to_id);
    const consignee = allContacts.find(c => c.id === input.consignee_id || c.empresa === input.consignee_id);
    const notify = allContacts.find(c => c.id === input.notify_id || c.empresa === input.notify_id);

    const billBlock = cleanEntityBlock(billTo);
    const consigneeBlock = cleanEntityBlock(consignee);

    const notifyBlock = cleanEntityBlock(notify);

    // Resolve Supplier
    const supplier = allContacts.find(c => c.id === input.supplier_id || c.empresa === input.supplier_id);
    const supplierBlock = cleanEntityBlock(supplier);

    // 2. Products Loop (Calculations)
    let totalCalculado = 0;
    const replacements: Record<string, string> = {};

    // Init slots (up to 15) - Legacy support
    for (let i = 1; i <= 15; i++) {
        replacements[`qty_${i}`] = "";
        replacements[`desc_${i}`] = "";
        replacements[`unit_${i}`] = "";
        replacements[`sub_${i}`] = "";
        // No cartons
    }

    const dynamicProducts: Array<{ qty: string, desc: string, unit: string, subtotal: string, ctns: string }> = []

    // Enrich all products with catalog data (same as proformaEngine)
    const enrichedProducts = input.products.map(prod => {
        const catalogInfo = prod.id ? (catalogProducts.find(cp => cp.id === prod.id) || {}) : {}
        return { ...catalogInfo, ...prod }
    })

    enrichedProducts.forEach((currentProd, idx) => {
        if (idx >= 15) return

        const n = idx + 1
        const qty = currentProd.qty || 0
        const price = currentProd.price || 0
        const subtotal = qty * price

        if (!isNaN(subtotal)) totalCalculado += subtotal

        const especieRaw = currentProd.especie || ""
        const idRaw = (currentProd.id || "").toLowerCase()
        const isService = especieRaw.toLowerCase().includes("servicio") ||
            especieRaw.toLowerCase().includes("service") ||
            idRaw.includes("servicio")

        let description = ""
        let boxWeight = 0
        let boxSize = ""

        if (isService) {
            description = currentProd.descripcion || especieRaw
        } else {
            const cuts = currentProd.corte || ""
            const calibre = currentProd.calibre || ""
            const packing = currentProd.packing || ""
            boxSize = currentProd.tamanoCaja || ""

            description = `${especieRaw} ${cuts} ${calibre}`.trim()
            if (packing) description += ` - ${packing}`
            if (boxSize) description += ` ${boxSize}`

            if (!description) {
                description = currentProd.descripcion || ""
            }
        }

        // Cartons calculation (same as proformaEngine)
        let cartonsVal = ""
        if (boxSize) {
            const boxString = String(boxSize).toLowerCase().replace(/,/g, '.')
            if (boxString.includes('x')) {
                const parts = boxString.split('x')
                const a = parseFloat(parts[0])
                const b = parseFloat(parts[1] || "0")
                if (!isNaN(a) && !isNaN(b)) boxWeight = a * b
            } else {
                boxWeight = parseFloat(boxString)
            }
            if (boxWeight > 0 && qty > 0) {
                cartonsVal = String(Math.floor(qty / boxWeight))
            }
        }

        // Scientific Name / Origin at end of species group (same as proformaEngine)
        const nextProd = enrichedProducts[idx + 1]
        const esUltimoDelGrupo = !nextProd || (nextProd.especie !== currentProd.especie)
        if (!isService && esUltimoDelGrupo) {
            const sci = currentProd.nombreCientifico
            const org = currentProd.origen
            if (sci || org) {
                description += `\n[Scientific Name: ${sci || '-'} | Origin: ${org || '-'}]`
            }
        }

        replacements[`qty_${n}`] = qty.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
        replacements[`desc_${n}`] = description
        replacements[`unit_${n}`] = price.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        replacements[`sub_${n}`] = subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

        dynamicProducts.push({
            qty: qty.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
            desc: description,
            unit: price.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            subtotal: subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            ctns: "" // PO table has 4 columns: no cartons column
        })
    })

    const totalText = numberToEnglishWords(totalCalculado);

    return {
        po_number: input.po_number || "Draft",
        date_formatted: smartDate(input.date),
        bill_block: billBlock,
        consignee_block: consigneeBlock,
        notify_block: notifyBlock,
        port_loading: input.port_load,
        port_destination: input.port_dest,
        shipping_date: smartDate(input.ship_date),
        total_number: totalCalculado.toFixed(2),
        total_text: totalText,
        replacements: {
            ...replacements,
            'po_n': input.po_number || "Draft",
            'date': smartDate(input.date),
            'bill_block': billBlock,
            'notify_block': notifyBlock,
            'consignee_block': consigneeBlock,
            'port_loading': input.port_load,
            'port_destination': input.port_dest,
            'shipping_date': smartDate(input.ship_date),
            'total_number': totalCalculado.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            'total_text': totalText,
            'notes': input.notes || "",

            // Expanded Mapping based on User Confirmation
            'supplier': supplierBlock, // Correctly mapped to Supplier/Productor

            'bill_to': billBlock,
            'consignee': consigneeBlock,
            'notify': notifyBlock,

            'pol': input.port_load,
            'pod': input.port_dest,
            'port_load': input.port_load, // Alias
            'port_dest': input.port_dest, // Alias

            'incoterm': input.incoterm,
            'payment_terms': input.payment_terms,


            // Helpers
            'origin': "Uruguay", // Default
            'description': input.products.map(p => p.especie).join(', ')
        },
        products: dynamicProducts
    };
}
