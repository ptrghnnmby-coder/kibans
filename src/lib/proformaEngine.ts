
import { Contacto } from './sheets-types'

// ==========================================
// TYPES
// ==========================================

export interface OperationInput {
    id_carga?: string;
    row_number?: number;
    user_id: string;
    import_id: string;
    export_id: string;
    producer_id: string;
    port_dest: string;
    port_load: string;
    incoterm: string;
    ship_date: string;
    ship_lane: string;
    payment_terms: string;
    trading: string;
    notes: string;
    notasProforma?: string;
    brand: string;
    status_log?: string;
    products: ProductItemWithDetails[];
    // Optional total fields if already calculated
    total_net_weight?: number;
    total_gross_weight?: number;
}

export interface ProductItemWithDetails {
    id: string;
    qty: number; // Net weight if in KGS
    price: number;
    // Details from Catalog
    especie?: string;
    corte?: string;
    calibre?: string;
    packing?: string;
    tamanoCaja?: string;
    nombreCientifico?: string;
    origen?: string;
    descripcion?: string;
    // Optional per-item weights
    gross_weight?: number;
}

export interface GeneratedProformaData {
    // Calculated IDs
    id_carga: string;
    pi_number: string;
    row_number: number;

    // File/Folder info
    folder_name: string;
    user_initial: string;

    // Formatted Text Blocks for Doc
    importer_block: string;
    exporter_block: string;
    producer_block: string;
    trading_address: string;

    // Formatted Fields
    date_formatted: string; // DD-MM-YYYY (Proforma Date)
    ship_date_formatted: string; // Formatted Ship Date
    total_number: string;
    total_text: string;

    // Dynamic Product Replacements (qty_1, desc_1, etc.)
    replacements: Record<string, string>;

    // Structured data for HTML generation
    products: Array<{
        qty: string;
        description: string;
        unit_price: string;
        subtotal: string;
        cartons: string;
    }>;
}

// ==========================================
// HELPERS
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

function cleanEntityBlock(data: Contacto | undefined, isProducer: boolean): string {
    if (!data) return "";
    const lines: string[] = [];

    const empresa = data.empresa || getVal(data, "Brand", "Name", "Importer", "Producer", "Exporter");
    if (empresa) lines.push(empresa);

    const dir = data.direccion || getVal(data, "Address", "Billing Address");
    if (dir) lines.push(dir);

    const pais = data.pais || getVal(data, "Country");
    if (pais) lines.push(pais);

    // Common identifiers
    // Common identifiers
    const taxId = data.taxId || getVal(data, "Tax ID", "TaxId", "CUIT", "RUC", "VAT");
    if (taxId) lines.push(`Tax ID: ${taxId}`);

    if (isProducer) {
        const planta = data.nPlanta || getVal(data, "Planta", "Numero Planta", "Plant Number", "Plant #");
        if (planta) lines.push(`Plant Number: ${planta}`);

        const fda = data.fda || getVal(data, "FDA", "FDA Number");
        if (fda) lines.push(`FDA #: ${fda}`);
    }

    return lines.join("\n").trim();
}

function getUserInitial(email: string): string {
    const e = email.toLowerCase();
    if (e.includes("guillermo") || e.includes("gdm")) return "B";
    if (e.includes("gf") || e.includes("gonza")) return "G";
    if (e.includes("fdm") || e.includes("fede")) return "F";
    if (e.includes("rdm") || e.includes("rafa")) return "R";
    if (e.length > 0) return e.charAt(0).toUpperCase();
    return "X";
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
    if (Math.floor((num % 1000000) / 1000) > 0) str += convertHundreds(Math.floor((num % 1000000) / 1000)) + " THOUSAND "; // Fixed modulo logic

    const remainder = num % 1000;
    if (remainder > 0) { if (str !== "") str += "AND "; str += convertHundreds(remainder); }
    else if (str === "") { return "ZERO USD"; }

    str = str.trim();
    if (decimals > 0) str += ` AND ${decimals}/100`; else str += ` AND 00/100`;

    return str + " USD";
}

function smartDate(val: string): string {
    if (!val) return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const dt = new Date(val); // assumes YYYY-MM-DD from HTML input
    if (isNaN(dt.getTime())) return val;
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
}

// ==========================================
// CORE LOGIC EXPORT
// ==========================================

export function generateProformaData(
    input: OperationInput,
    existingRows: any[], // From Master Input, needed for ID calculation
    catalogProducts: any[] = [], // New argument
    catalogImporters: Contacto[],
    catalogExporters: Contacto[],
    catalogProducers: Contacto[]
): GeneratedProformaData {

    const date = new Date();
    const targetYear = date.getFullYear().toString().slice(-2); // "26"

    let idCorto = "";
    let nextRowNumber = 0;

    if (input.id_carga) {
        idCorto = input.id_carga;
        // We still need row number? Maybe not for this flow, but let's leave it 0 or calculate if needed.
        // Actually, for folder name generation, we just need idCorto.
    } else {
        let maxSeqForYear = 0;
        let maxGlobalRow = 0;

        // --- 1. SEQUENCE LOGIC ---
        existingRows.forEach(row => {
            const rNum = parseInt(row.row_number || "0");
            if (!isNaN(rNum) && rNum > maxGlobalRow) maxGlobalRow = rNum;

            // Robust ID extraction (check mapped 'id' property first, fallback to others if somehow unmapped)
            const idCarga = String(row.id || row.ID_Carga || row.id_carga || '');
            if (idCarga && typeof idCarga === 'string') {
                // Match patterns like "081-26", "81 - 26", "081/26", "001-26"
                const match = idCarga.trim().match(/^0*(\d+)\s*[-/]\s*(\d{2})$/)
                if (match && match[2] === targetYear) {
                    const seq = parseInt(match[1], 10)
                    if (seq > maxSeqForYear) maxSeqForYear = seq;
                } else if (idCarga.trim().includes('-' + targetYear)) {
                    // Fallback simpler match
                    const parts = idCarga.trim().split('-')
                    const seq = parseInt(parts[0], 10)
                    if (!isNaN(seq) && seq < 1000 && seq > maxSeqForYear) maxSeqForYear = seq;
                }
            }
        });

        const nextSeq = maxSeqForYear + 1;
        nextRowNumber = maxGlobalRow + 1;
        const seqString = String(nextSeq).padStart(3, '0');

        idCorto = `${seqString}-${targetYear}`;
    }

    const proformaN = `Pi ${idCorto}`;

    // --- 2. ENTITY BLOCKS ---

    const producerData = catalogProducers.find(c => c.empresa === input.producer_id || c.id === input.producer_id);
    const exporterData = catalogExporters.find(c => c.empresa === input.export_id || c.id === input.export_id);
    const importerData = catalogImporters.find(c => c.empresa === input.import_id || c.id === input.import_id);

    const producerBlock = cleanEntityBlock(producerData, true);
    const exporterBlock = cleanEntityBlock(exporterData, false);
    const importerBlock = cleanEntityBlock(importerData, false);

    // --- 3. TRADING ADDRESS ---

    let tradingAddress = "";
    const tradingLower = (input.trading || "").toLowerCase();
    if (tradingLower.includes("sm")) tradingAddress = "Hunkins Waterfront Plaza, Suite 556, Main Street, Charlestown, Nevis";
    else if (tradingLower.includes("seawind")) tradingAddress = "1001 Brickell Bay Drive, Suite 2700-G6, Miami (33131), FL, USA";

    // --- 4. PRODUCTS LOOP & WEIGHTS ---

    // Enrich all products with catalog data first to allow accurate lookahead
    const enrichedProducts = input.products.map(prod => {
        let catalogInfo: any = {};
        if (prod.id) {
            catalogInfo = catalogProducts.find(cp => cp.id === prod.id) || {};
        }
        return { ...catalogInfo, ...prod };
    });

    let totalCalculado = 0;
    let totalCartons = 0;
    let totalNetWeight = 0;
    let totalGrossWeight = 0;
    const replacements: Record<string, string> = {};
    const productsForArray: any[] = [];

    // Initialize slots as empty
    for (let i = 1; i <= 15; i++) {
        replacements[`qty_${i}`] = "";
        replacements[`desc_${i}`] = "";
        replacements[`unit_${i}`] = "";
        replacements[`sub_${i}`] = "";
        replacements[`ctns_${i}`] = "";
    }

    enrichedProducts.forEach((currentProd, idx) => {
        const qty = currentProd.qty || 0;
        const price = currentProd.price || 0;
        const subtotal = qty * price;

        if (!isNaN(subtotal)) totalCalculado += subtotal;
        totalNetWeight += qty;

        const especieRaw = currentProd.especie || "";
        const idRaw = (currentProd.id || "").toLowerCase();
        const isService = especieRaw.toLowerCase().includes("servicio") || especieRaw.toLowerCase().includes("service") || idRaw.includes("servicio");

        let description = "";
        let boxSize = "";
        let boxWeight = 0;

        if (isService) {
            description = currentProd.descripcion || especieRaw;
        } else {
            // N8N Logic for description: Species + Cuts + Calibre + Packing + Box Size
            const cuts = currentProd.corte || getVal(currentProd, "Cortes") || "";
            const calibre = currentProd.calibre || getVal(currentProd, "Calibre") || "";
            const packing = currentProd.packing || getVal(currentProd, "Packing") || "";
            boxSize = currentProd.tamanoCaja || getVal(currentProd, "Tamano de Caja", "box_size", "Box Size") || "";

            description = `${especieRaw} ${cuts} ${calibre}`.trim();
            if (packing) description += ` - ${packing}`;
            if (boxSize) description += ` ${boxSize}`;

            // Fallback: if description is still empty, use the descripcion field directly
            if (!description) {
                const descFallback = currentProd.descripcion || getVal(currentProd, "descripcion", "description", "Descripcion") || "";
                description = descFallback;
            }
        }

        // Cartons Calculation - N8N Logic
        let cartonsVal = "";
        if (boxSize) {
            const boxString = String(boxSize).toLowerCase().replace(/,/g, '.');

            if (boxString.includes('x')) {
                const parts = boxString.split('x');
                const a = parseFloat(parts[0]);
                const b = parseFloat(parts[1] || "0");
                if (!isNaN(a) && !isNaN(b)) boxWeight = a * b;
            } else {
                boxWeight = parseFloat(boxString);
            }

            if (boxWeight > 0 && qty > 0) {
                const numCartons = Math.floor(qty / boxWeight);
                cartonsVal = String(numCartons);
                totalCartons += numCartons;
            }
        }

        // Lookahead to correctly group descriptions - N8N Logic
        const nextProd = enrichedProducts[idx + 1];
        const esUltimoDelGrupo = !nextProd || (nextProd.especie !== currentProd.especie);

        if (!isService && esUltimoDelGrupo) {
            const sci = currentProd.nombreCientifico || getVal(currentProd, "Scientific Name", "Scientific_Name");
            const org = currentProd.origen || getVal(currentProd, "Origin");
            if (sci || org) {
                description += `\n[Scientific Name: ${sci || '-'} | Origin: ${org || '-'}]`;
            }
        }

        productsForArray.push({
            qty: qty.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
            description: description,
            unit_price: price.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            subtotal: subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            cartons: cartonsVal
        });
    });

    const totalText = numberToEnglishWords(totalCalculado);
    const incotermPort = `${input.incoterm} ${input.port_dest}`.trim().toUpperCase();

    // --- 5. FOLDER NAME ---
    const userInitial = getUserInitial(input.user_id);
    const cleanPort = input.port_dest.replace(/,/g, "").trim();
    const f_imp = input.import_id || "UNK";
    const f_exp = input.export_id || "UNK";
    const f_prod = input.producer_id || "UNK";
    const f_port = cleanPort || "Dest";

    const folderName = `${idCorto} / ${f_imp} / ${f_exp} / ${f_prod} / ${f_port} / ${userInitial}`;

    return {
        id_carga: idCorto,
        pi_number: proformaN,
        row_number: nextRowNumber,
        folder_name: folderName,
        user_initial: userInitial,
        importer_block: importerBlock,
        exporter_block: exporterBlock,
        producer_block: producerBlock,
        trading_address: tradingAddress,
        date_formatted: smartDate(new Date().toISOString()),
        ship_date_formatted: smartDate(input.ship_date),
        total_number: totalCalculado.toFixed(2),
        total_text: totalText,
        replacements: {
            'proforma_n': proformaN,
            'date': smartDate(new Date().toISOString()),
            'shipping_date': smartDate(input.ship_date),
            'port_loading': input.port_load,
            'port_destination': input.port_dest,
            'incoterm': input.incoterm,
            'incoterm_port': incotermPort,
            'shipping_line': input.ship_lane,
            'payment_terms': input.payment_terms,
            'trading': input.trading,
            'trading_address': tradingAddress,
            'brand': input.brand || '',
            'importer_block': importerBlock,
            'exporter_block': exporterBlock,
            'producer_block': producerBlock,
            'total_number': totalCalculado.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            'total_text': totalText,
            'total_net_weight': totalNetWeight.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            'total_gross_weight': (input.total_gross_weight || totalGrossWeight).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            'total_cartons': totalCartons.toLocaleString('es-AR', { minimumFractionDigits: 0 }),
            'notes': input.notasProforma || "No additional notes"
        },
        products: productsForArray
    };
}
