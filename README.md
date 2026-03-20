# 🌿 ShelfSense — Green-Tech Inventory Assistant

ShelfSense is an AI-powered inventory management system designed to reduce waste and optimize stock levels for small businesses and labs. It features advanced **Batch Tracking**, **FEFO (First Expired, First Out)** logic, and intelligent forecasting powered by **Gemini 3 Flash**.

---

## 📋 Submission Details

- **Candidate Name:** Sai Charan Sanganwar
- **Scenario Chosen:** Green-Tech Inventory Assistant
- **Estimated Time Spent:** ~5.5 hours

---

## ⚡ Quick Start

### ● Prerequisites
- **Node.js**: v18.0 or higher
- **MySQL**: v8.0 or higher
- **API Key**: A [Google AI Studio](https://aistudio.google.com/app/apikey) API key for **Gemini 3 Flash**.

### ● Run Commands
```bash
# 1. Install all dependencies (Monorepo)
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your GEMINI_API_KEY and DB credentials

# 3. Database Initialization
mysql -u root -p -e "CREATE DATABASE shelfsense;"

# 4. Run migrations and seed sample data
npm run seed

# 5. Launch Development Servers
npm run dev
```

### ● Test Commands
```bash
# Run full test suite (17 Tests: 13 Backend, 4 Frontend)
npm test
```

---

## 🏠 Project Architecture

ShelfSense is built as a TypeScript monorepo with a clear separation of concerns:

```
ShelfSense/
├── packages/
│   ├── backend/                # Express API + Logic Engine
│   │   ├── src/
│   │   │   ├── controllers/    # Request handlers (Dashboard, Items, Usage)
│   │   │   ├── services/       # Business Logic (FEFO Rules, AI Orchestration)
│   │   │   ├── repositories/   # Data Access Layer (SQL Abstraction)
│   │   │   ├── db/             # Migrations, Seeders, and Connection Pool
│   │   │   ├── routes/         # Express endpoint definitions
│   │   │   └── types/          # Shared interfaces & Type Guards
│   │   └── tests/              # Unit & Integration tests for core logic
│   └── frontend/               # React + Vite SPA
│       ├── src/
│       │   ├── pages/          # Inventory, Dashboard, Calendar, Details
│       │   ├── components/     # UI Elements (Modals, Forms, Tables)
│       │   ├── hooks/          # API Integration & Data Fetching
│       │   ├── api/            # Typed fetch client
│       │   └── types/          # Frontend-specific models
├── .env.example                # Security template
└── package.json                # Monorepo workspaces
```

---

## ✨ Features Implemented

1.  **Intelligent Dashboard**: Real-time KPIs tracking stock health, imminent expirations, and sustainability metrics.
2.  **Multi-Batch Tracking**: Support for managing multiple batches of the same item, each with unique quantities and expiry dates.
3.  **FEFO (First Expired, First Out)**: Automated deduction logic that intelligently depletes the soonest-expiring stock first.
4.  **AI-Powered Categorization**: Uses Gemini 3 Flash to automatically classify items into lab-specific and consumable categories.
5.  **Predictive Stockout Forecasting**: AI-driven analysis of usage trends to calculate precise burnout dates and reorder windows.
6.  **Interactive Expiry Calendar**: A visual timeline of batch expirations to help staff prioritize usage.
7.  **Smart Procurement**: AI suggestions for local and sustainable suppliers based on item categories.
8.  **Bulk Data Importer**: CSV/JSON ingestion with an interactive preview and validation step.
9.  **Audit Movement Logs**: Comprehensive history of every inventory movement (Addition, Usage, Correction).
10. **Portal-Based UI**: All modals are rendered via React Portals to guarantee perfect viewport centering and scroll independence.
11. **Sustainability Rating**: Dynamic "Health Score" (A-F) based on waste reduction efficiency and supplier diversity.
12. **Hybrid Fallback Engine**: Robust rule-based fallbacks for categorization and forecasting if the AI service is offline.
13. **AI Chat Assistant**: A dedicated conversational interface for natural language queries (e.g., "Which chemicals are expiring?").
14. **Vision-Simulated Shelf Scan**: An integrated modal interface for "Scanning" physical shelves to update stock levels using AI vision simulation.
15. **Dedicated Reorder Queue**: A prioritized hub for replenishment-ready items, optimized for sustainable procurement and reorder point management.

---

## 🦾 AI/Fallback Decision Flow

ShelfSense is designed for "Human-AI collaboration" with reliable safety nets:

```
ACTION: Create Item
  → AI Service (Gemini 3 Flash) → success ? Set AI Category : 
  → Fallback Service (Keyword Engine) → Set Rule-based Category

ACTION: Get Forecast
  → Usage Logs count >= 2 ?
      → AI Service (Gemini 3 Flash) → Success: Semantic analysis :
      → Fallback Service (Math Engine) → Success: (Total / Avg Daily Usage)
```

---

## 🧬 AI Disclosure & Verification

### ● Did you use an AI assistant (Copilot, ChatGPT, etc.)?
**Yes** (Antigravity)

### ● How did you verify the suggestions?
1.  **Algorithmic Tracing**: Every AI-suggested implementation of the FEFO algorithm was manually traced using a spreadsheet mock-up to ensure batch-depletion parity.
2.  **Automated Testing**: 17 Vitest cases were written to verify that both the "Happy Path" (AI response) and "Edge Case" (API failure) result in consistent data states.
3.  **Idea Validation**: I vetted AI-suggested features against the "Green-Tech" objective, keeping only those that realistically contributed to waste reduction.
4.  **Security Audit**: All generated SQL and data-handling code was audited for parameter injection risks and boundary errors (e.g., negative quantities).

### ● Give one example of a suggestion you rejected or changed:
The assistant suggested implementing real-time WebSocket updates for the audit logs. I rejected this for the MVP, choosing a robust polling mechanism instead. This allowed me to keep the infrastructure simpler and focused on the more critical **FEFO batch-deduction algorithm**, which has a higher direct impact on the user's primary goal of reducing waste.

---

## ⚖️ Tradeoffs & Prioritization

### ● What did you cut to stay within the 4–6 hour limit?
- **User Authentication**: The system is designed for a single-lab environment; RBAC/JWT was prioritized lower than the core tracking logic.
- **Image Persistence**: Scan uploads are processed in-memory for the demo rather than being saved to a persistent blob storage.

### ● What would you build next if you had more time?
1.  **Direct Vendor Integration**: One-click reordering with major platforms like **Amazon or Flipkart**, including redirection for order placement.
2.  **Identity Management**: A full Authentication suite with Role-Based Access Control (Admin/Manager/Staff).
3.  **Omni-Channel Notifications**: Live browser push alerts and persistent notifications for imminent batch expirations and procurement needs.
4.  **Mobile Ecosystem**: A dedicated **Native Mobile App (React Native)** and a fully responsive "Quick-Scan" mobile web mode.
5.  **AI Email Summaries**: Automated weekly and monthly email digests summarizing inventory health, reorder needs, and sustainability gains.

### ● Known limitations
- **Sustainability Heuristics**: The score is a preliminary measure of stock freshness and data coverage, not a verified life-cycle assessment (LCA).
- **CSV Schema Strictness**: The bulk importer requires exact header matches as defined in the provided `sample-inventory.csv` template.
- **Forecast Sample Size**: High-confidence AI forecasting requires at least 2 usage log entries; lower samples trigger a math-based fallback.

---

## 🛠️ Tech Stack & Implementation Details

| Layer    | Technology |
|----------|------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Backend** | Node.js, Express 4, TypeScript |
| **Database** | MySQL 8 (Repository Pattern + Migrants) |
| **AI** | Google Gemini 3 Flash (`@google/generative-ai`) |
| **Testing** | Vitest (Happy Path + Edge Cases) |

### 🚀 Advanced Features
- **Batch Tracking System**: Support for multiple batches per item, each with its own expiration date.
- **FEFO Deduction**: Automated stock depletion from the earliest expiring batch first.
- **Modal Portals**: Use of `createPortal` to render all modals into `document.body`, solving scroll-position centering issues.
- **Hybrid AI Fallback**: If Gemini fails, the system seamlessly transitions to keyword categorization and math-based forecasting.

---

## 📊 Synthetic Dataset
- **JSON**: [packages/backend/src/data/sample-data.json](packages/backend/src/data/sample-data.json) — 39 items including lab supplies and essentials.
- **CSV**: [packages/backend/src/data/sample-inventory.csv](packages/backend/src/data/sample-inventory.csv) — Template for bulk imports.
