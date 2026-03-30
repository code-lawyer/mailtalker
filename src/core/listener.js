const imaps = require('imap-simple');
const { MAIL_SUBJECT } = require('./mailer');
const { getDb } = require('../db/database');
const { decodeImageToBytes } = require('./imageCoder');
const { decrypt } = require('./crypto');

let decryptKeyField = (v) => v; // Will be injected from main.js

let connection = null;
let pollInterval = null;
let reconnectTimer = null;
let currentConfig = null;
let currentDbPath = null;
let currentOnMessage = null;
let currentOnStatus = null;
let cachedDb = null;
let currentMailSubject = null;

const POLL_INTERVAL_MS = 60000; // Reduced frequency — IDLE handles real-time
const RECONNECT_BASE_DELAY_MS = 15000;
const MAX_RECONNECT_DELAY_MS = 300000; // 5 mins
const AUTH_TIMEOUT_MS = 10000;

let reconnectAttempts = 0;

async function startPolling(imapConfig, dbPath, onMessageReceived, onStatus, options = {}) {
    currentConfig = imapConfig;
    currentDbPath = dbPath;
    currentOnMessage = onMessageReceived;
    currentOnStatus = onStatus || (() => {});
    cachedDb = getDb(dbPath);
    if (options.decryptField) decryptKeyField = options.decryptField;
    currentMailSubject = options.mailSubject || MAIL_SUBJECT;

    await connect();
}

async function connect() {
    stopPolling(false); // Stop existing intervals without clearing config

    const config = {
        imap: {
            user: currentConfig.user,
            password: currentConfig.pass,
            host: currentConfig.host,
            port: currentConfig.port,
            tls: currentConfig.tls,
            authTimeout: AUTH_TIMEOUT_MS,
            tlsOptions: { rejectUnauthorized: true }
        }
    };

    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');
        console.log('IMAP connected, starting polling...');
        reconnectAttempts = 0; // Reset attempts on succcess
        currentOnStatus({ connected: true });

        // Listen for connection errors to trigger reconnect
        if (connection.imap) {
            connection.imap.on('error', (err) => {
                console.error('IMAP connection error:', err.message);
                scheduleReconnect();
            });
            connection.imap.on('end', () => {
                console.log('IMAP connection ended');
                scheduleReconnect();
            });

            // IDLE-based real-time push: react to new mail events instantly
            connection.imap.on('mail', () => {
                checkNewMessages().catch(err => {
                    console.error('IDLE mail event check error:', err.message);
                });
            });
        }

        // Immediate check + safety-net polling (IDLE handles real-time)
        await checkNewMessages();
        pollInterval = setInterval(() => {
            checkNewMessages().catch(err => {
                console.error('Poll cycle error:', err.message);
                scheduleReconnect();
            });
        }, POLL_INTERVAL_MS);

    } catch (err) {
        console.error('IMAP connection failed:', err.message);
        currentOnStatus({ connected: false, error: err.message });
        scheduleReconnect();
    }
}

function scheduleReconnect() {
    if (reconnectTimer) return; // Already scheduled
    if (!currentConfig) return; // Polling was fully stopped

    // Clear existing poll
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    if (connection) { try { connection.end(); } catch {} connection = null; }

    currentOnStatus({ connected: false, reconnecting: true });
    
    // Exponential backoff
    const delay = Math.min(RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY_MS);
    reconnectAttempts++;

    console.log(`Reconnecting IMAP in ${delay / 1000}s (Attempt ${reconnectAttempts})...`);

    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect().catch(() => {}); // connect() handles its own errors
    }, delay);
}

function stopPolling(clearConfig = true) {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (connection) {
        if (connection.imap) connection.imap.removeAllListeners();
        try { connection.end(); } catch {} 
        connection = null;
    }
    if (clearConfig) {
        currentConfig = null;
        currentDbPath = null;
        currentOnMessage = null;
        currentOnStatus = null;
        cachedDb = null;
    }
}

async function checkNewMessages() {
    if (!connection) return;

    const searchCriteria = ['UNSEEN', ['HEADER', 'SUBJECT', currentMailSubject || MAIL_SUBJECT]];
    const fetchOptions = {
        bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
        struct: true,
        markSeen: true
    };

    const messages = await connection.search(searchCriteria, fetchOptions);

    for (const item of messages) {
        try {
            await processMessage(item);
        } catch (e) {
            console.error('Error processing message:', e.message);
        }
    }
}

async function processMessage(item) {
    const db = cachedDb || getDb(currentDbPath);

    // Dedup by UID
    const uid = String(item.attributes.uid);
    if (db.isUidProcessed(uid)) return;

    const headerPart = item.parts.find(p => p.which === 'HEADER.FIELDS (FROM TO SUBJECT DATE)');
    if (!headerPart) return;

    const fromField = headerPart.body.from[0];
    const emailMatch = fromField.match(/<([^>]+)>/);
    const fromEmail = emailMatch ? emailMatch[1].trim() : fromField.trim();

    const contact = db.getContactByEmail(fromEmail);
    if (!contact) {
        console.log(`Received MailTalker msg from unknown sender ${fromEmail}, ignoring.`);
        db.markUidProcessed(uid); // Don't reprocess
        return;
    }

    // Extract attachment
    const parts = imaps.getParts(item.attributes.struct);
    const attachments = parts.filter(
        part => part.disposition && part.disposition.type.toUpperCase() === 'ATTACHMENT'
    );
    if (attachments.length === 0) {
        db.markUidProcessed(uid);
        return;
    }

    const attachmentData = await connection.getPartData(item, attachments[0]);

    let plaintext;
    try {
        const encryptedBytes = await decodeImageToBytes(attachmentData);
        const keyBuf = Buffer.from(decryptKeyField(contact.shared_key), 'hex');
        const decryptedBytes = decrypt(encryptedBytes, keyBuf);
        plaintext = decryptedBytes.toString('utf8');
    } catch (decryptErr) {
        console.error(`Failed to decrypt message from ${fromEmail}:`, decryptErr.message);
        db.markUidProcessed(uid); // Mark as processed to avoid infinite retry
        return;
    }

    // Atomic: insert message + mark UID in one transaction to prevent duplicates
    const msgId = db.addMessageAndMarkUid(contact.id, 'in', plaintext, uid);

    console.log(`Decrypted message from ${fromEmail}`);

    if (currentOnMessage) {
        currentOnMessage({
            id: msgId,
            contact_id: contact.id,
            direction: 'in',
            text: plaintext,
            email: fromEmail,
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = { startPolling, stopPolling };
