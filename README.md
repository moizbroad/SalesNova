# SalesNova — AI-Powered Sales CRM

**Manage the sales pipeline in one workspace and ask Claude questions about CRM data through a custom MCP connector.**

Next.js 16 · React 19 · TypeScript · Supabase/PostgreSQL · Tailwind CSS · Claude · MCP · AWS

[Technical overview](docs/TECHNICAL_WRITEUP.md) · [Deployment guide](DEPLOYMENT.md)

## Problem and solution

Sales teams need a clear view of who owns each lead, what happened in the last conversation, and what needs to happen next. SalesNova connects contacts, outreach history, meetings, and opportunities so follow-up and pipeline reporting use the same records.

SDRs manage lead qualification, admins manage deals, and the founder can ask Claude about data exposed by the CRM's MCP tools. The AWS-hosted MCP server retrieves database results for Claude to turn into an answer.

## Core features

- **Contact pipeline:** board and table views, ownership, lead sources, qualification stages, and next actions.
- **Activity history:** notes, manually logged email/LinkedIn conversations, meetings, and automatic contact stage history.
- **Deal management:** contact-to-opportunity conversion, deal values, expected close dates, and stages from Discovery to Closed Won/Lost.
- **Sales reporting:** owner, source, and date filters; open pipeline, proposal activity, and won/lost metrics.
- **Accounts and branding:** email-code or magic-link login, admin/SDR application roles, user management, and company branding.
- **Conversational access:** Claude uses a custom connector to call MCP tools that retrieve CRM data.

## Architecture

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Arial, sans-serif", "fontSize": "15px", "lineColor": "#64748b", "edgeLabelBackground": "#ffffff"}, "flowchart": {"curve": "basis", "nodeSpacing": 30, "rankSpacing": 40}}}%%
flowchart TB
    subgraph CRM["SALES WORKSPACE"]
        direction TB
        Team(["SDRs & Administrators"])
        UI["React UI<br/>Sales workspace"]
        App["Next.js App Router<br/>Server reads & actions"]
        Session["User-session Client<br/>CRM reads & writes"]
        Admin["Admin Client<br/>Account management"]
        Team --> UI --> App
        App --> Session
        App --> Admin
    end

    subgraph AI["CONVERSATIONAL ACCESS"]
        direction TB
        Founder(["Founder"])
        Claude["Claude<br/>Questions & answers"]
        Connector["Custom MCP Connector"]
        subgraph AWS["AWS · EXTERNAL SERVICE"]
            MCP["MCP Server<br/>Tool dispatch"]
            Tools["Tool Handlers<br/>Database retrieval"]
        end
        Founder <-->|"Conversation"| Claude
        Claude <-->|"Tool calls & results"| Connector
        Connector <--> MCP
        MCP <--> Tools
    end

    subgraph DATA["SUPABASE · SHARED DATA PLATFORM"]
        direction LR
        Auth["Auth<br/>Email code & magic link"]
        DB[("PostgreSQL<br/>CRM records & policies")]
        Storage["Storage<br/>Avatars & branding"]
        History["Stage Triggers<br/>Contact history"]
        DB --> History
    end

    Session <-->|"User session"| DB
    Tools <-->|"Query & result"| DB
    UI -.->|"Sign-in"| Auth
    UI -.->|"Media"| Storage
    Admin -.->|"Manage users"| Auth
    Admin -.->|"Manage profiles"| DB

    classDef people fill:#0f172a,stroke:#0f172a,color:#ffffff,stroke-width:2px
    classDef web fill:#dbeafe,stroke:#2563eb,color:#172554,stroke-width:1.5px
    classDef ai fill:#ede9fe,stroke:#7c3aed,color:#2e1065,stroke-width:1.5px
    classDef aws fill:#fff7ed,stroke:#ea580c,color:#7c2d12,stroke-width:1.5px
    classDef data fill:#d1fae5,stroke:#059669,color:#064e3b,stroke-width:1.5px
    classDef support fill:#f1f5f9,stroke:#64748b,color:#0f172a,stroke-width:1.5px

    class Team,Founder people
    class UI,App,Session web
    class Claude,Connector ai
    class MCP,Tools aws
    class DB data
    class Auth,Storage,History,Admin support

    style CRM fill:#f8fafc,stroke:#93c5fd,stroke-width:1px,color:#1e3a8a
    style AI fill:#faf5ff,stroke:#c4b5fd,stroke-width:1px,color:#5b21b6
    style AWS fill:#fff7ed,stroke:#fdba74,stroke-width:1px,color:#9a3412
    style DATA fill:#f0fdf4,stroke:#6ee7b7,stroke-width:1px,color:#065f46
```

The web application uses Server Components for reads and Server Actions for mutations. Supabase provides authentication, PostgreSQL, and media storage. A separate server-only client handles privileged account administration.

The MCP service runs separately on AWS. Claude calls its tools through the custom connector, the tool handlers query the database, and Claude answers using the returned data. This repository contains the CRM application; the MCP server and connector configuration are maintained separately.

## Technology stack

| Layer | Technologies |
| --- | --- |
| Application | Next.js 16 App Router, React 19, TypeScript |
| Interface | Tailwind CSS 4, Recharts, Tiptap |
| Data and identity | Supabase PostgreSQL, Auth, Storage, and SSR clients |
| AI integration | Claude, custom MCP connector, AWS-hosted MCP server |
| Runtime | Node.js 22, npm |

## Engineering highlights

- **Relational data model:** contacts link to owners, activities, and stage history; Supabase queries embed related records.
- **Database-driven history:** contact stage transitions are recorded by triggers, independently of the UI.
- **Server-side checks:** mutation handlers validate sessions and inputs; deal and account-management actions check the admin role.
- **Tool-based AI access:** MCP connects natural-language questions to database retrieval through server-side handlers.

See the [technical overview](docs/TECHNICAL_WRITEUP.md) for the data model, MCP sequence diagram, and current trade-offs.

## Run locally

Use Node.js 22 and a development Supabase project.

```bash
git clone https://github.com/moizbroad/SalesNova.git
cd SalesNova
npm ci
```

Create a local `.env.local` with your own values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
```

All `.env*` files are ignored. Keep the service-role key on the server.

Follow the [deployment guide](DEPLOYMENT.md) to configure the database, first admin account, and authentication callback, then run:

```bash
npm run dev
```

Open `http://localhost:3000`.

**Setup note:** `supabase/migrations/0004_deals.sql` is incomplete. Restore the deals schema before attempting a full fresh deployment. The [technical notes](docs/TECHNICAL_WRITEUP.md#current-limitations) cover the remaining limitations.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development |
| `npm run lint` | ESLint checks |
| `npm run build` | Production build |
| `npm start` | Serve the production build |

## Source guide

| Directory | Responsibility |
| --- | --- |
| `app/` | Routes, layouts, authentication callback, and Server Actions |
| `components/` | Contact, deal, reporting, profile, and settings interfaces |
| `lib/` | Domain types and Supabase clients |
| `supabase/migrations/` | Database schema, triggers, and storage policies |
| `docs/` | Architecture and implementation details |
