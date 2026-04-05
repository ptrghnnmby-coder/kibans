import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { saveTeamMessage, getTeamMessages } from '@/lib/googleSheets'
import { TeamMessage } from '@/lib/sheets-types'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const chatId = searchParams.get('chatId')

    if (!chatId) {
        return NextResponse.json({ error: 'chatId required' }, { status: 400 })
    }

    try {
        const userEmail = session.user.email;
        const isDemo = (session.user as any)?.isDemo

        if (isDemo) {
            const { MOCK_TEAM_MESSAGES } = await import('@/lib/mockData')
            let messages = MOCK_TEAM_MESSAGES;
            if (chatId !== 'tess@bot') {
                 // For other users, maybe just empty or filter. We'll return empty for non tess so it's clean, or the mock ones that fit.
                 messages = messages.filter(m => m.from === chatId || m.to === chatId)
            }
            return NextResponse.json({ messages })
        }

        const messages = await getTeamMessages(chatId, userEmail)
        return NextResponse.json({ messages })
    } catch (error) {
        console.error('Error in GET /api/chat/team:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { id, to, content, timestamp } = body

        if (!to || !content) {
            return NextResponse.json({ error: 'to and content required' }, { status: 400 })
        }

        const msg: TeamMessage = {
            id: id || `msg-${Date.now()}`,
            from: session.user.email,
            to,
            content,
            timestamp: timestamp || new Date().toISOString()
        }

        const isDemo = (session.user as any)?.isDemo
        if (isDemo) {
            return NextResponse.json({ success: true, message: msg, demo: true })
        }

        await saveTeamMessage(msg)
        return NextResponse.json({ success: true, message: msg })
    } catch (error) {
        console.error('Error in POST /api/chat/team:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
