# Software Requirements Specification (SRS)
### Expiry-Date Inventory SaaS — v1

| | |
|---|---|
| **Document** | Software Requirements Specification (SRS) |
| **Product** | Expiry-date inventory management SaaS |
| **Version** | 0.1 (draft for review) |
| **Date** | 2026-08-22 |
| **Companion** | `docs/PRD.md` |
| **Status** | Draft — pending review |

---

## 1. Introduction

### 1.1 Purpose
This SRS specifies the architecture, data model, functional and non-functional requirements for v1 of the expiry-date inventory SaaS. It is the engineering counterpart to the PRD.

### 1.2 Scope
v1 delivers, for FMCG supermarkets: multi-tenant accounts, master-data import, batch-level expiry tracking, expiry alerts, an expired-return-to-supplier (RTV) workflow with credit tracking, FEFO outflow, and an ROI/waste report. Out-of-scope items are listed in §9.

### 1.3 Definitions
- **Batch (lot):** a quantity of a product received together sharing one expiry date.
- **FEFO:** First-Expired-First-Out — allocate outflow from the earliest-expiring batch first.
- **RTV:** Return-to-Vendor — returning expired/damaged stock to the supplier for credit.
- **RLS:** Row-Level Security — Postgres feature enforcing per-tenant data isolation.
- **Tenant:** one company (customer) and all its data.

## 2. System architecture

### 2.1 Stack (locked)
- **Frontend:** Next.js (React) — App Router; server components + server actions/route handlers.
- **Backend / Database:** **Supabase** — Postgres (data), Auth (users/sessions), **Row-Level Security** (multi-tenancy), Storage (import files / return documents), **pg_cron + Edge Functions** (scheduled expiry alerts + email).
- **Deployment:** Vercel (frontend + serverless functions); Supabase managed backend.
- **Email:** transactional email provider via Supabase Edge Function (e.g. Resend/SMTP) — provider TBD.

### 2.2 High-level architecture
```
[ Browser (Next.js/React) ]
        |  HTTPS
        v
[ Next.js on Vercel ] --- server actions / route handlers --->
        |                                   |
        |  Supabase JS client               |  service-role (server only)
        v                                   v
[ Supabase: Postgres + Auth + RLS + Storage ]
        ^
        |  pg_cron schedule -> Edge Function
        +--> [ Expiry alert job -> Email provider ]
```

### 2.3 Design principles
- **Reuse proven logic:** port the reference engine (FEFO, status-from-date, receive/sell/scrap, returns) — behavior, re-implemented cleanly on this stack.
- **Complement, not replace:** import-first; never require the customer to abandon their existing system.
- **Tenant isolation by default:** every business table carries `company_id` and is protected by RLS.
- **Internationalization from day one:** locale-aware dates (store as `date`/`timestamptz`, format per locale — critical since dates are the product), multi-currency-ready, translatable strings.

## 3. Data model

All business tables include `company_id` (tenant scope) and are governed by RLS (§6). Suggested Postgres schema (types abbreviated):

- **companies** — `id (uuid pk)`, `name`, `near_expiry_days (int, default 7)`, `currency (default 'MYR')`, `created_at`
- **company_members** — `company_id (fk)`, `user_id (fk auth.users)`, `role ('admin'|'staff')`, `created_at`; PK `(company_id, user_id)`. *No unique constraint on `user_id`* (a user may belong to multiple companies; fixes reference limitation).
- **stores** — `id`, `company_id`, `name`, `created_at`. (A default "Main store" is created per company.)
- **suppliers** — `id`, `company_id`, `name`, `contact`, `return_terms (text)`, `created_at`; unique `(company_id, name)`.
- **products** — `id`, `company_id`, `sku`, `name`, `category`, `barcode`, `unit`, `cost (numeric)`, `sell_price (numeric)`, `supplier_id (fk, nullable)`, `has_expiry (bool)`, `returnable (bool, default true)`, `status`, `created_at`; unique `(company_id, sku)`.
- **batches** — `id`, `company_id`, `product_id (fk)`, `batch_code`, `expires_at (date)`, `status ('ok'|'expiring_soon'|'expired'|'written_off')`, `created_at`; unique `(company_id, product_id, batch_code)`.
- **stock** — `batch_id (fk)`, `store_id (fk)`, `qty (int)`; PK `(batch_id, store_id)`.
- **stock_movements** — `id`, `company_id`, `product_id`, `batch_id`, `store_id`, `kind ('receive'|'sale'|'scrap'|'return')`, `qty (int)`, `reason`, `actor_id`, `created_at`.
- **supplier_returns** — `id`, `company_id`, `supplier_id (fk)`, `rma_number`, `status ('draft'|'submitted'|'shipped'|'credited'|'rejected')`, `credit_amount (numeric, default 0)`, `notes`, `actor_id`, `created_at`.
- **supplier_return_lines** — `id`, `supplier_return_id (fk)`, `batch_id (fk)`, `qty (int)`, `reason`.

**Indexes (key ones):** `batches (company_id, expires_at)`, `stock_movements (company_id, created_at)`, `products (company_id, sku)`, `stock (store_id)`.

## 4. Functional requirements

Requirements are testable; each ports behavior from the reference `src/lib/inventory.ts` where noted.

### FR-1 Authentication & tenancy
- FR-1.1 Users sign up / log in via Supabase Auth (email/password; OAuth optional later).
- FR-1.2 On first login a company + default store are created; the user becomes `admin`.
- FR-1.3 Admins can invite members and assign role (`admin`/`staff`).
- FR-1.4 All data access is scoped to the caller's company via RLS.

### FR-2 Master data & import
- FR-2.1 Users can create/edit/deactivate **products** and **suppliers**.
- FR-2.2 Users can **import** products and suppliers from CSV/Excel (column-mapping step; validate + report row errors; batch up to N rows).

### FR-3 Receiving
- FR-3.1 Users receive stock as a **batch** (`product`, `batch_code`, `expires_at`, `qty`, `store`); creates/updates `batches` + `stock`, logs a `receive` movement.
- FR-3.2 If `has_expiry` is true, `expires_at` is required.

### FR-4 Batch status derivation (port: `statusFromDate` / `syncLotStatuses`)
- FR-4.1 A batch's status is derived from `expires_at`: `expired` if `< today`; `expiring_soon` if `<= today + company.near_expiry_days`; else `ok`.
- FR-4.2 Status is recomputed on read and/or by the daily job; `written_off` is terminal.

### FR-5 Expiry board
- FR-5.1 Display batches with on-hand qty bucketed **Expired / ≤7 days / 8–14 days / Later** (windows relative to `near_expiry_days`), with `days_left` per batch, filterable by store/supplier/category.

### FR-6 Alerts (scheduled)
- FR-6.1 A daily `pg_cron` job invokes an Edge Function that, per company, finds expiring-soon/expired batches and sends an **email digest** to admins + writes **in-app notifications**.
- FR-6.2 Digest frequency (daily/weekly) is a company setting.

### FR-7 Expired return-to-supplier (RTV) — core (port: factory/vendor returns)
- FR-7.1 Users create a **supplier return** from selected expired/near-expired batches (grouped by supplier), producing `supplier_returns` + `supplier_return_lines` and `return` movements that reduce stock.
- FR-7.2 Users update return **status** (`draft`→`submitted`→`shipped`→`credited`/`rejected`) and record **credit_amount**.
- FR-7.3 A batch flagged `returnable=false` (or product non-returnable) is routed to **scrap** instead (FR-8).

### FR-8 Scrap / write-off (port: `scrapLot`)
- FR-8.1 Users scrap a batch: set `written_off`, zero its stock, log a `scrap` movement.

### FR-9 Outflow & FEFO (port: `takeAvailable` / `sellItem`)
- FR-9.1 Recording outflow deducts stock **FEFO** (`order by expires_at asc nulls last, created_at asc`), excluding `expired`/`written_off` batches.
- FR-9.2 The system must **refuse** to sell/allocate expired stock.

### FR-10 ROI / waste report (port: overview aggregates)
- FR-10.1 Report shows, over a period: value expired, value scrapped, value returned, **credit recovered from suppliers (RM)**, and month-over-month trend, filterable by store/supplier.
- FR-10.2 A dashboard surfaces KPI tiles (SKUs, on-hand, expiring ≤14d, expired, open returns, RM recovered this month) + soonest-to-expire list + recent movements.

## 5. External interfaces
- **UI:** responsive web (desktop-first for back-office; usable on tablet/phone for receiving). Screens: Login, Dashboard, Products, Suppliers, Receive, Expiry board, Returns (RTV), Reports, Settings/Team.
- **Import:** CSV/Excel upload via Supabase Storage; parsed server-side.
- **Email:** outbound transactional email via provider (Edge Function).
- **APIs:** internal only in v1 (Next.js server actions / Supabase). Public API + POS connectors are "Next".

## 6. Security & multi-tenancy
- SEC-1 **RLS enabled on every business table.** Policy: a row is visible/editable only if its `company_id` is in the caller's `company_members`.
- SEC-2 Service-role key used only server-side (never shipped to the browser).
- SEC-3 Role checks: only `admin` can invite members, change company settings, delete master data.
- SEC-4 Passwords/sessions managed by Supabase Auth; enforce HTTPS; least-privilege API keys.
- SEC-5 Audit trail via `stock_movements` + `supplier_returns` status history.

## 7. Non-functional requirements
- NFR-1 **Reliability/trust:** stock and credit figures must be correct and consistent (movements are the source of truth; writes are transactional). This is enterprise-grade software handling money.
- NFR-2 **Performance:** common list/board views < 1s for a typical store (thousands of SKUs); reports < 3s.
- NFR-3 **i18n:** locale-aware date display (never ambiguous DD/MM vs MM/DD), multi-currency-ready, translatable UI strings.
- NFR-4 **Backups/DR:** rely on Supabase automated backups; document restore procedure.
- NFR-5 **Observability:** application + job logging; alert-job failures are surfaced.
- NFR-6 **Scalability:** multi-tenant from day one; schema + RLS support many companies/stores.
- NFR-7 **Accessibility:** keyboard-navigable, sufficient contrast, focus states.

## 8. Data migration / onboarding
- Import path (CSV/Excel) is the primary onboarding, matching how customers export from AutoCount/SQL/Million-type systems. Expiry dates (absent from their system) are captured going forward at receiving.

## 9. Out of scope (v1)
Near-expiry markdown; GS1/OCR expiry capture; POS/ERP two-way integration; demand forecasting; surplus/donation channel; advanced multi-store transfers; public API. (See PRD roadmap.)

## 10. Traceability (features → PRD)
| SRS | Implements PRD |
|---|---|
| FR-1 | §6.1 |
| FR-2 | §6.2 |
| FR-3 | §6.3 |
| FR-4, FR-5 | §6.4 |
| FR-6 | §6.5 |
| FR-7, FR-8 | §6.6 |
| FR-9 | §6.7 |
| FR-10 | §6.8, §7 |

## 11. Acceptance tests (v1 "done")
1. Sign up → company + Main store created; inviting a `staff` user works; RLS blocks cross-company access.
2. Import a CSV of products + suppliers; errors reported per row.
3. Receive two batches of one product with different expiry dates → stock + `receive` movements correct.
4. Record outflow → **FEFO** removes the earliest-expiring batch first; selling an expired batch is refused.
5. Set a batch's `expires_at` in the past → it appears under **Expired**; create a **supplier return** for it → stock reduced, `return` movement logged; mark **credited** with an amount.
6. Scrap a non-returnable expired batch → `written_off`, stock zeroed, `scrap` movement logged.
7. Daily alert job emails an admin the expiring/expired digest.
8. ROI report shows value expired, value returned, and **RM recovered** for the period, matching the movements.

---
*Reference logic is ported from `reference/…grok-workspace.zip` (`src/lib/inventory.ts`), which stays untouched and will be removed when the user decides.*
