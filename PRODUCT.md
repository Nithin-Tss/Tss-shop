# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Merchants (primary):** people who run an online store on TSS from the admin (`/admin/online-store/*`): products, inventory, orders, customers, discounts, gift cards, content, themes, reports and settings. **Open decision:** which merchant segment comes first (small non-technical owners, growing brands with staff, or agencies/developers) is not settled. Design for a mixed audience: a merchant who never touches code should never need to, and the code editor, API keys and webhooks should still be fully usable by technical merchants.
- **Prospective merchants:** visitors to the marketing site (`/`) deciding whether to start a store, then going through signup and onboarding (`/auth/signup`, `/auth/onboarding`).
- **Store team members:** additional staff invited through Team settings, working in the same admin.
- **Shoppers:** customers of a merchant's store, reached through the storefront/theme rendering and account pages (`/account`, `/orders`).

## Product Purpose

TSS Shop is a multi-tenant commerce platform: merchants create a store, build its storefront without writing code, and run day-to-day selling from one admin. Success means a merchant gets from signup to a selling store quickly and then spends their time selling, not configuring.

## Positioning

All four are confirmed as differentiators and should shape decisions together:

1. **Simplicity / less setup:** "Commerce software for shops that would rather sell than configure." Fewer decisions before selling; sensible defaults over settings.
2. **An AI assistant that acts:** "Assistant that edits, not just chats." The in-admin assistant takes real actions (restocking, rewriting pages, building pages via the AI page builder), not just answering questions.
3. **Human support handoff:** when the assistant can't help, or the merchant presses "Talk to a human", the backend opens a ticket with the AI's summary and the chat so far, and a support executive replies (see `../Tss-helpdesk/PRODUCT.md`). Replies appear in the merchant's "My support tickets" page and by email.
4. **Price / region:** **Open decision:** the pricing and target region are not yet specified. The code supports UPI, cash on delivery, Stripe, multi-currency, tax and markets; do not claim a specific region or price advantage until it is confirmed.

## Operating Context

- Merchant admin is a dense working tool used repeatedly through the day: order processing, inventory, product editing, reports, live view.
- Storefront editing: theme customizer, store builder, AI page builder, a Monaco-based code editor for theme code, menus, pages, blog posts, media.
- Help: in-admin help center (`/admin/help`), the help widget/assistant panel, and support tickets.
- Several stores per account (store selection at `/auth/stores`).

## Capabilities and Constraints

- Frontend: React 19, React Router 7, Vite, Tailwind CSS 4. Backend: Django (`../Tss-backend`) serving `/api/v1/*`.
- Capabilities: catalog (products, collections, catalogues, metafields), inventory, purchase orders, transfers, orders, drafts, abandoned checkouts, customers, discounts, gift cards, payments, shipping, tax, markets/currency, domains, languages, notifications, customer accounts and privacy, MFA, team, API keys, webhooks, audit log, reports/analytics, live view.
- 14-day free trial, no card required (current landing copy; keep consistent).
- Terminology in use: "store", "merchant"/"owner", "online store", "theme", "catalogue" (British spelling; "catalogs" also routes).

## Brand Commitments

- Name: **TSS Shop** (product), **TSS** (platform).
- Voice in existing copy: plain, direct, slightly dry ("would rather sell than configure", "Try the controls. This is how the real thing behaves.", "Reports without exporting"). Short sentences, no hype.

## Evidence on Hand

- Real product capability across the admin routes above, demonstrable in the app itself (`/editor-demo` exists for showcasing the editor).
- **None on hand:** customer testimonials, merchant logos, usage numbers, case studies or press. Future work must not invent them.

## Product Principles

1. **Selling over configuring.** Every setting a merchant must touch before selling is a cost; default it, defer it, or let the assistant do it.
2. **The assistant does the work.** Where the assistant can take an action, offer the action, not instructions for doing it by hand.
3. **A human is always one step away.** Escalating to a person should be visible and should never make the merchant repeat themselves.
4. **Depth without exposure.** Power features (code, API, webhooks, metafields) stay complete but out of the way of merchants who don't need them.
5. **Don't claim what isn't proven.** No invented proof, region or pricing claims until they are confirmed.
