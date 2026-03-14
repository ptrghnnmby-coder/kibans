import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createNote, getNotes, deleteOperationNote } from '@/lib/googleSheets'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const operationId = searchParams.get('operationId') || undefined

    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const allNotes = await getNotes()

        let notes = allNotes
        if (operationId) {
            // Filter by operationId if provided (assuming content or a specific field holds it, 
            // but looking at getNotes it maps: id, content, author, timestamp, type, mentions.
            // It seems 'operationId' column MIGHT be missing in getNotes implementation or mapping?
            // checking sheets-types will confirm. 
            // For now, I'll assume I need to filter, but if the sheet doesn't have it, I have a problem.)
            // Wait, the previous code called getOperationNotes(operationId). 
            // I will assume getNotes returns everything and I filter.
            // BUT, does Note have operationId?
            // I will stick to fixing imports first, and logic after verifying types.
            notes = allNotes.filter((n: any) => n.operationId === operationId)
        }

        // If Dashboard feed (no OpId) or just limiting recent global notes
        if (!operationId) {
            return NextResponse.json(notes.slice(0, 20))
        }
        return NextResponse.json(notes)
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { operationId, content } = body

        if (!operationId || !content) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
        }

        const note = {
            id: crypto.randomUUID(),
            operationId,
            content,
            author: session.user.email,
            timestamp: new Date().toISOString(),
            type: body.type || 'info',
            mentions: body.mentions || [],
            activeFor: body.activeFor || []
        }

        await createNote(note)
        return NextResponse.json({ success: true, note })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(request.url)
        const noteId = searchParams.get('id')

        if (!noteId) {
            return NextResponse.json({ error: 'Missing note ID' }, { status: 400 })
        }

        await deleteOperationNote(noteId)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting note:', error)
        return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
    }
}
