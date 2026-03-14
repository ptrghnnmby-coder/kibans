import { NextResponse } from 'next/server'
import { updateClaim } from '@/lib/googleSheets'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    const id = params.id
    try {
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo
        
        const body = await request.json()
        
        if (isDemo) {
            return NextResponse.json({ success: true, updated: true, demo: true })
        }

        await updateClaim(id, body)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error(`Error in PATCH /api/reclamos/${id}:`, error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
