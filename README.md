# Atmiya Dosa Hub — Pure Veg Restaurant POS & Touchless QR Ordering System

> **Enterprise-Grade, Multi-Tenant Ready Restaurant ERP & Touchless Dining Platform**  
> Built with **React 18**, **FastAPI (Python 3.11)**, **Supabase PostgreSQL (Realtime RLS)**, and **Tailwind CSS**. Optimized for containerized zero-downtime deployment on **Google Cloud Run**.

---

## 🌟 System Overview

**Atmiya Dosa Hub** is a full-stack, real-time restaurant management solution engineered for high-throughput Indian dining operations. It eliminates order bottlenecks by giving guests touchless QR table ordering with zero login barrier, while providing staff with specialized real-time terminals (Kitchen KDS, Floor Waiter Terminal, Cashier POS, and Executive Analytics).

---

## 🚀 Core Modules & Architecture

### 1. Touchless QR Dining Menu (Customer Experience)
- **Zero-Barrier Ordering**: Guests scan table QR standees to instantly open the interactive menu in Gujarati, Hindi, or English.
- **Deterministic Anti-Tamper Security**: Cryptographic URL verification (`&tsec=...`) binds the session to the physical dining table, strictly preventing URL table hijacking (`?table=T01` vs `?table=T02`).
- **Multi-Round Running Bill**: Guests can add starters, main courses, and beverages across multiple dining rounds into a unified running ticket.
- **Instant Floor Calls**: 1-tap service requests for Water Refill, Waiter Assistance, Bill Request, and Table Cleaning.
- **UPI QR Direct Payment**: Dynamic UPI deep-linking supporting Google Pay, PhonePe, and Paytm with zero payment gateway transaction fees.

### 2. Kitchen Display System (KDS)
- **Real-Time Dish Dispatch**: Orders dispatch instantly to the kitchen queue via Supabase Realtime broadcast websockets.
- **Item-Level Status Tracking**: Chefs mark individual items as *Cooking*, *Ready*, or *Served*.
- **Visual Station Timers**: Color-coded urgency alerts for orders exceeding target preparation times.
- **Audio Chimes**: High-clarity chime alerts for incoming orders and critical updates.

### 3. Floor Service & Waiter Terminal
- **Visual Floor Map**: Live 16-table dining floor status (*Available*, *Occupied*, *Food Ready*, *Bill Due*, *Cleaning Needed*).
- **Food Runner Alerts**: Waiters receive immediate notifications the moment dishes are plated and ready at the kitchen pass.
- **Floor Call Dispatch**: Sound-alerted queues for guest water refills and concierge assistance with 1-tap "Attend" resolution.

### 4. Cashier POS & Table Operations
- **Quick POS Terminal**: Walk-in and phone takeaway order entry with instant item search and custom notes.
- **Table Turnover & Vacate Engine**: 1-tap table settlement and vacate workflow that automatically dispatches cleaning alerts to floor staff.
- **Shift & Day Settlement (Z-Report)**: Automated end-of-day statutory GST financial auditing.
- **Direct Thermal & Audit Downloads**: Direct PDF generation for 80mm thermal receipts and A4 GST audit ledgers, plus Excel-ready CSV export.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide React, KaTeX, jsPDF, html2canvas |
| **Backend API** | FastAPI (Python 3.11), Pydantic v2, Uvicorn, SlowAPI (Rate Limiting) |
| **Database & Realtime** | Supabase PostgreSQL, Row-Level Security (RLS), Realtime Broadcast Channels |
| **Container & Cloud** | Docker, Nginx Alpine, Google Cloud Run (Continuous Deployment) |
| **Security** | Stateless JWT tokens, XSS payload sanitization, brute-force PIN lockout, Anti-tamper table salts |

---

## 📁 Repository Structure

```
├── backend/                  # FastAPI Python Backend
│   ├── app/
│   │   ├── middleware/       # Rate limiting, security headers, payload validation
│   │   ├── routers/          # API endpoints (orders, menu, tables, qr, auth, payments)
│   │   ├── schemas/          # Pydantic v2 data validation models
│   │   ├── database.py       # Canonical datastore & Supabase sync layer
│   │   └── security.py       # Password hashing, JWT creation & verification
│   ├── Dockerfile            # Container definition for backend API
│   ├── requirements.txt      # Python dependencies
│   └── run.py                # Local API entrypoint (Port 5000)
│
├── frontend/                 # React 18 + Vite SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/        # Dashboard, Orders, KDS, POS, Reports, QR Studio
│   │   │   ├── waiter/       # Waiter Terminal & Floor Service Map
│   │   │   ├── auth/         # Secure Staff Login & Role Wall
│   │   │   └── CustomerMenu.jsx # Guest touchless menu & ordering interface
│   │   ├── lib/              # Security, Supabase, PDF generation, sounds, translations
│   │   └── App.jsx           # Root orchestrator & routing layer
│   ├── Dockerfile            # Multi-stage production container with Nginx
│   ├── nginx.conf            # Single-page application routing & gzip compression
│   └── package.json          # Node dependencies & Vite build scripts
│
├── Dockerfile                # Root unified container definition for Google Cloud Run
└── README.md                 # System documentation
```

---

## 💻 Local Development Setup

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- Git

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
# Windows:
.\.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
python run.py
# Backend runs on http://localhost:5000 (Swagger docs at /docs)
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

---

## ☁️ Production Deployment (Google Cloud Run)

### Continuous Deployment via GitHub:
1. Push repository changes to `main`:
   ```bash
   git add -A
   git commit -m "feat(core): production release v2.0"
   git push origin main
   ```
2. In **Google Cloud Console** > **Cloud Run**:
   - Create Service > Select **Continuously deploy from a repository**.
   - Select `AtmiyaDosa.com` repository and `main` branch.
   - Region: `asia-south1` (Mumbai).
   - Allow unauthenticated invocations for public customer QR ordering.
   - Google Cloud Build will automatically build and deploy with zero downtime.

---

## 📄 License
Proprietary software developed for **Atmiya Dosa Hub**. All rights reserved.
