#!/usr/bin/env python3
"""
KIBANS Bounce Manager - V3.0
Scans inbox for delivery failures and classifies them:
  - HARD BOUNCE: Invalid mailbox / domain → Mark Funciona=NO
  - SOFT BLOCK:  Spam/policy rejection  → Keep Funciona=SI, clear KIBANS=SENT so it retries

Run any time to keep the CSV clean and up to date.
"""

import imaplib
import email
import re
import csv
import os
from email.header import decode_header

# --- Config ---
IMAP_SERVER  = 'imap.gmail.com'
EMAIL_USER   = 'hello@kibans.com'
EMAIL_PASS   = 'qazeuovdszsgxqql'
CSV_PATH     = '/Users/natalia/Downloads/leads_final_631.csv'

# Keywords that indicate a HARD BOUNCE (mailbox doesn't exist)
HARD_BOUNCE_KEYWORDS = [
    'user unknown', 'no such user', 'does not exist', 'invalid address',
    'mailbox not found', 'address rejected', 'account does not exist',
    'recipient address rejected', 'no mailbox here by that name',
    '550 5.1.1', '550 5.1.2', '550 5.1.10', '5.1.1', '5.1.2',
    'address not found', 'bad destination mailbox', 'undeliverable',
    'invalid recipient', 'unknown user'
]

# Keywords that indicate a SOFT BLOCK (spam / policy / temporary)
# These should be retried after a delay — do NOT mark as NO
SOFT_BLOCK_KEYWORDS = [
    'blocked', 'spam', 'policy violation', 'rejected', 'rate limit',
    '550 5.7', '421', '452', 'too many', 'temporarily deferred',
    'message rejected', '554 5.7', '553 5.1',
]


def decode_str(s):
    """Decode email header strings."""
    if not s:
        return ''
    decoded, enc = decode_header(s)[0]
    if isinstance(decoded, bytes):
        return decoded.decode(enc or 'utf-8', errors='ignore')
    return decoded


def classify_failure(body_text):
    """Return 'hard', 'soft', or None."""
    body_lower = body_text.lower()
    for kw in HARD_BOUNCE_KEYWORDS:
        if kw in body_lower:
            return 'hard'
    for kw in SOFT_BLOCK_KEYWORDS:
        if kw in body_lower:
            return 'soft'
    return None


def extract_failed_email(msg):
    """Extract failed recipient address from a bounce message."""
    failed = None

    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()

            # Best source: message/delivery-status
            if ct == 'message/delivery-status':
                payload = part.get_payload(decode=False)
                if isinstance(payload, list):
                    for subpart in payload:
                        text = subpart.as_string()
                        m = re.search(
                            r'Final-Recipient:\s*rfc822;\s*([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})',
                            text, re.I
                        )
                        if m:
                            return m.group(1).strip().lower()

            # Fallback: plain text
            if ct == 'text/plain':
                body = part.get_payload(decode=True).decode(errors='ignore')
                failed = search_patterns(body)
                if failed:
                    return failed
    else:
        body = msg.get_payload(decode=True).decode(errors='ignore')
        failed = search_patterns(body)

    return failed


def get_full_body(msg):
    """Concatenate all text parts for classification."""
    parts = []
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() in ('text/plain', 'message/delivery-status'):
                try:
                    payload = part.get_payload(decode=True)
                    if payload:
                        parts.append(payload.decode(errors='ignore'))
                    else:
                        parts.append(part.as_string())
                except:
                    parts.append(part.as_string())
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            parts.append(payload.decode(errors='ignore'))
    return ' '.join(parts)


def search_patterns(text):
    patterns = [
        r'Final-Recipient:\s*rfc822;\s*([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})',
        r'Delivery to the following recipient failed[^:]*:\s*([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})',
        r'failed address:\s*([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})',
        r'recipient\s+([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\s+was not',
        r'([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\s*\n\s*The response was:',
    ]
    for pat in patterns:
        m = re.search(pat, text, re.I)
        if m:
            return m.group(1).strip().lower()
    return None


def main():
    print(f"🔐 Connecting to {IMAP_SERVER} as {EMAIL_USER}...")
    try:
        mail = imaplib.IMAP4_SSL(IMAP_SERVER)
        mail.login(EMAIL_USER, EMAIL_PASS)
        mail.select('inbox')

        print("🔍 Searching for failure/bounce notifications...")
        status, msgs = mail.search(
            None,
            '(OR OR SUBJECT "Delivery Status Notification" SUBJECT "Undeliverable" SUBJECT "Mail Delivery Subsystem")'
        )
        if status != 'OK':
            print("❌ Search failed.")
            return

        msg_ids = msgs[0].split()
        print(f"📧 Found {len(msg_ids)} potential failure messages.")

        hard_bounces = {}   # email → classification
        soft_blocks   = {}

        for i, msg_id in enumerate(msg_ids):
            print(f"   [{i+1}/{len(msg_ids)}] Processing...", end='\r')
            res, data = mail.fetch(msg_id, '(RFC822)')
            for part in data:
                if not isinstance(part, tuple):
                    continue
                msg = email.message_from_bytes(part[1])
                failed_addr = extract_failed_email(msg)
                if not failed_addr:
                    continue
                full_body = get_full_body(msg)
                kind = classify_failure(full_body)
                if kind == 'hard':
                    hard_bounces[failed_addr] = True
                elif kind == 'soft':
                    soft_blocks[failed_addr] = True
                else:
                    # Ambiguous — treat as hard for safety
                    hard_bounces[failed_addr] = True

        mail.logout()
        print(f"\n📉 Hard bounces (Funciona=NO): {len(hard_bounces)}")
        print(f"♻️  Soft blocks  (retry later):  {len(soft_blocks)}")

        # Show lists
        if hard_bounces:
            print("\n❌ Hard bounces:")
            for e in sorted(hard_bounces): print(f"   {e}")
        if soft_blocks:
            print("\n⏳ Soft blocks (will retry):")
            for e in sorted(soft_blocks): print(f"   {e}")

        if not hard_bounces and not soft_blocks:
            print("✨ Inbox is clean — no failures found.")
            return

        # --- Update CSV ---
        if not os.path.exists(CSV_PATH):
            print(f"❌ CSV not found: {CSV_PATH}")
            return

        rows = []
        header_row = []
        updated_hard = 0
        updated_soft  = 0

        with open(CSV_PATH, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            header_row = list(reader.fieldnames)

            email_col   = 'Email'
            funciona_col = 'Funciona'
            kibans_col  = 'KIBANS'

            for row in reader:
                addr = str(row.get(email_col, '')).strip().lower()

                if addr in hard_bounces:
                    row[funciona_col] = 'NO'
                    updated_hard += 1
                    print(f"   ❌ Marked NO: {addr}")

                elif addr in soft_blocks:
                    # Keep Funciona=SI but clear SENT so outreach retries it
                    row[funciona_col] = 'SI'
                    row[kibans_col]   = ''   # clear SENT → will be resent
                    updated_soft += 1
                    print(f"   ♻️  Reset for retry: {addr}")

                rows.append(row)

        with open(CSV_PATH, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=header_row)
            writer.writeheader()
            writer.writerows(rows)

        print(f"\n✅ CSV updated:")
        print(f"   ❌ {updated_hard} marked as Funciona=NO (hard bounce)")
        print(f"   ♻️  {updated_soft} reset for retry (soft block)")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback; traceback.print_exc()


if __name__ == '__main__':
    main()
