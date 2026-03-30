---
title: "MailTalker UI Redesign: Covert Elegance"
date: "2026-03-16"
status: "Approved"
---

# MailTalker UI Redesign

## Design Language: Covert Elegance

A refined dark communication tool with cryptographic visual elements woven throughout. On the surface, it's a polished modern app; beneath, pixel textures, amber encryption indicators, and encoding animations reveal its true nature to those who know what they're looking at.

## Color System

| Role | Value | Usage |
|------|-------|-------|
| Base | `#0C0E12` | Main background (chat area, app root) |
| Surface | `#14171E` | Sidebar, cards, modal backgrounds, input fields |
| Elevated | `#1C2029` | Hover states, selected states, active elements |
| Border | `#252A35` | Dividers, borders, separators |
| Text Primary | `#E8E2D6` | Primary text (warm white) |
| Text Secondary | `#7A7468` | Secondary text, labels, placeholders |
| Accent | `#D4A54A` | Encryption status, key actions, brand color |
| Accent Muted | `rgba(212,165,74,0.15)` | Amber background states, subtle highlights |
| Outgoing Bubble | `#1A1D26` | Sent messages, with 2px amber left border |
| Incoming Bubble | `#12141A` | Received messages, with 1px border-color border |
| Danger | `#C45B4A` | Errors, delete confirmation, toast errors |
| Success | `#5A9A6B` | IMAP connected status, success toasts |

## Typography

- **UI text**: System sans-serif (`-apple-system, "Segoe UI", sans-serif`)
- **Crypto elements** (key display, status labels, email addresses): `"SF Mono", "Cascadia Code", "Consolas", monospace`

## Tailwind Integration

CSS custom properties are defined in `index.css` `:root`. Components use Tailwind arbitrary value syntax to reference them: `bg-[var(--color-base)]`, `text-[var(--color-text-primary)]`, `border-[var(--color-border)]`, etc. This keeps the single-source-of-truth in CSS variables while staying within Tailwind's utility-class workflow. No Tailwind config extension needed.

Text selection colors: `selection:bg-[var(--color-accent-muted)] selection:text-[var(--color-accent)]` on the root container.

## Layout

Classic two-column: **280px sidebar** (changed from current 320px to give more room to the chat area) + flex-1 chat area. Identity conveyed through visual language, not structural novelty.

```
+--------------------+----------------------------------+
| Sidebar (280px)    | Chat Area (flex-1)               |
|                    |                                  |
| [Brand + Settings] | [Top bar: avatar + name + lock]  |
| (pixel texture bg) |----------------------------------|
|                    |                                  |
| [Search]           | Message list                     |
| [+ New Link]       | (pixel encode animation on send) |
|                    |                                  |
| Contact list       |                                  |
| (fingerprint ring  |----------------------------------|
|  avatars)          | [Input area]                     |
|                    | [textarea] [send button]         |
| [Pulse status bar] | Send status indicator            |
+--------------------+----------------------------------+
|                    | (No contact: guided welcome)     |
+--------------------+----------------------------------+
```

## Cryptographic Visual Elements

These are the core differentiators. Present throughout but never distracting.

### 1. Pixel Grid Texture

CSS-generated subtle pixel grid pattern used as background on the sidebar header and welcome screen. Concrete implementation:

```css
.pixel-grid {
  background-image:
    linear-gradient(45deg, rgba(212,165,74,0.03) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(212,165,74,0.03) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(212,165,74,0.03) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(212,165,74,0.03) 75%);
  background-size: 4px 4px;
  background-position: 0 0, 0 2px, 2px -2px, -2px 0px;
}
```

This creates a checkerboard micro-pattern in extremely subtle amber, evoking pixel data encoding.

### 2. Fingerprint Ring Avatars

Contact avatars: circular initial in the center, surrounded by a segmented arc ring in amber.

**Specification:**
- Ring: 8 total segments, each 40deg with 5deg gaps between them
- Ring width: 2px, positioned 2px outside the avatar circle
- Segments "lit" (amber) or "unlit" (transparent): determined by contact's `id`. Use `id` bits: `(id >> segmentIndex) & 1` to decide each segment. This gives a unique fingerprint pattern per contact.
- Implementation: React inline style on a wrapper `<div>` using `conic-gradient`. Each segment is either `var(--color-accent)` or `transparent`. The wrapper has `border-radius: 50%` and is slightly larger than the inner avatar circle.

Example for id=42 (binary 00101010 → segments 1,3,5 lit):
```jsx
// Computed in component:
const segments = Array.from({length: 8}, (_, i) => (id >> i) & 1);
const gradient = segments.map((lit, i) => {
  const start = i * 45; // 360/8 = 45deg per slot
  const end = start + 40; // 40deg segment + 5deg gap
  return lit
    ? `var(--color-accent) ${start}deg ${end}deg, transparent ${end}deg ${start + 45}deg`
    : `transparent ${start}deg ${start + 45}deg`;
}).join(', ');
// style={{ background: `conic-gradient(${gradient})` }}
```

### 3. Message Send Animation

When a message is sent, the chat bubble uses a single chosen approach: **opacity + blur resolve**.

- New outgoing message enters with `opacity: 0; filter: blur(4px)` and transitions to `opacity: 1; filter: blur(0)` over 0.3s with `ease-out` timing.
- This suggests the "data resolving from encrypted state" without complex pixelation logic.
- Applied via a CSS class `animate-resolve` that is added on mount and uses `@keyframes`.

```css
@keyframes msg-resolve {
  from { opacity: 0; filter: blur(4px); transform: translateY(4px); }
  to { opacity: 1; filter: blur(0); transform: translateY(0); }
}
.animate-resolve { animation: msg-resolve 0.3s ease-out; }
```

### 4. Pulse Status Bar

Sidebar footer replaces text-only IMAP status with a visual pulse indicator:
- **Connected**: Success green (`--color-success`) bar with slow breathing glow (2s cycle). Green is the universal convention for "connected" — amber is reserved for brand/crypto elements, not connection state.
- **Disconnected**: Gray bar (`--color-text-secondary`), static, no animation
- **Reconnecting**: Amber bar (`--color-accent`) with fast pulse (0.5s cycle), indicating active effort

Accompanied by small monospace status text beside the bar.

### 5. Encryption Badge

Chat header shows a small lock icon next to the contact name. **Replaces the current static "端对端加密 E2EE" text** with a compact interactive version:
- Default state: Lock icon only (16px)
- Hover state: Expands rightward to reveal `AES-256-GCM · E2EE` in monospace font
- CSS transition: `max-width` from `20px` to `200px` over 0.3s, `overflow: hidden`, `white-space: nowrap`

## Component Specifications

### Sidebar (`ContactList.jsx`)

- Width: **280px** (reduced from current 320px `w-80`), full height, `bg-[var(--color-surface)]`
- **Header**: Brand area with `.pixel-grid` texture background. "MailTalker" in semibold primary text. Settings gear icon in secondary text, amber on hover.
- **Search**: `bg-[var(--color-base)]` input, `border-[var(--color-border)]`, muted placeholder, amber focus border
- **"New Secure Link" button**: `border-[var(--color-accent-muted)]`, `text-[var(--color-accent)]`, subtle amber glow on hover
- **Section label**: "安全联系人 (N)" in secondary text, monospace, small caps tracking
- **Contact items**: Fingerprint ring avatar, alias in primary text, email in monospace secondary, delete button hidden until hover (danger color on confirm state)
- **Empty state**: Centered secondary text message (same as current, restyled to new palette)
- **Footer**: Pulse status bar + monospace status text (see Pulse Status Bar spec above)

### Chat Window (`ChatWindow.jsx`)

**Welcome state (no contact selected):**
- `bg-[var(--color-base)]` with `.pixel-grid` subtle background overlay
- Shield icon in amber, "MailTalker" title in primary text, tagline: "隐于像素，藏于邮件" in secondary text
- Three step cards in **vertical stack** layout (not horizontal grid — this better suits the connecting flow visual):
  - Each card: `bg-[var(--color-surface)]`, `border-l-[3px] border-[var(--color-accent)]`, padding, lucide icon in amber, step title in primary text, description in secondary text
  - Between cards: A thin vertical dashed line in border color connecting the amber left borders, indicating sequential flow
- Max width: `max-w-md`, centered

**Chat state:**
- Background: `bg-[var(--color-base)]` for both welcome and chat states (consistent)
- **Top bar**: `bg-[var(--color-surface)]` with bottom border. Avatar with fingerprint ring, contact alias in primary text bold, encryption badge (lock icon → hover expand to show `AES-256-GCM · E2EE`)
- **Security banner**: At top of message list, small pill-shaped badge: `bg-[var(--color-accent-muted)]`, `border-[var(--color-accent)]/20`, amber lock icon + "安全链接已建立" in monospace amber text. Compact, single line.
- **Message bubbles**:
  - Outgoing: `bg-[var(--color-bubble-out)]`, `border-l-2 border-[var(--color-accent)]`, right-aligned. New messages get `.animate-resolve`.
  - Incoming: `bg-[var(--color-bubble-in)]`, `border border-[var(--color-border)]`, left-aligned
  - Timestamps: secondary text, 10px
- **Toast notifications**: Positioned at top center, `border-radius: xl`.
  - Error: `bg-[var(--color-danger)]/15`, `border-[var(--color-danger)]/30`, danger text
  - Success: `bg-[var(--color-success)]/15`, `border-[var(--color-success)]/30`, success text
- **Input area**: `bg-[var(--color-surface)]` container, textarea `bg-[var(--color-base)]` with `border-[var(--color-border)]`, amber focus ring. Send button: amber filled when text present, muted when empty.
- **Sending state**: Monospace text "正在加密载荷..." with amber pulse dot animation

### Settings Modal (`SettingsModal.jsx`)

- **Backdrop**: `bg-black/70`, NO backdrop blur (clean, crisp overlay)
- **Modal**: `bg-[var(--color-surface)]`, `border-t-2 border-[var(--color-accent)]` (amber top accent line), rounded-2xl
- **Header**: Section title with settings icon, close button in secondary text
- **Section headers**: Monospace styling, small lock/server icons in amber
- **Input fields**: `bg-[var(--color-base)]`, `border-[var(--color-border)]`, amber focus border and ring
- **IMAP/SMTP sections**: Grouped in `bg-[var(--color-base)]` panels with border
- **Separate SMTP credentials toggle**: Checkbox in amber accent, conditional section slides in with fade animation, same panel styling as IMAP/SMTP sections
- **Save button**: `bg-[var(--color-accent)]` with slight hover brighten, subtle amber glow shadow
- **Cancel**: Ghost button, secondary text, elevated bg on hover

### Add Contact Modal (`AddContactModal.jsx`)

- **Same modal chrome as Settings**: Amber top border, no backdrop blur, dark surface bg
- **Form inputs**: Same styling as Settings (base bg, border, amber focus)
- **Key input section**: The entire key row area (input + generate + copy buttons) wrapped in a container with `.pixel-grid` background and `border-[var(--color-border)]` rounded panel. This emphasizes this is cryptographic content.
- **Generate button**: `border-[var(--color-accent)]`, `text-[var(--color-accent)]`, outlined style
- **Copy button**: Default outlined, transitions to success green briefly on copy
- **Validation errors**: `text-[var(--color-danger)]` with AlertCircle icon
- **Submit/Cancel buttons**: Same pattern as Settings modal

## CSS Architecture

All design tokens defined as CSS custom properties in `index.css`:

```css
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
```

Utility classes defined in `index.css`:
- `.pixel-grid` — Checkerboard micro-pattern background (see spec above)
- `.animate-resolve` — Message entrance animation (blur → clear)

Animations defined as `@keyframes` in `index.css`:
- `msg-resolve`: 0.3s blur+opacity+translate entrance for new messages
- `pulse-glow`: 2s breathing glow for connected status (green)
- `pulse-fast`: 0.5s rapid pulse for reconnecting status (amber)
- `fade-in`: Generic 0.2s fade entrance for modals and toasts
- `badge-expand`: Lock icon expansion transition helper

Scrollbar styling: Custom scrollbar using `--color-border` track and `--color-accent/40` thumb on hover, matching the amber theme.

## Files to Modify

1. `src/index.css` — Design tokens, `.pixel-grid` utility, animations, scrollbar styling
2. `src/App.jsx` — Update root container classes to new color vars and selection colors
3. `src/components/ContactList.jsx` — Full redesign: 280px width, pixel header, fingerprint avatars, pulse status, empty state
4. `src/components/ChatWindow.jsx` — Full redesign: welcome screen (vertical cards), chat bubbles (amber border), encryption badge, send animation, toast styling, security banner
5. `src/components/SettingsModal.jsx` — Restyle: amber top border, no blur backdrop, amber accents, SMTP credentials section
6. `src/components/AddContactModal.jsx` — Restyle: amber top border, pixel texture key area wrapper, amber accents
7. `public/index.html` — Update body class to `bg-[#0C0E12]` and `text-[#E8E2D6]`
