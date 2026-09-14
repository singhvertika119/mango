<div align="center">

# 🥭 Mango

**The AI-Native Workspace That Understands and Operates Your Projects**

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%7C%20Auth%20%7C%20pgvector-emerald?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Model Context Protocol](https://img.shields.io/badge/Protocol-MCP-orange?style=flat-square)](https://modelcontextprotocol.io/)
[![Deployment](https://img.shields.io/badge/Deployed_on-Vercel-black?style=flat-square&logo=vercel)](https://mango-psi-inky.vercel.app)

[Live Demo](https://mango-psi-inky.vercel.app) • [Key Features](#-key-features) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [Environment Variables](#-environment-variables)

</div>

---

## 📖 Overview

**Mango** is an AI-native workspace built for modern software engineering teams and developers. Unlike conventional project management tools or disconnected chatbots, Mango bridges project management, persistent technical knowledge, real-time code context, and safe AI agent operations.

> **North Star:** Mango is not an AI chatbot inside a workspace. It is a workspace that an AI agent can natively understand, ground context from, and operate through controlled tool execution.

---

## ✨ Key Features

### 🏢 Multi-Tenant Workspaces & Projects
- **Workspace Isolation:** Separate engineering hubs, client projects, and startup streams with workspace-level members and Role-Based Access Control (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`).
- **Real-Time Switcher:** Instant workspace switching from both the top header and navigation sidebar with zero page reloads.

### 🤖 Grounded AI Project Agent
- **Powered by Groq LLMs:** Ultra-fast context compilation and reasoning using Llama 3.3 and Mixtral models.
- **RAG & Project Brain:** Hybrid search combining semantic embeddings (`pgvector`) and keyword indexing across all uploaded specifications, PRDs, notes, and task descriptions.
- **Context-Aware Recommendations:** Automatically suggests task breakdowns, architectural improvements, and database indexing strategies based on active workspace documents.

### 🛡️ Model Context Protocol (MCP) & Safe Tool Execution
- **Standardized Tool Layer:** AI agents interact with workspace services and external APIs via structured MCP tools (`search_tasks`, `create_task`, `search_documents`, `create_github_issue`, etc.).
- **Human-in-the-Loop Approvals:** High-risk actions (e.g., GitHub issue creation, deletion, repo sync) require explicit user approval before execution.

### 📋 Agile Tasks & Kanban Management
- **Interactive Boards:** Drag-and-drop / status-driven Kanban board with `Todo`, `In Progress`, `Review`, `Completed`, and `Blocked` states.
- **Deep Document Links:** Tasks link directly to knowledge base documents and code references.

### 📚 Knowledge Base, Canvas & Docs
- **Multi-Format Ingestion:** Ingest and parse Markdown files, PDFs, code snippets, notes, and specification sheets.
- **Vector Embeddings Pipeline:** Automatically chunks and embeds documents into PostgreSQL with `pgvector` for instant semantic retrieval.

### 🐙 GitHub Integration
- **Repository Sync:** Connect GitHub repositories via OAuth to inspect issues, commits, branches, and PR status.
- **Automated Issue Generation:** Ask the agent to analyze tasks or bugs and draft linked GitHub issues with one click.

### ⚡ Global Command Palette (`Ctrl + K`)
- Instant keyboard-driven navigation across tasks, documents, settings, and agent workflows.

### 🔔 Real-Time WebSockets & Audit Logs
- Instant live updates for notifications, task status modifications, and workspace activity without client polling.

---

## 🏗️ Architecture

```text
                                  +-------------------+
                                  |     End User      |
                                  +---------+---------+
                                            |
                                            v
                        +---------------------------------------+
                        |         Next.js 16 Web Client         |
                        |   App Router | Server Actions | SSR   |
                        +-------------------+-------------------+
                                            |
                         +------------------+------------------+
                         |                                     |
                         v                                     v
             +-----------------------+             +-----------------------+
             |   Workspace Engine    |             |  AI Agent & MCP Hub   |
             |  Services & RLS Auth  |             | Groq LLM + MCP Tools  |
             +-----------+-----------+             +-----------+-----------+
                         |                                     |
                         +------------------+------------------+
                                            |
                                            v
    +--------------------------------------------------------------------------------+
    |                                Supabase Cloud                                  |
    |  +--------------------+  +--------------------+  +---------------------------+ |
    |  |  PostgreSQL + RLS  |  |   Auth & OAuth     |  |   Storage & pgvector      | |
    |  |  Multi-tenant data |  | GitHub/Google/Pass |  | Document chunks & vectors | |
    |  +--------------------+  +--------------------+  +---------------------------+ |
    +--------------------------------------------------------------------------------+
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16.3](https://nextjs.org/) (App Router, Turbopack, Server Actions) |
| **Frontend** | [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/) |
| **UI Components** | [shadcn/ui](https://ui.shadcn.com/), [Base UI](https://base-ui.com/), [Lucide React](https://lucide.dev/) |
| **Database** | [Supabase PostgreSQL 15+](https://supabase.com/) with Row Level Security (RLS) |
| **Vector Search** | [pgvector](https://github.com/pgvector/pgvector) for hybrid semantic document retrieval |
| **Authentication** | [Supabase Auth](https://supabase.com/auth) (Email/Password, GitHub OAuth, Google OAuth) |
| **AI Inference** | [Groq API](https://groq.com/) (Llama 3.3 70B Versatile, Mixtral) |
| **Agent Protocol** | [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) |
| **Deployment** | [Vercel](https://vercel.com/) (Frontend & Edge Functions) |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or later
- **npm** or **pnpm**
- **Supabase Account**: A free Supabase project with `pgvector` enabled
- **Groq API Key**: For LLM-powered project agent operations

---

### 1. Clone the Repository
```bash
git clone https://github.com/singhvertika119/mango.git
cd mango
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# AI / LLM Engine (Groq)
GROQ_API_KEY=gsk_your_groq_api_key

# Security & Encryption (32-byte hex key for integration credentials)
ENCRYPTION_KEY=94ef795c66a1ebc074468a61139db8568598f3b3cd145a8c0fecd6b245857907

# GitHub OAuth Integration (Optional for repository linking)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=http://localhost:3005/api/auth/callback/github
```

### 4. Database Setup & Migrations
Execute the setup migration script located in [`supabase/complete_setup.sql`](supabase/complete_setup.sql) inside your Supabase SQL Editor to provision all tables, Row Level Security (RLS) policies, indexes, and pgvector extensions.

### 5. Run the Local Development Server
```bash
npm run dev
```

Open [http://localhost:3005](http://localhost:3005) in your browser.

---

## 🔒 Security & Row Level Security (RLS)

Mango enforces strict multi-tenant isolation at the database layer:
- **No Shared Access:** Every table (`workspaces`, `projects`, `tasks`, `documents`, `activities`, `approvals`, `integrations`) requires membership verification via `workspace_members`.
- **Untrusted Prompt Safety:** Retrieved RAG context is treated as untrusted data; tool calls require explicit authorization and human-in-the-loop approval before executing write operations.
- **Server-Side Token Storage:** OAuth integration tokens are AES-256 encrypted before being persisted.

---

## 📦 Project Structure

```text
mango/
├── app/
│   ├── (auth)/                  # Authentication routes (login, signup)
│   ├── (dashboard)/             # Protected workspace views
│   │   ├── dashboard/           # Main metrics, activity log & AI recommendations
│   │   ├── projects/            # Project stream configurations
│   │   ├── tasks/               # Kanban board & task manager
│   │   ├── canvas/              # Collaborative canvas & documentation editor
│   │   ├── knowledge/           # Knowledge base & file ingestion
│   │   ├── agent/               # Interactive Agent console with approval drawer
│   │   ├── integrations/        # GitHub & third-party service connections
│   │   └── settings/            # Workspace member management & preferences
│   ├── actions/                 # Next.js Server Actions (tasks, docs, agent, workspace)
│   ├── api/                     # REST / Webhook endpoints & MCP routes
│   │   ├── auth/                # GitHub OAuth handlers
│   │   └── mcp/                 # Model Context Protocol servers
│   └── auth/callback/           # Supabase OAuth redirect & session handler
├── components/
│   ├── auth/                    # OAuth buttons & login widgets
│   ├── dashboard/               # Shell, Topbar, Sidebar, Switchers & Modals
│   └── ui/                      # Base UI / shadcn design system primitives
├── lib/
│   ├── agent/                   # Agent reasoning engine, planner & MCP client
│   ├── services/                # Supabase database service layer
│   └── supabase/                # SSR client, server client & middleware helpers
├── supabase/
│   ├── complete_setup.sql       # Consolidated database schema & RLS policies
│   └── migrations/              # Incremental SQL migration scripts
└── public/                      # Static brand assets and icons
```

---

## 🌐 Production Deployment

### Deploy to Vercel
1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com/).
3. Add all environment variables from `.env.local` to the Vercel Project Settings.
4. In your **Supabase Dashboard** (`Authentication -> URL Configuration`), add your Vercel URL to the **Redirect URLs Allow List**:
   - `https://your-app.vercel.app/**`
   - `https://your-app.vercel.app/auth/callback`

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
Built with ❤️ for developer productivity and autonomous AI engineering.
</div>
