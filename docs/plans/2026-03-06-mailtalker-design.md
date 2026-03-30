---
title: "MailTalker: Encrypted IMAP Pixel Chat"
date: "2026-03-06"
status: "Approved"
---

# MailTalker: Design Document

## 1. Product Concept & Positioning
MailTalker is an end-to-end encrypted instant messaging client pretending to be a chat app, but entirely utilizing the user's personal email (IMAP/SMTP) as the transit layer. 
The core innovation is that all text messages are encrypted and encoded into a random abstract RGB pixel image. If an interceptor or the email provider looks at the emails, they only see an image attachment. 
Users without the client see incomprehensible attachments; users with the client experience a seamless, modern chat UI.

## 2. Core Architecture
- **Framework**: Electron.js + React.js + Tailwind CSS.
- **Email Layer**: 
  - `nodemailer` for SMTP sending.
  - `imap-simple` (or similar) for IMAP polling.
- **Crypto & Encoding Layer**: 
  - Node.js `crypto` module (AES-256-GCM).
  - `jimp` or native Canvas for converting ciphertext bytes to RGB pixels.
- **Local Storage**: `better-sqlite3` or `electron-store` for retaining decrypted messages and contact configurations locally.

## 3. Data Flow

### A. Initialization & Key Exchange
1. User logs into their own email via IMAP/SMTP credentials.
2. The app automatically generating a secure 256-bit symmetric key (`local_secret`).
3. User manually shares this key out-of-band (e.g. in person, secure note) with a friend.
4. Friend adds the user's email address to their MailTalker contact list, inputting the shared key.

### B. Sending a Message
1. User types a plaintext message to Alice: `"Meet at 8 PM"`.
2. MailTalker fetches the pre-shared AES key mapped to Alice's email.
3. The text is encrypted using AES-256-GCM.
4. The resulting ciphertext byte array is translated into an RGB PNG image (e.g., 3 bytes = 1 pixel).
5. An email is composed with:
   - **To**: `alice@...`
   - **Subject**: `[*MT-SecMSG*]` (A distinct protocol fingerprint).
   - **Attachment**: The generated pixel PNG.
6. The email is sent via SMTP.

### C. Receiving & Decrypting a Message (IMAP Polling)
1. MailTalker silently polls the IMAP server.
2. It executes a highly-targeted query: `UID SEARCH HEADER Subject "[*MT-SecMSG*]"`. (This ensures the client only downloads relevant payload emails and does NOT download normal personal emails).
3. For each fetched email, the client extracts the `From` address (e.g., `bob@...`).
4. **Key Lookup**: The client O(1) looks up `bob@...` in the local SQLite db.
   - If not found or no key exists -> Discard/Ignore email.
5. If found, the client extracts the PNG attachment payload.
6. Decodes pixels back to ciphertext bytes.
7. Decrypts with the pre-shared key.
8. Persists the plaintext message to the local DB and displays it in the React UI as a chat bubble.

## 4. Security & Privacy Guarantees
- **Opaque Transport**: The email server only sees binary pixel data.
- **No Multi-Key Brute Forcing**: The client uses the IMAP envelope's `From` header as an exact index to find the correct decryption key, dodging performance issues and key trial errors.
- **Targeted Fetching**: Using the magic subject string `[*MT-SecMSG*]` as a server-side search parameter guarantees exactly zero accidental ingestion of the user's personal/regular emails.
