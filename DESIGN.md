---
name: TSS Shop
description: Commerce software for shops that would rather sell than configure.
colors:
  ink-navy: "#111827"
  brass: "#b08d57"
  brass-light: "#d6b875"
  brass-deep: "color-mix(in srgb, #b08d57 74%, black)"
  paper-cream: "#f5f0e6"
  white: "#ffffff"
typography:
  display:
    fontFamily: "Instrument Serif, Times New Roman, serif"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    fontFeature: '"ss01", "cv11"'
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
rounded:
  xs: "2px"
  sm: "3px"
  md: "5px"
  lg: "7px"
  xl: "10px"
  2xl: "14px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.25rem"
  "6": "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.brass-deep}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 1rem"
  button-dark:
    backgroundColor: "{colors.ink-navy}"
    textColor: "{colors.white}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 1rem"
  button-outline:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 1rem"
  card:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.2xl}"
    padding: "1.25rem"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.lg}"
    padding: "0.5rem 0.75rem"
---

# Design System: TSS Shop

## Overview

**Creative North Star: "Brass & Paper"**

Dark ink on warm cream, with brass marking only what matters. The whole product, from the marketing site to the merchant admin, is drawn from five colours. Every other shade is one of those five at partial opacity, never a new hue. The design tokens in `src/index.css` enforce this mechanically: Tailwind's slate, gray, zinc, stone, blue, sky, green, emerald and teal scales are remapped onto navy, and violet, indigo, orange, amber, red, rose and pink onto brass. Any utility a component reaches for lands back inside the palette.

The material is paper and metal, not glass and neon. Surfaces are flat white sheets on a cream ground, lifted by soft warm shadows tinted with the navy ink. Solid buttons are flat, crisp fills (deep action brass or ink) with one hairline top highlight and a soft navy-tinted drop shadow. Type is Geist throughout the admin. Instrument Serif appears only as the editorial display face on marketing and auth headlines. Density is high: the root font size is 80% (1rem = 12.8px), so the admin reads compact, with `text-sm` (11.2px) as the working body size.

Expression is reserved for the edges of the product. The sign-in and sign-up pages have an animated backdrop (drifting brass blobs, a dot grid that lights up under the cursor, slow rings, grain). The admin stays plain and fast to scan.

**Key Characteristics:**

- Five colours only: ink navy, brass, light brass, paper cream, white.
- Geist for everything working; Instrument Serif only for marketing/auth display headlines.
- Compact density (80% root size), tabular numerals in tables and live figures.
- No pills or chips: status reads as bold text with a small dot.
- Tight, deliberate corners (2–14px), warm navy-tinted shadows.

## Colors

A warm, near-monochrome palette: navy ink on cream paper, with brass as the single accent.

### Primary

- **Brass** (#b08d57): status dots, glows, the auth backdrop, and the full stop in the brand mark. The `-400`/`-500` steps of every brass-mapped scale resolve here.
- **Action Brass** (`--brand-brass-deep`, brass 74% mixed with black): primary actions, active states, brass text and links, the keyboard focus ring. The `-600` step of every brass-mapped scale (`bg-orange-600`, `bg-violet-600`, `text-violet-600`) resolves here; `-700` resolves to `--brand-brass-deeper` (62% mix) for hover. White on action brass is 5.2:1, action brass on cream 4.6:1, both AA.
- **Light Brass** (#d6b875): the highlight end of the brass scale: hover glows, the secondary auth blob, light accents on dark grounds.

### Neutral

- **Ink Navy** (#111827): text, dark buttons, headings, icons. Lighter text greys are navy at 62% (secondary, `text-slate-500`) and 45% (tertiary, `text-slate-400`) opacity.
- **Paper Cream** (#f5f0e6): the page ground (`bg-slate-50` and every `*-50` neutral resolve to it).
- **White** (#ffffff): cards, inputs, menus, modals: the "sheet" on the cream ground.
- Borders and dividers are navy at 12% (`border-slate-200`) and 22% (`border-slate-300`); fills are navy at 5% (`bg-slate-100`).

### Named Rules

**The Five Colours Rule.** No hue outside the five brand colours may appear. New shades are made by mixing a brand colour with white, black or transparency, never by adding a hex.

**The Brass Is Earned Rule.** Brass marks the action, the active item, or focus. It is not decoration and never a large fill behind text.

### Known gaps (recorded, not yet resolved)

- **No status colour.** Because red and green are remapped, error notices (`bg-red-50`, `text-red-600`), destructive buttons (`bg-red-600`) and success states render in the same brass/navy as ordinary UI. A destructive "Delete" looks like a primary "Save". This needs a decision; until then, carry status with an icon and explicit wording.
- **Brass contrast.** Resolved for actions and links by the action-brass `-600` step. Anything still using `-500`/`-400` brass for small text stays at 2.7–3.1:1. Tertiary text (navy 45% on cream) is 2.9:1. Secondary text (navy 62%) passes at 4.8:1.

## Brand

The brand is **TSS Shop**, shown by two pieces in `src/components/Brand.jsx`:

- **The "T." lettermark** (`BrandMark`): a 32-unit rounded tile with a geometric T and a brass full stop. `tone="ink"` (ink tile, white T) on cream and white; `tone="paper"` (cream tile, ink T) on the dark sidebar and footer. The brass full stop never changes. The favicon is the same mark.
- **The wordmark** (`Wordmark`): the mark, then "TSS" in Geist 700 with 0.07em tracking, then "Shop" in action brass. On marketing and auth surfaces "Shop" is Instrument Serif italic at 1.32em; in the admin (`serif={false}`) it is Geist 500, which keeps the One Serif Rule.
- **Placement:** marketing nav and footer, onboarding nav, the top of the sign-in and sign-up cards, and the admin sidebar (the name hides when the rail collapses). The product is never called "Store" in brand positions.

## Typography

**Display Font:** Instrument Serif (with Times New Roman, serif)
**Body Font:** Geist (with ui-sans-serif, system-ui, Segoe UI, sans-serif)
**Label/Mono Font:** Geist; the system monospace stack (`font-mono`) for codes, IDs and the code editor.

**Character:** A sharp, modern grotesk does all the work; a soft high-contrast serif speaks only in editorial moments, like a hand-set title page on a ledger. Geist runs with stylistic sets `ss01` and `cv11`.

### Hierarchy

- **Display** (Instrument Serif 400, size set per placement, line-height 1.02, -0.02em): marketing hero and section headlines, auth page titles. Applied with the `.display` class. Never in the admin.
- **Headline** (Geist 600, 1.5rem ≈ 19px, -0.015em): admin page titles (`text-2xl`).
- **Title** (Geist 600, 1rem–1.125rem ≈ 13–14px, -0.015em): card and section titles.
- **Body** (Geist 400–500, 0.875rem ≈ 11px): the working size for table cells, forms and descriptions (`text-sm`, the most-used size).
- **Label** (Geist 500–600, 0.75rem ≈ 10px, or fixed 11–13px): field labels, meta, column headers (`text-xs`, `text-[11px]`, `text-[13px]`).

### Named Rules

**The One Serif Rule.** Instrument Serif is for display headlines and the wordmark's "Shop" on marketing and auth surfaces only. Admin screens are Geist from top to bottom.

**The Tabular Rule.** Every table and every `[data-numeric]` element uses tabular numerals so figures line up and live values don't jitter.

## Layout

The admin is a dark ink sidebar beside a cream content area (`AdminSidebar`). The assistant panel opens as a 400px right column that **pushes** the page (`html[data-assistant-push]` adds right padding) instead of covering it. Content is organised into white cards on the cream ground, with lists and tables inside cards separated by hairline rules (`border-b`, `border-t`).

Spacing follows Tailwind's 4px-based steps, scaled by the 80% root size: `gap-2`/`gap-3` inside controls and rows, `px-3`–`px-5` and `py-2`–`py-3` in rows and fields, `p-5`–`p-6` inside cards. Density is the default; generous whitespace is for the marketing site and auth pages.

## Elevation & Depth

The page ground is cream with a faint warm light from the top and a fixed 3.5% navy-tinted grain, so it reads as paper rather than a flat fill. On it: a hybrid of flat sheets, separated mainly by hairline borders, with soft, warm, navy-tinted shadows used sparingly. Cards sit at `shadow-xs`/`shadow-sm`; popovers and modals rise to `shadow-lg`–`shadow-xl`. Solid buttons have a hairline top highlight and a soft layered drop shadow, and lift 1px on hover.

### Shadow Vocabulary

- **xs** (`box-shadow: 0 1px 0 rgb(17 24 39 / 0.04)`): a resting hairline under flat controls.
- **sm** (`box-shadow: 0 1px 2px rgb(17 24 39 / 0.05), 0 0 0 1px rgb(17 24 39 / 0.03)`): resting cards.
- **md** (`box-shadow: 0 4px 12px -2px rgb(17 24 39 / 0.07), 0 1px 2px rgb(17 24 39 / 0.04)`): hovered cards, dropdowns.
- **lg** (`box-shadow: 0 12px 28px -8px rgb(17 24 39 / 0.12), 0 2px 4px rgb(17 24 39 / 0.04)`): popovers, menus.
- **xl** (`box-shadow: 0 24px 48px -12px rgb(17 24 39 / 0.16)`): modals.
- **2xl** (`box-shadow: 0 32px 64px -16px rgb(17 24 39 / 0.22)`): full-screen overlays.

### Named Rules

**The Warm Shadow Rule.** Shadows are tinted with ink navy (rgb 17 24 39), never stock black or grey.

## Shapes

Tight, deliberate corners: the radius scale is compressed (2, 3, 5, 7, 10, 14px). Controls (buttons, inputs, selects) use 7px (`rounded-lg`). Cards and panels use 14px (`rounded-2xl`) or 10px (`rounded-xl`). Full circles are kept for avatars, status dots and icon-only buttons. Text-bearing pill shapes are actively flattened by a global rule: rounded-full buttons and labels become 8px rectangles, and rounded-full tags lose their fill, border and padding entirely.

## Components

### Buttons

Flat brass and ink: solid, compact, crisp.

- **Shape:** gently squared (7px).
- **Primary:** action-brass fill, white Geist 600 label (+0.01em), `px-4 py-2` (or `px-5` for emphasis, `px-4 py-1.5 text-xs` compact). A white inset top hairline and layered navy shadows are applied globally to any solid brass/navy button; there is no gradient sheen.
- **Dark:** ink-navy fill, same treatment, for strong neutral actions (marketing CTAs, editor bars).
- **Hover / Active:** lifts 1px with a deeper shadow; pressing returns to 0 and scales to 0.985 with an inset shadow. Disabled drops the shadow and goes to 50% opacity. Landing `.btn-dark`/`.btn-orange` follow the same recipe and hover to `--brand-brass-deeper`. Transforms are removed under reduced motion.
- **Outline:** white with a hairline border; on hover the border warms toward brass (55% brass mixed into the border grey) and a small shadow appears.

### Icons

Lucide throughout (`Icons.jsx`, plus the landing set in `landing/Icon.jsx`). Every `svg.lucide` draws a non-scaling 1.5px stroke (`vector-effect: non-scaling-stroke`), so a 13px icon and an 18px icon carry the same crisp line weight regardless of the `strokeWidth` prop.

### Status labels (in place of chips)

- **Style:** no fill, no border, no padding: bold text (700, +0.01em tracking) next to a 7px round dot in the status colour.
- **Rule:** chips and pills are not part of this system.

### Cards / Containers

- **Corner Style:** 14px (`rounded-2xl`) for primary cards; 10px for nested blocks.
- **Background:** white on the cream page.
- **Shadow Strategy:** `shadow-sm` or `shadow-xs` at rest (see Elevation).
- **Border:** hairline navy 12% (`border-slate-200`).
- **Internal Padding:** 1.25rem (`p-5`), or edge-to-edge with rows separated by hairlines.

### Inputs / Fields

- **Style:** white, hairline border at navy 22% (`border-slate-300`), 7px radius, `px-3 py-2`, `text-sm`. Numeric inputs hide spinner arrows (`.no-spin-input`).
- **Focus:** the border darkens to navy 62% (`focus:border-slate-500`); keyboard focus also gets the global 2px brass outline at 2px offset.
- **Error:** currently uses red utilities that resolve to brass (see Known gaps).

### Navigation

- **Admin sidebar** (`AdminSidebar`): the one dark surface in the admin, a full-height ink-navy column with white type. Inactive links are white at 55% and brighten to full white over a 6% white wash on hover. The active link is a solid brass block with white text, marked `aria-current="page"`. The sidebar collapses by animating its width (200ms ease-out). On mobile it becomes a 290px drawer over a navy 50% scrim.
- **Marketing nav** (`NavBar`): a sticky cream bar at 85% opacity with a blurred backdrop and a hairline bottom border. The wordmark is set in Instrument Serif, and links are navy 74% turning brass on hover.

### Auth Shop Window (signature)

The one place the system performs, and it performs the product. Sign-in and sign-up (`AuthShell`) put the form on paper at the left, with the wordmark top-left and Terms/Privacy at the foot. From 1024px up, the right side is an ink panel (`ShopWindow`) holding a working storefront built on TSS Shop. Visitors switch trade (Beauty, Fashion, Electronics, Grocery) and add products: the cart badge bumps and a toast confirms. Hovering a section shows the store builder's 2px brass outline and name tag, and the hero's "Edit" opens a colour picker (Cream, Brass, Ink) that restyles it live. The storefront tilts a few degrees toward the pointer. The product illustrations come from `landing/ProductArt.jsx`. Every animation stops under `prefers-reduced-motion`; below 1024px the panel is hidden and the form stands alone. No dot grids, blobs or glass.

## Do's and Don'ts

### Do:

- **Do** use only the five brand colours; make tints by mixing with white, black or transparency.
- **Do** keep brass for actions, active states and focus: the 2px brass `:focus-visible` outline at 2px offset is the one focus treatment.
- **Do** use Geist for all admin UI, and Instrument Serif (`.display`) only for marketing and auth headlines.
- **Do** show status as bold text plus a 7px dot, with a word that names the state.
- **Do** use tabular numerals for any figure in a table or that updates live.
- **Do** tint shadows with ink navy, and keep resting cards at `shadow-xs`/`shadow-sm`.
- **Do** let the assistant panel push content, not cover it.
- **Do** honour `prefers-reduced-motion` for every transform and ambient animation.

### Don't:

- **Don't** add a new hex value or rely on an unmapped Tailwind hue; every scale is remapped on purpose.
- **Don't** use pills or chips for status or tags; the global stylesheet strips them.
- **Don't** use stock grey or black drop shadows.
- **Don't** put Instrument Serif in the admin.
- **Don't** set small text in brass on cream or white (2.7–3.1:1); use ink navy for small text.
- **Don't** rely on colour alone to tell a destructive or error state apart. The palette currently has no red, so use an icon and explicit wording.
