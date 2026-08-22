# Product Requirements Document (PRD)
### Expiry-Date Inventory SaaS — v1

| | |
|---|---|
| **Document** | Product Requirements Document (PRD) |
| **Product** | Expiry-date inventory management SaaS (working name: TBD) |
| **Version** | 0.1 (draft for review) |
| **Date** | 2026-08-22 |
| **Owner** | Product Manager |
| **Status** | Draft — pending review |

---

## 1. Overview

We are building a **SaaS that tracks product expiry dates and manages the return of expired stock to suppliers** for supermarkets and FMCG retailers/distributors.

Most retailers already run an accounting or inventory system that tracks *how much* stock they hold and *who supplies it* — but **not when it expires**. As a result, products expire on the shelf, cannot legally be sold, and the retailer often fails to claim credit back from suppliers, so the loss is absorbed as pure waste.

Our product fills exactly that gap. It **complements** (does not replace) the retailer's existing system by adding:
1. Expiry tracking at the batch level,
2. Proactive alerts before stock expires, and
3. A workflow to **return expired stock to suppliers and recover the money**.

## 2. Problem statement

**For a supermarket / FMCG retailer:**
- Their current system has **no expiry field, no batch tracking, no returns workflow** (verified against a real target customer's inventory screen — a typical Malaysian accounting package tracking stock + supplier only).
- Staff check expiry dates manually (or not at all), so near-expiry stock is discovered too late.
- Expired stock that *could* be returned to the supplier for credit is often not returned in time, or not tracked — so the retailer eats the cost.
- Selling expired goods is illegal (regulatory risk / fines / reputational damage).

**The cost is real money**, not just "waste": uncredited returns + write-offs + compliance risk.

## 3. Goals and non-goals

### Goals (v1)
- G1. Let a retailer see, at any moment, what is **expired, expiring soon, and healthy** — by batch.
- G2. **Warn** the right people *before* stock expires (alerts).
- G3. Make it easy to **return expired stock to the supplier and track the credit recovered**.
- G4. Produce a **ROI report** that shows the money recovered and waste avoided — the proof that justifies the subscription.
- G5. Be adoptable *alongside* the retailer's existing system (easy import, no rip-and-replace).

### Non-goals (v1 — explicitly deferred)
- N1. Replacing the retailer's accounting/POS system.
- N2. Near-expiry markdown/discount pricing (roadmap: Next).
- N3. GS1 barcode expiry parsing / OCR of dates (roadmap: Next).
- N4. Demand forecasting / AI markdown (roadmap: Later).
- N5. Surplus/donation marketplace integration (roadmap: Later).
- N6. Deep two-way POS/ERP integrations (roadmap: Next/Later, demand-driven).

## 4. Target user & personas

**Market (beachhead):** mid-to-large **FMCG supermarkets** in **Malaysia / SEA** that stock returnable, dated goods (personal care, packaged foods, health & beauty). Chosen because these goods have clear supplier relationships and an established return process — so recovered credit is a concrete, provable ROI.

| Persona | Role | Needs | Success looks like |
|---|---|---|---|
| **Owner / Director** (economic buyer) | Signs the cheque | Stop losing money; provable ROI | "This recovered RM X this month" |
| **Operations / Store Manager** (champion) | Runs the floor | Know what's expiring; act in time | No expired stock on shelf; returns done on time |
| **Inventory / Purchasing staff** (daily user) | Receives & returns stock | Fast data entry; clear return workflow | Less manual checking; returns processed easily |

## 5. Value proposition & ROI story

> "Your system doesn't track expiry. Products expire on your shelf, you can't sell them (and it's illegal to), and you're not claiming them back from your suppliers — so you eat the loss. We track every batch's expiry, warn you before it's too late, and manage the return-to-supplier so you recover that money."

**Two money levers:** (1) recovered supplier credits, (2) avoided fines / write-offs from expired goods.

## 6. v1 feature set & user stories

### 6.1 Accounts, teams & tenancy
- As an owner, I can create a company account and invite staff with roles (admin / staff), so my team shares one workspace securely.
- As a user, I only ever see my own company's data (strict isolation).

### 6.2 Master data & import
- As a user, I can **import my product and supplier list** from a CSV/Excel export of my existing system, so I don't re-type everything.
- As a user, I can create/edit **products** (code, name, category, unit, cost, sell price, supplier, has-expiry flag) and **suppliers**.

### 6.3 Receiving into batches
- As a user, I can receive stock as a **batch** with a **batch code, expiry date, and quantity**, into a store, so expiry is tracked from the moment it arrives.

### 6.4 Expiry visibility
- As a manager, I can see an **expiry board** bucketed into **Expired / ≤7 days / 8–14 days / Later**, so I know what needs action.
- As a manager, I can set the "expiring soon" window per company (e.g. 7, 14, 30 days).

### 6.5 Alerts
- As a manager, I receive **email + in-app alerts** (daily/weekly digest) of stock expiring soon and already expired, so nothing slips through.

### 6.6 Expired return-to-supplier (RTV) — the core workflow
- As a user, I can select expired (or near-expired) batches and **create a return to the supplier**, so I can claim credit.
- As a user, I can track the return's **status** (draft → submitted → shipped → credited/rejected) and the **credit amount recovered**.
- As a user, I can record **scrap/write-off** for stock that cannot be returned.

### 6.7 Outflow & FEFO
- As a user, when stock leaves, the system deducts **First-Expired-First-Out**, and **never allows selling expired stock**.

### 6.8 ROI / waste reporting
- As an owner, I can see a report of **value expired, value returned, RM recovered from suppliers, and the trend over time**, so I can see the product paying for itself.

## 7. Success metrics

**Product/pilot metrics (the ones that close deals):**
- RM of expired stock **returned & credited** per month per store.
- % reduction in **uncredited/expired write-offs** vs. the pre-pilot baseline.
- Expired-on-shelf incidents → target zero.

**Business metrics:**
- Pilots run → pilots converted to paid.
- Paying supermarkets; MRR/ARR (target ~42 stores ≈ RM 1M ARR at RM 2,000/mo).
- Logo retention / churn.

## 8. Pricing & go-to-market (summary)

- **Pricing:** RM 2,000/month (enterprise tier, mid-large supermarkets). Tier by store size / number of locations over time.
- **Motion:** founder-led enterprise sales — discovery → demo → **measured pilot** → ROI-based close → onboarding → land-and-expand across a chain's stores.
- **Proof:** run pilots with warm supermarkets; capture a **baseline** (expired $/quarter, uncredited returns) first, then show RM recovered, then convert.

## 9. Roadmap

| Horizon | Focus |
|---|---|
| **Now (v1)** | Auth/teams, import, products+suppliers, receive→batches, expiry board + alerts, **RTV workflow**, FEFO, ROI report |
| **Next** | Near-expiry markdown, GS1/OCR capture, POS integration, batch recall/audit reports, automation rules |
| **Later** | Demand forecasting/dynamic markdown, integrations marketplace, surplus/donation channel, multi-store transfers, mobile app |

## 10. Risks & assumptions

| # | Risk / assumption | Mitigation |
|---|---|---|
| R1 | **Data capture friction** — expiry must be entered at receiving | Fast entry UI now; GS1/OCR in "Next" |
| R2 | Incumbent accounting vendor adds expiry as a feature | Moat = frictionless capture + RTV workflow + accumulated ROI data; stay focused/deep |
| R3 | Enterprise sales is slow & founder-time-heavy | Founder-led first; time-box; pilots with warm leads |
| R4 | ROI unproven until baseline measured | Pilot always starts by measuring baseline waste |
| R5 | Assumption: FMCG suppliers accept returns for expired goods | Validate return terms during discovery per supplier |
| R6 | Single flat price ignores store size | Move to tiered pricing after first customers |

## 11. Open questions
1. Product/brand name.
2. Exact supplier-return terms/documents expected by Malaysian FMCG suppliers (affects RTV fields).
3. Whether v1 needs multi-store on day one, or single-store is enough for the first pilot.
4. Baseline waste numbers from the first pilot supermarket (to be captured in discovery).

---
*This PRD defines the "what" and "why". The companion SRS (`docs/SRS.md`) defines the "how".*
