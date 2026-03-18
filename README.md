# ShelfSense — Green-Tech Inventory Assistant

A lightweight, AI-powered inventory assistant for non-profits, small cafes, and university labs to track assets, predict stock depletion, and reduce waste.

---

## Candidate Info

**Candidate Name:** [Your Name]
**Scenario Chosen:** Green-Tech Inventory Assistant
**Estimated Time Spent:** ~5 hours

---

## Quick Start

### Prerequisites

- Node.js 18+
- MySQL 8.0+ running locally
- A [Google AI Studio](https://aistudio.google.com/app/apikey) API key (free)

### Setup

```bash
# 1. Clone and install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — fill in GEMINI_API_KEY and MySQL credentials

# 3. Create the database in MySQL
mysql -u root -p -e "CREATE DATABASE shelfsense;"

# 4. Run migrations and seed sample data
npm run seed

# 5. Start both servers (backend :3001, frontend :5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Test Commands

```bash
# Run all tests
npm test

# Backend tests only
npm run test --workspace=packages/backend

# Frontend tests only
npm run test --workspace=packages/frontend
```

---

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend  | Node.js, Express 4, TypeScript    |
| Database | MySQL 8 via `mysql2`              |
| AI       | Google Gemini 1.5 Flash (`@google/generative-ai`) |
| Testing  | Vitest                            |

---

## Features

### Core Flow (Create + View + Update)
- Add inventory items with name, quantity, unit, expiry date, and reorder threshold
- View all items in a searchable, filterable table (by name + category + low-stock flag)
- Edit or delete items inline; log consumption with a single form

### AI Integration — Categorization + Forecasting
- **On item add**: Gemini 1.5 Flash auto-categorizes the item by name/unit into one of 11 predefined categories
- **On usage detail**: Gemini analyzes the usage log history and forecasts days until stockout with a confidence level and reasoning
- **Fallback**: When `GEMINI_API_KEY` is missing, network fails, or `USE_FALLBACK_ONLY=true`:
  - Categorization falls back to a keyword dictionary (deterministic, zero-latency)
  - Forecasting falls back to `current_quantity / avg_daily_usage` math
  - The UI shows "⚡ Category set by smart rules (AI unavailable)" so users always know which path ran

### Dashboard
- KPI tiles: total items, low stock count, expiring in 7/30 days
- Sustainability Score (0–100) based on freshness ratio and reorder coverage
- Live low-stock and expiring-soon panels

---

## Design Documentation

### Architecture

```
ShelfSense/
├── packages/
│   ├── backend/          Express API + MySQL + Gemini AI
│   │   ├── src/
│   │   │   ├── db/       connection.ts, migrations.ts, seed.ts
│   │   │   ├── routes/   items.ts, usage.ts, dashboard.ts
│   │   │   ├── services/ aiService.ts, fallbackService.ts, inventoryService.ts
│   │   │   └── types/    index.ts
│   │   └── tests/
│   └── frontend/         React + Tailwind SPA
│       ├── src/
│       │   ├── api/      client.ts (typed fetch wrappers)
│       │   ├── hooks/    useItems.ts, useDashboard.ts
│       │   ├── components/
│       │   └── pages/
│       └── tests/
├── .env.example
└── packages/backend/src/data/sample-data.json   ← synthetic dataset
```

### AI/Fallback Decision Flow

```
POST /api/items
  → aiService.categorizeItem()
      ✓ success  → category from Gemini, ai_categorized: true
      ✗ AiUnavailableError → fallbackService.categorizeItem()
                             keyword dictionary, ai_categorized: false
```

### Future Enhancements

- Visual asset scanning: photo upload → Gemini Vision identifies items
- Predictive reorder notifications (email/push when days_until_stockout < threshold)
- Supplier suggestions: "Fair-trade coffee near you"
- Multi-user / org support with auth
- Export to CSV/PDF for reporting

---

## Synthetic Dataset

[packages/backend/src/data/sample-data.json](packages/backend/src/data/sample-data.json) — 20 items spanning 8 categories with realistic quantities, some intentionally low-stock and near-expiry so the dashboard shows meaningful data on first load.

---

## AI Disclosure

**Did you use an AI assistant?** Yes (Claude)

**How did you verify suggestions?**
- Ran all tests and manually tested each API endpoint
- Confirmed fallback path fires correctly by setting `USE_FALLBACK_ONLY=true`
- Reviewed all generated code for security issues (no raw SQL concatenation, no secrets committed)

**One suggestion I changed:**
The original plan used SQLite triggers to auto-deduct quantity. Switched to MySQL and moved the deduction logic to the service layer (`inventoryService.logUsage`) since MySQL triggers require DDL privileges and add hidden state that complicates testing.

---

## Tradeoffs & Prioritization

**What was cut:**
- Per-item usage history UI (backend route exists, frontend page not built)
- Authentication / multi-tenant support
- Real-time notifications for low stock

**What I'd build next:**
1. Usage history chart per item with the AI forecast overlaid
2. Gemini Vision endpoint for photo-based shelf scanning
3. Weekly summary email digest

**Known limitations:**
- The sustainability score formula is intentionally simple (no carbon data source)
- Forecast accuracy depends on having ≥7 usage log entries; fewer entries yield "low confidence"
- No rate-limit handling for Gemini API quota exhaustion (falls back silently)
