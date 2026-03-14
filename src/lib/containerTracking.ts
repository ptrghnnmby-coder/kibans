import OpenAI from 'openai';

/**
 * Container Tracking Module
 *
 * Primary provider: findTEU (findteu.com)
 * - Free plan: 10 containers/month (for testing)
 * - Business plan: €25/month for 50 containers
 * - Auth: X-Authorization-ApiKey header
 * - Docs: https://api.findteu.com/assets2/swagger/index.min.json
 * - Covers: Hapag-Lloyd, MSC, Maersk, ZIM, ONE, CMA CGM, Evergreen, 20+ more
 *
 * Secondary: Hapag-Lloyd direct DCSA API (when credentials available)
 */

const FINDTEU_BASE = 'https://api.findteu.com'
const HAPAG_BASE = 'https://api.hlag.com/hlag/external/v2'

// ─── Types ───────────────────────────────────────────────────────────────────

export type Carrier =
    | 'MSC' | 'MAERSK' | 'HAPAG' | 'ZIM' | 'ONE'
    | 'CMA_CGM' | 'EVERGREEN' | 'COSCO' | 'YANG_MING'
    | 'HMM' | 'PIL' | 'UNKNOWN'

export interface TrackingEvent {
    timestamp: string
    location: string
    eventType: string
    description: string
    vessel?: string
    voyage?: string
    isActual: boolean
}

export interface TrackingData {
    containerNumber: string
    carrier: Carrier
    status: 'IN_TRANSIT' | 'ARRIVED' | 'DELAYED' | 'DEPARTED' | 'LOADING' | 'EMPTY' | 'UNKNOWN'
    currentLocation: string
    eta?: string
    etd?: string
    portOfLoading: string
    portOfDischarge: string
    vessel?: string
    voyage?: string
    vesselIMO?: string
    vesselMMSI?: string
    containerType?: string
    events: TrackingEvent[]
    lastUpdated: string
}

// ─── Carrier Detection ────────────────────────────────────────────────────────

const CARRIER_PREFIXES: Record<string, Carrier> = {
    // MSC
    MSCU: 'MSC', MSDU: 'MSC', MEDU: 'MSC', MSRU: 'MSC', CAIU: 'MSC',
    MSMU: 'MSC', FCIU: 'MSC', GTIU: 'MSC', FFAU: 'MSC', TRLU: 'MSC',
    // Maersk
    MAEU: 'MAERSK', MSKU: 'MAERSK',
    // Hapag-Lloyd
    HLCU: 'HAPAG', HLXU: 'HAPAG', HLBU: 'HAPAG', HLRU: 'HAPAG',
    // ZIM
    ZIMU: 'ZIM', ZIMB: 'ZIM',
    // ONE (Ocean Network Express)
    ONEU: 'ONE', OOLU: 'ONE',
    // CMA CGM
    CMAU: 'CMA_CGM', APZU: 'CMA_CGM', CGMU: 'CMA_CGM',
    // Evergreen
    EGHU: 'EVERGREEN', EMCU: 'EVERGREEN',
    // COSCO
    COSU: 'COSCO', CCLU: 'COSCO',
    // Yang Ming
    YMLU: 'YANG_MING', YAMU: 'YANG_MING',
    // HMM
    HMMU: 'HMM',
    // PIL
    PCIU: 'PIL',
}

export function detectCarrier(identifier: string): Carrier {
    if (!identifier || identifier.length < 4) return 'UNKNOWN'
    const prefix = identifier.substring(0, 4).toUpperCase()
    return CARRIER_PREFIXES[prefix] || 'UNKNOWN'
}

export function isValidContainerNumber(containerNum: string): boolean {
    return /^[A-Z]{4}[0-9]{7}$/.test(containerNum.toUpperCase())
}

export function getCarrierTrackingURL(identifier: string, carrier: Carrier): string {
    const id = identifier.toUpperCase()
    const isContainer = isValidContainerNumber(id)
    const urls: Record<Carrier, string> = {
        MSC: `https://www.msc.com/en/track-a-shipment?trackingNumber=${id}`,
        MAERSK: `https://www.maersk.com/tracking/${id}`,
        HAPAG: isContainer 
            ? `https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html?container=${id}`
            : `https://www.hapag-lloyd.com/en/online-business/track/track-by-booking-solution.html?blno=${id}`,
        ZIM: `https://www.zim.com/tools/track-a-shipment?ShipmentNumber=${id}`,
        ONE: `https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?search=${id}`,
        CMA_CGM: isContainer
            ? `https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=Container&Reference=${id}`
            : `https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=Booking&Reference=${id}`,
        EVERGREEN: isContainer
            ? `https://www.evergreen-line.com/static/jsp/cargo_tracking.jsp?cn=${id}`
            : `https://www.evergreen-line.com/static/jsp/cargo_tracking.jsp?bk=${id}`,
        COSCO: `https://elines.coscoshipping.com/ebusiness/cargoTracking?condition=${id}`,
        YANG_MING: `https://www.yangming.com/e-service/Track_Trace/track_trace_cargo_tracking.aspx`,
        HMM: `https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do?cntrNo=${id}`,
        PIL: `https://www.pilship.com/en/tracing/tracking.html?containerNo=${id}`,
        UNKNOWN: '#',
    }
    return urls[carrier]
}

// ─── findTEU Integration ──────────────────────────────────────────────────────

async function trackWithFindTEU(identifier: string): Promise<TrackingData | null> {
    const apiKey = process.env.FINDTEU_API_KEY
    if (!apiKey) {
        console.warn('FINDTEU_API_KEY not set in .env')
        return null
    }

    try {
        const upperId = identifier.toUpperCase()
        const isContainer = /^[A-Z]{4}[0-9]{7}$/.test(upperId)
        const endpoint = isContainer ? 'container' : 'bill-of-lading'

        const res = await fetch(`${FINDTEU_BASE}/${endpoint}/${upperId}`, {
            method: 'POST',
            headers: {
                'X-Authorization-ApiKey': apiKey,
                'Accept': 'application/json',
            },
        })

        if (!res.ok) {
            console.error(`findTEU API error: ${res.status}`)
            return null
        }

        const json = await res.json()

        if (!json.success || json.data?.error !== 0) {
            console.error('findTEU returned error:', json.error)
            return null
        }

        return mapFindTEUToTrackingData(json.data, identifier)

    } catch (error) {
        console.error('findTEU tracking error:', error)
        return null
    }
}

function mapFindTEUToTrackingData(rawData: any, identifier: string): TrackingData {
    // If the API returns an array of containers (e.g. for a BL query), take the first one
    const data = Array.isArray(rawData) ? rawData[0] : (rawData?.containers ? rawData.containers[0] : rawData)
    if (!data) return { containerNumber: identifier, carrier: 'UNKNOWN', status: 'UNKNOWN', currentLocation: 'Unknown', events: [], lastUpdated: new Date().toISOString(), portOfLoading: '', portOfDischarge: '' }

    const actualContainerNum = data.container?.number || identifier
    const carrier = detectCarrier(actualContainerNum)

    // Map events
    const events: TrackingEvent[] = (data.events || []).map((e: any) => ({
        timestamp: e.event_date || e.date || '',
        location: [(e.location || e.facility)?.terminal, (e.location || e.facility)?.port || e.location?.name, (e.location || e.facility)?.country]
            .filter(Boolean).join(', '),
        eventType: e.action?.action_name || e.event_type || e.action || '',
        description: `${e.action?.action_name || e.event_type || ''} ${e.mode?.transport_mode || ''}`.trim(),
        vessel: e.mode?.vessel?.vessel_name || e.vessel?.name || undefined,
        voyage: e.mode?.vessel?.voyage_nr || e.voyage?.number || undefined,
        isActual: e.event_type === 'actual' || e.is_actual === true,
    })).filter((e: TrackingEvent) => e.timestamp)

    // Most recent actual event = current status
    const lastActual = [...events].reverse().find(e => e.isActual)
    const lastEvent = events[events.length - 1]

    // Determine status
    const completed = data.container?.completed
    let status: TrackingData['status'] = 'UNKNOWN'
    if (completed) {
        status = 'ARRIVED'
    } else if (lastActual) {
        const desc = lastActual.description.toLowerCase()
        if (desc.includes('loaded') || desc.includes('gate in')) status = 'LOADING'
        else if (desc.includes('departed')) status = 'DEPARTED'
        else if (desc.includes('arrived') || desc.includes('discharged')) status = 'IN_TRANSIT'
        else status = 'IN_TRANSIT'
    }

    const currentLocation = lastActual
        ? lastActual.location
        : (data.origin?.port || 'Unknown')

    // Find vessel with MMSI (prefer last actual event with vessel data)
    const vesselEvent = [...events].reverse().find(e => e.isActual && e.vessel) || events.find(e => e.vessel)
    const rawVesselEvents = (data.events || []).filter((e: any) => e.mode?.vessel?.mmsi)
    const vesselRaw = rawVesselEvents.length > 0 ? rawVesselEvents[rawVesselEvents.length - 1].mode.vessel : null

    return {
        containerNumber: actualContainerNum.toUpperCase(),
        carrier,
        status,
        currentLocation,
        eta: data.pod?.eta_date,
        etd: data.pol?.etd_date,
        portOfLoading: [data.pol?.port, data.pol?.country].filter(Boolean).join(', ') || 'Unknown',
        portOfDischarge: [data.pod?.port, data.pod?.country].filter(Boolean).join(', ') || 'Unknown',
        vessel: lastActual?.vessel || vesselEvent?.vessel,
        voyage: lastActual?.voyage || vesselEvent?.voyage,
        vesselIMO: vesselRaw?.imo || undefined,
        vesselMMSI: vesselRaw?.mmsi ? String(vesselRaw.mmsi) : undefined,
        containerType: data.container?.type,
        events,
        lastUpdated: new Date().toISOString(),
    }
}

// ─── Hapag-Lloyd Direct API (HLCU only, fallback) ────────────────────────────

async function trackWithHapag(containerNumber: string): Promise<TrackingData | null> {
    const clientId = process.env.HAPAG_CLIENT_ID
    const clientSecret = process.env.HAPAG_CLIENT_SECRET
    if (!clientId || !clientSecret) return null

    try {
        const res = await fetch(
            `${HAPAG_BASE}/events?equipmentReference=${containerNumber}`,
            {
                headers: {
                    'X-IBM-Client-Id': clientId,
                    'X-IBM-Client-Secret': clientSecret,
                    'Accept': 'application/json'
                },
            }
        )
        if (!res.ok) return null
        const data = await res.json()
        return mapDCSAToTrackingData(data, containerNumber, 'HAPAG')
    } catch {
        return null
    }
}

function mapDCSAToTrackingData(dcsaData: any, containerNumber: string, carrier: Carrier): TrackingData {
    const rawEvents = Array.isArray(dcsaData) ? dcsaData : (dcsaData.events || [])

    const events: TrackingEvent[] = rawEvents.map((e: any) => ({
        timestamp: e.eventDateTime,
        location: e.eventLocation?.locationName ||
            e.transportCall?.location?.locationName || 'Unknown',
        eventType: e.eventTypeCode,
        description: `${e.eventClassifierCode} ${e.eventTypeCode}`.replace(/_/g, ' '),
        vessel: e.transportCall?.vessel?.vesselName,
        voyage: e.transportCall?.carrierExportVoyageNumber,
        isActual: e.eventClassifierCode === 'ACT',
    })).sort((a: any, b: any) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    const lastActual = [...events].reverse().find(e => e.isActual)

    return {
        containerNumber,
        carrier,
        status: lastActual?.eventType === 'DISCHARGE' ? 'ARRIVED' : 'IN_TRANSIT',
        currentLocation: lastActual?.location || 'Unknown',
        portOfLoading: events.find(e => e.eventType === 'LOAD')?.location || 'Unknown',
        portOfDischarge: events.find(e => e.eventType === 'DISCHARGE')?.location || 'Unknown',
        vessel: lastActual?.vessel,
        voyage: lastActual?.voyage,
        events,
        lastUpdated: new Date().toISOString(),
    }
}

async function filterJourneyWithAI(
    trackingData: TrackingData,
    expectedPol: string,
    expectedPod: string
): Promise<TrackingData> {
    if (!process.env.OPENAI_API_KEY || !trackingData.events || trackingData.events.length === 0) {
        return trackingData;
    }

    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const eventsCompact = trackingData.events.map((e, i) => ({
            id: i,
            date: e.timestamp,
            loc: e.location,
            desc: e.description,
            isActual: e.isActual
        }));

        const prompt = `
Eres un experto analista de logística marítima.
Un contenedor físico se reutiliza en muchos viajes distintos.
Recibes una lista de eventos de tracking de un contenedor y el viaje esperado (Puerto de Origen/POL: "${expectedPol}", Puerto de Destino/POD: "${expectedPod}").
Tu objetivo es identificar ÚNICAMENTE los eventos que corresponden a ESTE viaje específico, ignorando viajes pasados y futuros.

Devuelve un objeto JSON con:
{
  "relevantEventIds": [array de IDs enteros],
  "status": "Uno de: IN_TRANSIT, ARRIVED, DELAYED, DEPARTED, LOADING, EMPTY",
  "currentLocation": "La última locación conocida de ESTE viaje específico"
}

Reglas:
1. Si el contenedor llegó a ${expectedPod} (o su destino final lógico para este viaje), y luego hay eventos posteriores donde se vuelve a cargar en otro buque o va a otro país diferente (ej. si esperaba ir a Norfolk y luego figura yendo a UK), significa que el contenedor YA LLEGÓ a destino y está en un nuevo viaje. Ignora los eventos del viaje futuro.
2. Determina el "status" (ej. ARRIVED si ya llegó al POD, IN_TRANSIT si sigue en camino) basado estrictamente en el viaje filtrado.
3. Determina el "currentLocation" basado en el último evento real del viaje filtrado.

Eventos a analizar:
${JSON.stringify(eventsCompact, null, 2)}
`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content;
        if (!content) return trackingData;

        const result = JSON.parse(content);
        const relevantIds = new Set(result.relevantEventIds || []);

        const filteredEvents = trackingData.events.filter((_, i) => relevantIds.has(i));
        
        if (filteredEvents.length > 0) {
            return {
                ...trackingData,
                events: filteredEvents,
                status: result.status || trackingData.status,
                currentLocation: result.currentLocation || trackingData.currentLocation
            };
        }
        
        return trackingData;

    } catch (e) {
        console.error("AI tracking filter failed:", e);
        return trackingData;
    }
}

// ─── Main Tracking Function ───────────────────────────────────────────────────

export async function getTrackingInfo(identifier: string, expectedPol?: string, expectedPod?: string): Promise<TrackingData | null> {
    const upper = identifier.toUpperCase()
    const carrier = detectCarrier(upper)

    // Primary: findTEU (covers all carriers)
    let data = await trackWithFindTEU(upper)

    // Fallback: Hapag-Lloyd direct (HLCU prefix)
    if (!data && carrier === 'HAPAG' && process.env.HAPAG_CLIENT_ID) {
        data = await trackWithHapag(upper)
    }

    if (data && expectedPol && expectedPod && data.events.length > 0) {
        data = await filterJourneyWithAI(data, expectedPol, expectedPod);
    }

    return data
}

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL = 12 * 60 * 60 * 1000 // 12 hours
const trackingCache = new Map<string, { data: TrackingData; cachedAt: number }>()

export async function getCachedTracking(identifier: string): Promise<TrackingData | null> {
    const cached = trackingCache.get(identifier)
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
        return cached.data
    }
    const freshData = await getTrackingInfo(identifier)
    if (freshData) {
        trackingCache.set(identifier, { data: freshData, cachedAt: Date.now() })
    }
    return freshData
}

export function clearTrackingCache(identifier?: string) {
    if (identifier) trackingCache.delete(identifier)
    else trackingCache.clear()
}
