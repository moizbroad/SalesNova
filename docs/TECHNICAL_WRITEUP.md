# SalesNova: technical write-up

This document connects the CRM's business workflow to its implementation. It distinguishes source-backed CRM behavior, the external Claude/MCP integration described by the project owner, and proposed improvements. The external service has not been independently inspected or tested in this documentation pass.

## Problem and solution

A sales workflow needs a consistent answer to three questions: where is each lead, what happened last, and what should happen next? SalesNova models that context using contacts, owners, activities, qualification stages, and opportunities.

The application separates contact work for SDRs from opportunity administration. It combines searchable tables, pipeline boards, activity timelines, and reporting so the same records support day-to-day follow-up and management review.

The founder also uses Claude through a custom connector to ask about CRM data exposed by an AWS-hosted MCP server. The server executes database queries through its tools and returns results to Claude. This adds conversational access alongside the CRM interface.

The actual pre-project workflow, why the team chose a custom CRM over a commercial product, and any measured time savings require first-hand evidence from the project owner. They cannot be established from source code.

## Implemented request and data flow

1. The browser requests an application route. [`proxy.ts`](../proxy.ts) invokes the [session helper](../lib/supabase/middleware.ts), which validates the user through `auth.getUser()` and redirects unauthenticated users to login.
2. The protected [layout](../app/%28app%29/layout.tsx) loads profile and branding information. Deal pages additionally check the profile's admin role.
3. Server Components query Supabase using the [cookie-backed client](../lib/supabase/server.ts). Independent reads use `Promise.all` in list, detail, and report pages.
4. Client components provide filters, tables, charts, rich-text editing, and drag-and-drop interactions.
5. Server Actions authenticate again, validate relevant inputs, perform writes, and call `revalidatePath`. Contact stage triggers create history records inside the database.
6. Account-management actions check the admin role before using the [service-role client](../lib/supabase/admin.ts). This client bypasses RLS and is marked `server-only`.

### Data relationships

The following relationships exist in the base migration:

```mermaid
erDiagram
    AUTH_USERS ||--o| PROFILES : creates
    PROFILES o|--o{ CONTACTS : owns
    CONTACTS ||--o{ STAGE_HISTORY : records
    CONTACTS ||--o{ NOTES : has
    CONTACTS ||--o{ CONVERSATIONS : has
    CONTACTS ||--o{ MEETINGS : has
    PROFILES o|--o{ STAGE_HISTORY : changes
    PROFILES o|--o{ NOTES : authors
    PROFILES o|--o{ CONVERSATIONS : records
    PROFILES o|--o{ MEETINGS : records
```

Contact children use foreign keys with cascading deletion; owner/author references generally become null when the referenced profile is deleted. Indexes cover contact ownership, stages, and activity lookups. The application also expects `deals`, `deal_stage_history`, and `deal_notes`, with contact and profile relationships, but their SQL definition is absent from the one-character deals migration.

### Retrieval, pagination, and errors

Supabase queries embed related records, for example `owner:owner_id(full_name, email)` and `contact:contact_id(id, name, company)`. Detail queries select activities by parent ID and order them by date.

List pages fetch their result set before the browser filters it. They do not implement server-side pagination. Larger datasets may therefore be limited by API row caps, and browser-side aggregates may be incomplete. A future implementation should use bounded pages and database aggregates over the full authorized dataset.

Mutation actions generally return `{ error }` or `{ ok: true }`. Forms display errors and board components revert optimistic stage changes on failure. Empty-state messages exist for contacts, deals, activities, and reports. Several read paths ignore query errors and substitute empty arrays, while detail pages may treat a failed read as not found; missing data and infrastructure failures are not consistently distinguished.

## Engineering choices visible in the code

These are consequences of the implemented design, not claims about the author's original decision-making process.

| Choice | What it enables | Trade-off |
| --- | --- | --- |
| Next.js pages and Server Actions in one application | UI and server mutations share types and deployment | Mutations still require explicit authentication and validation |
| PostgreSQL relationships and enums | Structured stages, foreign-key consistency, related-record queries | Schema migrations must stay synchronized with application code |
| Database triggers for contact history | Stage recording does not depend on each UI remembering to write history | History is currently mutable under broad authenticated policies |
| Supabase Auth and session-aware clients | Managed identity with database policy enforcement | Incorrect policies undermine application role checks |
| Separate service-role client | Server-side account provisioning | Privileged credentials require narrow, reviewed call sites |
| Browser-side filtering and reporting | Simple interactive views for a small dataset | Full-dataset loading and API row caps limit scale and accuracy |
| Existing-open-deal lookup during conversion | Reuses a deal during sequential repeat conversions | Lookup and insert are not atomic; concurrent requests can duplicate deals |

Conversion also updates the contact status after inserting a deal without a transaction, and does not check that status update's error. A database transaction or RPC with a suitable uniqueness rule would make this workflow more reliable.

### Reporting semantics

Contact reports distinguish current stages from transitions recorded over time. Deal reports count history entries into Discovery, Proposal Sent, Closed Won, and Closed Lost within the selected date range.

The displayed win rate is `won transitions / (won transitions + lost transitions)`, rounded to a percentage, with zero for an empty denominator. Re-entering a stage can count a deal more than once. Historical value totals use each deal's current value, rather than a value snapshot from the transition. Reports also sum values without currency conversion. These semantics should be explicit in any future KPI specification and tests.

## Security review and known gaps

The following findings are based on committed source, not testing against a live Supabase database:

| Area | Current behavior and implication |
| --- | --- |
| Credentials | `.env*` is ignored; the admin module imports `server-only`. This does not constitute a full historical secret audit. |
| Shared contact access | Contact and activity policies allow all authenticated users to read/write. Owner assignment is metadata, not an access boundary. |
| Profile updates | `profiles_update_own` checks row ownership but does not restrict `role` or `is_active`. No column-level protection is supplied in the migrations; role changes need database enforcement. |
| Deal authorization | Routes and Server Actions check the admin role. The missing deals migration prevents verification of its database policies. |
| Account deactivation | OTP completion and callback code check `is_active`; normal request/session validation and action guards do not consistently recheck it. Immediate revocation is not established. |
| Note editing | An action restricts note edits to admins, but the base notes policy still allows authenticated writes through the data API. |
| Rich-text notes | Meeting HTML is rendered with `dangerouslySetInnerHTML`; no server-side HTML sanitizer is visible. Treat stored HTML as untrusted. |
| History integrity | Contact history is trigger-generated but the policy also permits authenticated updates/deletes; it is not an immutable audit log. |
| Storage | Avatar and branding buckets are public; upload policies are scoped to user paths or admins. They are not private document storage. |

Before using this as an untrusted or multi-tenant service, tighten database policies and profile column permissions, enforce active-user checks, sanitize rich text, and validate access through the Supabase API as well as the UI. Restore and review deal policies before claiming database-level role isolation.

## Claude and MCP integration

**Status: existing external integration, confirmed by the project owner.** The owner connected Claude using a custom connector to an MCP server hosted on AWS. The founder can ask questions about CRM data exposed by that server's tools. The MCP server code, connector configuration, and deployment artifacts are outside this repository.

### Question-to-answer flow

```mermaid
sequenceDiagram
    actor Founder
    participant Claude
    participant Connector as Custom MCP connector
    participant MCP as MCP server on AWS
    participant Tool as Selected tool handler
    participant DB as Supabase / PostgreSQL
    Founder->>Claude: Ask a question about CRM data
    Claude->>Connector: Call a relevant exposed tool
    Connector->>MCP: Forward tool call and arguments
    MCP->>Tool: Dispatch tool call
    Tool->>DB: Query the required CRM data
    DB-->>Tool: Query results
    Tool-->>MCP: Tool result
    MCP-->>Connector: Return result
    Connector-->>Claude: Provide retrieved data
    Claude-->>Founder: Answer based on returned data
```

The connector is the configured connection between Claude and the remote MCP server; it is shown separately to make that connection explicit, not to assert a separately deployed connector service. The CRM web application and MCP tools access the same business database through separate application paths. No specific AWS service, MCP framework, or model version has been supplied.

### What is established and what still needs documentation

| Area | Available information |
| --- | --- |
| User experience | The founder asks Claude questions about CRM data |
| Connection | Claude uses a custom MCP connector configured by the project owner |
| Hosting | The MCP server is hosted on AWS |
| Tool execution | Claude calls an exposed tool; the server's handler queries the database and returns results |
| Answer generation | Claude answers using returned database data |
| Tool catalog | Exact names, schemas, dataset coverage, and pagination behavior have not been supplied |
| Authentication and authorization | Credential flow, database role, permission checks, and account mapping have not been supplied |
| Mutations | Read-only enforcement and any write-capable tools have not been confirmed |
| Retrieval details | Database queries are confirmed; query construction, RAG, embeddings, or vector-search use cannot be established from this checkout |
| Evaluation | No tool-call traces, correctness tests, latency measurements, or quality scores are included here |

The supported data scope is whatever the deployed tools expose. The founder's ability to ask questions does not by itself establish unrestricted access to every table or permission to modify records.

### Engineering rationale and review targets

The MCP layer provides a tool boundary between Claude and the database: Claude requests a tool operation, the server retrieves the data, and Claude interprets the result. This supports natural-language access to the CRM alongside its existing screens and reports. The owner's original reasons for selecting Claude, MCP, and a particular AWS deployment still need a first-hand account.

To make the integration reproducible for reviewers, add the external source link or a sanitized tool catalog, example arguments and responses using synthetic data, the AWS deployment design, and an explanation of authentication and database permissions. Do not include credentials, live customer records, or private connection settings.

Validation should cover server-side argument checks, result-size limits, pagination, explicit error handling, and direct authorization tests. Confirm whether tools enforce read-only access before describing the integration as read-only. If tools access the database through privileged credentials, document and test the permission checks applied on that path; the web application's session checks do not establish the external server's behavior.

Context size, query performance, response grounding, and prompt injection through retrieved notes are useful evaluation targets. Their handling in the deployed server has not been inspected here.

## Validation plan and results

There is no committed automated test suite, CI workflow, benchmark report, or AI evaluation dataset. The following is a plan, not a record of passed tests. Use an isolated development database and synthetic data after restoring the missing schema.

| Scenario | Verification |
| --- | --- |
| Contact lifecycle | Create a synthetic contact, update its stage, and compare history against direct SQL reads |
| Activity relationships | Attach a note, conversation, and meeting; verify parent IDs, author IDs, ordering, and empty states |
| Conversion | Convert twice; confirm sequential reuse, then test simultaneous requests and partial write failure |
| Reports | Compare a small known dataset with independently computed totals; include reopened deals, empty data, and multiple currencies |
| Authentication | Test invalid/expired OTPs, callbacks, signed-out routes, and deactivated existing sessions |
| Authorization | Use admin and SDR sessions to call actions and Supabase directly; attempt role self-escalation, note edits, and deal access |
| Failure handling | Simulate database rejection and unavailable data; verify failures are not presented as successful empty results |
| External MCP integration | Validate tool arguments, pagination, empty results, permission denial, injected instructions in notes, and record-grounded answers |

A future AI evaluation set should pair each question with expected tool selection, arguments, authorized records, and answer facts. Measure tool-selection accuracy, result correctness, unsupported claims, authorization failures, and end-to-end p50/p95 latency. Track token use and cost per question. No scores or business improvements are claimed yet.

## Deployment, ownership, and interview evidence

| Evidence | Current status |
| --- | --- |
| Source | [Public SalesNova repository](https://github.com/moizbroad/SalesNova) |
| Deployment | Owner confirms an AWS-hosted MCP server and Claude custom connector; no verified public CRM demo URL supplied |
| Reproducibility | npm lockfile and base migrations exist; deals migration is incomplete |
| Demo dataset | No synthetic seed or shared demo credentials supplied |
| Personal contribution | Owner confirms connecting Claude through a custom MCP connector; a full module-by-module contribution breakdown has not been supplied |
| Business results | No measured before/after results supplied |
| Publication rights | Company branding remains in code; ownership/permission is not established by repository visibility, and no license file is supplied |

For an interview, add first-hand evidence of which modules you designed, implemented, tested, and deployed; the hardest bug you personally debugged; and a specific trade-off you made. Support each with a commit, reproducible example, or artifact. Distinguish the existing external integration from suggested improvements and test cases that have not been run.

## AI-assisted development

The current documentation pass used Codex to inspect routes, actions, schema, policies, and reporting logic, identify mismatches in the previous README, and organize this source-backed write-up. The project owner subsequently clarified the existing external Claude/MCP integration, and the diagrams and integration description were updated accordingly. This documentation pass did not validate or change that live service.

Historical use of Claude Code or other assistants during application development has not been supplied. Neither AI-generated test coverage nor a completed LLM security stress test can be claimed from the available evidence.

Useful evidence to add is a concrete suggestion you accepted or rejected, the reason, and the independent check used to verify it—for example a failing regression test, SQL result comparison, or direct authorization test. A generated explanation or code review is not a substitute for those checks.

## Next engineering priorities

1. Restore the deals migration and prove a clean database setup is reproducible.
2. Harden role changes, active-user enforcement, activity policies, and stored HTML handling.
3. Make conversion atomic and define reporting behavior for stage re-entry and currencies.
4. Add workflow, authorization, and regression tests using synthetic fixtures.
5. Introduce server-side pagination and database aggregates for larger datasets.
6. Document the existing MCP server and tool contracts, then measure correctness, authorization, latency, and usefulness.
