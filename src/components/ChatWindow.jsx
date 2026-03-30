import React, { useState, useEffect, useRef } from 'react';
import { Send, ShieldCheck, Zap, Lock, Mail, Users, RotateCw } from 'lucide-react';
import FingerprintAvatar from './FingerprintAvatar';

function parseTimestamp(ts) {
    if (!ts) return null;
    const date = new Date(ts.includes('T') ? ts : ts.replace(' ', 'T') + 'Z');
    return isNaN(date) ? null : date;
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
    const newMsgTimer = useRef(null);

    const showToast = (message, type = 'error') => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ message, type });
        toastTimer.current = setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        return () => {
            if (toastTimer.current) clearTimeout(toastTimer.current);
            if (newMsgTimer.current) clearTimeout(newMsgTimer.current);
        };
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
        window.electronAPI.markRead(contact.id);
        const removeIncoming = window.electronAPI.onIncomingMessage((msg) => {
            if (msg.contact_id === contactIdRef.current) {
                setMessages(prev => [...prev, msg]);
            }
        });
        const removeStatusUpdate = window.electronAPI.onMessageStatusUpdate((data) => {
            setMessages(prev => {
                const idx = prev.findIndex(m => m.id === data.id);
                if (idx === -1) return prev;
                const next = [...prev];
                next[idx] = { ...next[idx], status: data.status };
                return next;
            });
        });
        const removeSecurityWarning = window.electronAPI.onSecurityWarning((msg) => {
            showToast(msg, 'error');
        });
        return () => {
            removeIncoming();
            removeStatusUpdate();
            removeSecurityWarning();
        };
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
                if (newMsgTimer.current) clearTimeout(newMsgTimer.current);
                newMsgTimer.current = setTimeout(() => setNewMsgId(null), 400);
                if (msg.status === 'failed') {
                    showToast('消息已保存但发送失败，可点击重试: ' + (msg.error || ''), 'error');
                }
            }
        } catch (err) {
            setInputMsg(text);
            showToast('发送失败: ' + (err.message || err));
        } finally {
            setSending(false);
        }
    };

    const handleRetry = async (msgId) => {
        try {
            const result = await window.electronAPI.retryMessage(msgId);
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: result.status } : m));
            showToast('重发成功', 'success');
        } catch (err) {
            showToast('重发失败: ' + (err.message || err));
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
                    <p className="text-sm text-[var(--color-text-secondary)] mb-10 font-mono">
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
                                className="font-mono text-[10px] overflow-hidden whitespace-nowrap transition-all duration-300 max-w-0 group-hover/badge:max-w-[200px] opacity-0 group-hover/badge:opacity-100"
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
                    <div className="font-mono inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-accent-muted)] border border-[rgba(212,165,74,0.2)] text-[10px]">
                        <Lock size={10} className="text-[var(--color-accent)]" />
                        <span className="text-[var(--color-accent)]">安全链接已建立</span>
                    </div>
                </div>

                {messages.map((m) => {
                    const isOut = m.direction === 'out';
                    const time = parseTimestamp(m.timestamp);
                    const timeStr = time ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                    const isNew = m.id === newMsgId && isOut;
                    const isFailed = m.status === 'failed';
                    const isPending = m.status === 'pending';
                    return (
                        <div key={m.id} className={`flex w-full ${isOut ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${isNew ? 'animate-resolve' : ''} ${
                                isOut
                                    ? `${isFailed ? 'bg-[rgba(196,91,74,0.1)] border border-[rgba(196,91,74,0.3)]' : 'bg-[var(--color-bubble-out)] border-l-2 border-l-[var(--color-accent)]'} rounded-br-sm`
                                    : 'bg-[var(--color-bubble-in)] border border-[var(--color-border)] rounded-bl-sm'
                            }`}>
                                <p className="break-words whitespace-pre-wrap leading-relaxed text-sm text-[var(--color-text-primary)]">{m.text}</p>
                                <div className="flex items-center justify-end gap-1.5 mt-1">
                                    {isFailed && (
                                        <button
                                            onClick={() => handleRetry(m.id)}
                                            className="font-mono flex items-center gap-1 text-[10px] text-[var(--color-danger)] hover:text-[var(--color-text-primary)] transition-colors"
                                            title="点击重试"
                                        >
                                            <RotateCw size={10} />
                                            发送失败
                                        </button>
                                    )}
                                    {isPending && (
                                        <span className="font-mono text-[10px] text-[var(--color-accent)]">
                                            发送中...
                                        </span>
                                    )}
                                    {timeStr && (
                                        <p className="text-[10px] text-right text-[var(--color-text-secondary)]">{timeStr}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Toast */}
            {toast && (
                <div className={`font-mono absolute top-16 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl text-xs font-medium border animate-[fadeIn_0.2s_ease-out] ${
                    toast.type === 'error'
                        ? 'bg-[rgba(196,91,74,0.15)] border-[rgba(196,91,74,0.3)] text-[var(--color-danger)]'
                        : 'bg-[rgba(90,154,107,0.15)] border-[rgba(90,154,107,0.3)] text-[var(--color-success)]'
                }`}>
                    {toast.message}
                </div>
            )}

            {/* Input area */}
            <div className="p-3 bg-[var(--color-surface)] border-t border-[var(--color-border)] shrink-0">
                <div className="max-w-4xl mx-auto relative">
                    <textarea
                        maxLength={10000}
                        value={inputMsg}
                        onChange={e => setInputMsg(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`给 ${contact.alias} 发消息...`}
                        className="w-full bg-[var(--color-base)] border border-[var(--color-border)] rounded-xl p-3 pl-4 pr-12 text-[var(--color-text-primary)] resize-none focus:outline-none focus:border-[rgba(212,165,74,0.5)] focus:ring-1 focus:ring-[rgba(212,165,74,0.5)] transition-all text-sm h-12 overflow-hidden custom-scrollbar leading-relaxed"
                        disabled={sending}
                    />
                    {inputMsg.length >= 9500 && (
                        <div className="absolute right-12 bottom-3 text-[10px] text-[var(--color-danger)] font-mono">
                            {inputMsg.length}/10000
                        </div>
                    )}
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
                    <div className="font-mono max-w-4xl mx-auto px-4 mt-1.5 h-4 text-[10px] text-[var(--color-accent)] flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-[var(--color-accent)] animate-[pulse-fast_0.5s_ease-in-out_infinite]" />
                        正在加密载荷...
                    </div>
                )}
            </div>
        </div>
    );
}
