import { NextResponse } from 'next/server'
import {
    searchMasterInput,
    getAllContactos,
    getAllProductos,
    createContacto,
    createProducto,
    createOperation,
    getPendingFinancials,
    getHistoricalAnalysis,
    getProductRecommendations,
    searchOperationsAdvanced,
    getPredictedCourierCost,
    updateOperation,
    syncOperationCashFlow,
    addClaim,
    addCashFlowTransaction,
    getOperationById
} from '@/lib/googleSheets'
import { USER_MAP, CashFlowTransaction } from '@/lib/sheets-types'
import OpenAI from 'openai'
import twilio from 'twilio'

const getOpenAIClient = () => {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
        console.warn('OPENAI_API_KEY not found')
        return null
    }
    return new OpenAI({ apiKey })
}

// Reuse the tools definition from chat route
const tools = [
    {
        type: "function",
        function: {
            name: "create_contact",
            description: "Crea un nuevo contacto (Importador, Exportador, Productor o NBC) en la base de datos.",
            parameters: {
                type: "object",
                properties: {
                    empresa: { type: "string", description: "Nombre de la empresa o entidad" },
                    nombreContacto: { type: "string", description: "Nombre de pila del contacto" },
                    apellido: { type: "string", description: "Apellido del contacto" },
                    email: { type: "string", description: "Correo electrónico (ej: user@company.com)" },
                    tipo: { type: "string", enum: ["Importador", "Exportador", "Productor", "NBC"], description: "Tipo de entidad" },
                    pais: { type: "string", description: "País de la entidad" },
                    telefono: { type: "string", description: "Número de teléfono" },
                    taxId: { type: "string", description: "Tax ID / CUIT / RUC" },
                    notes: { type: "string", description: "Notas adicionales en inglés" }
                },
                required: ["empresa"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "create_product",
            description: "Registra nuevos productos. SOPORTA VARIANTES: podés enviar listas separadas por comas en calibres, packings u origenes para crear múltiples registros de una. LLAMALA INMEDIATAMENTE si el usuario describe un producto.",
            parameters: {
                type: "object",
                properties: {
                    especie: { type: "string", description: "Especie (ej: Panga, Merluza). REQUERIDO." },
                    nombreCientifico: { type: "string", description: "Nombre científico. DEDÚCELO si es Panga (Pangasius hypophthalmus) o Merluza (Merluccius hubbsi)." },
                    packing: { type: "string", description: "Packing(s) separados por coma." },
                    calibre: { type: "string", description: "Calibre(s) o tallas separados por coma." },
                    origen: { type: "string", description: "País(es) de origen." },
                    descripcion: { type: "string", description: "Detalles técnicos (fat off, trimmed, etc.)." }
                },
                required: ["especie"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "create_operation",
            description: "Registra una nueva operación comercial (Master Input).",
            parameters: {
                type: "object",
                properties: {
                    cliente: { type: "string", description: "Nombre o ID del cliente importador" },
                    exportador: { type: "string", description: "Nombre o ID del exportador" },
                    productor: { type: "string", description: "Nombre o ID del productor" },
                    productos: { type: "string", description: "Descripción de los productos (cantidades, precios)" },
                    puertoDestino: { type: "string", description: "Puerto de destino (POD)" },
                    fechaEmbarque: { type: "string", description: "Fecha estimada de embarque (DD/MM/YYYY)" },
                    incoterm: { type: "string", enum: ["FOB", "CIF", "CFR", "EXW"], description: "Término de comercio internacional" },
                    notas: { type: "string", description: "Notas generales de la operación (ej: Pago 30/70)" }
                },
                required: ["cliente"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_financial_summary",
            description: "Consulta cobros y pagos pendientes.",
            parameters: {
                type: "object",
                properties: {
                    entidad: { type: "string", description: "Filtrar por nombre de cliente o empresa" },
                    responsable: { type: "string", description: "Filtrar por nombre del responsable (Rafa, Fede, etc)" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_operation_info",
            description: "Busca toda la información de una operación específica utilizando su ID o número (ej. 010-26, 010, 10).",
            parameters: {
                type: "object",
                properties: {
                    operationId: { type: "string", description: "ID de la operación a buscar" }
                },
                required: ["operationId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_contact_info",
            description: "Busca y devuelve toda la información de un contacto usando el nombre de la empresa, nombre o apellido del contacto.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Nombre de la empresa, contacto o apellido para buscar" }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_product_info",
            description: "Busca y devuelve los detalles de un producto de la base de datos de productos usando el nombre de especie o ID.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Especie, ID o descripción del producto a buscar" }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_historical_analysis",
            description: "Analiza precios históricos de productos o costos de courier (rutas).",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Nombre del producto (ej: Hake) o Ruta (ej: Mar del Plata a Vigo)" }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_product_recommendations",
            description: "Sugiere a qué clientes ofrecerles un producto basado en el historial.",
            parameters: {
                type: "object",
                properties: {
                    producto: { type: "string", description: "Nombre del producto" }
                },
                required: ["producto"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "search_operations_advanced",
            description: "Busca operaciones con filtros detallados.",
            parameters: {
                type: "object",
                properties: {
                    usuario: { type: "string", description: "Nombre del responsable (ej: Rafa)" },
                    cliente: { type: "string", description: "Nombre del cliente" },
                    exportador: { type: "string", description: "Nombre del exportador" },
                    producto: { type: "string", description: "Nombre del producto" },
                    status: { type: "string", enum: ["1. Operación Creada", "2. Proforma Enviada", "3. Proforma Aprobada", "4. Orden de Compra Emitida", "5. Producción / Preparación", "6. Flete en Gestión", "7. Booking Confirmado", "8. Carga Realizada", "9. En Tránsito", "10. Arribada", "11. En Revisión de Recepción", "12A. Recepción Conforme", "12B. Reclamo Reportado", "13. Liquidación en Proceso", "14. Operación Liquidada", "Cancelada"] }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "update_operation_status",
            description: "Actualiza el estado de una operación en el flujo de trabajo.",
            parameters: {
                type: "object",
                properties: {
                    operationId: { type: "string", description: "ID de la operación (ej: 084-26)" },
                    status: {
                        type: "string",
                        enum: [
                            "1. Operación Creada",
                            "2. Proforma Enviada",
                            "3. Proforma Aprobada",
                            "4. Orden de Compra Emitida",
                            "5. Producción / Preparación",
                            "6. Flete en Gestión",
                            "7. Booking Confirmado",
                            "8. Carga Realizada",
                            "9. En Tránsito",
                            "10. Arribada",
                            "11. En Revisión de Recepción",
                            "12A. Recepción Conforme",
                            "12B. Reclamo Reportado",
                            "13. Liquidación en Proceso",
                            "14. Operación Liquidada",
                            "Cancelada"
                        ],
                        description: "Nuevo estado de la operación"
                    },
                    notes: { type: "string", description: "Notas opcionales sobre el cambio de estado" }
                },
                required: ["operationId", "status"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "update_operation",
            description: "Actualiza cualquier campo de una operación existente.",
            parameters: {
                type: "object",
                properties: {
                    operationId: { type: "string", description: "ID de la operación a actualizar" },
                    cliente: { type: "string", description: "Cliente importador" },
                    exportador: { type: "string", description: "Exportador" },
                    productor: { type: "string", description: "Productor" },
                    productos: { type: "string", description: "Productos (formato: ID:QTY:PRICE)" },
                    puertoDestino: { type: "string", description: "Puerto de destino (POD)" },
                    portLoad: { type: "string", description: "Puerto de carga (POL)" },
                    fechaEmbarque: { type: "string", description: "Fecha de embarque (DD/MM/YYYY)" },
                    incoterm: { type: "string", enum: ["FOB", "CIF", "CFR", "EXW"], description: "Incoterm" },
                    paymentTerms: { type: "string", description: "Condiciones de pago" },
                    booking: { type: "string", description: "Número de booking" },
                    forwarder: { type: "string", description: "Forwarder" },
                    shipLane: { type: "string", description: "Naviera" },
                    brand: { type: "string", description: "Marca" },
                    notas: { type: "string", description: "Notas generales" }
                },
                required: ["operationId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "add_claim",
            description: "Registra un reclamo de calidad, cantidad o documentación para una operación.",
            parameters: {
                type: "object",
                properties: {
                    operationId: { type: "string", description: "ID de la operación" },
                    type: { type: "string", enum: ["Calidad", "Cantidad", "Documentación", "Otro"], description: "Tipo de reclamo" },
                    description: { type: "string", description: "Descripción detallada del problema" },
                    severity: { type: "string", enum: ["Baja", "Media", "Alta", "Crítica"], description: "Severidad del reclamo" },
                    reportedBy: { type: "string", description: "Quién reporta el reclamo" },
                    affectedProducts: { type: "string", description: "Productos afectados (opcional)" },
                    estimatedLoss: { type: "number", description: "Pérdida estimada en USD (opcional)" }
                },
                required: ["operationId", "type", "description", "severity", "reportedBy"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "generate_proforma",
            description: "Genera una proforma comercial (PI) para una operación y la guarda en Google Drive.",
            parameters: {
                type: "object",
                properties: {
                    operationId: { type: "string", description: "ID de la operación para generar la proforma" }
                },
                required: ["operationId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "add_cashflow_transaction",
            description: "Registra un cobro o pago en el cash flow de una operación.",
            parameters: {
                type: "object",
                properties: {
                    operationId: { type: "string", description: "ID de la operación" },
                    type: { type: "string", enum: ["Cobro", "Pago"], description: "Tipo de transacción" },
                    amount: { type: "number", description: "Monto de la transacción" },
                    currency: { type: "string", enum: ["USD", "EUR", "ARS"], description: "Moneda" },
                    concept: { type: "string", description: "Concepto del cobro/pago" },
                    entity: { type: "string", description: "Cliente o Proveedor" },
                    dueDate: { type: "string", description: "Fecha de vencimiento (DD/MM/YYYY) - opcional" },
                    paymentDate: { type: "string", description: "Fecha de pago (DD/MM/YYYY) - opcional" },
                    status: { type: "string", enum: ["Pendiente", "Pagado", "Vencido"], description: "Estado del pago" }
                },
                required: ["operationId", "type", "amount", "currency", "concept", "entity", "status"]
            }
        }
    }
];

export async function POST(req: Request) {
    try {
        const bodyText = await req.text()
        const urlParams = new URLSearchParams(bodyText)
        
        // Extract Twilio parameters
        const fromNumber = urlParams.get('From') || ''
        const incomingMessage = urlParams.get('Body') || ''
        
        // Helper to return TwiML
        const sendWhatsAppResponse = (messageContent: string) => {
            const twiml = new twilio.twiml.MessagingResponse()
            twiml.message(messageContent)
            return new NextResponse(twiml.toString(), {
                headers: { 'Content-Type': 'text/xml' }
            })
        }

        if (!fromNumber || !incomingMessage) {
            return new NextResponse('Bad Request', { status: 400 })
        }

        // 1. Identify User by Phone
        // Extract plain phone number, e.g. "whatsapp:+549..." -> "+549..."
        const normalizedPhone = fromNumber.replace('whatsapp:', '').trim()
        
        let userEmail: string | null = null;
        let userName: string = 'Usuario';
        
        // Note: Make sure to add 'phone' to USER_MAP in sheets-types.ts
        for (const [email, data] of Object.entries(USER_MAP)) {
            // @ts-ignore - Assuming we'll add 'phone' property later
            if (data.phone === normalizedPhone) {
                userEmail = email;
                userName = data.name;
                break;
            }
        }

        if (!userEmail) {
            console.log(`Unauthorized WhatsApp attempt from: ${normalizedPhone}`)
            return sendWhatsAppResponse("Lo siento, tu número no está autorizado en Tess SMT. Por favor verificá tu registro.")
        }

        const openai = getOpenAIClient()
        if (!openai) {
            return sendWhatsAppResponse("Hubo un problema temporal con mi motor cerebral (OpenAI key). Avísale a soporte.")
        }

        // 2. RAG: Obtener contexto
        const [operations, allContactos, allProductos] = await Promise.all([
            searchMasterInput(incomingMessage),
            getAllContactos(),
            getAllProductos()
        ])

        const relevantContacts = allContactos
        const msgLower = incomingMessage.toLowerCase()
        const msgTokens = msgLower.split(/[\s,.]+/).filter((t: string) => t.length > 3)

        const relevantProducts = allProductos.filter(p => {
            const specie = p.especie?.toLowerCase() || ''
            const desc = p.descripcion?.toLowerCase() || ''
            const id = p.id?.toLowerCase() || ''
            if (id.length > 2 && msgLower.includes(id)) return true
            if (specie.length > 2 && msgLower.includes(specie)) return true
            return msgTokens.some((token: string) => specie.includes(token) || desc.includes(token) || id.includes(token))
        }).slice(0, 15)

        const contextString = `
[DATOS EXISTENTES]
Operaciones:
${operations.map(o => `- Op ${o.id}: ${o.cliente} (${o.estado})`).join('\n')}

CATÁLOGO DE CONTACTOS (TODOS - ${allContactos.length} registros):
${relevantContacts.map(c => `- [${c.tipo || '?'}] ${c.empresa} | ${c.nombreContacto || ''} | ${c.email || ''} | ${c.pais || ''}`).join('\n')}

Productos relevantes:
${relevantProducts.map(p => `- [${p.id}] ${p.especie}: ${p.packing} ${p.calibre} (${p.origen})`).join('\n')}
`
        // Para WhatsApp el contexto de ubicación es claro
        const locationContext = "El usuario está interactuando a través de **WhatsApp** (móvil). Da respuestas super concisas para leer en el formato chat de celular y prioriza la agilidad."

        const messages: any[] = [
            {
                role: "system",
                content: `Sos Tess, la secretaria de lujo de South Marine Trading (SMT). Sos una experta senior en operaciones de comercio exterior. Respondes con personalidad vibrante, graciosa y eficiente.
        
--- UBICACIÓN Y FORMATO ---
${locationContext} Usa listas cortas y emojis.

--- REGLAS ---
🚨 NUNCA INVENTES DATOS DE SMT
✅ INTELIGENCIA: deduce el nombre científico (Pangasius/Merluccius).
📊 USÁ LOS DATOS REALES: Si preguntan por info, usá tools como get_operation_info.

--- DATOS DE REFERENCIA ---
${contextString}

Usuario Actual: ${userName}
`
            },
            { role: "user", content: incomingMessage }
        ];

        // 3. Primera llamada OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-2024-08-06",
            messages: messages,
            tools: tools as any,
            tool_choice: "auto",
            temperature: 0.2,
        })

        const responseMessage = completion.choices[0].message
        let finalResponse = responseMessage.content

        // 4. Ejecutar validaciones y Tools
        if (responseMessage.tool_calls) {
            messages.push(responseMessage)

            for (const toolCall of responseMessage.tool_calls) {
                const functionName = (toolCall as any).function.name
                const functionArgs = JSON.parse((toolCall as any).function.arguments)
                let functionResult = ""

                try {
                    // Mapeo simple de tools
                    if (functionName === "create_contact") {
                        const result = await createContacto({
                            ...functionArgs,
                            isImporter: functionArgs.tipo === 'Importador',
                            isExporter: functionArgs.tipo === 'Exportador',
                            isProducer: functionArgs.tipo === 'Productor'
                        })
                        functionResult = `Contacto creado exitosamente: ID ${result.id} - ${result.empresa}`
                    } else if (functionName === "create_product") {
                        const result = await createProducto(functionArgs)
                        functionResult = `Producto creado exitosamente: ID ${result.id} - ${result.especie}`
                    } else if (functionName === "create_operation") {
                        const result = await createOperation({ ...functionArgs, userId: userEmail })
                        functionResult = `Operación creada exitosamente: ID ${result.id} - ${result.nombreCarpeta}`
                    } else if (functionName === "get_operation_info") {
                        const { operationId } = functionArgs;
                        let opInfo: any = await getOperationById(operationId);
                        if (!opInfo) {
                            const ops = await searchMasterInput(operationId);
                            if (ops && ops.length > 0) opInfo = ops[0];
                        }
                        functionResult = opInfo ? JSON.stringify(opInfo) : `No se encontró información para la operación ${operationId}.`;
                    } else if (functionName === "get_contact_info") {
                        const { query } = functionArgs;
                        const queryLower = query.toLowerCase();
                        const matches = allContactos.filter((c: any) => 
                            (c.empresa && c.empresa.toLowerCase().includes(queryLower)) ||
                            (c.nombreContacto && c.nombreContacto.toLowerCase().includes(queryLower)) ||
                            (c.apellido && c.apellido.toLowerCase().includes(queryLower))
                        );
                        functionResult = matches.length > 0 ? JSON.stringify(matches) : `No se encontraron contactos para la búsqueda "${query}".`;
                    } else if (functionName === "get_product_info") {
                        const { query } = functionArgs;
                        const queryLower = query.toLowerCase();
                        const matches = allProductos.filter((p: any) => 
                            (p.id && p.id.toLowerCase().includes(queryLower)) ||
                            (p.especie && p.especie.toLowerCase().includes(queryLower)) ||
                            (p.descripcion && p.descripcion.toLowerCase().includes(queryLower))
                        );
                        functionResult = matches.length > 0 ? JSON.stringify(matches) : `No se encontraron productos para la búsqueda "${query}".`;
                    } else if (functionName === "get_financial_summary") {
                        const result = await getPendingFinancials(functionArgs.entidad, functionArgs.responsable)
                        functionResult = JSON.stringify(result)
                    } else if (functionName === "get_historical_analysis") {
                        const parts = functionArgs.query.toLowerCase().split(' a ')
                        let courierResult = ""
                        if (parts.length === 2) {
                            const cost = await getPredictedCourierCost(parts[0].trim(), parts[1].trim())
                            courierResult = `Costo Courier (${functionArgs.query}): USD ${cost}. `
                        }
                        const history = await getHistoricalAnalysis(functionArgs.query)
                        functionResult = courierResult + `Historial: ${JSON.stringify(history)}`
                    } else if (functionName === "get_product_recommendations") {
                        const result = await getProductRecommendations(functionArgs.producto)
                        functionResult = JSON.stringify(result)
                    } else if (functionName === "search_operations_advanced") {
                        const result = await searchOperationsAdvanced({
                            user: functionArgs.usuario,
                            client: functionArgs.cliente,
                            exporter: functionArgs.exportador,
                            product: functionArgs.producto,
                            status: functionArgs.status
                        })
                        functionResult = JSON.stringify(result)
                    } else if (functionName === "update_operation_status") {
                        const { operationId, status, notes } = functionArgs
                        const updateData: any = { estado: status }
                        if (notes) updateData.notas = notes
                        await updateOperation(operationId, updateData)
                        await syncOperationCashFlow(operationId)
                        functionResult = `Estado actualizado: Op ${operationId} → "${status}"`
                    } else if (functionName === "update_operation") {
                        const { operationId, ...updates } = functionArgs
                        const cleanUpdates: any = {}
                        Object.keys(updates).forEach(key => {
                            if (updates[key] !== undefined && updates[key] !== null) {
                                cleanUpdates[key] = updates[key]
                            }
                        })
                        await updateOperation(operationId, cleanUpdates)
                        await syncOperationCashFlow(operationId)
                        const updatedFields = Object.keys(cleanUpdates).join(', ')
                        functionResult = `Op ${operationId} actualizada: ${updatedFields}`
                    } else if (functionName === "add_claim") {
                        const op = await getOperationById(functionArgs.operationId)
                        const claimData = {
                            operationId: functionArgs.operationId,
                            cliente: op?.cliente || 'Desconocido',
                            producto: functionArgs.affectedProducts || op?.productos || 'No especificado',
                            tipo: functionArgs.type,
                            fechaReporte: new Date().toISOString().split('T')[0],
                            responsable: functionArgs.reportedBy || 'Usuario',
                            descripcion: `[${functionArgs.severity}] ${functionArgs.description}`,
                            evidencia: '',
                            impactoEstimado: functionArgs.estimatedLoss || 0,
                            resolucionPropuesta: '',
                            impactoFinal: 0,
                            estado: 'Abierto'
                        }
                        const claim = await addClaim(claimData)
                        functionResult = `Reclamo exitoso: ${claim.tipo} - ${claim.descripcion}.`
                    } else if (functionName === "generate_proforma") {
                        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/proformas/generate`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ operationId: functionArgs.operationId })
                        })
                        const result = await response.json()
                        if (result.success) {
                            functionResult = `Proforma exitosa: ${result.docUrl}.`
                        } else {
                            functionResult = `Error al generar proforma: ${result.error}`
                        }
                    } else if (functionName === "add_cashflow_transaction") {
                        const txType: 'INGRESO' | 'EGRESO' = functionArgs.type === 'Cobro' ? 'INGRESO' : 'EGRESO';
                        const txStatus: 'PENDIENTE' | 'PAGADO' = functionArgs.status?.toUpperCase() === 'PAGADO' ? 'PAGADO' : 'PENDIENTE';
                        const txData: Omit<CashFlowTransaction, 'id' | 'timestamp'> = {
                            operationId: functionArgs.operationId,
                            date: functionArgs.paymentDate || new Date().toISOString().split('T')[0],
                            type: txType,
                            category: functionArgs.type,
                            description: `${functionArgs.concept} - ${functionArgs.entity} (${functionArgs.currency})`,
                            amount: functionArgs.amount,
                            status: txStatus,
                            dueDate: functionArgs.dueDate || undefined
                        }
                        const transaction = await addCashFlowTransaction(txData)
                        functionResult = `Registrado: ${functionArgs.currency} ${functionArgs.amount}`
                    }
                } catch (error: any) {
                    functionResult = `Error en ${functionName}: ${error.message}`
                }

                messages.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: functionName,
                    content: functionResult,
                })
            }

            // Segunda llamada para generar respuesta conversacional final
            const secondResponse = await openai.chat.completions.create({
                model: "gpt-4o-2024-08-06",
                messages: messages,
                temperature: 0.2, // Respuestas precisas
            })

            finalResponse = secondResponse.choices[0].message.content
        }

        return sendWhatsAppResponse(finalResponse || "No pude generar una respuesta. Por favor intenta de nuevo.")

    } catch (error: any) {
        console.error('Error in WhatsApp webhook:', error)
        const twiml = new twilio.twiml.MessagingResponse()
        twiml.message("Hubo un error del sistema. Por favor intenta más tarde.")
        return new NextResponse(twiml.toString(), {
            status: 500,
            headers: { 'Content-Type': 'text/xml' }
        })
    }
}
