---
version: alpha
name: School Soft
description: Design system for a single-school mobile app and admin web dashboard — calm, readable, and age-appropriate for students, parents, teachers, and staff.
colors:
  primary: "#4F46E5"
  primary-subtle: "#EEF2FF"
  secondary: "#F1F5F9"
  canvas: "#F8FAFC"
  surface: "#FFFFFF"
  text-primary: "#0F172A"
  text-secondary: "#475569"
  text-tertiary: "#64748B"
  text-inverse: "#FFFFFF"
  text-link: "#4F46E5"
  text-on-primary: "#FFFFFF"
  border-default: "#E2E8F0"
  border-strong: "#CBD5E1"
  border-focus: "#6366F1"
  icon-primary: "#334155"
  icon-secondary: "#64748B"
  icon-on-primary: "#FFFFFF"
  success: "#16A34A"
  warning: "#D97706"
  error: "#DC2626"
  info: "#0284C7"
typography:
  display-lg:
    fontFamily: Poppins
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.2
  heading-lg:
    fontFamily: Poppins
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.2
  heading-md:
    fontFamily: Poppins
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.2
  heading-sm:
    fontFamily: Poppins
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.4
  body-lg:
    fontFamily: Poppins
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.4
  body-md:
    fontFamily: Poppins
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.4
  body-sm:
    fontFamily: Poppins
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  label-md:
    fontFamily: Poppins
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
  label-sm:
    fontFamily: Poppins
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.4
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-on-primary}"
    typography: body-md
    rounded: "{rounded.md}"
    padding: 12px 16px
    height: 44px
  button-primary-disabled:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.text-tertiary}"
    typography: body-md
    rounded: "{rounded.md}"
    padding: 12px 16px
    height: 44px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: body-md
    rounded: "{rounded.md}"
    padding: 12px 16px
    height: 44px
  button-secondary-disabled:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.text-tertiary}"
    typography: body-md
    rounded: "{rounded.md}"
    padding: 12px 16px
    height: 44px
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.text-link}"
    typography: body-md
    rounded: "{rounded.md}"
    padding: 12px 16px
    height: 44px
  button-ghost-disabled:
    backgroundColor: transparent
    textColor: "{colors.text-tertiary}"
    typography: body-md
    rounded: "{rounded.md}"
    padding: 12px 16px
    height: 44px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: body-md
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  search-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    typography: body-md
    rounded: "{rounded.md}"
    padding: 12px 16px
    height: 44px
  bottom-nav-item-active:
    textColor: "{colors.primary}"
    typography: label-sm
  bottom-nav-item-inactive:
    textColor: "{colors.text-tertiary}"
    typography: label-sm
---

## Overview

School Soft is a school management platform for a single campus — mobile apps for parents, students, teachers, and bus drivers, plus a web dashboard for admins and stakeholders. The visual identity should feel **trustworthy, calm, and clear**: academic information first, not flashy consumer-app chrome.

The design language is **Indigo + Slate**: indigo carries brand and interaction; slate neutrals carry structure and reading comfort. **Poppins** is the sole UI typeface. The system ships **light mode only** for v1.

**Personality:** organized, friendly, and age-appropriate. Screens should scan quickly — students and parents often check homework, schedules, or fees in short sessions after school.

**Platform scope:**

- **Mobile (primary):** 390×844 baseline frame; bottom navigation for role tabs; minimum 44px touch targets.
- **Web admin:** same tokens; wider layouts; data-dense tables allowed but must reuse semantic colors and typography.

**Related docs:** token reference at `UIUX/design-tokens.md`, Figma file key `qvSudNLwrrAm7Q3YVx4jy5`, interaction rules at `UIUX/shared-uiux-rules.md`.

## Colors

The palette is intentionally restrained: one brand hue, a full neutral scale, and four status colors. Do not introduce ad-hoc accent colors per screen.

### Brand & surfaces

- **Primary (#4F46E5):** Main actions, active nav, links, focus rings. Use sparingly — one primary CTA per view when possible.
- **Primary subtle (#EEF2FF):** Selected states, soft highlights, informational chips on brand context.
- **Canvas (#F8FAFC):** App background behind cards and lists.
- **Surface (#FFFFFF):** Cards, sheets, inputs, elevated panels.
- **Secondary (#F1F5F9):** Disabled button fills, subtle section backgrounds, dividers between grouped content.

### Text & icons

- **Text primary (#0F172A):** Headlines, list titles, body copy.
- **Text secondary (#475569):** Metadata, captions, supporting lines.
- **Text tertiary (#64748B):** Placeholders, disabled labels, de-emphasized nav items.
- **Text link (#4F46E5):** Inline links and ghost-button labels — same as primary.
- **Text on primary (#FFFFFF):** Labels on indigo buttons and primary-filled elements.
- **Icon primary (#334155):** Default icon stroke/fill.
- **Icon secondary (#64748B):** Trailing chevrons, secondary actions.

### Borders & focus

- **Border default (#E2E8F0):** Card outlines, secondary button borders, input borders.
- **Border strong (#CBD5E1):** Emphasized separators when default is too faint.
- **Border focus (#6366F1):** Keyboard and tap focus — 2px ring or outline on interactive controls.

### Status

Use status colors only for semantic feedback, never decoration.

- **Success (#16A34A):** Paid, submitted, present, completed.
- **Warning (#D97706):** Due soon, pending approval, attention needed.
- **Error (#DC2626):** Failed payment, validation errors, absent/overdue.
- **Info (#0284C7):** Neutral informational banners, transport updates.

## Typography

All UI text uses **Poppins**. Do not mix secondary display fonts.

| Token | Use |
|-------|-----|
| Display LG (32 / Semi Bold) | Marketing hero, empty-state titles |
| Heading LG (24 / Semi Bold) | Screen titles, modal headers |
| Heading MD (20 / Semi Bold) | Section headers on Home and detail screens |
| Heading SM (18 / Medium) | Card titles, list group labels |
| Body LG (16 / Regular) | Primary reading text on detail screens |
| Body MD (14 / Regular) | Default list rows, form fields, buttons |
| Body SM (12 / Regular) | Timestamps, footnotes, dense metadata |
| Label MD (12 / Medium) | Filter chips, badges, table headers |
| Label SM (11 / Medium) | Bottom nav labels, compact tags |

**Rules:**

- Prefer **Body MD** as the default; step up to Body LG only when content is long-form (notices, circulars).
- Headings use tight line height (1.2); body and labels use normal (1.4).
- Never below 11px. If space is tight, truncate with ellipsis rather than shrinking type.
- Links inherit **text link** color; underline only on web admin long-form content.

## Layout

### Spacing scale

Use the token scale consistently — do not invent one-off margins.

| Token | Value | Typical use |
|-------|-------|-------------|
| xs | 4px | Icon–label gap inside compact chips |
| sm | 8px | Inline gaps, button icon gap, chip padding |
| md | 16px | Screen horizontal padding, card padding, section gap |
| lg | 24px | Section separation, Foundations-style documentation |
| xl | 32px | Large empty states, hero spacing |
| 2xl | 48px | Top-of-screen breathing room on marketing/onboarding |

### Mobile screen structure

1. **Safe area** — respect iOS/Android insets.
2. **Top bar** — screen title (Heading LG or MD), optional avatar/actions.
3. **Content** — scrollable; horizontal padding `md` (16px).
4. **Bottom navigation** — fixed; five tabs for student role (Home, Schedule, Learning, Exams, Updates).

### List screens with search & filters

When a screen supports search and filtering, stack controls in this order (see `UIUX/shared-uiux-rules.md`):

1. Search bar
2. Selected filter chips (removable)
3. Applied-filter count
4. List items
5. Floating filter button (opens bottom sheet)

Do not show permanently expanded filter panels above lists.

### Web admin

- Max content width ~1280px with fluid gutters.
- Tables: Label MD for headers, Body SM for cell text.
- Primary actions top-right of page header; destructive actions use Error color, not a new red.

## Elevation & Depth

v1 is flat-first. Depth is communicated through **surface color and borders**, not heavy shadows.

| Level | Treatment |
|-------|-----------|
| Base | Canvas background |
| Raised | White surface + `border-default` 1px |
| Overlay | Bottom sheets, modals — white surface, top corners `radius/lg`, optional soft shadow `0 8px 24px rgba(15, 23, 42, 0.08)` |
| Floating | Filter FAB — primary or surface fill, `radius/full`, shadow as above |

Avoid stacked shadows. One elevation step per overlay.

## Shapes

Corner radii are modest — friendly but not bubbly.

- **Cards, inputs, buttons:** `radius/md` (8px)
- **Small chips, tags:** `radius/sm` (4px) or `radius/full` for pill chips
- **Bottom sheets, large modals:** top corners `radius/lg` (16px)
- **Avatars:** `radius/full`

Do not use `radius/lg` on standard buttons — keep tap targets rectangular with 8px corners.

## Components

### Button

Three styles × two states. Minimum height **44px**.

| Style | Default | Disabled |
|-------|---------|----------|
| Primary | Indigo fill, white label | Secondary fill, tertiary text |
| Secondary | White fill, primary text, default border | Secondary fill, tertiary text |
| Ghost | Link-colored label, no fill | Tertiary label |

Use **Primary** for the single main action on a screen. **Secondary** for alternatives. **Ghost** for low-emphasis actions (e.g. "Cancel", "View all").

### Text

Nine text components mirror typography tokens (`Text/Display/LG` … `Text/Label/SM`). Bind fill to `text-primary` unless context requires secondary/tertiary/link colors.

### Card

White surface, `radius/md`, padding `md`, optional `border-default`. Use for dashboard summaries, homework items, notice previews.

### Search input

Full-width within content padding; height 44px; placeholder in tertiary text; leading search icon in icon-secondary.

### Chips & filter tags

Label MD; padding horizontal `sm`, vertical `xs`; selected state uses primary-subtle background + primary text; include clear (×) control on applied filters.

### Bottom navigation

Five items; icon + Label SM; active item uses primary color; inactive uses tertiary. Profile is **not** a tab — access via avatar on Home and major screens.

### Status badge

Label SM on subtle tinted background (10–15% opacity of status color) or white with colored left border. Pair icon + text for accessibility.

### Avatar

Circular; sizes SM (32px) for app bars, MD (40px) for profile headers. Fallback: initials on primary-subtle background, primary text.

## Do's and Don'ts

### Do

- Use semantic tokens (`text-primary`, `border-default`) — not raw hex in components.
- Keep one primary CTA per mobile screen.
- Truncate long titles; preserve 44px minimum touch targets.
- Use status colors only with clear meaning (paid, overdue, error).
- Follow the filter bottom-sheet pattern on all filterable lists.
- Maintain high contrast: primary button white-on-indigo passes WCAG AA.

### Don't

- Don't add dark mode tokens or alternate palettes in v1.
- Don't use primary indigo for large background fills — reserve for actions and accents.
- Don't embed permanent filter toolbars above lists.
- Don't use decorative gradients, glassmorphism, or consumer-social UI patterns.
- Don't show student-facing payment, attendance marking, or admin controls in student UI.
- Don't introduce fonts other than Poppins.
- Don't reduce type below 11px or rely on opacity alone for disabled states — use disabled semantic tokens.
