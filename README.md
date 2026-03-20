# 🌿 ShelfSense — Green-Tech Inventory Assistant

ShelfSense is an AI-powered inventory management system designed to reduce waste and optimize stock levels for labs and small businesses.

---

## 📋 Submission Details

- **Candidate Name:** Sai Charan Sanganwar
- **Scenario Chosen:** Green-Tech Inventory Assistant
- **Estimated Time Spent:** ~5.5 hours

### 🎬 Presentation Link
> [!IMPORTANT]
> **View the 7-minute Demo & Architecture Walkthrough here:**  
> [Presentation Video Link (YouTube)](https://youtu.be/Ps1kWn0yRyE)

---

## ⚡ Quick Start

### ● Prerequisites
- **Node.js**: v18.0 or higher
- **MySQL**: v8.0 or higher
- **API Key**: [Google AI Studio](https://aistudio.google.com/app/apikey) key for Gemini 3 Flash.

### ● Run Commands
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your GEMINI_API_KEY and DB credentials

# 3. Database & Seed
mysql -u root -p -e "CREATE DATABASE shelfsense;"
npm run seed

# 4. Launch
npm run dev
```

### ● Test Commands
```bash
# Run test cases (Backend & Frontend)
npm test
```

---

## 🦾 AI Disclosure

### ● Did you use an AI assistant (Copilot, ChatGPT, etc.)?
**Yes** (Antigravity)

### ● How did you verify the suggestions?
1.  **Algorithmic Tracing**: Every AI-suggested implementation of the FEFO depletion algorithm was manually traced using a spreadsheet mock-up.
2.  **Automated Testing**: 17 Vitest cases verify that both "Happy Path" (AI success) and "Edge Case" (API failure) result in consistent data states.
3.  **Security Audit**: All generated SQL and data-handling code was audited for parameter injection risks and boundary errors (e.g., negative quantities).

### ● Give one example of a suggestion you rejected or changed:
The assistant suggested implementing real-time WebSocket updates for audit logs. I **rejected** this for the MVP, choosing a simpler polling mechanism instead. This allowed me to prioritize the **FEFO batch-deduction algorithm**, which is the core engine for reducing waste.

---

## ⚖️ Tradeoffs & Prioritization

### ● What did you cut to stay within the 4–6 hour limit?
- **User Authentication**: Prioritized core "Green-Tech" tracking logic over RBAC/JWT suites.
- **Image Persistence**: Scan uploads are processed in-memory for the demo rather than being saved to persistent blob storage.

### ● What would you build next if you had more time?
1.  **Direct Vendor Integration**: One-click reordering with major platforms like Amazon or Flipkart.
2.  **Omni-Channel Notifications**: Push alerts and Email summaries for imminent batch expirations.
3.  **Mobile Ecosystem**: A native React Native app for warehouse/lab staff.
4.  **AI Email Summaries**: Automated weekly and monthly email digests summarizing inventory health, reorder needs, and sustainability gains.
5.  **Identity Management**: A full Authentication suite with Role-Based Access Control (Admin/Manager/Staff).

### ● Known limitations:
- **Forecast Sample Size**: High-confidence AI forecasting requires at least 2 usage log entries per item.
- **Sustainability Heuristics**: The score is a preliminary measure of stock freshness, not a verified life-cycle assessment (LCA).

---

## 📑 Detailed Documentation
For a deep dive into the technical stack, project architecture, and design choices, see:  
👉 [DOCUMENTATION.md](DOCUMENTATION.md)
