
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: Request) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build'
    });

    try {
        const { text, targetLanguage = 'English' } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const prompt = `Translate the following text to ${targetLanguage}. If it is already in ${targetLanguage}, return it as is. strictly only return the translated text.\n\nText: "${text}"`;

        const completion = await openai.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'gpt-4o',
        });

        const translatedText = completion.choices[0].message.content?.trim();

        return NextResponse.json({ translatedText });
    } catch (error) {
        console.error('Translation error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
