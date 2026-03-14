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
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import OpenAI from 'openai'

// Initialize OpenAI lazily or with a dummy key during build if needed
const getOpenAIClient = () => {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
        console.warn('OPENAI_API_KEY not found')
        return null
    }
    return new OpenAI({ apiKey })
}

// Helper para detectar ubicación del usuario
function getLocationContext(pathname: string): string {
    // Normalizar pathname
    const path = pathname || '/'

    // Dashboard
    if (path === '/') {
        return "El usuario está en el **Dashboard** (página principal). Puede ver resumen de operaciones, notas, cash flow y crear nueva operación."
    }

    // Operaciones
    if (path === '/operaciones') {
        return "El usuario está en la **lista de Operaciones**. Puede buscar, filtrar y crear nuevas operaciones."
    }
    if (path === '/operaciones/nueva') {
        return "El usuario está en el formulario de **Nueva Operación**. Puede completar datos y guardar."
    }
    if (path.startsWith('/operaciones/') && path.includes('?tab=finanzas')) {
        const opId = path.split('/')[2]?.split('?')[0]
        return `El usuario está viendo la pestaña **Finanzas** de la operación **${opId}**. Puede agregar cobros/pagos y ver balance.`
    }
    if (path.startsWith('/operaciones/') && path.includes('?tab=embarque')) {
        const opId = path.split('/')[2]?.split('?')[0]
        return `El usuario está viendo la pestaña **Embarque** de la operación **${opId}**. Puede ver tracking del contenedor.`
    }
    if (path.startsWith('/operaciones/') && path.includes('?tab=documentos')) {
        const opId = path.split('/')[2]?.split('?')[0]
        return `El usuario está viendo la pestaña **Documentos** de la operación **${opId}**. Puede generar/descargar documentos.`
    }
    if (path.startsWith('/operaciones/') && path.includes('?tab=reclamos')) {
        const opId = path.split('/')[2]?.split('?')[0]
        return `El usuario está viendo la pestaña **Reclamos** de la operación **${opId}**. Puede gestionar claims.`
    }
    if (path.startsWith('/operaciones/')) {
        const opId = path.split('/')[2]?.split('?')[0]
        return `El usuario está viendo el **Detalle** de la operación **${opId}**. Puede editar contactos, logística, productos y agregar comentarios.`
    }

    // Contactos
    if (path === '/contactos') {
        return "El usuario está en la **lista de Contactos**. Puede buscar, filtrar por tipo y crear nuevos contactos."
    }
    if (path === '/contactos/nuevo') {
        return "El usuario está en el formulario de **Nuevo Contacto**. Puede completar datos y guardar."
    }
    if (path.startsWith('/contactos/')) {
        const contactId = path.split('/')[2]
        return `El usuario está viendo el **Detalle del Contacto** ${contactId}. Puede editar datos y ver operaciones relacionadas.`
    }

    // Productos
    if (path === '/productos') {
        return "El usuario está en el **catálogo de Productos**. Puede ver especificaciones y editar productos."
    }

    // Finanzas
    if (path === '/finanzas') {
        return "El usuario está en la vista de **Finanzas** global. Puede ver cash flow consolidado y balance general."
    }

    // Proformas
    if (path === '/proformas') {
        return "El usuario está en **Proformas**. Puede generar y descargar proformas comerciales."
    }

    // Embarques
    if (path === '/embarques') {
        return "El usuario está en **Embarques**. Puede ver tracking de contenedores activos."
    }

    // Chat Equipo
    if (path === '/chat/equipo') {
        return "El usuario está en el **Chat del Equipo**. Puede chatear con otros miembros."
    }

    // Configuración
    if (path === '/configuracion') {
        return "El usuario está en **Configuración**. Puede cambiar su perfil, avatar y preferencias."
    }

    // Default
    return "El usuario está navegando en Tess."
}


// --- HERRAMIENTAS (Function Definitions) ---
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
    // 🔒 SECURITY CHECK: Validate Session
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 })
    }

    const openai = getOpenAIClient()
    if (!openai) {
        return NextResponse.json({ error: 'OpenAI API Key not configured' }, { status: 500 })
    }

    try {
        const { message, history, context } = await req.json()
        const userEmail = session.user.email // Trust session email, not payload

        if (!message) {
            return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
        }

        const user = USER_MAP[userEmail] || { name: 'Usuario', role: 'Usuario' }
        const nickname = user.name || 'Usuario'

        const isDemo = (session.user as any)?.isDemo

        let operations: any[] = []
        let allContactos: any[] = []
        let allProductos: any[] = []

        if (isDemo) {
            const { MOCK_OPERACIONES, MOCK_CONTACTOS, MOCK_PRODUCTOS } = await import('@/lib/mockData')
            allContactos = MOCK_CONTACTOS as any[]
            allProductos = MOCK_PRODUCTOS as any[]
            operations = MOCK_OPERACIONES.filter(o => 
                o.id?.toLowerCase().includes(message.toLowerCase()) || 
                o.cliente?.toLowerCase().includes(message.toLowerCase()) ||
                o.productos?.toLowerCase().includes(message.toLowerCase())
            ) as any[]
        } else {
            [operations, allContactos, allProductos] = await Promise.all([
                searchMasterInput(message),
                getAllContactos(),
                getAllProductos()
            ])
        }

        // Siempre pasar TODOS los contactos: el catálogo es pequeño y es crítico que Marta
        // reconozca cualquier empresa sin importar cómo el usuario la mencione.
        const relevantContacts = allContactos

        // Filtrar productos por relevancia al mensaje
        const msgLower = message.toLowerCase()
        const msgTokens = msgLower.split(/[\s,.]+/).filter((t: string) => t.length > 3)

        console.log('RAG Query:', message)
        console.log('RAG Tokens:', msgTokens)
        console.log('Total Contactos:', allContactos.length)
        console.log('Total Productos:', allProductos.length)

        const relevantProducts = allProductos.filter(p => {
            const specie = p.especie?.toLowerCase() || ''
            const desc = p.descripcion?.toLowerCase() || ''
            const id = p.id?.toLowerCase() || ''

            if (id.length > 2 && msgLower.includes(id)) return true
            if (specie.length > 2 && msgLower.includes(specie)) return true
            return msgTokens.some((token: string) => specie.includes(token) || desc.includes(token) || id.includes(token))
        }).slice(0, 15)

        console.log(`RAG Result: ${relevantContacts.length} contacts, ${relevantProducts.length} products`)

        const contextString = `
[DATOS EXISTENTES]
Operaciones:
${operations.map(o => `- Op ${o.id}: ${o.cliente} (${o.estado})`).join('\n')}

CATÁLOGO DE CONTACTOS (TODOS - ${allContactos.length} registros):
${relevantContacts.map(c => `- [${c.tipo || '?'}] ${c.empresa} | ${c.nombreContacto || ''} | ${c.email || ''} | ${c.pais || ''}`).join('\n')}

Productos relevantes:
${relevantProducts.map(p => `- [${p.id}] ${p.especie}: ${p.packing} ${p.calibre} (${p.origen})`).join('\n')}
`

        // Detectar ubicación del usuario basado en el contexto (pathname)
        const userLocation = context || '/'
        const locationContext = getLocationContext(userLocation)

        const messages: any[] = [
            {
                role: "system",
                content: `Sos Marta, la secretaria de lujo de South Marine Trading (SMT). Sos una experta senior en operaciones de comercio exterior, pero con una personalidad vibrante: sos graciosa, amigable ("compinche"), extremadamente eficiente y ágil.
Tus respuestas son claras y entregan información detallada, pero sin vueltas innecesarias. Te encanta que las cosas salgan bien y te duele ver una operación trabada.

--- TU ESTILO ---
- Usá un lenguaje profesional pero cercano.
- Si ves algo pendiente (pagos/cobros), mencionalo con elegancia pero firmeza.
- Te gusta usar emojis para dar calidez (🚢, 💸, ✅, 📦).
- Cuando el usuario te pida cargar algo, guialo paso a paso para que no falte nada.
- Si alguien te pregunta por un precio, usá el historial para dar una respuesta certera.

--- CONOCIMIENTO DE NAVEGACIÓN ---
Sabés perfectamente cómo funciona la aplicación Tess y dónde encontrar cada cosa:

**UBICACIÓN ACTUAL DEL USUARIO:**
${locationContext}

**ESTRUCTURA DE LA APP:**
- **Dashboard (/)**: Página principal con resumen, notas, cash flow y botón "Nueva Operación"
- **Operaciones (/operaciones)**: Lista de todas las cargas. Click en "Nueva Operación" para crear. Click en fila para ver detalle.
- **Detalle de Operación (/operaciones/[id])**: Tiene 5 pestañas:
  • Detalle: Ver/editar contactos, logística, productos (botón "Editar" en sección Contactos)
  • Finanzas: Agregar cobros/pagos, ver balance
  • Embarque: Tracking de contenedor
  • Documentos: Generar/descargar BL, Invoice, Packing List
  • Reclamos: Gestionar claims
- **Contactos (/contactos)**: Lista de importadores/exportadores/productores. Click en "Nuevo Contacto" para crear.
- **Productos (/productos)**: Catálogo de especificaciones. Click en fila para editar.
- **Finanzas (/finanzas)**: Cash flow consolidado y balance general.
- **Proformas (/proformas)**: Generar y descargar proformas.
- **Configuración (/configuracion)**: Cambiar perfil y avatar (ícono Settings abajo en sidebar).

**CÓMO GUIAR AL USUARIO:**
Cuando te pregunten "¿Dónde hago X?", respondé con:
1. Reconocé dónde está ahora
2. Instrucciones paso a paso claras (usa **negritas** para botones/secciones)
3. Ofrecé hacerlo vos si podés usar tus tools

Ejemplo: "Estás en el Dashboard 🏠. Para cargar un contacto: 1) Click en **Contactos** (menú izquierdo), 2) Click en **Nuevo Contacto**. ¿O preferís que lo cargue yo? Pasame empresa, nombre, email y tipo."

--- CONOCIMIENTO OPERATIVO COMPLETO ---

**FLUJO DE ESTADOS DE OPERACIONES:**
Conocés perfectamente el ciclo de vida de una operación:
1. Operación Creada → Inicial
2. Proforma Enviada → Después de generar PI
3. Proforma Aprobada → Cliente confirma
4. Orden de Compra Emitida → PO generada
5. Producción / Preparación → Exportador prepara carga
6. Flete en Gestión → Coordinando transporte
7. Booking Confirmado → Contenedor reservado
8. Carga Realizada → Producto embarcado
9. En Tránsito → Navegando
10. Arribada → Llegó a destino
11. En Revisión de Recepción → Cliente inspecciona
12A. Recepción Conforme → Todo OK ✅
12B. Reclamo Reportado → Hay problemas 🚨
13. Liquidación en Proceso → Cerrando cuentas
14. Operación Liquidada → Finalizada 💎
Cancelada → Operación cancelada

**GESTIÓN DE RECLAMOS:**
Cuando detectes problemas de calidad, cantidad o documentación:
- Registrá el reclamo inmediatamente con add_claim
- Clasificá la severidad (Baja/Media/Alta/Crítica)
- El sistema actualiza automáticamente el estado a "12B. Reclamo Reportado"
- Incluí productos afectados y pérdida estimada si los conocés

**GENERACIÓN DE DOCUMENTOS:**
Podés generar automáticamente:
- Proformas (PI) → Usa generate_proforma, se guarda en Drive y actualiza estado a "2. Proforma Enviada"
- El documento se comparte automáticamente con el responsable

**GESTIÓN FINANCIERA:**
Para cada operación podés:
- Registrar cobros y pagos con add_cashflow_transaction
- Ver balance en tiempo real con get_financial_summary
- Alertar sobre vencimientos
- El sistema sincroniza automáticamente el cash flow cuando actualizás operaciones

**ACTUALIZACIONES INTELIGENTES:**
Cuando actualices una operación:
- Usá update_operation_status para cambiar solo el estado
- Usá update_operation para cambiar cualquier otro campo
- El sistema sincroniza automáticamente el cash flow
- Validá que los datos sean coherentes antes de actualizar

--- TUS SUPERPODERES (TOOLS) ---
Usalas para ser la mejor asistente del mundo:

**CONSULTAS:**
- get_operation_info → Buscar información detallada de una operación específica (ej. 010-26, 10).
- get_contact_info → Buscar detalles de un contacto (empresa, nombre).
- get_product_info → Buscar especificaciones de un producto por especie o ID.
- get_financial_summary → Ver cobros/pagos pendientes
- get_historical_analysis → Analizar precios históricos o costos de courier
- get_product_recommendations → Sugerir clientes para productos
- search_operations_advanced → Buscar operaciones con filtros

**CREAR:**
- create_contact → Crear contactos (Importador/Exportador/Productor/NBC)
- create_product → Crear productos en especificaciones
- create_operation → Registrar nueva operación

**ACTUALIZAR:**
- update_operation_status → Cambiar estado de operación (14 estados disponibles)
- update_operation → Modificar cualquier campo de operación

**GESTIÓN:**
- add_claim → Registrar reclamos de calidad/cantidad/documentación
- generate_proforma → Generar proforma comercial en Drive
- add_cashflow_transaction → Registrar cobros y pagos

--- DATOS DE REFERENCIA ---
${contextString}

--- REGLAS CRÍTICAS (NO NEGOCIABLES) ---
🚨 **NUNCA INVENTES DATOS DE SMT**
- No inventes stocks ni precios que no estén en [DATOS EXISTENTES].

✅ **INTELIGENCIA Y ACCIÓN (LEGADO N8N)**
- **Biólogo Automático**: Si el producto es Pangasius, el nombre científico es *Pangasius hypophthalmus*. Si es Merluza, es *Merluccius hubbsi*. No lo preguntes, ponelo vos.
- **Agrupación de Variantes**: Si el usuario pide varios calibres o packings, cargalos de una enviando listas separadas por comas a la tool.
- **Deducción por Similitud**: Si dicen "como los otros", mirá los productos de la misma especie en [DATOS EXISTENTES] y copiá los campos que falten.
- **Acción sobre Perfección**: Si tenés la especie y una descripción técnica, llamá a \`create_product\`. Usá "Verificar" o "TBD" para lo que falte.

🎯 **SOS UNA ASISTENTE OPERATIVA, NO UNA ENCICLOPEDIA**
- Tu conocimiento se limita a SMT.
- Si te preguntan algo fuera de tu scope, redirigí: "Soy tu asistente operativa de SMT. ¿Necesitás ayuda con operaciones, contactos, productos o finanzas?"

📊 **USÁ LOS DATOS REALES (TOOLS DE BÚSQUEDA)**
- 🚨 **CRÍTICO:** Cuando el usuario pregunte "información de la operación X", "datos de la empresa Y", o "características del producto Z", **NUNCA le expliques cómo buscarlo en el sistema**. En su lugar, **USÁ INMEDIATAMENTE LAS TOOLS 'get_operation_info', 'get_contact_info' o 'get_product_info'**, recuperá la información y mostrala formateada como una **Tarjeta Profesional** (con emojis, negritas y lista de detalles clara).
- Cuando te pregunten por un producto, buscalo con la tool y mostrá:
  • Especificaciones (especie, packing, calibre, origen)
  • Operaciones donde se vendió (si hay info)
  • Proveedores/Clientes
- Cuando te pregunten por un contacto, buscalo con la tool y mostrá:
  • Datos completos del contacto (Empresa, Nombre, Email, Teléfono, País)
  • Operaciones relacionadas (si hay info)

--- REGLAS ADICIONALES ---
Usuario: ${nickname}
Si faltan datos obligatorios para crear algo, PREGUNTALE al usuario antes de inventar.
Mostrá la información de productos y clientes en formato de "Tarjeta" usando Markdown prolijo (ej: ### [Empresa] | [País]).

**RECORDATORIO FINAL:** Tu valor está en ser PRECISA con los datos de SMT, no en ser creativa. Temperature está en 0.2 para que seas certera, no inventiva.`
            },
            ...(history || []),
            { role: "user", content: message }
        ];

        // 2. Primera llamada a OpenAI para determinar intención y argumentos


        const completion = await openai.chat.completions.create({
            model: "gpt-4o-2024-08-06",
            messages: messages,
            tools: tools as any,
            tool_choice: "auto",
            temperature: 0.2,
        })

        const responseMessage = completion.choices[0].message
        let finalResponse = responseMessage.content

        // 3. Ejecutar herramientas si fueron solicitadas
        if (responseMessage.tool_calls) {
            // Añadir el mensaje del asistente con la llamada a la herramienta al historial
            messages.push(responseMessage)

            for (const toolCall of responseMessage.tool_calls) {
                const functionName = (toolCall as any).function.name
                const functionArgs = JSON.parse((toolCall as any).function.arguments)

                let functionResult = ""

                try {
                    const isDemo = (session.user as any)?.isDemo

                    if (functionName === "create_contact") {
                        if (isDemo) {
                            functionResult = `Contacto creado exitosamente: ID DEMO-123 - ${functionArgs.empresa}`
                        } else {
                            const result = await createContacto({
                                ...functionArgs,
                                isImporter: functionArgs.tipo === 'Importador',
                                isExporter: functionArgs.tipo === 'Exportador',
                                isProducer: functionArgs.tipo === 'Productor'
                            })
                            functionResult = `Contacto creado exitosamente: ID ${result.id} - ${result.empresa}`
                        }
                    } else if (functionName === "create_product") {
                        if (isDemo) {
                            functionResult = `Producto creado exitosamente: ID DEMO-PROD - ${functionArgs.especie}`
                        } else {
                            const result = await createProducto(functionArgs)
                            functionResult = `Producto creado exitosamente: ID ${result.id} - ${result.especie}`
                        }
                    } else if (functionName === "create_operation") {
                        if (isDemo) {
                            functionResult = `Operación creada exitosamente: ID DEMO-OP - ${functionArgs.cliente}`
                        } else {
                            const result = await createOperation({
                                ...functionArgs,
                                userId: userEmail
                            })
                            functionResult = `Operación creada exitosamente: ID ${result.id} - ${result.nombreCarpeta}`
                        }
                    } else if (functionName === "get_operation_info") {
                        const { operationId } = functionArgs;
                        let opInfo: any;

                        if (isDemo) {
                            const { MOCK_OPERACIONES } = await import('@/lib/mockData')
                            opInfo = MOCK_OPERACIONES.find(o => o.id === operationId || o.idCarga === operationId);
                        } else {
                            opInfo = await getOperationById(operationId);
                            if (!opInfo) {
                                const ops = await searchMasterInput(operationId);
                                if (ops && ops.length > 0) {
                                    opInfo = ops[0];
                                }
                            }
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
                        if (isDemo) {
                            functionResult = JSON.stringify([{ "status": "Pendiente", "type": "Cobro", "amount": 140000, "currency": "USD" }])
                        } else {
                            const result = await getPendingFinancials(functionArgs.entidad, functionArgs.responsable)
                            functionResult = JSON.stringify(result)
                        }
                    } else if (functionName === "get_historical_analysis") {
                        if (isDemo) {
                            functionResult = "Datos Históricos (DEMO): Precios estables alrededor de 2100 USD/MT. Courier: 150 USD."
                        } else {
                            // Si query parece una ruta, intentar resolver courier primero
                            const parts = functionArgs.query.toLowerCase().split(' a ')
                            let courierResult = ""
                            if (parts.length === 2) {
                                const cost = await getPredictedCourierCost(parts[0].trim(), parts[1].trim())
                                courierResult = `Costo histórico/estimado de Courier (${functionArgs.query}): USD ${cost}. `
                            }
                            const history = await getHistoricalAnalysis(functionArgs.query)
                            functionResult = courierResult + `Historial de precios: ${JSON.stringify(history)}`
                        }
                    } else if (functionName === "get_product_recommendations") {
                        if (isDemo) {
                            functionResult = "Recomendación (DEMO): Ofrecer a MOCK IMPORTER SA"
                        } else {
                            const result = await getProductRecommendations(functionArgs.producto)
                            functionResult = JSON.stringify(result)
                        }
                    } else if (functionName === "search_operations_advanced") {
                        if (isDemo) {
                            const { MOCK_OPERACIONES } = await import('@/lib/mockData')
                            const result = MOCK_OPERACIONES.filter(o => {
                                if (functionArgs.cliente && !o.cliente?.toLowerCase().includes(functionArgs.cliente.toLowerCase())) return false;
                                if (functionArgs.status && o.estado !== functionArgs.status) return false;
                                return true;
                            });
                            functionResult = JSON.stringify(result)
                        } else {
                            const result = await searchOperationsAdvanced({
                                user: functionArgs.usuario,
                                client: functionArgs.cliente,
                                exporter: functionArgs.exportador,
                                product: functionArgs.producto,
                                status: functionArgs.status
                            })
                            functionResult = JSON.stringify(result)
                        }
                    } else if (functionName === "update_operation_status") {
                        const { operationId, status, notes } = functionArgs
                        if (isDemo) {
                            functionResult = `Estado actualizado exitosamente (DEMO): Operación ${operationId} → "${status}"`
                        } else {
                            const updateData: any = { estado: status }
                            if (notes) updateData.notas = notes
                            await updateOperation(operationId, updateData)
                            await syncOperationCashFlow(operationId) // Sincronizar cash flow
                            functionResult = `Estado actualizado exitosamente: Operación ${operationId} → "${status}"`
                        }
                    } else if (functionName === "update_operation") {
                        const { operationId, ...updates } = functionArgs
                        
                        if (isDemo) {
                            functionResult = `Operación ${operationId} actualizada (DEMO)`
                        } else {
                            // Filtrar solo los campos que se enviaron
                            const cleanUpdates: any = {}
                            Object.keys(updates).forEach(key => {
                                if (updates[key] !== undefined && updates[key] !== null) {
                                    cleanUpdates[key] = updates[key]
                                }
                            })

                            await updateOperation(operationId, cleanUpdates)
                            await syncOperationCashFlow(operationId) // Sincronizar si hay cambios financieros

                            const updatedFields = Object.keys(cleanUpdates).join(', ')
                            functionResult = `Operación ${operationId} actualizada: ${updatedFields}`
                        }
                    } else if (functionName === "add_claim") {
                        if (isDemo) {
                            functionResult = `Reclamo registrado exitosamente (DEMO): ${functionArgs.type} - ${functionArgs.description}. Estado de operación actualizado.`
                        } else {
                            // Registrar reclamo
                            // Primero obtener datos de la operación para completar el reclamo (cliente, etc)
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
                            functionResult = `Reclamo registrado exitosamente: ${claim.tipo} - ${claim.descripcion}. Estado de operación actualizado.`
                        }
                    } else if (functionName === "generate_proforma") {
                        if (isDemo) {
                            functionResult = `Proforma generada exitosamente (DEMO). Estado actualizado a "2. Proforma Enviada"`
                        } else {
                            // Generar proforma
                            const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/proformas/generate`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ operationId: functionArgs.operationId })
                            })

                            const result = await response.json()

                            if (result.success) {
                                functionResult = `Proforma generada exitosamente: ${result.docUrl}. Estado actualizado a "2. Proforma Enviada"`
                            } else {
                                functionResult = `Error al generar proforma: ${result.error}`
                            }
                        }
                    } else if (functionName === "add_cashflow_transaction") {
                        const typeLabel = functionArgs.type === 'Cobro' ? '💰 Cobro' : '💸 Pago'
                        if (isDemo) {
                            functionResult = `${typeLabel} registrado (DEMO): ${functionArgs.currency} ${functionArgs.amount} - ${functionArgs.concept} (${functionArgs.status})`
                        } else {
                            // Registrar transacción de cash flow
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
                            functionResult = `${typeLabel} registrado: ${functionArgs.currency} ${functionArgs.amount} - ${functionArgs.concept} (${functionArgs.status})`
                        }
                    }
                } catch (error: any) {
                    functionResult = `Error ejecutando ${functionName}: ${error.message}`
                }

                // Añadir el resultado de la herramienta al historial
                messages.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: functionName,
                    content: functionResult,
                })
            }

            // 4. Segunda llamada para generar la respuesta final en lenguaje natural
            const secondResponse = await openai.chat.completions.create({
                model: "gpt-4o-2024-08-06",
                messages: messages,
                temperature: 0.2, // Precisión con datos, no creatividad
            })

            finalResponse = secondResponse.choices[0].message.content
        }

        return NextResponse.json({
            role: 'assistant',
            content: finalResponse,
            context: { tool_calls: responseMessage.tool_calls?.length || 0 }
        })

    } catch (error: any) {
        console.error('Error in chat API:', error)
        return NextResponse.json(
            { error: 'Error procesando mensaje: ' + (error.message || 'Error desconocido') },
            { status: 500 }
        )
    }
}
