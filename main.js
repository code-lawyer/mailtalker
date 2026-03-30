const { app, BrowserWindow, ipcMain, safeStorage, Notification } = require('electron');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { getDb, closeDb } = require('./src/db/database');
const { sendPayloadMessage, closeTransport } = require('./src/core/mailer');
const { startPolling, stopPolling } = require('./src/core/listener');
const { encrypt } = require('./src/core/crypto');
const { encodeBytesToImage } = require('./src/core/imageCoder');
const { MSG_STATUS } = require('./src/core/constants');

let mainWindow;
let safeStorageWarned = false;

// Fallback Key Setup for OS isolated environment
let fallbackKey = null;
function getFallbackKey() {
    if (!fallbackKey) {
        const seed = os.hostname() + '_' + (os.userInfo().username || 'user');
        fallbackKey = crypto.scryptSync(seed, 'mailtalker-salt', 32);
    }
    return fallbackKey;
}

function getDbPath() {
    return path.join(app.getPath('userData'), 'mailtalker.db');
}

function db() {
    return getDb(getDbPath());
}

/** Send an IPC message to the renderer if the window exists */
function sendToRenderer(channel, payload) {
    if (mainWindow) mainWindow.webContents.send(channel, payload);
}

/** Encrypt a string using Electron safeStorage (OS-level DPAPI/Keychain) */
function encryptField(value) {
    if (!value) return '';
    if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.encryptString(value).toString('base64');
    }
    if (!safeStorageWarned) {
        safeStorageWarned = true;
        console.warn('[SECURITY] safeStorage unavailable — credentials stored without OS-level encryption');
        sendToRenderer('security-warning', '系统级加密不可用，凭据将以较弱的机器特征隔离存储。');
    }
    // Fallback Machine Encryption
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getFallbackKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return 'fallback:' + Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/** Decrypt a string stored via safeStorage */
function decryptField(encoded) {
    if (!encoded) return '';
    if (encoded.startsWith('fallback:')) {
        try {
            const buf = Buffer.from(encoded.substring(9), 'base64');
            const iv = buf.subarray(0, 12);
            const authTag = buf.subarray(12, 28);
            const ciphertext = buf.subarray(28);
            const decipher = crypto.createDecipheriv('aes-256-gcm', getFallbackKey(), iv);
            decipher.setAuthTag(authTag);
            return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
        } catch {
            return '';
        }
    }
    if (safeStorage.isEncryptionAvailable()) {
        try {
            return safeStorage.decryptString(Buffer.from(encoded, 'base64'));
        } catch {
            return encoded;
        }
    }
    return encoded;
}

/** Remove shared_key before sending contact to renderer */
function sanitizeContactForRenderer(contact) {
    const { shared_key, ...safe } = contact;
    return safe;
}

/** Build SMTP config from raw DB settings */
function buildSmtpConfig(settings) {
    const smtpUser = settings.smtp_user ? decryptField(settings.smtp_user) : decryptField(settings.imap_user);
    const smtpPass = settings.smtp_pass ? decryptField(settings.smtp_pass) : decryptField(settings.imap_pass);
    const isImplicitTLS = settings.smtp_port === 465;

    return {
        host: settings.smtp_host,
        port: settings.smtp_port,
        secure: isImplicitTLS,
        requireTLS: !isImplicitTLS && settings.smtp_tls === 1,
        user: smtpUser,
        pass: smtpPass
    };
}

/** Validate SMTP settings completeness */
function validateSmtpSettings(settings) {
    if (!settings) throw new Error('邮箱配置尚未设置，请先在设置中配置 IMAP/SMTP 信息');
    if (!settings.smtp_host) throw new Error('SMTP 服务器地址未配置');
    if (!settings.smtp_port) throw new Error('SMTP 端口未配置');
    if (!settings.smtp_user && !settings.imap_user) throw new Error('邮箱用户名未配置');
    if (!settings.smtp_pass && !settings.imap_pass) throw new Error('邮箱密码未配置');
}

/** Shared encrypt → encode → send pipeline */
async function encryptAndSend(smtpConfig, toEmail, encryptedSharedKey, text, mailSubject) {
    const keyBuf = Buffer.from(decryptField(encryptedSharedKey), 'hex');
    const encryptedBytes = encrypt(text, keyBuf);
    const imagePNG = await encodeBytesToImage(encryptedBytes);
    await sendPayloadMessage(smtpConfig, toEmail, imagePNG, mailSubject);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
    if (isDev) {
        mainWindow.loadURL('http://localhost:8080');
    } else {
        mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function cleanupResources() {
    stopPolling();
    closeTransport();
}

function startImapPolling() {
    const store = db();
    const settings = store.getSettings();
    if (!settings || !settings.imap_user) return;

    const imapConfig = {
        user: decryptField(settings.imap_user),
        pass: decryptField(settings.imap_pass),
        host: settings.imap_host,
        port: settings.imap_port,
        tls: settings.imap_tls === 1
    };

    startPolling(imapConfig, getDbPath(),
        (msgObj) => {
            sendToRenderer('incoming-message', msgObj);
            // Native notification when window is missing or not focused
            if ((!mainWindow || !mainWindow.isFocused()) && Notification.isSupported()) {
                const contact = store.getContactById(msgObj.contact_id);
                const notification = new Notification({
                    title: 'MailTalker',
                    body: `${contact?.alias || '未知联系人'}: ${msgObj.text.substring(0, 80)}`,
                    silent: false
                });
                notification.on('click', () => {
                    if (!mainWindow) createWindow();
                    else {
                        if (mainWindow.isMinimized()) mainWindow.restore();
                        mainWindow.focus();
                    }
                });
                notification.show();
            }
        },
        (status) => sendToRenderer('imap-status', status),
        { decryptField, mailSubject: settings.mail_subject }
    ).catch(e => console.error('Poll start failed:', e));
}

/** Retry pending messages from previous sessions */
async function retryPendingMessages() {
    const store = db();
    const settings = store.getSettings();
    if (!settings) return;

    try { validateSmtpSettings(settings); } catch { return; }

    const pending = store.getPendingMessages();
    if (pending.length === 0) return;

    const smtpConfig = buildSmtpConfig(settings);
    const mailSubject = settings.mail_subject;

    await Promise.allSettled(pending.map(async (msg) => {
        try {
            await encryptAndSend(smtpConfig, msg.email, msg.shared_key, msg.text, mailSubject);
            store.markMessageStatus(msg.id, MSG_STATUS.SENT);
            sendToRenderer('message-status-update', { id: msg.id, status: MSG_STATUS.SENT });
        } catch (err) {
            console.error(`Retry failed for message ${msg.id}:`, err.message);
        }
    }));
}

app.whenReady().then(() => {
    createWindow();

    try { db().pruneOldUids(30); } catch {}

    startImapPolling();
    retryPendingMessages().catch(() => {});

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
            startImapPolling();
        }
    });
});

app.on('window-all-closed', () => {
    cleanupResources();
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    cleanupResources();
    closeDb();
});

// ------ IPC Handlers ------

ipcMain.handle('get-settings', () => {
    const store = db();
    const settings = store.getSettings();
    if (!settings) return null;
    return {
        ...settings,
        imap_user: decryptField(settings.imap_user),
        imap_pass: '',
        smtp_user: decryptField(settings.smtp_user),
        smtp_pass: '',
        has_imap_pass: !!settings.imap_pass,
        has_smtp_pass: !!settings.smtp_pass
    };
});

ipcMain.handle('save-settings', (_event, newSettings) => {
    const store = db();
    const existing = store.getSettings();

    const imapUser = encryptField(newSettings.imap_user);
    const imapPass = newSettings.imap_pass
        ? encryptField(newSettings.imap_pass)
        : (existing?.imap_pass || '');

    const smtpUser = encryptField(newSettings.smtp_user || newSettings.imap_user);
    let smtpPass;
    if (newSettings.smtp_pass) {
        smtpPass = encryptField(newSettings.smtp_pass);
    } else if (newSettings.useSeparateSmtp) {
        smtpPass = existing?.smtp_pass || '';
    } else {
        smtpPass = imapPass;
    }

    store.saveSettings({
        ...newSettings,
        imap_user: imapUser,
        imap_pass: imapPass,
        smtp_user: smtpUser,
        smtp_pass: smtpPass,
        mail_subject: newSettings.mail_subject || '[*MT-SecMSG*]'
    });

    stopPolling();
    closeTransport();
    startImapPolling();
    return true;
});

ipcMain.handle('get-contacts', () => {
    return db().getContacts().map(sanitizeContactForRenderer);
});

ipcMain.handle('add-contact', (_event, contact) => {
    const store = db();
    const keyHex = contact.sharedKey.replace(/\s/g, '').toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(keyHex)) {
        throw new Error('Invalid key: must be exactly 64 hex characters (256-bit AES key)');
    }
    const id = store.addContact(contact.email, contact.alias, encryptField(keyHex));
    return { id };
});

ipcMain.handle('delete-contact', (_event, id) => {
    db().deleteContact(id);
    return true;
});

ipcMain.handle('get-messages', (_event, contactId) => {
    return db().getMessagesByContact(contactId);
});

ipcMain.handle('send-message', async (_event, { contactId, text }) => {
    if (!text || text.length > 10000) {
        throw new Error('消息内容已超过 10,000 字符限制，请缩减后发送');
    }

    const store = db();
    const contact = store.getContactById(contactId);
    if (!contact) throw new Error('Contact not found');

    const settings = store.getSettings();
    validateSmtpSettings(settings);

    const smtpConfig = buildSmtpConfig(settings);
    const mailSubject = settings.mail_subject;
    const msgId = store.addMessage(contactId, 'out', text, MSG_STATUS.PENDING);
    const msgObj = { id: msgId, contact_id: contactId, direction: 'out', text, status: MSG_STATUS.PENDING, timestamp: new Date().toISOString() };

    try {
        await encryptAndSend(smtpConfig, contact.email, contact.shared_key, text, mailSubject);
        store.markMessageStatus(msgId, MSG_STATUS.SENT);
        msgObj.status = MSG_STATUS.SENT;
    } catch (err) {
        store.markMessageStatus(msgId, MSG_STATUS.FAILED);
        msgObj.status = MSG_STATUS.FAILED;
        msgObj.error = err.message;
    }

    return msgObj;
});

ipcMain.handle('retry-message', async (_event, msgId) => {
    const store = db();
    const msg = store.getMessageWithContact(msgId);
    if (!msg) throw new Error('Message not found');
    if (msg.status !== MSG_STATUS.FAILED) throw new Error('Message is not in failed state');

    const settings = store.getSettings();
    validateSmtpSettings(settings);

    const smtpConfig = buildSmtpConfig(settings);
    await encryptAndSend(smtpConfig, msg.email, msg.shared_key, msg.text, settings.mail_subject);
    store.markMessageStatus(msgId, MSG_STATUS.SENT);
    return { id: msgId, status: MSG_STATUS.SENT };
});

ipcMain.handle('get-unread-counts', () => {
    return db().getUnreadCounts();
});

ipcMain.handle('mark-read', (_event, contactId) => {
    db().markMessagesRead(contactId);
    return true;
});

ipcMain.handle('generate-key', () => {
    return crypto.randomBytes(32).toString('hex');
});
