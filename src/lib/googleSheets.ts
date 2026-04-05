import { google } from 'googleapis'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth'

const sheets = google.sheets({ version: 'v4' })
const drive = google.drive({ version: 'v3' })

// Estrategia de Autenticación Híbrida
// 1. Si existe Refresh Token -> OAuth 2.0 (Actúa como usuario)
// 2. Si no -> Service Account (Actúa como sistema)

export const getAuthClient = async () => {
    if (process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_CLIENT_ID) {
        // Estrategia 1: OAuth 2.0 (User Impersonation)
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.NEXTAUTH_URL || 'http://localhost:3000'
        )
        oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        })
        return oauth2Client
    } else {
        // Estrategia 2: Service Account (Fallback / Domain-Wide Delegation)
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/^"|"$/g, ''),
            },
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/documents'
            ],
            clientOptions: process.env.GOOGLE_IMPERSONATE_EMAIL ? {
                subject: process.env.GOOGLE_IMPERSONATE_EMAIL
            } : undefined
        })
        return await auth.getClient()
    }
}

// IDs de Planillas
export const MASTER_SPREADSHEET_ID = process.env.SHEET_MASTER_ID || '1TmEDhSznW0XgUUETm2aP_0g_rDopW7ZVTbxm3QavDro';
const CONTACTS_SPREADSHEET_ID = process.env.SHEET_CONTACTS_ID || '155y_ulSsCpBx1Lm2x5pHZ8MSFttrYD44tQGUPk73VhI';
const PRODUCTS_SPREADSHEET_ID = process.env.SHEET_PRODUCTS_ID || '1ou2hHA5yB29fCF8smO0xC1PlboDlTgiBu3ryNrf1n8w';
const NOTES_SPREADSHEET_ID = process.env.SHEET_NOTES_ID || '18ozoqFzOXa56OdTqVE8t42A3i3c1tQ6Gr7SZH5ua3qk';
const LEADS_SPREADSHEET_ID = process.env.SHEET_LEADS_ID || '1TmEDhSznW0XgUUETm2aP_0g_rDopW7ZVTbxm3QavDro'; // Using Master for now but pointing to it explicitly
const PROFORMAS_FOLDER_ID = process.env.PROFORMAS_FOLDER_ID || '1_0X0Z1v_N0u_pX-qO6D2y_I_8_I_I_I';
const CODIGOS_SPREADSHEET_ID = process.env.SHEET_CODIGOS_ID || '1AIUM631IYAquGMneb1LSa30s8I3pCGIrLv02sBqFaVE';
export const CLAIMS_SPREADSHEET_ID = MASTER_SPREADSHEET_ID;

export const TABS = {
    masterInput: 'Master Input',
    contacts: 'Entidades',
    products: 'List of Products',
    notes: 'Hoja 1', // Updated from 'Notas' to match actual sheet
    cashFlow: 'CashFlow', // New Tab
    cashFlowHistory: 'CashFlow_Historial', // Archivo histórico
    cashFlowHistorial: 'CashFlow_Historial', // Alias for cashFlowHistory
    courier: 'Courier', // GID 330610536
    history: 'Historial',
    claims: 'Claims',
    fletes: 'Fletes',
    crmInteractions: 'CRM_Interacciones',
    agenda: 'Agenda', // Tab that stores agenda activities
    inspecciones: 'Inspecciones',
    leads: 'Leads',
    teamMessages: 'Chat_Equipo',
    trackingCache: 'Tracking_Cache',
    gastos: 'Gastos_Generales', // New Tab for fixed/variable generic expenses
}

import { Operacion, Contacto, USER_MAP, getResponsableName, calculateFolderName, Note, AgendaItem, CashFlowTransaction, Claim, Flete, Lead, TeamMessage, QCInspection, LeadStatus, GastoGeneral } from './sheets-types'
import { AmountSchema } from './schemas'
import { parseNumeric } from './numbers'

// --- METADATA CACHE SYSTEM ---
const METADATA_CACHE: Record<string, { data: any, timestamp: number }> = {}
const METADATA_TTL = 2 * 60 * 1000 // 2 minutes (lower for faster structural updates)

async function getSpreadsheetMetadata(spreadsheetId: string) {
    const now = Date.now()
    if (METADATA_CACHE[spreadsheetId] && (now - METADATA_CACHE[spreadsheetId].timestamp < METADATA_TTL)) {
        return METADATA_CACHE[spreadsheetId].data
    }

    try {
        const authClient = await getAuthClient()
        const response = await sheets.spreadsheets.get({
            auth: authClient as any,
            spreadsheetId
        })
        METADATA_CACHE[spreadsheetId] = { data: response.data, timestamp: now }
        return response.data
    } catch (error) {
        console.error(`Error fetching metadata for ${spreadsheetId}:`, error)
        return METADATA_CACHE[spreadsheetId]?.data || null
    }
}

/**
 * Resuelve el nombre real de la pestaña de Master Input en la planilla.
 * Útil para manejar typos como "Master Imput" o variaciones como "Proforma Master Input".
 */
export async function resolveMasterTabName(): Promise<string> {
    try {
        const meta = await getSpreadsheetMetadata(MASTER_SPREADSHEET_ID)
        const sheetTitles = meta?.sheets?.map((s: any) => s.properties?.title || '') || []

        let result = 'Master Imput' // Real tab name in the spreadsheet (has typo)

        // Prioridad: 1. Typo real 'Master Imput', 2. 'Master Input', 3. Contiene 'master'
        if (sheetTitles.includes('Master Imput')) result = 'Master Imput'
        else if (sheetTitles.includes('Master Input')) result = 'Master Input'
        else if (sheetTitles.includes('Proforma Master Input')) result = 'Proforma Master Input'
        else if (sheetTitles.length > 0) {
            const candidates = sheetTitles.filter((t: string) =>
                t.toLowerCase().includes('master')
            )
            if (candidates.length > 0) result = candidates[0]
        }

        return result
    } catch (error) {
        console.error('Error resolving master tab name:', error)
        return 'Master Imput' // Fallback to the real tab name
    }
}

// === CASH FLOW ===
const CASHFLOW_SPREADSHEET_ID = MASTER_SPREADSHEET_ID // Stored in same sheet for now

function parseAmount(val: any): number {
    const result = AmountSchema.safeParse(val);
    return result.success ? result.data : 0;
}

function formatSerialDate(serial: any): string {
    if (!serial || isNaN(serial)) return String(serial || '')
    const n = Number(serial)
    if (n < 30000 || n > 60000) return String(serial)

    // Excel dates are number of days since Dec 30, 1899
    const date = new Date(Math.round((n - 25569) * 86400 * 1000))
    return date.toISOString().split('T')[0]
}

/**
 * Normalizes various date formats into YYYY-MM-DD.
 * Handles:
 * - DD/MM/YYYY
 * - YYYY-MM-DD
 * - Excel Serial Numbers (46xxx)
 * - ISO strings
 */
export function normalizeDate(val: any): string {
    if (!val) return ''
    const str = String(val).trim()
    if (!str || str === '?' || str.toLowerCase() === 'pendiente') return ''

    // 1. Handle Excel Serial Numbers
    if (/^\d{5}$/.test(str)) {
        return formatSerialDate(str)
    }

    // 2. Handle DD/MM/YYYY
    const ddmmyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (ddmmyyyy) {
        const [_, day, month, year] = ddmmyyyy
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    // 3. Handle YYYY-MM-DD
    const yyyymmdd = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (yyyymmdd) {
        const [_, year, month, day] = yyyymmdd
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    // 4. Try native Date parsing for other formats
    try {
        const d = new Date(str)
        if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0]
        }
    } catch (e) {
        // Fallback to original
    }

    return str
}

/**
 * Formats a date string for display as DD/MM/YYYY.
 * Accepts YYYY-MM-DD, DD/MM/YYYY, Excel serial numbers, ISO strings.
 * Returns '-' if the date is empty/invalid.
 */
export function formatDisplayDate(val: string | undefined | null): string {
    if (!val) return '-'
    // First normalize to YYYY-MM-DD
    const normalized = normalizeDate(val)
    if (!normalized) return '-'
    // If already DD/MM/YYYY (shouldn't happen after normalizeDate, but just in case)
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(normalized)) return normalized
    // Convert YYYY-MM-DD → DD/MM/YYYY
    const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
        return `${match[3]}/${match[2]}/${match[1]}`
    }
    return normalized || '-'
}

/**
 * Normaliza números de teléfono para WhatsApp y evita errores en Google Sheets.
 * El apóstrofe inicial garantiza que Sheets lo trate como texto aunque empiece con '+'.
 */
function normalizePhoneNumber(phone: string): string {
    if (!phone) return ''
    // Eliminar todo lo que no sea número o el signo +
    let cleaned = phone.replace(/[^\d+]/g, '')
    // Si tiene +, anteponer apóstrofe para Google Sheets (formato texto forzado)
    if (cleaned.startsWith('+')) {
        return `'${cleaned}`
    }
    return cleaned
}

export async function getCashFlowByOperation(operationId: string, forceFresh: boolean = false): Promise<CashFlowTransaction[]> {
    try {
        console.log(`[getCashFlowByOperation] Fetching movements for ID: "${operationId}" (forceFresh: ${forceFresh})`);
        const normalizeOpId = (id: string) => {
            const parts = String(id || '')
                .trim()
                .toLowerCase()
                .split(/[-.\/\s]/)
                .map(p => p.replace(/^0+/, ''))
                .filter(p => !!p);
            
            if (parts.length >= 2) {
                const yearPart = parts[parts.length - 1];
                if (yearPart.length === 4 && yearPart.startsWith('20')) {
                    parts[parts.length - 1] = yearPart.substring(2);
                }
            }
            return parts.join('-');
        };
        const searchIdNorm = normalizeOpId(operationId);

        const processTab = async (sourceTab: string) => {
            const rows = await getSheetData(CASHFLOW_SPREADSHEET_ID, `${sourceTab}!A:Z`, forceFresh);
            if (rows.length === 0) return [];

            // 1. DYNAMIC HEADER DETECTION
            // Users might add titles or empty rows. We scan the first 20 rows for a row containing 'id_carga'.
            let headerRowIndex = 0;
            const possibleIdHeaders = ['id_carga', 'id carga', 'idcarga', 'idc', 'operacion'];

            for (let i = 0; i < Math.min(rows.length, 20); i++) {
                const row = rows[i].map(c => String(c || '').trim().toLowerCase());
                if (possibleIdHeaders.some(h => row.includes(h))) {
                    headerRowIndex = i;
                    break;
                }
            }

            const headers = rows[headerRowIndex].map(h => String(h || '').trim().toLowerCase());
            // Helper to find column index with multiple aliases
            const findIdx = (...aliases: string[]) => {
                for (const alias of aliases) {
                    const idx = headers.findIndex(h => h === alias.toLowerCase());
                    if (idx !== -1) return idx;
                }
                return -1;
            };

            const idIdx = findIdx(...possibleIdHeaders);
            if (idIdx === -1) {
                console.warn(`[CashFlow] ID_Carga column not found in headers of tab "${sourceTab}"`);
                return [];
            }

            const results = rows.slice(headerRowIndex + 1)
                .filter(row => {
                    const rawRowId = (row[idIdx] || '').trim();
                    if (!rawRowId) return false;
                    const rowIdNorm = normalizeOpId(rawRowId);

                    // Exact match on the normalized string
                    const match = searchIdNorm !== '' && searchIdNorm === rowIdNorm;
                    return match;
                })
                .map(row => {
                    const getVal = (...aliases: string[]) => {
                        const idx = findIdx(...aliases);
                        return idx !== -1 ? (row[idx] || '') : '';
                    };

                    const rawDate = getVal('fecha', 'f. doc', 'date');
                    const rawDueDate = getVal('fecha para agendar', 'agendado/pago', 'due date', 'fecha para...');

                    return {
                        id: getVal('id'),
                        operationId: getVal('id_carga', 'id carga', 'idcarga', 'operacion'),
                        date: normalizeDate(rawDate),
                        type: (getVal('tipo', 'type') || 'EGRESO').toUpperCase() as 'INGRESO' | 'EGRESO' | 'INFORMATIVO',
                        category: getVal('categoria', 'category'),
                        description: getVal('descripcion', 'description'),
                        amount: parseAmount(getVal('# monto', 'monto', 'amount', 'importe', 'valor')),
                        status: (getVal('estado', 'status') || 'PENDIENTE').toUpperCase() as 'PENDIENTE' | 'PAGADO',
                        dueDate: normalizeDate(rawDueDate),
                        timestamp: getVal('timestamp')
                    };
                });

            return results;
        };

        // 1. Try Active CashFlow
        let transactions = await processTab(TABS.cashFlow);

        // 2. Also check History if none found or always? 
        // User instruction: "debería aparecer... todos los demás movimientos".
        // Let's combine if needed, or stick to the previous "if empty check history"
        if (transactions.length === 0) {
            const historyTransactions = await processTab(TABS.cashFlowHistory);
            if (historyTransactions.length > 0) {
                transactions = historyTransactions;
            }
        }

        return transactions;
    } catch (error) {
        console.error('[getCashFlowByOperation] Error:', error);
        return [];
    }
}

export async function getAllCashFlowTransactions(): Promise<CashFlowTransaction[]> {
    try {
        const tabName = TABS.cashFlow
        const rows = await getSheetData(CASHFLOW_SPREADSHEET_ID, `${tabName}!A:Z`, true)

        if (rows.length === 0) return []

        // 1. DYNAMIC HEADER DETECTION
        let headerRowIndex = 0;
        const possibleIdHeaders = ['id_carga', 'id carga', 'idcarga', 'idc', 'operacion'];

        for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const row = rows[i].map(c => String(c || '').trim().toLowerCase());
            if (possibleIdHeaders.some(h => row.includes(h))) {
                headerRowIndex = i;
                break;
            }
        }

        const headers = rows[headerRowIndex].map(h => String(h || '').trim().toLowerCase());

        const findIdx = (...aliases: string[]) => {
            for (const alias of aliases) {
                const idx = headers.findIndex(h => h === alias.toLowerCase());
                if (idx !== -1) return idx;
            }
            return -1;
        };

        const transactions = rows.slice(headerRowIndex + 1).map(row => {
            const getVal = (...aliases: string[]) => {
                const idx = findIdx(...aliases);
                return idx !== -1 ? (row[idx] || '') : '';
            };

            const rawDate = getVal('fecha', 'f. doc', 'date');
            const rawDueDate = getVal('fecha para agendar', 'agendado/pago', 'due date', 'fecha para...');

            return {
                id: getVal('id'),
                operationId: getVal('id_carga', 'id carga', 'idcarga', 'operacion'),
                date: normalizeDate(rawDate),
                type: (getVal('tipo', 'type') || 'EGRESO').toUpperCase() as 'INGRESO' | 'EGRESO' | 'INFORMATIVO',
                category: getVal('categoria', 'category'),
                description: getVal('descripcion', 'description'),
                amount: parseAmount(getVal('# monto', 'monto', 'amount', 'importe', 'valor')),
                status: (getVal('estado', 'status') || 'PENDIENTE').toUpperCase() as 'PENDIENTE' | 'PAGADO',
                dueDate: normalizeDate(rawDueDate),
                timestamp: getVal('timestamp')
            }
        })

        return transactions
    } catch (error) {
        console.error('Error fetching all cash flow transactions:', error)
        return []
    }
}

/**
 * Same as getAllCashFlowTransactions but reads from CashFlow_Historial tab.
 * Used by analytics to enrich liquidated operations with their real financial data.
 */
export async function getAllCashFlowHistoricalTransactions(): Promise<CashFlowTransaction[]> {
    try {
        const tabName = TABS.cashFlowHistory
        const rows = await getSheetData(CASHFLOW_SPREADSHEET_ID, `${tabName}!A:Z`, true)

        if (rows.length === 0) return []

        let headerRowIndex = 0
        const possibleIdHeaders = ['id_carga', 'id carga', 'idcarga', 'idc', 'operacion']
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const row = rows[i].map(c => String(c || '').trim().toLowerCase())
            if (possibleIdHeaders.some(h => row.includes(h))) {
                headerRowIndex = i
                break
            }
        }

        const headers = rows[headerRowIndex].map(h => String(h || '').trim().toLowerCase())
        const findIdx = (...aliases: string[]) => {
            for (const alias of aliases) {
                const idx = headers.findIndex(h => h === alias.toLowerCase())
                if (idx !== -1) return idx
            }
            return -1
        }

        const transactions = rows.slice(headerRowIndex + 1).map(row => {
            const getVal = (...aliases: string[]) => {
                const idx = findIdx(...aliases)
                return idx !== -1 ? (row[idx] || '') : ''
            }
            const rawDate = getVal('fecha', 'f. doc', 'date')
            const rawDueDate = getVal('fecha para agendar', 'agendado/pago', 'due date', 'fecha para...')
            return {
                id: getVal('id', 'uuid', 'txid') || `BY-CONTENT:${getVal('id_carga', 'id carga', 'idcarga', 'operacion')}|${rawDate}|${getVal('# monto', 'monto', 'amount', 'importe', 'valor')}|${getVal('tipo', 'type')}`,
                operationId: getVal('id_carga', 'id carga', 'idcarga', 'operacion'),
                date: normalizeDate(rawDate),
                type: (getVal('tipo', 'type') || 'EGRESO').toUpperCase() as 'INGRESO' | 'EGRESO' | 'INFORMATIVO',
                category: getVal('categoria', 'category'),
                description: getVal('descripcion', 'description'),
                amount: parseAmount(getVal('# monto', 'monto', 'amount', 'importe', 'valor')),
                status: (getVal('estado', 'status') || 'PAGADO').toUpperCase() as 'PENDIENTE' | 'PAGADO',
                dueDate: normalizeDate(rawDueDate),
                timestamp: getVal('timestamp')
            }
        }).filter(tx => tx.operationId)

        return transactions
    } catch (error) {
        console.error('Error fetching CashFlow_Historial transactions:', error)
        return []
    }
}

export async function addCashFlowTransaction(tx: Omit<CashFlowTransaction, 'id' | 'timestamp'>) {
    try {
        const tabName = TABS.cashFlow
        let data = await getSheetData(CASHFLOW_SPREADSHEET_ID, `${tabName}!A:Z`, true);

        // DYNAMIC HEADER DETECTION — same logic as deleteCashFlowTransaction / updateCashFlowTransaction
        // The CashFlow sheet may have title rows before the actual column headers.
        // Scan up to 20 rows to find the row that contains a recognised ID column.
        let headerRowIndex = 0
        const possibleIdColHeaders = ['id_carga', 'id carga', 'idcarga', 'operacion']
        if (data.length > 0) {
            for (let i = 0; i < Math.min(data.length, 20); i++) {
                const row = data[i].map(c => String(c || '').trim().toLowerCase())
                if (possibleIdColHeaders.some(h => row.includes(h))) {
                    headerRowIndex = i
                    break
                }
            }
        }

        let headers: string[] = []
        if (data.length > 0) {
            headers = data[headerRowIndex].map(h => String(h || '').trim())
        } else {
            // Sheet is completely empty — write headers first
            headers = ['ID', 'ID_Carga', 'Fecha', 'Tipo', 'Categoria', 'Descripcion', '# Monto', 'Estado', 'Timestamp', 'Fecha para agendar']
            await appendRow(CASHFLOW_SPREADSHEET_ID, `${tabName}!A:Z`, headers)
        }



        // Generación de ID robusta basada en timestamp y random
        const newId = `TX-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        const timestamp = new Date().toISOString()

        const newRow = new Array(headers.length).fill('')
        const setVal = (val: any, ...aliases: string[]) => {
            for (const alias of aliases) {
                const idx = headers.findIndex(h => h.toLowerCase() === alias.toLowerCase())
                if (idx !== -1) {
                    newRow[idx] = String(val)
                    return
                }
            }
        }

        const safeAmount = isNaN(Number(tx.amount)) ? 0 : Number(tx.amount)

        setVal(newId, 'id')
        setVal(tx.operationId, 'id_carga', 'id carga', 'idcarga')
        setVal(tx.date, 'fecha')
        setVal(tx.type, 'tipo')
        setVal(tx.category, 'categoria')
        setVal(tx.description, 'descripcion')
        setVal(safeAmount, '# monto', 'monto') // Matched actual sheet header
        setVal(tx.status, 'estado')
        setVal(timestamp, 'timestamp')
        setVal(tx.dueDate || tx.date, 'fecha para agendar', 'dueDate', 'fecha_vencimiento')

        await appendRow(CASHFLOW_SPREADSHEET_ID, `${tabName}!A:Z`, newRow)

        // Bidirectional Sync: If this is a Flete transaction, update the operation
        if (tx.category === 'Flete') {
            try {
                // skipSync: true prevents infinite recursion (updateOperation -> syncCashFlow -> addCashFlowTransaction -> updateOperation)
                await updateOperation(tx.operationId, { freightValue: String(tx.amount) }, undefined, { skipSync: true })
            } catch (syncError) {
                console.error('[addCashFlowTransaction] Bidirectional sync failed:', syncError)
            }
        }

        return { ...tx, id: newId, timestamp }
    } catch (error) {
        console.error('Error adding cash flow transaction:', error)
        throw error
    }
}


export async function deleteCashFlowTransaction(txId: string) {
    try {
        const tabName = TABS.cashFlow
        const spreadsheetId = CASHFLOW_SPREADSHEET_ID

        // 1. Find the row index first
        const data = await getSheetData(spreadsheetId, `${tabName}!A:Z`, true)

        if (!data || data.length < 2) throw new Error('No transactions found or empty sheet')

        // DYNAMIC HEADER DETECTION — scan up to 20 rows for the header row
        let headerRowIndex = 0
        const possibleIdHeaders = ['id', 'txid', 'uuid']
        for (let i = 0; i < Math.min(data.length, 20); i++) {
            const row = data[i].map(c => String(c || '').trim().toLowerCase())
            if (possibleIdHeaders.some(h => row.includes(h))) {
                headerRowIndex = i
                break
            }
        }

        const headers = data[headerRowIndex].map(h => String(h || '').trim().toLowerCase())
        const idIdx = headers.findIndex(h => possibleIdHeaders.includes(h))

        if (idIdx === -1) {
            console.error('[deleteCashFlowTransaction] Header "ID" not found. Headers:', headers)
            throw new Error('ID column not found in CashFlow tab')
        }

        let rowIndex = -1
        let activeTabName = tabName
        for (let i = headerRowIndex + 1; i < data.length; i++) {
            if (data[i][idIdx] && data[i][idIdx].trim() === txId.trim()) {
                rowIndex = i // 0-based index relative to data array
                break
            }
        }

        if (rowIndex === -1) {
            // Try historical tab
            activeTabName = TABS.cashFlowHistorial
            const histData = await getSheetData(spreadsheetId, `${activeTabName}!A:Z`, true)
            if (histData && histData.length >= 2) {
                let histHeaderRowIndex = 0
                for (let i = 0; i < Math.min(histData.length, 20); i++) {
                    const row = histData[i].map(c => String(c || '').trim().toLowerCase())
                    if (possibleIdHeaders.some(h => row.includes(h))) {
                        histHeaderRowIndex = i
                        break
                    }
                }
                const histHeaders = histData[histHeaderRowIndex].map(h => String(h || '').trim().toLowerCase())
                const histIdIdx = histHeaders.findIndex(h => possibleIdHeaders.includes(h))
                
                if (txId.startsWith('BY-CONTENT:')) {
                    const [targetOp, targetDate, targetAmount, targetType] = txId.replace('BY-CONTENT:', '').split('|')
                    const opIdx = histHeaders.findIndex(h => ['id_carga', 'id carga', 'idcarga', 'operacion'].includes(h))
                    const dateIdx = histHeaders.findIndex(h => ['fecha', 'f. doc', 'date'].includes(h))
                    const amountIdx = histHeaders.findIndex(h => ['# monto', 'monto', 'amount', 'importe', 'valor'].includes(h))
                    const typeIdx = histHeaders.findIndex(h => ['tipo', 'type'].includes(h))
                    
                    if (opIdx !== -1 && dateIdx !== -1 && amountIdx !== -1) {
                        for (let i = histHeaderRowIndex + 1; i < histData.length; i++) {
                            const rOp = String(histData[i][opIdx] || '').trim()
                            const rDate = String(histData[i][dateIdx] || '').trim()
                            const rAmount = String(histData[i][amountIdx] || '').trim()
                            const rType = typeIdx !== -1 ? String(histData[i][typeIdx] || '').trim() : ''
                            
                            if (rOp === targetOp && rDate === targetDate && rAmount === targetAmount && (typeIdx === -1 || rType.toUpperCase() === (targetType || '').toUpperCase())) {
                                rowIndex = i
                                break
                            }
                        }
                    }
                } else if (histIdIdx !== -1) {
                    for (let i = histHeaderRowIndex + 1; i < histData.length; i++) {
                        if (histData[i][histIdIdx] && histData[i][histIdIdx].trim() === txId.trim()) {
                            rowIndex = i
                            break
                        }
                    }
                }
            }
        }

        if (rowIndex === -1) {
            console.error(`[deleteCashFlowTransaction] Transaction ${txId} not found in any sheet.`)
            throw new Error(`Transaction ${txId} not found in sheet`)
        }

        // 2. Fetch Spreadsheet Metadata to get sheetId
        const meta = await getSpreadsheetMetadata(spreadsheetId)
        const sheet = meta?.sheets?.find((s: any) => s.properties?.title === activeTabName)
        if (!sheet || !sheet.properties?.sheetId) {
            throw new Error(`Sheet with name "${tabName}" not found in spreadsheet`)
        }
        const sheetId = sheet.properties.sheetId

        // 3. Delete the row
        // rowIndex is 0-based index in the data array.
        // data[rowIndex] corresponds to sheet row (rowIndex + 1).
        // deleteDimension startIndex is 0-based inclusive, so startIndex = rowIndex.
        const authClient = await getAuthClient()
        await sheets.spreadsheets.batchUpdate({
            auth: authClient as any,
            spreadsheetId,
            requestBody: {
                requests: [
                    {
                        deleteDimension: {
                            range: {
                                sheetId,
                                dimension: 'ROWS',
                                startIndex: rowIndex,
                                endIndex: rowIndex + 1
                            }
                        }
                    }
                ]
            }
        })

        // Invalidate cache
        invalidateCache(spreadsheetId)

        return true
    } catch (error) {
        console.error('Error deleting cash flow transaction:', error)
        throw error
    }
}


export async function updateCashFlowTransaction(txId: string, updates: Partial<Omit<CashFlowTransaction, 'id' | 'operationId' | 'timestamp'>>, skipBidirectionalSync = false) {
    try {
        const tabName = TABS.cashFlow
        const spreadsheetId = CASHFLOW_SPREADSHEET_ID

        let activeTabName = tabName
        let data = await getSheetData(spreadsheetId, `${activeTabName}!A:Z`, true)

        if (!data || data.length < 2) throw new Error('No transactions found')

        // DYNAMIC HEADER DETECTION — scan up to 20 rows for the header row
        let headerRowIndex = 0
        const possibleIdHeaders = ['id', 'txid', 'uuid']
        for (let i = 0; i < Math.min(data.length, 20); i++) {
            const row = data[i].map(c => String(c || '').trim().toLowerCase())
            if (possibleIdHeaders.some(h => row.includes(h))) {
                headerRowIndex = i
                break
            }
        }

        let headers = data[headerRowIndex].map(h => String(h || '').trim().toLowerCase())

        // Helper to find column index with aliases
        let findCol = (...aliases: string[]) => {
            for (const alias of aliases) {
                const idx = headers.indexOf(alias.toLowerCase())
                if (idx !== -1) return idx
            }
            return -1
        }

        let idIdx = findCol('id', 'txid', 'uuid')

        if (idIdx === -1) throw new Error('ID column not found in CashFlow tab')

        let dataRowIndex = -1
        let originalRow: string[] = []
        
        if (txId.startsWith('BY-CONTENT:')) {
            const [targetOp, targetDate, targetAmount, targetType] = txId.replace('BY-CONTENT:', '').split('|')
            for (let i = headerRowIndex + 1; i < data.length; i++) {
                const rOp = String(data[i][findCol('id_carga', 'id carga', 'idcarga', 'operacion')] || '').trim()
                const rDate = String(data[i][findCol('fecha', 'f. doc', 'date')] || '').trim()
                const rAmount = String(data[i][findCol('# monto', 'monto', 'amount', 'importe', 'valor')] || '').trim()
                const typeCol = findCol('tipo', 'type')
                const rType = typeCol !== -1 ? String(data[i][typeCol] || '').trim() : ''
                
                if (rOp === targetOp && rDate === targetDate && rAmount === targetAmount && (typeCol === -1 || rType.toUpperCase() === (targetType || '').toUpperCase())) {
                    dataRowIndex = i
                    originalRow = data[i]
                    break
                }
            }
        } else {
            for (let i = headerRowIndex + 1; i < data.length; i++) {
                if ((data[i][idIdx] || '').trim() === txId.trim()) {
                    dataRowIndex = i
                    originalRow = data[i]
                    break
                }
            }
        }

        if (dataRowIndex === -1) {
            // Check historical
            activeTabName = TABS.cashFlowHistorial
            data = await getSheetData(spreadsheetId, `${activeTabName}!A:Z`, true)
            if (data && data.length >= 2) {
                headerRowIndex = 0
                for (let i = 0; i < Math.min(data.length, 20); i++) {
                    const row = data[i].map(c => String(c || '').trim().toLowerCase())
                    if (possibleIdHeaders.some(h => row.includes(h))) {
                        headerRowIndex = i
                        break
                    }
                }
                headers = data[headerRowIndex].map(h => String(h || '').trim().toLowerCase())
                findCol = (...aliases: string[]) => {
                    for (const alias of aliases) {
                        const idx = headers.indexOf(alias.toLowerCase())
                        if (idx !== -1) return idx
                    }
                    return -1
                }
                idIdx = findCol('id', 'txid', 'uuid')

                if (txId.startsWith('BY-CONTENT:')) {
                    const [targetOp, targetDate, targetAmount, targetType] = txId.replace('BY-CONTENT:', '').split('|')
                    for (let i = headerRowIndex + 1; i < data.length; i++) {
                        const rOp = String(data[i][findCol('id_carga', 'id carga', 'idcarga', 'operacion')] || '').trim()
                        const rDate = String(data[i][findCol('fecha', 'f. doc', 'date')] || '').trim()
                        const rAmount = String(data[i][findCol('# monto', 'monto', 'amount', 'importe', 'valor')] || '').trim()
                        const rType = findCol('tipo', 'type') !== -1 ? String(data[i][findCol('tipo', 'type')] || '').trim() : ''
                        
                        if (rOp === targetOp && rDate === targetDate && rAmount === targetAmount && (findCol('tipo', 'type') === -1 || rType.toUpperCase() === (targetType || '').toUpperCase())) {
                            dataRowIndex = i
                            originalRow = data[i]
                            break
                        }
                    }
                } else if (idIdx !== -1) {
                    for (let i = headerRowIndex + 1; i < data.length; i++) {
                        if ((data[i][idIdx] || '').trim() === txId.trim()) {
                            dataRowIndex = i
                            originalRow = data[i]
                            break
                        }
                    }
                }
            }
        }

        if (dataRowIndex === -1) {
            console.error(`[updateCashFlowTransaction] Transaction ${txId} not found in any ledger`)
            throw new Error(`Transaction ${txId} not found in CashFlow ledger`)
        }

        // Convert to 1-based sheet row number for updateRow
        // data[0] = sheet row 1, data[dataRowIndex] = sheet row (dataRowIndex + 1)
        const sheetRowNumber = dataRowIndex + 1

        // Prepare updated row
        const updatedRow = [...originalRow]
        if (updatedRow.length < headers.length) {
            updatedRow.push(...new Array(headers.length - updatedRow.length).fill(''))
        }

        const setVal = (val: any, ...aliases: string[]) => {
            const idx = findCol(...aliases)
            if (idx !== -1) updatedRow[idx] = String(val)
        }

        if (updates.date !== undefined) setVal(updates.date, 'fecha')
        if (updates.type !== undefined) setVal(updates.type, 'tipo')
        if (updates.category !== undefined) setVal(updates.category, 'categoria')
        if (updates.description !== undefined) setVal(updates.description, 'descripcion')

        if (updates.amount !== undefined) {
            const safeAmount = isNaN(Number(updates.amount)) ? 0 : Number(updates.amount)
            setVal(safeAmount, '# monto', 'monto')
        }

        if (updates.status !== undefined) setVal(updates.status, 'estado')
        if (updates.dueDate !== undefined) setVal(updates.dueDate, 'fecha para agendar', 'dueDate', 'fecha_vencimiento')

        await updateRow(spreadsheetId, activeTabName, sheetRowNumber, updatedRow)

        // Bidirectional Sync: If this is a Flete transaction, update the operation's freightValue.
        // skipBidirectionalSync=true when called from adjustFinancialTransactions to avoid infinite loops.
        const currentCategory = updates.category !== undefined ? updates.category : (originalRow[findCol('categoria')] || '')
        if (!skipBidirectionalSync && currentCategory === 'Flete' && updates.amount !== undefined) {
            try {
                const opIdIdx = findCol('id_carga', 'id carga', 'idcarga')
                const operationId = originalRow[opIdIdx]
                if (operationId) {
                    await updateOperation(operationId, { freightValue: String(updates.amount) }, undefined, { skipSync: true })
                }
            } catch (syncError) {
                console.error('[updateCashFlowTransaction] Bidirectional sync failed:', syncError)
            }
        }

        // Invalidate cache
        invalidateCache(spreadsheetId)

        return true
    } catch (error) {
        console.error('Error updating cash flow transaction:', error)
        throw error
    }
}

/**
 * Elimina todos los movimientos de una operación.
 */
export async function deleteCashFlowByOperation(operationId: string) {
    try {
        const tabName = TABS.cashFlow
        const spreadsheetId = MASTER_SPREADSHEET_ID
        const data = await getSheetData(spreadsheetId, `${tabName}!A:Z`)

        if (!data || data.length < 2) return

        const headers = data[0].map(h => h.trim().toLowerCase())
        const idIdx = headers.findIndex(h => h === 'id_carga' || h === 'id carga' || h === 'idcarga')

        if (idIdx === -1) throw new Error('ID_Carga column not found')

        // Filter indices to delete (descending order to avoid index shifts)
        const rowsToDelete = data.slice(1)
            .map((row, i) => ({ id: row[idIdx], originalIndex: i + 1 }))
            .filter(r => r.id === operationId)
            .sort((a, b) => b.originalIndex - a.originalIndex)

        if (rowsToDelete.length === 0) return

        const meta = await getSpreadsheetMetadata(spreadsheetId)
        const sheet = meta?.sheets?.find((s: any) => s.properties?.title === tabName)
        const sheetId = sheet?.properties?.sheetId

        if (sheetId === undefined) throw new Error('SheetId for CashFlow not found')

        // Delete rows one by one from bottom to top
        const authClient = await getAuthClient()
        for (const row of rowsToDelete) {
            await sheets.spreadsheets.batchUpdate({
                auth: authClient as any,
                spreadsheetId,
                requestBody: {
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId,
                                dimension: 'ROWS',
                                startIndex: row.originalIndex,
                                endIndex: row.originalIndex + 1
                            }
                        }
                    }]
                }
            })
        }

        invalidateCache(spreadsheetId)
        return true
    } catch (error) {
        console.error('Error deleting operation cash flow:', error)
        throw error
    }
}

// --- CACHE SYSTEM ---
const CACHE: Record<string, { data: string[][], timestamp: number }> = {}
const CACHE_TTL = 30 * 1000 // 30 seconds freshness (for near-instant updates)
const STALE_TTL = 3 * 60 * 1000 // 3 minutes stale usage allowed
const PENDING_FETCHES: Record<string, Promise<string[][]>> = {}

function invalidateCache(spreadsheetId?: string) {
    if (spreadsheetId) {
        Object.keys(CACHE).forEach(key => {
            if (key.startsWith(spreadsheetId)) {
                delete CACHE[key]
            }
        })
    } else {
        Object.keys(CACHE).forEach(key => delete CACHE[key])
    }
}

// Función genérica para leer datos con Stale-While-Revalidate
export async function getSheetData(spreadsheetId: string, range: string, forceFresh: boolean = false): Promise<string[][]> {
    const cacheKey = `${spreadsheetId}:${range}`
    const now = Date.now()

    // 1. If fresh cache exists, return it
    if (!forceFresh && CACHE[cacheKey] && (now - CACHE[cacheKey].timestamp < CACHE_TTL)) {
        return CACHE[cacheKey].data
    }

    // 2. If stale cache exists, return it and trigger background refresh
    if (!forceFresh && CACHE[cacheKey] && (now - CACHE[cacheKey].timestamp < STALE_TTL)) {
        // Trigger background refresh if not already fetching
        if (!PENDING_FETCHES[cacheKey]) {
            console.log(`[SWR] Serving stale data for ${range}, refreshing in background...`)
            fetchAndCache(spreadsheetId, range, cacheKey)
        }
        return CACHE[cacheKey].data
    }

    // 3. No cache or forced fresh: Wait for fetch
    if (cacheKey in PENDING_FETCHES) {
        return await PENDING_FETCHES[cacheKey]
    }

    return fetchAndCache(spreadsheetId, range, cacheKey)
}

async function fetchAndCache(spreadsheetId: string, range: string, cacheKey: string): Promise<string[][]> {
    const fetchPromise = (async () => {
        try {
            const authClient = await getAuthClient()
            const response = await sheets.spreadsheets.values.get({
                auth: authClient as any,
                spreadsheetId,
                range,
            })

            const values = response.data.values || []
            CACHE[cacheKey] = { data: values, timestamp: Date.now() }
            console.log(`[Cache] Successfully fetched and cached: ${range}`)
            return values
        } catch (error: any) {
            console.error(`Error reading ${spreadsheetId} range ${range}:`, error)

            // Handle 429 specifically in logs
            if (error.status === 429 || error.response?.status === 429) {
                console.warn(`[429] Rate limit hit for ${range}. Serving from cache if possible.`)
            }

            // If we have any cache, return it on error as fallback
            return CACHE[cacheKey]?.data || []
        } finally {
            delete PENDING_FETCHES[cacheKey]
        }
    })()

    PENDING_FETCHES[cacheKey] = fetchPromise
    return fetchPromise
}

// === CONTACTOS (Unified Spreadsheet) ===

export async function getAllContactos(): Promise<Contacto[]> {
    const contactos: Contacto[] = []

    try {
        const meta = await getSpreadsheetMetadata(CONTACTS_SPREADSHEET_ID)

        // Find by title first, then fallback
        const contactSheet = meta?.sheets?.find((s: any) => s.properties?.title === TABS.contacts) || meta?.sheets?.[0]
        const tabName = contactSheet?.properties?.title || TABS.contacts

        const data = await getSheetData(CONTACTS_SPREADSHEET_ID, `${tabName}!A:AZ`)

        if (data.length > 0) {
            const headers = data[0].map(h => h.trim().toLowerCase())

            // Mapeo flexible de columnas
            const getCol = (row: string[], ...aliases: string[]) => {
                for (const alias of aliases) {
                    const idx = headers.indexOf(alias.trim().toLowerCase())
                    if (idx !== -1) return row[idx] || ''
                }
                return ''
            }

            for (let i = 1; i < data.length; i++) {
                const row = data[i]
                if (!row[0] && !row[1]) continue // Skip empty rows

                const id = getCol(row, 'ID Nuevo', 'id', 'ID') || `C-${i}`

                // Parse categorical flags
                const checkFlag = (val: string) => ['x', 'si', 'yes', 'true'].includes(val.trim().toLowerCase())
                const isImporter = checkFlag(getCol(row, 'importer', 'isImporter', 'imp', 'importador'))
                const isExporter = checkFlag(getCol(row, 'exporter', 'isExporter', 'exp', 'exportador'))
                const isProducer = checkFlag(getCol(row, 'producer', 'isProducer', 'prod', 'productor'))

                // PO Roles
                const isBillTo = checkFlag(getCol(row, 'Bill to', 'BillTo'))
                const isConsignee = checkFlag(getCol(row, 'Consignee'))
                const isNotify = checkFlag(getCol(row, 'Notify'))
                const isForwarder = checkFlag(getCol(row, 'Forwarder', 'isForwarder', 'fwd'))

                let tipo: Contacto['tipo'] = 'Desconocido'
                if (isImporter) tipo = 'Importador'
                else if (isExporter) tipo = 'Exportador'
                else if (isProducer) tipo = 'Productor'
                else if (isForwarder) tipo = 'Forwarder'

                contactos.push({
                    id,
                    tipo,
                    empresa: getCol(row, 'Empresa', 'Company', 'Brand'),
                    nombreContacto: getCol(row, 'Nombre contacto', 'Nombre Contacto', 'First Name', 'Contact Name'),
                    apellido: getCol(row, 'Apellido contacto', 'Surname', 'Last Name') || '',
                    email: getCol(row, 'Email', 'Mail', 'Correo'),
                    telefono: getCol(row, 'Telefono', 'Phone', 'Cell'),
                    direccion: getCol(row, 'Direccion', 'Address', 'Dirección'),
                    pais: getCol(row, 'Pais', 'Country', 'País'),
                    brand: getCol(row, 'Brand', 'Marca'),
                    idioma: getCol(row, 'Idioma', 'Language') || 'ES',
                    isBillTo,
                    isConsignee,
                    isNotify,
                    taxId: getCol(row, 'Tax Id', 'CUIT', 'RUC', 'TaxID'),
                    nPlanta: getCol(row, 'Numero de planta', 'Plant #', 'Planta'),
                    fda: getCol(row, 'FDA', 'FDA Number'),
                    isImporter,
                    isExporter,
                    isProducer,
                    isForwarder,
                    isProspecto: checkFlag(getCol(row, 'Prospectos', 'prospecto', 'isProspecto')),
                    notes: getCol(row, 'notes', 'Notas'),
                    description: getCol(row, 'descripción', 'Description'),
                })
            }
        }

    } catch (error) {
        console.error('Error fetching contacts:', error)
    }

    return contactos
}

export async function getContactosStats() {
    const contactos = await getAllContactos()
    return {
        total: contactos.length,
        importadores: contactos.filter(c => c.tipo === 'Importador').length,
        exportadores: contactos.filter(c => c.tipo === 'Exportador').length,
        productores: contactos.filter(c => c.tipo === 'Productor').length,
        prospectos: contactos.filter(c => c.isProspecto).length
    }
}

export async function getProspectos(): Promise<Contacto[]> {
    const contactos = await getAllContactos()
    return contactos.filter(c => c.isProspecto)
}

// Mapa de campos para escritura
const FIELD_MAP: Record<string, string[]> = {
    id: ['ID Nuevo'],
    empresa: ['Empresa'],
    nombreContacto: ['Nombre contacto'],
    apellido: ['Apellido contacto'],
    direccion: ['Direccion'],
    pais: ['Pais'],
    telefono: ['Telefono'],
    email: ['Email'],
    taxId: ['Tax Id'],
    nPlanta: ['Numero de planta'],
    brand: ['Brand'],
    fda: ['FDA'],
    importer: ['importer', 'importador', 'imp'],
    exporter: ['exporter', 'exportador', 'exp'],
    producer: ['producer', 'productor', 'prod'],
    billTo: ['Bill to', 'BillTo'],
    consignee: ['Consignee'],
    notify: ['Notify'],
    forwarder: ['Forwarder', 'fwd', 'isForwarder'],
    isProspecto: ['Prospectos', 'prospecto', 'isProspecto'],
    notes: ['Notes', 'notes', 'Notas'],
    description: ['descripción', 'Description'],
}

// Crear contacto (Independent Contacts Spreadsheet)
export async function createContacto(datos: Partial<Contacto>) {
    const tabName = TABS.contacts

    const data = await getSheetData(CONTACTS_SPREADSHEET_ID, `${tabName}!A:AZ`)
    const headers = data[0] || []
    if (headers.length === 0) throw new Error('Headers no encontrados')

    const newRow = new Array(headers.length).fill('')

    const findColIndexLocal = (keys: string[]) => {
        for (const k of keys) {
            const idx = headers.findIndex((h: string) => h.trim().toLowerCase() === k.toLowerCase())
            if (idx !== -1) return idx
        }
        return -1
    }

    const mapField = (field: string, val: any) => {
        const potentialKeys = FIELD_MAP[field] || [field]
        const idx = findColIndexLocal(potentialKeys)
        if (idx !== -1) newRow[idx] = val || ''
    }

    // Mapping basic fields
    mapField('empresa', datos.empresa)
    mapField('nombreContacto', datos.nombreContacto)
    mapField('apellido', datos.apellido)
    mapField('email', datos.email)
    mapField('telefono', normalizePhoneNumber(datos.telefono || ''))
    mapField('direccion', datos.direccion)
    mapField('pais', datos.pais)
    mapField('brand', datos.brand)
    mapField('idioma', datos.idioma || 'EN')
    mapField('taxId', datos.taxId)
    mapField('nPlanta', datos.nPlanta)
    mapField('fda', datos.fda)
    mapField('notes', datos.notes)
    mapField('description', datos.description)

    // Mapping category flags as 'x'
    const impIdx = findColIndexLocal(['importer'])
    if (impIdx !== -1) newRow[impIdx] = datos.isImporter ? 'x' : ''

    const expIdx = findColIndexLocal(['exporter'])
    if (expIdx !== -1) newRow[expIdx] = datos.isExporter ? 'x' : ''

    const prodIdx = findColIndexLocal(['producer'])
    if (prodIdx !== -1) newRow[prodIdx] = datos.isProducer ? 'x' : ''

    // PO Roles
    const billToIdx = findColIndexLocal(FIELD_MAP.billTo)
    if (billToIdx !== -1) newRow[billToIdx] = datos.isBillTo ? 'x' : ''

    const consigneeIdx = findColIndexLocal(FIELD_MAP.consignee)
    if (consigneeIdx !== -1) newRow[consigneeIdx] = datos.isConsignee ? 'x' : ''

    const notifyIdx = findColIndexLocal(FIELD_MAP.notify)
    if (notifyIdx !== -1) newRow[notifyIdx] = datos.isNotify ? 'x' : ''

    const fwdIdx = findColIndexLocal(FIELD_MAP.forwarder)
    if (fwdIdx !== -1) newRow[fwdIdx] = (datos.tipo === 'Forwarder' || datos.isForwarder) ? 'x' : ''

    const prosIdx = findColIndexLocal(FIELD_MAP.isProspecto)
    if (prosIdx !== -1) newRow[prosIdx] = datos.isProspecto ? 'x' : ''

    // ID generation: ALWAYS compute numeric part server-side with fresh data
    const idIdx = findColIndexLocal(FIELD_MAP.id)

    // Extract only the suffix (name part) from client-provided ID, ignore the numeric part
    let idSuffix = ''
    if (datos.id) {
        // Client sends something like "E001-CompanyName", we only want "CompanyName"
        const dashIndex = datos.id.indexOf('-')
        if (dashIndex !== -1) {
            idSuffix = datos.id.substring(dashIndex + 1)
        } else {
            idSuffix = datos.id
        }
    }
    if (!idSuffix) {
        idSuffix = datos.empresa ? datos.empresa.replace(/[^a-zA-Z0-9]/g, '') : 'Unknown'
    }

    // Always compute the next numeric ID from FRESH data (bypass cache)
    const freshIdData = await getSheetData(CONTACTS_SPREADSHEET_ID, `${tabName}!A:AZ`, true)
    const freshHeaders = freshIdData[0] || []
    const freshIdIdx = freshHeaders.findIndex((h: string) => h.trim().toLowerCase() === 'id nuevo')

    let maxIdNum = 0
    for (let i = 1; i < freshIdData.length; i++) {
        const rowId = freshIdIdx !== -1 ? (freshIdData[i][freshIdIdx] || '') : ''
        if (typeof rowId === 'string' && rowId.trim().startsWith('E')) {
            const match = rowId.trim().match(/^E(\d+)-/)
            if (match) {
                const num = parseInt(match[1], 10)
                if (num > maxIdNum) maxIdNum = num
            }
        }
    }
    const nextIdNum = maxIdNum + 1
    const numericPart = String(nextIdNum).padStart(3, '0')
    const newId = `E${numericPart}-${idSuffix}`

    if (idIdx !== -1) newRow[idIdx] = newId

    await appendRow(CONTACTS_SPREADSHEET_ID, `${tabName}!A:AZ`, newRow)

    // Register the new ID in the "Codigos identificatorios" spreadsheet (fire-and-forget)
    const tipoLabel = datos.isImporter ? 'Importer ID'
        : datos.isExporter ? 'Exporter ID'
            : datos.isProducer ? 'Producer ID'
                : datos.isForwarder ? 'Forwarder ID'
                    : 'Contacto ID'
    appendRow(CODIGOS_SPREADSHEET_ID, 'Hoja 1!A:C', [newId, tipoLabel, datos.empresa || ''])
        .then(() => console.log(`[Codigos] Registered new contact ID: ${newId}`))
        .catch(err => console.error('[Codigos] Failed to register ID:', err))

    return { ...datos, id: newId }
}

export async function getNextContactNumericId(): Promise<number> {
    const tabName = TABS.contacts
    const data = await getSheetData(CONTACTS_SPREADSHEET_ID, `${tabName}!A:AZ`, true)
    const headers = data[0] || []
    const idIdx = headers.findIndex((h: string) => h.trim().toLowerCase() === 'id nuevo')

    let maxIdNum = 0
    for (let i = 1; i < data.length; i++) {
        const rowId = idIdx !== -1 ? (data[i][idIdx] || '') : ''
        if (typeof rowId === 'string' && rowId.trim().startsWith('E')) {
            const match = rowId.trim().match(/^E(\d+)-/)
            if (match) {
                const num = parseInt(match[1], 10)
                if (num > maxIdNum) maxIdNum = num
            }
        }
    }
    return maxIdNum + 1
}

export async function checkContactDuplicates(email?: string, id?: string) {
    const contactos = await getAllContactos()
    const result = {
        emailExists: false,
        idExists: false
    }

    if (email) {
        result.emailExists = contactos.some(c => c.email?.toLowerCase().trim() === email.toLowerCase().trim())
    }

    if (id) {
        result.idExists = contactos.some(c => c.id?.toLowerCase().trim() === id.toLowerCase().trim())
    }

    return result
}

// Actualizar contacto (Independent Contacts Spreadsheet)
export async function updateContacto(id: string, datos: Partial<Contacto>) {
    const tabName = TABS.contacts

    // RE-LOCATE ROW BY ID (Safe Writing) Just before update — FORCE FRESH to avoid stale row index
    const freshData = await getSheetData(CONTACTS_SPREADSHEET_ID, `${tabName}!A:AZ`, true)
    const freshHeaders = freshData[0] || []
    const findColIndexLocal = (keys: string[]) => {
        for (const k of keys) {
            const idx = freshHeaders.findIndex((h: string) => h.trim().toLowerCase() === k.toLowerCase())
            if (idx !== -1) return idx
        }
        return -1
    }
    const freshIdIdx = findColIndexLocal(FIELD_MAP.id) // findColIndex uses headers, but headers are same as freshHeaders usually

    let freshRowIndex = -1
    for (let i = 1; i < freshData.length; i++) {
        // Comparación robusta de ID (sin espacios)
        const rowId = (freshData[i][freshIdIdx] || '').trim()
        if (rowId === id.trim()) {
            freshRowIndex = i + 1
            break
        }
    }

    if (freshRowIndex === -1) throw new Error('Contacto no encontrado durante la actualización segura')

    const originalRow = freshData[freshRowIndex - 1]
    const updatedRow = [...originalRow]
    if (updatedRow.length < freshHeaders.length) {
        updatedRow.push(...new Array(freshHeaders.length - updatedRow.length).fill(''))
    }

    const updateField = (field: string, val: any) => {
        const potentialKeys = FIELD_MAP[field] || [field]
        const idx = findColIndexLocal(potentialKeys)
        if (idx !== -1 && val !== undefined) {
            updatedRow[idx] = val
        }
    }

    // ... mapping ... (keep mapping logic)
    updateField('empresa', datos.empresa)
    updateField('nombreContacto', datos.nombreContacto)
    updateField('apellido', datos.apellido)
    updateField('email', datos.email)
    updateField('telefono', datos.telefono !== undefined ? normalizePhoneNumber(datos.telefono) : undefined)
    updateField('direccion', datos.direccion)
    updateField('pais', datos.pais)
    updateField('brand', datos.brand)
    updateField('idioma', datos.idioma)
    updateField('taxId', datos.taxId)
    updateField('nPlanta', datos.nPlanta)
    updateField('fda', datos.fda)
    updateField('notes', datos.notes)
    updateField('description', datos.description)

    const impIdx = findColIndexLocal(['importer'])
    if (impIdx !== -1 && datos.isImporter !== undefined) updatedRow[impIdx] = datos.isImporter ? 'x' : ''
    const expIdx = findColIndexLocal(['exporter'])
    if (expIdx !== -1 && datos.isExporter !== undefined) updatedRow[expIdx] = datos.isExporter ? 'x' : ''
    const prodIdx = findColIndexLocal(['producer'])
    if (prodIdx !== -1 && datos.isProducer !== undefined) updatedRow[prodIdx] = datos.isProducer ? 'x' : ''

    // PO Roles
    const billToIdx = findColIndexLocal(FIELD_MAP.billTo)
    if (billToIdx !== -1 && datos.isBillTo !== undefined) updatedRow[billToIdx] = datos.isBillTo ? 'x' : ''

    const consigneeIdx = findColIndexLocal(FIELD_MAP.consignee)
    if (consigneeIdx !== -1 && datos.isConsignee !== undefined) updatedRow[consigneeIdx] = datos.isConsignee ? 'x' : ''

    const notifyIdx = findColIndexLocal(FIELD_MAP.notify)
    if (notifyIdx !== -1 && datos.isNotify !== undefined) updatedRow[notifyIdx] = datos.isNotify ? 'x' : ''

    const fwdIdx = findColIndexLocal(FIELD_MAP.forwarder)
    if (fwdIdx !== -1) {
        if (datos.isForwarder !== undefined) {
            updatedRow[fwdIdx] = datos.isForwarder ? 'x' : ''
        } else if (datos.tipo !== undefined) {
            updatedRow[fwdIdx] = datos.tipo === 'Forwarder' ? 'x' : ''
        }
    }

    const prosIdx = findColIndexLocal(FIELD_MAP.isProspecto)
    if (prosIdx !== -1 && datos.isProspecto !== undefined) updatedRow[prosIdx] = datos.isProspecto ? 'x' : ''

    await updateRow(CONTACTS_SPREADSHEET_ID, tabName, freshRowIndex, updatedRow)

    // Re-build a proper Contacto object from the updated row so that boolean flags
    // (isImporter, isExporter, isProducer, isForwarder, etc.) are correctly typed
    // and the UI can display the contact correctly after save.
    const headersLower = freshHeaders.map((h: string) => h.trim().toLowerCase())
    const getUpdatedVal = (...aliases: string[]) => {
        for (const alias of aliases) {
            const idx = headersLower.indexOf(alias.trim().toLowerCase())
            if (idx !== -1) return updatedRow[idx] || ''
        }
        return ''
    }
    const checkFlag = (val: string) => ['x', 'si', 'yes', 'true'].includes(val.trim().toLowerCase())

    const builtContacto: Contacto = {
        id,
        tipo: datos.tipo || 'Desconocido',
        empresa: getUpdatedVal('Empresa'),
        nombreContacto: getUpdatedVal('Nombre contacto', 'Nombre Contacto'),
        apellido: getUpdatedVal('Apellido contacto', 'Surname', 'Last Name'),
        email: getUpdatedVal('Email', 'Mail', 'Correo'),
        telefono: getUpdatedVal('Telefono', 'Phone', 'Cell'),
        direccion: getUpdatedVal('Direccion', 'Address'),
        pais: getUpdatedVal('Pais', 'Country'),
        brand: getUpdatedVal('Brand', 'Marca'),
        idioma: getUpdatedVal('Idioma', 'Language') || 'ES',
        taxId: getUpdatedVal('Tax Id', 'CUIT', 'RUC', 'TaxID'),
        nPlanta: getUpdatedVal('Numero de planta', 'Plant #', 'Planta'),
        fda: getUpdatedVal('FDA', 'FDA Number'),
        notes: getUpdatedVal('notes', 'Notas'),
        description: getUpdatedVal('descripción', 'Description'),
        isImporter: checkFlag(getUpdatedVal('importer')),
        isExporter: checkFlag(getUpdatedVal('exporter')),
        isProducer: checkFlag(getUpdatedVal('producer')),
        isForwarder: checkFlag(getUpdatedVal('Forwarder', 'fwd', 'isForwarder')),
        isBillTo: checkFlag(getUpdatedVal('Bill to', 'BillTo')),
        isConsignee: checkFlag(getUpdatedVal('Consignee')),
        isNotify: checkFlag(getUpdatedVal('Notify')),
        isProspecto: checkFlag(getUpdatedVal('Prospectos', 'prospecto', 'isProspecto')),
    }
    return builtContacto
}

// Eliminar contacto (Independent Contacts Spreadsheet)
export async function deleteContacto(id: string) {
    const tabName = TABS.contacts
    const data = await getSheetData(CONTACTS_SPREADSHEET_ID, `${tabName}!A:AZ`)
    const headers = data[0] || []

    const idIdx = headers.findIndex(h => h.trim().toLowerCase() === 'id nuevo'.toLowerCase() || h.trim().toLowerCase() === 'id'.toLowerCase())
    if (idIdx === -1) throw new Error('Columna ID no encontrada')

    let rowIndex = -1
    for (let i = 1; i < data.length; i++) {
        if (data[i][idIdx] === id) {
            rowIndex = i + 1
            break
        }
    }

    if (rowIndex === -1) throw new Error('Contacto no encontrado')

    // Google Sheets API v4 doesn't have a simple "delete row" via values, we use batchUpdate for actual deletion
    const authClient = await getAuthClient()
    const meta = await sheets.spreadsheets.get({
        auth: authClient as any,
        spreadsheetId: CONTACTS_SPREADSHEET_ID
    })
    const sheetId = meta.data.sheets?.find(s => s.properties?.title === tabName)?.properties?.sheetId

    await sheets.spreadsheets.batchUpdate({
        auth: authClient as any,
        spreadsheetId: CONTACTS_SPREADSHEET_ID,
        requestBody: {
            requests: [
                {
                    deleteDimension: {
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex - 1,
                            endIndex: rowIndex
                        }
                    }
                }
            ]
        }
    })
    invalidateCache(CONTACTS_SPREADSHEET_ID)
    return true
}

export interface CRMInteraction {
    id: string
    contactId: string
    author: string
    message: string
    timestamp: string
    leadId?: string
}

export async function getCRMInteractions(contactId?: string, leadId?: string): Promise<CRMInteraction[]> {
    try {
        const tabName = TABS.crmInteractions
        const data = await getSheetData(CONTACTS_SPREADSHEET_ID, `${tabName}!A:G`)
        if (data.length < 2) return []

        const headers = data[0].map(h => h.trim().toLowerCase())
        const interactions: CRMInteraction[] = []

        // Column mapping:
        // A: ID_Contacto, B: Fecha, C: Tipo Interaccion, D: Usuario Tess, E: Resultado / Nota, F: Proximo Paso, G: ID_Lead
        const contactIdx = headers.indexOf('id_contacto')
        const leadIdx = headers.indexOf('id_lead')
        const dateIdx = headers.indexOf('fecha')
        const userIdx = headers.indexOf('usuario tess')
        const noteIdx = headers.findIndex(h => h.includes('resultado') || h.includes('nota'))

        for (let i = 1; i < data.length; i++) {
            const row = data[i]
            const rowContactId = row[contactIdx]
            const rowLeadId = row[leadIdx]

            if ((contactId && rowContactId === contactId) || (leadId && rowLeadId === leadId)) {
                interactions.push({
                    id: `INT-${i}`,
                    contactId: rowContactId,
                    leadId: rowLeadId,
                    author: row[userIdx] || 'Anónimo',
                    message: row[noteIdx] || '',
                    timestamp: row[dateIdx] || ''
                })
            }
        }
        return interactions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    } catch (error) {
        console.error('Error fetching CRM interactions:', error)
        return []
    }
}

export async function addCRMInteraction(interaction: Omit<CRMInteraction, 'id' | 'timestamp'>) {
    try {
        const tabName = TABS.crmInteractions
        const spreadsheetId = CONTACTS_SPREADSHEET_ID
        const data = await getSheetData(spreadsheetId, `${tabName}!A:G`)

        let headers: string[] = []
        if (data.length > 0) {
            headers = data[0].map(h => h.trim())
        } else {
            headers = ['ID_Contacto', 'Fecha', 'Tipo Interaccion', 'Usuario Tess', 'Resultado / Nota', 'Proximo Paso', 'ID_Lead']
            await appendRow(spreadsheetId, `${tabName}!A:G`, headers)
        }

        const timestamp = new Date().toLocaleString('es-AR')
        const newRow = new Array(headers.length).fill('')

        const setVal = (col: string, val: string) => {
            let idx = headers.findIndex(h => h.toLowerCase() === col.toLowerCase())
            if (idx === -1 && col.toLowerCase() === 'resultado / nota') {
                idx = headers.findIndex(h => h.toLowerCase().includes('resultado') || h.toLowerCase().includes('nota'))
            }
            if (idx !== -1) newRow[idx] = val
        }

        setVal('id_contacto', interaction.contactId || '')
        setVal('id_lead', interaction.leadId || '')
        setVal('fecha', timestamp)
        setVal('usuario tess', interaction.author)
        setVal('resultado / nota', interaction.message)
        setVal('tipo interaccion', 'Nota')

        await appendRow(spreadsheetId, `${tabName}!A:G`, newRow)
        invalidateCache(spreadsheetId)
        return { ...interaction, timestamp }
    } catch (error) {
        console.error('Error adding CRM interaction:', error)
        throw error
    }
}

// === AGENDA (Agenda Tab in Contacts/Shared Sheet) ===

export async function getAgendaItems(startDate: string, endDate: string): Promise<AgendaItem[]> {
    try {
        const tabName = TABS.agenda
        const data = await getSheetData(CONTACTS_SPREADSHEET_ID, `${tabName}!A:K`)
        if (data.length < 2) return []

        const headers = data[0].map(h => h.trim().toLowerCase())
        const items: AgendaItem[] = []

        const start = new Date(startDate).getTime()
        const end = new Date(endDate).getTime()

        for (let i = 1; i < data.length; i++) {
            const row = data[i]
            const rawDate = row[headers.indexOf('fecha')]
            if (!rawDate) continue

            const dateVal = normalizeDate(rawDate)
            if (!dateVal) continue

            const itemDate = new Date(dateVal).getTime()
            if (itemDate >= start && itemDate <= end) {
                items.push({
                    id: row[headers.indexOf('id')] || `AG-${i}`,
                    date: dateVal,
                    time: row[headers.indexOf('hora')] || '',
                    title: row[headers.indexOf('titulo')] || '',
                    type: (row[headers.indexOf('tipo')] || 'TASK') as 'TASK' | 'MEETING',
                    status: (row[headers.indexOf('estado')] || 'PENDING') as 'PENDING' | 'DONE',
                    creator: row[headers.indexOf('creador')] || '',
                    assignedTo: row[headers.indexOf('asignados')] || '',
                    operationId: row[headers.indexOf('id_carga')] || row[headers.indexOf('id_Carga')] || '',
                    productId: row[headers.indexOf('productid')] || row[headers.indexOf('id_producto')] || '',
                    contactId: row[headers.indexOf('contactid')] || row[headers.indexOf('id_contacto')] || ''
                })
            }
        }
        return items.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date)
            return (a.time || '23:59').localeCompare(b.time || '23:59')
        })
    } catch (error) {
        console.error('Error fetching agenda items:', error)
        return []
    }
}

export async function upsertAgendaItem(item: Partial<AgendaItem>) {
    try {
        const tabName = TABS.agenda
        const spreadsheetId = CONTACTS_SPREADSHEET_ID
        const data = await getSheetData(spreadsheetId, `${tabName}!A:K`)

        let headers: string[] = []
        if (data.length > 0) {
            headers = data[0].map(h => h.trim())
        } else {
            headers = ['ID', 'Fecha', 'Hora', 'Titulo', 'Tipo', 'Estado', 'Creador', 'Asignados', 'ID_Carga', 'ProductID', 'ContactID']
            await appendRow(spreadsheetId, `${tabName}!A:K`, headers)
        }

        const id = item.id || `AG-${Date.now()}`
        const newRow = new Array(headers.length).fill('')

        const setVal = (col: string, val: string) => {
            const idx = headers.findIndex(h => h.toLowerCase() === col.toLowerCase())
            if (idx !== -1) newRow[idx] = val || ''
        }

        // Search for existing row if it's an update
        let rowIndex = -1
        if (item.id) {
            const idIdx = headers.findIndex(h => h.toLowerCase() === 'id')
            for (let i = 1; i < data.length; i++) {
                if (data[i][idIdx] === item.id) {
                    rowIndex = i + 1
                    break
                }
            }
        }

        if (rowIndex !== -1) {
            // Partial Update
            const existingRow = data[rowIndex - 1]
            const updatedRow = [...existingRow]
            const updateVal = (col: string, val: any) => {
                if (val === undefined) return
                const idx = headers.findIndex(h => h.toLowerCase() === col.toLowerCase())
                if (idx !== -1) updatedRow[idx] = String(val)
            }
            updateVal('fecha', item.date)
            updateVal('hora', item.time)
            updateVal('titulo', item.title)
            updateVal('tipo', item.type)
            updateVal('estado', item.status)
            updateVal('creador', item.creator)
            updateVal('asignados', item.assignedTo)
            updateVal('id_carga', item.operationId)
            updateVal('id_producto', item.productId)
            updateVal('id_contacto', item.contactId)
            await updateRow(spreadsheetId, tabName, rowIndex, updatedRow)
        } else {
            // Create New
            setVal('id', id)
            setVal('fecha', item.date!)
            setVal('hora', item.time!)
            setVal('titulo', item.title!)
            setVal('tipo', item.type!)
            setVal('estado', item.status || 'PENDING')
            setVal('creador', item.creator!)
            setVal('asignados', item.assignedTo || '')
            setVal('id_carga', item.operationId || '')
            setVal('id_producto', item.productId || '')
            setVal('id_contacto', item.contactId || '')
            await appendRow(spreadsheetId, `${tabName}!A:K`, newRow)
        }

        invalidateCache(spreadsheetId)
        return { ...item, id }
    } catch (error) {
        console.error('Error upserting agenda item:', error)
        throw error
    }
}

export async function deleteAgendaItem(id: string) {
    try {
        const tabName = TABS.agenda
        const spreadsheetId = CONTACTS_SPREADSHEET_ID
        const data = await getSheetData(spreadsheetId, `${tabName}!A:K`)
        const headers = data[0].map(h => h.trim().toLowerCase())
        const idIdx = headers.indexOf('id')

        let rowIndex = -1
        for (let i = 1; i < data.length; i++) {
            if (data[i][idIdx] === id) {
                rowIndex = i + 1
                break
            }
        }

        if (rowIndex === -1) return false

        const authClient = await getAuthClient()
        const meta = await sheets.spreadsheets.get({
            auth: authClient as any,
            spreadsheetId
        })
        const sheetId = meta.data.sheets?.find(s => s.properties?.title === tabName)?.properties?.sheetId

        await sheets.spreadsheets.batchUpdate({
            auth: authClient as any,
            spreadsheetId,
            requestBody: {
                requests: [{
                    deleteDimension: {
                        range: { sheetId, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex }
                    }
                }]
            }
        })
        invalidateCache(spreadsheetId)
        return true
    } catch (error) {
        console.error('Error deleting agenda item:', error)
        return false
    }
}

export async function dismissAgendaItemForUser(id: string, userEmail: string) {
    try {
        const tabName = TABS.agenda
        const spreadsheetId = CONTACTS_SPREADSHEET_ID
        const data = await getSheetData(spreadsheetId, `${tabName}!A:K`)
        
        if (data.length < 2) return false

        const headers = data[0].map(h => h.trim().toLowerCase())
        const idIdx = headers.indexOf('id')
        const assignedIdx = headers.indexOf('asignados')

        if (idIdx === -1 || assignedIdx === -1) return false

        let rowIndex = -1
        let currentRowStr = ''
        for (let i = 1; i < data.length; i++) {
            if (data[i][idIdx] === id) {
                rowIndex = i + 1
                currentRowStr = data[i][assignedIdx] || ''
                break
            }
        }

        if (rowIndex === -1) return false

        const userEmailLower = userEmail.toLowerCase().trim()

        // 1. Remove user from assigned list
        let assignees = currentRowStr.split(',').map(e => e.trim()).filter(Boolean)
        const newAssignees = assignees.filter(e => e.toLowerCase() !== userEmailLower)
        const newAssigneesStr = newAssignees.join(', ')

        // 2. Update the row with the new assignees
        await updateRow(spreadsheetId, tabName, rowIndex, {
            'Asignados': newAssigneesStr
        })

        invalidateCache(spreadsheetId)
        return true
    } catch (error) {
        console.error('Error dismissing agenda item:', error)
        return false
    }
}


// === PRODUCTOS (Products Spreadsheet) ===

export interface Producto {
    id: string
    especie: string
    corte: string
    calibre: string
    packing: string
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

export async function getAllProductos(): Promise<Producto[]> {
    try {
        const tabName = TABS.products
        const data = await getSheetData(PRODUCTS_SPREADSHEET_ID, `${tabName}!A:AZ`)

        if (data.length < 2) return []

        const headers = data[0].map(h => h.trim().toLowerCase())

        // Helper para encontrar valor
        const getVal = (row: string[], ...aliases: string[]) => {
            for (const alias of aliases) {
                const idx = headers.indexOf(alias.toLowerCase())
                if (idx !== -1) return row[idx]
            }
            return ''
        }

        const productos: Producto[] = []
        for (let i = 1; i < data.length; i++) {
            const row = data[i]
            if (!row[0]) continue

            productos.push({
                id: getVal(row, 'seafoodproduct_id', 'id'),
                especie: getVal(row, 'Especie', 'Specie'),
                corte: getVal(row, 'Cortes', 'Cut'),
                calibre: getVal(row, 'Calibre', 'Size'),
                packing: getVal(row, 'Packing'),
                tamanoCaja: getVal(row, 'Tamano de Caja', 'Box Size'),
                nombreCientifico: getVal(row, 'Scientific Name'),
                origen: getVal(row, 'Origin', 'Origen'),
                descripcion: getVal(row, 'descripcion', 'description'),
                hsCode: getVal(row, 'HS Code', 'NCM', 'hs_code'),
                defaultTemp: getVal(row, 'Temperature', 'Temperatura'),
                defaultVent: getVal(row, 'Ventilation', 'Ventilacion'),
                defaultDrains: getVal(row, 'Drains', 'Desagues'),
                defaultHumidity: getVal(row, 'Humidity', 'Humedad')
            })
        }
        return productos
    } catch (error) {
        console.error('Error fetching products:', error)
        return []
    }
}

export async function createProducto(producto: Partial<Producto>) {
    try {
        const tabName = TABS.products
        const data = await getSheetData(PRODUCTS_SPREADSHEET_ID, `${tabName}!A:Z`)

        let headers: string[] = []
        if (data.length > 0) {
            headers = data[0].map(h => h.trim().toLowerCase())
        } else {
            // Fallback headers
            headers = ['seafoodproduct_id', 'especie', 'cortes', 'calibre', 'packing', 'tamano de caja', 'scientific name', 'origin', 'descripcion', 'temperature', 'ventilation', 'drains', 'humidity']
            await appendRow(PRODUCTS_SPREADSHEET_ID, `${tabName}!A:Z`, headers)
        }

        // Generar ID
        const prefix = (producto.especie || 'PRD').substring(0, 3).toUpperCase()
        const nextId = `${prefix}-${String(data.length).padStart(3, '0')}`

        const newRow = new Array(headers.length).fill('')

        const findIdx = (keys: string[]) => {
            for (const k of keys) {
                const idx = headers.indexOf(k.toLowerCase())
                if (idx !== -1) return idx
            }
            return -1
        }

        const mapField = (keys: string[], val: string | undefined) => {
            const idx = findIdx(keys)
            if (idx !== -1) newRow[idx] = val || ''
        }

        mapField(['seafoodproduct_id', 'id'], nextId)
        mapField(['especie', 'specie'], producto.especie)
        mapField(['cortes', 'cut'], producto.corte)
        mapField(['calibre', 'size'], producto.calibre)
        mapField(['packing'], producto.packing)
        mapField(['tamano de caja', 'box size'], producto.tamanoCaja)
        mapField(['scientific name'], producto.nombreCientifico)
        mapField(['origin', 'origen'], producto.origen)
        mapField(['descripcion', 'description'], producto.descripcion)
        mapField(['temperature', 'temperatura'], producto.defaultTemp)
        mapField(['ventilation', 'ventilacion'], producto.defaultVent)
        mapField(['drains', 'desagues'], producto.defaultDrains)
        mapField(['humidity', 'humedad'], producto.defaultHumidity)

        await appendRow(PRODUCTS_SPREADSHEET_ID, `${tabName}!A:AZ`, newRow)
        return { ...producto, id: nextId }

    } catch (error) {
        console.error('Error creating product:', error)
        throw error
    }
}

export async function createProductosBatch(productos: Partial<Producto>[]) {
    try {
        if (productos.length === 0) return []
        const tabName = TABS.products
        const data = await getSheetData(PRODUCTS_SPREADSHEET_ID, `${tabName}!A:Z`)

        let headers: string[] = []
        if (data.length > 0) {
            headers = data[0].map(h => h.trim().toLowerCase())
        } else {
            headers = ['seafoodproduct_id', 'especie', 'cortes', 'calibre', 'packing', 'tamano de caja', 'scientific name', 'origin', 'descripcion', 'temperature', 'ventilation', 'drains', 'humidity']
            await appendRow(PRODUCTS_SPREADSHEET_ID, `${tabName}!A:Z`, headers)
        }

        const rowsToAdd = productos.map(producto => {
            const row = new Array(headers.length).fill('')
            const findIdx = (keys: string[]) => {
                for (const k of keys) {
                    const idx = headers.indexOf(k.toLowerCase())
                    if (idx !== -1) return idx
                }
                return -1
            }
            const mapField = (keys: string[], val: string | undefined) => {
                const idx = findIdx(keys)
                if (idx !== -1) row[idx] = val || ''
            }

            mapField(['seafoodproduct_id', 'id'], producto.id)
            mapField(['especie', 'specie'], producto.especie)
            mapField(['cortes', 'cut'], producto.corte)
            mapField(['calibre', 'size'], producto.calibre)
            mapField(['packing'], producto.packing)
            mapField(['tamano de caja', 'box size'], producto.tamanoCaja)
            mapField(['scientific name'], producto.nombreCientifico)
            mapField(['origin', 'origen'], producto.origen)
            mapField(['descripcion', 'description'], producto.descripcion)
            mapField(['temperature', 'temperatura'], producto.defaultTemp)
            mapField(['ventilation', 'ventilacion'], producto.defaultVent)
            mapField(['drains', 'desagues'], producto.defaultDrains)
            mapField(['humidity', 'humedad'], producto.defaultHumidity)

            return row
        })

        // Batch Append (simplificado: appendRow uno por uno por limitacion de mi helper actual,
        // pero idealmente seria appendRows. Por ahora esta bien para volumen bajo)
        // TODO: Optimizar si el volumen crece.
        for (const row of rowsToAdd) {
            await appendRow(PRODUCTS_SPREADSHEET_ID, `${tabName}!A:AZ`, row)
        }

        return productos
    } catch (error) {
        console.error('Error batch creating products:', error)
        throw error
    }
}

export async function deleteProducto(id: string) {
    const tabName = TABS.products
    const data = await getSheetData(PRODUCTS_SPREADSHEET_ID, `${tabName}!A:AZ`)
    if (data.length === 0) return

    const headers = data[0].map(h => h.trim().toLowerCase())
    const idIdx = headers.indexOf('seafoodproduct_id') === -1 ? headers.indexOf('id') : headers.indexOf('seafoodproduct_id')

    if (idIdx === -1) throw new Error('Columna ID no encontrada en Productos')

    let rowIndex = -1
    for (let i = 1; i < data.length; i++) {
        if (data[i][idIdx] === id) {
            rowIndex = i + 1
            break
        }
    }

    if (rowIndex === -1) throw new Error('Producto no encontrado')

    const authClient = await getAuthClient()
    const meta = await sheets.spreadsheets.get({
        auth: authClient as any,
        spreadsheetId: PRODUCTS_SPREADSHEET_ID
    })
    const sheetId = meta.data.sheets?.find(s => s.properties?.title === tabName)?.properties?.sheetId

    await sheets.spreadsheets.batchUpdate({
        auth: authClient as any,
        spreadsheetId: PRODUCTS_SPREADSHEET_ID,
        requestBody: {
            requests: [
                {
                    deleteDimension: {
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex - 1,
                            endIndex: rowIndex
                        }
                    }
                }
            ]
        }
    })
    invalidateCache(PRODUCTS_SPREADSHEET_ID)
}

// Update existing product
export async function updateProducto(id: string, datos: Partial<Producto>) {
    try {
        const tabName = TABS.products
        // RE-LOCATE ROW BY ID (Safe Writing)
        const freshData = await getSheetData(PRODUCTS_SPREADSHEET_ID, `${tabName}!A:AZ`)
        const freshHeaders = freshData[0].map(h => h.trim().toLowerCase())
        const freshIdIdx = freshHeaders.indexOf('seafoodproduct_id') === -1 ? freshHeaders.indexOf('id') : freshHeaders.indexOf('seafoodproduct_id')

        let freshRowIndex = -1
        for (let i = 1; i < freshData.length; i++) {
            if (freshData[i][freshIdIdx] === id) {
                freshRowIndex = i + 1
                break
            }
        }

        if (freshRowIndex === -1) throw new Error(`Product ${id} not found during safe update`)

        const currentRow = freshData[freshRowIndex - 1]
        const updatedRow = [...currentRow]

        if (updatedRow.length < freshHeaders.length) {
            updatedRow.push(...new Array(freshHeaders.length - updatedRow.length).fill(''))
        }

        const findIdx = (keys: string[]) => {
            for (const k of keys) {
                const idx = freshHeaders.indexOf(k.toLowerCase())
                if (idx !== -1) return idx
            }
            return -1
        }

        const updateCell = (keys: string[], val: string | undefined) => {
            const idx = findIdx(keys)
            if (idx !== -1 && val !== undefined) updatedRow[idx] = val
        }

        updateCell(['especie', 'specie'], datos.especie)
        updateCell(['cortes', 'cut'], datos.corte)
        updateCell(['calibre', 'size'], datos.calibre)
        updateCell(['packing'], datos.packing)
        updateCell(['tamano de caja', 'box size'], datos.tamanoCaja)
        updateCell(['scientific name'], datos.nombreCientifico)
        updateCell(['origin', 'origen'], datos.origen)
        updateCell(['descripcion', 'description'], datos.descripcion)
        updateCell(['temperature', 'temperatura'], datos.defaultTemp)
        updateCell(['ventilation', 'ventilacion'], datos.defaultVent)
        updateCell(['drains', 'desagues'], datos.defaultDrains)
        updateCell(['humidity', 'humedad'], datos.defaultHumidity)

        await updateRow(PRODUCTS_SPREADSHEET_ID, tabName, freshRowIndex, updatedRow)
        return { ...datos, id }

    } catch (error) {
        console.error('Error updating product:', error)
        throw error
    }
}

// === HELPERS DE PARSEO DE PRODUCTOS ===

export interface ProductoOperacion {
    id: string
    cantidad: number
    precio: number
}

// Formato: ID:CANTIDAD:PRECIO (Ej: SMO-HGT-ARG-IQF-001:10000:4.90)
export function parseProductString(raw: string): ProductoOperacion[] {
    if (!raw) return []
    return raw.split('\n').map(line => { // Asumimos separación por saltos de línea si hay múltiples
        const parts = line.split(':')
        if (parts.length >= 3) {
            return {
                id: parts[0].trim(),
                cantidad: parseFloat(parts[1]),
                precio: parseFloat(parts[2])
            }
        }
        return null
    }).filter(p => p !== null) as ProductoOperacion[]
}

export function formatProductString(products: ProductoOperacion[]): string {
    return products.map(p => `${p.id}:${p.cantidad}:${p.precio}`).join('\n')
}

// === MASTER INPUT SEARCH ===
// ... (rest of searchMasterInput implementation)

// Helper para mapear una fila de la planilla a un objeto Operacion
function mapRowToOperacion(row: string[], headers: string[]): Operacion {
    const getVal = (keys: string[]) => {
        for (const k of keys) {
            const idx = headers.indexOf(k.toLowerCase())
            if (idx !== -1) return row[idx] || ''
        }
        return ''
    }

    const op: any = {}
    // Map everything from OPERATION_FIELD_MAP
    Object.entries(OPERATION_FIELD_MAP).forEach(([field, keys]) => {
        let val = getVal(keys)

        // Robust Date Parsing for known date fields — normalize ALL formats (serial, DD/MM/YYYY, etc.) to YYYY-MM-DD
        const dateFields = ['fechaEmbarque', 'arrivalDate', 'timestamp', 'loadedDate']
        if (dateFields.includes(field) && val) {
            val = normalizeDate(val)
        }

        op[field] = val
    })

    // Backward compatibility for etd and eta aliases
    // These should always follow our primary dates to avoid mismatches
    op.etd = op.fechaEmbarque;
    op.eta = op.arrivalDate;

    // DEBUG: Log specific operation to check data
    if (op.id === '081-26') {
        console.log('[DEBUG] ---------------------------------------------------')
        console.log('[DEBUG] Raw Row for 081-26:', JSON.stringify(row, null, 2))
        console.log('[DEBUG] Mapped Operation 081-26:', JSON.stringify(op, null, 2))
        console.log('[DEBUG] Headers used:', headers)
        console.log('[DEBUG] ---------------------------------------------------')
    }

    return op as Operacion
}

export async function searchMasterInput(query: string) {
    try {
        const resolvedMasterTab = await resolveMasterTabName()
        let data: string[][] = []
        const possibleTabs = [resolvedMasterTab, 'Master Input', 'Proforma Master Input']

        for (const tab of possibleTabs) {
            data = await getSheetData(MASTER_SPREADSHEET_ID, `${tab}!A:AZ`)
            if (data.length > 0) {
                console.log(`[googleSheets] Found master data in tab: ${tab}`)
                break
            }
        }

        if (data.length < 2) return []

        const headers = data[0].map(h => h.trim().toLowerCase())
        const results: Operacion[] = []
        const queryLower = query.toLowerCase().trim()

        // Identity Protocol: Map nicknames to emails for search
        let effectiveQuery = queryLower
        for (const [email, info] of Object.entries(USER_MAP)) {
            if (queryLower === info.name.toLowerCase() || queryLower.includes(info.name.toLowerCase())) {
                effectiveQuery = email.toLowerCase()
                break
            }
        }

        // Columnas clave para buscar
        const searchCols = ['id_carga', 'trading', 'import_id', 'export_id', 'producer_id', 'importer_id', 'userid']
        const searchIndices = searchCols.map(col => headers.indexOf(col)).filter(idx => idx !== -1)

        // Iterate backwards to find most recent matches first
        for (let i = data.length - 1; i >= 1; i--) {
            const row = data[i]
            let match = false

            // Buscar en columnas clave primero
            for (const idx of searchIndices) {
                const cellValue = (row[idx] || '').toLowerCase()
                if (cellValue.includes(queryLower) || cellValue.includes(effectiveQuery)) {
                    match = true
                    break
                }
            }

            // Si no hay match en claves, buscar en todo el row si query es largo (>3 chars)
            if (!match && query.length > 3) {
                if (row.some(cell => cell && cell.toLowerCase().includes(queryLower))) {
                    match = true
                }
            }

            if (match) {
                results.push(mapRowToOperacion(row, headers))
            }
        }

        return results.slice(0, 5) // Limitar a 5 resultados
    } catch (error) {
        console.error('Error searching Master Input:', error)
        return []
    }
}

// === CREAR OPERACIÓN (Master Input) ===

// Interface moved to sheets-types.ts

// Mapa de campos EXACTO basado en tu CSV "Master Imput.csv"
// Mapa de campos EXACTO basado en la confirmación del usuario
export const OPERATION_FIELD_MAP: Record<string, string[]> = {
    // Encabezados exactos de la planilla "Master Imput"
    id: ['IDcarga', 'id_carga', 'ID_Carga', 'N Carga', 'Nº Carga'],
    nombreCarpeta: ['Nombre carpeta', 'Nombre Carpeta', 'Nombre de carpeta'],
    idCarpeta: ['Id carpeta', 'ID carpeta', 'ID Carpeta', 'ID_Carpeta', 'id_carpeta', 'Folder ID', 'folderId'],
    userId: ['UserID'],
    trading: ['Trading'],
    cliente: ['Import_ID'],
    exportador: ['Export_ID'],
    productor: ['Producer_ID'],
    brand: ['Brand'],
    portLoad: ['Port_Load'],
    puertoDestino: ['Port_Dest'],
    fechaEmbarque: ['ETD'],
    arrivalDate: ['ETA'],
    booking: ['Booking'],
    forwarder: ['Forwarder', 'Florwarder', 'Forwarding'],
    containerNumber: ['ContainerNumber', 'Container'],
    freightValue: ['Flete', 'Freight Value', 'Freight', 'Valor Flete'], // Mapeado a 'Flete' según instrucción
    incoterm: ['Incoterm'],
    paymentTerms: ['Payment_Terms'],
    notas: ['Notes'],
    productos: ['Productos_Raw', 'Productos Raw', 'productos_raw', 'productos', 'Precios Venta', 'Venta'],
    purchasePricesRaw: ['Purchase_Prices_Raw', 'Purchase Prices Raw', 'purchase_prices_raw', 'purchase prices', 'purchase_prices', 'Precios Compra', 'Costo Compra', 'Precios de Compra'],
    estado: ['Estado', 'status'],
    timestamp: ['Timestamp', 'timestamp'],
    lastUpdatedBy: ['LastUpdatedBy', 'last_updated_by', 'usuario_actualizacion'],
    loadedDate: ['LOADED', 'LD', 'Loaded Date'],

    // Campos Futuros / Reservados (se llenan después o se dejan vacíos por ahora)
    fobGranTotal: ['FOB Gran Total', 'fob_gran_total'],
    totalPurchase: ['Total Purchase', 'total_purchase', 'Costo Total'],
    totalFOB: ['Total FOB', 'total_fob', 'Venta Total'],
    shipLane: ['Ship_Lane'],
    piNumber: ['Pi Number'],
    estadoPi: ['Estado Pi'],
    idDocumento: ['ID_documento'],
    notasProforma: ['Notes Pi', 'notesPi', 'notas_proforma'],
    ocId: ['Oc-Id'],
    ocIdDocumento: ['OC_id documento'],
    notifyId: ['Notify_Id'],
    billToId: ['Bill_To_Id'],
    consigneeId: ['Consignee_Id'],
    notesOc: ['Notes OC'],
    seguro_estado: ['Seguro Estado', 'seguro_estado'],
    instrucciones_frio: ['Instrucciones Frio', 'instrucciones_frio'],
    hsCode: ['HS Code', 'hs_code', 'ncm'],
    drains: ['Drains', 'Desagues', 'desagues'],
    humidity: ['Humidity', 'Humedad', 'humedad'],
    ventilation: ['Ventilation', 'Ventilacion', 'ventilacion'],
    bookingDocId: ['ID doc BOOKING', 'booking_doc_id', 'id_doc_booking'],
    invoiceDocId: ['Original Invoice ID', 'ID doc INVOICE', 'invoice_doc_id', 'id_doc_invoice'],
    invoiceNumber: ['Original Invoice Number', 'invoice_number'],
    invoiceNotes: ['Original Invoice Notes', 'invoice_notes'],
    salePriceReal: ['Sale Price Real', 'sale_price_real'],
    purchasePricesReal: ['Purchase_Prices_Real', 'purchase_prices_real']
}

export const OPERATIONAL_STATUS = {
    CREATED: '1. Operación Creada',
    PROFORMA_SENT: '2. Proforma Enviada',
    PROFORMA_APPROVED: '3. Proforma Aprobada',
    PO_EMITTED: '4. Orden de Compra Emitida',
    PRODUCTION: '5. Producción / Preparación',
    FREIGHT_MANAGEMENT: '6. Flete en Gestión',
    BOOKING_CONFIRMED: '7. Booking Confirmado',
    LOADED: '8. Carga Realizada',
    IN_TRANSIT: '9. En Tránsito',
    ARRIVED: '10. Arribada',
    RECEPTION_REVIEW: '11. En Revisión de Recepción',
    RECEPTION_CONFORM: '12A. Recepción Conforme',
    CLAIM_REPORTED: '12B. Reclamo Reportado',
    LIQUIDATION_IN_PROGRESS: '13. Liquidación en Proceso',
    LIQUIDATED: '14. Operación Liquidada'
}


// Helper to find the first empty row in a specific column
async function findNextEmptyRow(spreadsheetId: string, tabName: string, range: string, colIndex: number): Promise<number> {
    const data = await getSheetData(spreadsheetId, range)
    if (data.length === 0) return 2 // Start after header if empty

    // Start scanning from row 1 (index 1, assuming row 0 is header)
    for (let i = 1; i < data.length; i++) {
        const row = data[i]
        // Check if the specific column is empty
        if (!row[colIndex] || row[colIndex].trim() === '') {
            return i + 1 // Return 1-based row index
        }
    }

    // If no empty row found in current data, return next new row
    return data.length + 1
}

export async function createOperation(datos: any) { // Cambiado a 'any' para aceptar los campos extra del payload
    try {
        const tabName = await resolveMasterTabName()
        const range = `${tabName}!A:AZ`
        const data = await getSheetData(MASTER_SPREADSHEET_ID, range, true) // Force fresh data

        let headers: string[] = []
        if (data.length > 0) {
            headers = data[0].map(h => h.trim())
        } else {
            // Fallback completo basado en OPERATION_FIELD_MAP
            headers = [
                'ID_Carga', 'Nombre carpeta', 'Id carpeta', 'Pi Number', 'UserID',
                'Import_ID', 'Export_ID', 'Producer_ID', 'Productos_Raw', 'Brand',
                'Port_Load', 'Port_Dest', 'Incoterm', 'Ship_Lane', 'ETD', 'Trading',
                'Payment_Terms', 'Notes', 'Estado', 'ID_documento', 'Timestamp'
            ]
            await appendRow(MASTER_SPREADSHEET_ID, range, headers)
        }

        const findIdx = (keys: string[]) => {
            const lowerHeaders = headers.map(h => h.toLowerCase().trim())
            for (const k of keys) {
                const idx = lowerHeaders.indexOf(k.toLowerCase().trim())
                if (idx !== -1) return idx
            }
            return -1
        }

        // --- Generar ID_Carga (Formato NNN-YY) ---
        const currentYear = new Date().getFullYear().toString().substring(2)
        let finalId = ''

        // Check if ID is already provided in the correct format (e.g. 082-26)
        const providedId = (datos.id || datos.id_carga || '').trim()
        const idRegex = /^(\d{3})\s*[-/]\s*(\d{2})$/
        let idIdx = findIdx(OPERATION_FIELD_MAP.id)
        if (idIdx === -1) idIdx = 0 // Fallback to column A

        if (idRegex.test(providedId)) {
            finalId = providedId
            console.log(`[googleSheets] Using provided ID: ${finalId}`)
        } else {
            let maxNum = 0
            data.slice(1).forEach(row => {
                const idVal = row[idIdx]
                if (idVal && typeof idVal === 'string') {
                    // Match patterns like "081-26", "81 - 26", "081/26", "001-26"
                    const match = String(idVal).trim().match(/^0*(\d+)\s*[-/]\s*(\d{2})$/)
                    if (match && match[2] === currentYear) {
                        const num = parseInt(match[1], 10)
                        if (num > maxNum) maxNum = num
                    } else if (idVal.trim().includes('-' + currentYear)) {
                        const parts = idVal.trim().split('-')
                        const num = parseInt(parts[0], 10)
                        if (!isNaN(num) && num < 1000 && num > maxNum) maxNum = num
                    }
                }
            });

            const nextNum = maxNum + 1
            finalId = `${String(nextNum).padStart(3, '0')}-${currentYear}`
            console.log(`[googleSheets] Generated new sequential ID: ${finalId} (maxNum was ${maxNum})`)
        }

        // --- Preparar datos automáticos ---
        const timestamp = new Date().toISOString()
        const piNumber = `Pi ${finalId}`
        const ocId = `Po ${finalId}`

        // Logic para Nombre de Carpeta
        const folderName = calculateFolderName({
            id: finalId,
            cliente: datos.import_id || datos.cliente,
            exportador: datos.export_id || datos.exportador,
            productor: datos.producer_id || datos.productor,
            puertoDestino: datos.port_dest || datos.puertoDestino,
            userId: datos.user_id || datos.userId
        })

        // --- Find Query Row ---
        const targetRowIndex = await findNextEmptyRow(MASTER_SPREADSHEET_ID, tabName, range, idIdx !== -1 ? idIdx : 0)

        const newRow = new Array(headers.length).fill('')

        const mapField = (field: string, val: any) => {
            const keys = OPERATION_FIELD_MAP[field]
            if (keys) {
                const idx = findIdx(keys)
                if (idx !== -1) {
                    newRow[idx] = val === undefined || val === null ? '' : String(val)
                }
            }
        }

        // --- MAPEO DE DATOS ---
        mapField('id', finalId)
        mapField('estado', OPERATIONAL_STATUS.CREATED)
        mapField('cliente', datos.import_id || datos.cliente)
        mapField('exportador', datos.export_id || datos.exportador)
        mapField('productor', datos.producer_id || datos.productor)
        mapField('fechaEmbarque', datos.ship_date || datos.fechaEmbarque)
        mapField('puertoDestino', datos.port_dest || datos.puertoDestino)
        mapField('portLoad', datos.port_load || datos.portLoad)
        mapField('shipLane', datos.ship_lane || datos.shipLane || 'To be confirmed')
        mapField('incoterm', datos.incoterm)
        mapField('trading', datos.trading)
        mapField('paymentTerms', datos.payment_terms || datos.paymentTerms)
        mapField('brand', datos.brand)
        mapField('notas', datos.notas)
        mapField('productos', datos.products_raw || datos.productos)
        mapField('purchasePricesRaw', datos.purchase_prices_raw || datos.purchasePricesRaw)
        mapField('userId', datos.user_id || datos.userId)
        mapField('piNumber', piNumber)
        mapField('ocId', ocId)
        mapField('timestamp', timestamp)
        mapField('nombreCarpeta', folderName)
        mapField('idDocumento', datos.idDocumento)
        mapField('notifyId', datos.notifyId)
        mapField('billToId', datos.billToId)
        mapField('consigneeId', datos.consigneeId)
        mapField('booking', datos.booking)
        mapField('forwarder', datos.forwarder)
        mapField('freightValue', datos.freightValue)
        mapField('containerNumber', datos.containerNumber)
        mapField('idCarpeta', datos.idCarpeta || datos.folderId)
        mapField('arrivalDate', datos.arrivalDate)

        console.log('[DEBUG] createOperation: Updating Row:', targetRowIndex, JSON.stringify(newRow))
        await updateRow(MASTER_SPREADSHEET_ID, tabName, targetRowIndex, newRow)
        console.log('[DEBUG] createOperation: Row Updated Successfully. ID:', finalId)

        // --- INVALIDATE CACHE TO PREVENT STALE READS ---
        invalidateCache(MASTER_SPREADSHEET_ID)

        return { ...datos, id: finalId, piNumber, folderName, success: true }

    } catch (error) {
        console.error('Error creating operation:', error)
        throw error
    }
}

export async function getHistoricalOperations(): Promise<Operacion[]> {
    try {
        const tabName = TABS.history
        const data = await getSheetData(MASTER_SPREADSHEET_ID, `${tabName}!A:AZ`)

        if (data.length < 2) return []

        const headers = data[0].map(h => h.trim().toLowerCase())
        // Map rows to objects
        const operations = data.slice(1).map(row => {
            const op = mapRowToOperacion(row, headers)
            return { ...op, isArchived: true }
        })

        return operations
    } catch (error) {
        console.error('Error getting historical operations:', error)
        return []
    }
}


// === NUEVAS FUNCIONES PARA PROFORMA ENGINE ===

export async function getOperationById(id: string): Promise<Operacion | null> {
    try {
        // 1. Try Master Input First
        let tabName = await resolveMasterTabName()
        let data = await getSheetData(MASTER_SPREADSHEET_ID, `${tabName}!A:AZ`)
        const normalizeId = (s: string) => s.trim().toLowerCase().replace(/^0+/, '').replace(/-0+/, '-');
        const searchIdNorm = normalizeId(id);

        let foundRow: string[] | undefined
        let headers: string[] = []
        let isArchived = false

        if (data.length >= 2) {
            headers = data[0].map(h => h.trim().toLowerCase())
            const idIdx = headers.findIndex(h => h === 'id' || h === 'id_carga' || h === 'id carga' || h === 'idcarga')

            if (idIdx !== -1) {
                foundRow = data.find(r => r[idIdx] && normalizeId(r[idIdx]) === searchIdNorm)
            }
        }

        // 2. If not found, try History
        if (!foundRow) {
            tabName = TABS.history
            data = await getSheetData(MASTER_SPREADSHEET_ID, `${tabName}!A:AZ`)

            if (data.length >= 2) {
                // Headers should be same, but let's re-read to be safe
                headers = data[0].map(h => h.trim().toLowerCase())
                const idIdx = headers.findIndex(h => h === 'id' || h === 'id_carga' || h === 'id carga' || h === 'idcarga')

                if (idIdx !== -1) {
                    foundRow = data.find(r => r[idIdx] && normalizeId(r[idIdx]) === searchIdNorm)
                    if (foundRow) isArchived = true
                }
            }
        }

        if (!foundRow) {
            return null
        }

        const op = mapRowToOperacion(foundRow, headers)
        return { ...op, isArchived }
    } catch (error) {
        console.error(`Error getting operation ${id}:`, error)
        return null
    }
}

export async function getAllOperations(userId?: string): Promise<Operacion[]> {
    try {
        const resolvedMasterTab = await resolveMasterTabName()
        let data: string[][] = []
        const possibleTabs = [resolvedMasterTab, 'Master Input', 'Proforma Master Input']

        for (const tab of possibleTabs) {
            data = await getSheetData(MASTER_SPREADSHEET_ID, `${tab}!A:AZ`)
            if (data.length > 0) {
                console.log(`[googleSheets] Found master data in tab: ${tab}`)
                break
            }
        }

        if (data.length < 2) return []

        const headers = data[0].map(h => h.trim().toLowerCase())
        const idKeys = OPERATION_FIELD_MAP.id.map(k => k.toLowerCase())
        const idIdx = headers.findIndex(h => idKeys.includes(h))

        if (idIdx === -1) {
            console.warn('[googleSheets] ID column not found in headers:', headers)
        }

        let operations = data.slice(1)
            .map((row, i) => {
                const op = mapRowToOperacion(row, headers)
                op.row_number = i + 2 // +1 index, +1 header row
                return op
            })
            .filter(op => op.id && String(op.id).trim() !== '')

        if (userId) {
            operations = operations.filter(op => op.userId?.toLowerCase() === userId.toLowerCase())
        }

        return operations
    } catch (error) {
        console.error('Error getting all operations:', error)
        return []
    }
}

export async function liquidateOperation(id: string) {
    try {
        const auth = await getAuthClient()
        const sheets = google.sheets({ version: 'v4', auth: auth as any })

        // 1. Resolve actual tab name (handles 'Master Imput' typo and other variants)
        const tabName = await resolveMasterTabName()

        const masterResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: MASTER_SPREADSHEET_ID,
            range: `${tabName}!A:AZ`
        })

        const masterData = masterResponse.data.values || []
        if (masterData.length < 2) throw new Error('No data found in Master Input')

        const sourceHeaders = masterData[0].map((h: string) => h.trim())
        const sourceHeadersLower = sourceHeaders.map((h: string) => h.toLowerCase())
        const idKeys = OPERATION_FIELD_MAP.id.map(k => k.toLowerCase())
        const idIdx = sourceHeadersLower.findIndex(h => idKeys.includes(h))

        if (idIdx === -1) throw new Error('ID column not found in Master Input')

        // Normalize IDs for robust matching (handles spacing, leading zeros, dash variants)
        const normalizeId = (s: string) =>
            String(s || '').trim().toLowerCase().replace(/\s*[-\/]\s*/g, '-').replace(/^0+/, '')

        const searchId = normalizeId(id)

        let rowIndex = -1
        let rowToMove: any[] | null = null

        for (let i = 1; i < masterData.length; i++) {
            if (normalizeId(masterData[i][idIdx] || '') === searchId) {
                rowIndex = i
                rowToMove = masterData[i]
                break
            }
        }

        if (!rowToMove || rowIndex === -1) throw new Error(`Operation ${id} not found in Master Input`)

        // 2. Read Historial headers to align columns correctly
        const historyTab = TABS.history
        const historyHeaderResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: MASTER_SPREADSHEET_ID,
            range: `${historyTab}!1:1`
        })

        const historyHeaders = (historyHeaderResponse.data.values?.[0] || []).map((h: string) => h.trim())
        const historyHeadersLower = historyHeaders.map((h: string) => h.toLowerCase())

        let alignedRow: string[]

        if (historyHeaders.length > 0) {
            // Map each Historial column to the value from the source row by matching header names
            alignedRow = historyHeadersLower.map((destKey: string) => {
                const srcIdx = sourceHeadersLower.findIndex(h => h === destKey)
                return srcIdx !== -1 ? (rowToMove![srcIdx] ?? '') : ''
            })
        } else {
            // Historial has no headers yet — copy row as-is
            alignedRow = [...rowToMove]
        }

        // 3. Append aligned row to Historial
        await sheets.spreadsheets.values.append({
            spreadsheetId: MASTER_SPREADSHEET_ID,
            range: `${historyTab}!A:AZ`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [alignedRow]
            }
        })

        // 4. Move CashFlow transactions
        const cfTab = TABS.cashFlow
        const cfHistoryTab = TABS.cashFlowHistory

        const cfResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: MASTER_SPREADSHEET_ID,
            range: `${cfTab}!A:Z`
        })

        const cfData = cfResponse.data.values || []
        if (cfData.length > 1) {
            const cfHeadersLower = cfData[0].map((h: string) => String(h || '').trim().toLowerCase())
            const cfIdAliases = ['id_carga', 'id carga', 'idcarga', 'idc', 'operacion']
            const cfIdIdx = cfHeadersLower.findIndex(h => cfIdAliases.includes(h))

            if (cfIdIdx !== -1) {
                const txsToMove: any[][] = []
                const indicesToDelete: number[] = []

                for (let i = 1; i < cfData.length; i++) {
                    if (normalizeId(cfData[i][cfIdIdx] || '') === searchId) {
                        txsToMove.push(cfData[i])
                        indicesToDelete.push(i)
                    }
                }

                if (txsToMove.length > 0) {
                    // 4a. Read CashFlow_Historial headers to align columns
                    const cfHistResponse = await sheets.spreadsheets.values.get({
                        spreadsheetId: MASTER_SPREADSHEET_ID,
                        range: `${cfHistoryTab}!1:1`
                    })
                    const cfHistHeadersLower = (cfHistResponse.data.values?.[0] || []).map((h: string) =>
                        String(h || '').trim().toLowerCase()
                    )

                    let alignedTxs: any[][]
                    if (cfHistHeadersLower.length > 0) {
                        alignedTxs = txsToMove.map(tx =>
                            cfHistHeadersLower.map((destKey: string) => {
                                const srcIdx = cfHeadersLower.findIndex(h => h === destKey)
                                return srcIdx !== -1 ? (tx[srcIdx] ?? '') : ''
                            })
                        )
                    } else {
                        alignedTxs = txsToMove
                    }

                    // 4b. Append to CashFlow_Historial
                    await sheets.spreadsheets.values.append({
                        spreadsheetId: MASTER_SPREADSHEET_ID,
                        range: `${cfHistoryTab}!A:Z`,
                        valueInputOption: 'USER_ENTERED',
                        requestBody: { values: alignedTxs }
                    })

                    // 4c. Delete from CashFlow (bottom-to-top to preserve row indices during deletion)
                    indicesToDelete.sort((a, b) => b - a)

                    const cfSheetMeta = await sheets.spreadsheets.get({ spreadsheetId: MASTER_SPREADSHEET_ID })
                    const cfSheetId = cfSheetMeta.data.sheets?.find(
                        s => s.properties?.title === cfTab
                    )?.properties?.sheetId

                    if (cfSheetId !== undefined) {
                        const requests = indicesToDelete.map(idx => ({
                            deleteDimension: {
                                range: {
                                    sheetId: cfSheetId,
                                    dimension: 'ROWS',
                                    startIndex: idx,     // data[i] = sheet row i+1, index = i (0-based)
                                    endIndex: idx + 1
                                }
                            }
                        }))
                        await sheets.spreadsheets.batchUpdate({
                            spreadsheetId: MASTER_SPREADSHEET_ID,
                            requestBody: { requests }
                        })
                    }
                }
            }
        }

        // 5. Delete Operation from Master Input
        const meta = await sheets.spreadsheets.get({ spreadsheetId: MASTER_SPREADSHEET_ID })
        const sheet = meta.data.sheets?.find(s => s.properties?.title === tabName)
        const sheetId = sheet?.properties?.sheetId

        if (sheetId === undefined) throw new Error(`Could not find sheetId for tab "${tabName}"`)

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: MASTER_SPREADSHEET_ID,
            requestBody: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex,    // 0-based: row at data[rowIndex] = sheet row rowIndex+1
                            endIndex: rowIndex + 1
                        }
                    }
                }]
            }
        })

        // Invalidate caches
        invalidateCache(MASTER_SPREADSHEET_ID)

        return { success: true, message: `Operation ${id} liquidated and moved to history` }
    } catch (error: any) {
        console.error(`Error liquidating operation ${id}:`, error)
        throw error
    }
}

// Tracking Sheet ID identified in N8N: '136QW5v7Q6BV-pz6ki768MGgY5aW1xdXU5fDWo3Wv_bQ'
const TRACKING_SPREADSHEET_ID = '136QW5v7Q6BV-pz6ki768MGgY5aW1xdXU5fDWo3Wv_bQ';

export async function addToTrackingSheet(data: Record<string, string>) {
    try {
        const tabName = 'Hoja 1' // As seen in N8N
        const fullData = await getSheetData(TRACKING_SPREADSHEET_ID, `${tabName}!A:Z`)

        let headers: string[] = []
        if (fullData.length > 0) {
            headers = fullData[0].map(h => h.trim())
        } else {
            // Fallback headers based on N8N node
            headers = ['Responsable (User)', 'Importador', 'Exportador', 'Productor', 'Destino', 'Trading', 'N Proforma', 'Fecha de Cierre', 'N Carga', 'Estado']
            await appendRow(TRACKING_SPREADSHEET_ID, `${tabName}!A:Z`, headers)
        }

        const newRow = new Array(headers.length).fill('')

        // Helper to find index case-insensitive
        const findIdx = (key: string) => headers.findIndex(h => h.toLowerCase() === key.toLowerCase())

        const mapVal = (key: string, val: string) => {
            const idx = findIdx(key)
            if (idx !== -1) newRow[idx] = val
        }

        // Mapping based on N8N "Actualizar Seguimiento de cargas" node
        mapVal('Responsable (User)', data.responsable)
        mapVal('Importador', data.importador)
        mapVal('Exportador', data.exportador)
        mapVal('Productor', data.productor)
        mapVal('Destino', data.destino)
        mapVal('Trading', data.trading)
        mapVal('N Proforma', data.proforma)
        mapVal('N Carga', data.idCarga)
        mapVal('Estado', data.estado)
        mapVal('Fecha de Cierre', data.fechaCierre || '')

        await appendRow(TRACKING_SPREADSHEET_ID, `${tabName}!A:Z`, newRow)
        return true


    } catch (error) {
        console.error('Error adding to tracking sheet:', error)
        throw error
    }
}

export async function updateOperation(id: string, datos: Partial<Operacion>, updaterEmail?: string, options?: { skipSync?: boolean }) {
    try {
        const session = await getServerSession(authOptions)
        if (session?.user && (session.user as any).isDemo) {
            console.log('[updateOperation] Demo mode: skipping real update and returning datos.')
            return { id, ...datos }
        }

        const tabName = await resolveMasterTabName()

        // Automatically set timestamp on update
        const updatedDatos = {
            ...datos,
            timestamp: new Date().toISOString(),
            lastUpdatedBy: updaterEmail || datos.lastUpdatedBy
        }

        // 1. Fetch Fresh Data (force cache bypass)
        const freshData = await getSheetData(MASTER_SPREADSHEET_ID, `${tabName}!A:AZ`, true)
        const headers = freshData[0].map(h => h.trim().toLowerCase())

        // 2. Define Helper for Column Search
        const findIdx = (keys: string[]) => {
            for (const k of keys) {
                const idx = headers.indexOf(k.toLowerCase())
                if (idx !== -1) return idx
            }
            return -1
        }

        const freshIdIdx = findIdx(OPERATION_FIELD_MAP.id)
        if (freshIdIdx === -1) {
            throw new Error(`ID column not found in ${tabName}`)
        }

        // 3. Locate Row
        let freshRowIndex = -1
        for (let i = 1; i < freshData.length; i++) {
            const cellVal = (freshData[i][freshIdIdx] || '').trim()
            if (cellVal === id.trim()) {
                freshRowIndex = i + 1
                break
            }
        }

        if (freshRowIndex === -1) throw new Error(`Operation ${id} not found during safe update`)

        // 4. Prepare Updated Row
        const originalRow = freshData[freshRowIndex - 1]
        const updatedRow = [...originalRow]

        // Ensure row has enough columns
        if (updatedRow.length < headers.length) {
            updatedRow.push(...new Array(headers.length - updatedRow.length).fill(''))
        }

        // 5. Update values
        Object.keys(updatedDatos).forEach(key => {
            const fieldKeys = (OPERATION_FIELD_MAP as any)[key]
            if (fieldKeys) {
                const colIdx = findIdx(fieldKeys)
                if (colIdx !== -1) {
                    const val = (updatedDatos as any)[key]
                    if (val !== undefined) {
                        updatedRow[colIdx] = val === null ? '' : String(val)
                    }
                }
            }
        })

        // --- AUTOMATIC STATUS TRIGGERS ---
        // if booking is present and state is < 7, set to 7
        // if container is present and state is < 8, set to 8
        const estadoIdx = findIdx(OPERATION_FIELD_MAP.estado)
        const bookingIdx = findIdx(OPERATION_FIELD_MAP.booking)
        const containerIdx = findIdx(OPERATION_FIELD_MAP.containerNumber)

        if (estadoIdx !== -1) {
            let currentStatus = updatedRow[estadoIdx] || ''

            // Trigger 1: Booking Confirmado (7)
            if (bookingIdx !== -1 && updatedRow[bookingIdx] && updatedRow[bookingIdx].trim() !== '') {
                // simple check: if it doesn't have a number yet or number < 7
                const statusMatch = currentStatus.match(/^(\d+)/)
                const currentNum = statusMatch ? parseInt(statusMatch[1]) : 0
                if (currentNum < 7) {
                    updatedRow[estadoIdx] = OPERATIONAL_STATUS.BOOKING_CONFIRMED
                    currentStatus = OPERATIONAL_STATUS.BOOKING_CONFIRMED
                }
            }

            // Trigger 2: Carga Realizada (8)
            if (containerIdx !== -1 && updatedRow[containerIdx] && updatedRow[containerIdx].trim() !== '') {
                const statusMatch = currentStatus.match(/^(\d+)/)
                const currentNum = statusMatch ? parseInt(statusMatch[1]) : 0
                if (currentNum < 8) {
                    updatedRow[estadoIdx] = OPERATIONAL_STATUS.LOADED
                }
            }
        }

        await updateRow(MASTER_SPREADSHEET_ID, tabName, freshRowIndex, updatedRow)

        // 6. SMART FINANCIAL ADJUSTMENT — triggered when Detalle financial fields change.
        // Uses adjustFinancialTransactions (not the generic insert-only sync) so it can:
        //   - Update PENDING flete/pago/cobro amounts based on new values
        //   - Respect PAID rows (never touch them)
        //   - Handle partial-payment scenarios (adelanto paid, saldo adjusted)
        // skipSync prevents infinite recursion when called from updateCashFlowTransaction bidirectional sync.
        const financialFields = ['productos', 'purchasePricesRaw', 'freightValue', 'paymentTerms']
        const changedFinancialFields = Object.keys(datos).filter(k => financialFields.includes(k))
        const shouldSync = !options?.skipSync && changedFinancialFields.length > 0
        if (shouldSync) {
            try {
                console.log(`[updateOperation] Triggering smart financial adjustment for ${id}, changed: ${changedFinancialFields.join(', ')}`)
                await adjustFinancialTransactions(id, changedFinancialFields)
            } catch (syncError) {
                console.error(`[updateOperation] Financial adjustment failed for ${id}:`, syncError)
            }
        }

        return mapRowToOperacion(updatedRow, headers)

    } catch (error) {
        console.error('Error updating operation:', error)
        throw error
    }
}

export async function getRecentOperations(userId?: string) {
    try {
        const spreadsheetId = process.env.SHEET_MASTER_ID || '1TmEDhSznW0XgUUETm2aP_0g_rDopW7ZVTbxm3QavDro'
        const tabName = TABS.masterInput

        console.log(`[Operations] Fetching from ${spreadsheetId}, tab: ${tabName}`)

        const data = await getSheetData(spreadsheetId, `${tabName}!A:AZ`)

        if (data.length < 2) {
            console.warn(`[Operations] No data found in ${tabName}. Rows: ${data.length}`)
            return []
        }

        const headers = data[0].map(h => h.trim().toLowerCase())
        const idIdx = headers.indexOf('id_carga')
        const userIdx = headers.indexOf('userid')

        const operations: Operacion[] = []
        // Scan backwards, but we might need more than 50 rows if we are filtering by user
        const scanLimit = userId ? data.length - 1 : Math.max(1, data.length - 50)

        for (let i = data.length - 1; i >= 1; i--) {
            const row = data[i]
            if (idIdx === -1 || !row[idIdx]) continue

            // Filter by user if provided
            if (userId && row[userIdx]?.toLowerCase() !== userId.toLowerCase()) {
                continue
            }

            operations.push(mapRowToOperacion(row, headers))
            if (operations.length >= 20) break
            if (!userId && i < scanLimit) break // Only break early if not filtering
        }

        return operations

    } catch (error) {
        console.error('Error fetching recent operations:', error)
        return []
    }
}

export async function getOperationsByContact(contactName: string, contactId?: string): Promise<Operacion[]> {
    try {
        const resolvedMasterTab = await resolveMasterTabName()
        let data: string[][] = []
        const possibleTabs = [resolvedMasterTab, 'Master Input', 'Proforma Master Input', 'Master Imput']

        for (const tab of possibleTabs) {
            data = await getSheetData(MASTER_SPREADSHEET_ID, `${tab}!A:AZ`)
            if (data.length > 0) {
                console.log(`[googleSheets] getOperationsByContact: Found data in tab: ${tab}`)
                break
            }
        }

        if (data.length < 2) {
            console.warn(`[googleSheets] getOperationsByContact: No data found in any candidate tab for ${contactName}`)
            return []
        }

        const headers = data[0].map(h => h.trim().toLowerCase())

        // Use OPERATION_FIELD_MAP keys to find column indices
        const findCol = (field: keyof typeof OPERATION_FIELD_MAP) => {
            const keys = OPERATION_FIELD_MAP[field]
            for (const k of keys) {
                const idx = headers.indexOf(k.toLowerCase())
                if (idx !== -1) return idx
            }
            return -1
        }

        const importerIdx = findCol('cliente')
        const exporterIdx = findCol('exportador')
        const producerIdx = findCol('productor')
        const forwarderIdx = findCol('forwarder')
        const idIdx = findCol('id')

        const results: Operacion[] = []
        const nameLower = contactName.toLowerCase().trim()
        const idLower = contactId?.toLowerCase().trim()

        // Normalize IDs to handle slugs like E125-COMPANYNAME
        const normalizeId = (id: string) => {
            if (!id) return ''
            const match = id.match(/^(E\d+)/i)
            return (match ? match[1] : id).toLowerCase().trim()
        }

        const shortIdSearch = idLower ? normalizeId(idLower) : ''

        // Iterate backwards for most recent first
        for (let i = data.length - 1; i >= 1; i--) {
            const row = data[i]
            if (idIdx !== -1 && !row[idIdx]) continue

            const importerVal = (row[importerIdx] || '').toLowerCase().trim()
            const exporterVal = (row[exporterIdx] || '').toLowerCase().trim()
            const producerVal = (row[producerIdx] || '').toLowerCase().trim()
            const forwarderVal = (row[forwarderIdx] || '').toLowerCase().trim()

            const isMatch = (target: string) => {
                if (!target) return false
                // Check exact match
                if (target === nameLower) return true
                // Check ID match (exact or prefix for slugs)
                if (idLower && (target === idLower || target === shortIdSearch)) return true
                // Check if target ID is the short version of our long ID
                if (shortIdSearch && target.toLowerCase() === shortIdSearch) return true
                // Check partial name match for robustness
                if (nameLower.length > 5 && (target.includes(nameLower) || nameLower.includes(target))) return true
                return false
            }

            const match = isMatch(importerVal) || isMatch(exporterVal) ||
                isMatch(producerVal) || isMatch(forwarderVal)

            if (match) {
                results.push(mapRowToOperacion(row, headers))
            }

            // Limit to last 50 associated operations
            if (results.length >= 50) break
        }

        return results
    } catch (error) {
        console.error(`Error getting operations for contact ${contactName} (${contactId}):`, error)
        return []
    }
}


// === HELPERS DE ESCRITURA ===

async function appendRow(spreadsheetId: string, range: string, values: string[]) {
    try {
        const authClient = await getAuthClient()
        await sheets.spreadsheets.values.append({
            auth: authClient as any,
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            requestBody: { values: [values] }
        })
        invalidateCache(spreadsheetId)
    } catch (error) {
        console.error(`Error appending to ${spreadsheetId}:`, error)
        throw error
    }
}

async function updateRow(spreadsheetId: string, tabName: string, rowIndex: number, values: string[] | Record<string, string>) {
    try {
        let valuesArray: string[];
        if (Array.isArray(values)) {
            valuesArray = values;
        } else {
            // If values is an object, we need to fetch the current row to update specific cells
            const currentData = await getSheetData(spreadsheetId, `${tabName}!A:AZ`);
            const headers = currentData[0].map(h => h.trim().toLowerCase());
            const currentRow = currentData[rowIndex - 1] || new Array(headers.length).fill('');
            valuesArray = [...currentRow];

            Object.entries(values).forEach(([key, val]) => {
                const idx = headers.indexOf(key.toLowerCase());
                if (idx !== -1) {
                    valuesArray[idx] = val;
                }
            });
        }

        const range = `${tabName}!A${rowIndex}`
        const authClient = await getAuthClient()
        await sheets.spreadsheets.values.update({
            auth: authClient as any,
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [valuesArray] }
        })
        invalidateCache(spreadsheetId)
    } catch (error) {
        console.error(`Error updating row ${rowIndex} in ${spreadsheetId}:`, error)
        throw error
    }
}

async function deleteRow(spreadsheetId: string, tabName: string, rowIndex: number) {
    try {
        const authClient = await getAuthClient()
        const meta = await sheets.spreadsheets.get({
            auth: authClient as any,
            spreadsheetId: spreadsheetId
        })
        const sheetId = meta.data.sheets?.find(s => s.properties?.title === tabName)?.properties?.sheetId

        if (!sheetId) throw new Error(`Sheet ${tabName} not found in spreadsheet ${spreadsheetId}`)

        await sheets.spreadsheets.batchUpdate({
            auth: authClient as any,
            spreadsheetId: spreadsheetId,
            requestBody: {
                requests: [
                    {
                        deleteDimension: {
                            range: {
                                sheetId,
                                dimension: 'ROWS',
                                startIndex: rowIndex - 1, // 0-based inclusive
                                endIndex: rowIndex // 0-based exclusive
                            }
                        }
                    }
                ]
            }
        })
        invalidateCache(spreadsheetId)
    } catch (error) {
        console.error(`Error deleting row ${rowIndex} in ${spreadsheetId}:`, error)
        throw error
    }
}

export async function updateTrackingStatus(idCarga: string, newStatus: string) {
    try {
        const tabName = 'Hoja 1'
        const data = await getSheetData(TRACKING_SPREADSHEET_ID, `${tabName}!A:Z`)

        if (data.length < 2) return false

        const headers = data[0].map(h => h.trim().toLowerCase())
        const chargeIdIdx = headers.indexOf('n carga')
        const statusIdx = headers.indexOf('estado')

        if (chargeIdIdx === -1 || statusIdx === -1) {
            console.error('Tracking Sheet missing columns')
            return false
        }

        // Find row
        let rowIndex = -1
        for (let i = 1; i < data.length; i++) {
            if (data[i][chargeIdIdx] === idCarga) {
                rowIndex = i + 1
                break
            }
        }

        if (rowIndex !== -1) {
            const currentRow = data[rowIndex - 1]
            currentRow[statusIdx] = newStatus
            await updateRow(TRACKING_SPREADSHEET_ID, tabName, rowIndex, currentRow)
            return true
        }

        return false

    } catch (error) {
        console.error('Error updating tracking status:', error)
        return false
    }
}

// === NOTAS (Notes Spreadsheet) ===

export async function getNotes(): Promise<Note[]> {
    try {
        const tabName = TABS.notes
        // Read range A:Z to include user matrix columns (emails)
        const data = await getSheetData(NOTES_SPREADSHEET_ID, `${tabName}!A:Z`)

        if (data.length < 2) return []

        const headers = data[0].map(h => h.trim().toLowerCase())
        const knownUserEmails = Object.keys(USER_MAP).map(e => e.toLowerCase())

        // Helper to find value
        const getVal = (row: string[], ...keys: string[]) => {
            for (const key of keys) {
                const idx = headers.indexOf(key.toLowerCase())
                if (idx !== -1) return row[idx]
            }
            return ''
        }

        const notes: Note[] = []
        for (let i = 1; i < data.length; i++) {
            const row = data[i]
            if (!row[0] && !row[1]) continue

            const typeRaw = getVal(row, 'type', 'tipo')
            let type: Note['type'] = 'info'
            if (['alert', 'alerta'].includes(typeRaw)) type = 'alert'
            if (['success', 'exito'].includes(typeRaw)) type = 'success'
            if (['warning'].includes(typeRaw)) type = 'warning'

            const mentionsRaw = getVal(row, 'mentions', 'menciones')

            // --- MATRIX LOGIC: activeFor ---
            const activeFor: string[] = []
            headers.forEach((header, idx) => {
                const cleanHeader = header.trim().toLowerCase()

                // Check if this header represents a user (by email or name)
                const userByEmail = USER_MAP[cleanHeader]
                const userByName = Object.entries(USER_MAP).find(([_, info]) => info.name.toLowerCase() === cleanHeader)
                const userEmail = userByEmail ? cleanHeader : (userByName ? userByName[0].toLowerCase() : null)

                if (userEmail && row[idx] && row[idx].trim().toUpperCase() === 'X') {
                    activeFor.push(userEmail)
                }
            })

            notes.push({
                id: getVal(row, 'id'),
                content: getVal(row, 'content', 'contenido', 'nota'),
                author: getVal(row, 'author', 'autor', 'creado por'),
                timestamp: getVal(row, 'timestamp', 'fecha'),
                type,
                mentions: mentionsRaw ? mentionsRaw.split(',').map(m => m.trim()) : [],
                operationId: getVal(row, 'operationId', 'operation_id', 'id_carga'),
                dismissedBy: getVal(row, 'dismissedBy', 'dismissed_by')?.split(',').map(e => e.trim()).filter(Boolean) || [],
                activeFor,
                productId: getVal(row, 'productId', 'productid', 'id_producto'),
                contactId: getVal(row, 'contactId', 'contactid', 'id_contacto')
            })
        }

        // Sort by timestamp desc
        return notes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    } catch (error) {
        console.error('Error fetching notes:', error)
        return []
    }
}

export async function createNote(note: Partial<Note>) {
    try {
        const tabName = TABS.notes
        const data = await getSheetData(NOTES_SPREADSHEET_ID, `${tabName}!A:Z`)

        let headers: string[] = []
        if (data.length > 0) {
            headers = data[0].map(h => h.trim().toLowerCase())
        } else {
            // Default headers if sheet is empty
            headers = ['id', 'content', 'author', 'timestamp', 'type', 'mentions', 'operationId', 'dismissedBy', 'productId', 'contactId']
            await appendRow(NOTES_SPREADSHEET_ID, `${tabName}!A:H`, headers)
        }

        const newRow = new Array(headers.length).fill('')
        const findIdx = (keys: string[]) => {
            for (const k of keys) {
                const idx = headers.indexOf(k.toLowerCase())
                if (idx !== -1) return idx
            }
            return -1
        }

        const mapField = (keys: string[], val: string | undefined) => {
            const idx = findIdx(keys)
            if (idx !== -1) newRow[idx] = val || ''
        }

        const id = note.id || Date.now().toString()
        const timestamp = note.timestamp || new Date().toISOString()
        const authorName = getResponsableName(note.author)

        mapField(['id'], id)
        mapField(['content', 'contenido'], note.content)
        mapField(['author', 'autor'], authorName)
        mapField(['timestamp', 'fecha'], timestamp)
        mapField(['type', 'tipo'], note.type || 'info')
        mapField(['mentions', 'menciones'], note.mentions ? note.mentions.join(',') : '')
        mapField(['operationId', 'operation_id', 'id_carga'], note.operationId)
        mapField(['dismissedBy', 'dismissed_by'], note.dismissedBy ? note.dismissedBy.join(',') : '')
        mapField(['productId', 'productid'], note.productId)
        mapField(['contactId', 'contactid'], note.contactId)

        // --- MATRIX LOGIC: activeFor ---
        // If activeFor is specified, put 'X' in those columns.
        // If not specified, put 'X' for ALL email columns (public note).
        const knownUserEmails = Object.keys(USER_MAP).map(e => e.toLowerCase())
        headers.forEach((header, idx) => {
            const cleanHeader = header.trim().toLowerCase()
            if (knownUserEmails.includes(cleanHeader) || Object.values(USER_MAP).some(u => u.name.toLowerCase() === cleanHeader)) {
                if (note.activeFor && note.activeFor.length > 0) {
                    const normalizedActiveFor = note.activeFor.map(e => e.toLowerCase())
                    const normalizedAuthor = (note.author || '').toLowerCase()

                    // Find if this header represents a user (by email or name)
                    const userByEmail = USER_MAP[cleanHeader]
                    const userByName = Object.entries(USER_MAP).find(([_, info]) => info.name.toLowerCase() === cleanHeader)

                    const userEmail = userByEmail ? cleanHeader : (userByName ? userByName[0].toLowerCase() : null)
                    const userName = userByEmail ? userByEmail.name.toLowerCase() : (userByName ? cleanHeader : null)

                    const isRecipient = (userEmail && normalizedActiveFor.includes(userEmail)) || (userName && normalizedActiveFor.includes(userName))
                    const isAuthor = (userEmail && normalizedAuthor === userEmail) || (userName && normalizedAuthor === userName)

                    if (isRecipient || isAuthor) {
                        newRow[idx] = 'X'
                    } else {
                        newRow[idx] = ''
                    }
                } else {
                    // Default to public if no specific targets
                    newRow[idx] = 'X'
                }
            }
        })

        await appendRow(NOTES_SPREADSHEET_ID, `${tabName}!A:Z`, newRow)
        return { ...note, id, timestamp }

    } catch (error) {
        console.error('Error creating note:', error)
        throw error
    }
}

export async function deleteOperationNote(noteId: string) {
    try {
        const tabName = TABS.notes
        const data = await getSheetData(NOTES_SPREADSHEET_ID, `${tabName}!A:Z`)

        if (data.length < 2) throw new Error('Note not found')

        const headers = data[0].map(h => h.trim().toLowerCase())
        const idIdx = headers.indexOf('id')

        if (idIdx === -1) throw new Error('ID column not found in Notes sheet')

        let rowIndex = -1
        for (let i = 1; i < data.length; i++) {
            if (data[i][idIdx] === noteId) {
                rowIndex = i + 1 // 1-based index
                break
            }
        }

        if (rowIndex === -1) throw new Error('Note not found')

        await deleteRow(NOTES_SPREADSHEET_ID, tabName, rowIndex)
        return true
    } catch (error) {
        console.error('Error deleting note:', error)
        throw error
    }
}

export async function updateNoteContent(noteId: string, content: string) {
    try {
        const tabName = TABS.notes
        const data = await getSheetData(NOTES_SPREADSHEET_ID, `${tabName}!A:Z`)
        if (data.length < 2) throw new Error('Note not found')

        const headers = data[0].map((h: string) => h.trim().toLowerCase())
        const idIdx = headers.indexOf('id')
        const contentIdx = headers.indexOf('content')

        if (idIdx === -1 || contentIdx === -1) throw new Error('Required columns not found in Notes sheet')

        let rowIndex = -1
        for (let i = 1; i < data.length; i++) {
            if (data[i][idIdx] === noteId) { rowIndex = i + 1; break }
        }
        if (rowIndex === -1) throw new Error('Note not found')

        await updateRow(NOTES_SPREADSHEET_ID, tabName, rowIndex, { [headers[contentIdx]]: content })
        return true
    } catch (error) {
        console.error('Error updating note content:', error)
        throw error
    }
}


export async function dismissNoteForUser(noteId: string, userEmail: string) {
    try {

        const tabName = TABS.notes
        // Read A:Z to find the user's email column
        const data = await getSheetData(NOTES_SPREADSHEET_ID, `${tabName}!A:Z`)
        if (data.length < 2) throw new Error('Note table empty')

        const headers = data[0].map(h => h.trim().toLowerCase())
        const userEmailLower = userEmail.toLowerCase().trim()

        // Find column by email OR by name
        let userColumnIdx = headers.indexOf(userEmailLower)
        if (userColumnIdx === -1) {
            const userName = USER_MAP[userEmailLower]?.name.toLowerCase()
            if (userName) userColumnIdx = headers.indexOf(userName)
        }

        const idIdx = headers.indexOf('id')
        let rowIndex = -1
        for (let i = 1; i < data.length; i++) {
            if (data[i][idIdx] === noteId) {
                rowIndex = i
                break
            }
        }
        if (rowIndex === -1) throw new Error('Note not found')


        // --- MATRIX LOGIC: Persistent Dismissal ---
        // If we found a column for this user, clear the 'X'
        if (userColumnIdx !== -1) {
            await updateRow(NOTES_SPREADSHEET_ID, tabName, rowIndex + 1, {
                [headers[userColumnIdx]]: '' // Set to empty to dismiss
            })

            // --- CLEANUP LOGIC: Delete row if no one else has it active ---
            // After update, we should check the refreshed row data
            const refreshedData = await getSheetData(NOTES_SPREADSHEET_ID, `${tabName}!A:Z`)
            const row = refreshedData[rowIndex]

            const opIdIdx = headers.indexOf('operationid')
            const opIdIdxAlternate = headers.indexOf('operation_id')
            const opIdIdxCarga = headers.indexOf('id_carga')
            const hasOperationId = (opIdIdx !== -1 && row[opIdIdx]) || 
                                   (opIdIdxAlternate !== -1 && row[opIdIdxAlternate]) || 
                                   (opIdIdxCarga !== -1 && row[opIdIdxCarga])

            // Check if ANY other column has an 'X' (or any non-empty value)
            // We ignore standard columns like ID, Date, Author, Content, Type
            const standardCols = ['id', 'date', 'timestamp', 'author', 'content', 'type', 'mentions', 'operationid', 'operation_id', 'id_carga', 'dismissedby', 'productid', 'contactid']
            const hasRemainingRecipient = headers.some((header, idx) => {
                if (standardCols.includes(header)) return false
                return !!row[idx] // If there's an 'X' or any value, it's still active for someone
            })

            if (!hasRemainingRecipient && !hasOperationId) {
                console.log(`[Cleanup] No recipients left for note ${noteId} and no operation ID. Deleting row ${rowIndex + 1}.`)
                await deleteRow(NOTES_SPREADSHEET_ID, tabName, rowIndex + 1)
            } else if (!hasRemainingRecipient && hasOperationId) {
                console.log(`[Cleanup] No recipients left for note ${noteId}, but keeping it for operation history.`)
            }
        } else {
            console.warn(`[Dismiss] No column found for email: ${userEmailLower}`)
        }

        return true
    } catch (error) {
        console.error('Error dismissing note:', error)
        throw error
    }
}

// === ADVANCED ACCOUNTING & COURIER LOGIC ===

/**
 * Predice el costo del courier basado en el histórico de rutas.
 * Busca en la pestaña 'Currier' la entrada más reciente para la ruta origen-destino.
 */
export async function getPredictedCourierCost(origin: string, destination: string): Promise<number> {
    try {
        const tabName = TABS.courier
        const data = await getSheetData(MASTER_SPREADSHEET_ID, `${tabName}!A:E`)
        if (data.length < 2) return 0

        const headers = data[0].map(h => h.trim().toLowerCase())
        const originIdx = headers.indexOf('puerto_origen')
        const destIdx = headers.indexOf('puerto_destino')
        const costIdx = headers.indexOf('costo_usd')

        if (originIdx === -1 || destIdx === -1 || costIdx === -1) return 0

        // Buscar última entrada para esta ruta
        const cleanOrigin = (origin || '').trim().toLowerCase()
        const cleanDest = (destination || '').trim().toLowerCase()

        for (let i = data.length - 1; i >= 1; i--) {
            const row = data[i]
            if (row[originIdx]?.trim().toLowerCase() === cleanOrigin &&
                row[destIdx]?.trim().toLowerCase() === cleanDest) {
                return parseAmount(row[costIdx])
            }
        }

        return 0
    } catch (error) {
        console.error('Error predicting courier cost:', error)
        return 0
    }
}

/**
 * Actualiza el historial de courier con un nuevo dato real.
 */
export async function updateCourierHistory(origin: string, destination: string, cost: number, courierName: string = 'DHL') {
    try {
        const tabName = TABS.courier
        const data = await getSheetData(MASTER_SPREADSHEET_ID, `${tabName}!A:E`)

        let headers: string[] = []
        if (data.length > 0) {
            headers = data[0].map(h => h.trim().toLowerCase())
        } else {
            headers = ['puerto_origen', 'puerto_destino', 'costo_usd', 'courier', 'notas']
            await appendRow(MASTER_SPREADSHEET_ID, `${tabName}!A:E`, headers)
        }

        const newRow = [origin, destination, cost.toString(), courierName, `Actualizado el ${new Date().toISOString().split('T')[0]}`]
        await appendRow(MASTER_SPREADSHEET_ID, `${tabName}!A:E`, newRow)
        return true
    } catch (error) {
        console.error('Error updating courier history:', error)
        return false
    }
}

import { parseProducts } from './validation'

/**
 * Genera movimientos contables proyectados basados en las reglas de negocio.
 * Reglas (User 2026-02-16):
 * 1. Flete: ETD + 10
 * 2. Courier: ETA - 10
 * 3. Cobro: 2 movimientos (30% ETD-10, 70% ETA) si hay advance, sino 1 (ETA)
 * 4. Pago a Proveedor: ETD + 10
 */
export async function generateAccountingTransactions(op: Operacion): Promise<Omit<CashFlowTransaction, 'id' | 'timestamp'>[]> {
    const transactions: Omit<CashFlowTransaction, 'id' | 'timestamp'>[] = []

    const parseDateAux = (d: string | undefined): Date | null => {
        if (!d || d.trim() === '' || d.trim() === '?' || d.toLowerCase().includes('por definir')) return null
        const parsed = new Date(d)
        if (isNaN(parsed.getTime())) return null
        return parsed
    }

    const etdDate = parseDateAux(op.etd || op.fechaEmbarque)
    const etaDate = parseDateAux(op.eta || op.arrivalDate)

    const addDaysOps = (date: Date | null, days: number): string | undefined => {
        if (!date) return undefined
        const res = new Date(date)
        res.setDate(res.getDate() + days)
        return res.toISOString().split('T')[0]
    }

    const fallbackDate = new Date().toISOString().split('T')[0]
    const safeEtd = etdDate ? (op.etd || op.fechaEmbarque)! : fallbackDate
    const safeEta = etaDate ? (op.eta || op.arrivalDate)! : fallbackDate

    const etdPlus10 = addDaysOps(etdDate, 10)
    const etdMinus10 = addDaysOps(etdDate, -10)
    const etaMinus7 = addDaysOps(etaDate, -7)

    // Calculate totals
    const products = parseProducts(op.productos || '')
    const purchaseProducts = parseProducts(op.purchasePricesRaw || '')

    const totalSales = products.reduce((sum, p) => sum + (p.qty * p.price), 0)
    const totalPurchases = purchaseProducts.reduce((sum, p) => sum + (p.qty * p.price), 0)

    const pTerms = (op.paymentTerms || '').toLowerCase()

    // 1. Cobros (Ingresos) - Improved Splitting Logic
    // Matches patterns like "30% Advance, 70% CAD" or "20% / 80%"
    const splitMatch = pTerms.match(/(\d+)\s*%\s*(?:advance|adelanto)?.*(\d+)\s*%\s*/i)

    if (splitMatch) {
        const firstPercent = parseInt(splitMatch[1]) / 100
        const secondPercent = parseInt(splitMatch[2]) / 100

        // first part (Advance) -> ETD-10 or fallback to ETD
        transactions.push({
            operationId: op.id!,
            date: etdMinus10 || safeEtd,
            type: 'INGRESO',
            category: 'Cobro',
            description: `Cobro Adelanto (${splitMatch[1]}%)`,
            amount: totalSales * firstPercent,
            status: 'PENDIENTE',
            dueDate: etdMinus10 || safeEtd
        })

        // second part (Balance) -> ETA or fallback
        transactions.push({
            operationId: op.id!,
            date: safeEta,
            type: 'INGRESO',
            category: 'Cobro',
            description: `Cobro Saldo (${splitMatch[2]}%)`,
            amount: totalSales * secondPercent,
            status: 'PENDIENTE',
            dueDate: safeEta
        })
    } else {
        // Just Case: single payment
        const targetDate = etaDate ? safeEta : (etdDate ? safeEtd : fallbackDate)
        transactions.push({
            operationId: op.id!,
            date: targetDate,
            type: 'INGRESO',
            category: 'Cobro',
            description: `Cobro Total`,
            amount: totalSales,
            status: 'PENDIENTE',
            dueDate: targetDate
        })
    }

    // 2. Pago a Proveedor (Egreso) -> ETD + 10
    // Use totalPurchases (purchase price)
    transactions.push({
        operationId: op.id!,
        date: etdPlus10 || safeEtd,
        type: 'EGRESO',
        category: 'Pago Proveedor',
        description: `Pago a proveedor (Precio compra)`,
        amount: totalPurchases,
        status: 'PENDIENTE',
        dueDate: etdPlus10 || safeEtd
    })

    // 3. Flete (Egreso/Ingreso según Incoterm) -> ETA - 7
    const rawFlete = op.freightValue || ''
    // Use parseNumeric (not raw parseFloat) because Google Sheets stores numbers in European format
    // e.g. 5150 is stored as "5.150" (dot = thousands separator), which parseFloat misreads as 5.15
    const fleteVal = parseNumeric(rawFlete) || 0
    const incoterm = (op.incoterm || '').toUpperCase()

    if (fleteVal > 0) {
        // Rule: Informative for C, F, E terms. Pending/Egreso for others (like D terms).
        const isInformative = ['CFR', 'CIF', 'CPT', 'CIP', 'FOB', 'FCA', 'EXW'].some(term => incoterm.includes(term))
        const fleteDate = etaMinus7 || safeEta

        transactions.push({
            operationId: op.id!,
            date: fleteDate,
            type: isInformative ? 'INFORMATIVO' : 'EGRESO',
            category: 'Flete',
            description: `Flete (${isInformative ? 'Informativo' : 'Costo directo'})`,
            amount: fleteVal,
            status: 'PENDIENTE',
            dueDate: fleteDate
        })
    }

    return transactions
}

/**
 * Sincroniza el cash flow de una operación evitando duplicación innecesaria.
 */
export async function syncOperationCashFlow(operationId: string) {
    try {
        const op = await getOperationById(operationId)
        if (!op) throw new Error('Operación no encontrada')

        const projected = await generateAccountingTransactions(op)
        const current = await getCashFlowByOperation(operationId, true)

        for (const tx of projected) {
            // Stronger Matching Logic to avoid duplicates
            // We search for an existing transaction that matches the core intent
            const existingTx = current.find(c => {
                // Same Category and Type are mandatory
                if (c.category !== tx.category) return false
                if (c.type !== tx.type) return false

                // If it's already PAID, we consider it a match to avoid creating a duplicate "Pending" one
                // even if the description or amount changed slightly (manual adjustments)
                if (c.status === 'PAGADO') {
                    // If the description is similar or it's the only one of its category, it's a match
                    if (c.description.includes(tx.category) || current.filter(x => x.category === c.category).length === 1) {
                        return true
                    }
                }

                // If description is identical, it's a match
                if (c.description.trim() === tx.description.trim()) return true

                // Specialized checks
                if (c.category === 'Cobro') {
                    const isAdelanto = (desc: string) => desc.toLowerCase().includes('adelanto') || desc.toLowerCase().includes('advance')
                    const isSaldo = (desc: string) => desc.toLowerCase().includes('saldo') || desc.toLowerCase().includes('balance')

                    if (isAdelanto(c.description) && isAdelanto(tx.description)) return true
                    if (isSaldo(c.description) && isSaldo(tx.description)) return true
                }

                if (c.category === 'Flete' || c.category === 'Courier' || c.category === 'Pago Proveedor') return true

                return false
            })

            if (!existingTx) {
                console.log(`[syncOperationCashFlow] Adding missing transaction: ${tx.description}`)
                await addCashFlowTransaction(tx)
            } else {
                // Transaction already exists — DO NOT overwrite.
                // Manual edits by the user must be preserved.
                // The sync button is informational only: it adds missing rows but never changes existing ones.
                console.log(`[syncOperationCashFlow] Transaction ${tx.category} already exists (id: ${existingTx.id}), skipping.`)
            }
        }

        return true
    } catch (error) {
        console.error(`Error syncing cash flow for op ${operationId}:`, error)
        throw error
    }
}

/**
 * Adjusts existing CashFlow transactions when Detalle fields change.
 * Called by updateOperation when financial fields (freightValue, productos, purchasePricesRaw, paymentTerms) are saved.
 * 
 * Rules:
 * - PAID rows are NEVER modified (they're historical facts)
 * - Flete PENDING → update amount to new freightValue
 * - Cobro PENDING → amount = newTotalSales - sum(already PAID cobros)
 * - Pago/Pago Proveedor PENDING → amount = newTotalPurchases - sum(already PAID pagos)
 * - If multiple PENDING rows of same category, only adjusts the "saldo" one (last added)
 */
export async function adjustFinancialTransactions(operationId: string, changedFields: string[]) {
    try {
        const op = await getOperationById(operationId)
        if (!op) return

        const current = await getCashFlowByOperation(operationId, true)
        if (current.length === 0) {
            // No transactions yet — fall back to insert-only sync
            await syncOperationCashFlow(operationId)
            return
        }

        const paidCobros = current.filter(t => t.category === 'Cobro' && t.status === 'PAGADO')
        const pendingCobros = current.filter(t => t.category === 'Cobro' && t.status === 'PENDIENTE')
        const paidPagos = current.filter(t => ['Pago A', 'Pago B', 'Pago Proveedor'].includes(t.category) && t.status === 'PAGADO')
        const pendingPagos = current.filter(t => ['Pago A', 'Pago B', 'Pago Proveedor'].includes(t.category) && t.status === 'PENDIENTE')
        const pendingFletes = current.filter(t => t.category === 'Flete' && t.status === 'PENDIENTE')

        const products = parseProducts(op.productos || '')
        const purchaseProducts = parseProducts(op.purchasePricesRaw || '')
        const newTotalSales = products.reduce((sum, p) => sum + (p.qty * p.price), 0)
        const newTotalPurchases = purchaseProducts.reduce((sum, p) => sum + (p.qty * p.price), 0)
        const newFleteVal = parseNumeric(op.freightValue || '') || 0

        // 1. UPDATE FLETE if freightValue changed
        if ((changedFields.includes('freightValue') || changedFields.includes('productos')) && pendingFletes.length > 0) {
            if (newFleteVal > 0) {
                for (const tx of pendingFletes) {
                    if (Math.abs(tx.amount - newFleteVal) > 0.01) {
                        console.log(`[adjustFinancial] Updating Flete PENDING ${tx.id}: ${tx.amount} → ${newFleteVal}`)
                        await updateCashFlowTransaction(tx.id, { amount: newFleteVal }, true)
                    }
                }
            }
        }

        // 2. UPDATE SALE (Cobro) total if products/quantities changed
        if (changedFields.includes('productos') || changedFields.includes('paymentTerms')) {
            if (newTotalSales > 0 && pendingCobros.length > 0) {
                const totalPaidCobros = paidCobros.reduce((sum, t) => sum + t.amount, 0)
                const remainingToCollect = Math.max(0, newTotalSales - totalPaidCobros)

                if (pendingCobros.length === 1) {
                    // Single pending cobro → set it to the full remaining amount
                    const tx = pendingCobros[0]
                    if (Math.abs(tx.amount - remainingToCollect) > 0.01) {
                        console.log(`[adjustFinancial] Updating Cobro PENDING ${tx.id}: ${tx.amount} → ${remainingToCollect}`)
                        await updateCashFlowTransaction(tx.id, { amount: remainingToCollect }, true)
                    }
                } else if (pendingCobros.length > 1) {
                    // Multiple pending cobros (split payment) — only adjust the last "saldo" one
                    // Keep the "adelanto" amounts as-is, adjust only the final saldo
                    const sorted = [...pendingCobros].sort((a, b) => (b.dueDate || b.date) > (a.dueDate || a.date) ? 1 : -1)
                    const saldoTx = sorted[sorted.length - 1]
                    const otherPendingAmt = pendingCobros.filter(t => t.id !== saldoTx.id).reduce((s, t) => s + t.amount, 0)
                    const newSaldoAmt = Math.max(0, remainingToCollect - otherPendingAmt)
                    if (Math.abs(saldoTx.amount - newSaldoAmt) > 0.01) {
                        console.log(`[adjustFinancial] Updating Cobro Saldo PENDING ${saldoTx.id}: ${saldoTx.amount} → ${newSaldoAmt}`)
                        await updateCashFlowTransaction(saldoTx.id, { amount: newSaldoAmt }, true)
                    }
                }
            }
        }

        // 3. UPDATE PURCHASE (Pago Proveedor) total if purchasePricesRaw changed
        if (changedFields.includes('purchasePricesRaw') || changedFields.includes('productos')) {
            if (newTotalPurchases > 0 && pendingPagos.length > 0) {
                const totalPaidPagos = paidPagos.reduce((sum, t) => sum + t.amount, 0)
                const remainingToPay = Math.max(0, newTotalPurchases - totalPaidPagos)

                const tx = pendingPagos[pendingPagos.length - 1] // last pending pago = balance
                if (Math.abs(tx.amount - remainingToPay) > 0.01) {
                    console.log(`[adjustFinancial] Updating Pago PENDING ${tx.id}: ${tx.amount} → ${remainingToPay}`)
                    await updateCashFlowTransaction(tx.id, { amount: remainingToPay }, true)
                }
            }
        }

    } catch (error) {
        console.error(`[adjustFinancialTransactions] Error for op ${operationId}:`, error)
        // Non-fatal: don't throw — the operation save already succeeded
    }
}


// === MARTA ANALYTICS ===

/**
 * Obtiene un resumen de cobros y pagos pendientes, opcionalmente filtrado.
 */
export async function getPendingFinancials(entityName?: string, userNickname?: string) {
    try {
        const allTransactions = await getAllCashFlowTransactions()
        const pending = allTransactions.filter(tx => tx.status === 'PENDIENTE')

        // Mapeo de operacionId -> Cliente para poder filtrar por entidad
        const ops = await searchMasterInput('')
        const opIdToClient: Record<string, string> = {}
        const opIdToUser: Record<string, string> = {}
        ops.forEach(o => {
            if (o.id) {
                opIdToClient[o.id] = o.cliente || ''
                opIdToUser[o.id] = getResponsableName(o.userId)
            }
        })

        let filtered = pending
        if (entityName) {
            const lowEntity = entityName.toLowerCase()
            filtered = filtered.filter(tx => {
                const client = (opIdToClient[tx.operationId] || '').toLowerCase()
                return client.includes(lowEntity) || tx.description.toLowerCase().includes(lowEntity)
            })
        }

        if (userNickname) {
            const lowUser = userNickname.toLowerCase()
            filtered = filtered.filter(tx => (opIdToUser[tx.operationId] || '').toLowerCase().includes(lowUser))
        }

        const totals = {
            cobros: filtered.filter(t => t.type === 'INGRESO').reduce((sum, t) => sum + t.amount, 0),
            pagos: filtered.filter(t => t.type === 'EGRESO').reduce((sum, t) => sum + t.amount, 0),
            count: filtered.length
        }

        return { totals, transactions: filtered.slice(0, 15), opIdToClient }
    } catch (error) {
        console.error('Error fetching pending financials:', error)
        return { totals: { cobros: 0, pagos: 0, count: 0 }, transactions: [], opIdToClient: {} }
    }
}

/**
 * Analiza el historial de precios para un producto y costos de courier.
 */
export async function getHistoricalAnalysis(productOrRoute: string) {
    try {
        const ops = await searchMasterInput('')
        const matches: { date: string, price: number, client: string, id: string }[] = []
        const lowQuery = productOrRoute.toLowerCase()

        ops.forEach(op => {
            const items = parseProducts(op.productos)
            const priceItems = parseProducts(op.purchasePricesRaw)

            // Buscar en productos de venta
            items.forEach(item => {
                if (item.name.toLowerCase().includes(lowQuery)) {
                    matches.push({
                        date: op.fechaEmbarque || 'Sin fecha',
                        price: item.price,
                        client: op.cliente,
                        id: op.id || ''
                    })
                }
            })

            // Buscar en precios de compra (si son distintos nombres)
            priceItems.forEach(item => {
                if (item.name.toLowerCase().includes(lowQuery) && !items.find(i => i.name === item.name)) {
                    matches.push({
                        date: op.fechaEmbarque || 'Sin fecha',
                        price: item.price,
                        client: op.cliente,
                        id: op.id || ''
                    })
                }
            })
        })

        // También buscar en courier si parece una ruta (ej: "Tess:Courier:China")
        // Pero Tess decidirá cuándo usarlo. Agregamos el predictor aquí por si acaso.

        return matches.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)
    } catch (error) {
        console.error('Error in historical analysis:', error)
        return []
    }
}

/**
 * Recomienda clientes para un producto basado en el historial.
 */
export async function getProductRecommendations(productName: string) {
    try {
        const ops = await searchMasterInput('')
        const recommendations: Record<string, { count: number, lastDate: string, totalQty: number }> = {}
        const lowProduct = productName.toLowerCase()

        ops.forEach(op => {
            const items = parseProducts(op.productos)
            if (items.some(i => i.name.toLowerCase().includes(lowProduct))) {
                const client = op.cliente
                if (!recommendations[client]) {
                    recommendations[client] = { count: 0, lastDate: op.fechaEmbarque || '', totalQty: 0 }
                }
                recommendations[client].count++
                recommendations[client].totalQty += items.find(i => i.name.toLowerCase().includes(lowProduct))?.qty || 0
                if (op.fechaEmbarque && op.fechaEmbarque > recommendations[client].lastDate) {
                    recommendations[client].lastDate = op.fechaEmbarque
                }
            }
        })

        return Object.entries(recommendations)
            .map(([client, info]) => ({ client, ...info }))
            .sort((a, b) => b.count - a.count)
    } catch (error) {
        console.error('Error in product recommendations:', error)
        return []
    }
}

/**
 * Búsqueda avanzada de operaciones con filtros múltiples.
 */
export async function searchOperationsAdvanced(filters: {
    user?: string,
    client?: string,
    exporter?: string,
    producer?: string,
    product?: string,
    status?: string
}) {
    try {
        const allOps = await searchMasterInput('') // O crear getAllOperaciones si es muy lento

        return allOps.filter(op => {
            if (filters.user && !getResponsableName(op.userId).toLowerCase().includes(filters.user.toLowerCase())) return false
            if (filters.client && !op.cliente.toLowerCase().includes(filters.client.toLowerCase())) return false
            if (filters.exporter && !op.exportador.toLowerCase().includes(filters.exporter.toLowerCase())) return false
            if (filters.producer && op.productor && !op.productor.toLowerCase().includes(filters.producer.toLowerCase())) return false
            if (filters.status && op.estado !== filters.status) return false
            if (filters.product) {
                const items = parseProducts(op.productos)
                if (!items.some(i => i.name.toLowerCase().includes(filters.product!.toLowerCase()))) return false
            }
            return true
        }).slice(0, 10)
    } catch (error) {
        console.error('Error in advanced search:', error)
        return []
    }
}

// === RECLAMOS ===

export async function getClaimsByOperation(operationId: string): Promise<Claim[]> {
    try {
        const tabName = TABS.claims
        const data = await getSheetData(CLAIMS_SPREADSHEET_ID, `${tabName}!A:Z`)

        if (data.length < 2) return []

        const headers = data[0].map(h => h.trim().toLowerCase())
        const opIdIdx = headers.indexOf('id_carga')

        if (opIdIdx === -1) return []

        return data.slice(1)
            .filter(row => (row[opIdIdx] || '').trim() === operationId.trim())
            .map(row => {
                const getVal = (col: string) => {
                    const idx = headers.indexOf(col.toLowerCase())
                    return idx !== -1 ? (row[idx] || '') : ''
                }

                return {
                    id: getVal('id'),
                    operationId: getVal('id_carga'),
                    cliente: getVal('cliente'),
                    producto: getVal('producto'),
                    tipo: getVal('tipo'),
                    fechaReporte: getVal('fecha_reporte'),
                    responsable: getVal('responsable'),
                    descripcion: getVal('descripcion'),
                    evidencia: getVal('evidencia'),
                    impactoEstimado: parseAmount(getVal('impacto_estimado')),
                    resolucionPropuesta: getVal('resolucion_propuesta'),
                    impactoFinal: parseAmount(getVal('impacto_final')),
                    estado: getVal('estado'),
                    fechaCierre: getVal('fecha_cierre'),
                    timestamp: getVal('timestamp')
                }
            })
    } catch (error) {
        console.error('Error fetching claims:', error)
        return []
    }
}

export async function addClaim(claim: Omit<Claim, 'id' | 'timestamp'>) {
    try {
        const tabName = TABS.claims
        const data = await getSheetData(CLAIMS_SPREADSHEET_ID, `${tabName}!A:Z`)
        const headers = data[0] || ['ID', 'ID_Carga', 'Cliente', 'Producto', 'Tipo', 'Fecha_Reporte', 'Responsable', 'Descripcion', 'Evidencia', 'Impacto_Estimado', 'Resolucion_Propuesta', 'Impacto_Final', 'Estado', 'Fecha_Cierre', 'Timestamp']

        if (data.length === 0) {
            // await appendRow(CLAIMS_SPREADSHEET_ID, `${tabName}!A:AZ`, headers)
        }

        const newId = `REC-${Date.now().toString().slice(-6)}`
        const timestamp = new Date().toISOString()
        const newRow = new Array(headers.length).fill('')

        const setVal = (col: string, val: any) => {
            const idx = headers.findIndex(h => h.toLowerCase() === col.toLowerCase())
            if (idx !== -1) newRow[idx] = String(val)
        }

        setVal('id', newId)
        setVal('id_carga', claim.operationId)
        setVal('cliente', claim.cliente)
        setVal('producto', claim.producto)
        setVal('tipo', claim.tipo)
        setVal('fecha_reporte', claim.fechaReporte)
        setVal('responsable', claim.responsable)
        setVal('descripcion', claim.descripcion)
        setVal('evidencia', claim.evidencia)
        setVal('impacto_estimado', claim.impactoEstimado)
        setVal('resolucion_propuesta', claim.resolucionPropuesta)
        setVal('impacto_final', claim.impactoFinal)
        setVal('estado', claim.estado)
        setVal('timestamp', timestamp)

        await appendRow(CLAIMS_SPREADSHEET_ID, `${tabName}!A:AZ`, newRow)

        // Actualizar estado de la operación si corresponde
        try {
            const op = await getOperationById(claim.operationId)
            if (op && op.estado !== '12B. Reclamo Reportado') {
                await updateOperation(claim.operationId, { estado: '12B. Reclamo Reportado' })
            }
        } catch (opErr) {
            console.error('Error updating operation status after claim:', opErr)
        }

        return { ...claim, id: newId, timestamp }
    } catch (error) {
        console.error('Error adding claim:', error)
        throw error
    }
}

export async function updateClaim(claimId: string, updates: Partial<Claim>) {
    try {
        const tabName = TABS.claims
        const data = await getSheetData(CLAIMS_SPREADSHEET_ID, `${tabName}!A:Z`)
        if (!data || data.length < 2) throw new Error('No claims found')

        const headers = data[0].map(h => h.trim().toLowerCase())
        const idIdx = headers.indexOf('id')
        if (idIdx === -1) throw new Error('ID column not found in Claims sheet')

        let rowIndex = -1
        let originalRow: string[] = []
        for (let i = 1; i < data.length; i++) {
            if ((data[i][idIdx] || '').trim() === claimId.trim()) {
                rowIndex = i + 1
                originalRow = data[i]
                break
            }
        }

        if (rowIndex === -1) throw new Error(`Claim ${claimId} not found`)

        const updatedRow = [...originalRow]
        if (updatedRow.length < headers.length) {
            updatedRow.push(...new Array(headers.length - updatedRow.length).fill(''))
        }

        const setVal = (col: string, val: any) => {
            const idx = headers.indexOf(col.toLowerCase())
            if (idx !== -1 && val !== undefined) updatedRow[idx] = String(val)
        }

        if (updates.tipo) setVal('tipo', updates.tipo)
        if (updates.estado) setVal('estado', updates.estado)
        if (updates.descripcion) setVal('descripcion', updates.descripcion)
        if (updates.evidencia) setVal('evidencia', updates.evidencia)
        if (updates.impactoEstimado !== undefined) setVal('impacto_estimado', updates.impactoEstimado)
        if (updates.impactoFinal !== undefined) setVal('impacto_final', updates.impactoFinal)
        if (updates.resolucionPropuesta) setVal('resolucion_propuesta', updates.resolucionPropuesta)
        if (updates.fechaCierre) setVal('fecha_cierre', updates.fechaCierre)

        await updateRow(CLAIMS_SPREADSHEET_ID, tabName, rowIndex, updatedRow)
        invalidateCache(CLAIMS_SPREADSHEET_ID)

        // IMPACTO FINANCIERO: Si el estado cambia a "6. Ajuste Económico Definido"
        if (updates.estado === '6. Ajuste Económico Definido' || (rowIndex !== -1 && originalRow[headers.indexOf('estado')] !== '6. Ajuste Económico Definido' && updatedRow[headers.indexOf('estado')] === '6. Ajuste Económico Definido')) {
            try {
                const impacto = updates.impactoFinal !== undefined ? updates.impactoFinal : parseAmount(originalRow[headers.indexOf('impacto_final')])
                const opId = originalRow[headers.indexOf('id_carga')]

                if (impacto > 0) {
                    await addCashFlowTransaction({
                        operationId: opId,
                        date: new Date().toISOString().split('T')[0],
                        type: 'EGRESO',
                        category: 'AJUSTE RECLAMO',
                        description: `Ajuste por Reclamo ${claimId}: ${originalRow[headers.indexOf('descripcion')] || ''}`,
                        amount: impacto,
                        status: 'PENDIENTE'
                    })
                }
            } catch (cfErr) {
                console.error('Error triggering cashflow adjustment for claim:', cfErr)
            }
        }

        return true
    } catch (error) {
        console.error('Error updating claim:', error)
        throw error
    }
}

// === INSPECCIONES (QC) ===

export async function getInspeccionesByOperation(operationId: string): Promise<QCInspection[]> {
    try {
        const tabName = TABS.inspecciones
        const data = await getSheetData(MASTER_SPREADSHEET_ID, `${tabName}!A:Z`)

        if (data.length < 2) return []

        const headers = data[0].map(h => h.trim().toLowerCase())
        const opIdIdx = headers.findIndex(h => h === 'id operación' || h === 'id_operacion' || h === 'id_carga')

        if (opIdIdx === -1) return []

        return data.slice(1)
            .filter(row => (row[opIdIdx] || '').trim() === operationId.trim())
            .map(row => {
                const getVal = (col: string) => {
                    const idx = headers.findIndex(h => h.includes(col.toLowerCase()))
                    return idx !== -1 ? (row[idx] || '') : ''
                }

                return {
                    id: getVal('id inspección') || getVal('id_inspeccion'),
                    operationId: getVal('id operación') || getVal('id_operacion') || getVal('id_carga'),
                    fechaProgramada: getVal('fecha programada') || getVal('fecha_programada'),
                    responsable: getVal('inspector') || getVal('responsable'),
                    rutaCarpetaDrive: getVal('link carpeta evidencia') || getVal('ruta_carpeta_drive') || getVal('evidencia'),
                    idCarpetaDrive: getVal('id carpeta') || getVal('id_carpeta'), // Nueva columna
                    estado: (getVal('estado') || 'Pendiente') as any,
                    tipoInspeccion: getVal('tipo inspección') || getVal('tipo_inspeccion'),
                    notas: getVal('notas') || '',
                    timestamp: getVal('timestamp')
                }
            })
    } catch (error) {
        console.error('Error fetching inspections:', error)
        return []
    }
}

export async function addInspeccion(inspeccion: Omit<QCInspection, 'timestamp'>) {
    try {
        const tabName = TABS.inspecciones
        const data = await getSheetData(MASTER_SPREADSHEET_ID, `${tabName}!A:Z`)

        // Intentar crear la carpeta en Drive si la operación tiene una carpeta padre
        let folderId = inspeccion.idCarpetaDrive
        if (!folderId) {
            try {
                const op = await getOperationById(inspeccion.operationId)
                if (op?.idCarpeta) {
                    console.log(`[QC] Creando subcarpeta para inspección ${inspeccion.id} en carpeta padre ${op.idCarpeta}`)
                    folderId = await createDriveSubfolder(op.idCarpeta, inspeccion.id)
                }
            } catch (driveError) {
                console.error('[QC] Error creando carpeta en Drive:', driveError)
            }
        }

        // Columnas base: ID Inspección, ID Operación, Fecha Programada, Inspector (Responsable), Link Carpeta Evidencia, ID carpeta, Estado, Tipo Inspección, Notas, Timestamp
        const headers = data[0] || ['ID Inspección', 'ID Operación', 'Fecha Programada', 'Inspector (Responsable)', 'Link Carpeta Evidencia', 'ID carpeta', 'Estado', 'Tipo Inspección', 'Notas', 'Timestamp']

        const timestamp = new Date().toISOString()
        const newRow = new Array(headers.length).fill('')

        const setVal = (col: string, val: any) => {
            const idx = headers.findIndex(h => h.toLowerCase().includes(col.toLowerCase()))
            if (idx !== -1) newRow[idx] = String(val)
        }

        setVal('ID Inspección', inspeccion.id)
        setVal('ID Operación', inspeccion.operationId)
        setVal('Fecha Programada', inspeccion.fechaProgramada)
        setVal('Inspector', inspeccion.responsable)
        setVal('Link Carpeta Evidencia', inspeccion.rutaCarpetaDrive)
        setVal('ID carpeta', folderId || '')
        setVal('Estado', inspeccion.estado)
        setVal('Tipo Inspección', inspeccion.tipoInspeccion || '')
        setVal('Notas', inspeccion.notas || '')
        setVal('Timestamp', timestamp)

        await appendRow(MASTER_SPREADSHEET_ID, `${tabName}!A:AZ`, newRow)
        invalidateCache(MASTER_SPREADSHEET_ID)

        return { ...inspeccion, timestamp }
    } catch (error) {
        console.error('Error adding inspection:', error)
        throw error
    }
}

export async function updateInspeccion(id: string, updates: Partial<QCInspection>) {
    try {
        const tabName = TABS.inspecciones
        const data = await getSheetData(MASTER_SPREADSHEET_ID, `${tabName}!A:Z`)
        if (!data || data.length < 2) throw new Error('No inspections found')

        const headers = data[0].map(h => h.trim().toLowerCase())
        const idIdx = headers.findIndex(h => h.includes('id inspección') || h === 'id')
        if (idIdx === -1) throw new Error('ID column not found in Inspections sheet')

        let rowIndex = -1
        let originalRow: string[] = []
        for (let i = 1; i < data.length; i++) {
            if ((data[i][idIdx] || '').trim() === id.trim()) {
                rowIndex = i + 1
                originalRow = data[i]
                break
            }
        }

        if (rowIndex === -1) throw new Error(`Inspection ${id} not found`)

        const updatedRow = [...originalRow]
        const setVal = (col: string, val: any) => {
            const idx = headers.findIndex(h => h.includes(col.toLowerCase()))
            if (idx !== -1 && val !== undefined) updatedRow[idx] = String(val)
        }

        if (updates.estado) setVal('estado', updates.estado)
        if (updates.notas) setVal('notas', updates.notas)
        if (updates.responsable) setVal('inspector', updates.responsable)
        if (updates.fechaProgramada) setVal('fecha programada', updates.fechaProgramada)
        if (updates.tipoInspeccion) setVal('tipo inspección', updates.tipoInspeccion)

        await updateRow(MASTER_SPREADSHEET_ID, tabName, rowIndex, updatedRow)
        invalidateCache(MASTER_SPREADSHEET_ID)

        return true
    } catch (error) {
        console.error('Error updating inspection:', error)
        throw error
    }
}

// === FLETES ===

export async function getFletesByOperation(operationId: string): Promise<Flete[]> {
    try {
        const tabName = TABS.fletes
        const data = await getSheetData(MASTER_SPREADSHEET_ID, `${tabName}!A:Z`)

        if (data.length < 2) return []

        const headers = data[0].map(h => h.trim().toLowerCase())
        const opIdIdx = headers.findIndex(h => h === 'id_operacion' || h === 'id_carga')

        if (opIdIdx === -1) return []

        return data.slice(1)
            .filter(row => (row[opIdIdx] || '').trim() === operationId.trim())
            .map(row => {
                const getVal = (col: string) => {
                    const idx = headers.indexOf(col.toLowerCase())
                    return idx !== -1 ? (row[idx] || '') : ''
                }

                return {
                    id_operacion: getVal('id_operacion') || getVal('id_carga'),
                    forwarder: getVal('forwarder'),
                    monto: parseAmount(getVal('monto')),
                    moneda: getVal('moneda'),
                    seguro: getVal('seguro') as 'SI' | 'NO',
                    temp: getVal('temp'),
                    validez: getVal('validez'),
                    estado: getVal('estado') as 'Pendiente' | 'Seleccionado' | 'Rechazado'
                }
            })
    } catch (error) {
        console.error('Error fetching fletes:', error)
        return []
    }
}

export async function addFlete(flete: Flete) {
    try {
        const tabName = TABS.fletes
        const data = await getSheetData(MASTER_SPREADSHEET_ID, `${tabName}!A:Z`)
        const headers = data[0] || ['ID_OPERACION', 'FORWARDER', 'MONTO', 'MONEDA', 'SEGURO', 'TEMP', 'VALIDEZ', 'ESTADO']

        const newRow = new Array(headers.length).fill('')
        const setVal = (col: string, val: any) => {
            const idx = headers.findIndex(h => h.toLowerCase() === col.toLowerCase())
            if (idx !== -1) newRow[idx] = String(val)
        }

        setVal('id_operacion', flete.id_operacion)
        setVal('forwarder', flete.forwarder)
        setVal('monto', flete.monto)
        setVal('moneda', flete.moneda)
        setVal('seguro', flete.seguro)
        setVal('temp', flete.temp)
        setVal('validez', flete.validez)
        setVal('estado', flete.estado)

        await appendRow(MASTER_SPREADSHEET_ID, `${tabName}!A:Z`, newRow)
        invalidateCache(MASTER_SPREADSHEET_ID)
        return flete
    } catch (error) {
        console.error('Error adding flete:', error)
        throw error
    }
}

export async function updateFlete(id_operacion: string, forwarder: string, updates: Partial<Flete>) {
    try {
        const tabName = TABS.fletes
        const data = await getSheetData(MASTER_SPREADSHEET_ID, `${tabName}!A:Z`)
        if (!data || data.length < 2) throw new Error('No fletes found')

        const headers = data[0].map(h => h.trim().toLowerCase())

        // Robust ID search in Fletes tab
        const opIdIdx = headers.findIndex(h => ['id_operacion', 'id_carga', 'idcarga'].includes(h))
        const fwdIdx = headers.findIndex(h => ['forwarder', 'florwarder'].includes(h))
        const montoIdx = headers.indexOf('monto')
        const estadoIdx = headers.findIndex(h => ['estado', 'status'].includes(h))

        if (opIdIdx === -1 || fwdIdx === -1) throw new Error('Essential headers (ID or Forwarder) not found in Fletes sheet')

        let rowIndex = -1
        let originalRow: string[] = []
        for (let i = 1; i < data.length; i++) {
            if ((data[i][opIdIdx] || '').trim() === id_operacion.trim() &&
                (data[i][fwdIdx] || '').trim() === forwarder.trim()) {
                rowIndex = i + 1
                originalRow = data[i]
                break
            }
        }

        if (rowIndex === -1) throw new Error(`Flete for ${id_operacion} with ${forwarder} not found`)

        const updatedRow = [...originalRow]
        if (updatedRow.length < headers.length) {
            updatedRow.push(...new Array(headers.length - updatedRow.length).fill(''))
        }

        const setVal = (colIdx: number, val: any) => {
            if (colIdx !== -1 && val !== undefined) updatedRow[colIdx] = String(val)
        }

        // Apply updates
        if (updates.monto !== undefined) setVal(montoIdx, updates.monto)
        if (updates.moneda) setVal(headers.indexOf('moneda'), updates.moneda)
        if (updates.seguro) setVal(headers.indexOf('seguro'), updates.seguro)
        if (updates.temp) setVal(headers.indexOf('temp'), updates.temp)
        if (updates.validez) setVal(headers.indexOf('validez'), updates.validez)
        if (updates.estado) setVal(estadoIdx, updates.estado)

        await updateRow(MASTER_SPREADSHEET_ID, tabName, rowIndex, updatedRow)
        invalidateCache(MASTER_SPREADSHEET_ID)

        // --- AUTOMATIC SYNCHRONIZATION ---
        const finalEstado = updates.estado || (estadoIdx !== -1 ? (originalRow[estadoIdx] || '') : '')
        const rawMonto = montoIdx !== -1 ? (originalRow[montoIdx] || '0') : '0'
        const finalMonto = updates.monto !== undefined ? updates.monto : parseAmount(rawMonto)

        if (finalEstado === 'Seleccionado') {
            // 1. Unselect others if this was a fresh selection
            if (updates.estado === 'Seleccionado') {
                await unselectOtherFletes(id_operacion, forwarder)
            }

            // 2. Sync with Master Input (Logistics)
            await updateOperation(id_operacion, {
                forwarder: forwarder,
                freightValue: String(finalMonto)
            })

            // 3. Sync with Cash Flow (Finance)
            await syncFreightWithCashFlow(id_operacion, forwarder, finalMonto)
        }

        return true
    } catch (error) {
        console.error('Error updating flete:', error)
        throw error
    }
}

/**
 * Ensures only one flete is "Seleccionado" per operation.
 */
async function unselectOtherFletes(id_operacion: string, excludedForwarder: string) {
    try {
        const tabName = TABS.fletes
        const data = await getSheetData(MASTER_SPREADSHEET_ID, `${tabName}!A:Z`)
        if (!data || data.length < 2) return

        const headers = data[0].map(h => h.trim().toLowerCase())
        const opIdIdx = headers.findIndex(h => ['id_operacion', 'id_carga', 'idcarga'].includes(h))
        const fwdIdx = headers.findIndex(h => ['forwarder', 'florwarder'].includes(h))
        const estadoIdx = headers.findIndex(h => ['estado', 'status'].includes(h))

        if (opIdIdx === -1 || fwdIdx === -1 || estadoIdx === -1) return

        for (let i = 1; i < data.length; i++) {
            const row = data[i]
            if ((row[opIdIdx] || '').trim() === id_operacion.trim() &&
                (row[fwdIdx] || '').trim() !== excludedForwarder.trim() &&
                (row[estadoIdx] || '').trim() === 'Seleccionado') {

                const updatedRow = [...row]
                updatedRow[estadoIdx] = 'Pendiente'
                await updateRow(MASTER_SPREADSHEET_ID, tabName, i + 1, updatedRow)
            }
        }
        invalidateCache(MASTER_SPREADSHEET_ID)
    } catch (err) {
        console.error('Error in unselectOtherFletes:', err)
    }
}

/**
 * Creates or updates a Flete transaction in the Cash Flow ledger.
 */
async function syncFreightWithCashFlow(operationId: string, forwarder: string, amount: number) {
    try {
        // 1. Search for existing "Flete" transaction for this operation
        const transactions = await getCashFlowByOperation(operationId)
        const existingFleteTx = transactions.find(t => t.category === 'Flete' && t.type === 'EGRESO')

        if (existingFleteTx) {
            // Update only if values changed to avoid redundant writes
            if (existingFleteTx.amount !== amount || !existingFleteTx.description.includes(forwarder)) {
                await updateCashFlowTransaction(existingFleteTx.id, {
                    amount: amount,
                    description: `Flete: ${forwarder}`
                })
            }
        } else {
            // Create new EGRESO
            await addCashFlowTransaction({
                operationId,
                date: new Date().toISOString().split('T')[0],
                type: 'EGRESO',
                category: 'Flete',
                description: `Flete: ${forwarder}`,
                amount: amount,
                status: 'PENDIENTE',
                dueDate: new Date().toISOString().split('T')[0]
            })
        }
    } catch (err) {
        console.error('Error in syncFreightWithCashFlow:', err)
    }
}

export async function deleteFlete(id_operacion: string, forwarder: string) {
    try {
        const tabName = TABS.fletes
        const data = await getSheetData(MASTER_SPREADSHEET_ID, `${tabName}!A:Z`)
        if (!data || data.length < 2) return

        const headers = data[0].map(h => h.trim().toLowerCase())
        const opIdIdx = headers.findIndex(h => ['id_operacion', 'id_carga', 'idcarga'].includes(h))
        const fwdIdx = headers.findIndex(h => ['forwarder', 'florwarder'].includes(h))

        let rowIndex = -1
        for (let i = 1; i < data.length; i++) {
            if ((data[i][opIdIdx] || '').trim() === id_operacion.trim() &&
                (data[i][fwdIdx] || '').trim() === forwarder.trim()) {
                rowIndex = i + 1
                break
            }
        }

        if (rowIndex === -1) return

        const authClient = await getAuthClient()
        const meta = await sheets.spreadsheets.get({
            auth: authClient as any,
            spreadsheetId: MASTER_SPREADSHEET_ID
        })
        const sheetId = meta.data.sheets?.find(s => s.properties?.title === tabName)?.properties?.sheetId

        await sheets.spreadsheets.batchUpdate({
            auth: authClient as any,
            spreadsheetId: MASTER_SPREADSHEET_ID,
            requestBody: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex - 1,
                            endIndex: rowIndex
                        }
                    }
                }]
            }
        })
        invalidateCache(MASTER_SPREADSHEET_ID)
        return true
    } catch (error) {
        console.error('Error deleting flete:', error)
        throw error
    }
}

// === DRIVE HELPERS ===

export async function createDriveSubfolder(parentFolderId: string, folderName: string): Promise<string> {
    try {
        const authClient = await getAuthClient()
        const drive = google.drive({ version: 'v3', auth: authClient as any })

        const response = await drive.files.create({
            requestBody: {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentFolderId]
            },
            fields: 'id'
        })

        return response.data.id!
    } catch (error) {
        console.error(`Error creating subfolder ${folderName} in ${parentFolderId}:`, error)
        throw error
    }
}

// === TEAM CHAT ===

/**
 * Ensures the Team Chat tab exists in the Master Spreadsheet.
 */
async function ensureTeamChatTab() {
    try {
        const authClient = await getAuthClient()
        const meta = await sheets.spreadsheets.get({
            auth: authClient as any,
            spreadsheetId: MASTER_SPREADSHEET_ID
        })

        const sheetExists = meta.data.sheets?.some(s => s.properties?.title === TABS.teamMessages)
        if (sheetExists) return true

        console.log(`[TeamChat] Creating tab ${TABS.teamMessages}...`)
        await sheets.spreadsheets.batchUpdate({
            auth: authClient as any,
            spreadsheetId: MASTER_SPREADSHEET_ID,
            requestBody: {
                requests: [
                    {
                        addSheet: {
                            properties: {
                                title: TABS.teamMessages
                            }
                        }
                    }
                ]
            }
        })

        // Add headers
        const headers = ['ID', 'From', 'To', 'Content', 'Timestamp']
        await updateRow(MASTER_SPREADSHEET_ID, TABS.teamMessages, 1, headers)

        return true
    } catch (error) {
        console.error('Error ensuring Team Chat tab:', error)
        return false
    }
}

export async function saveTeamMessage(msg: TeamMessage) {
    try {
        await ensureTeamChatTab()
        const newRow = [
            msg.id,
            msg.from,
            msg.to,
            msg.content,
            msg.timestamp
        ]
        await appendRow(MASTER_SPREADSHEET_ID, `${TABS.teamMessages}!A:E`, newRow)
        return true
    } catch (error) {
        console.error('Error saving team message:', error)
        return false
    }
}

export async function getTeamMessages(chatId: string, userEmail?: string): Promise<TeamMessage[]> {
    try {
        await ensureTeamChatTab()
        const data = await getSheetData(MASTER_SPREADSHEET_ID, `${TABS.teamMessages}!A:E`, true) // Force fresh for chat

        if (data.length < 2) return []

        const headers = data[0].map(h => h.trim().toLowerCase())
        const fromIdx = headers.indexOf('from')
        const toIdx = headers.indexOf('to')

        // Filter messages for this chat (either room or direct between two users)
        return data.slice(1)
            .filter(row => {
                const from = row[fromIdx]
                const to = row[toIdx]

                // Group chat
                if (chatId.includes('@southmarine')) {
                    return to === chatId
                }
                
                // Bot chat filtering
                if (chatId === 'tess@bot' && userEmail) {
                    return (from === 'tess@bot' && to === userEmail) || (to === 'tess@bot' && from === userEmail);
                }

                // Direct chat (either from user A to B or vice versa)
                // We assume chatId is the other person's ID (email)
                // This requires the caller to pass the "me" context or we just return all where from=chatId or to=chatId
                // For simplicity, if it's not a group, we check if it involves the chatId
                return from === chatId || to === chatId
            })
            .map(row => {
                const getVal = (col: string) => {
                    const idx = headers.indexOf(col.toLowerCase())
                    return idx !== -1 ? (row[idx] || '') : ''
                }
                return {
                    id: getVal('id'),
                    from: getVal('from'),
                    to: getVal('to'),
                    content: getVal('content'),
                    timestamp: getVal('timestamp')
                }
            })
    } catch (error) {
        console.error('Error fetching team messages:', error)
        return []
    }
}

// === CRM / LEADS ===

export async function getAllLeads(): Promise<Lead[]> {
    try {
        const data = await getSheetData(LEADS_SPREADSHEET_ID, `${TABS.leads}!A:Z`)
        if (data.length < 2) return []

        const headers = data[0].map(h => h.trim().toLowerCase())
        return data.slice(1).map((row, idx) => {
            const getVal = (col: string) => {
                const i = headers.indexOf(col.toLowerCase())
                return i !== -1 ? row[i] || '' : ''
            }

            return {
                id: getVal('id') || `L-${idx + 1}`,
                nombre: getVal('nombre'),
                empresa: getVal('empresa'),
                email: getVal('email'),
                telefono: getVal('telefono'),
                pais: getVal('pais'),
                fuente: getVal('fuente'),
                estado: (getVal('estado') as LeadStatus) || 'Nuevo',
                notas: getVal('notas'),
                responsable: getVal('responsable'),
                fechaCreacion: getVal('fecha_creacion') || getVal('fecha creacion'),
                ultimaInteraccion: getVal('ultima_interaccion') || getVal('ultima interaccion'),
                interes: getVal('interes'),
                contactId: getVal('contact_id') || getVal('contactid'),
                timestamp: getVal('timestamp')
            }
        })
    } catch (error) {
        console.error('Error fetching leads:', error)
        return []
    }
}

async function ensureLeadsTab() {
    try {
        const auth = await getAuthClient()
        const meta = await sheets.spreadsheets.get({
            auth: auth as any,
            spreadsheetId: LEADS_SPREADSHEET_ID
        })
        const sheetExists = meta.data.sheets?.some(s => s.properties?.title === TABS.leads)

        if (!sheetExists) {
            await sheets.spreadsheets.batchUpdate({
                auth: auth as any,
                spreadsheetId: LEADS_SPREADSHEET_ID,
                requestBody: {
                    requests: [{
                        addSheet: {
                            properties: { title: TABS.leads }
                        }
                    }]
                }
            })
            // Add headers
            const headers = ['id', 'nombre', 'empresa', 'email', 'telefono', 'pais', 'fuente', 'estado', 'notas', 'responsable', 'fecha_creacion', 'ultima_interaccion', 'interes', 'contact_id', 'timestamp']
            await appendRow(LEADS_SPREADSHEET_ID, `${TABS.leads}!A1`, headers)
        }
    } catch (error) {
        console.error('Error ensuring Leads tab:', error)
    }
}

export async function createLead(lead: Omit<Lead, 'id' | 'timestamp'>) {
    try {
        await ensureLeadsTab()
        const id = `L-${Date.now()}`
        const timestamp = new Date().toISOString()

        // Ensure we have a flat array of strings for Google Sheets
        const newRow = [
            id,
            String(lead.nombre || ''),
            String(lead.empresa || ''),
            String(lead.email || ''),
            String(lead.telefono || ''),
            String(lead.pais || ''),
            String(lead.fuente || 'Directo'),
            String(lead.estado || 'Nuevo'),
            String(lead.notas || ''),
            String(lead.responsable || ''),
            String(lead.fechaCreacion || ''),
            String(lead.ultimaInteraccion || ''),
            String(lead.interes || ''),
            String(lead.contactId || ''),
            timestamp
        ]

        console.log('Appending lead row:', newRow)
        await appendRow(LEADS_SPREADSHEET_ID, `${TABS.leads}!A:O`, newRow)
        invalidateCache(LEADS_SPREADSHEET_ID)

        // Unified Agenda Integration: If source is 'Reunión' or 'Llamada', add to agenda
        if (lead.fuente === 'Reunión' || lead.fuente === 'Llamada') {
            try {
                await upsertAgendaItem({
                    date: new Date().toISOString().split('T')[0],
                    time: new Date().toLocaleTimeString('es-AR', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                    title: `${lead.fuente === 'Reunión' ? 'Reunión' : 'Llamada'} con Lead: ${lead.nombre} (${lead.empresa})`,
                    type: lead.fuente === 'Reunión' ? 'MEETING' : 'TASK',
                    status: 'PENDING',
                    creator: lead.responsable || 'Sistema',
                    contactId: lead.contactId || ''
                })
                invalidateCache(CONTACTS_SPREADSHEET_ID)
            } catch (agendaError) {
                console.error('Error auto-creating agenda item for lead:', agendaError)
                // We don't throw here to avoid failing lead creation if agenda fails
            }
        }

        return { ...lead, id, timestamp }
    } catch (error) {
        console.error('Error in createLead service:', error)
        throw error
    }
}

export async function updateLead(id: string, updates: Partial<Lead>) {
    try {
        const data = await getSheetData(LEADS_SPREADSHEET_ID, `${TABS.leads}!A:Z`)
        if (data.length < 2) throw new Error('No leads found')

        const headers = data[0].map(h => h.trim().toLowerCase())
        const idIdx = headers.indexOf('id')
        if (idIdx === -1) throw new Error('ID column not found in Leads tab')

        const rowIndex = data.findIndex(row => row[idIdx] === id)
        if (rowIndex === -1) throw new Error(`Lead ${id} not found`)

        const originalRow = data[rowIndex]
        const updatedRow = [...originalRow]

        const setVal = (col: string, val: any) => {
            const i = headers.indexOf(col.toLowerCase())
            if (i !== -1) updatedRow[i] = String(val)
        }

        if (updates.nombre) setVal('nombre', updates.nombre)
        if (updates.empresa) setVal('empresa', updates.empresa)
        if (updates.email) setVal('email', updates.email)
        if (updates.telefono) setVal('telefono', updates.telefono)
        if (updates.pais) setVal('pais', updates.pais)
        if (updates.fuente) setVal('fuente', updates.fuente)
        if (updates.estado) setVal('estado', updates.estado)
        if (updates.notas) setVal('notas', updates.notas)
        if (updates.responsable) setVal('responsable', updates.responsable)
        if (updates.ultimaInteraccion) setVal('ultima_interaccion', updates.ultimaInteraccion)
        if (updates.interes) setVal('interes', updates.interes)
        if (updates.contactId !== undefined) setVal('contact_id', updates.contactId)

        await updateRow(LEADS_SPREADSHEET_ID, TABS.leads, rowIndex + 1, updatedRow)
        invalidateCache(LEADS_SPREADSHEET_ID)
        return true
    } catch (error) {
        console.error('Error updating lead:', error)
        throw error
    }
}

export async function deleteLead(id: string) {
    try {
        const data = await getSheetData(LEADS_SPREADSHEET_ID, `${TABS.leads}!A:Z`)
        if (data.length < 2) throw new Error('No leads found')

        const headers = data[0].map(h => h.trim().toLowerCase())
        const idIdx = headers.indexOf('id')
        if (idIdx === -1) throw new Error('ID column not found in Leads tab')

        const rowIndex = data.findIndex(row => row[idIdx] === id)
        if (rowIndex === -1) throw new Error(`Lead ${id} not found`)

        const meta = await getSpreadsheetMetadata(LEADS_SPREADSHEET_ID)
        const sheet = meta?.sheets?.find((s: any) => s.properties?.title === TABS.leads)
        const sheetId = sheet?.properties?.sheetId

        if (sheetId === undefined) throw new Error('SheetId for Leads not found')

        const authClient = await getAuthClient()
        await sheets.spreadsheets.batchUpdate({
            auth: authClient as any,
            spreadsheetId: LEADS_SPREADSHEET_ID,
            requestBody: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex,
                            endIndex: rowIndex + 1
                        }
                    }
                }]
            }
        })

        invalidateCache(LEADS_SPREADSHEET_ID)
        return true
    } catch (error) {
        console.error('Error deleting lead:', error)
        throw error
    }

}

// ─── Tracking Cache (Tracking_Cache tab) ──────────────────────────────────────
// Columns: A=OP_ID, B=CONTAINER, C=STATUS, D=LOCATION, E=ETD, F=ETA, G=VESSEL, H=VOYAGE, I=UPDATED_AT

export interface CachedTrackingRow {
    opId: string
    container: string
    status: string
    location: string
    etd: string
    eta: string
    vessel: string
    voyage: string
    updatedAt: string
}

function rowToCachedTracking(row: string[]): CachedTrackingRow {
    return {
        opId: row[0] || '',
        container: row[1] || '',
        status: row[2] || '',
        location: row[3] || '',
        etd: row[4] || '',
        eta: row[5] || '',
        vessel: row[6] || '',
        voyage: row[7] || '',
        updatedAt: row[8] || '',
    }
}

export async function getTrackingCache(): Promise<CachedTrackingRow[]> {
    try {
        const auth = await getAuthClient()
        const res = await sheets.spreadsheets.values.get({
            auth: auth as any,
            spreadsheetId: MASTER_SPREADSHEET_ID,
            range: `${TABS.trackingCache}!A2:I`,
        })
        const rows = (res.data.values || []) as string[][]
        return rows.filter(r => r[0]).map(rowToCachedTracking)
    } catch (error) {
        console.error('[TrackingCache] Error reading cache:', error)
        return []
    }
}

export async function getCachedTrackingByOp(opId: string): Promise<CachedTrackingRow | null> {
    const all = await getTrackingCache()
    return all.find(r => r.opId === opId) || null
}

/**
 * Insert or update a tracking cache row for an operation.
 * If a row with opId exists, updates it in-place. Otherwise appends.
 */
export async function upsertTrackingCache(
    opId: string,
    container: string,
    data: { status: string; location: string; etd?: string; eta?: string; vessel?: string; voyage?: string }
): Promise<void> {
    try {
        const auth = await getAuthClient()
        const now = new Date().toISOString()

        // Find existing row number
        const res = await sheets.spreadsheets.values.get({
            auth: auth as any,
            spreadsheetId: MASTER_SPREADSHEET_ID,
            range: `${TABS.trackingCache}!A2:A`,
        })
        const rows = (res.data.values || []) as string[][]
        const rowIndex = rows.findIndex(r => r[0] === opId)

        const values = [[
            opId,
            container,
            data.status,
            data.location,
            data.etd || '',
            data.eta || '',
            data.vessel || '',
            data.voyage || '',
            now,
        ]]

        if (rowIndex >= 0) {
            // Update existing row (rowIndex is 0-based from row 2, so sheet row = rowIndex + 2)
            const sheetRow = rowIndex + 2
            await sheets.spreadsheets.values.update({
                auth: auth as any,
                spreadsheetId: MASTER_SPREADSHEET_ID,
                range: `${TABS.trackingCache}!A${sheetRow}:I${sheetRow}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values },
            })
        } else {
            // Append new row
            await sheets.spreadsheets.values.append({
                auth: auth as any,
                spreadsheetId: MASTER_SPREADSHEET_ID,
                range: `${TABS.trackingCache}!A:I`,
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                requestBody: { values },
            })
        }
        console.log(`[TrackingCache] Upserted tracking for ${opId} (${container})`)
    } catch (error) {
        console.error('[TrackingCache] Error upserting:', error)
    }
}

/**
 * Delete the tracking cache row for an operation (called when liquidating).
 */
export async function deleteTrackingCache(opId: string): Promise<void> {
    try {
        const auth = await getAuthClient()

        // Find row to delete
        const res = await sheets.spreadsheets.values.get({
            auth: auth as any,
            spreadsheetId: MASTER_SPREADSHEET_ID,
            range: `${TABS.trackingCache}!A2:A`,
        })
        const rows = (res.data.values || []) as string[][]
        const rowIndex = rows.findIndex(r => r[0] === opId)
        if (rowIndex < 0) return // Nothing to delete

        const sheetRow = rowIndex + 2 // 1-indexed + header row

        // Get sheet ID for Tracking_Cache tab
        const metaRes = await sheets.spreadsheets.get({
            auth: auth as any,
            spreadsheetId: MASTER_SPREADSHEET_ID,
            fields: 'sheets.properties',
        })
        const sheetMeta = metaRes.data.sheets?.find(
            (s: any) => s.properties?.title === TABS.trackingCache
        )
        if (!sheetMeta?.properties?.sheetId) return
        const sheetId = sheetMeta.properties.sheetId

        await sheets.spreadsheets.batchUpdate({
            auth: auth as any,
            spreadsheetId: MASTER_SPREADSHEET_ID,
            requestBody: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: sheetRow - 1, // 0-indexed
                            endIndex: sheetRow,
                        }
                    }
                }]
            }
        })
        console.log(`[TrackingCache] Deleted tracking for ${opId}`)
    } catch (error) {
        console.error('[TrackingCache] Error deleting:', error)
    }
}

// === GASTOS GENERALES ===

export async function getGastosGenerales(): Promise<GastoGeneral[]> {
    try {
        const authClient = await getAuthClient()
        const res = await sheets.spreadsheets.values.get({
            auth: authClient as any,
            spreadsheetId: MASTER_SPREADSHEET_ID,
            range: `${TABS.gastos}!A2:F`,
        })

        const rows = res.data.values || []
        return rows.map((row: any) => ({
            id: row[0],
            date: row[1],
            responsable: row[2],
            category: row[3],
            description: row[4],
            amount: parseNumeric(row[5]),
            timestamp: row[6] || ''
        }))
    } catch (error) {
        console.error('Error fetching gastos generales:', error)
        return []
    }
}

export async function addGastoGeneral(gasto: Omit<GastoGeneral, 'id'>): Promise<GastoGeneral> {
    try {
        const authClient = await getAuthClient()
        const id = crypto.randomUUID()
        
        await sheets.spreadsheets.values.append({
            auth: authClient as any,
            spreadsheetId: MASTER_SPREADSHEET_ID,
            range: `${TABS.gastos}!A:F`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [
                    [id, gasto.date, gasto.responsable, gasto.category, gasto.description, gasto.amount]
                ]
            }
        })

        return { id, ...gasto }
    } catch (error) {
        console.error('Error adding gasto general:', error)
        throw new Error('Error saving expense')
    }
}

export async function deleteGastoGeneral(id: string): Promise<void> {
    try {
        const authClient = await getAuthClient()
        const res = await sheets.spreadsheets.values.get({
            auth: authClient as any,
            spreadsheetId: MASTER_SPREADSHEET_ID,
            range: `${TABS.gastos}!A:A`,
        })
        
        const rows = res.data.values || []
        const rowIndex = rows.findIndex(row => row[0] === id)
        
        if (rowIndex === -1) {
            throw new Error('Expense not found')
        }
        
        const metaRes = await sheets.spreadsheets.get({
            auth: authClient as any,
            spreadsheetId: MASTER_SPREADSHEET_ID,
            fields: 'sheets.properties'
        })
        const sheetMeta = metaRes.data.sheets?.find((s: any) => s.properties?.title === TABS.gastos)
        const sheetId = sheetMeta?.properties?.sheetId
        
        if (sheetId === undefined) {
            throw new Error('Sheet not found')
        }

        await sheets.spreadsheets.batchUpdate({
            auth: authClient as any,
            spreadsheetId: MASTER_SPREADSHEET_ID,
            requestBody: {
                requests: [
                    {
                        deleteDimension: {
                            range: {
                                sheetId,
                                dimension: 'ROWS',
                                startIndex: rowIndex, 
                                endIndex: rowIndex + 1
                            }
                        }
                    }
                ]
            }
        })
    } catch (error) {
        console.error('Error deleting gasto general:', error)
        throw new Error('Failed to delete expense')
    }
}
