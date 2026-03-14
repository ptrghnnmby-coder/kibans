import { NextResponse } from 'next/server'
import { getNotes, createNote, deleteOperationNote, updateNoteContent, dismissNoteForUser } from '@/lib/googleSheets'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const notes = await getNotes()
        return NextResponse.json({ success: true, data: notes })
    } catch (error) {
        console.error('Error in GET /api/dashboard/notes:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch notes' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        if (!body.content || !body.author) {
            return NextResponse.json({ success: false, error: 'Missing content or author' }, { status: 400 })
        }
        const note = await createNote({
            content: body.content,
            author: body.author,
            type: body.type,
            mentions: body.mentions,
            activeFor: body.activeFor,
            operationId: body.operationId,
            productId: body.productId,
            contactId: body.contactId
        })
        return NextResponse.json({ success: true, data: note })
    } catch (error) {
        console.error('Error in POST /api/dashboard/notes:', error)
        return NextResponse.json({ success: false, error: 'Failed to save note' }, { status: 500 })
    }
}

/** PATCH — owner edits note content */
export async function PATCH(req: Request) {
    try {
        const { id, content } = await req.json()
        if (!id || !content?.trim()) {
            return NextResponse.json({ success: false, error: 'Missing id or content' }, { status: 400 })
        }
        await updateNoteContent(id, content.trim())
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error in PATCH /api/dashboard/notes:', error)
        return NextResponse.json({ success: false, error: 'Failed to update note' }, { status: 500 })
    }
}

/**
 * DELETE — dismiss note per user (borra la X de la columna del usuario).
 * Si ningún usuario queda activo, dismissNoteForUser borra la fila automáticamente.
 *
 * Query params:
 *   ?id=<noteId>&email=<userEmail>
 *
 * Sin email → hard delete de la fila para todos (acción de owner).
 */
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const userEmail = searchParams.get('email')

        if (!id) {
            return NextResponse.json({ success: false, error: 'Missing note ID' }, { status: 400 })
        }

        if (userEmail) {
            // Per-user dismiss: remove X from this user's column only
            await dismissNoteForUser(id, userEmail)
        } else {
            // Fallback: hard delete for everyone (owner-level)
            await deleteOperationNote(id)
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error in DELETE /api/dashboard/notes:', error)
        return NextResponse.json({ success: false, error: 'Failed to dismiss note' }, { status: 500 })
    }
}
