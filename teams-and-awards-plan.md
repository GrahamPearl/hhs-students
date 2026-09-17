# HHS Student Roster — Teams & Awards Extension

## Project summary

The HHS Student Lookup app is a Firebase-hosted, Firestore-backed student
roster for Hillcrest High School. It's built as vanilla-JS modules with a
strict separation of concerns:

- **Data layer** (`data-service.js`) — loads the full roster once, caches it
  in `sessionStorage` (`CACHE_TTL_MS`), and serves all search/filter from an
  in-memory array. This is why the app can filter thousands of students per
  keystroke with zero extra Firestore reads.
- **Pure logic** (`search.js`, `migrate-parse.js`, `edit-form.js`) — no DOM,
  no network. Easy to test, easy to extend.
- **Rendering** (`render.js`) — all DOM-building lives here, driven by plain
  data.
- **Wiring** (`app.js`) — connects the above for the public lookup page.
- **Admin editing** (`auth-service.js`, `student-edit-service.js`,
  `edit-form.js`) — custom-claim-gated, transactional (optimistic
  concurrency via `runTransaction`), with an `auditLog` write bundled into
  the same transaction as the student update.
- **Migration console** (`migrate-app.js`, `migrate-parse.js`,
  `migrate-service.js`) — browser-based diff-then-batch-write importer for
  `students.json`, capped at 400 ops/batch.

Each student document (`students/{adminNo}`) currently carries denormalized,
roster-derived fields for fast client-side search: `subjectsSummary` (array
of subject names) and `enrollments` (map keyed by a slugified subject name →
`{ subject, teacher, class, grade, line }`). Teams and awards should follow
this exact pattern.

## Goal

Add **Teams** as a first-class, separately stored entity, with:

1. A canonical `teams` collection (one doc per team) that lists its members
   by `adminNo`.
2. Fast, client-side searchability of **which teams a given student belongs
   to** — matching how subjects/teachers are already searched, i.e. no
   per-query Firestore read.
3. **Awards** per student per team — merits, half-colours, full-colours —
   stored so they can be queried both "from the student" (drawer view) and
   "from the team" (team roster / awards list).

This plan is scoped to be completable in one focused session: it reuses
existing architecture (denormalize-for-search + transactional writes) rather
than introducing new infrastructure.

## Data model

### New collection: `teams/{teamId}`

```jsonc
{
  "teamId": "u16-netball-a",           // doc id, slug
  "name": "U16 Netball A",
  "category": "Netball",               // sport/activity grouping
  "gradeBand": "8-9",                  // optional, free text
  "season": "2026",
  "coach": "SJ Geel",
  "members": ["15623", "15434", "..."] // array of adminNo (canonical membership list)
}
```

`members` is the source of truth for "who is on this team." Keep it a flat
array (not a subcollection) — team rosters are small (dozens, not
thousands), so this mirrors the simplicity of `subjectsSummary` and avoids
an extra read per team view.

### New collection: `teamMembers/{teamId}_{adminNo}`

One doc per (team, student) pair — this is where **awards live**, because
awards are a property of the *membership*, not of the student or team
alone:

```jsonc
{
  "teamId": "u16-netball-a",
  "adminNo": "15623",
  "joinedAt": "2026-01-20",
  "awards": {
    "merits": [{ "year": 2026, "note": "Player of the match vs DGHS" }],
    "halfColours": [{ "year": 2026 }],
    "fullColours": []
  }
}
```

This join-doc pattern (rather than nesting awards inside `teams.members` or
inside the student doc as the only copy) gives you:
- Cheap team-centric queries (`where teamId == X`) for team award lists.
- Cheap student-centric queries (`where adminNo == X`) as a fallback/audit
  source, independent of the denormalized cache below.
- A single place to edit awards without touching the large `teams` or
  `students` documents.

### Denormalization onto `students/{adminNo}` (for search)

Exactly like `subjectsSummary` / `enrollments`, add two fields to the
student doc so the existing in-memory search model keeps working with zero
extra reads:

```jsonc
{
  // ...existing fields...
  "teamsSummary": ["U16 Netball A", "Chess Club"],   // array of team names
  "teamMemberships": {
    "u16-netball-a": {
      "teamId": "u16-netball-a",
      "teamName": "U16 Netball A",
      "category": "Netball",
      "awards": {
        "merits": 1,
        "halfColours": 1,
        "fullColours": 0
      }
    }
  }
}
```

`teamMemberships` mirrors `enrollments`: keyed by `teamId`, holding just
enough to render and filter without a join. Store **award counts** here
(cheap, filterable, e.g. "students with full colours"), and keep the
detailed award entries (with notes/years) in `teamMembers/*` as the
authoritative record. This is the same "denormalize a summary, keep detail
elsewhere" split the app already uses for subjects vs. the full
`enrollments` map.

### Consistency rule

`teams.members`, `teamMembers/{teamId}_{adminNo}`, and
`students.teamMemberships` must be written together, in one transaction,
whenever membership or awards change — same discipline as
`student-edit-service.js` already applies to `students` + `auditLog`.

## Files to add

| File | Purpose |
|---|---|
| `public/js/team-edit-service.js` | Transactional add/remove-member and award-grant/revoke operations. Mirrors `student-edit-service.js`: re-reads latest docs, aborts on conflict, writes `teams`, `teamMembers/{teamId}_{adminNo}`, and the patched `students/{adminNo}` doc together, plus an `auditLog` entry. |
| `public/js/team-form.js` | Pure state helpers for the team/award edit UI — mirrors `edit-form.js` (`buildDraft`, `applyFieldChange`, `addSubject`/`removeSubject` → equivalents `buildTeamDraft`, `addMember`, `removeMember`, `grantAward`, `revokeAward`, `validateTeamDraft`). No DOM, no network. |

## Existing files that need edits

| File | What changes |
|---|---|
| **`public/js/data-service.js`** | Add `getAllTeams()` (same cache-then-fetch pattern as `getAllStudents`, new `sessionStorage` key e.g. `hhs_teams_cache_v1`, new `TEAMS_COLLECTION` config). Add `collectTeamNames(students)` and `collectTeamCategories(teams)` (mirrors `collectSubjects`/`collectClasses`). Add `collectTeamsForStudent(student)` reading `student.teamMemberships`. Extend `patchCachedStudent` usage — no change needed there, it already replaces-by-adminNo. |
| **`public/js/search.js`** | Add `team` (and optionally `award`) to the filter `state` shape; filter on `s.teamsSummary.includes(state.team)` and, if an award filter is added, on `s.teamMemberships[teamKey].awards.<level> > 0`. Mirrors the existing `subject`/`teacher` scoped-filter logic (subject → then-scoped teacher). |
| **`public/js/render.js`** | `renderDrawerView`: add a "Teams & Awards" section reading `student.teamsSummary` / `student.teamMemberships`, styled like the existing subjects table. `renderActiveFilters`: add a `team` label mapper. New filter select population needs a `renderTeamOptions`-style helper (or reuse `populateSelect` from `app.js`). |
| **`public/js/app.js`** | Wire a new `#filterTeam` select (and, if added, `#filterAward`) the same way `els.subject`/`els.teacher` are wired: populate on load via `collectTeamNames(roster)`, include in `state()`, listen for `change` → `runSearch()`. |
| **`public/index.html`** | Add a `#filterTeam` (and optional `#filterAward`) `<select>` inside `#filterModal .modal-grid`, matching the existing `#filterSubject`/`#filterTeacher` markup. |
| **`public/js/config.js`** | Add `TEAMS_COLLECTION: "teams"` and `TEAM_MEMBERS_COLLECTION: "teamMembers"` alongside `STUDENTS_COLLECTION`. |
| **`public/js/migrate-parse.js`** | If teams will also be bulk-imported/updated from a JSON file (recommended for initial load), add `parseTeamsFile`, `validateTeamRecord`, and extend `diffStudents`-style logic into a generic `diffRecords(incoming, existing, requiredFields)` so both students and teams can reuse the diff/compare UI without duplicating `stableStringify`/`describeChanges` (those two already generalize fine — keep as-is). |
| **`public/migrate.html`** + **`public/js/migrate-app.js`** | Optional: add a second tab/section "Teams" that reuses the same drop-zone → compare → dry-run → commit flow, pointed at `TEAMS_COLLECTION`. Lowest priority — can be deferred past this session if time-boxed. |

## Suggested single-session scope (cut here if short on time)

**Must-have (core ask: store teams + fast search + store awards):**
1. `config.js` — new collection names.
2. `team-form.js` (new) — pure helpers.
3. `team-edit-service.js` (new) — transactional writes across the three
   locations.
4. `data-service.js` — `getAllTeams`, `collectTeamNames`,
   `collectTeamsForStudent`.
5. `search.js` — team filter.
6. `render.js` — drawer teams/awards section + active-filter label.
7. `app.js` + `index.html` — wire the new `#filterTeam` control.

**Nice-to-have (defer if needed):**
- Award-level filter (`#filterAward`: merits/half-colours/full-colours).
- Migration-console support for bulk team import.
- A dedicated "Teams" admin view for editing a team's full roster at once
  (rather than per-student add/remove).

## Key invariant for whoever implements this

Never let `teams.members`, `teamMembers/{teamId}_{adminNo}`, and
`students.teamMemberships` drift apart. Every write path (manual edit,
migration import, award grant) must update all three in the same
`runTransaction` call, exactly as `student-edit-service.js` already does
for `students` + `auditLog`.
