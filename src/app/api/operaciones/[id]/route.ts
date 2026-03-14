import { updateOperation, syncOperationCashFlow, deleteCashFlowByOperation, getOperationById, getAuthClient, TABS, MASTER_SPREADSHEET_ID, resolveMasterTabName } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Import authOptions
export const dynamic = 'force-dynamic';
import { google } from 'googleapis';

async function validateOwnership(operationId: string) {
    const session = await getServerSession(authOptions) // Pass authOptions
    if (!session?.user?.email) return { error: 'Unauthorized', status: 401 }

    const userEmail = session.user.email
    const userRole = (session.user as any).role
    const isAdmin = userRole === 'Admin' || userEmail === 'hm@southmarinetrading.com' || userEmail === 'admin@southmarinetrading.com'

    if (isAdmin) return { success: true, userEmail, isAdmin }

    const operation = await getOperationById(operationId)
    if (!operation) return { error: 'Operation not found', status: 404 }

    return { success: true, userEmail, isAdmin }
}

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo
        
        if (isDemo) {
            const { MOCK_OPERACIONES } = await import('@/lib/mockData')
            const op = MOCK_OPERACIONES.find(o => o.id === id)
            if (op) {
                return NextResponse.json({ success: true, data: op })
            } else {
                return NextResponse.json({ success: false, error: 'Operation not found in demo' }, { status: 404 })
            }
        }

        const op = await getOperationById(id);

        if (!op) {
            return NextResponse.json({ success: false, error: 'Operation not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: op });
    } catch (error) {
        console.error('Error fetching operation:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch operation' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        const userEmail = session?.user?.email || undefined
        const isDemo = (session?.user as any)?.isDemo

        const body = await request.json();
        const id = params.id;

        if (isDemo) {
            return NextResponse.json({ ...body, id })
        }

        // 1. Fetch current operation to compare folder naming fields
        const currentOp = await getOperationById(id);

        if (currentOp && currentOp.idCarpeta) {
            const { calculateFolderName } = require('@/lib/sheets-types');
            const { renameDriveFile } = require('@/lib/googleDocs');

            // Merge current data with updates for name calculation
            const nextOpData = { ...currentOp, ...body };
            const newName = calculateFolderName(nextOpData);
            const oldName = calculateFolderName(currentOp);

            if (newName !== oldName) {
                console.log(`[FolderRename] Renaming "${oldName}" to "${newName}" for shared folder ${currentOp.idCarpeta}`);
                try {
                    await renameDriveFile(currentOp.idCarpeta, newName);
                    // Also update the human-readable folder name in the sheet
                    body.nombreCarpeta = newName;
                } catch (renameError) {
                    console.error('[FolderRename] Failed to rename folder:', renameError);
                    // We continue even if rename fails, as the data update is more critical
                }
            }
        }

        const updated = await updateOperation(id, body, userEmail);

        try {
            await syncOperationCashFlow(id);
        } catch (syncError) {
            console.error('Error syncing financial data on update:', syncError);
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Error updating operation:', error);
        return NextResponse.json(
            { error: 'Failed to update operation' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params
        console.log(`[DELETE] Starting deletion for operation ${id}`)

        // Validate Auth
        const authCheck = await validateOwnership(id)
        if (authCheck.error) {
            console.error(`[DELETE] Auth failed: ${authCheck.error}`)
            return NextResponse.json({ success: false, error: authCheck.error }, { status: authCheck.status || 401 })
        }

        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo
        if (isDemo) {
            return NextResponse.json({
                success: true,
                message: 'Operation deleted successfully (Demo)',
                details: { masterInput: 'demo', cashFlow: 'demo', driveFolder: 'demo' }
            })
        }

        const auth = await getAuthClient()

        const sheets = google.sheets({ version: 'v4', auth: auth as any })
        const drive = google.drive({ version: 'v3', auth: auth as any })
        const spreadsheetId = MASTER_SPREADSHEET_ID

        // 0. Resolve the correct tab name
        const tabName = await resolveMasterTabName()
        console.log(`[DELETE] Using tab: ${tabName}`)

        // 1. Find the row and get folder ID
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${tabName}!A:AZ`
        })

        const data = response.data.values || []
        if (data.length < 2) {
            return NextResponse.json({ success: false, error: `No data found in ${tabName}` }, { status: 404 })
        }

        const headers = data[0].map((h: string) => h.trim().toLowerCase())

        // Use the centralized map for finding columns
        const findColIdx = (keys: string[]) => {
            const lowerKeys = keys.map(k => k.toLowerCase())
            return headers.findIndex(h => lowerKeys.includes(h))
        }

        const { OPERATION_FIELD_MAP } = require('@/lib/googleSheets')
        const idIdx = findColIdx(OPERATION_FIELD_MAP.id)
        const folderIdIdx = findColIdx(OPERATION_FIELD_MAP.idCarpeta)

        // Fallback to specific columns if headers fail (Column A is 0, Column C is 2)
        const SAFE_ID_IDX = idIdx !== -1 ? idIdx : 0
        const SAFE_FOLDER_IDX = folderIdIdx !== -1 ? folderIdIdx : 2

        let rowIndex = -1
        let folderId = ''

        // Scan all rows
        for (let i = 1; i < data.length; i++) {
            const rowId = (data[i][SAFE_ID_IDX] || '').trim()
            if (rowId === id) {
                rowIndex = i
                folderId = data[i][SAFE_FOLDER_IDX] || ''
                break
            }
        }

        if (rowIndex === -1) {
            console.error(`[DELETE] Operation ${id} not found in sheet`)
            return NextResponse.json({ success: false, error: 'Operation not found' }, { status: 404 })
        }

        console.log(`[DELETE] Found op in data index ${rowIndex} (Row ${rowIndex + 1}), folderId: ${folderId}`)

        // 2. CHECK DRIVE FOLDER STATUS (But do NOT abort operation delete if not empty)
        let folderDeleteStatus = 'skipped'
        if (folderId) {
            try {
                const folderRes = await drive.files.list({
                    q: `'${folderId}' in parents and trashed = false`,
                    fields: 'files(id, name)'
                })
                const files = folderRes.data.files || []

                if (files.length === 0) {
                    // Empty -> Schedule for deletion
                    folderDeleteStatus = 'ready'
                } else {
                    folderDeleteStatus = 'not_empty'
                    console.warn(`[DELETE] Folder ${folderId} not empty (${files.length} files). Skipping folder deletion.`)
                }
            } catch (driveError) {
                console.error('Error checking Drive folder:', driveError)
                folderDeleteStatus = 'error_checking'
            }
        }

        // 3. Delete the row from Sheets
        const meta = await sheets.spreadsheets.get({ spreadsheetId })
        const sheet = meta.data.sheets?.find(s => s.properties?.title === tabName)
        const sheetId = sheet?.properties?.sheetId

        if (sheetId === undefined) {
            // Fallback: Try finding sheet by ID 0 if name doesn't match exactly, usually 'Hoja 1' or first sheet
            const firstSheetId = meta.data.sheets?.[0]?.properties?.sheetId
            if (firstSheetId !== undefined) {
                console.warn("Could not find 'Master Input' by name, using first sheet.")
                // Only usage if we are sure. But 'Master Input' should exist.
            }
            throw new Error('Could not find sheetId for Master Input')
        }

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex, // Inclusive (Row i+1)
                            endIndex: rowIndex + 1 // Exclusive (Row i+2)
                        }
                    }
                }]
            }
        })
        console.log(`[DELETE] Row ${rowIndex + 1} deleted from Master Input`)

        // 4. Delete related CashFlow movements
        try {
            await deleteCashFlowByOperation(id)
            console.log(`[DELETE] CashFlow movements deleted for opId: ${id}`)
        } catch (cfError) {
            console.error('Error in cascading deletion:', cfError)
        }

        // 5. Delete the Folder IF it was ready (empty)
        if (folderDeleteStatus === 'ready' && folderId) {
            try {
                await drive.files.delete({ fileId: folderId })
                console.log(`[DELETE] Drive folder ${folderId} deleted`)
                folderDeleteStatus = 'deleted'
            } catch (driveError) {
                console.error('Error deleting empty Drive folder:', driveError)
                folderDeleteStatus = 'error_deleting'
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Operation deleted successfully',
            details: {
                masterInput: 'deleted',
                cashFlow: 'deleted',
                driveFolder: folderDeleteStatus
            }
        })

    } catch (error: any) {
        console.error('Error deleting operation:', error)
        return NextResponse.json({ success: false, error: error.message || 'Error al eliminar la operación' }, { status: 500 })
    }
}
