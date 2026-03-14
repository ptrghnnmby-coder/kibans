
import { google } from 'googleapis'
import { getAuthClient } from './googleSheets'

const drive = google.drive({ version: 'v3' })
const docs = google.docs({ version: 'v1' })

// ID del Template proporcionado por el usuario (Dynamic version)
// ID del Template proporcionado por el usuario (Dynamic version)
const TEMPLATE_ID = process.env.TEMPLATE_ID || '1x8717Fb4aPWIzi_-mtRC1ItnK9HPEm_tg1z66o_I248'
// ID del Template de Purchase Order
const PO_TEMPLATE_ID = process.env.PO_TEMPLATE_ID || '1U6vF9Ec5X1z4kGdcEqBEMho-WkmWe6xqT1ZhhEzzBHs'
// ID del Template de Booking Instruction
const BOOKING_TEMPLATE_ID = process.env.BOOKING_TEMPLATE_ID || '1f47bTENV0T_0hZJWfXOuh8Qocbvm6YBu-7krGDec3V8'
// ID del Template de Original Invoice
const INVOICE_TEMPLATE_ID = process.env.INVOICE_TEMPLATE_ID || '141cmIhOlF7O0m3mLa9W1SyPd0IR0eYu8PQnWWYylXw8'

// Carpeta Raíz para Operaciones 2026 (Hardcoded from N8N or env)
const OPERATIONS_ROOT_FOLDER_ID = process.env.OPERATIONS_ROOT_FOLDER_ID || '1gIVhf5UWYRRMaUOv4Xou4msSfA4-jAC2'

export async function createDriveFolder(folderName: string, parentId: string = OPERATIONS_ROOT_FOLDER_ID) {
    try {
        const authClient = await getAuthClient()

        // 1. Check if folder already exists
        const existingFolders = await drive.files.list({
            auth: authClient as any,
            q: `name = '${folderName.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
        })

        if (existingFolders.data.files && existingFolders.data.files.length > 0) {
            console.log(`[Drive] Folder "${folderName}" already exists with ID: ${existingFolders.data.files[0].id}`)
            return existingFolders.data.files[0].id
        }

        // 2. Create if not exists
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId]
        }

        const file = await drive.files.create({
            auth: authClient as any,
            requestBody: fileMetadata,
            fields: 'id',
            supportsAllDrives: true
        })

        return file.data.id
    } catch (error) {
        console.error('Error creating folder:', error)
        throw error
    }
}

export async function renameDriveFile(fileId: string, newName: string) {
    try {
        const authClient = await getAuthClient()
        await drive.files.update({
            auth: authClient as any,
            fileId: fileId,
            requestBody: {
                name: newName
            },
            supportsAllDrives: true
        })
        console.log(`Drive file ${fileId} renamed to: ${newName}`)
        return true
    } catch (error) {
        console.error('Error renaming drive file:', error)
        throw error
    }
}

export async function createPurchaseOrderDoc(
    data: Record<string, string>,
    fileName: string,
    folderId?: string,
    productsArray?: Array<{ qty: string, desc: string, unit: string, subtotal: string, ctns: string }>
) {
    try {
        const authClient = await getAuthClient()

        // 1. Copiar Template
        const copyResponse = await drive.files.copy({
            auth: authClient as any,
            fileId: PO_TEMPLATE_ID,
            requestBody: {
                name: fileName,
                parents: folderId ? [folderId] : (OPERATIONS_ROOT_FOLDER_ID ? [OPERATIONS_ROOT_FOLDER_ID] : undefined)
            },
            supportsAllDrives: true
        })

        const newDocId = copyResponse.data.id
        if (!newDocId) throw new Error('Error copying PO template')

        // 2. Handle Dynamic Products if provided (New Logic for PO)
        if (productsArray && productsArray.length > 0) {
            await insertProductRows(authClient, newDocId, productsArray)
        }

        // 3. Regular Text Replacements
        const requests = Object.entries(data).map(([key, value]) => ({
            replaceAllText: {
                containsText: {
                    text: `((${key}))`,
                    matchCase: false
                },
                replaceText: value || " "
            }
        }))

        const requestsCurly = Object.entries(data).map(([key, value]) => ({
            replaceAllText: {
                containsText: {
                    text: `{{${key}}}`,
                    matchCase: false
                },
                replaceText: value || " "
            }
        }))

        const allRequests = [...requests, ...requestsCurly]

        if (allRequests.length > 0) {
            await docs.documents.batchUpdate({
                auth: authClient as any,
                documentId: newDocId,
                requestBody: {
                    requests: allRequests
                }
            })
        }

        return newDocId

    } catch (error) {
        console.error('Error creating PO doc:', error)
        throw error
    }
}

export async function createProformaDoc(
    data: Record<string, string>,
    fileName: string,
    folderId?: string,
    productsArray?: Array<{ qty: string, desc: string, unit: string, subtotal: string, ctns: string }>
) {
    try {
        const authClient = await getAuthClient()

        // 1. Copiar Template
        const copyResponse = await drive.files.copy({
            auth: authClient as any,
            fileId: TEMPLATE_ID,
            requestBody: {
                name: fileName,
                parents: folderId ? [folderId] : (OPERATIONS_ROOT_FOLDER_ID ? [OPERATIONS_ROOT_FOLDER_ID] : undefined)
            },
            supportsAllDrives: true
        })

        const newDocId = copyResponse.data.id
        if (!newDocId) throw new Error('Error copying template')

        // 2. Handle Dynamic Products if provided
        if (productsArray && productsArray.length > 0) {
            await insertProductRows(authClient, newDocId, productsArray)
        }

        // 3. Regular Text Replacements
        const requests = Object.entries(data).map(([key, value]) => ({
            replaceAllText: {
                containsText: {
                    text: `((${key}))`,
                    matchCase: false
                },
                replaceText: value || " "
            }
        }))

        const requestsCurly = Object.entries(data).map(([key, value]) => ({
            replaceAllText: {
                containsText: {
                    text: `{{${key}}}`,
                    matchCase: false
                },
                replaceText: value || " "
            }
        }))

        const allRequests = [...requests, ...requestsCurly]

        if (allRequests.length > 0) {
            await docs.documents.batchUpdate({
                auth: authClient as any,
                documentId: newDocId,
                requestBody: {
                    requests: allRequests
                }
            })
        }

        return newDocId

    } catch (error) {
        console.error('Error creating proforma doc:', error)
        throw error
    }
}

export async function createInvoiceDoc(
    data: Record<string, string>,
    fileName: string,
    folderId?: string,
    productsArray?: Array<{ qty: string, desc: string, unit: string, subtotal: string, ctns: string }>
) {
    try {
        const authClient = await getAuthClient()
        const copyResponse = await drive.files.copy({
            auth: authClient as any,
            fileId: INVOICE_TEMPLATE_ID,
            requestBody: {
                name: fileName,
                parents: folderId ? [folderId] : (OPERATIONS_ROOT_FOLDER_ID ? [OPERATIONS_ROOT_FOLDER_ID] : undefined)
            },
            supportsAllDrives: true
        })
        const newDocId = copyResponse.data.id
        if (!newDocId) throw new Error('Error copying invoice template')
        if (productsArray && productsArray.length > 0) {
            await insertProductRows(authClient, newDocId, productsArray)
        }
        const requests = Object.entries(data).map(([key, value]) => ({
            replaceAllText: { containsText: { text: `((${key}))`, matchCase: false }, replaceText: value || ' ' }
        }))
        const requestsCurly = Object.entries(data).map(([key, value]) => ({
            replaceAllText: { containsText: { text: `{{${key}}}`, matchCase: false }, replaceText: value || ' ' }
        }))
        if (requests.length > 0) {
            await docs.documents.batchUpdate({
                auth: authClient as any,
                documentId: newDocId,
                requestBody: { requests: [...requests, ...requestsCurly] }
            })
        }
        return newDocId
    } catch (error) {
        console.error('Error creating invoice doc:', error)
        throw error
    }
}

export async function createBookingDoc(
    data: Record<string, string>,
    fileName: string,
    folderId?: string,
    productsArray?: Array<any>,
    templateId?: string
) {
    try {
        const authClient = await getAuthClient()
        const actualTemplateId = templateId || BOOKING_TEMPLATE_ID

        if (!actualTemplateId) {
            console.warn('No Booking template ID provided, using generic template fallback')
        }

        const copyResponse = await drive.files.copy({
            auth: authClient as any,
            fileId: actualTemplateId || TEMPLATE_ID,
            requestBody: {
                name: fileName,
                parents: folderId ? [folderId] : (OPERATIONS_ROOT_FOLDER_ID ? [OPERATIONS_ROOT_FOLDER_ID] : undefined)
            },
            supportsAllDrives: true
        })

        const newDocId = copyResponse.data.id
        if (!newDocId) throw new Error('Error copying template')

        // Booking uses generic placeholders ((product_qty)), ((product_ctns)), ((product_desc)),
        // ((product_gross)), ((product_net)) in ONE template row + <<END_PRODUCT_ROW>> marker.
        // insertProductRows duplicates the row for each product dynamically.
        // IMPORTANT: update the booking template to use these generic placeholders (no _1 suffix).
        if (productsArray && productsArray.length > 0) {
            const mappedProducts = productsArray.map((p: any) => ({
                qty: p.qty || '',
                ctns: p.cartons || '',
                desc: p.description || p.desc || '',
                unit: p.weight || p.unit || '',      // → ((product_gross))
                subtotal: p.netWeight || p.net || '' // → ((product_net))
            }))
            await insertProductRows(authClient, newDocId, mappedProducts)
        }

        const requests = Object.entries(data).map(([key, value]) => ({
            replaceAllText: {
                containsText: { text: `((${key}))`, matchCase: false },
                replaceText: value || " "
            }
        }))

        if (requests.length > 0) {
            await docs.documents.batchUpdate({
                auth: authClient as any,
                documentId: newDocId,
                requestBody: { requests }
            })
        }

        return newDocId
    } catch (error) {
        console.error('Error creating booking doc:', error)
        throw error
    }
}

async function insertProductRowsGeneric(
    authClient: any,
    docId: string,
    products: Array<any>
) {
    try {
        const doc = await docs.documents.get({
            auth: authClient,
            documentId: docId
        })

        if (!doc.data.body || !doc.data.body.content) throw new Error('Document body not found')

        // Find keys from first product
        const keys = Object.keys(products[0])

        const requests: any[] = []
        // Simple strategy: replace placeholders in the whole doc
        // For multiple rows, we expect the user to have ((key)) in a table row
        // This generic version just handles the first item for now or simple batch replaces
        // if user wants real dynamic rows, it needs deeper table logic as in proforma.

        products.forEach((prod) => {
            keys.forEach(key => {
                requests.push({
                    replaceAllText: {
                        containsText: { text: `((product_${key}))`, matchCase: false },
                        replaceText: String(prod[key]) || " "
                    }
                })
            })
        })

        if (requests.length > 0) {
            await docs.documents.batchUpdate({
                auth: authClient,
                documentId: docId,
                requestBody: { requests }
            })
        }
    } catch (err) {
        console.error('Error in generic row insertion:', err)
    }
}

async function insertProductRows(
    authClient: any,
    docId: string,
    products: Array<{ qty: string, desc: string, unit: string, subtotal: string, ctns: string }>
) {
    try {
        console.log(`[googleDocs] insertProductRows called with ${products.length} products for doc ${docId}`);

        if (!products || products.length === 0) {
            console.log('[googleDocs] No products to insert.');
            return;
        }

        // ===================================================================
        // PHASE 1: Try table row duplication (bonus — pretty separate rows)
        // ===================================================================
        let tableRowInsertionDone = false;
        try {
            const doc = await docs.documents.get({ auth: authClient, documentId: docId });
            if (!doc.data.body?.content) throw new Error('No body content');

            let tableIndex: number | null = null;
            let templateRowIndex: number | null = null;

            // Find the product template row by scanning all text in each row
            const findTable = (content: any[]): void => {
                for (const element of content) {
                    if (element.table) {
                        for (let rowIdx = 0; rowIdx < element.table.tableRows.length; rowIdx++) {
                            const row = element.table.tableRows[rowIdx];
                            let rowText = "";
                            for (const cell of row.tableCells || []) {
                                for (const p of cell.content || []) {
                                    for (const e of p.paragraph?.elements || []) {
                                        rowText += (e.textRun?.content || "");
                                    }
                                }
                            }
                            // Strip ALL whitespace to handle text split across text runs
                            const clean = rowText.replace(/\s/g, '').toLowerCase();
                            if (
                                clean.includes('product_qty') ||
                                clean.includes('product_qt') ||
                                clean.includes('((product_') ||
                                clean.includes('{{product_') ||
                                (clean.includes('product_') && clean.includes('desc'))
                            ) {
                                tableIndex = element.startIndex;
                                templateRowIndex = rowIdx;
                                console.log(`[googleDocs] Found product row at table ${tableIndex}, row ${rowIdx}`);
                                return;
                            }
                        }
                    }
                }
            };
            findTable(doc.data.body.content);

            if (tableIndex !== null && templateRowIndex !== null && products.length > 1) {
                // Insert additional rows for products 2..N
                const insertRequests: any[] = [];
                for (let i = 1; i < products.length; i++) {
                    insertRequests.push({
                        insertTableRow: {
                            tableCellLocation: {
                                tableStartLocation: { index: tableIndex },
                                rowIndex: templateRowIndex
                            },
                            insertBelow: true
                        }
                    });
                }
                await docs.documents.batchUpdate({ auth: authClient, documentId: docId, requestBody: { requests: insertRequests } });

                // Refresh doc and fill all product rows
                const updatedDoc = await docs.documents.get({ auth: authClient, documentId: docId });
                let updatedTable: any = null;
                const findUpdated = (content: any[]): void => {
                    for (const el of content) {
                        if (el.table && el.startIndex === tableIndex) { updatedTable = el.table; return; }
                    }
                };
                findUpdated(updatedDoc.data.body?.content || []);

                if (updatedTable) {
                    const fillRequests: any[] = [];
                    for (let i = 0; i < products.length; i++) {
                        const prod = products[i];
                        const row = updatedTable.tableRows[templateRowIndex! + i];
                        if (!row) continue;
                        const cellData = row.tableCells.length >= 5
                            ? [prod.qty, prod.ctns, prod.desc, prod.unit, prod.subtotal]
                            : [prod.qty, prod.desc, prod.unit, prod.subtotal];

                        cellData.forEach((val, cIdx) => {
                            const cell = row.tableCells[cIdx];
                            if (cell?.content?.length > 0 && val) {
                                // Google Docs API rejects insertText with empty string — skip empty values
                                const insertIdx = cell.content[0].startIndex;
                                fillRequests.push({ index: insertIdx, text: val });
                            }
                        });
                    }
                    // Filter out any remaining empty-text requests
                    const validFillRequests = fillRequests.filter(r => r.text && r.text.length > 0);
                    if (validFillRequests.length > 0) {
                        validFillRequests.sort((a, b) => b.index - a.index);
                        await docs.documents.batchUpdate({
                            auth: authClient, documentId: docId,
                            requestBody: { requests: validFillRequests.map(r => ({ insertText: { location: { index: r.index }, text: r.text } })) }
                        });
                        tableRowInsertionDone = true;
                        console.log('[googleDocs] Table row insertion succeeded.');
                    }
                }
            }
        } catch (tableErr) {
            console.error('[googleDocs] Table row insertion failed (will use replaceAllText fallback):', tableErr);
        }

        // ===================================================================
        // PHASE 2: ALWAYS run replaceAllText — either to fill template row
        // (if table insertion failed/only 1 product) or to wipe placeholders
        // (if table insertion succeeded, these won't find anything to replace)
        // ===================================================================
        const sep = '\n';
        const qtyAll = products.map(p => p.qty).join(sep);
        const ctnsAll = products.map(p => p.ctns).join(sep);
        const descAll = products.map(p => p.desc).join(sep);
        const unitAll = products.map(p => p.unit).join(sep);
        const subAll = products.map(p => p.subtotal).join(sep);

        // All possible marker formats the template might use
        const placeholderReplacements = [
            // ((double-paren)) style
            { find: '((product_qty))', replace: tableRowInsertionDone ? '' : qtyAll },
            { find: '((product_ctns))', replace: tableRowInsertionDone ? '' : ctnsAll },
            { find: '((product_desc))', replace: tableRowInsertionDone ? '' : descAll },
            { find: '((product_unit))', replace: tableRowInsertionDone ? '' : unitAll },
            { find: '((product_uni))', replace: tableRowInsertionDone ? '' : unitAll },
            { find: '((product_sub))', replace: tableRowInsertionDone ? '' : subAll },
            // Booking aliases: gross = unit column, net = subtotal column
            { find: '((product_gross))', replace: tableRowInsertionDone ? '' : unitAll },
            { find: '((product_net))', replace: tableRowInsertionDone ? '' : subAll },
            // Handle Google Docs split text: product_qt + y  
            { find: '((product_qt', replace: tableRowInsertionDone ? '' : qtyAll },
            // {{curly}} style
            { find: '{{product_qty}}', replace: tableRowInsertionDone ? '' : qtyAll },
            { find: '{{product_ctns}}', replace: tableRowInsertionDone ? '' : ctnsAll },
            { find: '{{product_desc}}', replace: tableRowInsertionDone ? '' : descAll },
            { find: '{{product_unit}}', replace: tableRowInsertionDone ? '' : unitAll },
            { find: '{{product_uni}}', replace: tableRowInsertionDone ? '' : unitAll },
            { find: '{{product_sub}}', replace: tableRowInsertionDone ? '' : subAll },
            { find: '{{product_gross}}', replace: tableRowInsertionDone ? '' : unitAll },
            { find: '{{product_net}}', replace: tableRowInsertionDone ? '' : subAll },
            // Markers / cleanup
            { find: '<<END_PRODUCT_ROW>>', replace: '' },
            { find: '<<END_PRODUKT_ROW>>', replace: '' },
        ];

        await docs.documents.batchUpdate({
            auth: authClient,
            documentId: docId,
            requestBody: {
                requests: placeholderReplacements.map(({ find, replace }) => ({
                    replaceAllText: {
                        containsText: { text: find, matchCase: false },
                        replaceText: replace
                    }
                }))
            }
        });

        console.log(`[googleDocs] insertProductRows complete. tableRowInsertionDone=${tableRowInsertionDone}`);

    } catch (error) {
        console.error('[googleDocs] Error in insertProductRows:', error);
    }
}



export async function exportDocToPdf(fileId: string): Promise<Buffer> {
    try {
        const authClient = await getAuthClient()

        const response = await drive.files.export({
            auth: authClient as any,
            fileId: fileId,
            mimeType: 'application/pdf'
        }, {
            responseType: 'arraybuffer',
            params: { supportsAllDrives: true }
        })

        return Buffer.from(response.data as any)
    } catch (error) {
        console.error('Error exporting doc to PDF:', error)
        throw error
    }
}

export async function deleteFile(fileId: string) {
    try {
        const authClient = await getAuthClient()
        await drive.files.delete({
            auth: authClient as any,
            fileId,
            supportsAllDrives: true
        })
        return true
    } catch (error) {
        console.error('Error deleting file:', error)
        throw error
    }
}

export async function uploadFileToDrive(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folderId?: string
): Promise<{ id: string, webViewLink?: string }> {
    try {
        const authClient = await getAuthClient()

        // Define metadata
        const fileMetadata: any = {
            name: fileName,
            parents: folderId ? [folderId] : (OPERATIONS_ROOT_FOLDER_ID ? [OPERATIONS_ROOT_FOLDER_ID] : undefined)
        }

        // Create media object
        const media = {
            mimeType: mimeType,
            body: require('stream').Readable.from(fileBuffer)
        }

        const response = await drive.files.create({
            auth: authClient as any,
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink',
            supportsAllDrives: true
        })

        if (!response.data.id) throw new Error('Failed to upload file to Drive')

        return { id: response.data.id, webViewLink: response.data.webViewLink || undefined }
    } catch (error) {
        console.error('Error uploading file to Drive:', error)
        throw error
    }
}

export async function shareFile(fileId: string, email?: string, role: 'reader' | 'writer' = 'writer') {
    try {
        const authClient = await getAuthClient()

        if (!email) {
            console.warn('[Security] Skipping file share: No email provided. Public sharing is disabled.')
            return
        }

        const permission: any = {
            role: role,
            type: 'user',
            emailAddress: email
        }

        await drive.permissions.create({
            auth: authClient as any,
            fileId: fileId,
            requestBody: permission,
            supportsAllDrives: true
        })
        console.log(`File ${fileId} shared with ${email || 'anyone'}`)
    } catch (error) {
        console.error('Error sharing file:', error)
        // Don't throw, just log. We don't want to break the flow if sharing fails
    }
}
