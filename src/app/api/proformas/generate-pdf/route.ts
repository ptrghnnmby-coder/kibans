
import { NextResponse } from 'next/server'
import { searchMasterInput } from '@/lib/googleSheets'
import { getAllContactos, getAllProductos } from '@/lib/googleSheets'
import { generateProformaData, OperationInput } from '@/lib/proformaEngine'
import { getProformaHtml } from '@/lib/proformaTemplate'
import { generatePdf } from '@/lib/pdfGenerator'
import { uploadFileToDrive } from '@/lib/googleDocs'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(request: Request) {
    try {
        const { operationId } = await request.json()

        if (!operationId) {
            return NextResponse.json({ success: false, error: 'Operation ID required' }, { status: 400 })
        }

        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        if (isDemo) {
            const { generatePdf } = await import('@/lib/pdfGenerator')
            const pdfBuffer = await generatePdf(`<h1>Proforma Invoice - Demo</h1><p>This is a mock PDF for operation <strong>${operationId}</strong> since you are in Demo Mode.</p>`)
            return new NextResponse(new Uint8Array(pdfBuffer), {
                status: 200,
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="PI-${operationId}-DEMO.pdf"`
                }
            })
        }

        // 1. Fetch Data
        const ops = await searchMasterInput(operationId)
        const op = ops.find(o => o.id === operationId)

        if (!op) {
            return NextResponse.json({ success: false, error: 'Operation not found' }, { status: 404 })
        }

        const contacts = await getAllContactos()
        const catalogProducts = await getAllProductos()

        const importers = contacts.filter(c => c.tipo === 'Importador' || c.isImporter)
        const exporters = contacts.filter(c => c.tipo === 'Exportador' || c.isExporter)
        const producers = contacts.filter(c => c.tipo === 'Productor' || c.isProducer)

        // 2. Prepare Input
        const productString = op.productos || ""
        const productsParsed = productString.split('\n').map(line => {
            const parts = line.split(':')
            if (parts.length < 3) return null
            return {
                id: parts[0].trim(),
                qty: parseFloat(parts[1]) || 0,
                price: parseFloat(parts[2]) || 0
            }
        }).filter(p => p !== null) as any[]

        const input: OperationInput = {
            id_carga: op.id,
            user_id: op.userId || "",
            import_id: op.cliente,
            export_id: op.exportador,
            producer_id: op.productor || "",
            port_dest: op.puertoDestino || "",
            port_load: op.portLoad || "Montevideo",
            incoterm: op.incoterm || "CFR",
            ship_date: op.fechaEmbarque || new Date().toISOString(),
            ship_lane: op.shipLane || "",
            payment_terms: op.paymentTerms || "",
            trading: op.trading || "",
            notes: op.notas || "",
            brand: op.brand || "",
            products: productsParsed
        }

        // 3. Generate Data & HTML
        const generatedData = generateProformaData(input, ops, catalogProducts, importers, exporters, producers)

        // Override computed IDs
        generatedData.id_carga = op.id || generatedData.id_carga
        generatedData.pi_number = op.piNumber || `Pi ${op.id}`
        generatedData.replacements['proforma_n'] = generatedData.pi_number

        const html = getProformaHtml(generatedData)

        // 4. Generate PDF
        const pdfBuffer = await generatePdf(html)

        // 5. Upload to Drive if folder exists
        if (op.idCarpeta) {
            try {
                const fileName = `${generatedData.pi_number}.pdf`
                const uploadedFile = await uploadFileToDrive(pdfBuffer, fileName, 'application/pdf', op.idCarpeta)
                console.log(`PDF uploaded to Drive. File ID: ${uploadedFile.id} in Folder: ${op.idCarpeta}`)
            } catch (driveError) {
                console.error('Error uploading to Drive:', driveError)
                // Continue to return the PDF even if upload fails
            }
        } else {
            console.warn(`No folder ID found for operation ${op.id}. Skipping Drive upload.`)
        }

        // 6. Return PDF
        return new NextResponse(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${generatedData.pi_number}.pdf"`
            }
        })

    } catch (error: any) {
        console.error('Error generating PDF:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
