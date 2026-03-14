import { NextResponse } from 'next/server'
import { createOperation, updateOperation, addCashFlowTransaction, syncOperationCashFlow } from '@/lib/googleSheets'
import { createDriveFolder } from '@/lib/googleDocs'
import { getServerSession } from 'next-auth'
import { validateOperation, parseProducts } from '@/lib/validation'
import { Operacion } from '@/lib/sheets-types'

export async function POST(req: Request) {
    try {
        const session = await getServerSession()
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const userEmail = session.user.email
        const isDemo = (session?.user as any)?.isDemo

        const body = await req.json()

        if (isDemo) {
            return NextResponse.json({
                success: true,
                data: { ...body, id: `25-DEMO-${Date.now().toString().slice(-4)}`, estado: '1. Operación Creada' },
                message: 'Operación creada correctamente (Modo Demo)',
                folderStatus: 'Demo',
                folderError: null
            })
        }

        // Prepare the new operation object
        const opData: Partial<Operacion> = {
            estado: '1. Operación Creada', // Initial state
            cliente: body.cliente,
            exportador: body.exportador,
            productor: body.productor,
            fechaEmbarque: body.fecha,
            puertoDestino: body.puerto,
            productos: body.productos,
            purchasePricesRaw: body.purchasePricesRaw,
            flete: body.flete,
            notas: body.notas,
            incoterm: body.incoterm,
            userId: userEmail
        }

        // señor operaciones validation
        const errors = validateOperation(opData)
        if (errors.length > 0) {
            return NextResponse.json(
                { error: 'Validación fallida', details: errors },
                { status: 400 }
            )
        }

        const nuevaOperacion = await createOperation(opData as Operacion)

        let folderStatus = 'Skipped'
        let folderErrorMsg = null

        // Folder Creation Logic with Retries
        if (nuevaOperacion.folderName && nuevaOperacion.id) {
            let attempt = 0;
            const maxAttempts = 3;
            let currentFolderId: string | null = null;

            while (attempt < maxAttempts) {
                try {
                    attempt++;
                    if (!currentFolderId) {
                        currentFolderId = await createDriveFolder(nuevaOperacion.folderName) || null
                    }

                    if (currentFolderId) {
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Slight delay to ensure Sheet consistency
                        await updateOperation(nuevaOperacion.id, { idCarpeta: currentFolderId })
                        nuevaOperacion.idCarpeta = currentFolderId
                        folderStatus = 'Created'
                    }
                    break; // Success, exit retry loop
                } catch (folderError: any) {
                    console.error(`Error creating folder/updating sheet (Attempt ${attempt}/${maxAttempts}):`, folderError)
                    folderStatus = `Failed (Attempt ${attempt})`
                    folderErrorMsg = folderError.message || String(folderError)

                    if (attempt >= maxAttempts) break;
                    await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
                }
            }
        }

        // Auto-create pending cash flow transactions
        if (nuevaOperacion.id) {
            try {
                // Use the new centralized sync logic
                await syncOperationCashFlow(nuevaOperacion.id)
            } catch (txError) {
                console.error('Error creating cash flow:', txError);
            }
        }

        return NextResponse.json({
            success: true,
            data: nuevaOperacion,
            message: 'Operación creada correctamente con validación de Señor Operaciones',
            folderStatus,
            folderError: folderErrorMsg
        })

    } catch (error) {
        console.error('Error creating operation:', error)
        return NextResponse.json(
            { error: 'Error al crear la operación' },
            { status: 500 }
        )
    }
}
