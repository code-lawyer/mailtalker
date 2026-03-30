import React from 'react';

export default function FingerprintAvatar({ id, alias, size = 'w-10 h-10', isSelected = false }) {
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
            className={`${size} rounded-full flex items-center justify-center p-[2px]`}
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
    );
}
