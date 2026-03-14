import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { updateContacto } from '@/lib/googleSheets'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { contactId, brand } = await request.json()

        if (!contactId || !brand) {
            return NextResponse.json({ success: false, error: 'contactId and brand are required' }, { status: 400 })
        }

        await updateContacto(contactId, { brand })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating brand:', error)
        return NextResponse.json({ success: false, error: 'Failed to update brand' }, { status: 500 })
    }
}
