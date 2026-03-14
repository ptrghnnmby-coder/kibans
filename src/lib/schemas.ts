import { z } from 'zod';
import { parseNumeric } from './numbers';

// Esquema para montos (asegura que sea número con lógica robusta)
export const AmountSchema = z.preprocess((val) => {
    return parseNumeric(val as string | number);
}, z.number());

export const OperacionSchema = z.object({
    id: z.string().optional(),
    estado: z.string(),
    cliente: z.string(),
    exportador: z.string(),
    productor: z.string().optional(),
    fechaEmbarque: z.string().optional(),
    puertoDestino: z.string().optional(),
    productos: z.string().optional(),
    notas: z.string().optional(),
    brand: z.string().optional(),
    portLoad: z.string().optional(),
    incoterm: z.string().optional(),
    shipLane: z.string().optional(),
    trading: z.string().optional(),
    paymentTerms: z.string().optional(),
    seguro_estado: z.string().optional(),
    instrucciones_frio: z.string().optional(),
});

export const FleteSchema = z.object({
    id_operacion: z.string(),
    forwarder: z.string(),
    monto: AmountSchema,
    moneda: z.string(),
    seguro: z.enum(['SI', 'NO']),
    temp: z.string(),
    validez: z.string(),
    estado: z.enum(['Pendiente', 'Seleccionado', 'Rechazado']),
});

export const ContactoSchema = z.object({
    id: z.string(),
    empresa: z.string(),
    email: z.string().email().or(z.string().length(0)),
    tipo: z.enum(['Importador', 'Exportador', 'Productor', 'NBC', 'Forwarder', 'Desconocido']),
});

export const CashFlowSchema = z.object({
    id: z.string(),
    operationId: z.string(),
    amount: AmountSchema,
    type: z.enum(['INGRESO', 'EGRESO']),
    status: z.enum(['PENDIENTE', 'PAGADO']),
});

export const ClaimSchema = z.object({
    id: z.string().optional(),
    operationId: z.string(),
    cliente: z.string(),
    producto: z.string(),
    tipo: z.string(),
    fechaReporte: z.string(),
    responsable: z.string(),
    descripcion: z.string(),
    evidencia: z.string().optional(),
    impactoEstimado: AmountSchema,
    resolucionPropuesta: z.string().optional(),
    impactoFinal: AmountSchema.optional(),
    estado: z.string(),
    fechaCierre: z.string().optional(),
    timestamp: z.string().optional(),
});
