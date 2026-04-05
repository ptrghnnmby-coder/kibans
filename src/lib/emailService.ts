
import nodemailer from 'nodemailer'

// Transporter is now created inside sendEmail to pick up .env changes dynamically

interface EmailOptions {
    to: string
    cc?: string | string[]
    subject: string
    html: string
    attachments?: Array<{ filename: string, content: Buffer }>
}

export async function sendEmail({ to, cc, subject, html, attachments }: EmailOptions) {
    try {
        const user = process.env.GOOGLE_CLIENT_EMAIL_SENDER || 'info@southmarinetrading.com';
        const pass = process.env.GOOGLE_CLIENT_AppPassword;

        console.log(`[EmailService] Attempting to send email to ${to}`);
        console.log(`[EmailService] Using sender: ${user}`);
        console.log(`[EmailService] Pass length: ${pass?.length || 0}`);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: user,
                pass: pass
            }
        })

        const info = await transporter.sendMail({
            from: `"Tess Operations" <${user}>`,
            to,
            cc,
            subject,
            html,
            attachments
        });
        console.log("[EmailService] Message sent: %s", info.messageId);
        return info;
    } catch (error: any) {
        console.error("[EmailService] Error details:", error);
        throw error;
    }
}

/**
 * Translates technical SMTP/Email errors into friendly Spanish messages for the user.
 */
export function getFriendlyErrorMessage(error: any): string {
    const message = error.message || String(error);

    // SMTP Authentication Error (Incorrect App Password)
    if (message.includes('535') || message.includes('Authentication failed')) {
        return "Error de autenticación: El servicio de correo (Gmail) no aceptó las credenciales. Posiblemente la 'Contraseña de Aplicación' ha caducado o es incorrecta. Por favor, actualiza el archivo .env con una nueva contraseña de aplicación.";
    }

    // Recipient Error
    if (message.includes('550') || message.includes('Recipient address rejected')) {
        return "El destinatario es inválido o el buzón de correo no está disponible.";
    }

    // Connection Errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return "No se pudo conectar con el servidor de correo de Google. Verifica tu conexión a internet.";
    }

    // Default Fallback
    return `No se pudo enviar el correo: ${message}`;
}

export function getEmailTemplate(language: 'ES' | 'EN' | 'PT' = 'EN', piNumber: string, clientName: string) {
    // This is the old text-based template, kept for backward compatibility if needed.
    const templates = {
        ES: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <p>Estimados <strong>${clientName}</strong>,</p>
                <p>Adjunto encontrarán la Proforma Invoice <strong>${piNumber}</strong>.</p>
                <p>Por favor, revisen los detalles y confirmen si todo es correcto.</p>
                <br>
                <p>Saludos cordiales,</p>
                <p><strong>Tess Operations Team</strong></p>
            </div>
        `,
        EN: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <p>Dear <strong>${clientName}</strong>,</p>
                <p>Please find attached the Proforma Invoice <strong>${piNumber}</strong>.</p>
                <p>Kindly review the details and confirm if everything is correct.</p>
                <br>
                <p>Best regards,</p>
                <p><strong>Tess Operations Team</strong></p>
            </div>
        `,
        PT: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <p>Prezados <strong>${clientName}</strong>,</p>
                <p>Segue em anexo a Proforma Invoice <strong>${piNumber}</strong>.</p>
                <p>Por favor, revisem os detalhes e confirmem se está tudo correto.</p>
                <br>
                <p>Atenciosamente,</p>
                <p><strong>Tess Operations Team</strong></p>
            </div>
        `
    }

    return templates[language] || templates['EN']
}

// --- 1. HELPERS DE FORMATO Y CÁLCULO ---
function money(n: number) { return (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtQty(n: number) { return (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 0 }); }

function formatDate(dateInput: string | undefined): string {
    if (!dateInput) return "TBD";
    // Si ya viene en formato dd-mm-yyyy ("27-02-2026")
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateInput)) return dateInput;

    // Asumimos que dateInput puede parsearse como YYYY-MM-DD
    const dt = new Date(dateInput);
    if (!isNaN(dt.getTime())) {
        const dd = String(dt.getDate() + 1).padStart(2, '0'); // Add +1 if needed based on timezone or keep as is. Let's use UTC to avoid shifts
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const yyyy = dt.getFullYear();
        // Since the user might input string without time, let's just do a simple slice if it's ISO
        if (dateInput.includes('T') || dateInput.includes('-')) {
            const parts = dateInput.split('T')[0].split('-');
            if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    }
    return dateInput;
}

function extractCaseWeight(str: string): number {
    if (!str) return 0;
    const s = String(str).toLowerCase().replace(/lbs?|kgs?|master/g, '').trim();
    if (s.includes('x') || s.includes('*')) {
        const parts = s.split(/[x*]/);
        const p1 = parseFloat(parts[0]) || 0;
        const p2 = parseFloat(parts[1]) || 0;
        return (p1 * p2) || 0;
    }
    return parseFloat(s) || 0;
}


// --- NUEVA LÓGICA PREMIUM ---
export function buildPremiumEmailHTML(
    op: any,
    importer: any,
    catalogProducts: any[],
    customSignature?: string
): string {

    // 1. Datos del destinatario y remitente
    const recipientName = importer?.nombreContacto || importer?.empresa || "Partner";
    const userEmailRaw = String(op.userId || "").toLowerCase().trim();
    const isDemo = userEmailRaw === 'demo@southmarinetrading.com';
    let senderName = isDemo ? "Demo Team" : "South Marine Team";
    if (userEmailRaw.includes("rdm")) senderName = "Rafael";
    else if (userEmailRaw.includes("fdm")) senderName = "Federico";
    else if (userEmailRaw.includes("gf")) senderName = "Gonzalo";
    else if (userEmailRaw.includes("gdm")) senderName = "Guillermo";
    else if (userEmailRaw.includes("hm")) senderName = "Hernan";

    const language = importer?.idioma || 'EN';

    // 2. Procesamiento de Productos
    const rawProductsString = op.productos || "";
    const rawProducts = rawProductsString.split('\n').filter((x: string) => x.trim() !== "");

    const processedItems: any[] = [];
    let totalCalculado = 0;

    rawProducts.forEach((itemStr: string) => {
        const parts = itemStr.split(':');
        if (parts.length < 3) return;
        const id = parts[0].trim();
        const qty = parseFloat(parts[1] || "0");
        const price = parseFloat(parts[2] || "0");
        const subtotal = qty * price;
        totalCalculado += subtotal;

        const prodDetails = catalogProducts.find(p => String(p.id).trim() === String(id).trim()) || {};

        const boxString = prodDetails.tamanoCaja || prodDetails.packing || "";
        const weightPerCase = extractCaseWeight(boxString);
        const cases = weightPerCase > 0 ? Math.round(qty / weightPerCase) : 0;

        let groupTitle = `${prodDetails.especie || ''} ${prodDetails.corte || ''}`.trim();
        if (prodDetails.packing) groupTitle += ` - ${prodDetails.packing}`;
        if (groupTitle.trim().length < 3) groupTitle = `Product ID: ${id}`;

        processedItems.push({
            id: id,
            groupTitle: groupTitle,
            scientificName: prodDetails.nombreCientifico || "",
            caliber: prodDetails.calibre || "N/A",
            boxInfo: boxString,
            qty: qty,
            cases: cases,
            price: price,
            subtotal: subtotal
        });
    });

    const groups: Record<string, any> = {};
    processedItems.forEach(item => {
        const key = item.groupTitle;
        if (!groups[key]) {
            groups[key] = { title: item.groupTitle, scientific: item.scientificName, items: [] };
        }
        groups[key].items.push(item);
    });

    // 3. Generación HTML de la Tabla y Header
    const styleBase = "font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333;";
    const styleLabel = "font-size: 10px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;";
    const styleValue = "font-size: 13px; font-weight: 600; color: #222222;";

    const portLoad = op.portLoad || op.puertoOrigen || "TBD";
    const portDest = op.puertoDestino || "TBD";
    const shipDate = formatDate(op.fechaEmbarque);

    const logisticsHeaderHTML = `
    <div style="width: 100%; max-width: 450px; margin-bottom: 25px; background-color: #f8f9fa; border-radius: 6px; border: 1px solid #eae1e3; padding: 15px;">
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding-bottom: 10px; width: 60%; vertical-align: top;">
                    <div style="${styleLabel}">Port of Loading</div>
                    <div style="${styleValue}">${portLoad}</div>
                </td>
                <td style="padding-bottom: 10px; width: 40%; vertical-align: top;">
                    <div style="${styleLabel}">Est. Shipping</div>
                    <div style="${styleValue}">${shipDate}</div>
                </td>
            </tr>
            <tr>
                <td style="padding-top: 5px; vertical-align: top;">
                    <div style="${styleLabel}">Port of Destination</div>
                    <div style="${styleValue}">${portDest}</div>
                </td>
                <td></td>
            </tr>
        </table>
    </div>
    `;

    let tableContentHTML = "";

    Object.values(groups).forEach((group, index) => {
        if (index > 0) tableContentHTML += `<tr><td colspan="5" style="height: 20px;"></td></tr>`;

        let titleHtml = `<span style="font-size: 14px; font-weight: 700; color: #2c3e50;">${group.title}</span>`;
        if (group.scientific) {
            titleHtml += `<br><span style="font-size: 11px; color: #7f8c8d; font-style: italic;">${group.scientific}</span>`;
        }

        tableContentHTML += `
        <tr>
            <td colspan="5" style="padding: 8px 0 8px 0; border-bottom: 2px solid #ecf0f1;">
                ${titleHtml}
            </td>
        </tr>
        <tr style="font-size: 9px; color: #95a5a6; text-transform: uppercase; letter-spacing: 0.5px;">
          <td style="padding: 6px 0;">Detail / Pack</td>
          <td style="padding: 6px 0; text-align: right;">Qty (Kg/Lb)</td>
          <td style="padding: 6px 0; text-align: right;">Cases</td> 
          <td style="padding: 6px 0; text-align: right;">Unit Price</td>
          <td style="padding: 6px 0; text-align: right;">Total</td>
        </tr>
        `;

        group.items.forEach((item: any) => {
            const detailText = `<span style="font-weight: 500;">${item.caliber}</span> <span style="color:#bdc3c7; font-size:11px;">(${item.boxInfo})</span>`;

            tableContentHTML += `
            <tr style="font-size: 13px; color: #34495e;">
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f2f6;">${detailText}</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f2f6; text-align: right;">${fmtQty(item.qty)}</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f2f6; text-align: right; font-weight: 600;">${fmtQty(item.cases)}</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f2f6; text-align: right;">$${money(item.price)}</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f2f6; text-align: right; font-weight: 600;">$${money(item.subtotal)}</td>
            </tr>`;
        });
    });

    const innerTableHTML = `
    <div style="${styleBase}">
        ${logisticsHeaderHTML}
        <table cellpadding="0" cellspacing="0" style="width: 100%; max-width: 600px; border-collapse: collapse;">
            <tbody>
                ${tableContentHTML}
                <tr><td colspan="5" style="height: 15px; border-bottom: 2px solid #333;"></td></tr>
                <tr>
                    <td colspan="3"></td>
                    <td style="padding: 12px 0 0 0; text-align: right; font-size: 11px; font-weight: 700; color: #7f8c8d; text-transform: uppercase;">Total Amount:</td>
                    <td style="padding: 12px 0 0 15px; text-align: right; font-weight: 800; font-size: 16px; color: #2c3e50;">$${money(totalCalculado)}</td>
                </tr>
            </tbody>
        </table>
    </div>
    `;

    // 4. Traducciones para el Wrapper
    const introText = {
        ES: `
            <p>Estimado/a <strong>${recipientName}</strong>,</p>
            <p style="margin-bottom: 20px;">
                Tal como conversamos, adjuntamos la Factura Proforma completa para su revisión.
            </p>
        `,
        PT: `
            <p>Prezado/a <strong>${recipientName}</strong>,</p>
            <p style="margin-bottom: 20px;">
                Conforme conversado, enviamos em anexo a Fatura Proforma completa para sua revisão.
            </p>
        `,
        EN: `
            <p>Dear <strong>${recipientName}</strong>,</p>
            <p style="margin-bottom: 20px;">
                As discussed, please find attached the complete Proforma Invoice for your review.
            </p>
        `
    };

    const outroText = {
        ES: `
            <p style="margin-top: 30px;">
                Quedamos a la espera del documento firmado para proceder.
            </p>
        `,
        PT: `
            <p style="margin-top: 30px;">
                Aguardamos o documento assinado para prosseguir.
            </p>
        `,
        EN: `
            <p style="margin-top: 30px;">
                We await the signed document to proceed.
            </p>
        `
    };

    const selectedIntro = (introText as any)[language] || introText['EN'];
    const selectedOutro = (outroText as any)[language] || outroText['EN'];

    // Inject signature if provided, otherwise the fallback
    const signatureHtml = customSignature
        ? `<div>${customSignature}</div>`
        : `<strong>${senderName}</strong><br>${isDemo ? 'Global Demo Trading' : 'South Marine Trading'}`;

    return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333333; max-width: 620px;">
        ${selectedIntro}
        ${innerTableHTML}
        ${selectedOutro}
        <br>
        <div style="font-size: 14px; color: #333;">
            Best regards,
            <br><br>
            ${signatureHtml}
        </div>
    </div>
    `;
}

// --- LÓGICA PREMIUM: ORDEN DE COMPRA ---
export function buildPremiumPOEmailHTML(
    op: any,
    supplier: any,
    catalogProducts: any[],
    customSignature?: string
): string {

    // 1. Datos del destinatario y remitente
    const recipientName = supplier?.nombreContacto || supplier?.empresa || "Partner";
    const userEmailRaw = String(op.userId || "").toLowerCase().trim();
    const isDemo = userEmailRaw === 'demo@southmarinetrading.com';
    let senderName = isDemo ? "Demo Team" : "South Marine Team";
    if (userEmailRaw.includes("rdm")) senderName = "Rafael";
    else if (userEmailRaw.includes("fdm")) senderName = "Federico";
    else if (userEmailRaw.includes("gf")) senderName = "Gonzalo";
    else if (userEmailRaw.includes("gdm")) senderName = "Guillermo";
    else if (userEmailRaw.includes("hm")) senderName = "Hernan";

    const language = supplier?.idioma || 'EN';

    // 2. Procesamiento de Productos
    const rawProductsString = op.purchasePricesRaw || op.productos || "";
    const rawProducts = rawProductsString.split('\n').filter((x: string) => x.trim() !== "");

    const processedItems: any[] = [];
    let totalCalculado = 0;

    rawProducts.forEach((itemStr: string) => {
        const parts = itemStr.split(':');
        if (parts.length < 2) return;
        const id = parts[0].trim();
        const qty = parseFloat(parts[1] || "0");
        const price = parseFloat(parts[2] || "0");
        const subtotal = qty * price;
        totalCalculado += subtotal;

        const prodDetails = catalogProducts.find(p => String(p.id).trim() === String(id).trim()) || {};

        const boxString = prodDetails.tamanoCaja || prodDetails.packing || "";
        const weightPerCase = extractCaseWeight(boxString);
        const cases = weightPerCase > 0 ? Math.round(qty / weightPerCase) : 0;

        let groupTitle = `${prodDetails.especie || ''} ${prodDetails.corte || ''}`.trim();
        if (prodDetails.packing) groupTitle += ` - ${prodDetails.packing}`;
        if (groupTitle.trim().length < 3) groupTitle = `Product ID: ${id}`;

        processedItems.push({
            id: id,
            groupTitle: groupTitle,
            scientificName: prodDetails.nombreCientifico || "",
            caliber: prodDetails.calibre || "N/A",
            boxInfo: boxString,
            qty: qty,
            cases: cases,
            price: price,
            subtotal: subtotal
        });
    });

    const groups: Record<string, any> = {};
    processedItems.forEach(item => {
        const key = item.groupTitle;
        if (!groups[key]) {
            groups[key] = { title: item.groupTitle, scientific: item.scientificName, items: [] };
        }
        groups[key].items.push(item);
    });

    // 3. Generación HTML de la Tabla y Header
    const styleBase = "font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333;";
    const styleLabel = "font-size: 10px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;";
    const styleValue = "font-size: 13px; font-weight: 600; color: #222222;";

    const portLoad = op.portLoad || op.puertoOrigen || "TBD";
    const portDest = op.puertoDestino || "TBD";
    const shipDate = formatDate(op.fechaEmbarque);

    const logisticsHeaderHTML = `
    <div style="width: 100%; max-width: 450px; margin-bottom: 25px; background-color: #f8f9fa; border-radius: 6px; border: 1px solid #eae1e3; padding: 15px;">
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding-bottom: 10px; width: 60%; vertical-align: top;">
                    <div style="${styleLabel}">Port of Loading</div>
                    <div style="${styleValue}">${portLoad}</div>
                </td>
                <td style="padding-bottom: 10px; width: 40%; vertical-align: top;">
                    <div style="${styleLabel}">Est. Shipping</div>
                    <div style="${styleValue}">${shipDate}</div>
                </td>
            </tr>
            <tr>
                <td style="padding-top: 5px; vertical-align: top;">
                    <div style="${styleLabel}">Port of Destination</div>
                    <div style="${styleValue}">${portDest}</div>
                </td>
                <td></td>
            </tr>
        </table>
    </div>
    `;

    let tableContentHTML = "";

    Object.values(groups).forEach((group, index) => {
        if (index > 0) tableContentHTML += `<tr><td colspan="5" style="height: 20px;"></td></tr>`;

        let titleHtml = `<span style="font-size: 14px; font-weight: 700; color: #2c3e50;">${group.title}</span>`;
        if (group.scientific) {
            titleHtml += `<br><span style="font-size: 11px; color: #7f8c8d; font-style: italic;">${group.scientific}</span>`;
        }

        tableContentHTML += `
        <tr>
            <td colspan="5" style="padding: 8px 0 8px 0; border-bottom: 2px solid #ecf0f1;">
                ${titleHtml}
            </td>
        </tr>
        <tr style="font-size: 9px; color: #95a5a6; text-transform: uppercase; letter-spacing: 0.5px;">
          <td style="padding: 6px 0;">Detail / Pack</td>
          <td style="padding: 6px 0; text-align: right;">Qty (Kg/Lb)</td>
          <td style="padding: 6px 0; text-align: right;">Cases</td> 
          <td style="padding: 6px 0; text-align: right;">Unit Price</td>
          <td style="padding: 6px 0; text-align: right;">Total</td>
        </tr>
        `;

        group.items.forEach((item: any) => {
            const detailText = `<span style="font-weight: 500;">${item.caliber}</span> <span style="color:#bdc3c7; font-size:11px;">(${item.boxInfo})</span>`;

            tableContentHTML += `
            <tr style="font-size: 13px; color: #34495e;">
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f2f6;">${detailText}</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f2f6; text-align: right;">${fmtQty(item.qty)}</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f2f6; text-align: right; font-weight: 600;">${fmtQty(item.cases)}</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f2f6; text-align: right;">$${money(item.price)}</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f1f2f6; text-align: right; font-weight: 600;">$${money(item.subtotal)}</td>
            </tr>`;
        });
    });

    const innerTableHTML = `
    <div style="${styleBase}">
        ${logisticsHeaderHTML}
        <table cellpadding="0" cellspacing="0" style="width: 100%; max-width: 600px; border-collapse: collapse;">
            <tbody>
                ${tableContentHTML}
                <tr><td colspan="5" style="height: 15px; border-bottom: 2px solid #333;"></td></tr>
                <tr>
                    <td colspan="3"></td>
                    <td style="padding: 12px 0 0 0; text-align: right; font-size: 11px; font-weight: 700; color: #7f8c8d; text-transform: uppercase;">Total Amount:</td>
                    <td style="padding: 12px 0 0 15px; text-align: right; font-weight: 800; font-size: 16px; color: #2c3e50;">$${money(totalCalculado)}</td>
                </tr>
            </tbody>
        </table>
    </div>
    `;

    // 4. Traducciones para el Wrapper (Ajustado para Orden de Compra)
    const introText = {
        ES: `
            <p>Estimado/a <strong>${recipientName}</strong>,</p>
            <p style="margin-bottom: 20px;">
                Por la presente, adjuntamos la Orden de Compra para confirmar nuestro pedido.
            </p>
        `,
        PT: `
            <p>Prezado/a <strong>${recipientName}</strong>,</p>
            <p style="margin-bottom: 20px;">
                Em anexo, enviamos nosso Pedido de Compra para confirmação.
            </p>
        `,
        EN: `
            <p>Dear <strong>${recipientName}</strong>,</p>
            <p style="margin-bottom: 20px;">
                Please find attached our official Purchase Order for your review.
            </p>
        `
    };

    const outroText = {
        ES: `
            <p style="margin-top: 30px;">
                Quedamos a la espera de su confirmación para proceder.
            </p>
        `,
        PT: `
            <p style="margin-top: 30px;">
                Aguardamos a sua confirmação para prosseguir.
            </p>
        `,
        EN: `
            <p style="margin-top: 30px;">
                We await your confirmation to proceed.
            </p>
        `
    };

    const selectedIntro = (introText as any)[language] || introText['EN'];
    const selectedOutro = (outroText as any)[language] || outroText['EN'];

    // Inject signature if provided, otherwise the fallback
    const signatureHtml = customSignature
        ? `<div>${customSignature}</div>`
        : `<strong>${senderName}</strong><br>${isDemo ? 'Global Demo Trading' : 'South Marine Trading'}`;

    return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333333; max-width: 620px;">
        ${selectedIntro}
        ${innerTableHTML}
        ${selectedOutro}
        <br>
        <div style="font-size: 14px; color: #333;">
            Best regards,
            <br><br>
            ${signatureHtml}
        </div>
    </div>
    `;
}

export function buildBookingEmailHTML(op: any, forwarder: any, customSignature?: string): string {
    const recipientName = forwarder?.nombreContacto || forwarder?.empresa || "Partner";
    const userEmailRaw = String(op.userId || "").toLowerCase().trim();
    const isDemo = userEmailRaw === 'demo@southmarinetrading.com';
    let senderName = isDemo ? "Demo Team" : "South Marine Team";
    if (userEmailRaw.includes("rdm")) senderName = "Rafael";
    else if (userEmailRaw.includes("fdm")) senderName = "Federico";
    else if (userEmailRaw.includes("gf")) senderName = "Gonzalo";
    else if (userEmailRaw.includes("gdm")) senderName = "Guillermo";
    else if (userEmailRaw.includes("hm")) senderName = "Hernan";

    const signatureHtml = customSignature
        ? `<div>${customSignature}</div>`
        : `<strong>${senderName}</strong><br>${isDemo ? 'Global Demo Trading' : 'South Marine Trading'}`;

    return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333333; max-width: 620px;">
        <p>Dear <strong>${recipientName}</strong>,</p>
        <p style="margin-bottom: 20px;">
            Please find attached the <strong>Booking Instruction</strong> for the operation <strong>${op.id}</strong>.
        </p>
        <p>
            <strong>Route:</strong> ${op.portLoad || 'TBD'} &rarr; ${op.puertoDestino || 'TBD'}<br>
            <strong>Container:</strong> 40' HC Reefer
        </p>
        <p style="margin-top: 30px;">
            Kindly confirm once received and proceed with the booking.
        </p>
        <br>
        <div style="font-size: 14px; color: #333;">
            Best regards,
            <br><br>
            ${signatureHtml}
        </div>
    </div>
    `;
}
