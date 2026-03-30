const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { MSG_STATUS } = require('../core/constants');

class DBManager {
    constructor(dbPath) {
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.db = new Database(dbPath, { verbose: null });
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');
        this.initSchema();
    }

    initSchema() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        alias TEXT,
        shared_key TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER NOT NULL,
        direction TEXT NOT NULL CHECK(direction IN ('in', 'out')),
        text TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        imap_user TEXT,
        imap_pass TEXT,
        imap_host TEXT,
        imap_port INTEGER,
        imap_tls INTEGER,
        smtp_host TEXT,
        smtp_port INTEGER,
        smtp_tls INTEGER,
        smtp_user TEXT,
        smtp_pass TEXT
      );

      CREATE TABLE IF NOT EXISTS processed_uids (
        uid TEXT PRIMARY KEY,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Migrate: add columns if upgrading from older schema
        const migrations = [
            'ALTER TABLE settings ADD COLUMN smtp_user TEXT',
            'ALTER TABLE settings ADD COLUMN smtp_pass TEXT',
            "ALTER TABLE messages ADD COLUMN status TEXT DEFAULT 'sent'",
            "ALTER TABLE messages ADD COLUMN read INTEGER DEFAULT 1",
            "ALTER TABLE settings ADD COLUMN mail_subject TEXT DEFAULT '[*MT-SecMSG*]'"
        ];
        for (const sql of migrations) {
            try { this.db.exec(sql); } catch { /* column already exists */ }
        }
    }

    // --- Settings ---
    saveSettings(settings) {
        const stmt = this.db.prepare(`
      INSERT INTO settings (id, imap_user, imap_pass, imap_host, imap_port, imap_tls, smtp_host, smtp_port, smtp_tls, smtp_user, smtp_pass, mail_subject)
      VALUES (1, @imap_user, @imap_pass, @imap_host, @imap_port, @imap_tls, @smtp_host, @smtp_port, @smtp_tls, @smtp_user, @smtp_pass, @mail_subject)
      ON CONFLICT(id) DO UPDATE SET
        imap_user=@imap_user, imap_pass=@imap_pass, imap_host=@imap_host, imap_port=@imap_port, imap_tls=@imap_tls,
        smtp_host=@smtp_host, smtp_port=@smtp_port, smtp_tls=@smtp_tls, smtp_user=@smtp_user, smtp_pass=@smtp_pass, mail_subject=@mail_subject
    `);
        stmt.run(settings);
    }

    getSettings() {
        return this.db.prepare('SELECT * FROM settings WHERE id = 1').get();
    }

    // --- Contacts ---
    addContact(email, alias, sharedKeyHex) {
        const stmt = this.db.prepare('INSERT INTO contacts (email, alias, shared_key) VALUES (?, ?, ?)');
        const info = stmt.run(email, alias, sharedKeyHex);
        return info.lastInsertRowid;
    }

    getContacts() {
        return this.db.prepare('SELECT * FROM contacts ORDER BY alias ASC').all();
    }

    getContactById(id) {
        return this.db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
    }

    getContactByEmail(email) {
        return this.db.prepare('SELECT * FROM contacts WHERE LOWER(email) = LOWER(?)').get(email);
    }

    deleteContact(id) {
        // ON DELETE CASCADE handles messages cleanup
        this.db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
    }

    // --- Messages ---
    addMessage(contactId, direction, text, status = MSG_STATUS.SENT, read = 1) {
        const stmt = this.db.prepare('INSERT INTO messages (contact_id, direction, text, status, read) VALUES (?, ?, ?, ?, ?)');
        const info = stmt.run(contactId, direction, text, status, read);
        return Number(info.lastInsertRowid);
    }

    markMessageStatus(msgId, status) {
        this.db.prepare('UPDATE messages SET status = ? WHERE id = ?').run(status, msgId);
    }

    getPendingMessages() {
        return this.db.prepare(
            'SELECT m.*, c.email, c.shared_key FROM messages m JOIN contacts c ON m.contact_id = c.id WHERE m.status = ? ORDER BY m.timestamp ASC'
        ).all(MSG_STATUS.PENDING);
    }

    getMessagesByContact(contactId) {
        return this.db.prepare('SELECT * FROM messages WHERE contact_id = ? ORDER BY timestamp ASC').all(contactId);
    }

    getMessageWithContact(msgId) {
        return this.db.prepare(
            'SELECT m.*, c.email, c.shared_key FROM messages m JOIN contacts c ON m.contact_id = c.id WHERE m.id = ?'
        ).get(msgId);
    }

    // --- Unread ---
    getUnreadCounts() {
        return this.db.prepare(
            'SELECT contact_id, COUNT(*) as count FROM messages WHERE read = 0 GROUP BY contact_id'
        ).all();
    }

    markMessagesRead(contactId) {
        this.db.prepare('UPDATE messages SET read = 1 WHERE contact_id = ? AND read = 0').run(contactId);
    }

    // --- Dedup ---
    isUidProcessed(uid) {
        return !!this.db.prepare('SELECT 1 FROM processed_uids WHERE uid = ?').get(uid);
    }

    markUidProcessed(uid) {
        this.db.prepare('INSERT OR IGNORE INTO processed_uids (uid) VALUES (?)').run(uid);
    }

    /** Delete processed UIDs older than the given number of days (default 30) */
    pruneOldUids(days = 30) {
        this.db.prepare(
            `DELETE FROM processed_uids WHERE processed_at < datetime('now', '-' || ? || ' days')`
        ).run(days);
    }

    /** Atomically insert an incoming message (unread) and mark the UID as processed */
    addMessageAndMarkUid(contactId, direction, text, uid) {
        const insert = this.db.prepare("INSERT INTO messages (contact_id, direction, text, status, read) VALUES (?, ?, ?, 'sent', 0)");
        const markUid = this.db.prepare('INSERT OR IGNORE INTO processed_uids (uid) VALUES (?)');
        const txn = this.db.transaction((cId, dir, txt, u) => {
            const info = insert.run(cId, dir, txt);
            markUid.run(u);
            return Number(info.lastInsertRowid);
        });
        return txn(contactId, direction, text, uid);
    }
}

let dbInstance = null;
let dbInstancePath = null;

function getDb(dbPath) {
    if (!dbInstance && !dbPath) {
        throw new Error('Database not initialized: dbPath required on first call');
    }
    if (dbInstance && dbPath && dbPath !== dbInstancePath) {
        try { dbInstance.db.close(); } catch {}
        dbInstance = null;
    }
    if (!dbInstance) {
        dbInstance = new DBManager(dbPath);
        dbInstancePath = dbPath;
    }
    return dbInstance;
}

function closeDb() {
    if (dbInstance) {
        try { dbInstance.db.close(); } catch {}
        dbInstance = null;
        dbInstancePath = null;
    }
}

module.exports = { getDb, closeDb };
