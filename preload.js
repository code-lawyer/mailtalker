const { contextBridge, ipcRenderer } = require('electron');

function makeEventBridge(channel) {
    return (callback) => {
        const handler = (_event, payload) => callback(payload);
        ipcRenderer.on(channel, handler);
        return () => ipcRenderer.removeListener(channel, handler);
    };
}

contextBridge.exposeInMainWorld('electronAPI', {
    // --- Settings ---
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

    // --- Contacts ---
    getContacts: () => ipcRenderer.invoke('get-contacts'),
    addContact: (contact) => ipcRenderer.invoke('add-contact', contact),
    deleteContact: (id) => ipcRenderer.invoke('delete-contact', id),

    // --- Messages ---
    getMessages: (contactId) => ipcRenderer.invoke('get-messages', contactId),
    sendMessage: (contactId, text) => ipcRenderer.invoke('send-message', { contactId, text }),
    retryMessage: (msgId) => ipcRenderer.invoke('retry-message', msgId),

    // --- Unread ---
    getUnreadCounts: () => ipcRenderer.invoke('get-unread-counts'),
    markRead: (contactId) => ipcRenderer.invoke('mark-read', contactId),

    // --- Crypto ---
    generateKey: () => ipcRenderer.invoke('generate-key'),

    // --- Events (push from main) ---
    onIncomingMessage: makeEventBridge('incoming-message'),
    onImapStatus: makeEventBridge('imap-status'),
    onMessageStatusUpdate: makeEventBridge('message-status-update'),
    onSecurityWarning: makeEventBridge('security-warning')
});
