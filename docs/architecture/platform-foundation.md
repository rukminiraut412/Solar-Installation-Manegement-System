# Platform Foundation Architecture Guide

## 1. Monolith Architecture Overview
The Solar Installation Management System (SunPower Solutions) is architected as a **Modular Monolith**:
- Single unified backend runtime (`server/`) powered by Node.js and Express.
- Single unified Single Page Application (`client/`) powered by React, Vite, and Tailwind CSS.
- Single relational PostgreSQL database with modular schema partitioning and sequential migration files.

## 2. Directory Layout & Ownership
```
Solar-Installation-Manegement-System/
├── package.json               # Root workspace orchestrator
├── vercel.json                # Vercel deployment spec for client SPA
├── render.yaml                # Render deployment spec for backend & PostgreSQL
├── docs/                      # Planning, architecture & integration specs
│   ├── planning/              # Master architecture planning documents
│   ├── architecture/          # Platform foundation and module architecture
│   └── integration/           # Integration contracts for Members 2, 3, and 4
├── server/                    # Backend Express Monolith
│   ├── src/
│   │   ├── app.js             # Express application configuration & security
│   │   ├── server.js          # HTTP listener with graceful shutdown
│   │   ├── config/            # Environment parsing and database config
│   │   ├── db/                # PostgreSQL connection pool & migration runner
│   │   ├── middleware/        # Auth, RBAC, error handling, rate limiting
│   │   ├── shared/            # Utilities, AppError, response envelope, logger
│   │   └── modules/           # Business modules
│   │       ├── auth/          # Member 1: Authentication & User Management
│   │       ├── crm/           # Member 2: Leads & Customer Portal
│   │       ├── sales/         # Member 2: Quotations & Site Surveys
│   │       ├── operations/    # Member 3: Projects & Installation
│   │       ├── inventory/     # Member 3: Stock, Warehouses & Audits
│   │       ├── support/       # Member 4: Tickets & AMC Contracts
│   │       ├── finance/       # Member 4: Payments & Invoices
│   │       └── analytics/     # Member 4: AI Insights & Forecasting
└── client/                    # Frontend React SPA
    ├── src/
    │   ├── app/               # Root routing, providers, and app shell
    │   ├── components/        # Reusable UI atoms, layouts, tables, modals
    │   ├── shared/            # API client (Axios), hooks, formatters, tokens
    │   └── modules/           # Feature views aligned with backend modules
```

## 3. Standard Response Envelope
All API endpoints must return the standardized response structure:

### Success Response (200, 201)
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "meta": { "page": 1, "total": 42 } // optional pagination/metadata
}
```

### Error Response (4xx, 5xx)
```json
{
  "success": false,
  "message": "Human-readable error description",
  "error": {
    "code": "BAD_REQUEST | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT | VALIDATION_ERROR | INTERNAL_ERROR",
    "details": [ ... ] // optional validation field details
  }
}
```
