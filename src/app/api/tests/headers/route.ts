import { NextResponse } from 'next/server'
import { getSheetData, OPERATION_FIELD_MAP } from '@/lib/googleSheets'

export async function GET() {
    try {
        const spreadsheetId = process.env.SHEET_MASTER_ID || '1TmEDhSznW0XgUUETm2aP_0g_rDopW7ZVTbxm3QavDro'
        const tabName = 'Master Input'

        const data = await getSheetData(spreadsheetId, `${tabName}!A:AZ`, true) // forceFresh
        if (data.length === 0) return NextResponse.json({ error: 'No data' })

        const rawHeaders = data[0]
        const headers = rawHeaders.map(h => h.trim().toLowerCase())

        const findIdx = (keys: string[]) => {
            for (const k of keys) {
                const idx = headers.indexOf(k.toLowerCase())
                if (idx !== -1) return { key: k, idx }
            }
            return { key: null, idx: -1 }
        }

        const idDocumentoCheck = findIdx(OPERATION_FIELD_MAP.idDocumento)
        const bookingDocIdCheck = findIdx(OPERATION_FIELD_MAP.bookingDocId)

        return NextResponse.json({
            rawHeaders,
            headers,
            idDocumentoCheck,
            bookingDocIdCheck,
            length: headers.length
        })

    } catch (e: any) {
        return NextResponse.json({ error: e.message })
    }
}
