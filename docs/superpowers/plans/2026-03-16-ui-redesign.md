# MailTalker UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign MailTalker's entire UI from generic dark-mode chat app to "Covert Elegance" — deep space gray + amber accent palette with cryptographic visual elements (pixel textures, fingerprint ring avatars, encryption animations).

**Architecture:** Pure visual redesign. No logic, state management, or API changes. CSS custom properties define all design tokens in `index.css`; components reference them via Tailwind arbitrary value syntax (`bg-[var(--color-base)]`). Crypto visual elements (pixel grid, fingerprint rings, message resolve animation, pulse status) implemented as CSS utilities and inline styles.

**Tech Stack:** React, Tailwind CSS v4, Lucide React icons, CSS custom properties, CSS animations

**Spec:** `docs/superpowers/specs/2026-03-16-ui-redesign-design.md`

---

## Chunk 1: Foundation + Structural Files

### Task 1: CSS Foundation — Design Tokens, Utilities, Animations

**Files:**
- Modify: `src/index.css` (full rewrite)

- [ ] **Step 1: Replace `src/index.css` with new design system**

```css
@import "tailwindcss";

:root {
  --color-base: #0C0E12;
  --color-surface: #14171E;
  --color-elevated: #1C2029;
  --color-border: #252A35;
  --color-text-primary: #E8E2D6;
  --color-text-secondary: #7A7468;
  --color-accent: #D4A54A;
  --color-accent-muted: rgba(212,165,74,0.15);
  --color-bubble-out: #1A1D26;
  --color-bubble-in: #12141A;
  --color-danger: #C45B4A;
  --color-success: #5A9A6B;
  --font-mono: "SF Mono", "Cascadia Code", "Consolas", monospace;
}

body {
  background-color: var(--color-base);
  color: var(--color-text-primary);
}

/* Pixel grid texture — subtle amber checkerboard evoking data encoding */
@layer utilities {
  .pixel-grid {
    background-image:
      linear-gradient(45deg, rgba(212,165,74,0.03) 25%, transparent 25%),
      linear-gradient(-45deg, rgba(212,165,74,0.03) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, rgba(212,165,74,0.03) 75%),
      linear-gradient(-45deg, transparent 75%, rgba(212,165,74,0.03) 75%);
    background-size: 4px 4px;
    background-position: 0 0, 0 2px, 2px -2px, -2px 0px;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(212,165,74,0.4);
  }
}

/* Message send animation — blur resolve */
@keyframes msg-resolve {
  from { opacity: 0; filter: blur(4px); transform: translateY(4px); }
  to { opacity: 1; filter: blur(0); transform: translateY(0); }
}
.animate-resolve { animation: msg-resolve 0.3s ease-out; }

/* Pulse glow — connected status (green) */
@keyframes pulse-glow {
  0%, 100% { opacity: 0.6; box-shadow: 0 0 4px var(--color-success); }
  50% { opacity: 1; box-shadow: 0 0 8px var(--color-success); }
}

/* Fast pulse — reconnecting status (amber) */
@keyframes pulse-fast {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

/* Generic fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

- [ ] **Step 2: Verify build succeeds**

Run: `cd "C:/Users/lanzh/Documents/Vibe Coding Works/mailtalker" && npx webpack --mode production 2>&1 | tail -5`
Expected: Build completes without errors

### Task 2: Update HTML and App Root

**Files:**
- Modify: `public/index.html`
- Modify: `src/App.jsx`

- [ ] **Step 1: Update `public/index.html` body classes**

Replace line 9:
```html
<body class="m-0 p-0 overflow-hidden">
```
(Remove color classes — CSS handles body styling via `:root` vars now)

- [ ] **Step 2: Update `src/App.jsx` root container classes**

Replace the root div className (line 18):
```jsx
<div className="flex overflow-hidden font-sans h-screen w-screen bg-[var(--color-base)] text-[var(--color-text-primary)] selection:bg-[var(--color-accent-muted)] selection:text-[var(--color-accent)]">
```

- [ ] **Step 3: Verify build succeeds**

Run: `cd "C:/Users/lanzh/Documents/Vibe Coding Works/mailtalker" && npx webpack --mode production 2>&1 | tail -5`

### Task 3: ContactList Redesign

**Files:**
- Modify: `src/components/ContactList.jsx` (full rewrite)

- [ ] **Step 1: Rewrite `ContactList.jsx`**

Key changes from current:
- Width: `w-[280px]` (was `w-80` = 320px)
- All colors → CSS variable references
- Header: Add `.pixel-grid` background
- Avatars: Add fingerprint ring using `conic-gradient` computed from `contact.id`
- Footer: Replace text-only IMAP status with pulse bar visual
- Icons: Keep same lucide icons (Settings, Shield, Plus, Search, Trash2, Wifi, WifiOff, RefreshCw)

Complete replacement code:

```jsx
import React, { useState, useEffect } from 'react';
import { Settings, Shield, Plus, Search, Trash2, Wifi, WifiOff, RefreshCw } from 'lucide-react';

function FingerprintAvatar({ id, alias, isSelected }) {
    const segments = Array.from({ length: 8 }, (_, i) => (id >> i) & 1);
    const gradient = segments.map((lit, i) => {
        const start = i * 45;
        const end = start + 40;
        return lit
            ? `var(--color-accent) ${start}deg ${end}deg, transparent ${end}deg ${start + 45}deg`
            : `transparent ${start}deg ${start + 45}deg`;
    }).join(', ');

    return (
        <div className="relative">
            <div
                className="w-11 h-11 rounded-full flex items-center justify-center p-[2px]"
                style={{ background: `conic-gradient(${gradient})` }}
            >
                <div className={`w-full h-full rounded-full flex items-center justify-center text-sm font-bold ${
                    isSelected
                        ? 'bg-[var(--color-accent)] text-[var(--color-base)]'
                        : 'bg-[var(--color-elevated)] text-[var(--color-text-primary)]'
                } transition-colors`}>
                    {alias.charAt(0).toUpperCase()}
                </div>
            </div>
        </div>
    );
}

export default function ContactList({ onSelectContact, onOpenSettings, onOpenAddContact, selectedContactId, refreshKey }) {
    const [contacts, setContacts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [imapStatus, setImapStatus] = useState({ connected: false });

    const loadContacts = async () => {
        const data = await window.electronAPI.getContacts();
        setContacts(data);
    };

    useEffect(() => { loadContacts(); }, [refreshKey]);

    useEffect(() => {
        const removeStatus = window.electronAPI.onImapStatus((status) => {
            setImapStatus(status);
        });
        return () => removeStatus();
    }, []);

    const handleDelete = async (e, contact) => {
        e.stopPropagation();
        if (confirmDelete === contact.id) {
            await window.electronAPI.deleteContact(contact.id);
            const updated = await window.electronAPI.getContacts();
            setContacts(updated);
            setConfirmDelete(null);
            if (selectedContactId === contact.id) onSelectContact(null);
        } else {
            setConfirmDelete(contact.id);
            setTimeout(() => setConfirmDelete(null), 3000);
        }
    };

    const filteredContacts = contacts.filter(c =>
        c.alias.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                        className="w-full bg-[var(--color-base)] border border-[var(--color-border)] rounded-lg py-2 pl-9 pr-3 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[rgba(212,165,74,0.5)] focus:ring-1 focus:ring-[rgba(212,165,74,0.5)] transition-all"
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
                <div className="px-2.5 pb-2 pt-1 text-[10px] font-medium text-[var(--color-text-secondary)] tracking-widest uppercase" style={{ fontFamily: 'var(--font-mono)' }}>
                    安全联系人 ({contacts.length})
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
                            <FingerprintAvatar id={c.id} alias={c.alias} isSelected={isSelected} />
                            <div className="flex-1 min-w-0">
                                <div className={`font-medium text-sm truncate ${isSelected ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'}`}>
                                    {c.alias}
                                </div>
                                <div className="text-xs text-[var(--color-text-secondary)] truncate" style={{ fontFamily: 'var(--font-mono)' }}>
                                    {c.email}
                                </div>
                            </div>
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
                    <span className="text-[10px] text-[var(--color-text-secondary)]" style={{ fontFamily: 'var(--font-mono)' }}>
                        {imapStatus.connected ? 'IMAP 已连接' : imapStatus.reconnecting ? '正在重连...' : 'IMAP 未连接'}
                    </span>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Verify build succeeds**

Run: `cd "C:/Users/lanzh/Documents/Vibe Coding Works/mailtalker" && npx webpack --mode production 2>&1 | tail -5`

### Task 4: ChatWindow Redesign

**Files:**
- Modify: `src/components/ChatWindow.jsx` (full rewrite)

- [ ] **Step 1: Rewrite `ChatWindow.jsx`**

Key changes:
- Welcome screen: Vertical step cards with amber left border + dashed connectors, pixel-grid bg
- Chat header: Fingerprint ring avatar + expandable encryption badge
- Bubbles: Amber left border on outgoing, border on incoming, `.animate-resolve` on new outgoing
- Toast: Restyled to new palette
- Input: Amber focus ring, amber send button
- Security banner: Pill badge at top of message list

Complete replacement code:

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { Send, ShieldCheck, Zap, Lock, Mail, Users } from 'lucide-react';

function FingerprintAvatar({ id, alias }) {
    const segments = Array.from({ length: 8 }, (_, i) => (id >> i) & 1);
    const gradient = segments.map((lit, i) => {
        const start = i * 45;
        const end = start + 40;
        return lit
            ? `var(--color-accent) ${start}deg ${end}deg, transparent ${end}deg ${start + 45}deg`
            : `transparent ${start}deg ${start + 45}deg`;
    }).join(', ');

    return (
        <div
            className="w-10 h-10 rounded-full flex items-center justify-center p-[2px]"
            style={{ background: `conic-gradient(${gradient})` }}
        >
            <div className="w-full h-full rounded-full bg-[var(--color-accent)] flex items-center justify-center text-[var(--color-base)] text-sm font-bold">
                {alias.charAt(0).toUpperCase()}
            </div>
        </div>
    );
}

export default function ChatWindow({ contact }) {
    const [messages, setMessages] = useState([]);
    const [inputMsg, setInputMsg] = useState('');
    const [sending, setSending] = useState(false);
    const [toast, setToast] = useState(null);
    const [newMsgId, setNewMsgId] = useState(null);
    const scrollRef = useRef(null);
    const contactIdRef = useRef(null);
    const toastTimer = useRef(null);

    const showToast = (message, type = 'error') => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ message, type });
        toastTimer.current = setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
    }, []);

    useEffect(() => {
        if (!contact) {
            setMessages([]);
            contactIdRef.current = null;
            return;
        }
        contactIdRef.current = contact.id;
        window.electronAPI.getMessages(contact.id).then(msgs => {
            if (contactIdRef.current === contact.id) setMessages(msgs);
        });
        const removeIncoming = window.electronAPI.onIncomingMessage((msg) => {
            if (msg.contact_id === contactIdRef.current) {
                setMessages(prev => [...prev, msg]);
            }
        });
        return () => removeIncoming();
    }, [contact?.id]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = async () => {
        if (!inputMsg.trim() || sending) return;
        const text = inputMsg;
        const targetContactId = contact.id;
        setSending(true);
        setInputMsg('');
        try {
            const msg = await window.electronAPI.sendMessage(targetContactId, text);
            if (contactIdRef.current === targetContactId) {
                setNewMsgId(msg.id);
                setMessages(prev => [...prev, msg]);
                setTimeout(() => setNewMsgId(null), 400);
            }
        } catch (err) {
            setInputMsg(text);
            showToast('发送失败: ' + (err.message || err));
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    if (!contact) {
        return (
            <div className="flex-1 flex flex-col bg-[var(--color-base)] font-sans relative overflow-hidden">
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center pixel-grid">
                    <div className="w-16 h-16 bg-[var(--color-accent-muted)] border border-[rgba(212,165,74,0.2)] rounded-2xl flex items-center justify-center mb-6">
                        <ShieldCheck size={32} className="text-[var(--color-accent)]" />
                    </div>
                    <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2 tracking-tight">MailTalker</h1>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-10" style={{ fontFamily: 'var(--font-mono)' }}>
                        隐于像素，藏于邮件
                    </p>

                    <div className="max-w-md w-full text-left space-y-0">
                        {[
                            { icon: Zap, title: '1. 配置节点', desc: '点击侧栏的设置图标，输入你的 IMAP 和 SMTP 邮箱凭据。建议使用应用专用密码以确保安全。' },
                            { icon: Users, title: '2. 建立链接', desc: '添加安全联系人，生成随机 AES-256 密钥。你需要通过安全的线下渠道将密钥分享给对方。' },
                            { icon: Lock, title: '3. 隐秘通信', desc: '输入消息，MailTalker 会将其加密并编码为 PNG 图片，通过邮件发送。' },
                        ].map((step, i) => (
                            <div key={i} className="flex">
                                {/* Left connector line */}
                                <div className="flex flex-col items-center mr-4 w-3">
                                    {i > 0 && <div className="w-px flex-1 border-l border-dashed border-[var(--color-border)]" />}
                                    {i === 0 && <div className="flex-1" />}
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] shrink-0 my-1" />
                                    {i < 2 && <div className="w-px flex-1 border-l border-dashed border-[var(--color-border)]" />}
                                    {i === 2 && <div className="flex-1" />}
                                </div>
                                {/* Card */}
                                <div className="flex-1 bg-[var(--color-surface)] border-l-[3px] border-l-[var(--color-accent)] rounded-lg p-4 mb-3">
                                    <step.icon size={18} className="text-[var(--color-accent)] mb-2" />
                                    <h3 className="text-[var(--color-text-primary)] font-semibold text-sm mb-1">{step.title}</h3>
                                    <p className="text-[var(--color-text-secondary)] text-xs leading-relaxed">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-[var(--color-base)] font-sans h-full relative">
            {/* Header */}
            <div className="h-14 border-b border-[var(--color-border)] flex items-center px-5 shrink-0 bg-[var(--color-surface)] z-10 sticky top-0">
                <div className="flex items-center gap-3">
                    <FingerprintAvatar id={contact.id} alias={contact.alias} />
                    <div>
                        <h2 className="text-[var(--color-text-primary)] font-bold text-sm tracking-tight">{contact.alias}</h2>
                        {/* Encryption badge — expands on hover */}
                        <div className="flex items-center gap-1 text-[var(--color-accent)] group/badge cursor-default">
                            <Lock size={10} />
                            <span
                                className="text-[10px] overflow-hidden whitespace-nowrap transition-all duration-300 max-w-0 group-hover/badge:max-w-[200px] opacity-0 group-hover/badge:opacity-100"
                                style={{ fontFamily: 'var(--font-mono)' }}
                            >
                                AES-256-GCM · E2EE
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Message list */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar scroll-smooth" ref={scrollRef}>
                {/* Security banner */}
                <div className="text-center py-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-accent-muted)] border border-[rgba(212,165,74,0.2)] text-[10px]" style={{ fontFamily: 'var(--font-mono)' }}>
                        <Lock size={10} className="text-[var(--color-accent)]" />
                        <span className="text-[var(--color-accent)]">安全链接已建立</span>
                    </div>
                </div>

                {messages.map((m) => {
                    const isOut = m.direction === 'out';
                    const time = m.timestamp ? new Date(m.timestamp.includes('T') ? m.timestamp : m.timestamp.replace(' ', 'T') + 'Z') : null;
                    const timeStr = time && !isNaN(time) ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                    const isNew = m.id === newMsgId && isOut;
                    return (
                        <div key={m.id} className={`flex w-full ${isOut ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${isNew ? 'animate-resolve' : ''} ${
                                isOut
                                    ? 'bg-[var(--color-bubble-out)] border-l-2 border-l-[var(--color-accent)] rounded-br-sm'
                                    : 'bg-[var(--color-bubble-in)] border border-[var(--color-border)] rounded-bl-sm'
                            }`}>
                                <p className="break-words whitespace-pre-wrap leading-relaxed text-sm text-[var(--color-text-primary)]">{m.text}</p>
                                {timeStr && (
                                    <p className="text-[10px] mt-1 text-right text-[var(--color-text-secondary)]">{timeStr}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Toast */}
            {toast && (
                <div className={`absolute top-16 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl text-xs font-medium border animate-[fadeIn_0.2s_ease-out] ${
                    toast.type === 'error'
                        ? 'bg-[rgba(196,91,74,0.15)] border-[rgba(196,91,74,0.3)] text-[var(--color-danger)]'
                        : 'bg-[rgba(90,154,107,0.15)] border-[rgba(90,154,107,0.3)] text-[var(--color-success)]'
                }`} style={{ fontFamily: 'var(--font-mono)' }}>
                    {toast.message}
                </div>
            )}

            {/* Input area */}
            <div className="p-3 bg-[var(--color-surface)] border-t border-[var(--color-border)] shrink-0">
                <div className="max-w-4xl mx-auto relative">
                    <textarea
                        value={inputMsg}
                        onChange={e => setInputMsg(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`给 ${contact.alias} 发消息...`}
                        className="w-full bg-[var(--color-base)] border border-[var(--color-border)] rounded-xl p-3 pl-4 pr-12 text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] resize-none focus:outline-none focus:border-[rgba(212,165,74,0.5)] focus:ring-1 focus:ring-[rgba(212,165,74,0.5)] transition-all text-sm h-12 overflow-hidden custom-scrollbar leading-relaxed"
                        disabled={sending}
                    />
                    <button
                        onClick={handleSend}
                        disabled={sending || !inputMsg.trim()}
                        className={`absolute right-2 bottom-1.5 p-2 rounded-lg ${
                            sending
                                ? 'text-[var(--color-text-secondary)] bg-transparent'
                                : inputMsg.trim()
                                    ? 'text-[var(--color-base)] bg-[var(--color-accent)] hover:brightness-[1.1] shadow-md shadow-[rgba(212,165,74,0.2)]'
                                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] bg-transparent hover:bg-[var(--color-elevated)]'
                        } transition-all duration-150`}
                    >
                        {sending ? <Mail size={15} className="animate-pulse" /> : <Send size={15} />}
                    </button>
                </div>
                {sending && (
                    <div className="max-w-4xl mx-auto px-4 mt-1.5 h-4 text-[10px] text-[var(--color-accent)] flex items-center gap-1.5" style={{ fontFamily: 'var(--font-mono)' }}>
                        <div className="w-1 h-1 rounded-full bg-[var(--color-accent)] animate-[pulse-fast_0.5s_ease-in-out_infinite]" />
                        正在加密载荷...
                    </div>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Verify build succeeds**

Run: `cd "C:/Users/lanzh/Documents/Vibe Coding Works/mailtalker" && npx webpack --mode production 2>&1 | tail -5`

## Chunk 2: Modals

### Task 5: SettingsModal Redesign

**Files:**
- Modify: `src/components/SettingsModal.jsx` (full rewrite)

- [ ] **Step 1: Rewrite `SettingsModal.jsx`**

Key changes:
- No backdrop blur, `bg-black/70` overlay
- Amber top border on modal
- All inputs → CSS variable colors with amber focus
- Section headers monospace + amber icons
- Save button amber, cancel ghost

```jsx
import React, { useState, useEffect } from 'react';
import { Settings, Server, Lock, X, CheckCircle2 } from 'lucide-react';

export default function SettingsModal({ onClose }) {
    const [settings, setSettings] = useState({
        imap_user: '', imap_pass: '', imap_host: '', imap_port: 993, imap_tls: 1,
        smtp_host: '', smtp_port: 465, smtp_tls: 1,
        smtp_user: '', smtp_pass: ''
    });
    const [isSaved, setIsSaved] = useState(false);
    const [useSeparateSmtp, setUseSeparateSmtp] = useState(false);

    useEffect(() => {
        window.electronAPI.getSettings().then(data => {
            if (data) {
                setSettings(data);
                if (data.smtp_user && data.smtp_user !== data.imap_user) setUseSeparateSmtp(true);
            }
        });
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setIsSaved(false);
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (checked ? 1 : 0) : type === 'number' ? (value === '' ? '' : Number(value)) : value
        }));
    };

    const handleSave = async () => {
        const toSave = {
            ...settings,
            smtp_user: useSeparateSmtp ? settings.smtp_user : settings.imap_user,
            smtp_pass: useSeparateSmtp ? settings.smtp_pass : settings.imap_pass
        };
        await window.electronAPI.saveSettings(toSave);
        setIsSaved(true);
        setTimeout(onClose, 800);
    };

    const inputClass = "w-full bg-[var(--color-base)] border border-[var(--color-border)] rounded-lg py-2 px-3 text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-[rgba(212,165,74,0.5)] focus:border-[rgba(212,165,74,0.5)] transition-all text-sm";
    const monoInputClass = inputClass + " font-mono";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-[var(--color-surface)] border-t-2 border-t-[var(--color-accent)] border border-[var(--color-border)] shadow-2xl rounded-2xl overflow-hidden animate-[fadeIn_0.15s_ease-out]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-[var(--color-accent-muted)] text-[var(--color-accent)] rounded-lg">
                            <Settings size={18} />
                        </div>
                        <h2 className="text-base font-semibold text-[var(--color-text-primary)] tracking-tight">节点配置</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-elevated)] rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">

                    {/* Credentials */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-accent)] tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>
                            <Lock size={12} /> 登录凭据
                        </div>
                        <div className="space-y-2.5">
                            <div>
                                <label className="block text-[10px] text-[var(--color-text-secondary)] mb-1 ml-1 uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>邮箱 / 用户名</label>
                                <input type="text" name="imap_user" value={settings.imap_user || ''} onChange={handleChange} placeholder="user@example.com" className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-[10px] text-[var(--color-text-secondary)] mb-1 ml-1 uppercase tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>应用专用密码</label>
                                <input type="password" name="imap_pass" value={settings.imap_pass || ''} onChange={handleChange} placeholder="••••••••••••" className={inputClass} />
                            </div>
                        </div>
                    </section>

                    <div className="h-px bg-[var(--color-border)]" />

                    {/* Protocol config */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-accent)] tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>
                            <Server size={12} /> 协议配置
                        </div>

                        {/* IMAP */}
                        <div className="bg-[var(--color-base)] p-4 rounded-lg border border-[var(--color-border)] space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-mono)' }}>IMAP（收信）</span>
                                <label className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-secondary)] cursor-pointer hover:text-[var(--color-text-primary)] transition-colors">
                                    <input type="checkbox" name="imap_tls" checked={settings.imap_tls === 1} onChange={handleChange} className="w-3 h-3 accent-[var(--color-accent)] rounded" />
                                    强制 TLS
                                </label>
                            </div>
                            <div className="flex gap-2.5">
                                <div className="flex-1">
                                    <label className="block text-[10px] text-[var(--color-text-secondary)] mb-1 ml-1" style={{ fontFamily: 'var(--font-mono)' }}>服务器</label>
                                    <input type="text" name="imap_host" value={settings.imap_host || ''} onChange={handleChange} placeholder="imap.example.com" className={monoInputClass} />
                                </div>
                                <div className="w-20">
                                    <label className="block text-[10px] text-[var(--color-text-secondary)] mb-1 ml-1" style={{ fontFamily: 'var(--font-mono)' }}>端口</label>
                                    <input type="number" name="imap_port" value={settings.imap_port || 993} onChange={handleChange} className={monoInputClass} />
                                </div>
                            </div>
                        </div>

                        {/* SMTP */}
                        <div className="bg-[var(--color-base)] p-4 rounded-lg border border-[var(--color-border)] space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-[var(--color-accent)]" style={{ fontFamily: 'var(--font-mono)' }}>SMTP（发信）</span>
                                <label className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-secondary)] cursor-pointer hover:text-[var(--color-text-primary)] transition-colors">
                                    <input type="checkbox" name="smtp_tls" checked={settings.smtp_tls === 1} onChange={handleChange} className="w-3 h-3 accent-[var(--color-accent)] rounded" />
                                    要求 TLS
                                </label>
                            </div>
                            <div className="flex gap-2.5">
                                <div className="flex-1">
                                    <label className="block text-[10px] text-[var(--color-text-secondary)] mb-1 ml-1" style={{ fontFamily: 'var(--font-mono)' }}>服务器</label>
                                    <input type="text" name="smtp_host" value={settings.smtp_host || ''} onChange={handleChange} placeholder="smtp.example.com" className={monoInputClass} />
                                </div>
                                <div className="w-20">
                                    <label className="block text-[10px] text-[var(--color-text-secondary)] mb-1 ml-1" style={{ fontFamily: 'var(--font-mono)' }}>端口</label>
                                    <input type="number" name="smtp_port" value={settings.smtp_port || 465} onChange={handleChange} className={monoInputClass} />
                                </div>
                            </div>
                        </div>

                        {/* Separate SMTP credentials */}
                        <div className="space-y-2.5">
                            <label className="flex items-center gap-2 text-[10px] text-[var(--color-text-secondary)] cursor-pointer hover:text-[var(--color-text-primary)] transition-colors">
                                <input
                                    type="checkbox"
                                    checked={useSeparateSmtp}
                                    onChange={(e) => setUseSeparateSmtp(e.target.checked)}
                                    className="w-3 h-3 accent-[var(--color-accent)] rounded"
                                />
                                使用独立的 SMTP 凭据
                            </label>

                            {useSeparateSmtp && (
                                <div className="bg-[var(--color-base)] p-4 rounded-lg border border-[var(--color-border)] space-y-2.5 animate-[fadeIn_0.2s_ease-out]">
                                    <div>
                                        <label className="block text-[10px] text-[var(--color-text-secondary)] mb-1 ml-1" style={{ fontFamily: 'var(--font-mono)' }}>SMTP 用户名</label>
                                        <input type="text" name="smtp_user" value={settings.smtp_user || ''} onChange={handleChange} placeholder="smtp-user@example.com" className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-[var(--color-text-secondary)] mb-1 ml-1" style={{ fontFamily: 'var(--font-mono)' }}>SMTP 密码</label>
                                        <input type="password" name="smtp_pass" value={settings.smtp_pass || ''} onChange={handleChange} placeholder="••••••••••••" className={inputClass} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex justify-end gap-2.5 items-center">
                    {isSaved && (
                        <span className="text-[var(--color-success)] text-xs flex items-center gap-1 mr-auto" style={{ fontFamily: 'var(--font-mono)' }}>
                            <CheckCircle2 size={14} /> 保存成功
                        </span>
                    )}
                    <button onClick={onClose} className="px-4 py-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)] rounded-lg transition-colors text-sm">
                        取消
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-5 py-1.5 bg-[var(--color-accent)] hover:brightness-[1.1] text-[var(--color-base)] rounded-lg shadow-md shadow-[rgba(212,165,74,0.2)] transition-all text-sm font-medium"
                    >
                        保存配置
                    </button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Verify build succeeds**

Run: `cd "C:/Users/lanzh/Documents/Vibe Coding Works/mailtalker" && npx webpack --mode production 2>&1 | tail -5`

### Task 6: AddContactModal Redesign

**Files:**
- Modify: `src/components/AddContactModal.jsx` (full rewrite)

- [ ] **Step 1: Rewrite `AddContactModal.jsx`**

Key changes:
- Same modal chrome as Settings (amber top border, no blur)
- Key input section wrapped in `.pixel-grid` panel
- Generate/copy buttons in amber outlined style
- All inputs → new palette

```jsx
import React, { useState } from 'react';
import { UserPlus, Key, Mail, X, AlertCircle, Copy, Check } from 'lucide-react';

export default function AddContactModal({ onClose, onAdded }) {
    const [contact, setContact] = useState({ email: '', alias: '', sharedKey: '' });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopyKey = async () => {
        if (!contact.sharedKey) return;
        try {
            await navigator.clipboard.writeText(contact.sharedKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setError('复制失败，请手动选择复制');
        }
    };

    const handleGenerateKey = async () => {
        const key = await window.electronAPI.generateKey();
        setContact(prev => ({ ...prev, sharedKey: key }));
        setError('');
    };

    const validateKey = (key) => {
        const cleaned = key.replace(/\s/g, '').toLowerCase();
        if (!/^[0-9a-f]*$/.test(cleaned)) return '密钥只能包含十六进制字符 (0-9, a-f)';
        if (cleaned.length !== 64) return `密钥必须为 64 个十六进制字符（当前 ${cleaned.length} 个）`;
        return '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!contact.email || !contact.alias || !contact.sharedKey) return;
        const keyError = validateKey(contact.sharedKey);
        if (keyError) { setError(keyError); return; }
        setSubmitting(true);
        setError('');
        try {
            await window.electronAPI.addContact(contact);
            if (onAdded) onAdded();
            onClose();
        } catch (err) {
            setError(err.message || '添加联系人失败');
        } finally {
            setSubmitting(false);
        }
    };

    const inputClass = "w-full bg-[var(--color-base)] border border-[var(--color-border)] rounded-lg py-2.5 px-4 pl-10 text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-[rgba(212,165,74,0.5)] focus:border-[rgba(212,165,74,0.5)] transition-all text-sm";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />

            <div className="relative w-full max-w-md bg-[var(--color-surface)] border-t-2 border-t-[var(--color-accent)] border border-[var(--color-border)] shadow-2xl rounded-2xl overflow-hidden animate-[fadeIn_0.15s_ease-out]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-[var(--color-accent-muted)] text-[var(--color-accent)] rounded-lg">
                            <UserPlus size={18} />
                        </div>
                        <h2 className="text-base font-semibold text-[var(--color-text-primary)] tracking-tight">建立安全链接</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-elevated)] rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-[var(--color-text-secondary)] tracking-wider uppercase" style={{ fontFamily: 'var(--font-mono)' }}>联系人昵称</label>
                        <div className="relative">
                            <input
                                type="text"
                                required
                                value={contact.alias}
                                onChange={e => setContact({ ...contact, alias: e.target.value })}
                                placeholder="例如：小明"
                                className={inputClass + " font-medium"}
                            />
                            <UserPlus size={14} className="absolute left-3.5 top-3 text-[var(--color-text-secondary)]" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-[var(--color-text-secondary)] tracking-wider uppercase" style={{ fontFamily: 'var(--font-mono)' }}>邮箱地址</label>
                        <div className="relative">
                            <input
                                type="email"
                                required
                                value={contact.email}
                                onChange={e => setContact({ ...contact, email: e.target.value })}
                                placeholder="friend@example.com"
                                className={inputClass}
                            />
                            <Mail size={14} className="absolute left-3.5 top-3 text-[var(--color-text-secondary)]" />
                        </div>
                    </div>

                    {/* Key section with pixel-grid background */}
                    <div className="space-y-1.5 pt-1">
                        <label className="text-[10px] font-medium text-[var(--color-accent)] tracking-wider uppercase" style={{ fontFamily: 'var(--font-mono)' }}>端对端加密密钥</label>
                        <p className="text-[10px] text-[var(--color-text-secondary)]">此 AES-256 密钥需要通过安全的线下渠道分享给对方。</p>
                        <div className="pixel-grid p-3 rounded-lg border border-[var(--color-border)]">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        required
                                        value={contact.sharedKey}
                                        onChange={e => { setContact({ ...contact, sharedKey: e.target.value }); setError(''); }}
                                        placeholder="64 个十六进制字符..."
                                        className={`w-full bg-[var(--color-base)] border rounded-lg py-2.5 px-4 pl-10 placeholder-[var(--color-text-secondary)] focus:outline-none focus:ring-1 transition-all text-xs text-[var(--color-accent)] ${
                                            error ? 'border-[rgba(196,91,74,0.5)] focus:ring-[rgba(196,91,74,0.5)]' : 'border-[var(--color-border)] focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)]/50'
                                        }`}
                                        style={{ fontFamily: 'var(--font-mono)' }}
                                    />
                                    <Key size={14} className="absolute left-3.5 top-2.5 text-[var(--color-text-secondary)]" />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleGenerateKey}
                                    className="px-3 py-2 border border-[rgba(212,165,74,0.3)] hover:bg-[var(--color-accent-muted)] text-[var(--color-accent)] text-xs font-medium rounded-lg transition-colors shrink-0"
                                >
                                    生成
                                </button>
                                {contact.sharedKey && (
                                    <button
                                        type="button"
                                        onClick={handleCopyKey}
                                        className={`p-2 rounded-lg border transition-all shrink-0 ${
                                            copied
                                                ? 'bg-[rgba(90,154,107,0.15)] border-[rgba(90,154,107,0.3)] text-[var(--color-success)]'
                                                : 'border-[var(--color-border)] hover:border-[rgba(212,165,74,0.3)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]'
                                        }`}
                                        title="复制密钥"
                                    >
                                        {copied ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                )}
                            </div>
                        </div>
                        {error && (
                            <div className="flex items-center gap-1.5 text-[var(--color-danger)] text-[10px] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
                                <AlertCircle size={11} />
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="pt-3 flex gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 px-4 text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)] rounded-lg border border-[var(--color-border)] transition-colors text-sm"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 py-2 px-4 bg-[var(--color-accent)] hover:brightness-[1.1] disabled:opacity-50 text-[var(--color-base)] rounded-lg shadow-md shadow-[rgba(212,165,74,0.2)] transition-all text-sm font-medium"
                        >
                            {submitting ? '添加中...' : '添加联系人'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Verify build succeeds**

Run: `cd "C:/Users/lanzh/Documents/Vibe Coding Works/mailtalker" && npx webpack --mode production 2>&1 | tail -5`

### Task 7: Run Tests + Final Verification

- [ ] **Step 1: Run existing protocol tests**

Run: `cd "C:/Users/lanzh/Documents/Vibe Coding Works/mailtalker" && npx jest --no-cache`
Expected: All 4 tests pass (no logic changes were made)

- [ ] **Step 2: Run production build**

Run: `cd "C:/Users/lanzh/Documents/Vibe Coding Works/mailtalker" && npx webpack --mode production 2>&1`
Expected: Build succeeds with no errors
