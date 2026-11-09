# CreatorOS — Design System

## Philosophy

**Dark-first, premium, functional.** The CreatorOS design system uses a deep space aesthetic — dark backgrounds with electric indigo/violet accents and glassmorphism surfaces. The UI should feel like professional-grade software that creators are proud to use.

---

## Color Palette

### Background Scale (Dark Mode)

| Token                   | HSL           | Hex (approx) | Usage                        |
| ----------------------- | ------------- | ------------ | ---------------------------- |
| `--background`          | `228 18% 7%`  | `#0D0F18`    | Page background              |
| `--background-surface`  | `228 15% 10%` | `#141620`    | Cards, panels                |
| `--background-elevated` | `228 13% 13%` | `#1A1D27`    | Hover states, elevated cards |
| `--background-overlay`  | `228 20% 8%`  | `#0F1120`    | Modals, overlays             |

### Primary — Electric Indigo

| Token             | HSL           | Usage                                      |
| ----------------- | ------------- | ------------------------------------------ |
| `--primary`       | `244 76% 65%` | Primary buttons, active links, focus rings |
| `--primary-hover` | `244 80% 72%` | Button hover state                         |
| `--primary-muted` | `244 40% 20%` | Icon backgrounds, subtle highlights        |
| `--primary-glow`  | `244 76% 65%` | Box shadow glow source                     |

### Accent — Electric Violet

| Token            | HSL           | Usage                      |
| ---------------- | ------------- | -------------------------- |
| `--accent`       | `270 76% 65%` | Gradient pair with primary |
| `--accent-hover` | `270 80% 72%` | Accent hover               |

### Semantic Colors

| Token       | HSL           | Usage                                    |
| ----------- | ------------- | ---------------------------------------- |
| `--success` | `160 84% 39%` | Completed deals, paid invoices, low risk |
| `--warning` | `38 92% 50%`  | Negotiating, medium risk, deadlines      |
| `--danger`  | `347 82% 62%` | Disputed, cancelled, critical risk       |
| `--info`    | `199 89% 50%` | Pending contract, information            |

### Deal Status Colors

| Status           | Token                | Color      |
| ---------------- | -------------------- | ---------- |
| DRAFT            | `--deal-draft`       | Muted grey |
| NEGOTIATING      | `--deal-negotiating` | Amber      |
| PENDING_CONTRACT | `--deal-active`      | Indigo     |
| ACTIVE           | `--deal-active`      | Indigo     |
| COMPLETED        | `--deal-completed`   | Emerald    |
| CANCELLED        | `--deal-cancelled`   | Dark grey  |
| DISPUTED         | `--deal-disputed`    | Rose       |

### Risk Severity Colors

| Severity | Token             | Color   |
| -------- | ----------------- | ------- |
| LOW      | `--risk-low`      | Emerald |
| MEDIUM   | `--risk-medium`   | Amber   |
| HIGH     | `--risk-high`     | Orange  |
| CRITICAL | `--risk-critical` | Rose    |

---

## Typography

### Font Families

| Role           | Font                 | Variable            |
| -------------- | -------------------- | ------------------- |
| Body / UI      | Inter (Google Fonts) | `--font-inter`      |
| Code / Numbers | Geist Mono           | `--font-geist-mono` |

### Type Scale

| Size   | rem   | px  | Line height | Usage                   |
| ------ | ----- | --- | ----------- | ----------------------- |
| `2xs`  | 0.625 | 10  | 0.875rem    | Micro labels            |
| `xs`   | 0.75  | 12  | 1rem        | Caption, badges         |
| `sm`   | 0.875 | 14  | 1.25rem     | Body small, table cells |
| `base` | 1     | 16  | 1.5rem      | Body text               |
| `lg`   | 1.125 | 18  | 1.75rem     | Card titles             |
| `xl`   | 1.25  | 20  | 1.75rem     | Section headers         |
| `2xl`  | 1.5   | 24  | 2rem        | Page subtitles          |
| `3xl`  | 1.875 | 30  | 2.25rem     | Page titles             |
| `4xl`  | 2.25  | 36  | 2.5rem      | Hero numbers            |

### Font Weights

- **Regular (400)**: Body text, descriptions
- **Medium (500)**: Labels, nav items
- **Semibold (600)**: Card titles, badges, button text
- **Bold (700)**: Page headings, KPI values
- **Extrabold (800)**: Hero statistics

---

## Border Radius

| Token          | Value  | Usage                 |
| -------------- | ------ | --------------------- |
| `xs`           | 4px    | Tight UI elements     |
| `sm`           | 6px    | Badges, small buttons |
| `md` (default) | 10px   | Cards, inputs         |
| `lg`           | 14px   | Large cards, modals   |
| `xl`           | 20px   | Feature panels        |
| `2xl`          | 28px   | Hero elements         |
| `full`         | 9999px | Pills, avatars        |

---

## Spacing

4px base grid. Primary spacing values: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px.

---

## Shadow System

| Token             | Usage                             |
| ----------------- | --------------------------------- |
| `shadow-glow-sm`  | Small primary glow (buttons)      |
| `shadow-glow`     | Standard glow (active cards)      |
| `shadow-glow-lg`  | Large glow (highlighted elements) |
| `shadow-float`    | Card elevation shadow             |
| `shadow-float-lg` | Modal / overlay elevation         |

---

## Glassmorphism

```css
.glass {
  background: hsl(var(--background-surface) / 0.8);
  backdrop-filter: blur(16px);
  border: 1px solid hsl(var(--border) / 0.5);
}
```

Used on: TopNav, Cards (default variant), Modals, Popovers

---

## Component Reference

| Component        | File                                | Description                                                         |
| ---------------- | ----------------------------------- | ------------------------------------------------------------------- |
| `Button`         | `components/ui/button.tsx`          | primary / secondary / ghost / outline / destructive / link variants |
| `Card`           | `components/ui/card.tsx`            | default / glass / elevated / outlined / glow variants               |
| `StatCard`       | `components/ui/stat-card.tsx`       | KPI metric display with trend badge                                 |
| `Badge`          | `components/ui/badge.tsx`           | Status pills — deal, contract, invoice, risk severity               |
| `GlowBackground` | `components/ui/glow-background.tsx` | Ambient glow + noise texture wrapper                                |
| `TopNav`         | `components/ui/top-nav.tsx`         | Fixed top navigation with all 7 routes + CTA                        |

---

## Motion & Animation

| Token        | Duration | Easing               | Usage                    |
| ------------ | -------- | -------------------- | ------------------------ |
| `fade-in`    | 300ms    | ease-out             | Page/component entry     |
| `scale-in`   | 200ms    | ease-out             | Dropdown, modal appear   |
| `shimmer`    | 2000ms   | linear infinite      | Loading skeleton         |
| `glow-pulse` | 3000ms   | ease-in-out infinite | Glow background elements |

---

## Dark Mode Strategy

- Dark mode is **default** — `dark` class applied to `<html>` on first render
- CSS variables scoped to `:root, .dark` (dark) and `.light` (light override)
- `next-themes` integration planned for Phase 1 toggle
- System preference can override via `color-scheme: dark`
