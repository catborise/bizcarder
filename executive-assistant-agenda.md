# Executive Assistant & Yearly Agenda Platform Plan (`executive-assistant-agenda`)

## 1. Overview & Product Vision

**Objective:** Transform **Bizcarder CRM** (`v2.1.0`) into an **Executive Assistant & Secretary Yearly Agenda Platform** that preserves the tactile mental model of a physical desk agenda ("Yıllık Ajanda") while adding digital superpowers:

1. **Keyboard & Mouse First Speed:** Single-line inline entry (`14:30 @Ahmet Yılmaz bütçe görüşmesi #finans !yarın 10:00`), zero-modal rapid note-taking, safe keyboard page-flipping (`←` / `→` when focus is outside input/textarea, `Ctrl+K` quick lookup), and idempotent one-click **"Tamamlanmayanları Yarına Devret (`→`)"** migration.
2. **Physical Agenda Page Layout:** Classic daily desk planner spread — Left column for hourly schedule (`08:00–19:00`), Right column for lined freeform notes (`freeformNotes`) plus a separate owner-only private scratchpad (`privateNotes`), Bottom bar for action items / pending follow-ups, and 12-month side index tabs (`Ocak..Aralık`).
3. **Selective Page Sharing:** A secretary can share any specific agenda page (single date or date range) via a secure, revocable, optionally expiring share link (`/agenda/share/:token`) served through `routes/public.js` (rate-limited). External shares **never** expose `isPrivate` notes, `privateNotes`, or contact phone/email PII (only `displayNameSnapshot`).
4. **Temporary Delegation (Vekâlet / Görevlendirme):** When a secretary goes on leave, they (or an admin) can assign a substitute secretary (`delegateUserId`) for a specified time window (`startsAt` → `endsAt`). All actions taken by a substitute record both `ownerId` and `createdByUserId` / `updatedByUserId` (`"Vekâleten: [İsim]"` badge + full `AuditLog` trail).
5. **Integrated Business Card Directory ("Fihrist / Kişiler"):** The existing Business Card & OCR suite operates as the agenda's directory (`@Kişi` autocomplete links notes to `BusinessCard` profiles via `AgendaEntryContacts` with `displayNameSnapshot` preservation and strict owner-scoped visibility).

---

## 2. Role × Action Permission Matrix (Principal vs Substitute vs External Share)

| Action                                                         | Principal (Agenda Owner)      | Substitute Secretary (Active Vekâlet)                                                     | External Share Link (`/agenda/share/:token`) |
| -------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------- |
| **Read non-private entries & `freeformNotes`**                 | ✅ Yes                        | ✅ Yes                                                                                    | ✅ Yes (within shared `startDate..endDate`)  |
| **Read `isPrivate` entries & `privateNotes`**                  | ✅ Yes                        | ❌ No (`404` on direct ID access, stripped from lists)                                    | ❌ Never                                     |
| **Create new entry**                                           | ✅ Yes (`isPrivate` optional) | ✅ Yes (`isPrivate` forced to `false`, `createdByUserId` tracked)                         | ❌ No                                        |
| **Update entry status (`open`/`done`/`migrated`/`cancelled`)** | ✅ All entries                | ✅ All non-private entries (`updatedByUserId` tracked)                                    | ❌ No                                        |
| **Edit entry text (`content` / `timeSlot`)**                   | ✅ All entries                | ✅ Only entries created by the substitute (`createdByUserId === req.user.id`)             | ❌ No                                        |
| **Edit `freeformNotes` (Right page notepad)**                  | ✅ Yes (with `version` check) | ✅ Yes (with `version` check + `updatedByUserId`)                                         | ❌ No                                        |
| **Soft-delete (`deletedAt`) / Permanent delete (`DELETE`)**    | ✅ Soft & permanent delete    | ⚠️ Can only soft-delete entries _they_ created; **cannot** delete owner's entries (`403`) | ❌ No                                        |
| **Create/revoke Share Links or Sub-delegate**                  | ✅ Yes                        | ❌ Forbidden (`403 AGENDA_OWNER_ONLY`)                                                    | ❌ No                                        |

---

## 3. Project Type & Success Criteria

- **Project Type:** **WEB** (Full-Stack React 19 + Vite 8 SPA & Express 5 + Sequelize + PostgreSQL 18 Backend)
- **Primary Agents:** `database-architect`, `security-auditor`, `backend-specialist`, `frontend-specialist`, `test-engineer`

### Measurable Success Criteria

1. **Fast Daily Page API & Skeleton UX:** `GET /api/agenda/day/:date` responds in `<200ms` (p95 on local PG 18) and renders Today's Page immediately with zero modal requirement for adding notes.
2. **Idempotent Roll-over (`→`):** Clicking `"Tamamlanmayanları Yarına Devret"` moves unfinished entries to the target date once (`UNIQUE(migratedFromEntryId, date)` prevents duplicates on repeated clicks).
3. **Zero Data Leakage (KVKK & IDOR Gate):**
    - Viewing a `public` `BusinessCard` only shows agenda entries belonging to the viewing user (never leaks another secretary's agenda notes).
    - Substitute secretaries receive `404` when probing an `isPrivate` entry ID and `403` when attempting to delete the principal's entries or create a share link.
    - Expired, revoked, or non-existent share tokens all return a uniform `404` response.
4. **Optimistic Concurrency:** Concurrent edits to `AgendaPages.freeformNotes` check `version` and return `409 AGENDA_VERSION_CONFLICT` instead of silently overwriting notes.
5. **Quality Gate:** All existing 380 tests + new backend/frontend agenda test suites pass with `0` lint/format warnings and `0` `npm audit` vulnerabilities.

---

## 4. Database Schema & File Structure

### 4.1 New Database Tables (`20261124140000-create-agenda-tables.js`)

1. **`AgendaPages` (`agenda_pages`)**:
    - `id` (INTEGER PK)
    - `ownerId` (INTEGER FK → `Users.id`, `UNIQUE(ownerId, date)`)
    - `date` (DATEONLY, `YYYY-MM-DD`, not null)
    - `freeformNotes` (TEXT, default `''` — shared right-hand lined page)
    - `privateNotes` (TEXT, default `''` — owner-only private scratchpad, never returned to substitute or share)
    - `moodOrPriority` (STRING(32), nullable)
    - `version` (INTEGER, not null, default `1` — optimistic concurrency control)
    - `updatedByUserId` (INTEGER FK → `Users.id`, nullable)
    - `createdAt`, `updatedAt`

2. **`AgendaEntries` (`agenda_entries`)**:
    - `id` (INTEGER PK)
    - `ownerId` (INTEGER FK → `Users.id`, indexed with `(ownerId, date)`)
    - `createdByUserId` (INTEGER FK → `Users.id`)
    - `updatedByUserId` (INTEGER FK → `Users.id`, nullable)
    - `date` (DATEONLY, `YYYY-MM-DD`, not null)
    - `timeSlot` (STRING(5), `'HH:MM'`, nullable)
    - `endTime` (STRING(5), `'HH:MM'`, nullable)
    - `entryType` (ENUM: `'schedule'`, `'call'`, `'note'`, `'task'`, `'follow_up'`, default `'note'`)
    - `content` (TEXT, not null)
    - `status` (ENUM: `'open'`, `'done'`, `'migrated'`, `'cancelled'`, default `'open'`)
    - `priority` (INTEGER, `1..5`, default `3`)
    - `migratedToDate` (DATEONLY, nullable)
    - `migratedFromEntryId` (INTEGER FK → `AgendaEntries.id` ON DELETE SET NULL, nullable, `UNIQUE(migratedFromEntryId, date)`)
    - `reminderAt` (DATE, nullable, indexed with `(reminderAt, reminderSent)`)
    - `reminderSent` (BOOLEAN, default `false`)
    - `isPrivate` (BOOLEAN, default `false`)
    - `sortOrder` (INTEGER, default `0`)
    - `deletedAt` (DATE, nullable — soft-delete support)
    - `createdAt`, `updatedAt`

3. **`AgendaEntryContacts` (`agenda_entry_contacts`)**:
    - `id` (INTEGER PK)
    - `entryId` (INTEGER FK → `AgendaEntries.id` ON DELETE CASCADE)
    - `cardId` (INTEGER FK → `BusinessCards.id` ON DELETE SET NULL, nullable)
    - `displayNameSnapshot` (STRING, not null — preserves `"@Ahmet Yılmaz"` even if the card is later deleted)

4. **`AgendaEntryTags` (`agenda_entry_tags`)**:
    - `id` (INTEGER PK)
    - `entryId` (INTEGER FK → `AgendaEntries.id` ON DELETE CASCADE)
    - `tagId` (INTEGER FK → `Tags.id` ON DELETE CASCADE)

5. **`AgendaDelegations` (`agenda_delegations`)**:
    - `id` (INTEGER PK)
    - `principalUserId` (INTEGER FK → `Users.id`)
    - `delegateUserId` (INTEGER FK → `Users.id`)
    - `permission` (ENUM: `'read'`, `'write'`, default `'write'`)
    - `startsAt` (DATE, not null)
    - `endsAt` (DATE, not null)
    - `note` (STRING, nullable)
    - `isActive` (BOOLEAN, default `true`)
    - `createdAt`, `updatedAt`

6. **`AgendaShares` (`agenda_shares`)**:
    - `id` (INTEGER PK)
    - `ownerId` (INTEGER FK → `Users.id`)
    - `shareTokenHash` (STRING(64), UNIQUE — SHA-256 hash of raw token)
    - `startDate` (DATEONLY, not null)
    - `endDate` (DATEONLY, not null)
    - `title` (STRING, nullable)
    - `sharedWithUserId` (INTEGER FK → `Users.id`, nullable)
    - `expiresAt` (DATE, nullable)
    - `isActive` (BOOLEAN, default `true`)
    - `viewCount` (INTEGER, default `0`)
    - `createdAt`, `updatedAt`

---

## 5. Phased Implementation Breakdown

### Phase 1: Database Migration, Models & Access/Delegation Middleware (P0)

- **Task 1.1:** Create migration `20261124140000-create-agenda-tables.js` and 6 Sequelize models (`AgendaPage`, `AgendaEntry`, `AgendaEntryContact`, `AgendaEntryTag`, `AgendaDelegation`, `AgendaShare`) registered in `backend/models/index.js`.
    - **VERIFY:** `npx sequelize-cli db:migrate` succeeds on PostgreSQL 18.
- **Task 1.2:** Implement `backend/middleware/agendaAccess.js` enforcing the **Role × Action Permission Matrix** (Section 2), validating `X-Agenda-Owner-Id` / `?ownerId=` on every request against active `AgendaDelegation` records.

### Phase 2: Backend Controllers, Routes & Security Matrix Tests (P1 — Hard Gate Before UI)

- **Task 2.1:** `backend/controllers/agendaController.js` — Daily page GET/PUT (with `version` conflict detection and `privateNotes` isolation), inline entry parser (`@Kişi`, `#Etiket`, `!Hatırlat`, `HH:MM`), entry PATCH/soft-DELETE enforcing substitute rules, idempotent `POST /api/agenda/entries/migrate-unfinished`, search (`GET /api/agenda/search`), and yearly overview (`GET /api/agenda/year-overview/:year`).
- **Task 2.2:** `backend/controllers/delegationController.js` — Create, list (incoming & outgoing), and revoke substitute secretary delegations (`AuditLog` tracked).
- **Task 2.3:** `backend/controllers/agendaShareController.js` & `backend/routes/public.js` — Owner-only share link creation returning raw token once (storing `shareTokenHash`), revocation, and rate-limited `GET /api/public/agenda/:token` stripping `isPrivate`, `privateNotes`, and contact PII.
- **Task 2.4 (HARD GATE):** Comprehensive Jest test suites (`agenda.test.js`, `agenda-delegation.test.js`, `agenda-share.test.js`) verifying every row of the Permission Matrix before Phase 3 begins.

### Phase 3: Keyboard-First Yearly Agenda Frontend UI (P2)

- **Task 3.1:** `AgendaWorkspace.jsx`, `DailyPageSpread.jsx`, `MonthIndexTabs.jsx` — Physical two-page desk agenda layout (`08:00–19:00` schedule on left, lined `freeformNotes` + owner-only `🔒 Özel Notlar` tab on right, 12-month binder tabs `Ocak..Aralık`, input-safe keyboard navigation, and `"Tamamlanmayanları Yarına Devret (→)"`).
- **Task 3.2:** `QuickEntryBar.jsx` & `CallerContextDrawer.jsx` — Single-line smart entry with `@Kişi` and `#Etiket` autocomplete, `🔒 Özel` toggle, and 1-click contact agenda history lookup drawer.
- **Task 3.3:** `DelegationModal.jsx`, `AgendaShareModal.jsx`, `SharedAgendaView.jsx` — Top agenda switcher (`"Kendi Ajandam"` vs `"Vekâleten: [İsim]"` banner), substitute assignment UI, and public shared page view (`/agenda/share/:token`).
- **Task 3.4:** Full TR/EN localization (`npm run sync:locales`) and Frontend Vitest test suite (`AgendaWorkspace.test.jsx`, `DelegationModal.test.jsx`).

### Phase X: Final Verification Checklist

- [x] All Backend Jest tests pass on PostgreSQL 18 (`npm test` — 30/30 suites, 320/320 tests)
- [x] All Frontend Vitest tests & production build pass (`npm test && npm run build` — 20/20 files, 80/80 tests)
- [x] ESLint & Prettier return 0 warnings (`npm run lint && npm run format:check`)
- [x] `npm audit` returns 0 vulnerabilities

## ✅ PHASE X COMPLETE

- Lint: ✅ Pass (0 errors, 0 warnings)
- Security: ✅ Full Role × Action Permission Matrix & SHA-256 Share Token Hashing verified (18/18 tests)
- Build: ✅ Success (Vite 8.3.8 in 305ms)
- Date: 2026-11-24
