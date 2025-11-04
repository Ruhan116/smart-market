# Epic 7: Frontend - Core Screens & UI - Brownfield Development

**Epic ID:** EPIC-7
**Status:** Ready for Development
**Priority:** Critical
**Estimated Duration:** 16 hours
**Team:** Frontend Lead + 1-2 Frontend Developers
**Depends On:** Epic 2 (Auth), Epic 6 (API endpoints complete)

---

## Epic Goal

**Implement React single-page application with 8 core screens (Auth, Home, Recommendations, Forecasts, CashFlow, Products, Customers, Transactions) that are mobile-first, responsive, accessible (WCAG AA), Bangla/English bilingual, and connect seamlessly to Django backend API.**

This epic delivers a production-ready frontend that SME owners can use on their smartphones to access business intelligence and execute recommendations.

---

## Existing System Context

**Tech Stack (from Epic 1):**
- React 18 + TypeScript
- Vite (build tool)
- React Router DOM (navigation)
- Tailwind CSS 3.3 (styling)
- Axios (API client)
- react-i18next (Bangla/English)
- Recharts (charting library)

**Pre-Existing Backend (Epics 2-6):**
- All API endpoints implemented (/auth/*, /data/*, /transactions, /products, /customers, /forecasts, /cashflow, /recommendations)
- JWT token management
- Data ready to display

**Design Principles:**
- Card-based UI (recommendation feed paradigm)
- Traffic light status (🟢 safe, 🟡 warning, 🔴 critical)
- Mobile-first responsive (95% of users on smartphones)
- Bangla-first (low-literacy SME owners)
- Minimal cognitive load (one decision per screen)

---

## Enhancement Details

### What's Being Built

**8 Core Screens:**

1. **Authentication Screen** (Signup / Login)
   - Email, password, name, business details
   - Language toggle
   - Password validation feedback

2. **Home / Dashboard Screen**
   - Welcome greeting
   - 3 stat cards (Revenue, Customers, Stock)
   - Top 2-3 recommendations preview
   - Last updated timestamp
   - Floating "Upload Data" button

3. **Recommendations Feed Screen**
   - Prioritized recommendation cards
   - Filter: Type, Urgency, Status
   - Status tabs: Pending, Completed
   - Floating "Execute" button per card
   - Color-coded priority

4. **Forecasts Screen**
   - Horizon selector (7/14/30 days)
   - Filter: All, Low Stock, High Risk
   - Simple line charts per product
   - Stockout status indicator
   - Regenerate button

5. **Cash Flow Screen**
   - Current balance + projection
   - Area chart with danger zone
   - Risk assessment + critical date
   - Suggested actions

6. **Products (Inventory) Screen**
   - Product list with stock bars
   - Sales trend arrows
   - Forecast indicators
   - Filter + sort

7. **Customers Screen**
   - Customer list with RFM segments
   - Churn risk colors
   - Segment filters
   - Sort options

8. **Transactions List Screen**
   - Compact transaction table
   - Filters: Date, Product, Payment method
   - Pagination
   - Summary stats

**Supporting Components:**
- Navigation (Top nav + Bottom tabs)
- Token storage & refresh logic
- Error boundaries
- Loading skeletons
- Modals for actions
- Toast notifications

### How It Integrates

```
Frontend (Vercel)
    ↓
React App (Vite dev server locally)
    ├→ 8 screens (routed via React Router)
    ├→ API client (Axios with JWT)
    ├→ State management (local + React Context)
    ├→ Internationalization (react-i18next: Bangla/English)
    └→ UI Components (Tailwind + custom)
    ↓
Django Backend (Railway)
    ├→ /auth/* endpoints
    ├→ /data/* endpoints
    ├→ /transactions, /products, /customers
    ├→ /forecasts, /cashflow, /recommendations
    └→ /admin/* endpoints (health, demo seed)
    ↓
User: Login → Explore data → Execute recommendations
```

### Success Criteria

- ✅ All 8 screens functional and responsive
- ✅ Mobile responsive: 320px-1920px (no horizontal scroll)
- ✅ <3 seconds page load on 3G (50 Mbps)
- ✅ Bangla + English language toggle works
- ✅ Accessibility: WCAG AA compliant (color contrast, touch targets)
- ✅ All API endpoints connected and working
- ✅ Token refresh automatic (no user re-login on expiry)
- ✅ Charts render correctly (Recharts)

---

## Stories

### Story 7.1: Project Setup & Component Library (3 hours)

**Objective:** Initialize React project, Tailwind CSS, routing, and build reusable components.

**Acceptance Criteria:**

- [ ] React project structure
  - [ ] Vite project initialized with React 18 + TypeScript template
  - [ ] Folder structure: src/components, src/pages, src/services, src/types, src/utils, src/hooks
  - [ ] ESLint + Prettier configured

- [ ] Tailwind CSS
  - [ ] Installed and configured
  - [ ] Color palette: Green (#10B981), Yellow (#F59E0B), Red (#EF4444), Blue (#3B82F6), Gray (#6B7280)
  - [ ] Custom config for Bangla font (Noto Sans Bengali)
  - [ ] 8px spacing grid

- [ ] React Router
  - [ ] BrowserRouter wrapping app
  - [ ] Public routes: /login, /signup
  - [ ] Protected routes: /dashboard, /recommendations, /forecasts, /cashflow, /products, /customers, /transactions
  - [ ] Redirect /login if not authenticated
  - [ ] <Routes> structure clear

- [ ] Reusable components created
  - [ ] `Button` (primary, secondary, ghost)
  - [ ] `Card` (title, content, footer)
  - [ ] `Input` (text, email, password)
  - [ ] `Select` (dropdown)
  - [ ] `Filter` (filter bar with multiple options)
  - [ ] `Table` (columns, rows, pagination)
  - [ ] `Modal` (title, body, actions)
  - [ ] `Alert` (success, error, warning, info)
  - [ ] `Skeleton` (loading placeholder)
  - [ ] `Badge` (status: pending, executed, etc.)
  - [ ] `Navbar` (top navigation)
  - [ ] `BottomNav` (mobile sticky tabs)
  - [ ] `FloatingActionButton` (primary action, sticky)

- [ ] Storybook / component showcase (optional)
  - [ ] Storybook setup for developing components
  - [ ] Document all components with examples

- [ ] TypeScript types
  - [ ] Define types for all API responses
  - [ ] User, Business, Transaction, Product, Customer, Forecast, Recommendation, CashFlow types
  - [ ] Stored in src/types/index.ts

- [ ] Tests
  - [ ] Component renders without error
  - [ ] Tailwind classes apply
  - [ ] Button clicks work
  - [ ] Input fields accept text

**Effort:** 3 hours
**Dependencies:** Epic 1 (Vercel setup complete)
**Risk:** Low

---

### Story 7.2: Authentication Screens (2.5 hours)

**Objective:** Implement signup and login screens with validation and token management.

**Acceptance Criteria:**

- [ ] Login screen
  - [ ] Email + password fields
  - [ ] Submit button
  - [ ] Error message display (invalid credentials)
  - [ ] Loading state during request
  - [ ] Success: Redirect to /dashboard
  - [ ] Token storage: localStorage (access_token, refresh_token)
  - [ ] "Don't have an account? Sign up" link

- [ ] Signup screen
  - [ ] Fields: Email, Password, Confirm Password, First Name, Business Name, Business Type, Language
  - [ ] Validation: Email format, password strength (8+ chars, not common)
  - [ ] Error messages: Per-field validation feedback
  - [ ] Success: Auto-login, redirect to /dashboard
  - [ ] "Already have an account? Login" link

- [ ] Language toggle
  - [ ] Bangla / English toggle in signup
  - [ ] Sets user's language preference
  - [ ] Affects UI language throughout app

- [ ] Token management
  - [ ] Store access_token + refresh_token in localStorage
  - [ ] Attach access_token to all API requests (Authorization header)
  - [ ] If 401: Auto-refresh token via /auth/token/refresh
  - [ ] If refresh fails: Redirect to login

- [ ] Error handling
  - [ ] Duplicate email: "Email already registered"
  - [ ] Weak password: "Password must be 8+ characters"
  - [ ] Network error: "Connection error. Try again."
  - [ ] Display in error Alert component

- [ ] Tests
  - [ ] Test signup form validation
  - [ ] Test login with valid credentials
  - [ ] Test token storage
  - [ ] Test redirect to dashboard on success

**Effort:** 2.5 hours
**Dependencies:** Story 7.1 complete
**Risk:** Low

---

### Story 7.3: Home / Dashboard Screen (2 hours)

**Objective:** Implement dashboard overview with stat cards and recommendation preview.

**Acceptance Criteria:**

- [ ] Dashboard layout
  - [ ] Welcome greeting: "Welcome, {first_name}!"
  - [ ] Last updated: "Last updated 2 min ago" (auto-refresh every 30 sec)
  - [ ] 3 stat cards: Revenue, Customers, Stock Status
  - [ ] Recommendation preview: Top 2-3 high-priority recommendations
  - [ ] Bottom navigation: 5 sticky tabs (Home, Recommendations, Forecasts, CashFlow, Menu)
  - [ ] Floating button: "+ Upload Data"

- [ ] Stat cards
  - [ ] Card 1: Total Revenue (from GET /business/profile)
    - [ ] Display: "৳{total_revenue}" in large text
    - [ ] Subtext: "Total revenue" in gray
  - [ ] Card 2: Total Customers
  - [ ] Card 3: Stock Status (🟢 Safe / 🟡 Low / 🔴 Critical)

- [ ] Recommendation preview
  - [ ] Load: GET /recommendations?limit=3 (top 3 by priority)
  - [ ] Display: Compact card format (title, urgency color, "View" link)
  - [ ] "See all {count} recommendations" link below
  - [ ] Color coding: Red for high, yellow for medium, green for low

- [ ] Auto-refresh
  - [ ] Refresh data every 30 seconds
  - [ ] Show loading state (skeleton) while fetching
  - [ ] Update "Last updated" timestamp
  - [ ] Don't refresh if user typing/scrolling

- [ ] Navigation
  - [ ] Top: Logo, breadcrumbs, profile menu (logout)
  - [ ] Bottom: 5 tabs (Home, Recommendations, Forecasts, CashFlow, Menu ☰)
  - [ ] Mobile: Sticky bottom nav (always visible)
  - [ ] Desktop: Top navbar + left sidebar (optional)

- [ ] Tests
  - [ ] Dashboard loads data on mount
  - [ ] Stat cards display correct values
  - [ ] Recommendation preview shows top 3
  - [ ] Navigation tabs clickable
  - [ ] Auto-refresh updates data

**Effort:** 2 hours
**Dependencies:** Story 7.2 complete
**Risk:** Low

---

### Story 7.4: Recommendations Feed Screen (3 hours)

**Objective:** Implement prioritized recommendation feed with filters and actions.

**Acceptance Criteria:**

- [ ] Recommendation feed layout
  - [ ] Filter bar: Type, Urgency, Status
  - [ ] Status tabs: Pending | Completed
  - [ ] Recommendation cards (one per row): Title, description, urgency color, buttons
  - [ ] Pagination: "Load more" button
  - [ ] Summary: "3 pending, 1 high urgency"

- [ ] Recommendation card design
  - [ ] Background: White card with border + shadow
  - [ ] Left border: Color-coded (🔴 high, 🟡 medium, 🟢 low)
  - [ ] Title: Bold, large text
  - [ ] Description: Wrap text, gray
  - [ ] Buttons: [View Details ▶] [Execute ✓]
  - [ ] Metadata: Created 2 hours ago, not yet executed

- [ ] Filtering
  - [ ] Type filter: All | Reorder | Cash Warning | Retention
  - [ ] Urgency filter: All | High | Medium | Low
  - [ ] Status tabs: Pending (not executed), Completed (executed)
  - [ ] Apply: Query string params (so bookmarkable)

- [ ] Actions
  - [ ] Mark viewed: POST /recommendations/{id}/view (on click)
  - [ ] Execute: POST /recommendations/{id}/execute
  - [ ] Execute flow: Modal confirmation → "Confirm action?" → Success toast

- [ ] Sorting
  - [ ] Default: By priority_score descending (highest first)
  - [ ] Alternative: By created_at (newest first)

- [ ] Tests
  - [ ] Feed loads recommendations (GET /recommendations)
  - [ ] Filtering works (type, urgency, status)
  - [ ] Buttons clickable (view, execute)
  - [ ] Pagination loads more

**Effort:** 3 hours
**Dependencies:** Story 7.3 complete
**Risk:** Low

---

### Story 7.5: Forecasts & Charts (3 hours)

**Objective:** Implement forecasts screen with chart visualization and regenerate option.

**Acceptance Criteria:**

- [ ] Forecast list layout
  - [ ] Horizon selector: [7 days] [14 days] [30 days]
  - [ ] Filter: All | Low Stock | High Risk
  - [ ] Regenerate Forecast button (floating or top)
  - [ ] Forecast cards: One per product
  - [ ] Pagination

- [ ] Forecast card design
  - [ ] Product name + SKU
  - [ ] Current stock (large number)
  - [ ] Simple line chart: Demand over forecast period (Recharts)
  - [ ] Status indicator: 🟢 Safe | 🟡 Warning | 🔴 Stockout risk
  - [ ] Metrics: Avg daily demand, accuracy (MAPE %)
  - [ ] Days until stockout (if applicable)

- [ ] Charts
  - [ ] Library: Recharts
  - [ ] Type: LineChart with area under curve
  - [ ] X-axis: Date
  - [ ] Y-axis: Predicted quantity
  - [ ] Confidence band: Light green shading (yhat_upper - yhat_lower)
  - [ ] Responsive: Chart fills card width

- [ ] Regenerate button
  - [ ] Click: POST /forecasts/request { product_ids: [], forecast_days: 7|14|30 }
  - [ ] Response: 202 ACCEPTED (async)
  - [ ] Loading state: "Generating forecasts..." spinner
  - [ ] Poll: GET /forecasts every 5 seconds until complete
  - [ ] Success: Toast "Forecasts generated"

- [ ] Data isolation
  - [ ] Only user's business forecasts shown
  - [ ] Filter: Handled by backend

- [ ] Tests
  - [ ] Forecast list loads
  - [ ] Charts render (no errors)
  - [ ] Regenerate button works
  - [ ] Horizon selector changes results

**Effort:** 3 hours
**Dependencies:** Story 7.3 complete, Recharts installed
**Risk:** Medium (charting can be fiddly; test on mobile)

---

### Story 7.6: Cash Flow & Inventory Screens (2.5 hours)

**Objective:** Implement cash flow projections and inventory (products) screens.

**Acceptance Criteria:**

- [ ] Cash Flow screen
  - [ ] Current balance: Large display "৳{balance}"
  - [ ] Risk level: 🔴 HIGH | 🟡 MEDIUM | 🟢 LOW
  - [ ] Area chart: Balance trajectory over 30 days
  - [ ] Danger zone: Red shading below critical threshold
  - [ ] Critical date: "Balance drops below ৳{threshold} on {date}"
  - [ ] Recommendations: Bulleted list of actions
  - [ ] Details button: Show assumptions (payment probability, outflow avg)

- [ ] Products (Inventory) screen
  - [ ] Filter: All | Low Stock | High Sales
  - [ ] Sort: Name | Stock | Sales 7-day
  - [ ] Product cards:
    - [ ] Name + SKU
    - [ ] Stock bar: Visual progress bar (0 to reorder_point)
    - [ ] Sales trend: Arrow (↑ increasing, → flat, ↓ decreasing)
    - [ ] Forecast indicator: "Stockout in 3 days" (if applicable)
    - [ ] Status color: 🟢 Safe | 🟡 Warning | 🔴 Critical

- [ ] Charts (Cash Flow)
  - [ ] AreaChart: Recharts
  - [ ] Red danger zone: yAxis from 0 to critical_threshold, fill red
  - [ ] Line for balance, area under curve green (above threshold)
  - [ ] Responsive, mobile-friendly

- [ ] Tests
  - [ ] Cash flow screen loads
  - [ ] Risk level displayed correctly
  - [ ] Chart renders
  - [ ] Products load with stock status
  - [ ] Filters work

**Effort:** 2.5 hours
**Dependencies:** Stories 7.3-7.5 complete
**Risk:** Low-Medium

---

### Story 7.7: Customers & Transactions Screens (2 hours)

**Objective:** Implement customer list with RFM segments and transaction history.

**Acceptance Criteria:**

- [ ] Customers screen
  - [ ] Filter: All | Champions | Loyal | At-Risk | Dormant | New
  - [ ] Sort: Name | Total Spent | Days Since Purchase | Churn Score
  - [ ] Summary stats: "8 Champions, 5 At-Risk, 3 Dormant"
  - [ ] Customer cards (or list rows):
    - [ ] Name, total spent, last purchase date
    - [ ] RFM segment badge (color-coded)
    - [ ] Churn risk: 🟢 Low | 🟡 Medium | 🔴 High
    - [ ] Risk reason: Text explanation

- [ ] Transactions screen
  - [ ] Compact table: Date | Product | Amount
  - [ ] Filters: Date range picker, Product dropdown, Payment method
  - [ ] Summary: Total revenue, average transaction, count
  - [ ] Pagination: "1-50 of 156 | Load more"
  - [ ] Clean design: Readable even on small screens

- [ ] Status colors
  - [ ] Champions: 🟢 (green)
  - [ ] At-Risk: 🔴 (red)
  - [ ] Dormant: 🟡 (yellow)

- [ ] Tests
  - [ ] Customers load
  - [ ] Filters work
  - [ ] Segment badges display
  - [ ] Transactions load
  - [ ] Date filter works
  - [ ] Pagination loads more

**Effort:** 2 hours
**Dependencies:** Stories 7.3-7.6 complete
**Risk:** Low

---

### Story 7.8: Data Upload & Navigation (2 hours)

**Objective:** Implement CSV/receipt upload flow and app-wide navigation.

**Acceptance Criteria:**

- [ ] Data upload screen
  - [ ] Tab 1: CSV Upload
    - [ ] File picker: Drag-drop or click to browse
    - [ ] File preview: Show filename, size, row count (if possible)
    - [ ] Upload button: Send to POST /data/upload-csv
    - [ ] Processing state: Show spinner "Processing..." with progress
    - [ ] Success: Toast "CSV uploaded successfully. Processing transactions..."
    - [ ] Error: Display error message + suggestions

  - [ ] Tab 2: Receipt Upload
    - [ ] Image picker: Drag-drop or click to browse
    - [ ] Image preview: Show thumbnail
    - [ ] Upload button: Send to POST /data/upload-receipt
    - [ ] Processing state: Similar to CSV

- [ ] Top navigation
  - [ ] Logo + app name "SmartMarket"
  - [ ] Breadcrumbs: Home > Forecasts (show current page)
  - [ ] Profile menu: Language toggle, Logout button
  - [ ] Sticky (stays at top on scroll)

- [ ] Bottom navigation (mobile only, <768px)
  - [ ] 5 sticky tabs:
    - [ ] 🏠 Home
    - [ ] 💡 Recommendations
    - [ ] 📈 Forecasts
    - [ ] 💰 Cash Flow
    - [ ] ☰ Menu (Products, Customers, Transactions, Settings)
  - [ ] Active tab highlighted
  - [ ] Tap to navigate (React Router)

- [ ] Menu (burger) screen
  - [ ] Products, Customers, Transactions
  - [ ] Settings (language, logout)
  - [ ] Back arrow to dismiss

- [ ] Language toggle
  - [ ] Dropdown: Bangla | English
  - [ ] Changes app language immediately (react-i18next)
  - [ ] Saves to localStorage (persist)

- [ ] Tests
  - [ ] Upload CSV (202 response)
  - [ ] Upload receipt (202 response)
  - [ ] Navigation tabs work
  - [ ] Language toggle works

**Effort:** 2 hours
**Dependencies:** Stories 7.1-7.7 complete
**Risk:** Low

---

### Story 7.9: Responsive Design & Mobile Optimization (2 hours)

**Objective:** Ensure all screens responsive and optimized for mobile (320px-1920px).

**Acceptance Criteria:**

- [ ] Responsive breakpoints
  - [ ] Mobile (<600px): Single column, full-width cards, bottom nav
  - [ ] Tablet (600-768px): Transitional layout
  - [ ] Desktop (≥768px): Two-column layout, top nav, max-width 1200px

- [ ] Mobile-specific adjustments
  - [ ] Touch targets: Minimum 48x48px (larger for buttons)
  - [ ] Font sizes: 16px body (readable without zoom)
  - [ ] Spacing: 16px padding/margins (comfortable touch)
  - [ ] Charts: Scroll horizontally if needed (don't squish)
  - [ ] Modals: Full screen on mobile (<600px), centered on desktop

- [ ] Performance optimization
  - [ ] Page load: <3 seconds on 3G (50 Mbps)
  - [ ] Bundle size: <500KB (gzipped)
  - [ ] Images: Lazy loading
  - [ ] Code splitting: Separate bundles for each route
  - [ ] Lighthouse score: >80

- [ ] Device testing
  - [ ] Test on: iPhone SE, Samsung A10-A50, iPad (portrait + landscape)
  - [ ] Browsers: Chrome Mobile, Safari Mobile
  - [ ] Orientations: Portrait + landscape
  - [ ] Network: Simulate 3G (DevTools throttling)

- [ ] Tests
  - [ ] Layout responsive on 320px, 600px, 1024px
  - [ ] Touch targets at least 48x48px
  - [ ] No horizontal scrolling on mobile
  - [ ] Lighthouse score checked

**Effort:** 2 hours
**Dependencies:** All screens complete (Stories 7.1-7.8)
**Risk:** Medium (mobile testing can reveal surprises)

---

## Compatibility Requirements

**N/A (Greenfield)** — No prior frontend to maintain.

---

## Risk Mitigation

| Risk | Impact | Mitigation | Contingency |
|------|--------|-----------|-------------|
| **Charts don't render on mobile** | Medium | Test Recharts on small screens; use responsive containers | Fallback to text-based data display (table) |
| **Token refresh logic flaky** | High | Test with multiple stale tokens; mock API delays | Manual re-login if refresh fails (acceptable for MVP) |
| **Bangla font not rendering** | Medium | Use Noto Sans Bengali; test on multiple devices | Fallback to English or system fonts |
| **API latency (slow forecasts)** | Medium | Show "Processing..." loader; allow cancellation | Increase timeout; show cached data |
| **Large screens (1920px) look bad** | Low | Max-width 1200px container; test on desktop | Phone screen zoom acceptable for MVP |

---

## Definition of Done

### Code Quality
- [ ] TypeScript strict mode enabled
- [ ] All components typed
- [ ] No console errors/warnings
- [ ] ESLint passing
- [ ] Prettier formatting applied

### Testing
- [ ] All screens have component tests
- [ ] Navigation routes tested
- [ ] API integration tested
- [ ] Token refresh tested
- [ ] Mobile responsive tested

### Documentation
- [ ] README: Setup instructions, running dev server
- [ ] Component documentation (Storybook optional)
- [ ] API integration documented
- [ ] Design system documented (colors, spacing, components)

### Deployment
- [ ] Works locally (`npm run dev`)
- [ ] Builds without errors (`npm run build`)
- [ ] Deploys to Vercel without issues
- [ ] API calls reach backend
- [ ] CORS configured

### Sign-Off
- [ ] Frontend Lead: "UI complete, ready for Epic 8"
- [ ] QA: "Can test all screens"

---

## Success Criteria

**Technical Success:**
- ✅ All 8 screens implemented and functional
- ✅ Responsive: 320px-1920px (no horizontal scroll)
- ✅ Mobile-first: <3 sec load on 3G
- ✅ Bangla + English language support
- ✅ All API endpoints connected
- ✅ Token refresh automatic
- ✅ Charts render correctly (Recharts)
- ✅ Accessibility: WCAG AA colors, 48px touch targets

**Team Success:**
- ✅ Frontend developers productive
- ✅ QA can test all features
- ✅ Ready for E2E testing (Epic 8)

**User Success:**
- ✅ SME owners can access data on smartphones
- ✅ Easy to navigate and understand
- ✅ Can execute recommendations

---

## Handoff to Development

### Pre-Story Checklist
- [ ] Node.js 16+ installed
- [ ] Vite + dependencies installed
- [ ] Tailwind CSS configured
- [ ] react-i18next setup for Bangla/English
- [ ] Recharts library installed

### Story Ordering (Sequential)
1. **Story 7.1** (3 hrs) — Project setup + components
2. **Story 7.2** (2.5 hrs) — Auth screens
3. **Story 7.3** (2 hrs) — Dashboard screen
4. **Story 7.4** (3 hrs) — Recommendations feed
5. **Story 7.5** (3 hrs) — Forecasts + charts
6. **Story 7.6** (2.5 hrs) — Cash flow + inventory
7. **Story 7.7** (2 hrs) — Customers + transactions
8. **Story 7.8** (2 hrs) — Upload + navigation
9. **Story 7.9** (2 hrs) — Responsive + optimization

**Total:** 16 hours

**Parallelization:** Stories 7.5-7.7 can run in parallel with 7.4 (after 7.3 complete)

---

**Epic Owner:** Frontend Lead
**Created:** 2025-11-04
**Status:** ✅ Ready for Development
