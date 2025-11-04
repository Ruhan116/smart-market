# Epic 9: Demo Preparation & Polish - Brownfield Development

**Epic ID:** EPIC-9
**Status:** Ready for Development
**Priority:** Critical (Pre-Demo)
**Estimated Duration:** 6 hours
**Team:** Entire team
**Depends On:** Epics 1-8 (All features complete)

---

## Epic Goal

**Polish code and documentation, prepare demo environment with realistic data, create demo scenario script, record demo video, build pitch deck, practice presentation, and identify/fix known issues before hackathon judges see the product.**

This epic transforms a working system into a polished, demo-ready product.

---

## Existing System Context

**Complete Implementation (Epics 1-8):**
- ✅ Backend: All endpoints working
- ✅ Frontend: All 8 screens implemented
- ✅ Integration: E2E workflows passing
- ✅ Infrastructure: Deployed to Railway + Vercel
- ✅ Testing: Core functionality tested

**Pre-Demo Checklist:**
- All code works but may have console warnings, debug code, or rough edges
- Documentation is technical but not user-facing
- Demo data is minimal or synthetic
- Team hasn't practiced presentation

---

## Enhancement Details

### What's Being Built

1. **Code Cleanup**
   - Remove debug console.logs, commented code
   - Fix ESLint/TypeScript warnings
   - Ensure consistent code style (black, prettier)
   - Add docstrings to public functions

2. **Demo Data**
   - 6-month synthetic dataset (realistic Bangla names, BDT currency)
   - 50+ customers with varied patterns (champions, at-risk, dormant)
   - 10 products with seasonal demand
   - Stockouts, cash flow issues, churn customers (for demo impact)

3. **Documentation**
   - README: Clear setup and running instructions
   - Architecture diagram (ASCII or Figma)
   - Feature walkthrough (feature-by-feature description)
   - Technical decisions doc (why these choices?)
   - Known issues + workarounds

4. **Demo Scenario Script**
   - Step-by-step script (what to click, what to expect)
   - 5-minute walkthrough (fits hackathon time limits)
   - Contingencies (if network fails, if demo gets stuck)
   - Estimated time per step

5. **Demo Video**
   - 3-5 minute walkthrough (alternative if live demo fails)
   - Voiceover explaining each feature
   - Production quality (clear audio, good lighting)
   - Subtitles in English

6. **Pitch Deck**
   - 10-12 slides (1 min/slide = 12 min presentation)
   - Problem, Solution, Differentiators, Demo, Technical, Market, Roadmap, Team, CTA
   - Design: Clean, readable, not cluttered
   - Speaker notes per slide

7. **Presentation Practice**
   - 3+ team rehearsals (full presentation)
   - Presentation skills coaching
   - Timing calibration (fit within limits)
   - Q&A preparation

### How It Integrates

```
Code Complete (Epics 1-8)
    ↓
Clean code + fix warnings
    ↓
Seed demo database
    ↓
Create demo scenario script
    ↓
Test scenario 5+ times
    ↓
Record demo video (backup plan)
    ↓
Build pitch deck
    ↓
Practice presentation
    ↓
Final QA (no crashes)
    ↓
Demo-ready for judges!
```

### Success Criteria

- ✅ Code passes linting (black, ESLint, mypy)
- ✅ Demo environment seeded with realistic data
- ✅ Demo scenario can be run in <5 minutes without crashes
- ✅ Demo video recorded (3-5 min, production quality)
- ✅ Pitch deck covers all key points
- ✅ Team practiced presentation (>3 rehearsals)
- ✅ Known issues documented with workarounds
- ✅ Zero console errors during demo

---

## Stories

### Story 9.1: Code Cleanup & Documentation (1.5 hours)

**Objective:** Remove debug code, fix linting issues, and add docstrings.

**Acceptance Criteria:**

- [ ] Backend cleanup
  - [ ] Remove: All console.logs, debug prints, commented code
  - [ ] Fix: All black formatting issues (`black .` passes)
  - [ ] Fix: All ESLint issues (`flake8 .` passes)
  - [ ] Fix: All type issues (optional mypy, but helpful)
  - [ ] Docstrings: Add docstrings to all public functions/methods
  - [ ] Remove: Test data fixtures (except seed command)

- [ ] Frontend cleanup
  - [ ] Remove: console.logs, commented code, dead imports
  - [ ] Fix: ESLint warnings (`npm run lint` passes)
  - [ ] Fix: TypeScript strict mode issues
  - [ ] Format: Prettier formatting applied (`prettier --write .`)
  - [ ] Comments: Add JSDoc comments to complex components

- [ ] Configuration cleanup
  - [ ] .env.example: All required variables documented
  - [ ] No secrets in .env or .git history
  - [ ] .gitignore: Excludes node_modules, .env, dist, etc.

- [ ] Documentation files
  - [ ] **README.md:** Clear setup instructions
    - [ ] Prerequisites (Docker, Python, Node.js versions)
    - [ ] "Getting Started" (clone repo, docker-compose up, npm run dev)
    - [ ] How to access: API (localhost:8000), docs (localhost:8000/api/docs), frontend (localhost:5173)
    - [ ] How to run tests (pytest, npm test)
    - [ ] Troubleshooting section

  - [ ] **CONTRIBUTING.md:** Development guidelines
    - [ ] Git workflow (feature branches, PR reviews)
    - [ ] Code style (black, ESLint, Prettier)
    - [ ] Testing requirements (70%+ coverage)
    - [ ] Commit message format

  - [ ] **ARCHITECTURE.md:** System design overview
    - [ ] Diagram: Frontend → API → Backend → Database
    - [ ] Tech stack table
    - [ ] Key design decisions + rationale
    - [ ] Data flow for core workflows

  - [ ] **API.md or use Swagger:** Endpoint documentation
    - [ ] Base URL, authentication, response format
    - [ ] All endpoints listed with examples
    - [ ] Error codes documented

- [ ] Tests
  - [ ] All tests pass locally (`pytest`, `npm test`)
  - [ ] Coverage report generated (target 70%+)
  - [ ] No failing tests on CI/CD

**Effort:** 1.5 hours
**Dependencies:** Epics 1-8 complete (all code exists)
**Risk:** Low

---

### Story 9.2: Demo Database & Data Seeding (1.5 hours)

**Objective:** Create realistic 6-month demo dataset for impressive demo.

**Acceptance Criteria:**

- [ ] Demo dataset
  - [ ] Demo business: "Roza's Tea Shop" (Dhaka, restaurant type)
  - [ ] Owner: "Roza Ahmed" (Email: demo@smartmarket.bd, Password: Demo123!)
  - [ ] Historical data: 6 months (May - October 2025)
  - [ ] Realistic patterns: Weekend spikes, seasonal variations, stockouts

- [ ] Products (10 items)
  - [ ] 1. Basmati Rice (critical stock soon, high demand)
  - [ ] 2. Lentils (low stock, at-risk for stockout)
  - [ ] 3. Tea (steady demand, safe stock)
  - [ ] 4. Sugar (declining sales)
  - [ ] 5-10. Other common restaurant items
  - [ ] Use realistic Bangla names + BDT prices

- [ ] Customers (50+ customers)
  - [ ] Champions (8): Recent, frequent, high spend
  - [ ] Loyal (15): Good engagement, consistent
  - [ ] Potential (20): Some activity, room to grow
  - [ ] At-Risk (5): Haven't bought in 45+ days, declining frequency
  - [ ] Dormant (3): No purchases in 90+ days
  - [ ] Use Bangla names (Fatema, Ali, Nasrin, etc.)

- [ ] Transactions (300+ transactions)
  - [ ] Distributed across 6 months (50/month average)
  - [ ] Realistic amounts (100-5000 TK per transaction)
  - [ ] Mix of payment methods (Cash, bKash, Nagad, Card)
  - [ ] Include stockouts (days with 0 sales)
  - [ ] Include seasonal spike (Eid, holidays)

- [ ] Demo scenario impact
  - [ ] At least 1 product with "Stockout in 2 days" warning
  - [ ] Cash flow warning: "Balance drops to ৳8K on Nov 18"
  - [ ] 3+ at-risk customers for retention campaign
  - [ ] Mix of successful + failing recommendations

- [ ] Data seeding command
  - [ ] `python manage.py seed_demo --users=1 --months=6`
  - [ ] Creates: 1 demo business, 50 customers, 300 transactions
  - [ ] Idempotent: Can run multiple times safely
  - [ ] Reset command: `python manage.py reset_demo` clears demo data

- [ ] Tests
  - [ ] Seed command runs without errors
  - [ ] Data created as expected (counts match)
  - [ ] Forecasts generated (need 30+ days data)
  - [ ] RFM scores calculated
  - [ ] Recommendations generated
  - [ ] Demo is reproducible (same data every seed)

**Effort:** 1.5 hours
**Dependencies:** Epic 3 (seed command created in Story 1.3)
**Risk:** Low

---

### Story 9.3: Demo Scenario Script & Testing (1.5 hours)

**Objective:** Create step-by-step demo script and test it 5+ times for reliability.

**Acceptance Criteria:**

- [ ] Demo scenario (5-minute walkthrough)
  - [ ] **Intro (30 sec):** "We built SmartMarket, an AI-powered BI platform for Bangladesh SMEs"
  - [ ] **Problem (60 sec):** Show problem (paper ledgers, guesswork, stockouts, cash crises)
  - [ ] **Solution walkthrough (180 sec):**
    - [ ] Step 1 (30 sec): Login as Roza Ahmed
    - [ ] Step 2 (30 sec): Show dashboard (stats, top recommendations)
    - [ ] Step 3 (30 sec): View recommendations (reorder, cash warning, retention)
    - [ ] Step 4 (30 sec): Show forecast (stockout prediction, chart)
    - [ ] Step 5 (30 sec): Show cash flow (risk analysis)
    - [ ] Step 6 (30 sec): Show customers at-risk (RFM segment, churn reason)
  - [ ] **Impact (30 sec):** "With SmartMarket, Roza can prevent stockouts, manage cash, and retain customers"
  - [ ] **Closing (30 sec):** CTA ("We're piloting with 10 SMEs this month")

- [ ] Demo script details
  - [ ] Exact clicks/actions listed (no improvisation)
  - [ ] Expected outcomes (what should appear on screen)
  - [ ] Estimated time per step
  - [ ] Contingencies ("If forecast not done in 5s, click refresh...")
  - [ ] Known issues (if button sometimes not clickable, try refresh)

- [ ] Testing & refinement
  - [ ] Run scenario 5+ times locally
  - [ ] Run on Vercel/Railway (production environment)
  - [ ] Time it (ensure <5 minutes)
  - [ ] Identify any crashes or slow sections
  - [ ] Fix issues or add workarounds

- [ ] Backup plans
  - [ ] Network fails: Have pre-recorded demo video ready
  - [ ] Demo app crashes: Show demo video + talk through architecture
  - [ ] Specific feature fails: Skip it, focus on working features
  - [ ] Running slow: Pre-load data (cache pages) before demo

- [ ] Demo environment setup
  - [ ] Backend: All services running (Django, Celery, PostgreSQL)
  - [ ] Frontend: Vercel or localhost running
  - [ ] Database: Demo data seeded
  - [ ] Network: Test internet connection before demo
  - [ ] Browser: Clear cache, no console errors

- [ ] Tests
  - [ ] Scenario runs without crashes
  - [ ] Timing <5 minutes
  - [ ] All features shown working
  - [ ] Data displays correctly
  - [ ] No stale or outdated data

**Effort:** 1.5 hours
**Dependencies:** Story 9.2 complete (demo data ready)
**Risk:** Medium (timing, reliability)

---

### Story 9.4: Demo Video Recording (1 hour)

**Objective:** Record backup 3-5 minute demo video (fallback if live demo fails).

**Acceptance Criteria:**

- [ ] Video setup
  - [ ] Screen recording tool: OBS or ScreenFlow (Mac)
  - [ ] Voiceover: Clear microphone, good audio quality
  - [ ] Resolution: 1080p (HD quality)
  - [ ] Bitrate: 5-10 Mbps (good quality)

- [ ] Video content
  - [ ] Walkthrough: Follow demo scenario script
  - [ ] Voiceover: Explain each feature as you go
  - [ ] Pacing: Not too fast (time for judges to read text)
  - [ ] Duration: 3-5 minutes (fits hackathon time)
  - [ ] Quality: No glitches, smooth transitions

- [ ] Video production
  - [ ] Intro slide: "SmartMarket: AI-Powered BI for Bangladesh SMEs"
  - [ ] Problem statement slide
  - [ ] Solution features (screenshots or live walkthrough)
  - [ ] Impact/results slide
  - [ ] CTA/Team info slide
  - [ ] Subtitles: English subtitles for accessibility

- [ ] Audio quality
  - [ ] Voiceover: Clear, professional tone
  - [ ] Loudness: Normalized to -3dB LUFS (YouTube standard)
  - [ ] No background noise
  - [ ] Pauses: Allow time for reading on-screen text

- [ ] Editing
  - [ ] Transitions: Smooth, professional (no distracting effects)
  - [ ] Color correction: Consistent lighting, white balance
  - [ ] Music: Optional (background music, royalty-free)
  - [ ] Exports: MP4 format, <100MB file size

- [ ] Delivery
  - [ ] File: demo-video.mp4 in project root or cloud link
  - [ ] Backup: Multiple copies (local + cloud)
  - [ ] Playback: Test on different devices/browsers

- [ ] Tests
  - [ ] Video plays without errors
  - [ ] Audio clear and synchronized
  - [ ] Video duration 3-5 minutes
  - [ ] File size <100MB
  - [ ] Subtitles display correctly

**Effort:** 1 hour
**Dependencies:** Story 9.3 complete (demo script finalized)
**Risk:** Low-Medium (video production can take time)

---

### Story 9.5: Pitch Deck & Presentation Materials (1 hour)

**Objective:** Create pitch deck and presentation notes.

**Acceptance Criteria:**

- [ ] Pitch deck (10-12 slides, 1 min/slide = 12 minutes)
  1. **Title slide** (30 sec): SmartMarket | AI-Powered BI for Bangladesh SMEs | Team names
  2. **Problem** (1 min): 7.8M SMEs, stockouts, cash crises, no affordable BI tools
  3. **Solution** (1 min): SmartMarket's unique approach (passive capture, predict-to-action)
  4. **Market opportunity** (1 min): Target TAM/SAM, growth potential
  5. **Business model** (1 min): $2-5/month subscriptions + marketplace commissions
  6. **Demo** (2 min): Live or video walkthrough
  7. **Technical** (1 min): Django, React, Prophet, PostgreSQL (fast, free-tier)
  8. **Traction** (1 min): 10 SMEs signed up for pilot (if applicable)
  9. **Roadmap** (1 min): Phase 2 (WhatsApp, marketplace, advanced ML)
  10. **Team** (1 min): Roles, backgrounds, why you're qualified
  11. **Closing / CTA** (30 sec): "We're building the future of SME BI in Bangladesh"
  12. **Q&A** (30 sec): Open to questions

- [ ] Slide design
  - [ ] Color scheme: Green (#10B981), white background, gray text
  - [ ] Fonts: Clear sans-serif (Arial, Helvetica), readable at 10ft
  - [ ] Images: High-quality screenshots, product photos, no placeholder art
  - [ ] Layout: Single image + title + key bullet points per slide (not text-heavy)
  - [ ] Consistency: Same design language across all slides

- [ ] Speaker notes
  - [ ] Per-slide notes with talking points
  - [ ] Key statistics and examples to mention
  - [ ] Transitions between slides
  - [ ] Estimated time per slide

- [ ] Additional materials
  - [ ] Business canvas (1-page startup overview)
  - [ ] Competitive analysis (vs. Khatabook, Dukaan, Zoho)
  - [ ] Financial projections (3-year revenue estimate)
  - [ ] Customer testimonials (from pilot users, if available)

- [ ] Formats
  - [ ] PowerPoint / Google Slides (primary)
  - [ ] PDF export (backup)
  - [ ] Keynote (if presenting on Mac)

- [ ] Tests
  - [ ] Slides readable on projector (big screen)
  - [ ] Fonts ≥24pt
  - [ ] Images clear and appropriate
  - [ ] Speaking time <12 minutes (with 3-4 min for Q&A)

**Effort:** 1 hour
**Dependencies:** All epics complete (ready to present)
**Risk:** Low

---

### Story 9.6: Team Practice & Polish (1 hour)

**Objective:** Practice presentation 3+ times and fix any remaining issues.

**Acceptance Criteria:**

- [ ] Presentation practice
  - [ ] **Rehearsal 1 (dry run):** Full team, internal feedback
    - [ ] Timing: Identify sections that are slow or rushed
    - [ ] Clarity: Are explanations understandable?
    - [ ] Demo: Does demo work smoothly?
    - [ ] Q&A: Prepare answers to anticipated questions
  - [ ] **Rehearsal 2 (refinement):** Fix timing, improve pacing
  - [ ] **Rehearsal 3 (final):** Confidence run-through

- [ ] Presentation skills
  - [ ] Eye contact: Look at judges, not at laptop
  - [ ] Voice: Speak clearly, audible, not monotone
  - [ ] Pace: Not too fast (judges need time to absorb)
  - [ ] Enthusiasm: Show passion for the problem + solution
  - [ ] Posture: Stand confidently, don't pace/fidget

- [ ] Demo preparation
  - [ ] Pre-demo: Seed data, clear cache, open all tabs
  - [ ] Network: Test internet speed, have hotspot backup
  - [ ] Hardware: Laptop battery fully charged, HDMI cable tested
  - [ ] Audio: Microphone works, volume adequate
  - [ ] Designate: One person drives demo, others talk

- [ ] Q&A preparation
  - [ ] Anticipated questions:
    - [ ] "How will you acquire users?"
    - [ ] "What's your moat against Khatabook?"
    - [ ] "How much will development cost?"
    - [ ] "What's your timeline to profitability?"
  - [ ] Prepare answers (concise, confident, data-backed)
  - [ ] Practice: Team member asks questions, others answer

- [ ] Final checklist (before demo)
  - [ ] Code: No errors, warnings, or console logs
  - [ ] Demo data: Seeded and tested
  - [ ] Network: Connected, no VPN/proxy issues
  - [ ] Hardware: Plugged in, full battery
  - [ ] Presentation: Deck ready, speaker notes printed
  - [ ] Team: Assigned roles (talker, demo driver, questions)

- [ ] Known issues & workarounds
  - [ ] Slow forecast generation → Pre-generate beforehand or show cached results
  - [ ] CORS error → Check Railway secrets, CORS config
  - [ ] Missing recommendation → Reload page, reseed data
  - [ ] Typos in UI → Have screenshot alternative ready

- [ ] Tests
  - [ ] Full demo runs without crashes
  - [ ] Presentation delivered in <12 minutes
  - [ ] Team confident and synchronized
  - [ ] Answers Q&A questions smoothly

**Effort:** 1 hour
**Dependencies:** Stories 9.3-9.5 complete
**Risk:** Low

---

## Compatibility Requirements

**N/A (Greenfield)** — Prep work for demo, no integration concerns.

---

## Risk Mitigation

| Risk | Impact | Mitigation | Contingency |
|------|--------|-----------|-------------|
| **Live demo crashes** | Critical | Record backup video; practice 5+ times; pre-seed data | Show demo video instead; explain architecture |
| **Network fails during demo** | Critical | Have hotspot as backup; test internet before; pre-load pages | Use pre-recorded video; show screenshots |
| **Forecast takes >10 sec** | Medium | Pre-generate forecasts; cache results; show loading spinner | Skip forecast live demo; show screenshot |
| **Demo data unrealistic** | Medium | Use real SME patterns; test data accuracy | Adjust data; focus on explanation |
| **Team forgets talking points** | Medium | Print speaker notes; practice Q&A; designate talker | Have backup slides with key points |
| **Presentation overruns time** | Medium | Time rehearsals; cut non-essential slides | Prioritize problem + solution + demo |

---

## Definition of Done

### Code Quality
- [ ] Zero warnings (linting, TypeScript)
- [ ] No console.logs or debug code
- [ ] Docstrings on public functions
- [ ] README clear and complete

### Demo Environment
- [ ] Demo data seeded and tested
- [ ] All features working without crashes
- [ ] Network stable, no CORS errors
- [ ] Performance acceptable (no 10+ sec waits)

### Documentation
- [ ] Architecture document with diagrams
- [ ] API documentation complete
- [ ] Technical decisions explained
- [ ] Known issues documented

### Presentation Materials
- [ ] Pitch deck (10-12 slides, <12 min)
- [ ] Demo video (3-5 min, backup plan)
- [ ] Speaker notes prepared
- [ ] Q&A talking points ready

### Team Readiness
- [ ] 3+ rehearsals completed
- [ ] Timing validated (<12 min)
- [ ] Roles assigned (talker, demo, Q&A)
- [ ] Team confident and synchronized

### Sign-Off
- [ ] **PM:** "Ready to demo, all features working, compelling story"
- [ ] **Tech Lead:** "Code is clean, demo reliable, no blockers"
- [ ] **Team:** "Confident in presentation, practiced and prepared"

---

## Success Criteria

**Demo Success:**
- ✅ Live demo runs without crashes
- ✅ All features showcased working
- ✅ Demo completes in <5 minutes
- ✅ Data displays accurately and impressively

**Presentation Success:**
- ✅ Delivered in <12 minutes
- ✅ Problem and solution clear
- ✅ Team speaks confidently
- ✅ Judges engage (ask questions)

**Overall Success:**
- ✅ Judges understand product value
- ✅ 3+ SME owners express interest
- ✅ Team presents professionally
- ✅ Code quality impressive
- ✅ Advance to next round (if applicable)

---

## Handoff to Post-Demo

### If Demo Succeeds
- [ ] Collect judge feedback
- [ ] Compile SME interest (contact info, needs)
- [ ] Plan Phase 1 (pilot onboarding, Phase 2 features)
- [ ] Begin supplier/partner outreach

### If Demo Has Issues
- [ ] Document what failed
- [ ] Root cause analysis
- [ ] Plan fixes for Phase 2
- [ ] Iterate based on feedback

---

**Epic Owner:** Entire Team
**Created:** 2025-11-04
**Status:** ✅ Ready for Development
