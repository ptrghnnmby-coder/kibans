import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getAllContactos, createContacto } from '@/lib/googleSheets'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        if (isDemo) {
            const { MOCK_CONTACTOS } = await import('@/lib/mockData')
            return NextResponse.json({
                success: true,
                data: MOCK_CONTACTOS,
                count: MOCK_CONTACTOS.length
            })
        }

        const contactos = await getAllContactos()
        return NextResponse.json({
            success: true,
            data: contactos,
            count: contactos.length
        })
    } catch (error) {
        console.error('Error fetching contactos:', error)
        return NextResponse.json(
            { success: false, error: 'Error al obtener contactos' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo
        const body = await request.json()

        if (isDemo) {
            return NextResponse.json({
                success: true,
                data: { ...body, id: `C-DEMO-${Date.now()}` },
            })
        }

        if (!body.tipo || !body.nombreContacto) {
            return NextResponse.json(
                { success: false, error: 'Faltan campos requeridos (tipo, nombreContacto)' },
                { status: 400 }
            )
        }

        const nuevoContacto = await createContacto(body)

        return NextResponse.json({
            success: true,
            data: nuevoContacto,
        })
    } catch (error) {
        console.error('Error creating contacto:', error)
        return NextResponse.json(
            { success: false, error: 'Error al crear contacto' },
            { status: 500 }
        )
    }
}
