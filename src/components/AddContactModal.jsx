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

    const inputClass = "w-full bg-[var(--color-base)] border border-[var(--color-border)] rounded-lg py-2.5 px-4 pl-10 text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[rgba(212,165,74,0.5)] focus:border-[rgba(212,165,74,0.5)] transition-all text-sm";

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
                        <label className="text-[10px] font-medium text-[var(--color-text-secondary)] tracking-wider uppercase font-mono">联系人昵称</label>
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
                        <label className="text-[10px] font-medium text-[var(--color-text-secondary)] tracking-wider uppercase font-mono">邮箱地址</label>
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
                        <label className="text-[10px] font-medium text-[var(--color-accent)] tracking-wider uppercase font-mono">端对端加密密钥</label>
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
                                        className={`font-mono w-full bg-[var(--color-base)] border rounded-lg py-2.5 px-4 pl-10 focus:outline-none focus:ring-1 transition-all text-xs text-[var(--color-accent)] ${
                                            error ? 'border-[rgba(196,91,74,0.5)] focus:ring-[rgba(196,91,74,0.5)]' : 'border-[var(--color-border)] focus:ring-[rgba(212,165,74,0.5)] focus:border-[rgba(212,165,74,0.5)]'
                                        }`}
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
                            <div className="flex items-center gap-1.5 text-[var(--color-danger)] text-[10px] mt-1 font-mono">
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
