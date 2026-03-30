import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Shield, Plus, Search, Trash2 } from 'lucide-react';
import FingerprintAvatar from './FingerprintAvatar';

export default function ContactList({ onSelectContact, onOpenSettings, onOpenAddContact, selectedContactId, refreshKey }) {
    const [contacts, setContacts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [imapStatus, setImapStatus] = useState({ connected: false });
    const [unreadCounts, setUnreadCounts] = useState({});

    const loadContacts = async () => {
        const data = await window.electronAPI.getContacts();
        setContacts(data);
    };

    const loadUnreadCounts = async () => {
        const counts = await window.electronAPI.getUnreadCounts();
        const map = {};
        for (const { contact_id, count } of counts) map[contact_id] = count;
        setUnreadCounts(map);
    };

    useEffect(() => { loadContacts(); loadUnreadCounts(); }, [refreshKey]);

    useEffect(() => {
        const removeStatus = window.electronAPI.onImapStatus((status) => {
            setImapStatus(prev => {
                if (prev.connected === status.connected && prev.reconnecting === status.reconnecting) return prev;
                return status;
            });
        });
        const removeIncoming = window.electronAPI.onIncomingMessage(() => {
            loadUnreadCounts();
        });
        return () => { removeStatus(); removeIncoming(); };
    }, []);

    const handleDelete = async (e, contact) => {
        e.stopPropagation();
        if (confirmDelete === contact.id) {
            await window.electronAPI.deleteContact(contact.id);
            setContacts(prev => prev.filter(c => c.id !== contact.id));
            setConfirmDelete(null);
            if (selectedContactId === contact.id) onSelectContact(null);
        } else {
            setConfirmDelete(contact.id);
            setTimeout(() => setConfirmDelete(null), 3000);
        }
    };

    const filteredContacts = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return contacts.filter(c =>
            c.alias.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q)
        );
    }, [contacts, searchQuery]);

    return (
        <div className="w-[280px] h-full bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col font-sans select-none">
            {/* Header with pixel grid texture */}
            <div className="px-5 py-5 shrink-0 flex items-center justify-between pixel-grid">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-accent-muted)] border border-[rgba(212,165,74,0.2)]">
                        <Shield size={16} className="text-[var(--color-accent)]" />
                    </div>
                    <h1 className="font-semibold text-lg tracking-tight text-[var(--color-text-primary)]">MailTalker</h1>
                </div>
                <button
                    onClick={onOpenSettings}
                    className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-elevated)] rounded-lg transition-all"
                    title="设置"
                >
                    <Settings size={16} />
                </button>
            </div>

            {/* Search and actions */}
            <div className="px-4 pb-3 shrink-0 space-y-2.5">
                <div className="relative group">
                    <input
                        type="text"
                        placeholder="搜索联系人..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-[var(--color-base)] border border-[var(--color-border)] rounded-lg py-2 pl-9 pr-3 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[rgba(212,165,74,0.5)] focus:ring-1 focus:ring-[rgba(212,165,74,0.5)] transition-all"
                    />
                    <Search size={14} className="absolute left-3 top-2.5 text-[var(--color-text-secondary)] group-focus-within:text-[var(--color-accent)] transition-colors" />
                </div>

                <button
                    onClick={onOpenAddContact}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-[var(--color-accent-muted)] hover:bg-[rgba(212,165,74,0.2)] text-[var(--color-accent)] border border-[rgba(212,165,74,0.2)] rounded-lg transition-all text-sm font-medium"
                >
                    <Plus size={14} />
                    新建安全链接
                </button>
            </div>

            {/* Contact list */}
            <div className="flex-1 overflow-y-auto px-2.5 space-y-0.5 pb-3 custom-scrollbar">
                <div className="px-2.5 pb-2 pt-1 text-[10px] font-medium text-[var(--color-text-secondary)] tracking-widest uppercase font-mono">
                    安全联系人 ({searchQuery ? filteredContacts.length : contacts.length})
                </div>

                {filteredContacts.map(c => {
                    const isSelected = selectedContactId === c.id;
                    return (
                        <div
                            key={c.id}
                            onClick={() => onSelectContact(c)}
                            className={`flex items-center gap-3 p-2.5 cursor-pointer rounded-lg transition-all duration-150 group ${
                                isSelected
                                    ? 'bg-[var(--color-elevated)] border border-[rgba(212,165,74,0.2)]'
                                    : 'hover:bg-[rgba(28,32,41,0.5)] border border-transparent'
                            }`}
                        >
                            <FingerprintAvatar id={c.id} alias={c.alias} size="w-11 h-11" isSelected={isSelected} />
                            <div className="flex-1 min-w-0">
                                <div className={`font-medium text-sm truncate ${isSelected ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'}`}>
                                    {c.alias}
                                </div>
                                <div className="text-xs text-[var(--color-text-secondary)] truncate font-mono">
                                    {c.email}
                                </div>
                            </div>
                            {unreadCounts[c.id] > 0 && !isSelected && (
                                <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-base)] text-[10px] font-bold px-1 shrink-0">
                                    {unreadCounts[c.id]}
                                </span>
                            )}
                            <button
                                onClick={(e) => handleDelete(e, c)}
                                className={`p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-100 ${
                                    confirmDelete === c.id
                                        ? 'text-[var(--color-danger)] bg-[rgba(196,91,74,0.15)]'
                                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-elevated)]'
                                }`}
                                title={confirmDelete === c.id ? '再次点击确认删除' : '删除联系人'}
                            >
                                <Trash2 size={13} />
                            </button>
                        </div>
                    );
                })}

                {filteredContacts.length === 0 && (
                    <div className="text-center text-[var(--color-text-secondary)] mt-8 text-sm px-4">
                        {searchQuery ? '未找到匹配的联系人。' : '暂无安全联系人，点击上方按钮添加。'}
                    </div>
                )}
            </div>

            {/* Pulse status bar */}
            <div className="px-4 py-3 border-t border-[var(--color-border)] shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-1 rounded-full ${
                        imapStatus.connected
                            ? 'bg-[var(--color-success)]'
                            : imapStatus.reconnecting
                                ? 'bg-[var(--color-accent)]'
                                : 'bg-[rgba(122,116,104,0.4)]'
                    }`} style={{
                        animation: imapStatus.connected
                            ? 'pulse-glow 2s ease-in-out infinite'
                            : imapStatus.reconnecting
                                ? 'pulse-fast 0.5s ease-in-out infinite'
                                : 'none'
                    }} />
                    <span className="text-[10px] text-[var(--color-text-secondary)] font-mono">
                        {imapStatus.connected ? 'IMAP 已连接' : imapStatus.reconnecting ? '正在重连...' : 'IMAP 未连接'}
                    </span>
                </div>
            </div>
        </div>
    );
}
