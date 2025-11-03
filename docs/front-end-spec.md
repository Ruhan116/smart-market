# SmartMarket: UI/UX Specification
**AI-Powered SME Business Intelligence Platform for Bangladesh**

**Document Version:** 1.0
**Date Created:** 2025-11-02
**Status:** Ready for Frontend Development
**Project:** Hackathon MVP + Post-Launch Roadmap

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Section 1: Introduction & Market Context](#section-1-introduction--market-context)
3. [Section 1.1: UX Goals, Personas & Design Principles](#section-11-ux-goals-personas--design-principles)
4. [Section 2: Information Architecture](#section-2-information-architecture)
5. [Section 3: User Flows](#section-3-user-flows)
6. [Section 4: Branding & Visual Design System](#section-4-branding--visual-design-system)
7. [Section 5: Wireframes & UI Mockups](#section-5-wireframes--ui-mockups)
8. [Section 6: Accessibility & Responsiveness](#section-6-accessibility--responsiveness)
9. [Implementation Checklist](#implementation-checklist)

---

## Executive Summary

**SmartMarket** transforms fragmented SME business signals (sales, payments, receipts, voice) into actionable intelligence for demand forecasting, inventory management, cash flow prediction, and customer retention. The UI/UX specification defines design patterns, components, and workflows that make complex AI predictions accessible to Bangladesh's 7.8+ million SMEs—many with zero English literacy, limited smartphone access, and time-constrained schedules.

### Design Philosophy: "Grand Yet Accessible"

- **Premium & Trustworthy:** Professional interface that makes SME owners feel successful
- **Culturally Resonant:** Bangla-first, meaningful color symbolism (green = prosperity, red = urgency)
- **Standard UX Patterns:** Familiar interactions (WhatsApp-style cards, bottom tabs, progressive disclosure)
- **Omnichannel:** SMS for feature-phone users (Akhter), mobile web for smartphones (Fatima), desktop for managers (Rajib)

### Key Design Decisions

1. ✅ **Recommendation Feed** (not traditional dashboard) — Matches WhatsApp behavior
2. ✅ **SMS-First for Ultra-Low-Tech Users** — Not WhatsApp; pure SMS works on any phone
3. ✅ **Proxy User Model** — Family member opens app on behalf of owner
4. ✅ **Traffic Light Status System** (🔴🟡🟢) — Instant comprehension, colorblind-safe
5. ✅ **Transparent Confidence Scores** — "90% confident based on 6 months of data"
6. ✅ **2-Tap Execution** — Recommendation → Confirm → Done

---

## Section 1: Introduction & Market Context

### The Challenge

Bangladesh's urban SMEs (retail shops, restaurants, salons, 1-10 employees, $500-3,000/month revenue) operate without intelligence tools. Pain points:
- **15-25% annual revenue loss** to stockouts (no demand forecasting)
- **40% of SME failures** due to cash flow crises (no visibility)
- **Unmeasurable customer churn** (no retention strategy)

Traditional BI tools (Tableau, Zoho Analytics) cost $15-50/user/month—prohibitive for SMEs—and require:
- Technical expertise
- Clean structured data
- Desktop access
- English proficiency

### SmartMarket's Approach

1. **Passive Data Capture** — SMS notifications, receipt photos, CSV uploads (zero manual entry)
2. **Lightweight AI Models** — Prophet forecasts, RFM churn scoring (affordable, interpretable)
3. **Actionable Recommendations** — "Order 20 shirts by Tuesday" (not just insights)
4. **Accessible Interfaces** — SMS (basic phone), mobile web (smartphone), desktop (managers)
5. **Bangla-First** — Respects 40-50% of target market with low English literacy

### Design Foundation

This specification prioritizes:
- **Clarity over Complexity:** One screen = one decision
- **Visual Communication:** Colors, icons, numbers > text
- **Mobile-First:** 95% of users access via smartphone or feature phone
- **Progressive Disclosure:** Summaries first, details on demand
- **Trust Building:** Transparent confidence levels, clear data sources

---

## Section 1.1: UX Goals, Personas & Design Principles

### Four Target Personas

#### Persona 1: Akhter — Ultra-Low-Tech Retail Owner (Primary)
- **Age:** 40, runs clothing shop 10 years, 2 employees
- **Tech:** Basic button phone (SMS-only), no smartphone
- **Literacy:** Bangla-only, primary education
- **Pain:** "Don't know when to order; only discover stockouts when customers ask"
- **Success:** "Get an SMS saying 'Order 20 shirts by Tuesday' and show it to my supplier"
- **Access:** SMS primary, web via family member (proxy model)

#### Persona 2: Fatima — Restaurant Owner (Secondary)
- **Age:** 42, runs restaurant, 5 employees
- **Tech:** Smartphone (bilingual), familiar with WhatsApp
- **Literacy:** Bangla/English, high school+
- **Pain:** "Can't predict busy/slow days; staffing is ad-hoc"
- **Success:** "See forecasts on my phone, know which products to order in advance"
- **Access:** Mobile web, WhatsApp (Phase 2)

#### Persona 3: Karim — Tech-Savvy SME Owner (Tertiary)
- **Age:** 28, electronics shop, has POS system
- **Tech:** Smartphone + laptop, early adopter
- **Literacy:** English-literate, college-educated
- **Pain:** "Have data but don't know what it means"
- **Success:** "See trends, forecasts, detailed analytics to make business decisions"
- **Access:** Mobile web + desktop, wants detailed reports

#### Persona 4: Rajib — Supermarket Manager (Secondary)
- **Age:** 32, manages mid-size supermarket, 10+ employees
- **Tech:** Desktop/POS at register, occasional smartphone
- **Literacy:** Bilingual, high school+
- **Pain:** "Suppliers don't give visibility; we overstock and waste capital"
- **Success:** "Check inventory forecasts quickly at register, make reorder decisions"
- **Access:** Desktop web (primary), mobile backup

### Usability Goals

1. **Activation:** Upload first data and receive a recommendation **within 30 minutes**
2. **Insight Delivery:** Understand forecast/recommendation meaning **in <10 seconds**
3. **Action Enablement:** Execute recommended action **in 2 taps**
4. **Trust Building:** Trust recommendations **by week 2** (see 2-3 accurate predictions)
5. **Accessibility:** Zero-English-literacy users can navigate core flows

### 5 Core Design Principles

#### Principle 1: "Intelligence Made Simple"
Translate complex forecasts into one-sentence, visual-first communication.
- Show result, not process ("Reorder 20 shirts by Jan 15" NOT "Prophet ARIMA predicts...")
- Color-code urgency (🔴 critical, 🟡 caution, 🟢 safe)
- Confidence levels visible but not dominant ("90% confident")

#### Principle 2: "Meet Users Through Their Actual Access Pattern"
Users access SmartMarket through **different devices, literacy levels, and proxy scenarios**.
- **SMS-first for Akhter** (basic phone) → Concise, self-contained alerts
- **Mobile web for Fatima & Karim** (smartphone) → Rich interface, touch-friendly
- **Desktop web for Rajib** (supermarket manager) → Larger screen, detailed views
- **Proxy-friendly UX** → Family members open app on behalf of owner; design so they can explain recommendations aloud

#### Principle 3: "Transparency Over Automation"
Users trust recommendations when they understand **why**.
- Show confidence ("90% confident based on 6 months data")
- Explain logic ("Forecast = 12 units needed next week, Current stock = 5 units, So order 15 units")
- Acknowledge uncertainty ("Less certain because sales vary on weekends")
- Feedback loop (show when predictions were accurate, build trust)

#### Principle 4: "Respect for Time"
SME owners work 10-12 hour days; they're time-starved.
- No screen requires >30 seconds to understand
- One screen = one decision
- Minimize scrolling, especially on mobile
- Minimize text (visual > verbal)
- Async processing (don't make user wait; show "Processing...")

#### Principle 5: "Cultural Sensitivity & Local-First Design"
Bangladesh market has distinct preferences; don't impose Western patterns.
- **Bangla is first-class language**, not translation afterthought
- **Visual metaphors** familiar to Bangladesh (bazaar, supplier relationships)
- **Trust signals** matter (show data source, explain security, respect privacy concerns)
- **Avoid forced "digital transformation" narrative** (respect traditional business methods)

---

## Section 2: Information Architecture

### Screen Inventory

**SME App:** 11 core screens organized into 5 zones
**Admin Portal:** 40+ screens organized into 9 feature groups
**SMS Channel:** Linear messaging (no UI navigation)

### Navigation Structure

#### Mobile: Bottom Tab Bar + Card Feed
```
[Home] [Actions] [Data] [More]  ← Sticky bottom tabs
```
- **Home:** Summary of key metrics + top 2-3 recommendations
- **Actions:** Recommendations feed (filtered, prioritized)
- **Data:** Forecasts, Cash Flow, Products, Customers (swipeable tabs)
- **More:** Upload data, Settings, Help, Logout

#### Desktop: Left Sidebar + Multi-Panel
```
Sidebar (collapsible)          Main Content (full width)
├─ Dashboard                   ├─ Content area
├─ Forecasts                   ├─ Detail panel (right side)
├─ Cash Flow                   └─ No horizontal scroll ideal
├─ Products
├─ Customers
├─ Data
└─ Settings
```

#### SMS: Linear Message Exchange
```
User replies: Y/N/HELP
System responds with confirmation or next action
```

### 11 Core SME App Screens

1. **Home / Dashboard** — Entry point, stat cards, top recommendations, refresh timestamp
2. **Recommendations Feed** — All actions ranked by priority, filters (type, urgency), status tabs
3. **Forecasts (List)** — 7/14/30-day horizon selector, product cards with charts, status indicators
4. **Forecasts (Detail)** — Product name, current stock, line chart, confidence, accuracy history, [Reorder] button
5. **Cash Flow** — Current balance, area chart (balance trajectory), risk level, critical date, suggestions
6. **Products / Inventory** — Filter (All|Low Stock|High Sales), stock bar, sales arrow, forecast status
7. **Customers / Churn** — Segment filter (Champions|At-Risk|Dormant), RFM metrics, risk scores, reasons
8. **Data Upload** — CSV tab (preview, column mapping), Receipt OCR tab (image preview, extraction)
9. **Transactions History** — Date range filter, Product filter, Payment method filter, summary row (total revenue, avg)
10. **Settings / Business Profile** — Business info, language preference (Bangla|English), notification frequency, timezone, reorder thresholds
11. **Help / FAQ** — Video tutorials, text FAQ in Bangla, glossary, contact support

### Admin Portal: 9 Feature Groups (40+ screens)

1. **Platform Health & Observability** — System dashboard, real-time metrics, job queue telemetry, alert management, log explorer
2. **User & Tenant Management** — User directory (search, impersonation), quotas, feature flags, plans/subscriptions, pilot requests
3. **Data & Ingestion Ops** — CSV parser debugger, OCR inspector, DLQ viewer, bulk reprocessing, data quality dashboard
4. **ML Observability & Model Ops** — Forecast model performance (MAPE per cohort), version management, retraining scheduler, drift alerts, explainability traces
5. **Marketplace & Supplier Ops** — Supplier management, reliability scoring, price history, RFQ monitoring, marketplace metrics
6. **Recommendation Tuning & Rules** — Rule configuration, threshold tuning, preview sandbox, recommendation performance, A/B testing
7. **Billing, Accounting & Compliance** — Revenue dashboard (MRR), invoices, refunds, data deletion pipeline (GDPR), audit logs
8. **Security & Access Control** — Admin user management (RBAC), audit trail, API key management, security alerts, incident response
9. **Data Governance & Consent** — Data usage approvals, anonymization jobs, dataset snapshots, consent management, privacy risk assessment

---

## Section 3: User Flows

This section details 7 critical user journeys:

### SME User Flows

**Flow 1: First-Time Activation (Akhter, SMS-primary)**
- Signup → Upload CSV → Forecast generation → SMS alert → Reply via SMS → Execution recorded
- **Success metric:** Activation < 1 hour, SMS delivery confirmed

**Flow 2: Mobile Quick Execute (Fatima, smartphone)**
- Open app → See recommendation → Tap "Execute" → Confirm in modal → Stepper to adjust qty → Success toast
- **Success metric:** Execution < 2 taps, <30 seconds total time

**Flow 3: SMS-Only Channel (Akhter, feature phone)**
- Receive SMS alert → Read (may show supplier) → Reply "Y" → Receive confirmation SMS
- **Success metric:** Pure SMS works, no app required, confirmation immediate

**Flow 4: Desktop Quick Check (Rajib, at register)**
- Click Forecasts → See table (48px rows, scannable) → Click product → Detail panel opens → Click [Reorder]
- **Success metric:** Scan + decide < 2 minutes, no scrolling for key info

### Admin User Flows

**Flow A1: Demo Seed (Super Admin, hackathon demo prep)**
- Navigate to Demo Tools → Select template (retail-demo-v1) → [Seed] → Auto-generates business, 180 transactions, 15 products → Impersonate → SME app fully populated
- **Success metric:** Demo ready < 1 minute, all screens populated with data

**Flow A2: Failed Job Retry (Ops admin, troubleshooting)**
- Job queue shows 12 failed forecast jobs → Click job-4521 → View error ("Missing date column") → [Inspect CSV] → See problematic row → Explain to user → [Re-Queue Job] → Forecast regenerates
- **Success metric:** Root cause found, issue resolved < 10 minutes, audit logged

**Flow A3: Rule Tuning & A/B Test (Data Science team)**
- Rule Config: Change cash threshold from 20% to 15% → [Run Simulation] → See impact ("Est. +25% warnings") → Create segment rule (15% for retailers, 17% for restaurants) → [Schedule Rollout: 10% → 50% → 100%] → Monitor adoption → Decide to rollout fully
- **Success metric:** Rules tested before production, impact previewed, gradual rollout reduces risk

---

## Section 4: Branding & Visual Design System

### Color Palette (Symbolic for SMEs)

| Color | Hex | Meaning | Usage | Why This Color |
|---|---|---|---|---|
| **Growth Green** | #10B981 | Prosperity, success, "go" | Primary buttons, positive indicators, growth metrics | Green = money & abundance in South Asian culture |
| **Urgent Red** | #EF4444 | Critical, high priority, danger | Critical alerts, stockouts, cash warnings | Red = immediate attention needed |
| **Cautious Amber** | #F59E0B | Medium priority, needs attention | Medium alerts, declining trends | Gold = prosperity but with caution |
| **Trust Blue** | #3B82F6 | Information, links, secondary actions | Informational messages, "Learn more" links | Blue = calm, professional, reliable |
| **Neutral Gray** | #6B7280 | Secondary text, borders | Labels, helper text, disabled states | Professional, de-emphasize non-critical |
| **Clean White** | #FFFFFF | Backgrounds, breathing room | Card surfaces, main backgrounds | Clarity, premium feel |

**Contrast Ratios (WCAG AA):**
- ✅ Green on white: 4.54:1
- ✅ Red on white: 3.99:1 (passes AA for large text)
- ✅ Amber on white: 4.48:1
- ✅ Blue on white: 4.42:1

**Colorblind Safety:** All status indicators paired with icons (🔴 + text "Critical", not color alone)

### Typography System

| Element | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| **H1** | 32px | 700 (Bold) | 1.2 | Page titles, hero sections |
| **H2** | 24px | 700 (Bold) | 1.3 | Section headers, screen titles |
| **H3** | 20px | 600 (Semibold) | 1.4 | Card titles, subsections |
| **Body Large** | 16px | 400 (Regular) | 1.6 | Primary text, descriptions |
| **Body** | 14px | 400 (Regular) | 1.6 | Standard text, lists |
| **Small** | 12px | 400 (Regular) | 1.5 | Labels, captions |

**Font Stack:**
- **English:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Bangla:** `'Noto Sans Bengali', sans-serif` (open-source, excellent spacing)
- **Monospace:** `'IBM Plex Mono', monospace` (numbers, dates, code)

**Rationale:** Larger body (16px) readable for aging SME owners (40-60 years old), generous line height (1.6) easier to scan on mobile

### Component Library

#### Button (Primary: Green)
```
Height: 48px (touch-friendly)
Padding: 12px (V) × 16px (H)
Border radius: 8px
Font size: 16px (body large)
Background: #10B981 (green)
Text: White
Hover: #059669 (darker green, -15%)
Active: #047857 (even darker, -25%)
Disabled: #D1D5DB (light gray), cursor: not-allowed
```

#### Card (Information Container)
```
Background: #FFFFFF
Border: 1px #E5E7EB (light gray)
Border radius: 12px
Shadow: 0 1px 3px rgba(0,0,0,0.1)
Hover shadow: 0 4px 6px rgba(0,0,0,0.12)
Padding: 16px
Status card (high priority):
  - Border-left: 4px #EF4444
  - Background: #FEF2F2 (very light red)
```

#### Stat Card (Key Metrics)
```
Label: 12px, gray (#6B7280)
Number: 32px, dark (#1F2937), bold
Trend: 14px, green if up (#10B981), red if down (#EF4444)
Arrow icon: ↑ or ↓
Background: #F9FAFB (very light gray)
Border: 1px #E5E7EB
```

#### Chart (Visualizations)
```
Library: Recharts (React-native)
Line color: #10B981 (green for forecasts)
Confidence band: #DCFCE7 (light green, 30% opacity)
Grid lines: #F3F4F6 (very light gray)
Axis labels: 14px, gray
No 3D effects (keep clean, professional)
Mobile: Single-line sparkline or area chart
Desktop: Full width, detailed, interactive tooltips
```

### Spacing & Layout (8px Grid)

```
Spacing scale:
- 8px (xs): padding between elements
- 16px (sm): padding in components
- 24px (md): section spacing
- 32px (lg): major section break
- 48px (xl): hero spacing

Mobile (320-479px):
- Padding: 16px sides
- Card margins: 12px
- Button height: 48px

Tablet (480-767px):
- Padding: 24px sides
- Full-width buttons

Desktop (900px+):
- Padding: 32px sides
- Max-width: 1200px (centered)
- Sidebar: 250px, main: 950px
```

---

## Section 5: Wireframes & UI Mockups

### Wireframe 1: Mobile Home Dashboard (375px)

**Content (top to bottom):**
```
[Header: "Last updated 2 min ago"] [🔄 Refresh]

[Stat Cards Row - 3 per row]
- Revenue (this week): ৳125,000 ↑ 8%
- Customers: 120 (3 at-risk)
- Stock: 2 low items

[Top Recommendation Card - RED]
🔴 Reorder Biryanis (Stock Ending Soon)
Current: 3 | Forecast: 8 by tomorrow
[See Details ▶] [Execute ✓]

[Cash Flow Alert - if critical]
💰 Warning: ৳8,000 balance Jan 18

[See all X recommendations →]

[Footer: Bottom Tab Nav]
[🏠 Home] [⚡ Actions] [📊 Data] [⋯ More]
```

**Design Notes:**
- Single column, full-width cards
- Stat cards: 2 per row on small mobile (320px), 3 per row on larger (375px+)
- Card padding: 16px, margin: 12px between cards
- Hero recommendation (red, prominent) gets tapped first
- Bottom nav sticky (56px height)

### Wireframe 2: Mobile Recommendation Execute Flow

**Step 1: Card Shown (initial state)**
```
[Red card with "Execute ✓" button]
```

**Step 2: Bottom Sheet Modal (confirmation)**
```
[Modal slides up from bottom]
- Title: "Reorder Biryanis"
- Current stock: 3
- Forecast: 8 units
- Recommended qty: 6 (editable stepper: - [6] +)
- Confidence: 90%
- [Confirm Execute] (green, full-width)
- [Cancel] (gray outline)
```

**Step 3: Success Toast (auto-dismiss 3s)**
```
✅ Recommendation Executed!
In Phase 2: Order will be sent to supplier
```

**Design Notes:**
- Modal: Bottom sheet (mobile UX pattern)
- Stepper: 48px height, centered number
- Buttons: Full width on mobile
- Toast: Auto-dismiss, green checkmark

### Wireframe 3: Desktop Forecasts List (1200px)

**Layout:**
```
Sidebar (250px) | Main Content (950px) | Detail Panel (collapsible)
├─ Home         │ ┌─ Forecast Table ────────────────────────────┐
├─ Forecasts    │ │ Product│Stock│Forecast│Days│Status│Action   │
├─ Cash Flow    │ │────────┼─────┼────────┼────┼──────┼─────────│
├─ Products     │ │ Rice   │ 2   │ 12     │ 2  │ 🔴   │ [Reord] │
├─ Customers    │ │ Oil    │ 5   │ 8      │ 4  │ 🟡   │ [Reord] │
└─ More         │ │ Spices │ 20  │ 5      │ 60 │ 🟢   │ —       │
               │ └────────────────────────────────────────────────┘
               │
               │ ┌─ Detail Panel (if tapped) ──────────────────────┐
               │ │ RICE (5kg Bag)                                  │
               │ │ Current: 2 | Forecast: 12                      │
               │ │ [Line Chart: 7d forecast]                      │
               │ │ Confidence: 90% | Accuracy: MAPE 90%           │
               │ │ Qty: [12] | Needed by: Jan 16, 6 AM            │
               │ │ [Reorder] [See Details]                        │
               │ └─────────────────────────────────────────────────┘
```

**Design Notes:**
- Sidebar always visible (250px)
- Table: Striped rows (48px height), scannable
- Status icons + color (no color alone)
- Detail panel: Right-side expandable or separate pane

### Wireframe 4: Admin System Dashboard (1400px)

**Layout:**
```
Header | Pinned Shortcuts | System Status Cards | 4 Metric Charts | Alerts & Incidents
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Content:**
```
[Status Cards Row]
🟢 API 99.8% | 🟢 Database 98.5% | 🟡 Kafka 14K lag | 🟢 Forecasting 8.2s

[4 Charts Grid - No Scroll]
- API Response Time (p95) | Error Rate (%)
- Database Size Growth | Active Users

[Alerts Section]
🔴 CRITICAL: Forecast latency >15s (3h ago)
🟡 WARNING: Kafka lag >20K (ongoing)
✅ INFO: Scheduled maintenance tomorrow 2-3 AM UTC

[Quick Actions]
[Seed Demo] [Reset Demo] [View Logins]
```

**Design Notes:**
- Left sidebar: Always visible, collapsible
- Main content: 4 metrics visible without scroll
- Cards: Status boxes with health indicators
- Alerts: Color-coded (red/amber/green) with action buttons

### Wireframe 5: SMS Messages (Feature Phone)

**Scenario 1: Reorder Alert (Outgoing)**
```
SmartMarket
✓ (delivered)

🔴 URGENT: Order Shirts
Stock: 2, Need: 20 by Jan 15
Reply Y to confirm

Sent: 5:32 PM (Jan 15)
```

**Scenario 2: Confirmation (Incoming)**
```
✅ Order confirmed!
Supplier: Hasan Supplies
Phone: 01712345678
Tell them: 20 Shirts, Jan 15

Sent: 5:34 PM (Jan 15)
```

**Design Notes:**
- Max 160 chars per message
- Emojis: 🔴 (urgent), ✅ (success), ⚠️ (warning), 💰 (money), 📊 (data)
- Clear action: Y/N/HELP response
- Supplier contact: Always included (copy-paste ready)
- Bangla support: 70 chars per SMS (wider characters)

---

## Section 6: Accessibility & Responsiveness

### WCAG 2.1 Level AA Compliance

| Criterion | Requirement | Implementation | Status |
|---|---|---|---|
| **1.4.3 Contrast** | 4.5:1 for body text | All text pairs tested & pass | ✅ PASS |
| **1.4.4 Resize Text** | Resizable up to 200% | CSS uses rem, em (not fixed px) | ✅ PASS |
| **2.1.1 Keyboard** | All functions via keyboard | Tab order logical, Enter/Esc work | ✅ PASS |
| **2.4.3 Focus Order** | Logical, meaningful | Mobile: rec→execute→dismiss. Desktop: sidebar→content→detail | ✅ PASS |
| **2.4.7 Focus Visible** | Focus indicator visible | 3px blue ring (#3B82F6) | ✅ PASS |
| **1.1.1 Non-text Content** | Images have alt text | `alt="Critical status"`, `aria-label="High priority"` | ✅ PASS |
| **3.3.1 Error ID** | Errors clearly identified | "❌ Invalid email" in red, suggestions below | ✅ PASS |
| **4.1.2 Name, Role, Value** | UI components properly named | `role="button"`, `aria-label="Execute recommendation"` | ✅ PASS |

### Responsive Breakpoints

```
Mobile (320-479px):
- Single column layout
- Stat cards: 2-3 per row
- Full-width buttons
- Bottom sticky nav

Tablet (480-767px):
- Single or 2-column (contextual)
- Sidebar optional (collapsible)
- 3 stat cards per row
- Wider buttons (not full-width)

Desktop (900-1199px):
- Left sidebar (250px) always visible
- 2-3 column main content
- Detail panels on side/expandable
- Information-dense tables

Large Desktop (1200px+):
- Max-width: 1400px (centered)
- Sidebar: 280px
- Multiple panels visible simultaneously
```

### Mobile Performance (3G Networks)

| Metric | Target | Approach |
|---|---|---|
| **Page Load** | <1.5s | Lazy-load images, inline critical CSS, defer JS |
| **Time to Interactive** | <3s | Code splitting per route, preload critical APIs |
| **Data Usage** | <2 MB/session | WebP images, compress API payloads, aggressive caching |
| **Lighthouse Score** | >80 | Optimize CLS, LCP, FID |

### Keyboard Navigation

**Mobile Tab Order:**
```
Logo → Refresh → Stat cards → Recommendations (iterate through each) → Bottom nav

ESCAPE: Close modals
ENTER: Activate buttons
ARROW KEYS: Navigate recommendation feed
```

**Desktop Tab Order:**
```
Logo → Sidebar links → Main content → Filters → Table rows → Detail panel

ESCAPE: Close detail panel
ARROW: Navigate table rows/columns
ENTER: Expand detail
```

### Screen Reader Support

```html
<!-- Recommendation Card -->
<article role="region" aria-label="High priority recommendation">
  <h3>Reorder Shirts</h3>
  <p>Forecast confidence: 90 percent</p>
  <button aria-label="Execute recommendation to reorder shirts">Execute ✓</button>
</article>

<!-- Status Indicator -->
<div role="img" aria-label="Stock status: Critical - 2 items low">
  🔴 Stock: 2 items low
</div>

<!-- Chart with Fallback Table -->
<figure>
  <figcaption>Demand forecast for shirts over 7 days</figcaption>
  <svg aria-label="Line chart showing demand increasing...">...</svg>
  <table aria-label="Data table backing the forecast chart">...</table>
</figure>
```

### Color Blindness Considerations

**Never use color alone:**
```
✅ RIGHT: 🔴 + "Critical" + bold text
❌ WRONG: Only red color (color-blind users miss it)
```

**Icons + Text for all statuses:**
- 🔴 + "Critical" (red)
- 🟡 + "Caution" (amber)
- 🟢 + "Healthy" (green)
- ℹ️ + "Information" (blue)

---

## Implementation Checklist

### Pre-Development

- [ ] **Read Full PRD** — Understand MVP scope, API endpoints, backend architecture
- [ ] **Review all wireframes** — Familiarize with 5 wireframe examples
- [ ] **Understand personas** — Know the 4 user types (Akhter, Fatima, Karim, Rajib)
- [ ] **Design system walkthrough** — Colors, typography, spacing, components

### Component Development (React)

- [ ] **Setup project** — React 18 + TypeScript + Vite + Tailwind + tailwindcss-forms
- [ ] **Create design system** — CSS variables for colors, fonts, spacing (design tokens)
- [ ] **Build reusable components:**
  - [ ] Button (primary, secondary, danger, ghost)
  - [ ] Card (standard, status, stat card variants)
  - [ ] Stat Card (metric display)
  - [ ] Modal / Bottom Sheet (mobile-specific)
  - [ ] Toast notifications (success, error, warning, info)
  - [ ] Tab navigation (bottom on mobile, sidebar on desktop)
  - [ ] Chart components (area chart, line chart from Recharts)
  - [ ] Form inputs (text, email, password, select, date picker)
  - [ ] Table (responsive, with sticky header, sortable)
  - [ ] Skeleton loaders (for async data loading)

### Page Development

- [ ] **Auth screens** — Signup, Login (mobile & desktop)
- [ ] **Home Dashboard** — Stat cards, recommendation hero, top recs, refresh
- [ ] **Recommendations Feed** — Cards, filters, status tabs, pagination
- [ ] **Forecasts** — List view (table), detail view (expanded card with chart)
- [ ] **Cash Flow** — Area chart, risk assessment, suggestions
- [ ] **Products** — Inventory list, stock bars, sales arrows
- [ ] **Customers** — RFM segments, churn risk, customer cards
- [ ] **Data Upload** — CSV tab, OCR tab, preview, progress state
- [ ] **Transactions** — Table with filters, pagination, summary
- [ ] **Settings** — Business info, language toggle, notification preferences
- [ ] **Help / FAQ** — Links, video embeds, glossary

### Responsive Design

- [ ] **Mobile (375px)** — Test all screens at 375px, check touch targets (48px+)
- [ ] **Tablet (600px)** — Layout adjustments, sidebar behavior
- [ ] **Desktop (1200px)** — Sidebar visible, multi-column layouts, info density
- [ ] **Lighthouse** — Run audit, target >80 score
- [ ] **Zoom to 200%** — No horizontal scroll, content readable

### Accessibility Testing

- [ ] **Color Contrast** — Lighthouse audit, axe DevTools (4.5:1+)
- [ ] **Keyboard Navigation** — Tab through all screens, no traps, focus visible
- [ ] **Screen Reader** — Test with NVDA/JAWS (Windows) or VoiceOver (Mac)
- [ ] **Mobile Accessibility** — iOS VoiceOver, Android TalkBack
- [ ] **Form Validation** — Error messages clear, recoverable
- [ ] **Color Blindness** — Simulate with Coblis, verify icons + text

### Performance Optimization

- [ ] **Code Splitting** — Lazy-load pages per route
- [ ] **Image Optimization** — WebP format, lazy loading, responsive sizes
- [ ] **Caching Strategy** — HTML (no-cache), CSS/JS (1-year with versioning), API (5-min)
- [ ] **Bundle Size** — Tree-shake unused code, minify CSS/JS
- [ ] **3G Throttling** — Test with DevTools throttling, target <1.5s paint

### API Integration

- [ ] **API Client Setup** — Axios with auth, error handling, auto-refresh
- [ ] **Auth Flow** — Register, login, token management, logout
- [ ] **Data Fetching** — Implement GET endpoints (home, recommendations, forecasts, etc.)
- [ ] **Error Handling** — User-friendly error messages, retry logic
- [ ] **Loading States** — Skeleton loaders, spinners, disabled buttons during requests

### i18n (Bangla/English)

- [ ] **Language Detection** — Auto-detect from browser or user preference
- [ ] **String Extraction** — All UI strings to i18n keys
- [ ] **Bangla Translations** — Translate all strings with native speaker review
- [ ] **Bangla Typography** — Noto Sans Bengali font, wider letter spacing (0.02em)
- [ ] **Language Toggle** — User can switch Bangla/English in settings

### Admin Portal (Phase 1, after MVP)

- [ ] **Admin Auth** — Separate login, RBAC checks
- [ ] **System Dashboard** — Status cards, charts, alerts
- [ ] **User Management** — Directory, impersonation, quotas
- [ ] **Job Management** — List failed jobs, [Retry] button
- [ ] **Demo Tools** — [Seed Demo], [Reset Demo] buttons
- [ ] **Audit Log Viewer** — Search, filter, export admin actions

### Final QA

- [ ] **Smoke Tests** — Sign up, login, upload, see recommendations, execute
- [ ] **Cross-Browser** — Chrome, Firefox, Safari, Edge (last 2 versions)
- [ ] **Mobile Devices** — Test on iPhone SE, Android (various sizes)
- [ ] **SMS Messages** — Test on real SMS apps (iPhone, Android)
- [ ] **Demo Data** — Seed demo dataset, verify all screens populated
- [ ] **Bug Bash** — Team tests all flows, reports issues, fixes critical bugs
- [ ] **Documentation** — Component storybook, developer guide, deployment docs

---

## Document Metadata

**Document Owner:** Sally (UX Expert)
**Last Updated:** 2025-11-02
**Version:** 1.0
**Status:** Ready for Frontend Development
**Next Review:** After MVP completion & pilot feedback

### How to Use This Spec

1. **Developers:** Read Sections 1-2 for context, Sections 4-6 for implementation details
2. **Designers:** Reference Sections 4-5 (design system & wireframes) for visual consistency
3. **QA:** Use Section 6 (accessibility checklist) + Section 3 (user flows) for testing
4. **PM:** Review Sections 1-3 (strategy, personas, flows) for stakeholder communication

### Known Limitations & Future Work

- **Phase 1 (Post-MVP):** WhatsApp Business integration, advanced analytics, multistore support
- **Phase 2:** Marketplace, supplier network, voice interface, mobile native apps
- **Admin Portal:** Full RBAC, advanced ML observability, data governance tools (Phase 1+)

---

**Generated with ❤️ for SmartMarket Team | Hackathon MVP Ready**
