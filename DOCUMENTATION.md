# 📖 ShelfSense — Technical Documentation

## 🏗️ Project Architecture

ShelfSense is built as a TypeScript monorepo with a clean separation between the Express backend and React frontend.

```
ShelfSense/
├── packages/
│   ├── backend/                # Express API + Logic Engine
│   │   ├── src/
│   │   │   ├── controllers/    # Request handlers
│   │   │   ├── services/       # Business Logic (FEFO, AI Orchestration)
│   │   │   ├── repositories/   # Data Access Layer
│   │   │   ├── db/             # Migrations & Seeders
│   │   │   └── types/          # Core TypeScript Definitions
│   └── frontend/               # React SPA
│       ├── src/
│       │   ├── pages/          # View Components
│       │   ├── components/     # Reusable UI (Modals, Forms)
│       │   ├── hooks/          # Data fetching & state
│       │   └── api/            # Typed API Client
└── DOCUMENTATION.md           # This file
```

## 🛠️ Technical Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | React 18 / Vite | Fast HMR and robust component ecosystem. |
| **Styling** | Tailwind CSS | Precision control over custom "Green-Tech" aesthetics without library bloat. |
| **Backend** | Node.js / Express | Lightweight, scalable, and shares types with the frontend via monorepo. |
| **Database** | MySQL 8 | Relational integrity is critical for Batch Tracking and FEFO logic. |
| **AI Engine** | Gemini 3 Flash | High-speed, low-latency semantic analysis for categorization and forecasting. |
| **Testing** | Vitest | Extremely fast unit testing for the core inventory algorithms. |

## Features Implemented

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

## 🧪 Design Choices & Implementation Details

### 1. Batch-Level Inventory (FEFO)
Unlike simple inventory systems that just store a "Total Quantity", ShelfSense tracks every unique batch of an item.
- **Why**: Essential for preventing waste.
- **Algorithm**: The **FEFO (First Expired, First Out)** logic ensures that when a user logs usage, the system intelligently deducts from the soonest-expiring batch first.

### 2. Hybrid AI/Fallback Orchestration
Sustainability is too important to fail if an API is down.
- **AI Mode**: Uses semantic analysis to guess categories (e.g., "Oat Milk" -> "Dairy Alt").
- **Fallback Mode**: If Gemini is unreachable, a keyword-based regex engine takes over immediately, ensuring no interruption to the user's workflow.

### 3. Sustainability Scoring
The "Sustainability Grade" (A-F) is calculated live based on 4 vectors:
- **Waste Reduction**: Ratio of active vs expired stock.
- **Proactive Management**: % of items with set reorder thresholds.
- **Supplier Diversity**: Healthy mix of various vendors.
- **Cost Tracking**: Financial visibility into inventory health.

### 4. Portal-Based UI Architecture
To ensure premium feel, all modals (Add Item, Scan, Log Purchase) use **React Portals**. This solves stacking context issues and ensures perfect viewport centering, regardless of scroll depth in long inventory lists.

---
## 🦾 AI/Fallback Decision Flow

ShelfSense is designed for "Human-AI collaboration" with reliable safety nets:

```
ACTION: Create Item
  → req.body.category === "Uncategorized" ?
      → AI Service (Gemini 3 Flash) → success ? Set AI Category : 
      → Fallback Service (Keyword Engine) → Set Rule-based Category

ACTION: Get Forecast
  → Usage Logs count >= 2 ?
      → AI Service (Gemini 3 Flash) → Success: Semantic analysis :
      → Fallback Service (Math Engine) → Success: (Total / Avg Daily Usage)
```

---

## 📊 Synthetic Dataset
- **JSON Source**: `packages/backend/src/data/sample-data.json`
- **CSV Template**: `packages/backend/src/data/sample-inventory.csv`


