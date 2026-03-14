import { NextResponse } from 'next/server'
import { getClaimsByOperation, addClaim } from '@/lib/googleSheets'
import { ClaimSchema } from '@/lib/schemas'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const operationId = searchParams.get('operationId')

    if (!operationId) {
        return NextResponse.json({ error: 'Missing operationId' }, { status: 400 })
    }

    try {
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo
        if (isDemo) {
            return NextResponse.json([{
                id: `REC-${operationId}-DEMO`,
                operationId: operationId,
                fechaApertura: '2025-03-20',
                tipo: 'Calidad',
                estado: 'En Progreso',
                responsable: 'Demo User',
                montoReclamado: 1500,
                moneda: 'USD',
                descripcion: 'Reclamo generado en modo demostración. Simulación de problema de calidad en destino.',
                linkCarpetaDrive: 'https://drive.google.com/drive/folders/demo'
            }])
        }

        const claims = await getClaimsByOperation(operationId)
        return NextResponse.json(claims)
    } catch (error) {
        console.error('Error in GET /api/reclamos:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        const body = await request.json()
        const validated = ClaimSchema.parse(body)

        // Remove ID and timestamp if present to let the library generate them
        const { id, timestamp, ...claimData } = validated as any

        if (isDemo) {
            return NextResponse.json({
                ...claimData,
                id: `REC-DEMO-NEW`
            })
        }

        const newClaim = await addClaim(claimData)
        return NextResponse.json(newClaim)
    } catch (error: any) {
        console.error('Error in POST /api/reclamos:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
