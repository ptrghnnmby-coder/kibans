#!/usr/bin/env python3
"""
KIBANS Strategic Outreach - V7.2 (Bilingual & Anti-Block)
- Language Unification: If Language is English, ALL content (Subject, Greeting, Hook, Body) is English.
- English Hook Fallback: If description contains Spanish words, use a high-value English fallback.
- Anti-Block Measures: Delays 400-1000s + Jitter. Safe Stop on rejection.
- Dual CTA: "Visit my website" + Calendly "Book a call".
- Branding: KIBANS | AI Automation.
"""

import smtplib
import ssl
import csv
import time
import random
import os
import argparse
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# --- Config ---
SMTP_SERVER = 'smtp.gmail.com'
SMTP_PORT = 465
EMAIL_USER = 'hello@kibans.com'
EMAIL_PASS = 'qazeuovdszsgxqql'
CSV_PATH = '/Users/natalia/Downloads/leads_final_631.csv'
STATUS_FILE = '/Users/natalia/Desktop/KIBANS/MartaBot_Demo/MartaBot/scripts/outreach_status.txt'
DASHBOARD_FILE = '/Users/natalia/Desktop/KIBANS/MartaBot_Demo/MartaBot/scripts/outreach_dashboard.md'
BRAND_GOLD = '#dca64b'
CALENDLY_URL = 'https://calendly.com/hello-kibans/30min'

# --- Layout ---
HTML_LAYOUT = """
<!DOCTYPE html>
<html>
<head>
<style>
    body {{
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        line-height: 1.6;
        color: #333333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
    }}
    .button {{
        display: inline-block;
        background-color: {brand_color};
        color: #ffffff !important;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 4px;
        font-weight: 600;
        font-size: 15px;
        margin: 20px 0;
        text-align: center;
    }}
    .signature-box {{
        margin-top: 40px;
        padding-top: 20px;
        border-top: 2px solid #f0f0f0;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        font-size: 11px;
        line-height: 1.4;
    }}
    .signature-box b {{
        color: #333333;
        font-size: 12px;
    }}
    .signature-box a {{
        color: {brand_color};
        text-decoration: none;
    }}
</style>
</head>
<body>
    {content}
    
    <div class="signature-box">
        <b>KIBANS | AI Automation</b><br>
        <a href="https://kibans.com">www.kibans.com</a>
    </div>
</body>
</html>
"""

def contains_spanish(text):
    if not text: return False
    # Simple check for common Spanish words that don't overlap with English heavily
    es_stop_words = [r'\bde\b', r'\bla\b', r'\bel\b', r'\by\b', r'\ben\b', r'\bque\b', r'\blos\b', r'\bson\b', r'\bpara\b', r'\bmás\b']
    for word in es_stop_words:
        if re.search(word, text.lower()):
            return True
    return False

def translate_fallback(text, target_lang):
    # This is a basic rule-based "translation" for specific industries found in the CSV
    if target_lang == 'English':
        if 'Tilapia' in text and 'Salmón' in text:
            return "one of the largest Tilapia and Salmon importers in the US, a key supplier to major retailers."
        if 'Minerales' in text:
            return "your large_scale mineral and metal concentrate trading operations."
        if 'Aluminio' in text or 'Cobre' in text:
            return "your expertise in non-ferrous scrap metal and supply chain logistics."
    return text

def is_trading_company(description, products, company):
    """Determine if the company is in the foreign trade/logistics sector."""
    trading_keywords = [
        'trading', 'import', 'export', 'shipping', 'logistics', 'comercio exterior', 
        'aduana', 'forwarder', 'pesquera', 'marítimo', 'freight', 'transporte internacional',
        'surimi', 'fish', 'mar del plata' # Specific keywords for recent seafood leads
    ]
    txt = f"{description} {products} {company}".lower()
    return any(k in txt for k in trading_keywords)

def get_content_v7(lang, company, description, products, greeting):
    is_english = 'English' in lang
    trading = is_trading_company(description, products, company)
    
    # 1. Subject Lines
    if trading:
        subject = f"Optimizing {company} operations with AI" if is_english else f"Optimizando las operaciones de {company} con IA"
    else:
        subject = f"Eliminating manual data entry at {company}" if is_english else f"Eliminando la carga manual de datos en {company}"

    # 2. Body Hooks
    hook_text = description
    if is_english and contains_spanish(description):
        translated = translate_fallback(description, 'English')
        hook_text = translated if translated else f"your impressive operations at {company} and your focus on scale in {products or 'your sector'}."
    
    if is_english:
        hook = f"I noticed your expertise in <strong>{hook_text}</strong> and was impressed by the impact {company} is making in the industry."
        
        if trading:
            # Trading Focus: Lead with Tess
            body = f"""
            <p>{greeting}</p>
            <p>{hook}</p>
            <p>I'm reaching out because we built <strong>Tess</strong> — an AI agent for foreign trade teams. It generates proformas, purchase orders, and bookings in 45 seconds, reads documents automatically, and tracks shipments in real time.</p>
            <p>Beyond Tess, at <strong>KIBANS</strong> we offer <strong>Custom AI Automation Services</strong> tailored specifically to your company's processes.</p>
            """
        else:
            # General Focus: Lead with Custom AI
            body = f"""
            <p>{greeting}</p>
            <p>{hook}</p>
            <p>At <strong>KIBANS</strong>, we specialize in building <strong>Custom AI Automation Services</strong> specifically designed to eliminate manual data entry and scale internal processes without increasing headcount.</p>
            <p>As an example of our work, we built <strong>Tess</strong> — a specialized AI agent for trade teams that automates complex documentation in 45 seconds. We can build similar, tailored solutions for your unique operational needs at {company}.</p>
            """
        
        content = body + f"""
        <p>Teams in your sector typically save 80+ hours/month by automating these repetitive tasks. Would you be open to a quick conversation to explore how this fits at {company}?</p>
        <div style="text-align: left;">
            <a href="https://kibans.com" class="button">Visit our website</a>
        </div>
        <p>Worth a 30-min call?</p>
        <p><a href="{CALENDLY_URL}" style="color: {BRAND_GOLD};">Book a call here.</a></p>
        <br>
        <p style="color:#555; font-size:13px; line-height:1.4;"><strong>Mark</strong><br>Ceo &amp; Manager<br><strong>KIBANS | AI Automation</strong><br><a href="https://kibans.com" style="color:{BRAND_GOLD};">www.kibans.com</a></p>
        """
    else:
        # Spanish Templates
        hook = f"Noté su especialización en <strong>{hook_text}</strong> y me pareció muy valioso el trabajo que hacen en {company}."
        
        if trading:
            # Trading Focus (Spanish)
            body = f"""
            <p>{greeting}</p>
            <p>{hook}</p>
            <p>Te escribo porque desarrollamos <strong>Tess</strong>, un agente de IA específico para equipos de comercio exterior que genera proformas, órdenes de compra y bookings en segundos, lee documentos automáticamente y realiza un seguimiento en tiempo real.</p>
            <p>Además de Tess, en <strong>KIBANS</strong> diseñamos <strong>Soluciones de IA personalizada</strong> a medida de tu empresa, automatizando los procesos internos que hoy les quitan tiempo de valor.</p>
            """
        else:
            # General Focus (Spanish)
            body = f"""
            <p>{greeting}</p>
            <p>{hook}</p>
            <p>En <strong>KIBANS</strong>, nos especializamos en diseñar <strong>Soluciones de IA personalizada</strong> para eliminar la carga manual de datos y automatizar procesos internos críticos, permitiendo que tu equipo se enfoque en lo que realmente importa.</p>
            <p>Como ejemplo de nuestro trabajo, desarrollamos <strong>Tess</strong> — un agente de IA para el sector de comercio exterior que automatiza documentos complejos en 45 segundos. Podemos construir soluciones similares y personalizadas para las necesidades específicas de {company}.</p>
            """
            
        content = body + f"""
        <p>Empresas del sector suelen ahorrar más de 80 horas al mes eliminando la carga manual de datos. ¿Te gustaría ver cómo aplicaría en el caso de {company}?</p>
        <div style="text-align: left;">
            <a href="https://kibans.com" class="button">Ver nuestro sitio web</a>
        </div>
        <p>¿Tendrías 30 minutos para conversar la próxima semana?</p>
        <p><a href="{CALENDLY_URL}" style="color: {BRAND_GOLD};">Agenda una llamada aquí.</a></p>
        <br>
        <p style="color:#555; font-size:13px; line-height:1.4;"><strong>Mark</strong><br>Ceo &amp; Manager<br><strong>KIBANS | AI Automation</strong><br><a href="https://kibans.com" style="color:{BRAND_GOLD};">www.kibans.com</a></p>
        """
        
    return subject, content

def get_greeting_text(name, lang):
    name = str(name or '').strip()
    generic = ['sales', 'team', 'marketing', 'dept', 'contact', 'info', 'support', 'owner', 'manager']
    is_spanish = 'Español' in lang
    if not name or any(g in name.lower() for g in generic):
        return "Hola," if is_spanish else "Hello,"
    first = "".join(c for c in name.split()[0] if c.isalnum()).capitalize()
    return f"Hola {first}," if is_spanish else f"Hi {first},"

def send_email(to_email, subject, html_body):
    msg = MIMEMultipart('alternative')
    msg['From'] = f"KIBANS | AI Automation <{EMAIL_USER}>"
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(html_body, 'html'))
    
    with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=ssl.create_default_context()) as server:
        server.login(EMAIL_USER, EMAIL_PASS)
        server.send_message(msg)


def log_to_dashboard(email, subject, html_content, company, status_icon="✅"):
    """Update outreach_dashboard.md with a table row and an expandable detail block."""
    try:
        import re
        # Clean HTML for the preview
        clean_content = html_content.replace('<p>', '').replace('</p>', '\n\n')
        clean_content = re.sub('<[^<]+?>', '', clean_content) # Strip remaining tags
        timestamp = time.strftime('%H:%M:%S')
        
        # 1. Update the 'Summary Table' at the top
        # We'll prepend the row to a temporary table file or just append to the dashboard for now.
        # To keep it "easier to understand", we'll use a clean log format.
        
        with open(DASHBOARD_FILE, 'a', encoding='utf-8') as f:
            f.write(f"\n| {status_icon} | **{company}** | {email} | {timestamp} |\n")
            f.write(f"<details>\n<summary>🔍 Ver previsualización del mensaje enviado</summary>\n\n")
            f.write(f"**Asunto:** {subject}\n\n")
            f.write(f"```text\n{clean_content.strip()}\n```\n")
            f.write(f"</details>\n")
            f.write(f"\n---\n")
    except Exception as e:
        print(f"   ⚠️ Could not log to dashboard: {e}")

def update_status_file(sent, total):
    try:
        with open(STATUS_FILE, 'w') as f:
            f.write(f"Emails Enviados: {sent} / {total}\n Última actualización: {time.strftime('%H:%M:%S')}")
    except: pass

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=1)
    parser.add_argument('--test', action='store_true')
    args = parser.parse_args()

    print(f"🚀 KIBANS Combined Outreach V7.2 - Limit: {args.limit}")

    # Initialize dashboard file
    if not os.path.exists(DASHBOARD_FILE):
        with open(DASHBOARD_FILE, 'w', encoding='utf-8') as f:
            f.write("# 🚀 KIBANS Outreach Live Dashboard\n")
            f.write("Este archivo se actualiza en tiempo real. Usá los botones de '🔍 Ver previsualización' para verificar el contenido.\n\n")
            f.write("| Estado | Empresa | Email | Hora |\n")
            f.write("| :--- | :--- | :--- | :--- |\n")

    rows = []
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = list(csv.reader(f))
        header = reader[0]
        rows = reader[1:]
        
        try:
            name_idx = header.index('Contact Name')
            company_idx = header.index('Company Name')
            email_idx = header.index('Email')
            desc_idx = 4
            prod_idx = 5
            lang_idx = 6
            kibans_idx = header.index('KIBANS')
            func_idx = header.index('Funciona')
        except Exception as e:
            print(f"❌ Header error: {e}")
            return

    to_process = [r for r in rows if str(r[email_idx]).strip() and str(r[kibans_idx]).upper() != 'SENT' and str(r[func_idx]).upper() != 'NO']
    total_leads = len(to_process)
    sent_count = 0
    update_status_file(0, total_leads)

    for r in rows:
        email_addr = str(r[email_idx]).strip()
        status = str(r[kibans_idx]).upper()
        funciona = str(r[func_idx]).upper()
        
        if not email_addr or status == 'SENT' or funciona == 'NO': continue
        if sent_count >= args.limit: break

        lang = r[lang_idx]
        greeting = get_greeting_text(r[name_idx], lang)
        
        subject, content = get_content_v7(lang, r[company_idx], r[desc_idx], r[prod_idx], greeting)
        html_body = HTML_LAYOUT.format(content=content, brand_color=BRAND_GOLD)
        recipient = EMAIL_USER if args.test else email_addr
        
        print(f"📤 [{sent_count+1}/{args.limit}] {recipient} ({lang})")
        try:
            send_email(recipient, subject, html_body)
            log_to_dashboard(recipient, subject, content, r[company_idx], "✅")
            if not args.test:
                r[kibans_idx] = 'SENT'
                with open(CSV_PATH, 'w', encoding='utf-8', newline='') as f:
                    writer = csv.writer(f)
                    writer.writerow(header)
                    writer.writerows(rows)
            
            sent_count += 1
            update_status_file(sent_count, total_leads)
            
            if sent_count < args.limit:
                delay = random.randint(1500, 2400) # Overnight mode: 25-40 min between emails
                print(f"   Cooling down for {delay} seconds ({delay//60} min)...")
                time.sleep(delay)
        except Exception as e:
            print(f"   ❌ Rejected: {e}")
            log_to_dashboard(recipient, subject, content, r[company_idx], "❌ (Error)")
            if "rejected" in str(e).lower() or "blocked" in str(e).lower():
                print("🛑 SYSTEM SAFETY STOP: Block detected. Ending run.")
                break

    print(f"🏁 Done. Sent: {sent_count}")

if __name__ == '__main__':
    main()
