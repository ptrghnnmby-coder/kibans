// ================================================================
// GENERADOR MAESTRO DE PRODUCTOS V21 (COMPARACIÓN ESTRICTA 6 PUNTOS) 🛡️
// ================================================================

export interface ProductInput {
    especie: string
    cortes: string[]
    calibres: string[]
    packings: string[]
    origenes: string[]
    tamanoCaja?: string
    nombreCientifico?: string
    defaultTemp?: string
    defaultVent?: string
    defaultDrains?: string
    defaultHumidity?: string
}

export interface ExistingProduct {
    id: string
    especie: string
    corte: string
    calibre: string
    packing: string
    tamanoCaja: string
    origen: string
    nombreCientifico?: string
    descripcion?: string
    defaultTemp?: string
    defaultVent?: string
    defaultDrains?: string
    defaultHumidity?: string
}

// --- 1. CONFIGURACIÓN ---
const IGNORED_WORDS = [
    "RED", "BLACK", "WHITE", "BLUE", "PINK", "YELLOW",
    "FRESH", "FROZEN", "RAW", "COOKED",
    "WILD", "FARMED", "SOUTH", "NORTH", "ATLANTIC", "PACIFIC"
]

const CODIGOS_FORZADOS: Record<string, string> = {
    "PORGY": "PRG",
    "PORTION": "POR",
    "SALMON": "SAL",
    "SHRIMP": "SHR",
    "MERLUZA": "HKE"
}

// --- 3. HELPERS DE TEXTO ---
export const cleanStr = (str: any) => String(str || "").trim()
export const normalize = (str: any) => String(str || "").toLowerCase().replace(/\s+/g, '').trim()

export const titleCase = (str: string) => {
    if (!str) return ""
    return String(str).charAt(0).toUpperCase() + String(str).slice(1).toLowerCase()
}
export const upper = (str: any) => String(str || "").toUpperCase().trim()
const getConsonants = (str: string) => str.replace(/[AEIOU\s]/g, '')

// --- 4. FUNCIÓN MAESTRA DE COMPARACIÓN (EL CEREBRO) 🧠 ---
export const checkDuplicate = (existingItem: ExistingProduct, newItem: { Especie: string, Cortes: string, Origin: string, Packing: string, Calibre: string, Box: string }) => {
    // Definimos los 6 puntos de comparación
    const checkSpecie = normalize(existingItem.especie) === normalize(newItem.Especie)
    const checkCorte = normalize(existingItem.corte) === normalize(newItem.Cortes)
    const checkOrigin = normalize(existingItem.origen) === normalize(newItem.Origin)
    const checkPack = normalize(existingItem.packing) === normalize(newItem.Packing)
    const checkCal = normalize(existingItem.calibre) === normalize(newItem.Calibre)
    const checkBox = normalize(existingItem.tamanoCaja) === normalize(newItem.Box)

    // IMPORTANTE: Tienen que cumplirse TODOS (&&)
    return checkSpecie && checkCorte && checkOrigin && checkPack && checkCal && checkBox
}

// --- 5. GESTIÓN DE CÓDIGOS (GENERADOR) ---
function getCode(textoOriginal: string, usedCodes: Set<string>, codeMap: Record<string, string>): string {
    if (!textoOriginal) return "XXX"
    const textoFull = upper(textoOriginal)
    const keyFull = textoFull.toLowerCase()

    // 1. Check Map Cache
    if (codeMap[keyFull]) return codeMap[keyFull]

    // 2. Check Forced Codes
    if (CODIGOS_FORZADOS[textoFull]) {
        codeMap[keyFull] = CODIGOS_FORZADOS[textoFull]
        usedCodes.add(CODIGOS_FORZADOS[textoFull])
        return CODIGOS_FORZADOS[textoFull]
    }

    // 3. Clean Text
    let rawClean = textoFull
    IGNORED_WORDS.forEach(word => rawClean = rawClean.replace(new RegExp(`\\b${word}\\b`, 'g'), '').trim())
    if (rawClean.length < 1) rawClean = textoFull
    const keyClean = rawClean.toLowerCase()

    if (codeMap[keyClean]) return codeMap[keyClean]

    // Re-check Forced after clean
    if (CODIGOS_FORZADOS[rawClean]) {
        const code = CODIGOS_FORZADOS[rawClean]
        codeMap[keyFull] = code
        codeMap[keyClean] = code
        usedCodes.add(code)
        return code
    }

    // 4. Generate Code
    const lettersOnly = rawClean.replace(/[^A-Z]/g, '')
    const candidateA = lettersOnly.substring(0, 3).padEnd(3, 'X')
    const candidateB = getConsonants(lettersOnly).substring(0, 3).padEnd(3, 'X')
    let finalCode = ""

    if (!usedCodes.has(candidateA)) finalCode = candidateA
    else if (!usedCodes.has(candidateB) && candidateB.length === 3) finalCode = candidateB
    else {
        const base = lettersOnly.substring(0, 2)
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        for (const char of alphabet) {
            if (!usedCodes.has(base + char)) { finalCode = base + char; break }
        }
        if (!finalCode) finalCode = lettersOnly.substring(0, 1) + "XX"
    }

    // 5. Update State
    usedCodes.add(finalCode)
    codeMap[keyFull] = finalCode
    codeMap[keyClean] = finalCode
    return finalCode
}

export function generateProductBatch(
    input: ProductInput,
    dbProductos: ExistingProduct[]
) {
    const finalOutputList: any[] = []

    // --- 2. PREPARACIÓN ---
    const usedCodes = new Set<string>()
    const codeMap: Record<string, string> = {}

    // Extract codes from DB IDs to populate usedCodes
    dbProductos.forEach(p => {
        if (p.id) {
            const parts = p.id.split('-')
            if (parts.length >= 4) {
                parts.slice(0, 4).forEach(c => usedCodes.add(c))
            }
        }
    })

    // --- 6. BUCLE PRINCIPAL DE PRODUCTOS ---
    const inEspecie = titleCase(input.especie)
    const inBox = input.tamanoCaja || "Bulk"
    const inSciName = input.nombreCientifico || ""

    const inCortes = input.cortes
    const inTalles = input.calibres
    const inOrigenes = input.origenes
    const inPackings = input.packings

    for (const org of inOrigenes) {
        for (const pck of inPackings) {
            for (const corteRaw of inCortes) {
                const corte = cleanStr(corteRaw)
                if (!corte) continue

                const corteDisplay = titleCase(corte)
                const pckDisplay = upper(pck)
                const orgDisplay = titleCase(org)

                for (const talleRaw of inTalles) {
                    const talle = cleanStr(talleRaw)

                    const candidateItem = {
                        Especie: inEspecie,
                        Cortes: corteDisplay,
                        Origin: orgDisplay,
                        Packing: pckDisplay,
                        Calibre: talle,
                        Box: cleanStr(inBox)
                    }

                    // 🔍 BUSCAMOS EN LA DB USANDO LA FUNCIÓN ESTRICTA
                    const productoExistente = dbProductos.find(dbItem => checkDuplicate(dbItem, candidateItem))

                    // Also check if we already added it in this batch (prevent double addition within same request)
                    const productoEnBatch = finalOutputList.find(item => {
                        // We need to map item back to candidateItem shape for checkDuplicate check?
                        // Or just compare fields directly.
                        return normalize(item.especie) === normalize(candidateItem.Especie) &&
                            normalize(item.corte) === normalize(candidateItem.Cortes) &&
                            normalize(item.origen) === normalize(candidateItem.Origin) &&
                            normalize(item.packing) === normalize(candidateItem.Packing) &&
                            normalize(item.calibre) === normalize(candidateItem.Calibre) &&
                            normalize(item.tamanoCaja) === normalize(candidateItem.Box)
                    })

                    if (productoExistente) {
                        finalOutputList.push({
                            ...productoExistente,
                            esNuevo: false,
                            status_msg: "EXISTENTE"
                        })
                    } else if (productoEnBatch) {
                        // Already added in this batch, skip or mark as existing in batch
                        finalOutputList.push({
                            ...productoEnBatch,
                            esNuevo: false, // It's "new" but already processed in this batch
                            status_msg: "DUPLICADO_BATCH"
                        })
                    } else {
                        // --- CASO: NUEVO ---
                        const cSpc = getCode(inEspecie, usedCodes, codeMap)
                        const cCut = getCode(corte, usedCodes, codeMap)
                        const cOrg = getCode(org, usedCodes, codeMap)
                        const cPck = getCode(pck, usedCodes, codeMap)
                        const prefix = `${cSpc}-${cCut}-${cOrg}-${cPck}`

                        // Cálculo de secuencia
                        const matchesDB = dbProductos.map(p => p.id || "").filter(id => id.startsWith(prefix))

                        // Find max seq in DB
                        let maxSeq = 0
                        matchesDB.forEach(id => {
                            const last = id.split('-').pop()
                            const num = parseInt(last || "0")
                            if (!isNaN(num) && num > maxSeq) maxSeq = num
                        })

                        // Check Current Batch matches (to increment sequence locally)
                        const matchesBatch = finalOutputList.filter(x => x.esNuevo && x.seafoodproduct_id && x.seafoodproduct_id.startsWith(prefix)).length

                        const seqStr = (maxSeq + 1 + matchesBatch).toString().padStart(3, '0')
                        const finalID = `${prefix}-${seqStr}`

                        const desc = `${inEspecie} ${corteDisplay} - ${pckDisplay} (${talle}) - ${inBox}`

                        finalOutputList.push({
                            id: finalID,
                            seafoodproduct_id: finalID,
                            especie: inEspecie,
                            corte: corteDisplay,
                            calibre: talle,
                            packing: pckDisplay,
                            tamanoCaja: inBox,
                            origen: orgDisplay,
                            nombreCientifico: inSciName,
                            descripcion: desc,
                            esNuevo: true,
                            status_msg: "CREADO",
                            defaultTemp: input.defaultTemp,
                            defaultVent: input.defaultVent,
                            defaultDrains: input.defaultDrains,
                            defaultHumidity: input.defaultHumidity
                        })
                    }
                }
            }
        }
    }

    return finalOutputList
}
