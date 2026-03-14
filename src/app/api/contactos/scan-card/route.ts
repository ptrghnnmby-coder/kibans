import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const imageFile = formData.get('image') as File | null

        if (!imageFile) {
            return NextResponse.json(
                { success: false, error: 'No se recibió ninguna imagen' },
                { status: 400 }
            )
        }

        // Convertir la imagen a base64
        const bytes = await imageFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64Image = buffer.toString('base64')
        const mimeType = imageFile.type || 'image/jpeg'

        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
            return NextResponse.json(
                { success: false, error: 'OpenAI API key no configurada' },
                { status: 500 }
            )
        }

        // Llamar a GPT-4o Vision
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                max_tokens: 1000,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `Analizá esta tarjeta de visita y extraé los datos de contacto. 
Devolvé SOLO un JSON válido con exactamente estos campos (dejá en vacío "" si no se encuentra el dato):
{
  "empresa": "nombre de la empresa o compañía",
  "brand": "marca comercial si es diferente al nombre de la empresa, si no dejar vacío",
  "nombreContacto": "primer nombre de la persona",
  "apellido": "apellido de la persona",
  "email": "correo electrónico",
  "telefono": "número de teléfono completo con código de país si aparece",
  "direccion": "dirección completa de la empresa",
  "pais": "nombre del país en inglés (ej: United States, Argentina, China)",
  "website": "sitio web si aparece",
  "notes": "cualquier información adicional relevante que aparezca en la tarjeta (cargo, título, redes sociales, etc.)"
}
IMPORTANTE: Responde SOLAMENTE con el JSON, sin texto adicional, sin markdown, sin explicaciones.`
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${mimeType};base64,${base64Image}`,
                                    detail: 'high'
                                }
                            }
                        ]
                    }
                ]
            })
        })

        if (!openaiResponse.ok) {
            const errorData = await openaiResponse.json()
            console.error('OpenAI API error:', errorData)
            return NextResponse.json(
                { success: false, error: 'Error al analizar la imagen con OpenAI' },
                { status: 500 }
            )
        }

        const openaiData = await openaiResponse.json()
        const rawContent = openaiData.choices?.[0]?.message?.content || ''

        // Parsear el JSON devuelto por OpenAI
        let extractedData: Record<string, string> = {}
        try {
            // Limpiar por si vienen backticks o ```json
            const cleaned = rawContent
                .replace(/^```json\s*/i, '')
                .replace(/^```\s*/i, '')
                .replace(/\s*```$/i, '')
                .trim()
            extractedData = JSON.parse(cleaned)
        } catch {
            console.error('Error parsing OpenAI response:', rawContent)
            return NextResponse.json(
                { success: false, error: 'No se pudo interpretar la respuesta de OpenAI. Intentá con otra imagen más clara.' },
                { status: 422 }
            )
        }

        return NextResponse.json({
            success: true,
            data: extractedData,
        })

    } catch (error) {
        console.error('Error en scan-card:', error)
        return NextResponse.json(
            { success: false, error: 'Error interno al procesar la tarjeta' },
            { status: 500 }
        )
    }
}
