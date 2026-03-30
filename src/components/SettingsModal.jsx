import React, { useState, useEffect } from 'react';
import { Settings, Server, Lock, X, CheckCircle2, ChevronDown, Eye } from 'lucide-react';

const EMAIL_PRESETS = {
    custom: { label: '自定义', imap_host: '', imap_port: 993, imap_tls: 1, smtp_host: '', smtp_port: 465, smtp_tls: 1 },
    gmail: { label: 'Gmail', imap_host: 'imap.gmail.com', imap_port: 993, imap_tls: 1, smtp_host: 'smtp.gmail.com', smtp_port: 465, smtp_tls: 1 },
    outlook: { label: 'Outlook / Hotmail', imap_host: 'outlook.office365.com', imap_port: 993, imap_tls: 1, smtp_host: 'smtp.office365.com', smtp_port: 587, smtp_tls: 1 },
    qq: { label: 'QQ 邮箱', imap_host: 'imap.qq.com', imap_port: 993, imap_tls: 1, smtp_host: 'smtp.qq.com', smtp_port: 465, smtp_tls: 1 },
    '163': { label: '网易 163', imap_host: 'imap.163.com', imap_port: 993, imap_tls: 1, smtp_host: 'smtp.163.com', smtp_port: 465, smtp_tls: 1 },
    yahoo: { label: 'Yahoo', imap_host: 'imap.mail.yahoo.com', imap_port: 993, imap_tls: 1, smtp_host: 'smtp.mail.yahoo.com', smtp_port: 465, smtp_tls: 1 },
};

export default function SettingsModal({ onClose }) {
    const [settings, setSettings] = useState({
        imap_user: '', imap_pass: '', imap_host: '', imap_port: 993, imap_tls: 1,
        smtp_host: '', smtp_port: 465, smtp_tls: 1,
        smtp_user: '', smtp_pass: '', mail_subject: '[*MT-SecMSG*]'
    });
    const [isSaved, setIsSaved] = useState(false);
    const [useSeparateSmtp, setUseSeparateSmtp] = useState(false);
    const [hasImapPass, setHasImapPass] = useState(false);
    const [hasSmtpPass, setHasSmtpPass] = useState(false);
    const [provider, setProvider] = useState('custom');

    useEffect(() => {
        window.electronAPI.getSettings().then(data => {
            if (data) {
                setSettings({
                    ...data,
                    imap_pass: '',
                    smtp_pass: '',
                    mail_subject: data.mail_subject || '[*MT-SecMSG*]'
                });
                setHasImapPass(!!data.has_imap_pass);
                setHasSmtpPass(!!data.has_smtp_pass);
                if (data.smtp_user && data.smtp_user !== data.imap_user) setUseSeparateSmtp(true);
                // Detect current provider
                const match = Object.entries(EMAIL_PRESETS).find(([k, v]) => k !== 'custom' && v.imap_host === data.imap_host);
                if (match) setProvider(match[0]);
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

    const handleProviderChange = (key) => {
        setProvider(key);
        if (key !== 'custom') {
            const preset = EMAIL_PRESETS[key];
            setSettings(prev => ({ ...prev, ...preset }));
        }
        setIsSaved(false);
    };

    const handleSave = async () => {
        const toSave = {
            ...settings,
            smtp_user: useSeparateSmtp ? settings.smtp_user : settings.imap_user,
            smtp_pass: useSeparateSmtp ? settings.smtp_pass : settings.imap_pass,
            useSeparateSmtp
        };
        await window.electronAPI.saveSettings(toSave);
        setIsSaved(true);
        if (settings.imap_pass) setHasImapPass(true);
        if (settings.smtp_pass) setHasSmtpPass(true);
        setTimeout(onClose, 800);
    };

    const inputClass = "w-full bg-[var(--color-base)] border border-[var(--color-border)] rounded-lg py-2 px-3 text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[rgba(212,165,74,0.5)] focus:border-[rgba(212,165,74,0.5)] transition-all text-sm";
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

                    {/* Provider Preset */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-accent)] tracking-wider font-mono">
                            <Server size={12} /> 快速选择邮箱
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                            {Object.entries(EMAIL_PRESETS).map(([key, val]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => handleProviderChange(key)}
                                    className={`py-1.5 px-2 text-[11px] rounded-lg border transition-all font-medium ${
                                        provider === key
                                            ? 'bg-[var(--color-accent-muted)] border-[rgba(212,165,74,0.4)] text-[var(--color-accent)]'
                                            : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[rgba(212,165,74,0.3)] hover:text-[var(--color-text-primary)]'
                                    }`}
                                >
                                    {val.label}
                                </button>
                            ))}
                        </div>
                    </section>

                    <div className="h-px bg-[var(--color-border)]" />

                    {/* Credentials */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-accent)] tracking-wider font-mono">
                            <Lock size={12} /> 登录凭据
                        </div>
                        <div className="space-y-2.5">
                            <div>
                                <label className="block text-[10px] text-[var(--color-text-secondary)] mb-1 ml-1 uppercase tracking-wider font-mono">邮箱 / 用户名</label>
                                <input type="text" name="imap_user" value={settings.imap_user || ''} onChange={handleChange} placeholder="user@example.com" className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-[10px] text-[var(--color-text-secondary)] mb-1 ml-1 uppercase tracking-wider font-mono">应用专用密码</label>
                                <input
                                    type="password"
                                    name="imap_pass"
                                    value={settings.imap_pass || ''}
                                    onChange={handleChange}
                                    placeholder={hasImapPass ? '••••••••（已配置，留空保持不变）' : '••••••••••••'}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </section>

                    <div className="h-px bg-[var(--color-border)]" />

                    {/* Protocol config */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-accent)] tracking-wider font-mono">
                            <Server size={12} /> 协议配置
                        </div>

                        {/* IMAP */}
                        <div className="bg-[var(--color-base)] p-4 rounded-lg border border-[var(--color-border)] space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-[var(--color-accent)] font-mono">IMAP（收信）</span>
                                <label className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-secondary)] cursor-pointer hover:text-[var(--color-text-primary)] transition-colors">
                                    <input type="checkbox" name="imap_tls" checked={settings.imap_tls === 1} onChange={handleChange} className="w-3 h-3 accent-[var(--color-accent)] rounded" />
                                    强制 TLS
                                </label>
                            </div>
                            <div className="flex gap-2.5">
                                <div className="flex-1">
                                    <label className="block text-[10px] text-[var(--color-text-secondary)] mb-1 ml-1 font-mono">服务器</label>
                                    <input type="text" name="imap_host" value={settings.imap_host || ''} onChange={handleChange} placeholder="imap.example.com" className={monoInputClass} />
                                </div>
                                <div className="w-20">
                                    <label className="block text-[10px] text-[var(--color-text-secondary)] mb-1 ml-1 font-mono">端口</label>
                                    <input type="number" name="imap_port" value={settings.imap_port || 993} onChange={handleChange} className={monoInputClass} />
                                </div>
                            </div>
                        </div>

                        {/* SMTP */}
                        <div className="bg-[var(--color-base)] p-4 rounded-lg border border-[var(--color-border)] space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-[var(--color-accent)] font-mono">SMTP（发信）</span>
                                <label className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-secondary)] cursor-pointer hover:text-[var(--color-text-primary)] transition-colors">
                                    <input type="checkbox" name="smtp_tls" checked={settings.smtp_tls === 1} onChange={handleChange} className="w-3 h-3 accent-[var(--color-accent)] rounded" />
                                    要求 TLS
                                </label>
                            </div>
                            <div className="flex gap-2.5">
                                <div className="flex-1">
                                    <label className="block text-[10px] text-[var(--color-text-secondary)] mb-1 ml-1 font-mono">服务器</label>
                                    <input type="text" name="smtp_host" value={settings.smtp_host || ''} onChange={handleChange} placeholder="smtp.example.com" className={monoInputClass} />
                                </div>
                                <div className="w-20">
                                    <label className="block text-[10px] text-[var(--color-text-secondary)] mb-1 ml-1 font-mono">端口</label>
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
                                        <label className="block text-[10px] text-[var(--color-text-secondary)] mb-1 ml-1 font-mono">SMTP 用户名</label>
                                        <input type="text" name="smtp_user" value={settings.smtp_user || ''} onChange={handleChange} placeholder="smtp-user@example.com" className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-[var(--color-text-secondary)] mb-1 ml-1 font-mono">SMTP 密码</label>
                                        <input
                                            type="password"
                                            name="smtp_pass"
                                            value={settings.smtp_pass || ''}
                                            onChange={handleChange}
                                            placeholder={hasSmtpPass ? '••••••••（已配置，留空保持不变）' : '••••••••••••'}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    <div className="h-px bg-[var(--color-border)]" />

                    {/* Advanced */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-accent)] tracking-wider font-mono">
                            <Eye size={12} /> 高级设置
                        </div>
                        <div>
                            <label className="block text-[10px] text-[var(--color-text-secondary)] mb-1 ml-1 uppercase tracking-wider font-mono">邮件主题行</label>
                            <input
                                type="text"
                                name="mail_subject"
                                value={settings.mail_subject || ''}
                                onChange={handleChange}
                                placeholder="[*MT-SecMSG*]"
                                className={monoInputClass}
                            />
                            <p className="text-[10px] text-[var(--color-text-secondary)] mt-1 ml-1">自定义发送邮件的主题行，双方需保持一致才能正常收信。</p>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex justify-end gap-2.5 items-center">
                    {isSaved && (
                        <span className="text-[var(--color-success)] text-xs flex items-center gap-1 mr-auto font-mono">
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
